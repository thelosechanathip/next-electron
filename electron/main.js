const { app, BrowserWindow, ipcMain, safeStorage } = require("electron");
const path = require("path");
const Store = require("electron-store");
const fs = require('fs');
const { spawn } = require("child_process");

const store = new Store();
const isDev = process.env.NODE_ENV === "development";
let backendProcess = null;
let mainWindow = null;

// --- Helper Functions ---
function encryptPassword(plainText) {
    if (!plainText) return "";
    try {
        if (safeStorage.isEncryptionAvailable()) {
            return safeStorage.encryptString(plainText).toString('hex');
        }
    } catch (error) { 
        console.error("Encryption failed:", error); 
    }
    return plainText;
}

function decryptPassword(hexString) {
    if (!hexString) return "";
    try {
        if (safeStorage.isEncryptionAvailable()) {
            const buffer = Buffer.from(hexString, 'hex');
            return safeStorage.decryptString(buffer);
        }
    } catch (error) { 
        console.error("Decryption failed:", error);
        return hexString; 
    }
    return hexString;
}

// --- Config Management ---
let externalConfig = null;

function loadExternalConfig() {
    try {
        const basePath = isDev ? process.cwd() : path.dirname(app.getPath('exe'));
        const configPath = path.join(basePath, 'config.json');
        
        if (fs.existsSync(configPath)) {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            externalConfig = JSON.parse(fileContent);
            console.log("📁 Loaded external config from:", configPath);
        } else {
            console.log("ℹ️  No external config file found, using store");
        }
    } catch (error) { 
        console.error("❌ Error loading config file:", error); 
    }
}

loadExternalConfig();

function getCurrentConfig() {
    // 1. ใช้ config จากไฟล์ถ้ามี
    if (externalConfig && externalConfig.SERVER_PORT) {
        return {
            APPLICATION_PORT: externalConfig.APPLICATION_PORT,
            NEXT_PUBLIC_API_URL: externalConfig.NEXT_PUBLIC_API_URL,
            SERVER_PORT: externalConfig.SERVER_PORT,
            DB_HOST: externalConfig.DB_HOST,
            DB_USERNAME: externalConfig.DB_USERNAME,
            DB_PASSWORD: externalConfig.DB_PASSWORD,
            DB_NAME: externalConfig.DB_NAME,
            DB_PORT: externalConfig.DB_PORT,
            source: 'file'
        };
    }

    // 2. ใช้จาก Store
    return {
        APPLICATION_PORT: store.get('APPLICATION_PORT') || "3000",
        NEXT_PUBLIC_API_URL: store.get('NEXT_PUBLIC_API_URL') || "http://localhost:9000",
        SERVER_PORT: store.get('SERVER_PORT') || "9000",
        DB_HOST: store.get('DB_HOST') || "localhost",
        DB_USERNAME: store.get('DB_USERNAME') || "root",
        DB_PASSWORD: decryptPassword(store.get('DB_PASSWORD')) || "",
        DB_NAME: store.get('DB_NAME') || "test_db",
        DB_PORT: store.get('DB_PORT') || "3306",
        source: 'store'
    };
}

// --- Golang Process Management ---
function getBackendPath() {
    if (isDev) {
        return path.join(__dirname, "../bin/backend.exe");
    } else {
        return path.join(process.resourcesPath, "bin", "backend.exe");
    }
}

