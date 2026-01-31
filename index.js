const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startFranky() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    // --- LÓGICA DE VINCULACIÓN CON TU NÚMERO ---
    if (!sock.authState.creds.registered) {
        console.log("Iniciando solicitud de código para Franky_Bot3...");
        await delay(10000); // Espera 10 segundos para estabilidad de Railway
        
        const numeroTelefono = "573247715069"; // Tu número configurado
        
        async function obtenerCodigo() {
            try {
                const code = await sock.requestPairingCode(numeroTelefono);
                console.log(`\n\n==============================\nTU CÓDIGO DE 8 DÍGITOS ES:\n\n          ${code}\n\n==============================\n`);
            } catch (err) {
                console.log("Reintentando generar código...");
                await delay(5000);
                return obtenerCodigo();
            }
        }
        obtenerCodigo();
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startFranky();
        } else if (connection === 'open') {
            console.log('\n--- FRANKY_BOT3 CONECTADO CON ÉXITO ---\n');
        }
    });

    // CONTENEDOR DE EVENTOS (Carga tus 300 comandos desde /plugins)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.trim().split(" ")[0]; // No lo pasamos a minúsculas para respetar el "!"

        try {
            // Busca archivos como !hola.js o test.js en la carpeta plugins
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {
            // No responde si el comando no existe en la carpeta
        }
    });
}

startFranky();
