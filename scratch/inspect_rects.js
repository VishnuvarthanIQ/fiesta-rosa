const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

class ZeroDepCDP {
  constructor(wsUrl) {
    this.wsUrl = new URL(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
  }
  async connect() {
    return new Promise((res, rej) => {
      const key = crypto.randomBytes(16).toString('base64');
      const req = http.request({
        hostname: this.wsUrl.hostname, port: this.wsUrl.port, path: this.wsUrl.pathname,
        headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key }
      });
      req.on('upgrade', (r, socket) => {
        this.socket = socket;
        let buf = Buffer.alloc(0);
        socket.on('data', chunk => {
          buf = Buffer.concat([buf, chunk]);
          while (buf.length >= 2) {
            let len = buf[1] & 0x7f;
            let off = 2;
            if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
            else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
            if (buf.length < off + len) break;
            const payload = buf.slice(off, off + len);
            buf = buf.slice(off + len);
            try {
              const msg = JSON.parse(payload.toString('utf8'));
              if (msg.id && this.callbacks.has(msg.id)) {
                this.callbacks.get(msg.id)(msg.result);
                this.callbacks.delete(msg.id);
              }
            } catch(e) {}
          }
        });
        res();
      });
      req.on('error', rej);
      req.end();
    });
  }
  send(method, params = {}) {
    return new Promise(resolve => {
      const id = ++this.msgId;
      this.callbacks.set(id, resolve);
      const payload = Buffer.from(JSON.stringify({ id, method, params }));
      let header = Buffer.alloc(payload.length < 126 ? 6 : 8);
      header[0] = 0x81;
      if (payload.length < 126) { header[1] = 0x80 | payload.length; }
      else { header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2); }
      const mask = crypto.randomBytes(4);
      mask.copy(header, header.length - 4);
      const masked = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
      this.socket.write(Buffer.concat([header, masked]));
    });
  }
}

async function inspect() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);
  await new Promise(r => setTimeout(r, 1500));

  const list = await new Promise(r => http.get('http://127.0.0.1:9222/json', res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));
  const page = list.find(t => t.type === 'page');
  const cdp = new ZeroDepCDP(page.webSocketDebuggerUrl);
  await cdp.connect();

  const htmlPath = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
  await cdp.send('Page.navigate', { url: htmlPath });

  // Poll until card exists
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    const check = await cdp.send('Runtime.evaluate', {
      expression: `!!document.querySelector('.celebration-gallery-card')`
    });
    if (check.result && check.result.value) break;
  }

  const res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.celebration-gallery-card');
      const inner = document.querySelector('.gallery-inner-frame');
      const wrap = document.querySelector('.celebration-img-wrapper');
      const img = document.querySelector('.celebration-hero-img');
      const plaque = document.querySelector('.gallery-couture-plaque');
      function rect(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          width: Math.round(r.width)
        };
      }
      return {
        card: rect(card),
        inner: rect(inner),
        wrap: rect(wrap),
        img: rect(img),
        plaque: rect(plaque),
        plaqueComputedPos: getComputedStyle(plaque).position,
        innerComputedDisplay: getComputedStyle(inner).display
      };
    })()`,
    returnByValue: true
  });
  console.log('Rectangles:', JSON.stringify(res.result.value, null, 2));
  cdp.socket.destroy();
  chromeProc.kill();
}
inspect();
