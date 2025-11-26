'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<{
        APPLICATION_PORT: string
        NEXT_PUBLIC_API_URL: string
        DB_HOST: string
        DB_USERNAME: string
        DB_PASSWORD: string
        DB_NAME: string
        DB_PORT: string
        SERVER_PORT: string
        source: string
      }>
      saveConfig: (data: {
        APPLICATION_PORT: string
        NEXT_PUBLIC_API_URL: string
        DB_HOST: string
        DB_USERNAME: string
        DB_PASSWORD: string
        DB_NAME: string
        DB_PORT: string
        SERVER_PORT: string
      }) => Promise<{success: boolean, message: string}>
    }
  }
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<{
    APPLICATION_PORT: string
    NEXT_PUBLIC_API_URL: string
    DB_HOST: string
    DB_USERNAME: string
    DB_PASSWORD: string
    DB_NAME: string
    DB_PORT: string
    SERVER_PORT: string
    source: string
  } | null>(null);
  const [testResult, setTestResult] = useState<{status: string, message: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (window.electronAPI) {
          const savedConfig = await window.electronAPI.getConfig();
          setConfig(savedConfig);
        }
      } catch (error) {
        console.error("Failed to load config", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // ฟังก์ชันทดสอบการเชื่อมต่อ Database
  const testDatabaseConnection = async (dbConfig: {
    DB_HOST: string
    DB_USERNAME: string
    DB_PASSWORD: string
    DB_NAME: string
    DB_PORT: string
  }) => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // ใช้ port ปัจจุบันของ backend สำหรับการทดสอบ
      const currentPort = config?.SERVER_PORT || '9000';
      const response = await fetch(`http://localhost:${currentPort}/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          db_host: dbConfig.DB_HOST,
          db_user: dbConfig.DB_USERNAME,
          db_password: dbConfig.DB_PASSWORD,
          db_name: dbConfig.DB_NAME,
          db_port: dbConfig.DB_PORT,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      return result.status === 'success';
    } catch (error) {
      // แก้ไข type error โดยใช้ type guard
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setTestResult({
        status: 'error',
        message: `Connection test failed: ${errorMessage}`
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);

    const newConfig = {
      APPLICATION_PORT: formData.get('APPLICATION_PORT') as string,
      NEXT_PUBLIC_API_URL: formData.get('NEXT_PUBLIC_API_URL') as string,
      DB_HOST: formData.get('DB_HOST') as string,
      DB_USERNAME: formData.get('DB_USERNAME') as string,
      DB_PASSWORD: formData.get('DB_PASSWORD') as string,
      DB_NAME: formData.get('DB_NAME') as string,
      DB_PORT: formData.get('DB_PORT') as string,
      SERVER_PORT: formData.get('SERVER_PORT') as string,
    };

    // ทดสอบการเชื่อมต่อ Database ก่อนบันทึก
    const isConnectionValid = await testDatabaseConnection({
      DB_HOST: newConfig.DB_HOST,
      DB_USERNAME: newConfig.DB_USERNAME,
      DB_PASSWORD: newConfig.DB_PASSWORD,
      DB_NAME: newConfig.DB_NAME,
      DB_PORT: newConfig.DB_PORT,
    });

    if (!isConnectionValid) {
      alert('❌ Cannot save configuration: Database connection test failed!\n\nPlease check your database settings and try again.');
      setIsSaving(false);
      return;
    }

    // ถ้าเชื่อมต่อได้ ให้บันทึก config
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.saveConfig(newConfig);
        
        if (result.success) {
          // แสดงข้อความสำเร็จ
          alert('✅ ' + result.message);
          // ไม่ต้องตั้งค่า isLoading เพราะแอปจะรีสตาร์ทเอง
        } else {
          alert(`❌ ${result.message}`);
        }
      } catch (error) {
        // แก้ไข type error
        let errorMessage = 'Failed to save configuration';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        alert(`❌ ${errorMessage}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const dbConfig = {
      DB_HOST: formData.get('DB_HOST') as string,
      DB_USERNAME: formData.get('DB_USERNAME') as string,
      DB_PASSWORD: formData.get('DB_PASSWORD') as string,
      DB_NAME: formData.get('DB_NAME') as string,
      DB_PORT: formData.get('DB_PORT') as string,
    };

    await testDatabaseConnection(dbConfig);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600 mb-4">Loading Configuration...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const isConfigMissing =
    !config?.APPLICATION_PORT ||
    !config?.NEXT_PUBLIC_API_URL ||
    !config?.DB_HOST ||
    !config?.DB_USERNAME ||
    !config?.DB_PASSWORD ||
    !config?.DB_NAME ||
    !config?.DB_PORT ||
    !config?.SERVER_PORT;

  if (isConfigMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-6xl rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Initial Setup</h2>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Frontend Settings */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-blue-600 border-b pb-2">Frontend Settings</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700">Application Port</label>
                  <input
                    name="APPLICATION_PORT"
                    type="number"
                    defaultValue={config?.APPLICATION_PORT || "3000"}
                    placeholder="3000"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">API URL</label>
                  <input
                    name="NEXT_PUBLIC_API_URL"
                    type="text"
                    defaultValue={config?.NEXT_PUBLIC_API_URL || "http://localhost:9000"}
                    placeholder="http://localhost:9000"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>
              </div>

              {/* Backend Settings */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-green-600 border-b pb-2">Backend Settings</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700">Server Port</label>
                  <input
                    name="SERVER_PORT"
                    type="number"
                    defaultValue={config?.SERVER_PORT || "9000"}
                    placeholder="9000"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>
              </div>

              {/* Database Settings */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-purple-600 border-b pb-2">Database Settings</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700">Database Host</label>
                  <input
                    name="DB_HOST"
                    type="text"
                    defaultValue={config?.DB_HOST || "localhost"}
                    placeholder="localhost or 127.0.0.1"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Database Username</label>
                  <input
                    name="DB_USERNAME"
                    type="text"
                    defaultValue={config?.DB_USERNAME || "root"}
                    placeholder="root"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Database Password</label>
                  <input
                    name="DB_PASSWORD"
                    type="password"
                    defaultValue={config?.DB_PASSWORD || ""}
                    placeholder="Your database password"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Database Name</label>
                  <input
                    name="DB_NAME"
                    type="text"
                    defaultValue={config?.DB_NAME || "test_db"}
                    placeholder="test_db"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Database Port</label>
                  <input
                    name="DB_PORT"
                    type="number"
                    defaultValue={config?.DB_PORT || "3306"}
                    placeholder="3306"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none text-black"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isSaving}
                className={`rounded-md px-4 py-2 text-white transition ${
                  isTesting || isSaving
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isTesting ? 'Testing Connection...' : 'Test Database Connection'}
              </button>

              {testResult && (
                <div className={`p-3 rounded-md ${
                  testResult.status === 'success' 
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  <strong>{testResult.status === 'success' ? '✅ Success:' : '❌ Error:'}</strong> {testResult.message}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                {config?.source && `Config source: ${config.source === 'file' ? 'config.json' : 'electron-store'}`}
              </div>
              <button
                type="submit"
                disabled={testResult?.status === 'error' || isTesting || isSaving}
                className={`rounded-md px-6 py-2 text-white transition ${
                  testResult?.status === 'error' || isTesting || isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save & Restart App'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold text-blue-600">Hello World</h1>
      <div className="mt-4 rounded-md bg-gray-100 p-4 text-black text-left shadow-sm">
        <h1>ยินดีต้อนรับสู่ Program Test Electron Version 0.2.0</h1>
        <p className="text-sm text-black font-bold mb-2">Current Configuration:</p>
        <p>PORT: <span className="font-mono text-blue-600">{config.APPLICATION_PORT}</span></p>
        <p>PASSWORD: <span className="font-mono text-blue-600">{config.DB_PASSWORD}</span></p>
        <p>KEY: <span className="font-mono text-red-500">********</span></p>
        <p className="mt-2 text-xs text-gray-400">
          Loaded from: {config.source === 'file' ? 'config.json (External)' : 'Internal Storage'}
        </p>
      </div>
    </div>
  );
}