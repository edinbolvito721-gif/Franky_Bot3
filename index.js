const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startFranky() {
    // Iniciamos sesión desde cero
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

    if (!sock.authState.creds.registered) {
        console.log("Esperando 20 segundos para estabilizar la red...");
        await delay(20000); 
        
        const numeroTelefono = "573247715069"; 
        
        try {
            const code = await sock.requestPairingCode(numeroTelefono);
            console.log(`\n\n==============================\nTU CÓDIGO NUEVO ES: ${code}\n==============================\n`);
        } catch (err) {
            console.log("WhatsApp rechazó el pedido. Esperando 1 minuto antes de reintentar...");
            await delay(60000);
            process.exit(1); 
        }
    }

    sock.ev.on('creds.update', saveCreds);

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
