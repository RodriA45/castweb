// ============================================================================
// CastWeb - Client Engine (WebRTC + Socket.io)
// ============================================================================

const socket = io();

// DOM References
const viewMainMenu = document.getElementById('main-menu');
const viewRoom = document.getElementById('room-view');
const btnReceive = document.getElementById('btn-receive');
const btnSend = document.getElementById('btn-send');
const btnLeave = document.getElementById('btn-leave');
const btnCopyCode = document.getElementById('btn-copy-code');
const btnShareLink = document.getElementById('btn-share-link');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnPip = document.getElementById('btn-pip');
const btnUnmuteOverlay = document.getElementById('btn-unmute-overlay');
const btnCopyNetwork = document.getElementById('btn-copy-network');
const networkBadge = document.getElementById('network-badge');
const networkIpDisplay = document.getElementById('network-ip-display');

const roomCodeInput = document.getElementById('room-code-input');
const chkAudio = document.getElementById('chk-audio');
const displayRoomCode = document.getElementById('display-room-code');
const statusRoomCode = document.getElementById('status-room-code');
const stepCode = document.getElementById('step-code');
const remoteVideo = document.getElementById('remote-video');
const videoWrapper = document.getElementById('video-wrapper');
const statusMessage = document.getElementById('status-message');
const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');
const statusIndicator = document.querySelector('.status-indicator-pulse');
const toastContainer = document.getElementById('toast-container');

// State Variables
let currentRoom = null;
let isSender = false;
let localStream = null;
let peerConnection = null;
let iceCandidatesQueue = [];
let networkInfo = null;

// WebRTC Configuration (Google STUN Public Servers)
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// ============================================================================
// Toast Notification Utility
// ============================================================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// ============================================================================
// Network Info & URL Parameters
// ============================================================================
async function initNetworkInfo() {
    try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
            networkInfo = await res.json();
            if (networkInfo && networkInfo.networkUrl) {
                networkIpDisplay.textContent = `${networkInfo.ip}:${networkInfo.port}`;
            }
        }
    } catch (e) {
        networkIpDisplay.textContent = window.location.host;
    }
}

function copyNetworkUrl() {
    const url = networkInfo && networkInfo.networkUrl ? networkInfo.networkUrl : window.location.origin;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace de red copiado al portapapeles', 'success');
    }).catch(() => {
        showToast(`Dirección de red: ${url}`, 'info');
    });
}

if (networkBadge) networkBadge.addEventListener('click', copyNetworkUrl);
if (btnCopyNetwork) btnCopyNetwork.addEventListener('click', (e) => {
    e.stopPropagation();
    copyNetworkUrl();
});

// Check URL Params for direct join: ?join=1234 or ?room=1234
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join') || params.get('room');
    if (joinCode && joinCode.length === 4) {
        roomCodeInput.value = joinCode;
        showToast(`Código ${joinCode} detectado. Pulsa Conectar.`, 'info');
    }
}

// Generate 4-digit PIN
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Switch to Room View
function showRoomView(code) {
    currentRoom = code;
    displayRoomCode.textContent = code;
    statusRoomCode.textContent = code;
    stepCode.textContent = code;

    viewMainMenu.classList.remove('active');
    viewRoom.classList.remove('hidden');
    viewRoom.classList.add('active');
}

// Reset application state
function resetView() {
    if (currentRoom) {
        socket.emit('leave-room', currentRoom);
    }

    currentRoom = null;
    isSender = false;
    iceCandidatesQueue = [];

    viewRoom.classList.remove('active');
    viewRoom.classList.add('hidden');
    viewMainMenu.classList.add('active');

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    remoteVideo.srcObject = null;
    remoteVideo.classList.remove('active');
    btnUnmuteOverlay.classList.add('hidden');

    statusMessage.style.display = 'flex';
    statusTitle.textContent = 'Esperando dispositivo emisor...';
    statusText.innerHTML = 'Ingresa el código <strong class="text-mono">----</strong> en el dispositivo que va a compartir pantalla.';
    statusIndicator.classList.remove('connected');
    roomCodeInput.value = '';
}

