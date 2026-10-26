/* ==========================================================================
   Fiesta Rosa Events — Main Front-End Interactions (Vanilla JavaScript)
   ========================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {}
  }
};

/* Global Reusable Information Modal */
window.showDemoModal = function({ title, message, badge = 'System Notice', icon = 'bi-check-circle-fill', isSuccess = true, onOk = null }) {
  let modalEl = document.getElementById('demoModal');
  if (!modalEl) {
    const modalHtml = `
    <div class="modal fade" id="demoModal" tabindex="-1" aria-labelledby="demoModalTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content text-center p-4">
          <div class="modal-header border-0 pb-0 justify-content-end">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-0 pb-3">
            <div id="demoModalIcon" class="demo-modal-icon mx-auto mb-3">
              <i class="bi ${icon} ${isSuccess ? 'text-success' : 'text-danger'} fs-1"></i>
            </div>
            <span id="demoModalBadge" class="${isSuccess ? 'badge-gold' : 'badge bg-danger'} mb-2">${badge}</span>
            <h3 id="demoModalTitle" class="h4 mb-2">${title}</h3>
            <p id="demoModalMsg" class="mb-0 lead fs-6">${message}</p>
          </div>
          <div class="modal-footer border-0 pt-0 justify-content-center">
            <button type="button" id="demoModalOkBtn" class="btn btn-brand px-4 py-2" data-bs-dismiss="modal">OK</button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('demoModal');
  } else {
    const titleEl = document.getElementById('demoModalTitle');
    const msgEl = document.getElementById('demoModalMsg');
    const badgeEl = document.getElementById('demoModalBadge');
    const iconContainer = document.getElementById('demoModalIcon');
    const noteEl = modalEl.querySelector('.modal-body p.muted');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (badgeEl) {
      badgeEl.textContent = badge;
      badgeEl.className = `${isSuccess ? 'badge-gold' : 'badge bg-danger'} mb-2`;
    }
    if (iconContainer) {
      iconContainer.innerHTML = `<i class="bi ${icon} ${isSuccess ? 'text-success' : 'text-danger'} fs-1"></i>`;
    }
    if (noteEl) {
      noteEl.style.display = 'none';
    }
  }

  if (window.bootstrap && bootstrap.Modal) {
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
    const okBtn = document.getElementById('demoModalOkBtn');
    if (okBtn) {
      okBtn.onclick = () => {
        if (typeof onOk === 'function') onOk();
      };
    }
  } else {
    alert(`${title}\n\n${message}`);
    if (typeof onOk === 'function') onOk();
  }
};


/* 1. Light / Dark Mode & RTL Direction Toggle */
const rootEl = document.documentElement;
const themeBtn = $('#themeBtn');
const dirBtn = $('#dirBtn');

function paintControls() {
  const currentTheme = rootEl.dataset.theme || rootEl.dataset.bsTheme || 'light';
  const isDark = currentTheme === 'dark';
  if (themeBtn) {
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to Light theme' : 'Switch to Dark theme');
    themeBtn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
  const isRtl = rootEl.dir === 'rtl';
  if (dirBtn) {
    dirBtn.textContent = isRtl ? 'LTR' : 'RTL';
    dirBtn.setAttribute('aria-label', isRtl ? 'Switch to Left-to-Right layout' : 'Switch to Right-to-Left layout');
    dirBtn.title = isRtl ? 'Switch to Left-to-Right layout' : 'Switch to Right-to-Left layout';
  }
}
paintControls();

themeBtn?.addEventListener('click', () => {
  const cur = rootEl.dataset.theme || rootEl.dataset.bsTheme || 'light';
  const nextTheme = cur === 'dark' ? 'light' : 'dark';
  rootEl.dataset.theme = nextTheme;
  rootEl.dataset.bsTheme = nextTheme;
  localStorage.setItem('theme', nextTheme);
  paintControls();
});

dirBtn?.addEventListener('click', () => {
  const nextDir = rootEl.dir === 'rtl' ? 'ltr' : 'rtl';
  rootEl.dir = nextDir;
  localStorage.setItem('dir', nextDir);
  const bsLink = $('#bsCss');
  if (bsLink) {
    bsLink.href = `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap${nextDir === 'rtl' ? '.rtl' : ''}.min.css`;
  }
  paintControls();
});

/* 2. Show / Hide Password Toggles */
$$('.pass-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetInput = $(btn.dataset.target || 'input', btn.parentElement);
    if (!targetInput) return;
    const isPass = targetInput.type === 'password';
    targetInput.type = isPass ? 'text' : 'password';
    btn.textContent = isPass ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
  });
});

/* 3. Password Strength Meter with Text Indicator */
const rpassInput = $('#rpass');
const strengthBar = $('#passStrength');
const strengthText = $('#passStrengthText');
if (rpassInput && strengthBar) {
  rpassInput.addEventListener('input', () => {
    const val = rpassInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    let level = 'Weak';
    let width = '25%';
    let color = '#e63946';

    if (score >= 4) {
      level = 'Strong';
      width = '100%';
      color = '#198754';
    } else if (score >= 3) {
      level = 'Medium';
      width = '65%';
      color = '#e9c46a';
    } else if (val.length > 0) {
      level = 'Weak';
      width = '30%';
      color = '#e63946';
    } else {
      level = '';
      width = '0%';
      color = 'transparent';
    }

    strengthBar.style.width = width;
    strengthBar.style.backgroundColor = color;
    if (strengthText) {
      strengthText.textContent = level ? `Password Strength: ${level}` : '';
      strengthText.style.color = color;
    }
  });
}

/* 4. Tactile Button States */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  btn.classList.add('clicked');
  setTimeout(() => btn.classList.remove('clicked'), 180);
});

/* 5. Reflect Active Client Session in Header Navigation */
function syncAuthHeader() {
  const activeSession = store.get('session', null);
  const authSignInBtn = $('#authSignInBtn');
  const authBtnLabel = $('#authBtnLabel');
  const authMenuSignIn = $('#authMenuSignIn');

  if (!authSignInBtn) return;

  // Ensure authSignInBtn is wrapped in .auth-dropdown container
  let dropdownWrap = authSignInBtn.closest('.auth-dropdown');
  if (!dropdownWrap) {
    dropdownWrap = document.createElement('div');
    dropdownWrap.className = 'dropdown auth-dropdown d-inline-flex align-items-center';
    authSignInBtn.parentNode.insertBefore(dropdownWrap, authSignInBtn);
    dropdownWrap.appendChild(authSignInBtn);
  }

  // Ensure dropdown menu element exists
  let authDropdownMenu = $('#authDropdownMenu', dropdownWrap) || $('.dropdown-menu', dropdownWrap);
  if (!authDropdownMenu) {
    authDropdownMenu = document.createElement('ul');
    authDropdownMenu.className = 'dropdown-menu dropdown-menu-end shadow';
    authDropdownMenu.id = 'authDropdownMenu';
    authDropdownMenu.setAttribute('aria-labelledby', 'authSignInBtn');
    dropdownWrap.appendChild(authDropdownMenu);
  }

  if (activeSession && activeSession.name) {
    const fullName = activeSession.name;
    const shortName = fullName.split(' ')[0] || 'Account';

    if (authBtnLabel) authBtnLabel.textContent = shortName;

    // Turn into dropdown toggle button (without dropdown-toggle caret)
    authSignInBtn.removeAttribute('href');
    authSignInBtn.setAttribute('role', 'button');
    authSignInBtn.setAttribute('data-bs-toggle', 'dropdown');
    authSignInBtn.setAttribute('aria-expanded', 'false');
    authSignInBtn.classList.remove('dropdown-toggle');
    authSignInBtn.style.cursor = 'pointer';

    // Populate dropdown with Log Out option only
    authDropdownMenu.innerHTML = `
      <li>
        <button class="dropdown-item py-2 d-flex align-items-center gap-2 text-danger fw-semibold" type="button" id="headerLogoutBtn">
          <i class="bi bi-box-arrow-right text-danger"></i>
          <span>Log Out</span>
        </button>
      </li>
    `;

    if (authMenuSignIn) {
      authMenuSignIn.href = 'dashboard.html';
      authMenuSignIn.innerHTML = '<i class="bi bi-speedometer2 me-2 text-pink"></i>Client Dashboard';
    }
  } else {
    // Logged out state: direct link to login.html with NO dropdown
    if (authBtnLabel) authBtnLabel.textContent = 'Sign In';
    authSignInBtn.setAttribute('href', 'login.html');
    authSignInBtn.removeAttribute('role');
    authSignInBtn.removeAttribute('data-bs-toggle');
    authSignInBtn.removeAttribute('aria-expanded');
    authSignInBtn.classList.remove('dropdown-toggle');
    authSignInBtn.style.cursor = '';

    if (window.bootstrap && window.bootstrap.Dropdown) {
      const bsDrop = bootstrap.Dropdown.getInstance(authSignInBtn);
      if (bsDrop) bsDrop.dispose();
    }

    authDropdownMenu.innerHTML = '';
    authDropdownMenu.classList.remove('show');
    authSignInBtn.classList.remove('show');

    if (authMenuSignIn) {
      authMenuSignIn.href = 'login.html';
      authMenuSignIn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2 text-pink"></i>Sign In';
    }
  }

  if (typeof setupDropdownExclusion === 'function') {
    setupDropdownExclusion();
  }
}

// Initial sync on load and DOM ready
syncAuthHeader();
window.addEventListener('DOMContentLoaded', syncAuthHeader);

// Global click handler for Header Logout button
document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#headerLogoutBtn');
  if (!logoutBtn) return;
  e.preventDefault();

  // 1. Clear session
  store.set('session', null);
  try {
    localStorage.removeItem('session');
  } catch (_) {}

  // 2. Hide any active bootstrap dropdown
  const authSignInBtn = $('#authSignInBtn');
  if (authSignInBtn && window.bootstrap && bootstrap.Dropdown) {
    const bsDrop = bootstrap.Dropdown.getInstance(authSignInBtn);
    if (bsDrop) bsDrop.hide();
  }
  const authDropdownMenu = $('#authDropdownMenu');
  if (authDropdownMenu) authDropdownMenu.classList.remove('show');
  if (authSignInBtn) authSignInBtn.classList.remove('show');

  // 3. Reset header state back to "Sign In"
  syncAuthHeader();

  // 4. Show friendly popup notification
  if (typeof window.showDemoModal === 'function') {
    window.showDemoModal({
      title: 'Success',
      message: 'You have been logged out successfully.',
      badge: 'Signed Out',
      icon: 'bi-check-circle-fill',
      isSuccess: true
    });
  }

  // 5. If on dashboard page, redirect to login
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('dashboard.html')) {
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  }
});

// Fallback click handler if Bootstrap isn't active
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#authSignInBtn');
  if (!btn) return;
  const currentSession = store.get('session', null);
  if (currentSession && currentSession.name) {
    if (!window.bootstrap || !window.bootstrap.Dropdown) {
      e.preventDefault();
      const wrap = btn.closest('.auth-dropdown');
      const menu = wrap ? (wrap.querySelector('#authDropdownMenu') || wrap.querySelector('.dropdown-menu')) : null;
      if (menu) {
        menu.classList.toggle('show');
        btn.classList.toggle('show');
      }
    }
  }
});

/* 5b. Automatic Active Navigation Link Detector (URL & Path Driven) */
function syncActiveNav() {
  const rawPath = window.location.pathname;
  let filename = rawPath.substring(rawPath.lastIndexOf('/') + 1).toLowerCase();
  if (!filename || filename === '') filename = 'index.html';

  const navContainer = $('.site-header .navbar-nav');
  if (!navContainer) return;

  // Clear existing active states on navbar items
  $$('.nav-link, .dropdown-item', navContainer).forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('aria-current');
  });

  const isHome = filename === 'index.html' || filename === 'home-2.html';
  const homeToggle = $('.nav-item.dropdown > .nav-link.dropdown-toggle', navContainer);

  if (isHome) {
    if (homeToggle) {
      homeToggle.classList.add('active');
      homeToggle.setAttribute('aria-current', 'page');
    }
    const homeSubHref = filename === 'home-2.html' ? 'home-2.html' : 'index.html';
    const subItem = $(`.dropdown-item[href="${homeSubHref}"]`, navContainer);
    if (subItem) subItem.classList.add('active');
  } else {
    // Normal direct pages: About Us, Services, Packages, Portfolio, Blog, Contact, Dashboard
    let matchedLink = null;
    $$('.nav-item > .nav-link:not(.dropdown-toggle)', navContainer).forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      if (href === filename) {
        matchedLink = link;
      }
    });

    // Handle detail sub-pages
    if (!matchedLink) {
      if (filename === 'service-details.html') {
        matchedLink = $('.nav-link[href="services.html"]', navContainer);
      } else if (filename === 'blog-details.html') {
        matchedLink = $('.nav-link[href="blog.html"]', navContainer);
      }
    }

    if (matchedLink) {
      matchedLink.classList.add('active');
      matchedLink.setAttribute('aria-current', 'page');
    }
  }
}
syncActiveNav();
window.addEventListener('DOMContentLoaded', syncActiveNav);

/* 5c. Close mobile navigation menu upon selecting a link */
function setupMobileNavAutoClose() {
  const navCollapse = $('#nav');
  if (!navCollapse) return;

  const linksToClose = $$('.nav-link:not(.dropdown-toggle), .dropdown-item, .header-actions .btn-brand', navCollapse);
  linksToClose.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992 && navCollapse.classList.contains('show')) {
        if (window.bootstrap && window.bootstrap.Collapse) {
          const bsCollapse = bootstrap.Collapse.getInstance(navCollapse) || new bootstrap.Collapse(navCollapse, { toggle: false });
          bsCollapse.hide();
        } else {
          navCollapse.classList.remove('show');
        }
        const toggler = $('.navbar-toggler[data-bs-target="#nav"]');
        if (toggler) {
          toggler.setAttribute('aria-expanded', 'false');
          toggler.classList.add('collapsed');
        }
      }
    });
  });
}
setupMobileNavAutoClose();
window.addEventListener('DOMContentLoaded', setupMobileNavAutoClose);

/* 5d. Unified Dropdown Controller:
   - Only the clicked dropdown opens; prevents multiple dropdowns from opening simultaneously
   - Closes the previous dropdown when another menu is selected
   - Closes open dropdowns when clicking outside or selecting a link
*/
function setupDropdownExclusion() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const getDropdownItems = () => {
    return Array.from(header.querySelectorAll('[data-bs-toggle="dropdown"]')).map(toggle => {
      const parent = toggle.closest('.dropdown');
      const menu = parent ? parent.querySelector('.dropdown-menu') : null;
      return { toggle, parent, menu };
    });
  };

  const closeDropdown = (item) => {
    if (!item || !item.toggle) return;
    if (window.bootstrap && window.bootstrap.Dropdown) {
      const bsDropdown = bootstrap.Dropdown.getInstance(item.toggle);
      if (bsDropdown) bsDropdown.hide();
    }
    item.toggle.setAttribute('aria-expanded', 'false');
    item.toggle.classList.remove('show');
    if (item.menu) {
      item.menu.classList.remove('show');
      item.menu.removeAttribute('data-bs-popper');
    }
    if (item.parent) {
      item.parent.classList.remove('show');
    }
  };

  const allItems = getDropdownItems();

  allItems.forEach(current => {
    // When Bootstrap show event fires, close every other dropdown
    current.toggle.addEventListener('show.bs.dropdown', () => {
      allItems.forEach(other => {
        if (other.toggle !== current.toggle) {
          closeDropdown(other);
        }
      });
    });

    // Handle direct click for instant mutual exclusion on touch devices
    current.toggle.addEventListener('click', () => {
      allItems.forEach(other => {
        if (other.toggle !== current.toggle) {
          closeDropdown(other);
        }
      });
    });
  });

  // Close dropdowns when clicking anywhere outside header dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header .dropdown')) {
      allItems.forEach(item => {
        closeDropdown(item);
      });
    }
  });

  // When mobile nav is closing, close all dropdowns
  const navCollapse = $('#nav');
  if (navCollapse) {
    navCollapse.addEventListener('hide.bs.collapse', () => {
      allItems.forEach(item => {
        closeDropdown(item);
      });
    });
  }
}
setupDropdownExclusion();
window.addEventListener('DOMContentLoaded', setupDropdownExclusion);

/* Logout confirmation handler for Client Dashboard */
const logoutBtn = $('#logout');
const dashLogoutModalEl = $('#dashLogoutModal');
if (logoutBtn && dashLogoutModalEl && window.bootstrap) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    bootstrap.Modal.getOrCreateInstance(dashLogoutModalEl).show();
  });
  $('#confirmLogoutBtn')?.addEventListener('click', () => {
    store.set('session', null);
    localStorage.removeItem('session');
    location.href = 'login.html';
  });
} else if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to end your planning session?')) {
      store.set('session', null);
      localStorage.removeItem('session');
      location.href = 'login.html';
    }
  });
}

/* 6. Scroll-to-Top Button, Section Reveal Animations & Stat Counters */
const toTopBtn = $('#toTop');
window.addEventListener('scroll', () => {
  if (toTopBtn) toTopBtn.hidden = window.scrollY < 340;
}, { passive: true });

toTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('show');
      revealObserver.unobserve(el);

      if (el.dataset.count) {
        const targetVal = Number(el.dataset.count) || 0;
        let current = 0;
        const step = Math.max(1, Math.ceil(targetVal / 40));
        const timer = setInterval(() => {
          current += step;
          if (current >= targetVal) {
            current = targetVal;
            clearInterval(timer);
          }
          el.textContent = current.toLocaleString();
        }, 28);
      }
    });
  }, { threshold: 0.14 });

  $$('.reveal, [data-count]').forEach(el => revealObserver.observe(el));
} else {
  $$('.reveal').forEach(el => el.classList.add('show'));
}

/* 7. Live Countdown Timer */
function tick() {
  $$('[data-countdown]').forEach(el => {
    const targetTime = new Date(el.dataset.countdown).getTime();
    if (Number.isNaN(targetTime)) return;
    const diff = Math.max(0, targetTime - Date.now());
    const units = [
      diff / 86400000,
      (diff % 86400000) / 3600000,
      (diff % 3600000) / 60000,
      (diff % 60000) / 1000
    ];
    ['d', 'h', 'm', 's'].forEach((unitKey, idx) => {
      const node = $(`[data-u="${unitKey}"]`, el);
      if (node) node.textContent = String(Math.floor(units[idx])).padStart(2, '0');
    });
  });
}
tick();
setInterval(tick, 1000);

/* 8. Comprehensive Form Validation Engine */
const isNameInput = el => el.dataset.type === 'name' || ['cname', 'rname', 'bname', 'profName'].includes(el.id || el.name);
const isPhoneInput = el => el.dataset.type === 'phone' || el.type === 'tel' || ['cphone', 'rphone', 'bphone', 'profPhone'].includes(el.id || el.name);

function validateField(el, form) {
  const rawVal = el.value || '';
  const val = rawVal.trim();
  let errMsg = '';

  // Required check
  if (el.required && (el.type === 'checkbox' ? !el.checked : !val)) {
    errMsg = el.type === 'checkbox' ? 'You must accept the terms to proceed.' : 'This field is required.';
  } else if (val) {
    // 1. Full Name: letters, spaces, accented characters, hyphens, and apostrophes; reject numbers and special symbols
    if (isNameInput(el)) {
      const hasDisallowed = /[\d@#$%^&*()_+=\[\]{};:"\\|<>?/~`!]/.test(val);
      const validNamePattern = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
      if (hasDisallowed || !validNamePattern.test(val) || val.replace(/[\s'\-]/g, '').length < 2) {
        errMsg = 'Please enter a valid full name (letters, spaces, hyphens, and apostrophes only; numbers not permitted).';
      }
    }
    // 2. Email format validation
    else if (el.type === 'email' || el.dataset.type === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(val)) {
        errMsg = 'Please enter a valid email address (e.g., family@domain.com).';
      }
    }
    // 3. Phone Number: exactly 10 digits for Indian mobile numbers
    else if (isPhoneInput(el)) {
      if (!/^[0-9]{10}$/.test(val)) {
        errMsg = 'Please enter a valid 10-digit phone number.';
      }
    }
    // 4. Contact Message: min 10 non-whitespace characters
    else if (el.name === 'cmessage' || el.id === 'cmessage' || el.name === 'cmsg' || el.id === 'cmsg' || el.dataset.minMessage !== undefined || (el.tagName.toLowerCase() === 'textarea' && el.required)) {
      if (val.replace(/\s+/g, '').length < 10) {
        errMsg = 'Message must contain at least 10 non-whitespace characters.';
      }
    }
    // 5. Subject: required min 2 chars
    else if (el.name === 'csubject' || el.id === 'csubject' || el.dataset.type === 'subject') {
      if (val.trim().length < 2) {
        errMsg = 'Please enter a valid subject.';
      }
    }
    // 6. Event Date: not in the past
    else if (el.type === 'date' || el.id === 'bdate' || el.name === 'bdate') {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selectedDate.getTime()) || selectedDate < today) {
        errMsg = 'Event date cannot be in the past.';
      }
    }
    // 7. Guest Count: positive whole number
    else if (el.id === 'bguests' || el.name === 'bguests') {
      const num = Number(val);
      if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        errMsg = 'Please enter a valid guest count (positive whole number).';
      }
    }
    // 8. Budget: positive amount if filled
    else if (el.id === 'bbudget' || el.name === 'bbudget') {
      const num = Number(val);
      if (isNaN(num) || num <= 0) {
        errMsg = 'Please enter a valid positive budget amount.';
      }
    }
    // 9. Password Complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 number
    else if (el.dataset.strong !== undefined || el.id === 'rpass' || el.name === 'rpass') {
      const strongPassRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!strongPassRegex.test(val)) {
        errMsg = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
      }
    }
    // 10. Password Match
    else if (el.dataset.match) {
      const matchTarget = $(el.dataset.match, form);
      if (matchTarget && val !== matchTarget.value) {
        errMsg = 'Passwords do not match.';
      }
    }
  }

  // Do not show error before user interacts with field (unless submitting form)
  const isInteracted = el.dataset.touched === 'true' || Boolean(form && form.dataset.submitting);
  if (!isInteracted && !errMsg) {
    return true;
  }
  if (!isInteracted && !val) {
    return true;
  }

  el.classList.toggle('is-invalid', Boolean(errMsg));
  el.classList.toggle('is-valid', !errMsg && Boolean(val));
  el.setAttribute('aria-invalid', String(Boolean(errMsg)));

  const passWrap = el.closest('.pass-wrap');
  let feedback = null;

  if (passWrap) {
    // If feedback was previously placed inside passWrap, remove it so passWrap height is not affected
    const innerFeedback = passWrap.querySelector(':scope > .invalid-feedback');
    if (innerFeedback) innerFeedback.remove();

    // Place feedback cleanly after passWrap container
    const nextEl = passWrap.nextElementSibling;
    if (nextEl && nextEl.classList.contains('invalid-feedback')) {
      feedback = nextEl;
    } else {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      passWrap.insertAdjacentElement('afterend', feedback);
    }
  } else {
    const wrapper = el.closest('.mb-3, .col-md-6, .col-md-4, .col-12, .flex-grow-1, .form-check') || (el.closest('.footer-input-group') ? el.closest('.footer-newsletter') : el.parentElement);
    feedback = wrapper.querySelector(':scope > .invalid-feedback') || wrapper.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      wrapper.appendChild(feedback);
    }
  }

  feedback.textContent = errMsg;
  feedback.style.display = errMsg ? 'block' : 'none';
  return !errMsg;
}

