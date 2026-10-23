const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ZeroDepCDP {
  constructor(wsUrl) {
    this.wsUrl = new URL(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      const req = http.request({
        hostname: this.wsUrl.hostname,
        port: this.wsUrl.port,
        path: this.wsUrl.pathname,
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': key
        }
      });
      req.on('upgrade', (res, socket) => {
        this.socket = socket;
        this.socket.on('error', () => {});
        this.setupSocket();
        resolve();
      });
      req.on('error', reject);
      req.end();
    });
  }

  setupSocket() {
    let buffer = Buffer.alloc(0);
    this.socket.on('error', () => {});
    this.socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        const opcode = firstByte & 0x0f;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) break;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) break;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        if (buffer.length < offset + payloadLen) break;
        const payload = buffer.slice(offset, offset + payloadLen);
        buffer = buffer.slice(offset + payloadLen);

        if (opcode === 1) {
          try {
            const msg = JSON.parse(payload.toString('utf8'));
            if (msg.id && this.callbacks.has(msg.id)) {
              const cb = this.callbacks.get(msg.id);
              this.callbacks.delete(msg.id);
              cb(msg.result);
            }
          } catch (e) {}
        } else if (opcode === 8) {
          this.socket.end();
        }
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++this.msgId;
      this.callbacks.set(id, resolve);
      const payload = Buffer.from(JSON.stringify({ id, method, params }));
      let frameHeader;
      if (payload.length < 126) {
        frameHeader = Buffer.alloc(6);
        frameHeader[0] = 0x81;
        frameHeader[1] = 0x80 | payload.length;
      } else if (payload.length < 65536) {
        frameHeader = Buffer.alloc(8);
        frameHeader[0] = 0x81;
        frameHeader[1] = 0x80 | 126;
        frameHeader.writeUInt16BE(payload.length, 2);
      } else {
        frameHeader = Buffer.alloc(14);
        frameHeader[0] = 0x81;
        frameHeader[1] = 0x80 | 127;
        frameHeader.writeBigUInt64BE(BigInt(payload.length), 2);
      }
      const maskKey = crypto.randomBytes(4);
      maskKey.copy(frameHeader, frameHeader.length - 4);
      const maskedPayload = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) {
        maskedPayload[i] = payload[i] ^ maskKey[i % 4];
      }
      this.socket.write(Buffer.concat([frameHeader, maskedPayload]));
    });
  }

  close() {
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
    }
  }
}

async function getWsUrl(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, (res) => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      const parsed = JSON.parse(data);
      const page = Array.isArray(parsed) ? parsed.find(t => t.type === 'page') : null;
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Could not get CDP page ws url');
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9556;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve('scratch/temp-profile')
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const cdp = new ZeroDepCDP(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    const url = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1000));

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 400));

    // Open navbar
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.navbar-toggler').click()`
    });
    await new Promise(r => setTimeout(r, 500));

    // Click Home dropdown
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.site-header .nav-item.dropdown > .dropdown-toggle').click()`
    });
    await new Promise(r => setTimeout(r, 500));

    const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/home_dropdown_open_360.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved scratch/home_dropdown_open_360.png');

    // Click Sign In dropdown
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('#authSignInBtn').click()`
    });
    await new Promise(r => setTimeout(r, 500));

    const ss2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/signin_dropdown_open_360.png', Buffer.from(ss2.data, 'base64'));
    console.log('Saved scratch/signin_dropdown_open_360.png');

    cdp.close();
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
  }
}

run();