// ============================================================================
// Receiver (Pantalla Destino / TV)
// ============================================================================
btnReceive.addEventListener('click', () => {
    isSender = false;
    const code = generateRoomCode();
    socket.emit('join-room', { roomId: code, role: 'receiver' });
    showRoomView(code);
    initPeerConnection();
    showToast(`Sala ${code} creada. Esperando conexión...`, 'info');
});

// ============================================================================
// Sender (Dispositivo que comparte pantalla)
// ============================================================================
btnSend.addEventListener('click', startCasting);
roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startCasting();
});

async function startCasting() {
    const code = roomCodeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
        showToast('Ingresa un código válido de 4 dígitos numéricos.', 'error');
        roomCodeInput.focus();
        return;
    }

    const wantAudio = chkAudio.checked;

    try {
        // Solicitud de captura de pantalla con audio
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: wantAudio ? {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } : false
            });
        } catch (mediaErr) {
            // Si falló por pedir audio en un navegador que no lo soporta en ventana, reintentar solo video
            if (wantAudio) {
                console.warn('Fallo al capturar audio, reintentando solo video...', mediaErr);
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                showToast('Transmitiendo solo video (audio no compatible con la selección)', 'info');
            } else {
                throw mediaErr;
            }
        }

        localStream = stream;
        isSender = true;

        socket.emit('join-room', { roomId: code, role: 'sender' });
        showRoomView(code);
        statusTitle.textContent = 'Estableciendo transmisión...';
        statusText.textContent = 'Conectando con la pantalla receptora...';
        initPeerConnection();

        // Cuando el usuario finaliza la captura desde el banner flotante nativo del navegador
        localStream.getVideoTracks()[0].onended = () => {
            showToast('Transmisión detenida por el usuario', 'info');
            resetView();
        };

        showToast('Pantalla lista para transmitir', 'success');

    } catch (err) {
        console.error('Error al capturar pantalla:', err);
        if (err.name === 'NotAllowedError') {
            showToast('Permiso de compartir pantalla cancelado.', 'info');
        } else {
            showToast('No se pudo acceder a la pantalla. Comprueba los permisos.', 'error');
        }
    }
}

btnLeave.addEventListener('click', resetView);