function validateForm(form) {
  let allValid = true;
  $$('input, select, textarea', form).forEach(el => {
    if (!validateField(el, form)) allValid = false;
  });
  return allValid;
}

const showAuthError = (form, msg) => {
  const alertEl = $('#authMsg', form);
  if (alertEl) {
    alertEl.textContent = msg;
    alertEl.hidden = false;
  }
};

const formHandlers = {
  contact(form) {
    window.showDemoModal({
      title: 'Message Received',
      message: 'Thank you! Your inquiry has been submitted successfully. Our lead planning studio will review your celebration details and follow up promptly.',
      badge: 'Client Inquiry',
      icon: 'bi-check-circle-fill',
      isSuccess: true
    });
    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
  },
  booking(form) {
    window.showDemoModal({
      title: 'Consultation Request Confirmed',
      message: 'Your consultation request has been submitted successfully. Our event coordinators will verify calendar availability and reach out to confirm your private planning consultation.',
      badge: 'Private Consultation',
      icon: 'bi-calendar2-check',
      isSuccess: true
    });
    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
  },
  newsletter(form) {
    window.showDemoModal({
      title: 'Subscribed to Newsletter',
      message: 'Thank you for subscribing! You will receive our latest celebration tips, decor styling ideas, and planning inspiration.',
      badge: 'Newsletter',
      icon: 'bi-envelope-check',
      isSuccess: true
    });
    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
  },
  sidebarNewsletter(form) {
    window.showDemoModal({
      title: 'Subscribed to Monthly Journal',
      message: 'Thank you! You are subscribed to our monthly planning guides, trend forecasts, and VIP decor showcases.',
      badge: 'Planning Journal',
      icon: 'bi-journal-check',
      isSuccess: true
    });
    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
  },
  notify(form) {
    window.showDemoModal({
      title: 'Launch Alert Saved',
      message: 'Thank you! You have been registered to receive an announcement as soon as the interactive lookbook and showroom go live.',
      badge: 'VIP Notification',
      icon: 'bi-bell-fill',
      isSuccess: true
    });
    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
  },
  login(form) {
    const emailInput = $('#lemail', form);
    const passInput = $('#lpass', form);
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passInput ? passInput.value : '';

    const users = store.get('registered_users', []);
    const user = users.find(u => (u.email || '').toLowerCase() === email);

    if (!user) {
      showAuthError(form, 'Account not found. Please sign up first.');
      window.showDemoModal({
        title: 'Account Not Found',
        message: 'Account not found. Please sign up first.',
        badge: 'Sign Up Required',
        icon: 'bi-exclamation-triangle-fill',
        isSuccess: false
      });
      return;
    }

    if (user.password !== password) {
      showAuthError(form, 'Incorrect password. Please try again.');
      window.showDemoModal({
        title: 'Incorrect Credentials',
        message: 'The email or password you entered is incorrect. Please try again.',
        badge: 'Login Failed',
        icon: 'bi-x-circle-fill',
        isSuccess: false
      });
      return;
    }

    // Login successful
    const authAlert = $('#authMsg', form);
    if (authAlert) authAlert.hidden = true;

    store.set('session', {
      name: user.name,
      email: user.email,
      phone: user.phone
    });

    window.showDemoModal({
      title: 'Success',
      message: 'Login successful! Welcome back.',
      badge: 'Welcome Back',
      icon: 'bi-check-circle-fill',
      isSuccess: true
    });
  },
  register(form) {
    const nameInput = $('#rname', form);
    const emailInput = $('#remail', form);
    const phoneInput = $('#rphone', form);
    const passInput = $('#rpass', form);

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    const users = store.get('registered_users', []);
    const existingUser = users.find(u => (u.email || '').toLowerCase() === email);

    if (existingUser) {
      showAuthError(form, 'An account with this email already exists. Please sign in.');
      window.showDemoModal({
        title: 'Account Exists',
        message: 'An account with this email already exists. Please sign in instead.',
        badge: 'Already Registered',
        icon: 'bi-info-circle-fill',
        isSuccess: false
      });
      return;
    }

    // Save registered user
    users.push({
      name,
      email,
      phone,
      password,
      createdAt: new Date().toISOString()
    });
    store.set('registered_users', users);

    const authAlert = $('#authMsg', form);
    if (authAlert) authAlert.hidden = true;

    window.showDemoModal({
      title: 'Success',
      message: 'Registration successful! You can now sign in.',
      badge: 'Registration Complete',
      icon: 'bi-check-circle-fill',
      isSuccess: true
    });

    form.reset();
    $$('.is-valid, .is-invalid', form).forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
      delete el.dataset.touched;
    });
    const strengthBar = $('#passStrength');
    const strengthText = $('#passStrengthText');
    if (strengthBar) {
      strengthBar.style.width = '0%';
      strengthBar.style.backgroundColor = 'transparent';
    }
    if (strengthText) strengthText.textContent = '';
  },
  profileForm(form) {
    const profName = $('#profName', form)?.value.trim() || 'Sofia Reyes';
    const profPhone = $('#profPhone', form)?.value.trim() || '';
    const profEmail = $('#profEmail', form)?.value.trim() || '';
    const profLang = $('#profLang', form)?.value || 'Bilingual (English & Spanish)';
    store.set('session', { name: profName, email: profEmail, phone: profPhone, lang: profLang });
    if ($('#uname')) $('#uname').textContent = profName.split(' ')[0];
    window.showDemoModal({
      title: 'Profile Updated',
      message: 'Your family profile settings have been successfully updated.',
      badge: 'Profile Saved',
      icon: 'bi-check-circle-fill',
      isSuccess: true
    });
  }
};

