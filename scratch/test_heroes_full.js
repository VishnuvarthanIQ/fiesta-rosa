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

async function runHeroTests() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9333;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve('scratch/chrome-hero-profile')
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

    const viewports = [
      { name: 'desktop_1280', width: 1280, height: 800 },
      { name: 'tablet_1024', width: 1024, height: 768 },
      { name: 'tablet_768', width: 768, height: 700 },
      { name: 'mobile_390', width: 390, height: 844 },
      { name: 'mobile_360', width: 360, height: 780 }
    ];

    // ==========================================
    // 1. TEST HOME 1 (Celebrations)
    // ==========================================
    console.log('\n==========================================');
    console.log('--- TESTING HOME 1 (index.html) ---');
    console.log('==========================================');
    const home1Url = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url: home1Url });
    await new Promise(r => setTimeout(r, 1200));

    const home1Data = getVal(await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hero = document.getElementById('heroCelebrations');
        const img = document.querySelector('.celebration-hero-img');
        const title = document.querySelector('.celebration-main-title');
        const lead = document.querySelector('.celebration-lead-desc');
        const btns = Array.from(document.querySelectorAll('.celebration-cta-group a')).map(a => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href')
        }));
        const seal = document.querySelector('.couture-floating-seal');
        const pill = document.querySelector('.couture-floating-pill');
        const plaque = document.querySelector('.gallery-couture-plaque');
        return {
          heroFound: !!hero,
          imgSrc: img ? img.getAttribute('src') : null,
          imgLoaded: img ? img.complete && img.naturalWidth > 0 : false,
          imgNaturalW: img ? img.naturalWidth : 0,
          imgNaturalH: img ? img.naturalHeight : 0,
          titleText: title ? title.innerText.trim() : null,
          leadLength: lead ? lead.innerText.trim().length : 0,
          btnCount: btns.length,
          btns,
          sealFound: !!seal,
          pillFound: !!pill,
          plaqueFound: !!plaque
        };
      })()`,
      returnByValue: true
    }));
    console.log('Home 1 Inspection Result:', home1Data);

    // Viewports for Home 1
    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise(r => setTimeout(r, 400));
      const vpMetrics = getVal(await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            vp: '${vp.name}',
            windowW: window.innerWidth,
            scrollW: document.documentElement.scrollWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`,
        returnByValue: true
      }));
      console.log(`[Home 1 ${vp.name}]`, vpMetrics);
      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `home1_${vp.name}.png`), Buffer.from(ss.data, 'base64'));
    }

    // ==========================================
    // 2. TEST HOME 2 (Signature Events)
    // ==========================================
    console.log('\n==========================================');
    console.log('--- TESTING HOME 2 (home-2.html) ---');
    console.log('==========================================');
    const home2Url = 'file:///' + path.resolve('home-2.html').replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url: home2Url });
    await new Promise(r => setTimeout(r, 1200));

    const home2Data = getVal(await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hero = document.getElementById('heroSignature');
        const img = document.querySelector('.hero-immersive-bg-img');
        const title = document.querySelector('.hero-immersive-title');
        const lead = document.querySelector('.hero-immersive-lead');
        const divider = document.querySelector('.hero-gold-divider');
        const chips = Array.from(document.querySelectorAll('.immersive-feature-chip')).map(c => c.innerText.trim());
        const btns = Array.from(document.querySelectorAll('.hero-immersive-actions a')).map(a => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href')
        }));
        return {
          heroFound: !!hero,
          bgImgSrc: img ? img.getAttribute('src') : null,
          bgImgLoaded: img ? img.complete && img.naturalWidth > 0 : false,
          bgImgNaturalW: img ? img.naturalWidth : 0,
          bgImgNaturalH: img ? img.naturalHeight : 0,
          titleText: title ? title.innerText.trim() : null,
          leadLength: lead ? lead.innerText.trim().length : 0,
          dividerFound: !!divider,
          chipCount: chips.length,
          chips,
          btnCount: btns.length,
          btns
        };
      })()`,
      returnByValue: true
    }));
    console.log('Home 2 Inspection Result:', home2Data);

    // Viewports for Home 2
    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise(r => setTimeout(r, 400));
      const vpMetrics = getVal(await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            vp: '${vp.name}',
            windowW: window.innerWidth,
            scrollW: document.documentElement.scrollWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`,
        returnByValue: true
      }));
      console.log(`[Home 2 ${vp.name}]`, vpMetrics);
      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `home2_${vp.name}.png`), Buffer.from(ss.data, 'base64'));
    }

    // Capture Home 2 in Dark Theme at 1280x800
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.dataset.bsTheme = 'dark';
      })()`
    });
    await new Promise(r => setTimeout(r, 400));
    const ssDark = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `home2_desktop_1280_dark.png`), Buffer.from(ssDark.data, 'base64'));
    console.log('Saved home2_desktop_1280_dark.png');

    cdp.close();
  } catch (err) {
    console.error('Error in hero test:', err);
  } finally {
    chromeProc.kill();
  }
}

runHeroTests();
