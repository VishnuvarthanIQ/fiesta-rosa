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

async function inspectMobileNav() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9555;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve('scratch/chrome-mobnav-profile')
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const cdp = new ZeroDepCDP(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    const getVal = (res) => (res && res.result ? res.result.value : (res ? res.value : null));
    const outDir = path.resolve('scratch');

    const pagesToTest = ['index.html', 'home-2.html', 'services.html'];
    const widths = [360, 390, 430];

    for (const pageName of pagesToTest) {
      const url = 'file:///' + path.resolve(pageName).replace(/\\/g, '/');
      console.log(`\nTesting page: ${pageName}`);
      await cdp.send('Page.navigate', { url });
      await new Promise(r => setTimeout(r, 1000));

      for (const w of widths) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: w,
          height: 800,
          deviceScaleFactor: 1,
          mobile: true
        });
        await new Promise(r => setTimeout(r, 400));

        // Click the hamburger toggler once
        console.log(`Clicking hamburger at ${w}px on ${pageName}...`);
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) toggler.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 600)); // wait for collapse animation

        const domInfo = getVal(await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const nav = document.getElementById('nav');
            const toggler = document.querySelector('.navbar-toggler');
            const rect = nav ? nav.getBoundingClientRect() : null;
            const items = Array.from(document.querySelectorAll('#nav .nav-link, #nav .dropdown-item')).map(a => a.innerText.trim());
            return {
              navClasses: nav ? nav.className : null,
              navVisible: nav ? nav.offsetHeight > 0 : false,
              navRect: rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
              itemsCount: items.length,
              items,
              hasScroll: document.documentElement.scrollWidth > window.innerWidth
            };
          })()`,
          returnByValue: true
        }));
        console.log(`[${pageName} @ ${w}px click 1]`, domInfo);

        const ss1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(outDir, `nav_${pageName.replace('.html','')}_${w}_click1.png`), Buffer.from(ss1.data, 'base64'));

        // Click it again (close)
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) toggler.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 500));

        // Click it once more (open again) to test repeated toggle behavior!
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) toggler.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 600));

        const ss2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(outDir, `nav_${pageName.replace('.html','')}_${w}_click2.png`), Buffer.from(ss2.data, 'base64'));

        // Close it before next iteration
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler && document.getElementById('nav').classList.contains('show')) toggler.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 400));
      }
    }

    cdp.close();
  } catch (err) {
    console.error('Error in nav inspection:', err);
  } finally {
    chromeProc.kill();
  }
}

inspectMobileNav();
