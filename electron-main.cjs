const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let tray;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 400,
        icon: path.join(__dirname, 'public/pwa-512x512.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false, // Inicia oculto, o ready-to-show mostra
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Em vez de fechar, minimiza para a bandeja
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    try {
        const iconPath = path.join(__dirname, 'public/tray-icon.png');
        tray = new Tray(iconPath);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Abrir Map Safety Notifier',
                click: () => {
                    mainWindow.show();
                }
            },
            { type: 'separator' },
            {
                label: 'Sair',
                click: () => {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('Map Safety Notifier');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        });
    } catch (e) {
        console.error("Falha ao criar Tray icon:", e.message);
    }
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
