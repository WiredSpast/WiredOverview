import { Extension } from 'gnode-api';
import { ExtensionInfo } from "gnode-api/lib/extension/extensioninfo";

import { WebSocketServer } from 'ws';
import ChromeLauncher, { LaunchedChrome } from 'chrome-launcher';
import { getRandomPort } from "chrome-launcher/dist/random-port.js";

import http from 'http';
import fs from 'fs';
import path from 'path';

const directoryName = path.resolve('./resources');
console.log(directoryName);

const uiServer = http.createServer((req, res) => {
  console.log(req.url?.split('?')[0].split('.').pop());
  switch (req.url?.split('?')[0].split('.').pop()) {
    case 'html':
      console.log('abc');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      break;
    case 'js':
      res.writeHead(200, { 'Content-Type': 'text/js' });
      break;
    case 'css':
      res.writeHead(200, { 'Content-Type': 'text/css' });
      break;
    case 'ico':
      res.writeHead(200, { 'Content-Type': 'image/x-icon' });
      break;
    default:
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      break;
  }

  const filePath = path.join(directoryName, req.url?.split('?')[0].substring(1) || 'index.html');
  console.log(filePath);

  fs.readFile(filePath, null, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.write(`File not found`);
    } else {
      res.write(data);
    }
    res.end();
  });
});

let serverPort: number;
getRandomPort().then(port => {
  uiServer.listen(port);
  serverPort = port;
  console.log(port);
});


export default class WindowedExtension extends Extension {
  private readonly extensionInfo: ExtensionInfo;
  private readonly htmlPath: string;
  private readonly chromeFlags: string[];
  private windowSocket: WebSocketServer;
  private windowPort: number;
  private chrome: LaunchedChrome | null = null;

  constructor(extensionInfo: ExtensionInfo, ...chromeFlags: string[]) {
    super(extensionInfo);
    this.extensionInfo = extensionInfo;
    this.chromeFlags = chromeFlags;
    this.on('click', this.toggleWindow.bind(this));

    this.on('socketdisconnect', () => {
      process.exit();
    });

    this.launchWebsocketServer();
  }

  private launchWebsocketServer(): void {
    getRandomPort().then(p => {
      this.windowPort = p;
      this.windowSocket = new WebSocketServer({
        port: this.windowPort,
      });

      this.windowSocket.on('connection', (ws) => {
        // @ts-ignore
         ws.onmessage = (event) => this.emit('uiData', event.data);

        // @ts-ignore
        this.emit('uiOpened');
      });
    });
  }

  toggleWindow(): void {
    this.isWindowOpen() ? this.closeWindow() : this.openWindow();
  }

  async openWindow(): Promise<void> {
    if (!this.isWindowOpen()) {
      this.chrome = await ChromeLauncher.launch({
        chromeFlags: [`--app=http://localhost:${serverPort}/index.html?port=${this.windowPort}`, ...this.chromeFlags]
      });

      if(this.chrome == null) {
        this.writeToConsole(`ERROR: Couldn't open the window for '${this.extensionInfo.name}', it only works when you have Chrome installed!`, 'red');
        console.error(`ERROR: Couldn't open the window for '${this.extensionInfo.name}', it only works when you have Chrome installed!`);
        process.exit();
      }

      this.chrome?.process.on('close', this.closeWindow.bind(this));
    }
  }

  closeWindow(): void {
    this.chrome?.kill();
    this.chrome = null;

    // @ts-ignore
    this.emit('uiClosed');
  }

  isWindowOpen(): boolean {
    return this.chrome != null;
  }

  sendToUI(data: string): void {
    if (this.windowSocket?.clients.size > 0) {
      this.windowSocket.clients.forEach((ws) => {
        ws.send(data);
      });
    } else {
      console.log("Websocket server not launched yet or UI not open");
    }
  }
}
