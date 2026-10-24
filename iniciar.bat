@echo off
TITLE CastWeb - Screen Mirroring P2P
color 0F
cls

echo ======================================================================
echo                     CastWeb - Screen Mirroring
echo ======================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js desde: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Instalar dependencias solo si no existe la carpeta node_modules
if not exist "node_modules\" (
    echo [1/2] Instalando paquetes y dependencias necesarias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Ocurrio un fallo al instalar las dependencias con npm.
        pause
        exit /b
    )
) else (
    echo [1/2] Dependencias verificadas correctamente.
)

echo.
echo [2/2] Iniciando servidor WebRTC y WebSockets...
echo.
echo ======================================================================
echo  La aplicacion abrira tu navegador automaticamente.
echo  Para cerrar el servidor, presiona Ctrl + C o cierra esta ventana.
echo ======================================================================
echo.

:: Abrir navegador en segundo plano tras 1.5 segundos
start /B cmd /C "timeout /t 2 /nobreak > NUL && start http://localhost:3000"

:: Iniciar el servidor
npm start
