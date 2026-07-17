/* ============================================================
   EXPENSE & BUDGET VISUALIZER  —  app.js
   Vanilla JS · localStorage · Chart.js
   ============================================================ */
'use strict';

// ── Storage keys ────────────────────────────────────────────
const KEY_TX    = 'evb_transactions';
const KEY_LIMIT = 'evb_limit';
const KEY_THEME = 'evb_theme';
const KEY_CATS  = 'evb_custom_cats';

// ── Chart colours (one per category slot) ───────────────────
const CAT_COLORS = ['#4caf50','#2196f3','#ff9800','#f44336','#9c27b0','#00bcd4','#ff5722','#8bc34a'];

// ── Category icons ───────────────────────────────────────────
const CAT_ICON = { Food:'🍔', Transport:'🚌', Fun:'🎉', Income:'💵' };
function iconFor(cat) { return CAT_ICON[cat] || '📦'; }

// ── Base categories ──────────────────────────────────────────
const BASE_CATS = ['Food', 'Transport', 'Fun'];

// ── State ────────────────────────────────────────────────────
let transactions    = [];
let customCats      = [];
let spendingLimit   = 0;
let expenseChart    = null;

// ── DOM ──────────────────────────────────────────────────────
const form            = document.getElementById('transaction-form');
const nameInput       = document.getElementById('item-name');
const amountInput     = document.getElementById('amount');
const typeSelect      = document.getElementById('type');
const catSelect       = document.getElementById('category');
const customCatGroup  = document.getElementById('custom-cat-group');
const customCatInput  = document.getElementById('custom-category');
const limitInput      = document.getElementById('spending-limit');
const sortSelect      = document.getElementById('sort-select');
const txList          = document.getElementById('transaction-list');
const listEmpty       = document.getElementById('list-empty');
const chartEmpty      = document.getElementById('chart-empty');
const balanceEl       = document.getElementById('total-balance');
const limitWarning    = document.getElementById('limit-warning');
const themeBtn        = document.getElementById('theme-toggle');
const nameError       = document.getElementById('name-error');
const amountError     = document.getElementById('amount-error');

// modal
const modalOverlay  = document.getElementById('modal-overlay');
const modal         = document.getElementById('add-cat-modal');
const modalInput    = document.getElementById('modal-cat-input');
const modalCancel   = document.getElementById('modal-cancel');
const modalConfirm  = document.getElementById('modal-confirm');

// ── Boot ─────────────────────────────────────────────────────
(function init() {
  transactions  = JSON.parse(localStorage.getItem(KEY_TX)    || '[]');
  customCats    = JSON.parse(localStorage.getItem(KEY_CATS)   || '[]');
  spendingLimit = parseFloat(localStorage.getItem(KEY_LIMIT)  || '0');

  applyTheme(localStorage.getItem(KEY_THEME) || 'light');
  buildCategoryOptions();

  if (spendingLimit > 0) limitInput.value = spendingLimit;

  render();
})();

// ── Theme ────────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeBtn.textContent = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem(KEY_THEME, t);
  if (expenseChart) refreshChartColors();
}

themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ── Category options ─────────────────────────────────────────
function buildCategoryOptions() {
  const prev = catSelect.value;

  // Remove everything after the 3 base options
  while (catSelect.options.length > BASE_CATS.length) catSelect.remove(BASE_CATS.length);

  // Add custom categories
  customCats.forEach(c => catSelect.add(new Option(c, c)));

  // Sentinel
  catSelect.add(new Option('+ Add custom category…', '__add__'));

  // Restore selection if still valid
  const vals = [...catSelect.options].map(o => o.value);
  catSelect.value = vals.includes(prev) ? prev : BASE_CATS[0];
}

catSelect.addEventListener('change', () => {
  if (catSelect.value === '__add__') openModal();
});

// ── Form submit ──────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const cat = catSelect.value;
  if (cat === '__add__') { openModal(); return; }

  // Update limit if changed
  const lv = parseFloat(limitInput.value);
  if (!isNaN(lv) && lv >= 0) {
    spendingLimit = lv;
    localStorage.setItem(KEY_LIMIT, String(lv));
  }

  const tx = {
    id:       Date.now(),
    name:     nameInput.value.trim(),
    amount:   parseFloat(parseFloat(amountInput.value).toFixed(2)),
    type:     typeSelect.value,          // 'expense' | 'income'
    category: cat,
    date:     new Date().toISOString(),
  };

  transactions.unshift(tx);
  localStorage.setItem(KEY_TX, JSON.stringify(transactions));
  render();
  form.reset();
  buildCategoryOptions();
});

