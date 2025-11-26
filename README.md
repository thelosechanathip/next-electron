# First Project

## Install Dependencies
```bash
npm i -D electron concurrently cross-env wait-on
```

## Setup package.json
```
"main": "electron/main.js",
"scripts": {
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:electron\"",
    "dev:next": "next dev --turbopack",
    "dev:electron": "wait-on http://localhost:3000 && cross-env NODE_ENV=development electron .",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
}
```

## Setup electron
สร้าง folder electron บน project ได้เลย
electron/main.js
```
const { app, BrowserWindow } = require("electron")
const path = require("path")

const isDev = process.env.NODE_ENV === "development"

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        }
    })

    if (isDev) {
        win.loadURL("http://localhost:3000")
    } else {
        win.loadFile(path.join(__dirname, "../out/index.html"))
    }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
    if (process.platform !== "darwin") app.quit()
})
```

electron/preload.js
```
ไม่มีข้อมูลอยู่ใน File
```

## ทดสอบ Run NextJS Electron แบบ DEV
```bash
npm run dev
```

## การ Build เป็น Project สำหรับ Install
next.config.ts
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // สำคัญ: สั่งให้ build ออกมาเป็นไฟล์ static ในโฟลเดอร์ out
  images: {
    unoptimized: true, // สำคัญ: เพราะไม่มี node server คอย resize รูปในไฟล์ exe
  },
};

export default nextConfig;
```

Install Dependencies
```bash
npm install --save-dev electron-builder
```

Update file package.json
```
"description": "My Electron App",  // รายละเอียดโปรแกรม
  "author": "Your Name",             // ชื่อผู้พัฒนา
"scripts": {
    "dist": "next build && electron-builder"
},
"build": {
    "appId": "com.example.testelectron",    // ID ของโปรแกรม (ห้ามซ้ำกับโปรแกรมอื่นในเครื่อง)
    "productName": "TestElectronApp",       // ชื่อที่จะแสดงตอนติดตั้ง และชื่อไฟล์ .exe
    "directories": {
      "output": "dist"                      // โฟลเดอร์ปลายทางที่จะเก็บไฟล์ .exe ที่สร้างเสร็จ
    },
    "files": [                              // **สำคัญมาก**: บอกว่าจะเอาไฟล์ไหนใส่ลงไปในโปรแกรมบ้าง
      "out/**/*",                           // 1. เอาหน้าเว็บที่ build แล้ว (Next.js static export)
      "electron/**/*",                      // 2. เอาไฟล์ main process ของ electron
      "package.json"
    ],
    "win": {
      "target": ["nsis"],                   // บอกว่าให้สร้างเป็นตัว Installer แบบมาตรฐาน (Setup.exe)
      "icon": "electron/icon.ico"           // ไอคอนของโปรแกรม (ถ้ามี)
    },
    "nsis": {                               // การตั้งค่าหน้าจอตอนกดติดตั้ง (Next, Next, Finish)
      "oneClick": false,                    // false = ให้ผู้ใช้กด Next เอง (ไม่ติดตั้งเงียบๆ)
      "allowToChangeInstallationDirectory": true // อนุญาตให้ผู้ใช้เลือก Drive ที่จะลงโปรแกรมได้
    }
},
```

Run คำสั่งด้านล่างด้วย Administrator
```bash
npm run dist
```

จะได้ File ติดตั้งอยู่ใน Folder dist/{ชื่อ File}.exe

## build GoLang
```bash
# ตั้งค่าให้ build สำหรับ Windows (สำคัญมากถ้าทำบน Mac/Linux)
# แต่ถ้าทำบน Windows อยู่แล้ว ข้ามบรรทัด set ได้
set GOOS=windows
set GOARCH=amd64

# สั่ง Build (ใส่ flag -H=windowsgui เพื่อซ่อนหน้าต่างดำๆ ตอน Production)
go build -ldflags -H=windowsgui -o bin/backend.exe backend/main.go
```