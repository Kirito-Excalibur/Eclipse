const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const electronReload = require("electron-reload");
electronReload(__dirname, {});
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

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  win.loadFile("index.html");
  win.webContents.openDevTools();
  const menuTemplate = [
    // ... your other menu items
    {
      label: "File",
      submenu: [
        {
          label: "Open",
          click: async () => {
            const result = await dialog.showOpenDialog(win, {
              properties: ["openFile"],
              filters: [
                { name: "Text Files", extensions: ["txt", "text"] },
                { name: "All Files", extensions: ["*"] },
              ],
            });

            if (!result.canceled) {
              const filePath = result.filePaths[0];
              readFile(filePath);
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ];

  // Create the application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

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
    win = null;
    app.quit();
  });

  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
};

function readFile(filePath) {
  // Read the content of the file
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
      return;
    }

    // Send the file content to the renderer process
    win.webContents.send("file-opened", filePath, data);
  });
}

app.whenReady().then(createWindow);