/* Forgot Password Info Helper */
$('#forgotPassLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.showDemoModal({
    title: 'Password Assistance',
    message: 'To reset your celebration portal credentials, please contact the Fiesta Rosa planning studio at concierge@fiestarosa.com or call (305) 555-ROSA.',
    badge: 'Account Support',
    icon: 'bi-key-fill',
    isSuccess: true
  });
});

/* Social Authentication Handler (Google & Apple) */
document.addEventListener('click', (e) => {
  const socialBtn = e.target.closest('.auth-social-btn');
  if (!socialBtn) return;
  e.preventDefault();

  const provider = socialBtn.dataset.provider || (socialBtn.classList.contains('btn-social-apple') ? 'Apple' : 'Google');
  const isRegisterPage = document.body.classList.contains('auth-page-register') || !!document.getElementById('register');

  const mockEmail = provider === 'Apple' ? 'sofia.reyes@privaterelay.appleid.com' : 'sofia.reyes@gmail.com';
  const mockName = 'Sofia Reyes';
  const mockPhone = '9876543210';

  // Save session
  store.set('session', {
    name: mockName,
    email: mockEmail,
    phone: mockPhone,
    provider: provider
  });

  // Ensure user is in registered_users store
  const users = store.get('registered_users', []);
  if (!users.some(u => (u.email || '').toLowerCase() === mockEmail.toLowerCase())) {
    users.push({
      name: mockName,
      email: mockEmail,
      phone: mockPhone,
      password: 'SocialLogin123!',
      provider: provider,
      createdAt: new Date().toISOString()
    });
    store.set('registered_users', users);
  }

  if (typeof syncAuthHeader === 'function') syncAuthHeader();

  const actionText = isRegisterPage ? 'Registered and signed in' : 'Signed in';
  window.showDemoModal({
    title: `${provider} Authentication`,
    message: `${actionText} successfully with ${provider}! Welcome to your Fiesta Rosa portal, ${mockName}.`,
    badge: `${provider} Connected`,
    icon: provider === 'Apple' ? 'bi-apple' : 'bi-check-circle-fill',
    isSuccess: true
  });
});

