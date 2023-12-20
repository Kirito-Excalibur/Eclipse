const { app, BrowserWindow, ipcMain, Menu } = require("electron");

const fs = require("fs");
const os = require("os");
const pty = require("node-pty");
const shell =
  process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "bash");
const ptyProcess = pty.spawn(shell, ["-i"], {
  name: "xterm-color",
  cols: 90,
  rows: 36,
  cwd: process.env.HOME,
  env: process.env,
});

//Context Menu skipped for now

function readConf() {
  const data = fs.readFileSync(__dirname + "/package.json", "utf8");
  return data;
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  win.loadFile("index.html");

  //Event Listeners

  ptyProcess.onData((data) => {
    win.webContents.send("terminal.fromPty", data);
  });

  ptyProcess.onExit(() => {
    win.close();
  });

  ipcMain.on("terminal.toPty", (event, data) => {
    ptyProcess.write(data);
  });

  ipcMain.on("update-title", (event, title) => {
    win.setTitle(title);
  });

  ipcMain.on("synchronous-message", (event, arg) => {
    event.returnValue = readConf();
  });

  ipcMain.on("terminal.resize", (event, size) => {
    if (ptyProcess && size.cols > 0 && size.rows > 0) {
      ptyProcess.resize(size.cols, size.rows);
    }
  });

  win.webContents.on("did-finish-load", () => {
    ptyProcess.write("clear\r");
  });

  win.on("close", () => {
    mainWindow = null;
    app.quit();
  });

  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
};

app.whenReady().then(createWindow);
