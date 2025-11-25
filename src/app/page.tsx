'use client'; // สำคัญ: ต้องเป็น Client Component เพราะมีการใช้ useState/useEffect

import { useState, useEffect } from 'react';

// 1. ประกาศ Type เพื่อให้ TypeScript รู้จัก window.electronAPI
// (ปกติควรแยกไปไฟล์ types.d.ts แต่ใส่ตรงนี้เพื่อความง่ายครับ)
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<{
        APP_PORT: string;
        SECRET_KEY: string;
        DB_PASSWORD: string;
        source: string
      }>;
      saveConfig: (data: {
        APP_PORT: string;
        SECRET_KEY: string
        DB_PASSWORD: string
      }) => Promise<void>;
    };
  }
}

export default function Home() {
  // 2. State สำหรับจัดการสถานะ
  const [isLoading, setIsLoading] = useState(true); // กำลังโหลดข้อมูล?
  const [config, setConfig] = useState<{
    APP_PORT: string; 
    SECRET_KEY: string; 
    DB_PASSWORD: string; 
    source: string
  } | null>(null);

  // 3. ตรวจสอบ Config ทันทีที่เข้าหน้าเว็บ
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // เช็คว่ารันบน Electron ไหม (กัน error ถ้าเผลอเปิดบน Browser ธรรมดา)
        if (window.electronAPI) {
          const savedConfig = await window.electronAPI.getConfig();
          setConfig(savedConfig);
        }
      } catch (error) {
        console.error("Failed to load config", error);
      } finally {
        setIsLoading(false); // โหลดเสร็จแล้ว (ไม่ว่าจะเจอหรือไม่เจอ)
      }
    };

    fetchConfig();
  }, []);

  // 4. ฟังก์ชันบันทึกค่า (เมื่อ User กรอกฟอร์ม)
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newConfig = {
      APP_PORT: formData.get('APP_PORT') as string,
      SECRET_KEY: formData.get('SECRET_KEY') as string,
      DB_PASSWORD: formData.get('DB_PASSWORD') as string,
    };

    if (window.electronAPI) {
      await window.electronAPI.saveConfig(newConfig);
      // ปกติ saveConfig ใน main.js จะสั่ง relaunch app
      // แต่เราอาจจะ update state ไว้ก่อนเพื่อความชัวร์
      setIsLoading(true);
    }
  };

  // --- ส่วนการแสดงผล (Render) ---

  // A. สถานะกำลังโหลด
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600">Loading Configuration...</div>
      </div>
    );
  }

  // B. ถ้ายังไม่มี Config (ค่าว่าง) -> แสดงฟอร์ม Setup
  // หรือถ้ามี Config แต่ source มาจาก store เราอาจจะอนุญาตให้แก้ไขได้ (แล้วแต่ดีไซน์)
  const isConfigMissing = !config?.APP_PORT || !config?.SECRET_KEY || !config?.DB_PASSWORD;

  if (isConfigMissing) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Initial Setup</h2>
          <p className="mb-4 text-sm text-gray-500">Please configure the application settings before continuing.</p>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700">App Port</label>
              <input
                name="APP_PORT"
                type="number"
                placeholder="e.g. 8000"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">Secret Key</label>
              <input
                name="SECRET_KEY"
                type="text"
                placeholder="Enter secret key"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">Database Password</label>
              <input
                name="DB_PASSWORD"
                type="password"
                placeholder="Enter secret key"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                required
              />
            </div>

            <button
              type="submit"
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              Save & Restart App
            </button>
          </form>
        </div>
      </div>
    );
  }

  // C. ถ้ามี Config แล้ว -> แสดงหน้าหลัก (Hello World)
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-blue-600">Hello World</h1>
      <div className="mt-4 rounded-md bg-gray-100 p-4 text-black text-left shadow-sm">
        <p className="text-sm text-black font-bold mb-2">Current Configuration:</p>
        <p>PORT: <span className="font-mono text-blue-600">{config.APP_PORT}</span></p>
        <p>PASSWORD: <span className="font-mono text-blue-600">{config.DB_PASSWORD}</span></p>
        <p>KEY: <span className="font-mono text-red-500">********</span></p>
        <p className="mt-2 text-xs text-gray-400">
          Loaded from: {config.source === 'file' ? 'config.json (External)' : 'Internal Storage'}
        </p>
      </div>
    </div>
  );
}