$$('form[data-validate]').forEach(form => {
  $$('input, select, textarea', form).forEach(el => {
    // 1. Keydown prevention for name and phone
    el.addEventListener('keydown', e => {
      // Allow navigation and system shortcut keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;

      if (isNameInput(el)) {
        // Disallow digits and special symbols for names immediately
        if (/[\d@#$%^&*()_+=\[\]{};:"\\|<>?/~`!]/.test(e.key)) {
          e.preventDefault();
        }
      } else if (isPhoneInput(el)) {
        // Only allow digits 0-9 and prevent typing beyond 10 digits
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        } else if (el.selectionStart === el.selectionEnd && el.value.length >= 10) {
          e.preventDefault();
        }
      }
    });

    // 2. Input event (handles typing, paste, mobile soft keyboards)
    el.addEventListener('input', () => {
      if (isPhoneInput(el)) {
        const clean = el.value.replace(/[^0-9]/g, '').slice(0, 10);
        if (el.value !== clean) {
          el.value = clean;
        }
      }
      el.dataset.touched = 'true';
      validateField(el, form);
    });

    // 3. Blur event
    el.addEventListener('blur', () => {
      el.dataset.touched = 'true';
      validateField(el, form);
    });
  });

  // 4. Submit event
  form.addEventListener('submit', e => {
    e.preventDefault();
    form.dataset.submitting = 'true';
    $$('input, select, textarea', form).forEach(el => {
      el.dataset.touched = 'true';
    });
    const authAlert = $('#authMsg', form);
    if (authAlert) authAlert.hidden = true;
    const isValid = validateForm(form);
    delete form.dataset.submitting;
    if (isValid) {
      formHandlers[form.id]?.(form);
    }
  });
});