// ── Validation ───────────────────────────────────────────────
function validate() {
  nameError.textContent   = '';
  amountError.textContent = '';
  let ok = true;

  if (!nameInput.value.trim()) {
    nameError.textContent = 'Item name is required.';
    nameInput.focus();
    ok = false;
  }

  const a = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(a) || a <= 0) {
    amountError.textContent = 'Enter a valid amount greater than 0.';
    if (ok) amountInput.focus();
    ok = false;
  }

  return ok;
}

// ── Delete ───────────────────────────────────────────────────
txList.addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  transactions = transactions.filter(t => t.id !== parseInt(btn.dataset.id, 10));
  localStorage.setItem(KEY_TX, JSON.stringify(transactions));
  render();
});

// ── Sort ─────────────────────────────────────────────────────
sortSelect.addEventListener('change', renderList);

function sorted() {
  const arr = [...transactions];
  switch (sortSelect.value) {
    case 'date-asc':     return arr.sort((a,b) => new Date(a.date) - new Date(b.date));
    case 'date-desc':    return arr.sort((a,b) => new Date(b.date) - new Date(a.date));
    case 'amount-desc':  return arr.sort((a,b) => b.amount - a.amount);
    case 'amount-asc':   return arr.sort((a,b) => a.amount - b.amount);
    case 'category':     return arr.sort((a,b) => a.category.localeCompare(b.category));
    default:             return arr;
  }
}

// ── Totals ───────────────────────────────────────────────────
function totals() {
  let inc = 0, exp = 0;
  transactions.forEach(t => t.type === 'income' ? (inc += t.amount) : (exp += t.amount));
  return { inc, exp, bal: inc - exp };
}

// ── Render (master) ──────────────────────────────────────────
function render() {
  renderBalance();
  renderList();
  renderChart();
  renderMonthlySummary();
}

// ── Render balance ───────────────────────────────────────────
function renderBalance() {
  const { bal, exp } = totals();
  balanceEl.textContent = fmt(bal);

  if (spendingLimit > 0 && exp > spendingLimit) {
    limitWarning.textContent =
      `⚠️ Spending limit exceeded! You've spent ${fmt(exp)} of your ${fmt(spendingLimit)} limit.`;
    limitWarning.classList.remove('hidden');
  } else {
    limitWarning.classList.add('hidden');
  }
}

// ── Render list ──────────────────────────────────────────────
function renderList() {
  const list = sorted();

  if (list.length === 0) {
    txList.innerHTML = '';
    listEmpty.classList.remove('hidden');
    return;
  }
  listEmpty.classList.add('hidden');

  const { exp } = totals();
  const isOver  = spendingLimit > 0 && exp > spendingLimit;

  txList.innerHTML = list.map(t => {
    const isIncome  = t.type === 'income';
    const amtClass  = isIncome ? 'income-amount' : (isOver ? 'over-limit-amount' : 'expense-amount');
    const sign      = isIncome ? '+' : '-';
    const overBadge = (!isIncome && isOver) ? '<span class="over-limit-badge">OVER LIMIT</span>' : '';
    const dateStr   = new Date(t.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});

    return `
      <li class="transaction-item">
        <div class="item-info">
          <div class="item-name">${esc(t.name)}</div>
          <div class="item-amount ${amtClass}">${sign}${fmt(t.amount)}</div>
          <div>
            <span class="item-category-badge">${esc(t.category)}</span>
            <span class="item-date">${dateStr}</span>
            ${overBadge}
          </div>
        </div>
        <button class="delete-btn" data-id="${t.id}" aria-label="Delete ${esc(t.name)}">Delete</button>
      </li>`;
  }).join('');
}

