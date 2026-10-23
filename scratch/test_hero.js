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

        if (opcode === 1) { // text
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
    if (this.socket) this.socket.destroy();
  }
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listData = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9222/json', (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });

    const page = listData.find(t => t.type === 'page');
    if (!page) throw new Error('No page target');

    const cdp = new ZeroDepCDP(page.webSocketDebuggerUrl);
    await cdp.connect();

    const htmlPath = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url: htmlPath });

    // Wait until DOM is fully loaded and ready
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      const check = await cdp.send('Runtime.evaluate', {
        expression: `!!document.querySelector('.celebration-main-title') && document.readyState === 'complete'`
      });
      if (check && check.value) break;
    }

    const outDir = path.resolve('scratch');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const viewports = [
      { name: 'desktop_1280', width: 1280, height: 900, dark: false },
      { name: 'desktop_1280_dark', width: 1280, height: 900, dark: true },
      { name: 'tablet_1024', width: 1024, height: 900, dark: false },
      { name: 'tablet_768', width: 768, height: 900, dark: false },
      { name: 'mobile_390', width: 390, height: 844, dark: false },
      { name: 'mobile_360', width: 360, height: 780, dark: false },
      { name: 'mobile_360_dark', width: 360, height: 780, dark: true }
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });

      await cdp.send('Runtime.evaluate', {
        expression: `
          document.documentElement.setAttribute('data-theme', '${vp.dark ? 'dark' : 'light'}');
          document.documentElement.setAttribute('data-bs-theme', '${vp.dark ? 'dark' : 'light'}');
        `
      });

      await new Promise(r => setTimeout(r, 400));

      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const hero = document.getElementById('heroCelebrations');
          const title = document.querySelector('.celebration-main-title');
          const btn1 = document.querySelector('.celebration-btn-primary');
          const btn2 = document.querySelector('.celebration-btn-secondary');
          const prestige = document.querySelector('.hero-prestige-strip');
          const seal = document.querySelector('.couture-floating-seal');
          const plaque = document.querySelector('.gallery-couture-plaque');
          const overflow = document.documentElement.scrollWidth > window.innerWidth;
          
          return {
            vp: '${vp.name}',
            viewportW: window.innerWidth,
            scrollW: document.documentElement.scrollWidth,
            overflow: overflow,
            heroH: hero ? hero.offsetHeight : 0,
            title: title ? title.innerText.replace(/\\n/g, ' ') : null,
            btn1: btn1 ? btn1.innerText.trim() : null,
            btn2: btn2 ? btn2.innerText.trim() : null,
            prestigeItems: prestige ? prestige.querySelectorAll('.prestige-item').length : 0,
            sealVisible: !!seal && seal.offsetWidth > 0,
            plaqueVisible: !!plaque && plaque.offsetWidth > 0
          };
        })()`,
        returnByValue: true
      });

      console.log(`[${vp.name}] metrics:`, evalRes.value);

      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `hero_${vp.name}.png`), Buffer.from(ss.data, 'base64'));
      console.log(`Saved screenshot hero_${vp.name}.png`);
    }

    cdp.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chromeProc.kill();
  }
}

run();