/* 9. Packages Page: Interactive Guest Slider, Add-ons & Package Selection */
const guestsInput = $('#guests');
if (guestsInput) {
  const addonChecks = $$('.pkg-addon');
  const getAddonTotal = () => addonChecks.reduce((sum, cb) => sum + (cb.checked ? Number(cb.dataset.cost || 0) : 0), 0);

  const updatePackagePrices = () => {
    const guestCount = Number(guestsInput.value) || 50;
    const guestOut = $('#guestOut');
    if (guestOut) guestOut.textContent = String(guestCount);
    const addonTotal = getAddonTotal();

    $$('[data-base]').forEach(priceEl => {
      const base = Number(priceEl.dataset.base) || 0;
      const perGuest = Number(priceEl.dataset.per) || 0;
      const extraGuests = Math.max(0, guestCount - 50);
      const total = base + extraGuests * perGuest + addonTotal;
      priceEl.textContent = '$' + total.toLocaleString();
    });
  };

  guestsInput.addEventListener('input', updatePackagePrices);
  addonChecks.forEach(cb => cb.addEventListener('change', updatePackagePrices));
  updatePackagePrices();

  const highlightPackage = pkgName => {
    $$('.pkg').forEach(card => {
      const isSelected = card.dataset.name === pkgName;
      card.classList.toggle('selected', isSelected);
      const btn = $('[data-pkg]', card);
      if (btn) {
        btn.setAttribute('aria-pressed', String(isSelected));
        btn.textContent = isSelected ? `✓ ${pkgName} Selected` : `Select ${pkgName}`;
      }
    });
    $$('table [data-pkg]').forEach(tBtn => {
      const isSelected = tBtn.dataset.pkg === pkgName;
      tBtn.setAttribute('aria-pressed', String(isSelected));
      tBtn.textContent = isSelected ? `✓ Selected` : `Select ${tBtn.dataset.pkg}`;
    });
  };

  const savedPkg = store.get('pkg', null);
  if (savedPkg?.name) {
    highlightPackage(savedPkg.name);
    const msgEl = $('#pkgMsg');
    if (msgEl && savedPkg.price) {
      const addonText = savedPkg.addons?.length ? ` with ${savedPkg.addons.join(', ')}` : '';
      msgEl.innerHTML = `<i class="bi bi-check-circle-fill text-pink me-2"></i><strong>${savedPkg.name}</strong> selected (${savedPkg.price} for ${savedPkg.guests || 50} guests${addonText}). Saved to your <a href="dashboard.html#saved" class="text-pink fw-semibold">Client Dashboard</a>.`;
      msgEl.classList.remove('d-none');
    }
  }

  $$('[data-pkg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.pkg;
      const card = btn.closest('.pkg') || $(`.pkg[data-name="${name}"]`);
      const price = $('[data-base]', card)?.textContent || '$0';
      const addons = addonChecks.filter(cb => cb.checked).map(cb => cb.value);
      store.set('pkg', { name, price, guests: guestsInput.value, addons });
      highlightPackage(name);
      const msgEl = $('#pkgMsg');
      if (msgEl) {
        const addonText = addons.length ? ` with ${addons.join(', ')}` : '';
        msgEl.innerHTML = `<i class="bi bi-check-circle-fill text-pink me-2"></i><strong>${name}</strong> selected (${price} for ${guestsInput.value} guests${addonText}). Saved to your <a href="dashboard.html#saved" class="text-pink fw-semibold">Client Dashboard</a>.`;
        msgEl.classList.remove('d-none');
      }
    });
  });
}

