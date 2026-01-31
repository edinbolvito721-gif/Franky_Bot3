module.exports = {
    run: async (sock, m, text) => {
        const id = m.key.remoteJid;
        await sock.sendMessage(id, { text: '¡Sistema de comandos (ContenedorEventos) activo! 🚀' });
    }
};
