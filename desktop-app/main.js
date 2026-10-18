const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

// PRODUCTION URL
const APP_URL = 'https://maheshiesacademy.edustacks.co.in';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Mahesh IES Academy",
        icon: path.join(__dirname, 'icon.ico'), // Will use icon.ico if present
        webPreferences: {
            nodeIntegration: false, // Security best practice
            contextIsolation: true, // Security best practice
            devTools: false         // DISABLE Inspect Element in production
        }
    });

    // 1. IMPROVED UI: Remove Default Menu
    mainWindow.setMenuBarVisibility(false);

    // 2. SECURITY HEADER INJECTION
    // This is crucial: It tells the backend "This is the Desktop App"
    const filter = { urls: ['*://*.edustacks.co.in/*', '*://*.maheshiesacademy.com/*'] };

    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        details.requestHeaders['X-Client-Platform'] = 'desktop';
        // Optional: Version tracking
        details.requestHeaders['X-App-Version'] = '1.0.0';
        callback({ requestHeaders: details.requestHeaders });
    });

    // 3. LOAD THE LMS
    mainWindow.loadURL(APP_URL);

    // 4. EXTERNAL LINK HANDLING
    // If a user clicks a link that goes OUTSIDE the LMS (e.g., YouTube, Wikipedia),
    // open it in the default system browser (Chrome/Edge) instead of the app.
    // This is better UX and safer.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(APP_URL)) {
            return { action: 'allow' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