/* 10. Portfolio Gallery: Category Filters, Lightbox Modal & Favorites */
$$('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    $$('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
    let visibleCount = 0;
    $$('.g-item').forEach(item => {
      const show = filter === 'all' || item.dataset.cat === filter;
      item.classList.toggle('hide', !show);
      if (show) visibleCount++;
    });
    const countBadge = $('#galleryCount');
    if (countBadge) countBadge.textContent = `Showing ${visibleCount} celebration${visibleCount === 1 ? '' : 's'}`;
  });
});

$$('.g-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalImg = $('#imgBig');
    const modalTitle = $('#imgTitle');
    const modalDesc = $('#imgDesc');
    if (modalImg) {
      modalImg.src = btn.dataset.img;
      modalImg.alt = btn.dataset.title;
    }
    if (modalTitle) modalTitle.textContent = btn.dataset.title;
    if (modalDesc && btn.dataset.desc) modalDesc.textContent = btn.dataset.desc;
    const modalEl = $('#imgModal');
    if (modalEl && window.bootstrap) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  });
});

const getFavorites = () => store.get('favs', []);
$$('.fav').forEach(btn => {
  const renderFavState = () => {
    const isFav = getFavorites().some(f => f.id === btn.dataset.fav);
    btn.textContent = isFav ? '♥' : '♡';
    btn.classList.toggle('on', isFav);
    btn.setAttribute('aria-pressed', String(isFav));
  };
  renderFavState();

  btn.addEventListener('click', () => {
    let list = getFavorites();
    const id = btn.dataset.fav;
    if (list.some(f => f.id === id)) {
      list = list.filter(f => f.id !== id);
    } else {
      list.push({ id, title: btn.dataset.title, src: btn.dataset.src });
    }
    store.set('favs', list);
    renderFavState();
  });
});

/* 11. Blog Page: Live Search, Category Filtering, Sorting & Load More Pagination */
const blogSearch = $('#blogSearch');
const blogSort = $('#blogSort');
const postsGrid = $('#postsGrid');
const loadMoreBtn = $('#loadMoreBtn');
const resetBlogFiltersBtn = $('#resetBlogFiltersBtn');

