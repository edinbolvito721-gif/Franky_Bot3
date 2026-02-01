const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startFranky() {
    // Usamos una carpeta de sesión limpia
    const { state, saveCreds } = await useMultiFileAuthState('auth_session_franky');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        // Esta identidad ayuda a evitar bloqueos de IP
        browser: ["Mac OS", "Safari", "17.0"],
        syncFullHistory: false
    });

    if (!sock.authState.creds.registered) {
        // Espera de seguridad inicial
        console.log("Iniciando sistema... Esperando 20 segundos de estabilidad.");
        await delay(20000); 
        
        const numeroTelefono = "573247715069"; 
        
        try {
            console.log("Solicitando código de vinculación...");
            const code = await sock.requestPairingCode(numeroTelefono);
            console.log(`\n\n==============================\nTU CÓDIGO ES: ${code}\n==============================\n`);
        } catch (err) {
            console.log("WhatsApp sigue rechazando la IP. Intentando reconexión automática...");
            await delay(30000);
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

    // Lógica para tus 300 comandos (Carpeta /plugins/)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.trim().split(" ")[0].toLowerCase();

        try {
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {
            // Ignora si el comando no existe
        }
    });
}

startFranky();
