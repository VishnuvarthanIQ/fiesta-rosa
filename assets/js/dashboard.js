/* ==========================================================================
   Fiesta Rosa Events — Client Dashboard Controller (localStorage Demo State)
   ========================================================================== */
(() => {
  const esc = str => String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const money = val => '$' + (Number(val) || 0).toLocaleString();
  const $id = id => document.getElementById(id);

  const THEMES = [
    'Enchanted Garden',
    'Royal Fairytale',
    'Rose Gold Glam',
    'Midnight Masquerade',
    'Butterfly Dream',
    'Neon Pop'
  ];
  const STATUS_LIST = ['Not started', 'Pending', 'Confirmed'];
  const STATUS_BADGE = {
    'Not started': 'secondary',
    'Pending': 'warning',
    'Confirmed': 'success'
  };

  const DEFAULT_STATE = {
    date: '2027-05-15T18:00',
    type: 'Quinceañera',
    honoree: 'Isabella',
    theme: THEMES[0],
    budget: 15000,
    tasks: [
      { t: 'Finalize celebration date & guest list', d: true },
      { t: 'Book grand ballroom venue', d: true },
      { t: 'Confirm celebration theme & color palette', d: true },
      { t: 'Hire photography & cinema team', d: true },
      { t: 'Order bilingual invitations & RSVP cards', d: false },
      { t: 'Complete catering & cake tasting', d: false },
      { t: 'Schedule ball gown & court fittings', d: false },
      { t: 'Book DJ, lighting & vals choreographer', d: false },
      { t: 'Plan court of honor entrance & traditions', d: false },
      { t: 'Confirm final headcount & seating chart', d: false }
    ],
    vendors: [
      ['Venue', 'Rosewood Grand Ballroom', 'Confirmed'],
      ['Catering', 'Sabor Royal Catering & Bakery', 'Confirmed'],
      ['Photography', 'Lumen Cinema & Portrait Studio', 'Pending'],
      ['Decoration', 'Petal & Pearl Floral Couture', 'Pending'],
      ['Entertainment', 'DJ Aurora & Vals Choreography', 'Not started']
    ],
    budget_rows: [
      ['Venue & Rentals', 4500, 4500],
      ['Catering & Custom Cake', 4200, 3900],
      ['Decoration & Florals', 2600, 2200],
      ['Photography & Videography', 2000, 1800],
      ['Entertainment & Lighting', 1500, 1200]
    ],
    pay: [
      ['Initial Booking Deposit', 1500, 'Paid', '2026-09-01'],
      ['Mid-Planning Installment', 2500, 'Pending', '2027-01-15'],
      ['Final Celebration Balance', 3000, 'Pending', '2027-04-30']
    ],
    sched: [
      { d: '2026-11-12', t: 'Venue lighting & floorplan walkthrough' },
      { d: '2026-12-10', t: 'Catering & tiered cake tasting session' },
      { d: '2027-01-18', t: 'First gown fitting & tiara styling' },
      { d: '2027-02-22', t: 'Court of honor vals rehearsal #1' }
    ]
  };

  let state = store.get('dash', null);
  if (!state || !Array.isArray(state.vendors) || !Array.isArray(state.budget_rows)) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    store.set('dash', state);
  }

  const saveState = () => {
    store.set('dash', state);
    updateOverviewKpis();
  };

  const session = store.get('session', null) || {
    name: 'Sofia Family',
    email: 'sofia.family@example.com',
    phone: '+1 (305) 555-0147'
  };
  if ($id('uname')) {
    $id('uname').textContent = session.name.split(' ')[0];
  }

  /* 1. Overview & Countdown */
  const evDate = $id('evDate');
  const evType = $id('evType');
  const evTheme = $id('evTheme');
  const dashCd = $id('dashCd');

  if (evTheme) {
    evTheme.innerHTML = THEMES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    evTheme.value = THEMES.includes(state.theme) ? state.theme : THEMES[0];
  }
  if (evDate) evDate.value = state.date;
  if (evType) evType.value = state.type;

  const syncCountdown = () => {
    if (dashCd) dashCd.dataset.countdown = state.date;
    if (typeof tick === 'function') tick();
  };
  syncCountdown();

  evDate?.addEventListener('change', e => {
    if (e.target.value) {
      state.date = e.target.value;
      syncCountdown();
      saveState();
    }
  });
  evType?.addEventListener('change', e => {
    state.type = e.target.value;
    saveState();
  });
  evTheme?.addEventListener('change', e => {
    state.theme = e.target.value;
    saveState();
  });

  function updateOverviewKpis() {
    const doneTasks = state.tasks.filter(t => t.d).length;
    const totalTasks = state.tasks.length || 1;
    const confirmedVendors = state.vendors.filter(v => v[2] === 'Confirmed').length;
    const allocatedTotal = state.budget_rows.reduce((sum, r) => sum + (Number(r[2]) || 0), 0);
    const remainingBudget = state.budget - allocatedTotal;

    if ($id('kpiTasks')) $id('kpiTasks').textContent = `${doneTasks} / ${state.tasks.length}`;
    if ($id('kpiVendors')) $id('kpiVendors').textContent = `${confirmedVendors} / ${state.vendors.length}`;
    if ($id('kpiBudgetRem')) $id('kpiBudgetRem').textContent = money(remainingBudget);
  }

  /* 2. Planning Checklist */
  function renderChecklist() {
    const done = state.tasks.filter(t => t.d).length;
    const pct = Math.round((done / (state.tasks.length || 1)) * 100);
    const ckBar = $id('ckBar');
    if (ckBar) {
      ckBar.style.width = `${pct}%`;
      ckBar.textContent = `${pct}%`;
      ckBar.parentElement?.setAttribute('aria-valuenow', String(pct));
    }
    const ckCount = $id('ckCount');
    if (ckCount) ckCount.textContent = `${done} of ${state.tasks.length} tasks completed`;

    const ckList = $id('ckList');
    if (ckList) {
      ckList.innerHTML = state.tasks.map((task, idx) => `
        <div class="form-check d-flex justify-content-between align-items-center py-2 border-bottom">
          <div>
            <input class="form-check-input" type="checkbox" id="t${idx}" data-i="${idx}" ${task.d ? 'checked' : ''}>
            <label class="form-check-label ${task.d ? 'text-decoration-line-through muted' : 'fw-medium'}" for="t${idx}">
              ${esc(task.t)}
            </label>
          </div>
          <button class="btn btn-sm btn-icon" type="button" data-del="${idx}" aria-label="Delete task ${esc(task.t)}">✕</button>
        </div>
      `).join('');
    }
  }

  $id('ckList')?.addEventListener('click', e => {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      state.tasks.splice(Number(delBtn.dataset.del), 1);
      saveState();
      renderChecklist();
    }
  });

  $id('ckList')?.addEventListener('change', e => {
    if (e.target.dataset.i !== undefined) {
      state.tasks[Number(e.target.dataset.i)].d = e.target.checked;
      saveState();
      renderChecklist();
    }
  });

  $id('ckAdd')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = $id('ckNew');
    const val = input?.value.trim();
    if (val) {
      state.tasks.push({ t: val, d: false });
      input.value = '';
      saveState();
      renderChecklist();
    }
  });

  /* 3. Vendor Booking Status */
  function renderVendors() {
    const vList = $id('vList');
    if (!vList) return;
    vList.innerHTML = state.vendors.map((v, idx) => `
      <tr>
        <td class="fw-semibold">${esc(v[0])}</td>
        <td>
          <label class="visually-hidden" for="vn${idx}">Vendor name for ${esc(v[0])}</label>
          <input id="vn${idx}" class="form-control form-control-sm" type="text" value="${esc(v[1])}" data-vname="${idx}">
        </td>
        <td>
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="badge text-bg-${STATUS_BADGE[v[2]] || 'secondary'}">${esc(v[2])}</span>
            <label class="visually-hidden" for="v${idx}">Booking status for ${esc(v[0])}</label>
            <select class="form-select form-select-sm w-auto" id="v${idx}" data-i="${idx}">
              ${STATUS_LIST.map(s => `<option value="${esc(s)}"${s === v[2] ? ' selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
        </td>
      </tr>
    `).join('');
  }

  $id('vList')?.addEventListener('change', e => {
    if (e.target.dataset.i !== undefined) {
      state.vendors[Number(e.target.dataset.i)][2] = e.target.value;
      saveState();
      renderVendors();
    } else if (e.target.dataset.vname !== undefined) {
      state.vendors[Number(e.target.dataset.vname)][1] = e.target.value.trim() || 'TBD';
      saveState();
    }
  });

  /* 4. Budget Breakdown & Dynamic Calculations */
  function updateBudgetSummary() {
    const estTotal = state.budget_rows.reduce((sum, r) => sum + (Number(r[1]) || 0), 0);
    const allocTotal = state.budget_rows.reduce((sum, r) => sum + (Number(r[2]) || 0), 0);
    const remaining = state.budget - allocTotal;
    const pct = state.budget ? Math.min(100, Math.round((allocTotal / state.budget) * 100)) : 0;

    if ($id('bTotal') && document.activeElement !== $id('bTotal')) {
      $id('bTotal').value = state.budget;
    }
    if ($id('bEst')) $id('bEst').textContent = money(estTotal);
    if ($id('bAlloc')) $id('bAlloc').textContent = money(allocTotal);
    if ($id('bRem')) {
      $id('bRem').textContent = money(remaining);
      $id('bRem').style.color = remaining < 0 ? '#dc3545' : '';
    }
    const bBar = $id('bBar');
    if (bBar) {
      bBar.style.width = `${pct}%`;
      bBar.textContent = `${pct}%`;
      bBar.parentElement?.setAttribute('aria-valuenow', String(pct));
    }
  }

  function renderBudgetTable() {
    updateBudgetSummary();
    const bList = $id('bList');
    if (!bList) return;
    bList.innerHTML = state.budget_rows.map((row, idx) => {
      const diff = Number(row[1]) - Number(row[2]);
      return `
        <tr>
          <td class="fw-semibold">${esc(row[0])}</td>
          <td>${money(row[1])}</td>
          <td>
            <label class="visually-hidden" for="b${idx}">Allocated amount for ${esc(row[0])}</label>
            <input id="b${idx}" class="form-control form-control-sm" type="number" min="0" step="50" value="${Number(row[2]) || 0}" data-i="${idx}" style="max-width: 145px;">
          </td>
          <td class="small ${diff < 0 ? 'text-danger fw-semibold' : 'muted'}">
            ${diff >= 0 ? `${money(diff)} under` : `${money(Math.abs(diff))} over`}
          </td>
        </tr>
      `;
    }).join('');
  }

  $id('bTotal')?.addEventListener('input', e => {
    state.budget = Math.max(0, Number(e.target.value) || 0);
    saveState();
    updateBudgetSummary();
  });

  $id('bList')?.addEventListener('input', e => {
    const idx = e.target.dataset.i;
    if (idx === undefined) return;
    state.budget_rows[Number(idx)][2] = Math.max(0, Number(e.target.value) || 0);
    saveState();
    updateBudgetSummary();
    const rowTr = e.target.closest('tr');
    if (rowTr) {
      const r = state.budget_rows[Number(idx)];
      const diff = Number(r[1]) - Number(r[2]);
      const diffTd = rowTr.lastElementChild;
      if (diffTd) {
        diffTd.className = `small ${diff < 0 ? 'text-danger fw-semibold' : 'muted'}`;
        diffTd.textContent = diff >= 0 ? `${money(diff)} under` : `${money(Math.abs(diff))} over`;
      }
    }
  });

  /* 5. Booking & Payment Milestones (Simulated Demo) */
  function renderPayments() {
    const payList = $id('payList');
    if (!payList) return;
    payList.innerHTML = state.pay.map((p, idx) => `
      <div class="d-flex flex-wrap justify-content-between align-items-center border-bottom py-2 gap-2">
        <div>
          <span class="fw-semibold">${esc(p[0])}</span> — <strong>${money(p[1])}</strong>
          ${p[3] ? `<span class="muted small ms-2">(Due: ${esc(p[3])})</span>` : ''}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge text-bg-${p[2] === 'Paid' ? 'success' : 'warning'}">${esc(p[2])}</span>
          <button class="btn btn-sm btn-outline-brand" type="button" data-i="${idx}">
            ${p[2] === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
          </button>
        </div>
      </div>
    `).join('');
  }

  $id('payList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    const idx = Number(btn.dataset.i);
    state.pay[idx][2] = state.pay[idx][2] === 'Paid' ? 'Pending' : 'Paid';
    saveState();
    renderPayments();
  });

  /* 6. Event Schedule & Appointments */
  function renderSchedule() {
    state.sched.sort((a, b) => String(a.d).localeCompare(String(b.d)));
    const sList = $id('sList');
    if (!sList) return;
    sList.innerHTML = state.sched.length
      ? state.sched.map((item, idx) => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>📅 <strong>${esc(item.d)}</strong> — ${esc(item.t)}</span>
            <button class="btn btn-sm btn-icon" type="button" data-i="${idx}" aria-label="Remove appointment ${esc(item.t)}">✕</button>
          </li>
        `).join('')
      : '<li class="list-group-item muted">No upcoming appointments scheduled yet.</li>';
  }

  $id('sList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    state.sched.splice(Number(btn.dataset.i), 1);
    saveState();
    renderSchedule();
  });

  $id('sAdd')?.addEventListener('submit', e => {
    e.preventDefault();
    const dVal = $id('sDate')?.value;
    const tVal = $id('sText')?.value.trim();
    if (dVal && tVal) {
      state.sched.push({ d: dVal, t: tVal });
      e.target.reset();
      saveState();
      renderSchedule();
    }
  });

  /* 7. Saved Packages & Favorite Portfolio Designs */
  function renderSaved() {
    const pkg = store.get('pkg', null);
    const favs = store.get('favs', []);
    const savedPkg = $id('savedPkg');
    if (savedPkg) {
      if (pkg) {
        const addons = Array.isArray(pkg.addons) && pkg.addons.length ? ` · Add-ons: ${esc(pkg.addons.join(', '))}` : '';
        savedPkg.innerHTML = `Selected Package: <strong>${esc(pkg.name)}</strong> — <span class="badge-gold">${esc(pkg.price)}</span> for <strong>${esc(pkg.guests)} guests</strong>${addons}. <a href="packages.html" class="ms-2">Change package</a>`;
      } else {
        savedPkg.innerHTML = 'No package saved yet. <a href="packages.html">Explore &amp; select a package</a> to pin it here.';
      }
    }

    const favList = $id('favList');
    if (favList) {
      favList.innerHTML = favs.length
        ? favs.map((fav, idx) => `
            <div class="col-6 col-md-4">
              <div class="card overflow-hidden h-100">
                <img src="${esc(fav.src)}" alt="${esc(fav.title)}" class="card-img-top" loading="lazy">
                <div class="p-2 d-flex justify-content-between align-items-center small">
                  <span class="fw-semibold">${esc(fav.title)}</span>
                  <button class="btn btn-sm btn-icon" type="button" data-i="${idx}" aria-label="Remove ${esc(fav.title)} from favorites">✕</button>
                </div>
              </div>
            </div>
          `).join('')
        : '<p class="muted mb-0">No favorite portfolio designs saved yet. <a href="portfolio.html">Browse the Portfolio Gallery</a> and tap ♡ to save inspiration.</p>';
    }
  }

  $id('favList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    const favs = store.get('favs', []);
    favs.splice(Number(btn.dataset.i), 1);
    store.set('favs', favs);
    renderSaved();
  });

  /* 8. Profile Settings, Reset Demo Data & Logout */
  if ($id('pName')) $id('pName').value = session.name || '';
  if ($id('pEmail')) $id('pEmail').value = session.email || '';
  if ($id('pPhone')) $id('pPhone').value = session.phone || '';

  $id('prof')?.addEventListener('submit', e => {
    e.preventDefault();
    const updated = {
      name: $id('pName').value.trim() || session.name,
      email: $id('pEmail').value.trim() || session.email,
      phone: $id('pPhone').value.trim()
    };
    store.set('session', updated);
    if ($id('uname')) $id('uname').textContent = updated.name.split(' ')[0];
    if ($id('pOk')) $id('pOk').textContent = 'Profile saved ✓';
  });

  $id('resetDemo')?.addEventListener('click', () => {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    store.set('dash', state);
    if (evDate) evDate.value = state.date;
    if (evType) evType.value = state.type;
    if (evTheme) evTheme.value = state.theme;
    syncCountdown();
    renderChecklist();
    renderVendors();
    renderBudgetTable();
    renderPayments();
    renderSchedule();
    updateOverviewKpis();
  });

  /* Logout confirmation is handled centrally via #dashLogoutModal */

  /* Initial Render */
  renderChecklist();
  renderVendors();
  renderBudgetTable();
  renderPayments();
  renderSchedule();
  renderSaved();
  updateOverviewKpis();
})();
