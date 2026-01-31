const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
 const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "fatal" }), // Cambia a fatal para que solo muestre el QR y nada más
        browser: ["Franky_Bot3", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000, // Le damos más tiempo para no morir rápido
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    });

    sock.ev.on('creds.update', saveCreds);

    // LÓGICA DE COMANDOS (Contenedor de Eventos)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.toLowerCase().split(" ")[0];

        // Aquí el bot busca el archivo en la carpeta /plugins/
        try {
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {
            // Si el comando no existe, no hace nada
        }
    });

    console.log("Franky_Bot3 listo para recibir órdenes.");
}

connectToWhatsApp();
