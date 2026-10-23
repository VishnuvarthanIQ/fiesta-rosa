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
  const port = 9557;
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

    const getVal = (res) => (res && res.result ? res.result.value : (res ? res.value : null));
    const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && !['dashboard.html', 'login.html', 'register.html'].includes(f));

    for (const p of pages) {
      const url = 'file:///' + path.resolve(p).replace(/\\/g, '/');
      await cdp.send('Page.navigate', { url });
      await new Promise(r => setTimeout(r, 600));

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 800,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 200));

      // Click toggler
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const toggler = document.querySelector('.navbar-toggler');
          if (toggler) toggler.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 500));

      const info = getVal(await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const nav = document.getElementById('nav');
          const toggler = document.querySelector('.navbar-toggler');
          const header = document.querySelector('.site-header');
          const brand = document.querySelector('.site-header .brand');
          const rect = nav ? nav.getBoundingClientRect() : null;
          const links = Array.from(document.querySelectorAll('#nav .nav-link')).map(a => ({
            text: a.innerText.trim(),
            active: a.classList.contains('active'),
            href: a.getAttribute('href')
          }));
          const actions = Array.from(document.querySelectorAll('#nav .header-actions *')).map(el => el.id || el.className).filter(Boolean);
          const computedNav = nav ? window.getComputedStyle(nav) : null;
          return {
            page: location.pathname.split('/').pop(),
            navDisplay: computedNav ? computedNav.display : null,
            navBg: computedNav ? computedNav.backgroundColor : null,
            navBorderRadius: computedNav ? computedNav.borderRadius : null,
            navOverflowY: computedNav ? computedNav.overflowY : null,
            navOverflowX: computedNav ? computedNav.overflowX : null,
            navHeight: rect ? rect.height : 0,
            linksCount: links.length,
            links,
            hasScroll: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`,
        returnByValue: true
      }));

      console.log(`\n=== PAGE: ${p} ===`);
      console.log(`navDisplay: ${info.navDisplay}, navBg: ${info.navBg}, navBorderRadius: ${info.navBorderRadius}`);
      console.log(`navOverflowY: ${info.navOverflowY}, navOverflowX: ${info.navOverflowX}, navHeight: ${info.navHeight}`);
      console.log(`hasHorizontalScroll: ${info.hasScroll}`);
      console.log('Links:', info.links.map(l => `${l.text}${l.active ? ' (ACTIVE)' : ''}`).join(', '));

      // Take screenshot of opened nav on this page
      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`scratch/allpages_nav_${p.replace('.html','')}.png`, Buffer.from(ss.data, 'base64'));
    }

    cdp.close();
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
  }
}

run();
