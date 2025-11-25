const { app, BrowserWindow, ipcMain, safeStorage } = require("electron"); // 1. เพิ่ม safeStorage
const path = require("path");
const Store = require("electron-store");
const fs = require('fs');

const store = new Store();
const isDev = process.env.NODE_ENV === "development";

// --- ฟังก์ชันช่วย เข้ารหัส/ถอดรหัส (Helper Functions) ---
function encryptPassword(plainText) {
    if (!plainText) return "";
    try {
        if (safeStorage.isEncryptionAvailable()) {
            // เข้ารหัสแล้วแปลงเป็น Hex String เพื่อให้เก็บลงไฟล์ JSON ได้
            return safeStorage.encryptString(plainText).toString('hex');
        }
    } catch (error) {
        console.error("Encryption failed:", error);
    }
    return plainText; // ถ้าเข้ารหัสไม่ได้ (เช่นตอน Dev) ให้ส่งค่าเดิมกลับไป
}

function decryptPassword(hexString) {
    if (!hexString) return "";
    try {
        if (safeStorage.isEncryptionAvailable()) {
            // แปลง Hex String กลับเป็น Buffer แล้วถอดรหัส
            const buffer = Buffer.from(hexString, 'hex');
            return safeStorage.decryptString(buffer);
        }
    } catch (error) {
        // กรณีถอดรหัสไม่ได้ (เช่น เป็น Plain Text หรือคนละเครื่อง)
        // ให้ลองส่งค่าเดิมกลับไป (เผื่อไฟล์ config.json เป็น plain text)
        return hexString; 
    }
    return hexString;
}

// ... (ส่วน loadExternalConfig เหมือนเดิม) ...
let externalConfig = null;
function loadExternalConfig() {
    try {
        const basePath = isDev ? process.cwd() : path.dirname(app.getPath('exe'));
        const configPath = path.join(basePath, 'config.json');
        
        if (fs.existsSync(configPath)) {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            externalConfig = JSON.parse(fileContent);
        }
    } catch (error) {
        console.error("Error loading config file:", error);
    }
}
loadExternalConfig();

// ... (createWindow เหมือนเดิม) ...
function createWindow() {
    // ... (โค้ดเดิม) ...
    const win = new BrowserWindow({
       width: 1200, height: 800,
       webPreferences: {
           preload: path.join(__dirname, "preload.js"),
           contextIsolation: true,
           nodeIntegration: false
       }
    });
    // ...
    if (isDev) win.loadURL("http://localhost:3000");
    else win.loadFile(path.join(__dirname, "../out/index.html"));
}

app.whenReady().then(createWindow);

// --- IPC Handler (ปรับปรุงใหม่) ---

ipcMain.handle('get-config', () => {
    // Case 1: External Config (config.json)
    // ปกติไฟล์นี้ Admin มักจะใส่เป็น Plain Text มาเพื่อให้แก้ไขง่าย
    // แต่ถ้าอยากให้รองรับการเข้ารหัสด้วย ก็ใช้ decryptPassword ครอบไว้ได้
    if (externalConfig && externalConfig.APP_PORT) {
        return {
            APP_PORT: externalConfig.APP_PORT,
            SECRET_KEY: externalConfig.SECRET_KEY,
            // สมมติว่าใน config.json เป็น Plain Text ก็อ่านได้เลย
            // หรือถ้าจะ Encrypt ในไฟล์ ก็ใช้ decryptPassword(externalConfig.DB_PASSWORD)
            DB_PASSWORD: externalConfig.DB_PASSWORD, 
            source: 'file'
        };
    }

    // Case 2: Internal Store (ต้องถอดรหัสก่อนส่งกลับไปใช้)
    return {
        APP_PORT: store.get('APP_PORT'),
        SECRET_KEY: store.get('SECRET_KEY'),
        // ** สำคัญ: ถอดรหัสตรงนี้ **
        DB_PASSWORD: decryptPassword(store.get('DB_PASSWORD')), 
        source: 'store'
    };
});

ipcMain.handle('save-config', (event, data) => {
    store.set('APP_PORT', data.APP_PORT);
    store.set('SECRET_KEY', data.SECRET_KEY);
    
    // ** สำคัญ: เข้ารหัสก่อนบันทึก **
    const encryptedPass = encryptPassword(data.DB_PASSWORD);
    store.set('DB_PASSWORD', encryptedPass);
    
    app.relaunch();
    app.exit(0);
});