function startBackend() {
    const config = getCurrentConfig();
    
    // ถ้า Config ยังไม่ครบ
    if (!config.SERVER_PORT) {
        console.log("⚠️  Config missing, skipping backend start.");
        return;
    }

    const backendPath = getBackendPath();
    console.log("🔧 Starting backend from:", backendPath);

    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!fs.existsSync(backendPath)) {
        console.error(`❌ Backend executable not found at: ${backendPath}`);
        console.error("💡 Please build the Go backend first with: cd backend && go build -o ../bin/backend.exe");
        
        if (mainWindow) {
            mainWindow.webContents.send('backend-status', {
                status: 'error',
                message: 'Backend executable not found. Please build Go backend first.'
            });
        }
        return;
    }

    const args = [
        "-serverPort", config.SERVER_PORT,
        "-dbHost", config.DB_HOST || "localhost",
        "-dbUser", config.DB_USERNAME || "root",
        "-dbPass", config.DB_PASSWORD || "",
        "-dbName", config.DB_NAME || "test_db",
        "-dbPort", config.DB_PORT || "3306"
    ];

    console.log("🚀 Starting backend with args:", args);

    backendProcess = spawn(backendPath, args);

    backendProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();
        console.log(`🔷 Go stdout: ${output}`);
        
        // ส่ง status ไปยัง renderer process
        if (mainWindow) {
            if (output.includes("Golang Backend running")) {
                mainWindow.webContents.send('backend-status', {
                    status: 'running',
                    message: `Backend running on port ${config.SERVER_PORT}`
                });
            } else if (output.includes("Database connected successfully")) {
                mainWindow.webContents.send('backend-status', {
                    status: 'db-connected',
                    message: 'Database connected successfully'
                });
            }
        }
    });

    backendProcess.stderr.on("data", (data) => {
        console.error(`🔶 Go stderr: ${data}`);
        
        if (mainWindow) {
            mainWindow.webContents.send('backend-status', {
                status: 'error',
                message: data.toString()
            });
        }
    });

    backendProcess.on("close", (code) => {
        console.log(`🔴 Go process exited with code ${code}`);
        
        if (mainWindow) {
            mainWindow.webContents.send('backend-status', {
                status: 'stopped',
                message: `Backend stopped with code ${code}`
            });
        }
    });

    // ส่ง status เริ่มต้น
    if (mainWindow) {
        mainWindow.webContents.send('backend-status', {
            status: 'starting',
            message: 'Starting backend process...'
        });
    }
}

function killBackend() {
    if (backendProcess) {
        console.log("🛑 Killing backend process...");
        backendProcess.kill();
        backendProcess = null;
    }
}

// --- Window Management ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, 
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
        // เปิด DevTools ในโหมด development
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
    }

    return mainWindow;
}

// --- Lifecycle ---
app.whenReady().then(() => {
    console.log("🎉 App is ready");
    createWindow();
    startBackend();
});

app.on('will-quit', () => {
    console.log("👋 App is quitting");
    killBackend();
});

app.on('window-all-closed', () => {
    if (process.platform !== "darwin") {
        killBackend();
        app.quit();
    }
});

app.on('before-quit', () => {
    killBackend();
});

// --- IPC Handler ---
ipcMain.handle('get-config', () => {
    return getCurrentConfig();
});

ipcMain.handle('save-config', async (event, data) => {
    console.log("💾 Saving config...");
    
    try {
        // บันทึกการตั้งค่า Frontend
        store.set('APPLICATION_PORT', data.APPLICATION_PORT || "3000");
        store.set('NEXT_PUBLIC_API_URL', data.NEXT_PUBLIC_API_URL || `http://localhost:${data.SERVER_PORT || "9000"}`);
        
        // บันทึกการตั้งค่า Backend
        store.set('SERVER_PORT', data.SERVER_PORT || "9000");
        store.set('DB_HOST', data.DB_HOST || "localhost");
        store.set('DB_USERNAME', data.DB_USERNAME || "root");
        
        const encryptedPass = encryptPassword(data.DB_PASSWORD || "");
        store.set('DB_PASSWORD', encryptedPass);
        
        store.set('DB_NAME', data.DB_NAME || "test_db");
        store.set('DB_PORT', data.DB_PORT || "3306");
        
        console.log("✅ Config saved successfully");
        
        // Restart backend ด้วย config ใหม่
        setTimeout(() => {
            killBackend();
            setTimeout(() => {
                startBackend();
            }, 1000);
        }, 500);
        
        // รีสตาร์ทแอปพลิเคชันหลังจากบันทึก config สำเร็จ
        setTimeout(() => {
            console.log("🔄 Restarting application...");
            app.relaunch();
            app.exit(0);
        }, 2000);
        
        return { 
            success: true, 
            message: "Configuration saved successfully. Application will restart in 2 seconds." 
        };
        
    } catch (error) {
        console.error("❌ Error saving config:", error);
        return { 
            success: false, 
            message: `Failed to save configuration: ${error.message}` 
        };
    }
});

// IPC สำหรับจัดการ backend
ipcMain.handle('restart-backend', () => {
    killBackend();
    setTimeout(() => {
        startBackend();
    }, 1000);
    return { success: true, message: "Backend restart initiated" };
});

ipcMain.handle('get-backend-status', () => {
    return backendProcess ? { running: true } : { running: false };
});

// ฟังก์ชันสำหรับรีสตาร์ทแอป
ipcMain.handle('restart-app', () => {
    console.log("🔄 Restarting application...");
    killBackend();
    
    // รีสตาร์ทแอปพลิเคชัน
    app.relaunch();
    app.exit(0);
    
    return { success: true, message: "Application restarting..." };
});