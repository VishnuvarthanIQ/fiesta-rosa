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
    if (this.socket) this.socket.destroy();
  }
}

async function testPortfolio() {
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

    const htmlPath = 'file:///' + path.resolve('portfolio.html').replace(/\\/g, '/');
    console.log('Navigating to', htmlPath);
    await cdp.send('Page.navigate', { url: htmlPath });

    // Wait until DOM is ready
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      const check = await cdp.send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && document.querySelectorAll('.g-item').length === 18`
      });
      if (check && check.value) break;
    }

    // Scroll and set eager to ensure all lazy images load
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelectorAll('.g-item img').forEach(img => {
          img.loading = 'eager';
        });
        window.scrollTo(0, document.body.scrollHeight);
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 0);`
    });
    await new Promise(r => setTimeout(r, 500));

    // 1. Verify all 18 images rendered with valid dimensions
    const imgCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const cards = document.querySelectorAll('.g-item');
        const results = [];
        cards.forEach((card, idx) => {
          const img = card.querySelector('img');
          const title = card.querySelector('h3') ? card.querySelector('h3').innerText.trim() : null;
          const badge = card.querySelector('.badge-gold') ? card.querySelector('.badge-gold').innerText.trim() : null;
          const cat = card.dataset.cat;
          const btn = card.querySelector('.g-btn');
          const dataImg = btn ? btn.dataset.img : null;
          const dataTitle = btn ? btn.dataset.title : null;
          const dataDesc = btn ? btn.dataset.desc : null;
          
          results.push({
            index: idx + 1,
            cat,
            badge,
            title,
            src: img ? img.getAttribute('src') : null,
            naturalW: img ? img.naturalWidth : 0,
            naturalH: img ? img.naturalHeight : 0,
            loaded: img ? img.complete && img.naturalWidth > 0 : false,
            dataImg,
            dataTitle,
            dataDesc
          });
        });
        return results;
      })()`,
      returnByValue: true
    });

    const getVal = (res) => (res && res.result ? res.result.value : (res ? res.value : null));

    console.log('\n--- VERIFYING 18 PORTFOLIO CARDS ---');
    let allImagesLoaded = true;
    const items = getVal(imgCheck) || [];
    items.forEach(item => {
      console.log(`[Item ${item.index}] (${item.cat}) "${item.title}" -> ${item.src} (Natural: ${item.naturalW}x${item.naturalH}, Loaded: ${item.loaded})`);
      if (!item.loaded) allImagesLoaded = false;
    });
    console.log('\nAll 18 images loaded successfully:', allImagesLoaded);

    // 2. Test All Category Filters
    const filters = ['all', 'quince', 'sweet16', 'decorations', 'venues', 'cakes', 'florals'];
    console.log('\n--- TESTING CATEGORY FILTERS ---');
    for (const f of filters) {
      const fResRaw = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('[data-filter="${f}"]');
          if (btn) btn.click();
          const visible = Array.from(document.querySelectorAll('.g-item')).filter(i => !i.classList.contains('hide'));
          const badgeText = document.getElementById('galleryCount').innerText.trim();
          return {
            filter: '${f}',
            visibleCount: visible.length,
            badgeText,
            activeFilterText: document.querySelector('[data-filter].active') ? document.querySelector('[data-filter].active').innerText.trim() : null
          };
        })()`,
        returnByValue: true
      });
      const fRes = getVal(fResRaw);
      console.log(`Filter [${f}] -> Visible items: ${fRes.visibleCount}, Badge: "${fRes.badgeText}", Active button: "${fRes.activeFilterText}"`);
    }

    // Reset filter to 'all'
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-filter="all"]').click();`
    });

    // 3. Test Lightbox Modal Opening
    console.log('\n--- TESTING LIGHTBOX MODAL ---');
    const modalTestRaw = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelectorAll('.g-btn')[3]; // Card 4: Elegant Stage Decoration
        btn.click();
        const modal = document.getElementById('imgModal');
        const big = document.getElementById('imgBig');
        const title = document.getElementById('imgTitle');
        const desc = document.getElementById('imgDesc');
        return {
          modalHasShow: modal.classList.contains('show'),
          bigSrc: big ? big.getAttribute('src') : null,
          titleText: title ? title.innerText.trim() : null,
          descText: desc ? desc.innerText.trim() : null
        };
      })()`,
      returnByValue: true
    });
    const modalTest = getVal(modalTestRaw);
    console.log('Modal inspection result:', modalTest);

    // Close modal properly
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const modalEl = document.getElementById('imgModal');
        if (modalEl && window.bootstrap) {
          try {
            bootstrap.Modal.getOrCreateInstance(modalEl).hide();
          } catch (e) {}
        }
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
          if (modalEl) {
            modalEl.classList.remove('show');
            modalEl.style.display = 'none';
          }
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('padding-right');
        }, 300);
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    // 4. Test Viewports and Capture Screenshots
    const outDir = path.resolve('scratch');
    const viewports = [
      { name: 'desktop_1280', width: 1280, height: 900 },
      { name: 'tablet_1024', width: 1024, height: 900 },
      { name: 'tablet_768', width: 768, height: 900 },
      { name: 'mobile_390', width: 390, height: 844 },
      { name: 'mobile_360', width: 360, height: 780 }
    ];

    console.log('\n--- TESTING VIEWPORTS & CAPTURING SCREENSHOTS ---');
    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise(r => setTimeout(r, 400));

      const vpRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            vp: '${vp.name}',
            windowW: window.innerWidth,
            scrollW: document.documentElement.scrollWidth,
          };
        })()`,
        returnByValue: true
      });
      console.log(`[${vp.name}]`, getVal(vpRes));

      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const g = document.querySelector('.gallery-filters') || document.querySelector('.g-item');
          if (g) g.scrollIntoView({ block: 'start' });
        })()`
      });
      await new Promise(r => setTimeout(r, 400));

      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `portfolio_${vp.name}.png`), Buffer.from(ss.data, 'base64'));
      console.log(`Saved screenshot portfolio_${vp.name}.png`);
    }

    cdp.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chromeProc.kill();
  }
}

testPortfolio();
