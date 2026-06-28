const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'public/psicohub_icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Oculta a barra de menu clássica do navegador (File, View...)
  });

  // Carrega o servidor local de produção do Next.js
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  // Executa o servidor de produção do Next.js (equivalente a next start)
  const nextBin = path.join(__dirname, 'node_modules/next/dist/bin/next');
  
  nextProcess = spawn('node', [nextBin, 'start', '-p', '3000'], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' },
    shell: true // Importante para Windows resolver "node" do PATH
  });

  nextProcess.on('error', (err) => {
    console.error('Erro ao spawnar servidor Next.js:', err);
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`Next.js Output: ${data}`);
    // Se o Next.js estiver pronto, abre a tela do app
    if (data.toString().includes('Ready') || data.toString().includes('started')) {
      if (!mainWindow) {
        createWindow();
      }
    }
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`Next.js Error: ${data}`);
  });

  // Backup: se não identificar a mensagem de Ready no log em 4 segundos, abre a janela mesmo assim
  setTimeout(() => {
    if (!mainWindow) {
      createWindow();
    }
  }, 4500);
}

app.on('ready', () => {
  startNextServer();
});

app.on('window-all-closed', () => {
  // Garante o encerramento do servidor Next.js ao fechar o app
  if (nextProcess) {
    nextProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
