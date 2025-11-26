const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (data) => ipcRenderer.invoke('save-config', data),
    restartBackend: () => ipcRenderer.invoke('restart-backend'),
    restartApp: () => ipcRenderer.invoke('restart-app'),
    getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
    
    // สำหรับรับ real-time updates เกี่ยวกับ backend status
    onBackendStatus: (callback) => {
        ipcRenderer.on('backend-status', (event, data) => callback(data));
    },
    
    // Cleanup listener
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});