import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { IPCChannels } from '../shared/types';
class ElectronApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.env.NODE_ENV === 'development';
        this.initializeApp();
    }
    initializeApp() {
        // Handle app ready event
        app.whenReady().then(() => {
            this.createMainWindow();
            this.setupIPC();
            // macOS specific: recreate window when dock icon is clicked
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createMainWindow();
                }
            });
        });
        // Quit when all windows are closed (except on macOS)
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
        // Security: Prevent new window creation
        app.on('web-contents-created', (_, contents) => {
            contents.setWindowOpenHandler(() => {
                return { action: 'deny' };
            });
        });
    }
    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
            show: false, // Don't show until ready
            title: 'Typster Hammy',
        });
        // Load the renderer
        if (this.isDev) {
            this.mainWindow.loadURL('http://localhost:3001');
            this.mainWindow.webContents.openDevTools();
        }
        else {
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });
        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }
    setupIPC() {
        // Test IPC communication
        ipcMain.handle(IPCChannels.PING, async () => {
            console.log('Main process received ping');
            return 'pong';
        });
        // Handle dashboard open request
        ipcMain.on(IPCChannels.DASHBOARD_OPEN, () => {
            console.log('Dashboard open requested');
            // TODO: Implement dashboard window creation
        });
        // Handle dashboard close request
        ipcMain.on(IPCChannels.DASHBOARD_CLOSE, () => {
            console.log('Dashboard close requested');
            // TODO: Implement dashboard window closing
        });
        // Handle typing events (will be implemented in future tasks)
        ipcMain.on(IPCChannels.TYPING_EVENT, (_, event) => {
            console.log('Typing event received:', event);
            // TODO: Process typing event and trigger Hammy reaction
        });
    }
    getMainWindow() {
        return this.mainWindow;
    }
}
// Initialize the application
new ElectronApp();
