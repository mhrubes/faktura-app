const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { createFakturaServer } = require("../web/server");

let mainWindow = null;
let fakturaServer = null;
let serverInfo = null;

function getPaths() {
  const isDev = !app.isPackaged;
  const webRoot = isDev
    ? path.join(__dirname, "..", "web")
    : path.join(process.resourcesPath, "web");
  const dataRoot = isDev
    ? __dirname
    : app.getPath("userData");

  return { webRoot, dataRoot };
}

async function startBackend() {
  const { webRoot, dataRoot } = getPaths();
  fakturaServer = createFakturaServer({
    staticRoot: webRoot,
    dataRoot,
    port: 0,
  });
  serverInfo = await fakturaServer.start();
  return serverInfo;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    title: "Faktura",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${serverInfo.port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    console.error("Spuštění aplikace se nezdařilo:", err);
    app.quit();
  }

  app.on("activate", async () => {
    if (mainWindow) return;
    if (!fakturaServer) await startBackend();
    createWindow();
  });
});

app.on("window-all-closed", async () => {
  if (fakturaServer) {
    await fakturaServer.stop();
    fakturaServer = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  if (fakturaServer) {
    await fakturaServer.stop();
    fakturaServer = null;
  }
});