if (postsGrid) {
  let activeCat = 'all';
  let visibleLimit = 6;
  const CHUNK_SIZE = 6;

  const updateBlogView = () => {
    const query = blogSearch ? blogSearch.value.toLowerCase().trim() : '';
    const sortVal = blogSort ? blogSort.value : 'newest';
    const allPosts = $$('.post', postsGrid);
    let matchedPosts = [];

    allPosts.forEach(post => {
      const cat = post.dataset.cat || '';
      const text = (post.dataset.text || '').toLowerCase();
      const title = (post.dataset.title || post.querySelector('h3 a')?.textContent || '').toLowerCase();
      const matchesCat = activeCat === 'all' || cat === activeCat;
      const matchesQuery = !query || text.includes(query) || title.includes(query);
      if (matchesCat && matchesQuery) {
        matchedPosts.push(post);
      } else {
        post.classList.add('d-none');
      }
    });

    // Sort matched posts
    matchedPosts.sort((a, b) => {
      if (sortVal === 'newest') {
        const dateA = new Date(a.dataset.date || 0).getTime();
        const dateB = new Date(b.dataset.date || 0).getTime();
        return dateB - dateA;
      } else if (sortVal === 'oldest') {
        const dateA = new Date(a.dataset.date || 0).getTime();
        const dateB = new Date(b.dataset.date || 0).getTime();
        return dateA - dateB;
      } else if (sortVal === 'title') {
        const titleA = (a.dataset.title || a.querySelector('h3 a')?.textContent || '').trim();
        const titleB = (b.dataset.title || b.querySelector('h3 a')?.textContent || '').trim();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    // Re-order posts in DOM
    matchedPosts.forEach(post => {
      postsGrid.appendChild(post);
    });

    // If searching or category filtering, show all matching articles without truncating
    const isFiltered = activeCat !== 'all' || Boolean(query);
    const effectiveLimit = isFiltered ? matchedPosts.length : visibleLimit;

    // Handle visibility
    matchedPosts.forEach((post, index) => {
      if (index < effectiveLimit) {
        post.classList.remove('d-none');
      } else {
        post.classList.add('d-none');
      }
    });

    // Load more button handling
    if (loadMoreBtn) {
      if (isFiltered || matchedPosts.length <= 6) {
        loadMoreBtn.classList.add('d-none');
      } else {
        loadMoreBtn.classList.remove('d-none');
        if (effectiveLimit >= matchedPosts.length) {
          loadMoreBtn.textContent = 'Show Fewer Articles';
        } else {
          const remaining = matchedPosts.length - effectiveLimit;
          const nextCount = Math.min(CHUNK_SIZE, remaining);
          loadMoreBtn.textContent = `Load More Articles (${remaining} more)`;
        }
      }
    }

    // Empty state handling
    const noPosts = $('#noPosts');
    if (noPosts) {
      noPosts.hidden = matchedPosts.length > 0;
    }
  };

  blogSearch?.addEventListener('input', () => {
    updateBlogView();
  });

  blogSort?.addEventListener('change', () => {
    updateBlogView();
  });

  const sidebarSearch = $('#sidebarSearch');
  const sidebarSearchBtn = $('#sidebarSearchBtn');
  if (sidebarSearch && blogSearch) {
    sidebarSearch.addEventListener('input', () => {
      blogSearch.value = sidebarSearch.value;
      updateBlogView();
    });
    sidebarSearchBtn?.addEventListener('click', () => {
      blogSearch.value = sidebarSearch.value;
      updateBlogView();
      postsGrid?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  $$('[data-bcat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.bcat;
      $$('[data-bcat]').forEach(b => b.classList.toggle('active', b.dataset.bcat === activeCat));
      updateBlogView();
      postsGrid?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  loadMoreBtn?.addEventListener('click', () => {
    const allPosts = $$('.post', postsGrid);
    const totalMatched = allPosts.length;

    if (visibleLimit >= totalMatched) {
      visibleLimit = 6;
      updateBlogView();
      postsGrid?.scrollIntoView({ behavior: 'smooth' });
    } else {
      visibleLimit += CHUNK_SIZE;
      updateBlogView();
    }
  });

  const resetAllFilters = () => {
    if (blogSearch) blogSearch.value = '';
    if (sidebarSearch) sidebarSearch.value = '';
    if (blogSort) blogSort.value = 'newest';
    activeCat = 'all';
    visibleLimit = 6;
    $$('[data-bcat]').forEach(b => b.classList.toggle('active', b.dataset.bcat === 'all'));
    updateBlogView();
    postsGrid?.scrollIntoView({ behavior: 'smooth' });
  };

  resetBlogFiltersBtn?.addEventListener('click', resetAllFilters);

  if (location.hash.startsWith('#cat-')) {
    const targetCat = location.hash.replace('#cat-', '');
    const chip = $(`[data-bcat="${targetCat}"]`);
    if (chip) chip.click();
  }

  // Save selected blog post to sessionStorage when navigating to blog-details
  postsGrid?.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="blog-details.html"]');
    if (!link) return;
    const postEl = link.closest('.post');
    if (postEl && postEl.dataset.id) {
      try {
        if (window.sessionStorage) window.sessionStorage.setItem('activeBlogPost', postEl.dataset.id);
      } catch (err) {}
    }
  });

  updateBlogView();
}

/* 11b. Blog Details Dynamic Article Controller */
function initBlogDetailsPage() {
  const articleContainer = document.getElementById('articleContainer');
  if (!articleContainer) return; // Only execute on blog-details.html

  if (!window.BLOG_POSTS_DATA || !window.getBlogPostById) {
    return;
  }

  // Retrieve post identifier from URL query param ?id= or ?post=, fallback to sessionStorage, then default
  const params = new URLSearchParams(window.location.search);
  let cachedId = null;
  try {
    cachedId = window.sessionStorage ? window.sessionStorage.getItem('activeBlogPost') : null;
  } catch (e) {}

  const postId = params.get('id') || params.get('post') || cachedId || 'quinceanera-theme-ideas';

  const post = window.getBlogPostById(postId);
  if (!post) return;

  // Cache current selection
  try {
    if (window.sessionStorage) window.sessionStorage.setItem('activeBlogPost', post.slug);
  } catch (e) {}

  // 1. Update Document Title & Meta Description
  document.title = `${post.title} | Fiesta Rosa Events`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && post.desc) {
    metaDesc.setAttribute('content', post.desc);
  }

  // 2. Update Hero Banner
  const heroSection = document.getElementById('articleHero');
  if (heroSection) {
    heroSection.style.backgroundImage = `linear-gradient(rgba(26, 20, 24, 0.65), rgba(26, 20, 24, 0.75)), url('${post.imgSrc}')`;
    heroSection.setAttribute('aria-label', post.title);
  }

  const categoryBadge = document.getElementById('articleCategoryBadge');
  if (categoryBadge) {
    categoryBadge.textContent = post.categoryName || 'Celebration Guide';
  }

  const heroTitle = document.getElementById('articleHeroTitle');
  if (heroTitle) {
    heroTitle.textContent = post.title;
  }

  const heroMeta = document.getElementById('articleHeroMeta');
  if (heroMeta) {
    heroMeta.textContent = `By ${post.author.name}, ${post.author.role} · Published ${post.dateFormatted} · ${post.readTime}`;
  }

  // 3. Update Main Featured Image
  const mainImg = document.getElementById('articleMainImg');
  if (mainImg) {
    mainImg.src = post.imgSrc;
    mainImg.alt = post.imgAlt || post.title;
  }

  // 4. Update Author Profile
  const authorName = document.getElementById('articleAuthorName');
  if (authorName) authorName.textContent = post.author.name;

  const authorRole = document.getElementById('articleAuthorRole');
  if (authorRole) authorRole.textContent = `${post.author.role} at Fiesta Rosa Events · Creative Milestone Stylist`;

  const authorAvatar = document.getElementById('articleAuthorAvatar');
  if (authorAvatar) authorAvatar.textContent = post.author.avatar || 'FR';

  // 5. Update Dynamic Article Body Content
  const bodyContent = document.getElementById('articleBodyContent');
  if (bodyContent && post.content) {
    const c = post.content;
    const sectionsHtml = (c.sections || []).map(s => `
      <h3 class="h4 mt-4">${s.h3}</h3>
      <p>${s.p}</p>
    `).join('');

    const checklistHtml = (c.checklist || []).map(item => `<li>${item}</li>`).join('');

    bodyContent.innerHTML = `
      <p class="lead">${c.intro}</p>
      ${sectionsHtml}
      ${c.quote ? `<blockquote class="quote">${c.quote}</blockquote>` : ''}
      ${c.checklist && c.checklist.length ? `
        <div class="card p-4 my-4">
          <h4 class="h5 mb-2">${c.checklistTitle || '✨ Planning Checklist'}</h4>
          <ul class="mb-0">
            ${checklistHtml}
          </ul>
        </div>
      ` : ''}
      <p class="mb-0">
        Ready to see how these celebration concepts look in your favorite venue? <a href="contact.html#booking">Book a complimentary design consultation</a> and our studio will prepare a personalized 3D mood board for your family.
      </p>
    `;
  }

  // 6. Update Sidebar Related Articles (Pick 3 distinct articles)
  const relatedList = document.getElementById('relatedArticlesList');
  if (relatedList && window.BLOG_POSTS_DATA) {
    const pool = window.BLOG_POSTS_DATA.filter(p => p.slug !== post.slug);
    const sameCat = pool.filter(p => p.cat === post.cat);
    const otherCat = pool.filter(p => p.cat !== post.cat);
    const related3 = sameCat.concat(otherCat).slice(0, 3);

    relatedList.innerHTML = related3.map(r => `
      <a class="d-flex gap-3 text-decoration-none align-items-center lift p-2 rounded-3 border" href="blog-details.html?id=${r.slug}">
        <img src="${r.imgSrc}" alt="${r.title}" width="92" height="68" class="rounded-3 flex-shrink-0" style="object-fit: cover;" loading="lazy">
        <span class="fw-semibold small text-reset hover-pink">${r.title}</span>
      </a>
    `).join('');
  }
}

// Initialize blog details immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogDetailsPage);
} else {
  initBlogDetailsPage();
}
window.addEventListener('popstate', initBlogDetailsPage);

/* 12. Service Details: Activate Tab from URL Hash */
function syncServiceTabFromHash() {
  if (location.hash.startsWith('#svc-')) {
    const tabTrigger = $(`[data-bs-target="${location.hash}"]`);
    if (tabTrigger && window.bootstrap) {
      bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
    }
  }
}
syncServiceTabFromHash();
window.addEventListener('hashchange', syncServiceTabFromHash);


/* 14. Initialize Tooltips for Social Media Icons */
if (window.bootstrap && bootstrap.Tooltip) {
  $$('[data-bs-toggle="tooltip"], .footer-social .soc[title]').forEach(el => {
    try {
      new bootstrap.Tooltip(el);
    } catch (e) {}
  });
}


/* 15. Standalone App Dashboard Sidebar Controller */
const dashSidebar = $('#dashSidebar');
const dashSidebarToggle = $('#dashSidebarToggle');
const dashSidebarClose = $('#dashSidebarClose');
const dashBackdrop = $('#dashBackdrop');

if (dashSidebar) {
  dashSidebarToggle?.addEventListener('click', () => {
    dashSidebar.classList.add('show');
    dashBackdrop?.classList.add('show');
  });

  const closeSidebar = () => {
    dashSidebar.classList.remove('show');
    dashBackdrop?.classList.remove('show');
  };

  dashSidebarClose?.addEventListener('click', closeSidebar);
  dashBackdrop?.addEventListener('click', closeSidebar);

  $$('.dash-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      $$('.dash-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  /* Dashboard Checklist Interactivity & KPI Sync */
  const taskCheckboxes = $$('#taskList input[type="checkbox"]');
  const progBar = $('#progBar');
  const kpiTasks = $('#kpiTasks');

  if (taskCheckboxes.length > 0) {
    const savedTasks = store.get('saved_tasks', null);
    if (savedTasks && Array.isArray(savedTasks)) {
      taskCheckboxes.forEach((cb, idx) => {
        if (typeof savedTasks[idx] === 'boolean') {
          cb.checked = savedTasks[idx];
          const badge = cb.closest('label')?.querySelector('.badge-gold, .badge');
          if (badge) {
            badge.className = cb.checked ? 'badge-gold small' : 'badge bg-secondary small';
            badge.textContent = cb.checked ? 'Done' : 'Pending';
          }
        }
      });
    }

    const updateChecklistStats = () => {
      const total = taskCheckboxes.length;
      const done = taskCheckboxes.filter(cb => cb.checked).length;
      const pct = Math.round((done / total) * 100);
      if (progBar) progBar.style.width = `${pct}%`;
      if (kpiTasks) kpiTasks.textContent = `${done} / ${total}`;
      const taskStates = taskCheckboxes.map(cb => cb.checked);
      store.set('saved_tasks', taskStates);
    };

    taskCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const badge = cb.closest('label')?.querySelector('.badge-gold, .badge');
        if (badge) {
          badge.className = cb.checked ? 'badge-gold small' : 'badge bg-secondary small';
          badge.textContent = cb.checked ? 'Done' : 'Pending';
        }
        updateChecklistStats();
      });
    });

    updateChecklistStats();
  }
}
