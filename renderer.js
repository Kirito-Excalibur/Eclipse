//Begin of Initialization

window.$ = window.jQuery = require("jquery");
const { app, BrowserWindow, ipcRenderer, shell, remote } = require("electron");
const os = require("os");
config = JSON.parse(ipcRenderer.sendSync("synchronous-message", ''));

const { Terminal } = require("xterm");
const terminal = new Terminal({
  cursorBlink: true,
});

const { FitAddon } = require("xterm-addon-fit");
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

const { WebLinksAddon } = require("xterm-addon-web-links");
const handleLink = (event, uri) => {
  event.preventDefault();
  shell.openExternal(uri);
};
const webLinksAddon = new WebLinksAddon(handleLink);
terminal.loadAddon(webLinksAddon);

// End of Initialization

// Begin of Functions

function resize() {
  fitAddon.fit();
}

function send(text) {
  text = text.trim();
  ipcRenderer.send("terminal.toPty", text);
}

//End of Functions

jQuery(document).ready(function () {
  console.log("App Name: " + config.name);
  console.log("App Title: " + config.title);
  console.log("App Version: " + config.version);
  console.log("Node.js Version: " + process.version);
  console.log("Chromium Version: " + process.versions["chrome"]);
  console.log("Electron Version: " + process.versions.electron);
  console.log("jQuery Version: " + jQuery.fn.jquery);
  jQuery(".title").html(config.title);

  //Begin of Run On Ready

  terminal.open(document.getElementById("terminal"));

  jQuery("#terminal textarea").focus()

  resize();

  //End of Run On Ready

  //Begin of Event Listeners

  terminal.onData((data) => {
    ipcRenderer.send("terminal.toPty", data);
  });

  ipcRenderer.on("terminal.fromPty", (event, data) => {
    terminal.write(data);
  });

  terminal.onTitleChange((title) => {
    ipcRenderer.send("update-title", title);
  });

  terminal.attachCustomKeyEventHandler((arg) => {
    if (arg.ctrlKey && arg.code === "KeyV" && arg.type === "keydown") {
      arg.preventDefault();
      navigator.clipboard.readText().then((text) => {
        send(text);
      });
    }

    return true;
  });

  window.addEventListener("resize", () => {
    resize();
  });

  terminal.onResize((size) => {
    ipcRenderer.send("terminal.resize", size);
  });
});

ipcRenderer.on('file-opened', (event, filePath, data) => {
document.getElementById("canvas").innerHTML = data;
console.log(data);
})