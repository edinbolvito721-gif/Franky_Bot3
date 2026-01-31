const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        printQRInTerminal: false, // Ya no usaremos QR
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    // --- LÓGICA DE CÓDIGO DE VINCULACIÓN ---
    if (!sock.authState.creds.registered) {
        // ESPERA 5 SEGUNDOS PARA QUE LOS LOGS SE LIMPIEN
        await delay(5000);
        
        // REEMPLAZA ESTE NÚMERO CON EL TUYO (con código de país, sin el +)
        // Ejemplo: 521XXXXXXXXX para México, 34XXXXXXXXX para España
        const numeroTelefono = "TU_NUMERO_AQUI"; 
        
        const code = await sock.requestPairingCode(numeroTelefono);
        console.log(`\n\n==============================\nTU CÓDIGO DE VINCULACIÓN ES:\n\n          ${code}\n\n==============================\n`);
    }

    sock.ev.on('creds.update', saveCreds);

    // CONTENEDOR DE EVENTOS (COMANDOS)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const command = body.toLowerCase().split(" ")[0];

        try {
            const plugin = require(`./plugins/${command}.js`);
            await plugin.run(sock, m, body);
        } catch (e) {
            // Silencio si el comando no existe
        }
    });

    console.log("Franky_Bot3 iniciado correctamente.");
}

connectToWhatsApp();
