// preload.js
const { contextBridge, ipcRenderer } = require('electron');

const currentPagePath = window.location.pathname;
const currentPage = currentPagePath.substring(currentPagePath.lastIndexOf('/') + 1);

contextBridge.exposeInMainWorld('electronAPI', {
  sendToMain: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => { // Alterado de 'receiveFromMain' para 'receive'
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  getCurrentPage: () => {
    return currentPage;
  },
});

ipcRenderer.on('loginResult', (event, result) => {
  if (!result.success) {
    const loginButton = document.getElementById('loginButton'); // Replace with the actual ID of your login button
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = result.message;
      console.error('Login failed:', result.message);
    }
  }
});
