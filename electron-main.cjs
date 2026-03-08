const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

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
            mainWindow.setSkipTaskbar(true); // Esconde da barra de tarefas
        }
    });
}

function createTray() {
    try {
        // Ícone padrão em Base64 (Um círculo azul nítido)
        const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AgKDA8Ym9B5OgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmhnAAAAsUlEQVQ4y2NgYGD4jySGR4wYSTZArAEYGBgYmP8zMaAC9v8Y4P8fAyYBiDVAfMAsYAJi9f8ZGD78Z2D48J+B4cN/BoYP/xkYPvxnYPjwnyT9ID6S9IHYSPmPeidIDEYW/idJDJAi/0kSgxSBYv+TBAYpAsX/kwQGKQLF/pMEBikCxf6TBEYpAiwMDCwMDCwMDCwMDAwsDAwsDAwsDAwsDAwsDAwsDAwsDAwsDAwsDAwsDAysDAwMAMYCHq7eAAAAAElFTkSuQmCC';
        let image = nativeImage.createFromDataURL(`data:image/png;base64,${base64Icon}`);

        // Tenta carregar do arquivo se existir
        const locations = [
            path.join(__dirname, 'public/tray-icon.png'),
            path.join(__dirname, 'dist/tray-icon.png'),
            path.join(__dirname, 'tray-icon.png'),
            path.join(process.resourcesPath, 'app/public/tray-icon.png'),
            path.join(process.resourcesPath, 'public/tray-icon.png')
        ];

        for (const loc of locations) {
            if (fs.existsSync(loc)) {
                const fileImage = nativeImage.createFromPath(loc);
                if (!fileImage.isEmpty()) {
                    image = fileImage;
                    break;
                }
            }
        }

        tray = new Tray(image);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Abrir Map Safety Notifier',
                click: () => {
                    mainWindow.show();
                    mainWindow.setSkipTaskbar(false);
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
            if (mainWindow.isVisible()) {
                mainWindow.hide();
                mainWindow.setSkipTaskbar(true);
            } else {
                mainWindow.show();
                mainWindow.setSkipTaskbar(false);
                mainWindow.focus();
            }
        });
    } catch (e) {
        console.error("Erro crítico ao criar Tray:", e.message);
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
