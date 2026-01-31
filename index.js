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

    // --- LÓGICA DE VINCULACIÓN ---
    if (!sock.authState.creds.registered) {
        await delay(3000); // Espera a que Railway cargue bien
        const numeroTelefono = "573247715069"; // PONE TU NUMERO AQUI CON CODIGO DE PAIS
        
        try {
            const code = await sock.requestPairingCode(numeroTelefono);
            console.log(`\n\n==============================\nTU CÓDIGO: ${code}\n==============================\n`);
        } catch (err) {
            console.log("Error generando código, reintentando...");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada, reintentando...', shouldReconnect);
            if (shouldReconnect) startFranky();
        } else if (connection === 'open') {
            console.log('--- FRANKY_BOT3 CONECTADO CON ÉXITO ---');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.toLowerCase().split(" ")[0];

        try {
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {}
    });
}

startFranky();
