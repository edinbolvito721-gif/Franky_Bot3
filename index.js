const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startFranky() {
    // Usamos el estado de autenticación para guardar la sesión
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false
    });

    // --- LÓGICA DE VINCULACIÓN DIRECTA ---
    if (!sock.authState.creds.registered) {
        console.log("Solicitando código de vinculación...");
        await delay(8000); // Espera estratégica para estabilidad
        
        const numeroTelefono = "573247715069"; 
        
        try {
            const code = await sock.requestPairingCode(numeroTelefono);
            console.log(`\n\n==============================\nTU CÓDIGO: ${code}\n==============================\n`);
        } catch (err) {
            console.log("Error de conexión con WhatsApp, reiniciando...");
            process.exit(1); 
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startFranky();
        } else if (connection === 'open') {
            console.log('\n--- FRANKY_BOT3 ONLINE ---\n');
        }
    });

    // CONTENEDOR DE EVENTOS (Carga automática de tus 300 comandos)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.trim().split(" ")[0];

        try {
            // Busca en la carpeta /plugins/ el archivo que coincida con el comando
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {
            // Si no existe el plugin, el bot ignora el mensaje
        }
    });
}

startFranky();
