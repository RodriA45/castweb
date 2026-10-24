const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Obtener la dirección IP local de la máquina en la red Wi-Fi / Ethernet
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
        const isVirtual = /virtual|vmnet|vEthernet|wsl|loopback|pseudo/i.test(name);
        for (const iface of interfaces[name]) {
            // Filtrar IPv4 válida no interna
            if (iface.family === 'IPv4' && !iface.internal) {
                // Descartar APIPA (169.254.x.x) que no tiene salida a la red local
                if (iface.address.startsWith('169.254.')) continue;

                // Prioridad: 1 = Wi-Fi/Ethernet estándar (192.168 / 10 / 172.16-31), 2 = virtual, 3 = otros
                let priority = 3;
                const isPrivate = iface.address.startsWith('192.168.') || 
                                  iface.address.startsWith('10.') || 
                                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address);

                if (isPrivate && !isVirtual) {
                    priority = 1;
                } else if (isPrivate && isVirtual) {
                    priority = 2;
                }

                candidates.push({ address: iface.address, priority });
            }
        }
    }

    candidates.sort((a, b) => a.priority - b.priority);
    return candidates.length > 0 ? candidates[0].address : '127.0.0.1';
}

const PORT = process.env.PORT || 3000;
const localIP = getLocalIP();

// Endpoint para que el cliente consulte la IP y URL de red para Smart TVs y móviles
app.get('/api/network-info', (req, res) => {
    res.json({
        ip: localIP,
        port: PORT,
        networkUrl: `http://${localIP}:${PORT}`
    });
});

io.on('connection', (socket) => {
    // Unirse a una sala específica con rol (receiver o sender)
    socket.on('join-room', ({ roomId, role }) => {
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.role = role;

        console.log(`[Socket] Cliente ${socket.id} (${role || 'peer'}) se unió a la sala ${roomId}`);

        // Notificar a los demás integrantes de la sala
        socket.to(roomId).emit('user-joined', {
            id: socket.id,
            role: role
        });
    });

    // Reenvío de Oferta WebRTC
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    // Reenvío de Respuesta WebRTC
    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data);
    });

    // Reenvío de Candidatos ICE
    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data);
    });

    // Desconexión voluntaria de una sala
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`[Socket] Cliente ${socket.id} abandonó la sala ${roomId}`);
        socket.to(roomId).emit('peer-disconnected');
    });

    // Desconexión de socket (cierre de pestaña o pérdida de red)
    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit('peer-disconnected');
                console.log(`[Socket] Notificando desconexión de ${socket.id} en sala ${room}`);
            }
        }
    });

    socket.on('disconnect', () => {
        // Log desconexión limpia
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n======================================================');
    console.log('             CastWeb - Servidor Activo                ');
    console.log('======================================================');
    console.log(` -> Localhost:       http://localhost:${PORT}`);
    console.log(` -> Red Wi-Fi/LAN:   http://${localIP}:${PORT}`);
    console.log('------------------------------------------------------');
    console.log(' [TIP] Abre la URL de Red en tu Smart TV o Celular     ');
    console.log('======================================================\n');
});