// ============================================================================
// WebRTC Core
// ============================================================================
function initPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(rtcConfig);
    iceCandidatesQueue = [];

    // Enviar candidatos ICE generados localmente
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentRoom) {
            socket.emit('ice-candidate', {
                roomId: currentRoom,
                candidate: event.candidate
            });
        }
    };

    // Monitoreo de estado de conexión
    peerConnection.onconnectionstatechange = () => {
        console.log(`[WebRTC] Estado de conexión: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'connected') {
            statusIndicator.classList.add('connected');
        } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            statusIndicator.classList.remove('connected');
            if (!isSender && remoteVideo.srcObject) {
                showToast('Conexión con el emisor perdida', 'error');
            }
        }
    };

    // Si somos receptores: escuchar tracks entrantes (audio y video)
    if (!isSender) {
        peerConnection.ontrack = (event) => {
            console.log('[WebRTC] Track recibido:', event.track.kind);
            statusMessage.style.display = 'none';
            remoteVideo.classList.add('active');
            statusIndicator.classList.add('connected');

            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
            }

            // Manejo de política de Autoplay con audio
            remoteVideo.play().catch(playErr => {
                console.warn('[Video] Autoplay bloqueado por el navegador:', playErr);
                remoteVideo.muted = true;
                remoteVideo.play();
                btnUnmuteOverlay.classList.remove('hidden');
            });

            showToast('¡Transmisión en vivo iniciada!', 'success');
        };
    }

    // Si somos emisores: inyectar tracks locales
    if (isSender && localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

async function createOffer() {
    try {
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        });
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', {
            roomId: currentRoom,
            sdp: offer
        });
    } catch (err) {
        console.error('[WebRTC] Error al crear oferta:', err);
        showToast('Error al iniciar oferta WebRTC', 'error');
    }
}

// Vaciar cola de candidatos ICE una vez establecida la descripción remota
async function drainIceCandidates() {
    while (iceCandidatesQueue.length > 0) {
        const candidate = iceCandidatesQueue.shift();
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('[WebRTC] Error al procesar candidato en cola:', e);
        }
    }
}

// ============================================================================
// Socket.io Signaling Events
// ============================================================================
socket.on('user-joined', async ({ id, role }) => {
    console.log(`[Socket] Peer conectado en la sala (${role || 'peer'})`);

    if (isSender) {
        statusTitle.textContent = 'Dispositivo receptor encontrado';
        statusText.textContent = 'Negociando enlace P2P de alta fidelidad...';
        await createOffer();
    } else {
        statusTitle.textContent = 'Emisor conectado';
        statusText.textContent = 'Recibiendo flujo de video y audio...';
    }
});

socket.on('offer', async (data) => {
    if (isSender || !peerConnection) return;
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await drainIceCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', {
            roomId: currentRoom,
            sdp: answer
        });
    } catch (err) {
        console.error('[WebRTC] Error procesando oferta remota:', err);
    }
});

socket.on('answer', async (data) => {
    if (!peerConnection) return;
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await drainIceCandidates();
        statusMessage.style.display = 'none';
        statusIndicator.classList.add('connected');
        showToast('¡Conectado exitosamente con el receptor!', 'success');
    } catch (err) {
        console.error('[WebRTC] Error procesando respuesta remota:', err);
    }
});

socket.on('ice-candidate', async (data) => {
    if (!data.candidate) return;
    if (peerConnection && peerConnection.remoteDescription) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.warn('[WebRTC] Error agregando candidato ICE:', err);
        }
    } else {
        // Almacenar en cola si la descripción remota aún no está disponible
        iceCandidatesQueue.push(data.candidate);
    }
});

socket.on('peer-disconnected', () => {
    if (!isSender) {
        showToast('El emisor se ha desconectado. Esperando reconexión...', 'info');
        remoteVideo.srcObject = null;
        remoteVideo.classList.remove('active');
        statusMessage.style.display = 'flex';
        statusTitle.textContent = 'Transmisión finalizada';
        statusText.innerHTML = `La sala sigue activa. Vuelve a ingresar el código <strong class="text-mono">${currentRoom}</strong> para reconectar.`;
        statusIndicator.classList.remove('connected');
        btnUnmuteOverlay.classList.add('hidden');
        initPeerConnection();
    } else {
        showToast('El receptor cerró la conexión.', 'info');
    }
});

// ============================================================================
// Actions & Controls (Fullscreen, Unmute, Copy)
// ============================================================================
btnCopyCode.addEventListener('click', () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom).then(() => {
        showToast(`Código ${currentRoom} copiado`, 'success');
    });
});

btnShareLink.addEventListener('click', () => {
    if (!currentRoom) return;
    const base = networkInfo && networkInfo.networkUrl ? networkInfo.networkUrl : window.location.origin;
    const shareUrl = `${base}/?join=${currentRoom}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('¡Enlace directo copiado al portapapeles!', 'success');
    }).catch(() => {
        showToast(`Enlace: ${shareUrl}`, 'info');
    });
});

// Botón de activación de sonido si el navegador bloqueó el autoplay con volumen
btnUnmuteOverlay.addEventListener('click', () => {
    remoteVideo.muted = false;
    btnUnmuteOverlay.classList.add('hidden');
    showToast('Sonido activado', 'success');
});

// Control de Pantalla Completa (Ideal para Smart TVs)
btnFullscreen.addEventListener('click', toggleFullscreen);
videoWrapper.addEventListener('dblclick', toggleFullscreen);

document.addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F') && viewRoom.classList.contains('active')) {
        toggleFullscreen();
    }
});

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (videoWrapper.requestFullscreen) {
            videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
            videoWrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Picture-in-Picture
if (document.pictureInPictureEnabled && btnPip) {
    btnPip.addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (remoteVideo.readyState >= 2) {
                await remoteVideo.requestPictureInPicture();
            } else {
                showToast('Espera a que comience el video para activar PiP', 'info');
            }
        } catch (e) {
            console.error(e);
        }
    });
} else if (btnPip) {
    btnPip.style.display = 'none';
}

// Inicialización
initNetworkInfo();
checkUrlParams();
