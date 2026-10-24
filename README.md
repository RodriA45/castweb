<div align="center">

# CastWeb 🚀
### Ultra-Low Latency Screen & Audio Mirroring Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![WebRTC](https://img.shields.io/badge/Protocol-WebRTC_P2P-323330?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Socket.io](https://img.shields.io/badge/Signaling-Socket.io-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**CastWeb** es una solución web moderna de código abierto para proyectar y transmitir pantalla y audio en tiempo real entre múltiples dispositivos (PC a Smart TV, celular a monitor, PC a laptop) sin necesidad de instalar programas adicionales, dongles o extensiones de navegador.

[Características](#-características) • [Arquitectura](#-arquitectura) • [Instalación](#-instalación-rápida) • [Guía de Conexión](#-cómo-conectar-dispositivos) • [Despliegue](#-despliegue-en-producción)

</div>

---

## ⚡ Características Principales

- **🎥 Transmisión P2P de Ultra Baja Latencia**: Comunicación directa punto a punto entre dispositivos mediante **WebRTC** (<100 ms en redes locales).
- **🔊 Compartición de Audio en Tiempo Real**: Envía video junto con el audio del sistema, pestañas o aplicaciones (música, películas, juegos).
- **📺 Modo TV & Pantalla Completa**: Interfaz pensada para Smart TVs con controles accesibles, soporte de pantalla completa en 1 clic y *Picture-in-Picture* (PiP).
- **🌐 Detección Automática de Red Local (LAN)**: Muestra automáticamente la dirección IP local para que solo debas abrir la URL en el navegador de tu TV o teléfono.
- **🔗 Emparejamiento Rápido con PIN y Enlace Directo**: Código de 4 dígitos o enlaces con parámetros `?join=XXXX` para conexión instantánea.
- **🔒 Privacidad y Seguridad por Diseño**: Todo el tráfico audiovisual fluye cifrado de extremo a extremo entre los dos dispositivos; el servidor jamás almacena ni intercepta tus medios.
- **📱 100% Responsivo y Minimalista**: Diseño SaaS oscuro (*Dark Mode*) de alta fidelidad, optimizado para evitar zoom involuntario en iOS y con navegación táctil fluida.

---

## 🏗️ Arquitectura del Sistema

```
 ┌─────────────────┐                                  ┌─────────────────┐
 │  Dispositivo A  │                                  │  Dispositivo B  │
 │ (Emisor: PC/Móvil)                                 │ (Receptor: TV/PC)
 └────────┬────────┘                                  └────────┬────────┘
          │                                                    │
          │ 1. Conexión WebSocket (Salas & Handshake)           │
          ├───────────────────►┌──────────────┐◄──────────────┤
          │                    │  Servidor    │                │
          │◄───────────────────│ Señalización │────────────────►│
          │                    │ (Node/Socket)│                │
          │ 2. SDP Offer/Answer└──────────────┘                │
          │    & ICE Candidates                                │
          │                                                    │
          │ 3. Canal P2P Directo (WebRTC MediaStream)          │
          │====================================================│
          │►►►►►►► Video HD (getDisplayMedia) + Audio ►►►►►►►►►│
```

1. **Señalización (Signaling)**: El servidor ligero con **Node.js + Socket.io** se encarga de crear las salas y permitir que los dos dispositivos intercambien sus descripciones de sesión (SDP) y candidatos ICE.
2. **Flujo de Medios (Peer-to-Peer)**: Una vez establecido el enlace, el audio y video viajan directamente entre ambos clientes mediante protocolos RTP/SRTP a través de los servidores STUN de Google.

---

## 🚀 Instalación Rápida

### Requisitos Previos
- [Node.js](https://nodejs.org/) (versión 16 o superior).

### En Windows (1 Clic)
Simplemente haz doble clic sobre el archivo **`iniciar.bat`**:
- Verificará la instalación de Node.js.
- Descargará las dependencias necesarias (`npm install`) solo si es la primera vez.
- Iniciará el servidor y abrirá tu navegador automáticamente en `http://localhost:3000`.

### Instalación Manual (Linux / macOS / Windows)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/castweb.git
cd castweb

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start
```

La consola mostrará:
```text
======================================================
             CastWeb - Servidor Activo                
======================================================
 -> Localhost:       http://localhost:3000
 -> Red Wi-Fi/LAN:   http://192.168.1.XX:3000
------------------------------------------------------
 [TIP] Abre la URL de Red en tu Smart TV o Celular     
======================================================
```

---

## 📱 Cómo Conectar Dispositivos

### Caso 1: Transmitir desde PC hacia Smart TV
1. Enciende tu Smart TV y abre la aplicación del **Navegador Web** (Browser).
2. Entra a la dirección IP mostrada en la consola o en la barra superior de CastWeb (Ej: `http://192.168.1.25:3000`).
3. En la TV haz clic en **"Crear sala de recepción"**. Aparecerá un PIN (ej: `7482`).
4. En tu PC entra a `http://localhost:3000`, ingresa el PIN `7482` en **"Transmitir ahora"** y pulsa **Conectar**.
5. Selecciona la pantalla o ventana a compartir y activa la casilla de audio si deseas transmitir sonido.
6. En tu Smart TV presiona el botón **"Pantalla Completa"** o presiona la tecla `F`.

### Caso 2: Transmitir desde Android hacia PC / TV
1. Abre Google Chrome en tu smartphone Android conectado a la misma red Wi-Fi.
2. Ingresa a `http://192.168.X.X:3000`.
3. Ingresa el PIN generado en la pantalla destino y acepta los permisos de transmisión de pantalla del sistema operativo.

---

## 🌐 Despliegue en Producción

Para utilizar CastWeb a través de Internet (fuera de la red local Wi-Fi):

1. **Subir a Render.com / Railway / Fly.io**:
   - Como la aplicación utiliza WebSockets persistentes, se recomienda un servicio que soporte procesos continuos (como los Web Services de Render o Railway).
   - Comando de compilación: `npm install`
   - Comando de inicio: `npm start`
   - Variable de entorno: `PORT=3000` (o la que asigne la plataforma).

2. **Servidores STUN / TURN**:
   - Por defecto, CastWeb utiliza los servidores públicos STUN de Google (`stun.l.google.com:19302`), lo que permite conexiones directas en la gran mayoría de routers domésticos.
   - En redes con NATs simétricos estrictos (redes corporativas, universidades o datos móviles cerrados), se puede configurar un servidor TURN (ej. Coturn, Twilio STUN/TURN o Metered) en la configuración de `rtcConfig` dentro de `public/app.js`.

---

## 📁 Estructura del Proyecto

```text
castweb/
├── public/
│   ├── index.html       # Estructura semántica accesible y responsive
│   ├── style.css        # Sistema de diseño SaaS Dark Mode con micro-animaciones
│   ├── app.js           # Cliente WebRTC, colas ICE, Socket.io y controles multimedia
│   └── favicon.svg      # Favicon vectorial minimalista
├── server.js            # Servidor Express + Socket.io con detección de interfaces de red
├── package.json         # Configuración del paquete y dependencias
├── iniciar.bat          # Script de arranque en un clic para entornos Windows
├── .gitignore           # Exclusiones de archivos para Git
└── README.md            # Documentación técnica completa
```

---

## 🛠️ Tecnologías Utilizadas

- **Core**: JavaScript Vanilla (ES6+), HTML5, CSS3 moderno (Variables, Grid, Flexbox, Fullscreen API).
- **Protocolo de Streaming**: WebRTC (API nativa de navegadores: `RTCPeerConnection`, `getDisplayMedia`).
- **Señalización & WebSockets**: [Socket.io](https://socket.io/) (v4.7+).
- **Backend**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/).

---

## 📄 Licencia

Este proyecto está distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.
