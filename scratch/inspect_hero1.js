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
        this.setupSocket();
        resolve();
      });
      req.on('error', reject);
      req.end();
    });
  }

  setupSocket() {
    let buffer = Buffer.alloc(0);
    this.socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        const opcode = firstByte & 0x0f;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;
        if (payloadLen === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }
        if (buffer.length < offset + payloadLen) return;
        const payload = buffer.slice(offset, offset + payloadLen);
        buffer = buffer.slice(offset + payloadLen);
        if (opcode === 1) {
          const msg = JSON.parse(payload.toString('utf8'));
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            cb(msg.result);
          }
        }
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++this.msgId;
      this.callbacks.set(id, resolve);
      const payload = Buffer.from(JSON.stringify({ id, method, params }));
      const maskKey = crypto.randomBytes(4);
      let frameHeader;
      if (payload.length <= 125) {
        frameHeader = Buffer.alloc(6);
        frameHeader[0] = 0x81;
        frameHeader[1] = 0x80 | payload.length;
        maskKey.copy(frameHeader, 2);
      } else if (payload.length <= 65535) {
        frameHeader = Buffer.alloc(8);
        frameHeader[0] = 0x81;
        frameHeader[1] = 0x80 | 126;
        frameHeader.writeUInt16BE(payload.length, 2);
        maskKey.copy(frameHeader, 4);
      }
      const maskedPayload = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) {
        maskedPayload[i] = payload[i] ^ maskKey[i % 4];
      }
      this.socket.write(Buffer.concat([frameHeader, maskedPayload]));
    });
  }

  close() {
    if (this.socket) this.socket.destroy();
  }
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-hero-profile');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9244',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + profileDir,
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listData = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9244/json', (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });

    const page = listData.find(t => t.type === 'page');
    const cdp = new ZeroDepCDP(page.webSocketDebuggerUrl);
    await cdp.connect();

    const htmlPath = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url: htmlPath });
    await new Promise(r => setTimeout(r, 1500));

    const styles = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('.hero-immersive-title');
        const shimmer = document.querySelector('.signature-gold-shimmer');
        const lead = document.querySelector('.hero-immersive-lead');
        const badge = document.querySelector('.hero-immersive-badge');
        const img = document.querySelector('.hero-immersive-bg-img');
        const overlay = document.querySelector('.hero-immersive-overlay');
        
        return {
          titleColor: title ? getComputedStyle(title).color : null,
          titleOpacity: title ? getComputedStyle(title).opacity : null,
          shimmerColor: shimmer ? getComputedStyle(shimmer).color : null,
          shimmerBg: shimmer ? getComputedStyle(shimmer).backgroundImage : null,
          leadColor: lead ? getComputedStyle(lead).color : null,
          leadOpacity: lead ? getComputedStyle(lead).opacity : null,
          imgComplete: img ? img.complete : null,
          imgNaturalWidth: img ? img.naturalWidth : null,
          overlayBg: overlay ? getComputedStyle(overlay).backgroundImage : null
        };
      })()`,
      returnByValue: true
    });

    console.log('Evaluated styles:', styles.result.value);

    // Capture screenshot
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/home1_current.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/home1_current.png');

    cdp.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}

main();
