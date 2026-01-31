const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startFranky() {
    // Forzamos a que no use sesiones viejas que den error
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false // Esto hace la conexión más ligera para Railway
    });

    if (!sock.authState.creds.registered) {
        console.log("Limpiando conexión para generar código...");
        await delay(15000); // Damos más tiempo para que Railway se estabilice
        
        const numeroTelefono = "573247715069"; 
        
        try {
            // Pedimos el código con un tiempo de espera controlado
            const code = await sock.requestPairingCode(numeroTelefono);
            console.log(`\n\n==============================\nTU CÓDIGO: ${code}\n==============================\n`);
        } catch (err) {
            console.log("WhatsApp ocupado. Esperando 10 segundos para el siguiente intento...");
            await delay(10000);
            // El bot se reiniciará solo por el evento connection.update
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startFranky();
        } else if (connection === 'open') {
            console.log('\n--- FRANKY_BOT3 ONLINE ---\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.trim().split(" ")[0];

        try {
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {}
    });
}

startFranky();