// ── Render chart ─────────────────────────────────────────────
function renderChart() {
  const bycat = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => { bycat[t.category] = (bycat[t.category] || 0) + t.amount; });

  const labels = Object.keys(bycat);
  const values = Object.values(bycat);

  if (labels.length === 0) {
    chartEmpty.classList.remove('hidden');
    if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
    return;
  }
  chartEmpty.classList.add('hidden');

  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors  = labels.map((_,i) => CAT_COLORS[i % CAT_COLORS.length]);
  const ctx     = document.getElementById('expense-chart').getContext('2d');
  const txtColor = isDark ? '#e0e0e0' : '#1a1a1a';

  if (expenseChart) {
    expenseChart.data.labels                       = labels;
    expenseChart.data.datasets[0].data             = values;
    expenseChart.data.datasets[0].backgroundColor  = colors;
    expenseChart.data.datasets[0].borderColor      = isDark ? '#1e1e1e' : '#fff';
    expenseChart.options.plugins.legend.labels.color = txtColor;
    expenseChart.update();
    return;
  }

  expenseChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     isDark ? '#1e1e1e' : '#fff',
        borderWidth:     2,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:         txtColor,
            font:          { size: 12 },
            padding:       14,
            usePointStyle: true,
            pointStyle:    'circle',
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const sum = ctx.dataset.data.reduce((a,b) => a+b, 0);
              const pct = ((ctx.parsed / sum) * 100).toFixed(1);
              return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function refreshChartColors() {
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const txtColor = isDark ? '#e0e0e0' : '#1a1a1a';
  expenseChart.data.datasets[0].borderColor = isDark ? '#1e1e1e' : '#fff';
  expenseChart.options.plugins.legend.labels.color = txtColor;
  expenseChart.update();
}

// ── Modal ────────────────────────────────────────────────────
function openModal() {
  modalInput.value = '';
  modal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
  modalInput.focus();
  // Reset select so it doesn't stay on sentinel
  catSelect.value = BASE_CATS[0];
}

function closeModal() {
  modal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

function confirmModal() {
  const name = modalInput.value.trim();
  if (!name) { modalInput.focus(); return; }
  if (!customCats.includes(name) && !BASE_CATS.includes(name)) {
    customCats.push(name);
    localStorage.setItem(KEY_CATS, JSON.stringify(customCats));
  }
  buildCategoryOptions();
  catSelect.value = name;
  closeModal();
}

modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', confirmModal);
modalInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  confirmModal();
  if (e.key === 'Escape') closeModal();
});

// Limit input — live update on blur
limitInput.addEventListener('change', () => {
  const v = parseFloat(limitInput.value);
  spendingLimit = (!isNaN(v) && v >= 0) ? v : 0;
  localStorage.setItem(KEY_LIMIT, String(spendingLimit));
  renderBalance();
  renderList();
});

// ── Render monthly summary ────────────────────────────────────
function renderMonthlySummary() {
  const body      = document.getElementById('monthly-summary-body');
  const emptyMsg  = document.getElementById('monthly-empty');

  if (transactions.length === 0) {
    body.innerHTML = '<p class="empty-msg" id="monthly-empty">No transactions yet.</p>';
    return;
  }

  // Group by "YYYY-MM"
  const map = {};
  transactions.forEach(t => {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { inc: 0, exp: 0 };
    t.type === 'income' ? (map[key].inc += t.amount) : (map[key].exp += t.amount);
  });

  // Sort months newest first
  const months = Object.keys(map).sort((a, b) => b.localeCompare(a));

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  const rows = months.map(key => {
    const [year, mon] = key.split('-');
    const label  = `${MONTH_NAMES[parseInt(mon, 10) - 1]} ${year}`;
    const { inc, exp } = map[key];
    const remaining = inc - exp;
    const isOver    = exp > inc;

    return `
      <div class="month-block">
        <div class="month-label">${label}</div>
        <table class="summary-table">
          <tr>
            <td class="summary-type">Income</td>
            <td class="summary-amount income-amount">+${fmt(inc)}</td>
          </tr>
          <tr>
            <td class="summary-type">Expenses</td>
            <td class="summary-amount expense-amount">-${fmt(exp)}</td>
          </tr>
          <tr class="summary-divider-row">
            <td colspan="2"><hr class="summary-divider"/></td>
          </tr>
          <tr>
            <td class="summary-type summary-remaining-label">Remaining</td>
            <td class="summary-amount ${remaining >= 0 ? 'income-amount' : 'expense-amount'}">${remaining >= 0 ? '+' : '-'}${fmt(Math.abs(remaining))}</td>
          </tr>
        </table>
        ${isOver
          ? '<p class="overbuy-warning">⚠️ Stop overbuying!</p>'
          : ''}
      </div>`;
  }).join('');

  body.innerHTML = rows;
}

// ── Helpers ──────────────────────────────────────────────────
function fmt(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
