const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

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
      req.on('upgrade', (r, s) => {
        this.socket = s;
        let buf = Buffer.alloc(0);
        s.on('data', c => {
          buf = Buffer.concat([buf, c]);
          while (buf.length >= 2) {
            const op = buf[0] & 0x0f;
            let len = buf[1] & 0x7f;
            let off = 2;
            if (len === 126) {
              if (buf.length < 4) return;
              len = buf.readUInt16BE(2);
              off = 4;
            }
            if (buf.length < off + len) return;
            const p = buf.slice(off, off + len);
            buf = buf.slice(off + len);
            if (op === 1) {
              const m = JSON.parse(p.toString('utf8'));
              if (m.id && this.callbacks.has(m.id)) {
                const cb = this.callbacks.get(m.id);
                this.callbacks.delete(m.id);
                cb(m.result);
              }
            }
          }
        });
        res();
      });
      req.on('error', rej);
      req.end();
    });
  }
  send(m, params = {}) {
    return new Promise(r => {
      const id = ++this.msgId;
      this.callbacks.set(id, r);
      const p = Buffer.from(JSON.stringify({ id, method: m, params }));
      const mask = crypto.randomBytes(4);
      const h = Buffer.alloc(6);
      h[0] = 0x81;
      h[1] = 0x80 | p.length;
      mask.copy(h, 2);
      const mp = Buffer.alloc(p.length);
      for (let i = 0; i < p.length; i++) mp[i] = p[i] ^ mask[i % 4];
      this.socket.write(Buffer.concat([h, mp]));
    });
  }
  close() {
    if (this.socket) this.socket.destroy();
  }
}

async function run() {
  const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9266',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  const targets = await new Promise(r =>
    http.get('http://127.0.0.1:9266/json', resp => {
      let d = '';
      resp.on('data', c => (d += c));
      resp.on('end', () => r(JSON.parse(d)));
    })
  );
  const cdp = new ZeroDepCDP(targets[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.navigate', {
    url: 'file:///' + path.resolve('index.html').replace(/\\/g, '/')
  });
  await new Promise(r => setTimeout(r, 2000));
  const res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.immersive-btn-secondary');
      const icon = btn ? btn.querySelector('i') : null;
      const span = btn ? btn.querySelector('span') : null;
      return {
        btnColor: btn ? getComputedStyle(btn).color : null,
        btnBg: btn ? getComputedStyle(btn).backgroundColor : null,
        iconColor: icon ? getComputedStyle(icon).color : null,
        spanColor: span ? getComputedStyle(span).color : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Button computed styles:', res.result.value);
  cdp.close();
  p.kill();
}
run();
