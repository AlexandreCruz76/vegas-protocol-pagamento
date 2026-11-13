// ==========================================================================
// Vegas Protocol — Caixa
// Simulated cashier: Pix deposit (BRL → TKN) and TKN withdrawal (→ BRL).
// No real payment rail is contacted. All operations are local session state.
// ==========================================================================

'use strict';

const RATE = 0.10;             // 1 TKN = R$ 0,10
const FEE_RATE = 0.02;         // 2% on withdrawal
const MIN_DEPOSIT = 10;        // BRL
const MAX_DEPOSIT = 20000;     // BRL
const MIN_WITHDRAW = 50;       // TKN
const PIX_TTL = 15 * 60 * 1000;

const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (value, digits = 2) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
}).format(Number.isFinite(value) ? value : 0);
const fmtBRL = (value) => `R$\u00A0${fmtNum(value)}`;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

let serialSeq = 48216;
const nextSerial = () => `VP-2026-${String(serialSeq++).padStart(6, '0')}`;
const serialDigits = (serial) => String(serial).split('-').pop();

const state = {
  balanceTkn: 8450,
  activeTab: 'deposit',
  filter: 'all',
  deposit: {
    stage: 'form',
    serial: '',
    brl: 250,
    tkn: 0,
    code: '',
    expiresAt: 0,
    expired: false
  },
  withdraw: {
    stage: 'form',
    serial: '',
    tkn: 2000,
    keyType: 'cpf',
    key: '',
    gross: 200,
    fee: 4,
    net: 196,
    doneAt: null
  },
  history: [
    {
      serial: 'VP-2026-048196',
      type: 'deposit',
      date: '13/11/2026 · 11:04',
      tkn: 1500,
      brl: 150,
      fee: 0,
      net: 150,
      status: 'paid'
    },
    {
      serial: 'VP-2026-048171',
      type: 'withdraw',
      date: '12/11/2026 · 22:38',
      tkn: 3200,
      brl: 320,
      fee: 6.4,
      net: 313.6,
      status: 'paid'
    },
    {
      serial: 'VP-2026-048143',
      type: 'deposit',
      date: '12/11/2026 · 19:12',
      tkn: 2500,
      brl: 250,
      fee: 0,
      net: 250,
      status: 'expired'
    },
    {
      serial: 'VP-2026-048102',
      type: 'deposit',
      date: '11/11/2026 · 16:47',
      tkn: 5000,
      brl: 500,
      fee: 0,
      net: 500,
      status: 'paid'
    }
  ]
};

state.deposit.serial = nextSerial();
state.withdraw.serial = nextSerial();

const el = {
  balanceTkn: $('#balance-tkn'),
  balanceBrl: $('#balance-brl'),
  sideBalanceTkn: $('#side-balance-tkn'),
  sideBalanceBrl: $('#side-balance-brl'),
  wdAvailable: $('#wd-available'),
  wdAvailableBrl: $('#wd-available-brl'),
  clock: $('#mesa-clock'),

  depAmount: $('#dep-amount'),
  depError: $('#dep-error'),
  depSumSend: $('#dep-sum-send'),
  depSumTkn: $('#dep-sum-tkn'),
  btnGenerate: $('#btn-generate'),

  depViews: { form: $('#dep-view-form'), pix: $('#dep-view-pix'), done: $('#dep-view-done') },
  pixBrl: $('#pix-brl'),
  pixTkn: $('#pix-tkn'),
  pixQr: $('#pix-qr'),
  pixCode: $('#pix-code'),
  pixCopy: $('#pix-copy'),
  pixCountdown: $('#pix-countdown'),
  pixExpireBar: $('#pix-expire-bar'),
  pixStamp: $('#pix-stamp'),
  pixExpired: $('#pix-expired'),
  pixSumSend: $('#pix-sum-send'),
  pixSumTkn: $('#pix-sum-tkn'),
  btnSimulate: $('#btn-simulate'),
  btnCancelPix: $('#btn-cancel-pix'),
  doneSerial: $('#done-serial'),
  doneSerial2: $('#done-serial-2'),
  doneTkn: $('#done-tkn'),
  doneBrl: $('#done-brl'),
  donePaid: $('#done-paid'),
  doneDate: $('#done-date'),
  doneId: $('#done-id'),
  doneBalance: $('#done-balance'),
  btnDoneNew: $('#btn-done-new'),
  btnDoneWithdraw: $('#btn-done-withdraw'),

  wdAmount: $('#wd-amount'),
  wdBrlMirror: $('#wd-brl-mirror'),
  wdKeyType: $('#wd-key-type'),
  wdKey: $('#wd-key'),
  wdKeyHelp: $('#wd-key-help'),
  wdErrorAmount: $('#wd-amount-error'),
  wdErrorKey: $('#wd-key-error'),
  wdSerial: $('#wd-serial'),
  wdSumTkn: $('#wd-sum-tkn'),
  wdSumGross: $('#wd-sum-gross'),
  wdSumFee: $('#wd-sum-fee'),
  wdSumNet: $('#wd-sum-net'),
  btnWithdraw: $('#btn-withdraw'),
  wdViews: { form: $('#wd-view-form'), processing: $('#wd-view-processing'), done: $('#wd-view-done') },

  procSerial: $('#proc-serial'),
  procTime: $('#proc-time'),
  procTkn: $('#proc-tkn'),
  procNet: $('#proc-net'),
  procKey: $('#proc-key'),
  procFee: $('#proc-fee'),
  wdTimeline: $('#wd-timeline'),

  wdDoneSerial: $('#wd-done-serial'),
  wdDoneSerial2: $('#wd-done-serial-2'),
  wdDoneNet: $('#wd-done-net'),
  wdDoneTkn: $('#wd-done-tkn'),
  wdDoneKey: $('#wd-done-key'),
  wdDoneFee: $('#wd-done-fee'),
  wdDoneDate: $('#wd-done-date'),
  wdDoneId: $('#wd-done-id'),
  wdDoneBalance: $('#wd-done-balance'),
  btnWdAgain: $('#btn-wd-again'),
  btnWdHistory: $('#btn-wd-history'),

  dialog: $('#withdraw-dialog'),
  dialogTkn: $('#dialog-tkn'),
  dialogGross: $('#dialog-gross'),
  dialogFee: $('#dialog-fee'),
  dialogNet: $('#dialog-net'),
  dialogKey: $('#dialog-key'),
  dialogBalance: $('#dialog-balance'),

  historyBody: $('#history-body'),
  historyEmpty: $('#history-empty'),
  historyCount: $('#history-count'),
  miniLedger: $('#mini-ledger'),
  toast: $('#toast'),
  toastText: $('#toast-text'),
  mobileAction: $('#mobile-action'),
  mobileActionLabel: $('#mobile-action-label'),
  mobileActionValue: $('#mobile-action-value'),
  mobileActionSub: $('#mobile-action-sub'),
  mobileActionBtn: $('#mobile-action-btn')
};

let pixTimer = null;
let toastTimer = null;
let withdrawTimers = [];
let lastBalance = state.balanceTkn;
let mobileActionHandler = null;

/* ------------------------------------------------------------- helpers -- */

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  let value = String(raw).trim().replace(/[^\d.,-]/g, '');
  if (!value) return NaN;
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  return parseFloat(value);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function showToast(message, duration = 3200) {
  clearTimeout(toastTimer);
  el.toastText.textContent = message;
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('is-visible'));
  toastTimer = setTimeout(() => {
    el.toast.classList.remove('is-visible');
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 260);
  }, duration);
}

function updateMobileAction() {
  let config = null;

  if (state.activeTab === 'deposit' && state.deposit.stage === 'form') {
    const brl = readDepositBrl();
    const safe = Number.isFinite(brl) && brl > 0 ? brl : 0;
    config = {
      label: 'Você recebe',
      value: `${fmtNum(safe / RATE)} TKN`,
      sub: fmtBRL(safe),
      button: 'Gerar QR Pix',
      action: generatePix
    };
  } else if (state.activeTab === 'deposit' && state.deposit.stage === 'pix' && !state.deposit.expired) {
    config = {
      label: 'Ambiente de demonstração',
      value: 'Aguardando Pix',
      sub: fmtBRL(state.deposit.brl),
      button: 'Simular pagamento',
      action: () => el.btnSimulate.click()
    };
  } else if (state.activeTab === 'withdraw' && state.withdraw.stage === 'form') {
    const tkn = readWithdrawTkn();
    const safe = Number.isFinite(tkn) && tkn > 0 ? tkn : 0;
    const net = safe * RATE * (1 - FEE_RATE);
    config = {
      label: 'Você recebe',
      value: fmtBRL(net),
      sub: `${fmtNum(safe)} TKN · taxa 2%`,
      button: 'Solicitar saque',
      action: () => el.btnWithdraw.click()
    };
  }

  if (!config) {
    el.mobileAction.hidden = true;
    document.body.classList.remove('has-mobile-action');
    mobileActionHandler = null;
    return;
  }

  el.mobileActionLabel.textContent = config.label;
  el.mobileActionValue.textContent = config.value;
  el.mobileActionSub.textContent = config.sub;
  el.mobileActionBtn.textContent = config.button;
  mobileActionHandler = config.action;
  el.mobileAction.hidden = false;
  document.body.classList.add('has-mobile-action');
}

function setFieldError(input, node, message) {
  if (message) {
    node.textContent = message;
    node.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  } else {
    node.textContent = '';
    node.hidden = true;
    if (input) input.removeAttribute('aria-invalid');
  }
}

function focusPanelTop(panel) {
  if (window.innerWidth <= 860) {
    const top = panel.getBoundingClientRect().top + window.scrollY - 78;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

function maskKey(type, key) {
  if (type === 'cpf') {
    const d = key.replace(/\D/g, '');
    return `CPF · ***.***.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  if (type === 'phone') {
    const d = key.replace(/\D/g, '');
    return `Telefone · (${d.slice(0, 2)}) *****-${d.slice(-4)}`;
  }
  if (type === 'email') {
    const [user, domain] = key.split('@');
    if (!domain) return `E-mail · ${key}`;
    return `E-mail · ${user.slice(0, 2)}***@${domain}`;
  }
  const clean = key.replace(/\s/g, '');
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

function keyPlaceholder(type) {
  return {
    cpf: '000.000.000-00',
    phone: '(11) 90000-0000',
    email: 'voce@exemplo.com',
    random: 'Cole a chave aleatória (32 caracteres)'
  }[type];
}

function isValidCpf(value) {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function isValidPhone(value) {
  const d = value.replace(/\D/g, '');
  return (d.length === 10 || d.length === 11) && !/^0{2}/.test(d) && !/^(\d)\1+$/.test(d);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidRandomKey(value) {
  const clean = value.trim().replace(/[^a-zA-Z0-9-]/g, '');
  return clean.length >= 32;
}

function validateKey(type, value) {
  if (type === 'cpf') return isValidCpf(value) ? '' : 'Informe um CPF válido com 11 dígitos.';
  if (type === 'phone') return isValidPhone(value) ? '' : 'Informe um telefone com DDD, por exemplo (11) 90000-0000.';
  if (type === 'email') return isValidEmail(value) ? '' : 'Informe um e-mail válido, como voce@exemplo.com.';
  return isValidRandomKey(value) ? '' : 'Informe uma chave aleatória válida com pelo menos 32 caracteres.';
}

/* ------------------------------------------------------------ formatting -- */

function formatCpfInput(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

function formatPhoneInput(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/* --------------------------------------------------------------- balance -- */

function countTo(node, from, to, formatter) {
  if (reducedMotion || from === to) {
    node.textContent = formatter(to);
    return;
  }
  const start = performance.now();
  const duration = 520;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = formatter(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderBalance(animate = false) {
  const tkn = state.balanceTkn;
  const brl = tkn * RATE;
  if (animate) {
    countTo(el.balanceTkn, lastBalance, tkn, (v) => fmtNum(v));
    countTo(el.sideBalanceTkn, lastBalance, tkn, (v) => fmtNum(v));
  } else {
    el.balanceTkn.textContent = fmtNum(tkn);
    el.sideBalanceTkn.textContent = fmtNum(tkn);
  }
  el.balanceBrl.textContent = fmtBRL(brl);
  el.sideBalanceBrl.textContent = `≈ ${fmtBRL(brl)}`;
  el.wdAvailable.textContent = fmtNum(tkn);
  el.wdAvailableBrl.textContent = fmtBRL(brl);
  lastBalance = tkn;
}

/* ------------------------------------------------------------------ tabs -- */

function switchTab(name) {
  if (!['deposit', 'withdraw', 'history'].includes(name)) return;
  state.activeTab = name;

  $$('.rail-link').forEach((button) => {
    const active = button.dataset.nav === name;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  $$('.tab').forEach((tab) => {
    const active = tab.dataset.nav === name;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  ['deposit', 'withdraw', 'history'].forEach((panelName) => {
    const panel = $(`#panel-${panelName}`);
    panel.hidden = panelName !== name;
  });

  if (name === 'history') renderHistory();
  if (name === 'withdraw' && state.withdraw.stage === 'form') updateWithdrawSummary();
  updateMobileAction();
}

$$('.tab').forEach((tab) => {
  tab.addEventListener('keydown', (event) => {
    const tabs = $$('.tab');
    const index = tabs.indexOf(tab);
    let target = null;
    if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') target = tabs[0];
    if (event.key === 'End') target = tabs[tabs.length - 1];
    if (!target) return;
    event.preventDefault();
    switchTab(target.dataset.nav);
    target.focus();
  });
});

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-nav]');
  if (!trigger) return;
  event.preventDefault();
  switchTab(trigger.dataset.nav);
});

/* --------------------------------------------------------------- deposit -- */

function readDepositBrl() {
  return parseAmount(el.depAmount.value);
}

function updateDepositSummary() {
  const brl = readDepositBrl();
  const safeBrl = Number.isFinite(brl) && brl > 0 ? brl : 0;
  const tkn = safeBrl / RATE;
  el.depSumSend.textContent = fmtBRL(safeBrl);
  el.depSumTkn.textContent = fmtNum(tkn);

  const activePreset = $$('.preset[data-brl]').find((button) => Number(button.dataset.brl) === Math.round(safeBrl));
  $$('.preset[data-brl]').forEach((button) => button.classList.toggle('is-active', button === activePreset));
  updateMobileAction();
}

function validateDeposit(brl) {
  if (!Number.isFinite(brl) || brl <= 0) return 'Informe o valor que você quer depositar.';
  if (brl < MIN_DEPOSIT) return `O depósito mínimo é de ${fmtBRL(MIN_DEPOSIT)}.`;
  if (brl > MAX_DEPOSIT) return `O limite por depósito é de ${fmtBRL(MAX_DEPOSIT)} nesta mesa.`;
  return '';
}

function setDepositSerial(serial) {
  state.deposit.serial = serial;
  $$('[data-serial="deposit"]').forEach((node) => { node.textContent = serial; });
}

function showDepositStage(stage, { focus = true } = {}) {
  state.deposit.stage = stage;
  Object.entries(el.depViews).forEach(([name, view]) => { view.hidden = name !== stage; });
  const panel = $('#panel-deposit');
  if (focus) {
    panel.focus({ preventScroll: true });
    focusPanelTop(panel);
  }
  updateMobileAction();
}

el.depAmount.addEventListener('input', () => {
  setFieldError(el.depAmount, el.depError, '');
  updateDepositSummary();
});

el.depAmount.addEventListener('blur', () => {
  const brl = readDepositBrl();
  if (Number.isFinite(brl) && brl > 0) {
    el.depAmount.value = fmtNum(brl);
    state.deposit.brl = brl;
  }
});

el.depAmount.addEventListener('focus', () => el.depAmount.select());

$$('.preset[data-brl]').forEach((button) => {
  button.addEventListener('click', () => {
    const brl = Number(button.dataset.brl);
    el.depAmount.value = fmtNum(brl);
    state.deposit.brl = brl;
    setFieldError(el.depAmount, el.depError, '');
    updateDepositSummary();
    $$('.preset[data-brl]').forEach((item) => item.classList.toggle('is-active', item === button));
  });
});

function buildPixPayload(amount, txid) {
  const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;
  const crc16 = (text) => {
    let crc = 0xffff;
    for (let i = 0; i < text.length; i += 1) {
      crc ^= text.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };
  const merchantAccount = field('26', field('00', 'br.gov.bcb.pix') + field('01', 'tesouraria@vegasprotocol.demo'));
  const payload = [
    field('00', '01'),
    merchantAccount,
    field('52', '0000'),
    field('53', '986'),
    field('54', amount.toFixed(2)),
    field('58', 'BR'),
    field('59', 'VEGAS PROTOCOL'),
    field('60', 'SAO PAULO'),
    field('62', field('05', txid.slice(0, 25)))
  ].join('') + '6304';
  return payload + crc16(payload);
}

function renderQr(payload) {
  el.pixQr.innerHTML = '';
  if (typeof window.qrcode !== 'function') {
    el.pixQr.textContent = 'QR indisponível neste navegador. Use o código Pix.';
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  el.pixQr.innerHTML = qr.createSvgTag({
    cellSize: 4,
    margin: 8,
    scalable: true,
    alt: { text: 'QR Code Pix da cobrança Vegas Protocol' }
  });
}

function generatePix() {
  const brl = readDepositBrl();
  const error = validateDeposit(brl);
  if (error) {
    setFieldError(el.depAmount, el.depError, error);
    el.depAmount.focus();
    return;
  }

  clearInterval(pixTimer);
  state.deposit.brl = brl;
  state.deposit.tkn = brl / RATE;
  state.deposit.code = buildPixPayload(brl, `VP${serialDigits(state.deposit.serial)}`);
  state.deposit.expired = false;

  const label = el.btnGenerate.querySelector('span');
  const original = label.textContent;
  el.btnGenerate.classList.add('is-loading');
  el.btnGenerate.setAttribute('aria-busy', 'true');
  label.textContent = 'Emitindo cobrança…';

  setTimeout(() => {
    el.btnGenerate.classList.remove('is-loading');
    el.btnGenerate.removeAttribute('aria-busy');
    label.textContent = original;

    el.pixBrl.textContent = fmtBRL(brl);
    el.pixTkn.textContent = fmtNum(state.deposit.tkn);
    el.pixSumSend.textContent = fmtBRL(brl);
    el.pixSumTkn.textContent = fmtNum(state.deposit.tkn);
    el.pixCode.textContent = state.deposit.code;
    renderQr(state.deposit.code);

    el.pixStamp.textContent = 'Aguardando';
    el.pixStamp.dataset.state = 'pending';
    el.pixExpired.hidden = true;
    el.btnSimulate.disabled = false;
    el.btnSimulate.textContent = 'Simular pagamento aprovado';
    el.pixCopy.querySelector('span').textContent = 'Copiar código';

    startPixCountdown();
    showDepositStage('pix');
    showToast('Cobrança Pix emitida. Válida por 15 minutos.');
  }, 620);
}

function startPixCountdown() {
  clearInterval(pixTimer);
  state.deposit.expiresAt = Date.now() + PIX_TTL;
  const tick = () => {
    const left = state.deposit.expiresAt - Date.now();
    if (left <= 0) {
      clearInterval(pixTimer);
      state.deposit.expired = true;
      el.pixCountdown.textContent = '00:00';
      el.pixExpireBar.style.transform = 'scaleX(0)';
      el.pixStamp.textContent = 'Expirado';
      el.pixStamp.dataset.state = 'failed';
      el.pixExpired.hidden = false;
      el.btnSimulate.disabled = true;
      el.btnSimulate.textContent = 'Cobrança expirada';
      updateMobileAction();
      return;
    }
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    el.pixCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    el.pixExpireBar.style.transform = `scaleX(${left / PIX_TTL})`;
  };
  tick();
  pixTimer = setInterval(tick, 1000);
}

el.btnGenerate.addEventListener('click', generatePix);

el.pixCopy.addEventListener('click', async () => {
  if (!state.deposit.code) return;
  const copied = await copyText(state.deposit.code);
  el.pixCopy.querySelector('span').textContent = copied ? 'Copiado' : 'Selecione o código';
  showToast(copied ? 'Código Pix copiado para a área de transferência.' : 'Não foi possível copiar automaticamente. Selecione o código.');
  setTimeout(() => { el.pixCopy.querySelector('span').textContent = 'Copiar código'; }, 2400);
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }
}

el.btnSimulate.addEventListener('click', () => {
  if (state.deposit.expired || state.deposit.stage !== 'pix') return;
  clearInterval(pixTimer);
  state.deposit.expired = false;
  el.btnSimulate.disabled = true;
  el.btnSimulate.textContent = 'Conciliando pagamento…';
  el.pixStamp.textContent = 'Conciliando';
  el.pixStamp.dataset.state = 'pending';
  el.mobileAction.hidden = true;
  document.body.classList.remove('has-mobile-action');

  setTimeout(() => {
    const deposit = state.deposit;
    state.balanceTkn += deposit.tkn;
    renderBalance(true);

    const entry = {
      serial: deposit.serial,
      type: 'deposit',
      date: nowStamp(),
      tkn: deposit.tkn,
      brl: deposit.brl,
      fee: 0,
      net: deposit.brl,
      status: 'paid'
    };
    state.history.unshift(entry);

    el.doneSerial.textContent = deposit.serial;
    el.doneSerial2.textContent = deposit.serial;
    el.doneTkn.textContent = fmtNum(deposit.tkn);
    el.doneBrl.textContent = `${fmtBRL(deposit.brl)} via Pix`;
    el.donePaid.textContent = fmtBRL(deposit.brl);
    el.doneDate.textContent = entry.date;
    el.doneId.textContent = `E${serialDigits(deposit.serial)}`;
    el.doneBalance.textContent = `${fmtNum(state.balanceTkn)} TKN`;

    showDepositStage('done');
    renderHistory();
    renderMiniLedger();
    showToast(`Depósito liquidado. ${fmtNum(deposit.tkn)} TKN creditados.`);
  }, 1100);
});

el.btnCancelPix.addEventListener('click', () => {
  clearInterval(pixTimer);
  setDepositSerial(nextSerial());
  state.deposit.code = '';
  state.deposit.expired = false;
  showDepositStage('form');
  showToast('Cobrança cancelada. Nenhum valor foi cobrado.');
});

el.btnDoneNew.addEventListener('click', resetDeposit);
el.btnDoneWithdraw.addEventListener('click', () => switchTab('withdraw'));

function resetDeposit() {
  clearInterval(pixTimer);
  setDepositSerial(nextSerial());
  state.deposit.stage = 'form';
  state.deposit.code = '';
  state.deposit.expired = false;
  el.depAmount.value = fmtNum(state.deposit.brl);
  setFieldError(el.depAmount, el.depError, '');
  updateDepositSummary();
  showDepositStage('form');
}

/* -------------------------------------------------------------- withdraw -- */

function readWithdrawTkn() {
  return parseAmount(el.wdAmount.value);
}

function updateWithdrawSummary() {
  const tkn = readWithdrawTkn();
  const safe = Number.isFinite(tkn) && tkn > 0 ? tkn : 0;
  const gross = safe * RATE;
  const fee = gross * FEE_RATE;
  const net = gross - fee;

  state.withdraw.tkn = safe;
  state.withdraw.gross = gross;
  state.withdraw.fee = fee;
  state.withdraw.net = net;

  el.wdBrlMirror.textContent = fmtBRL(gross);
  el.wdSumTkn.textContent = fmtNum(safe);
  el.wdSumGross.textContent = fmtBRL(gross);
  el.wdSumFee.textContent = `− ${fmtBRL(fee)}`;
  el.wdSumNet.textContent = fmtBRL(net);

  const activePreset = $$('.preset[data-pct]').find((button) => {
    const pct = Number(button.dataset.pct);
    return Math.abs((state.balanceTkn * pct) / 100 - safe) < 0.05;
  });
  $$('.preset[data-pct]').forEach((button) => button.classList.toggle('is-active', button === activePreset));
  updateMobileAction();
}

function showWithdrawStage(stage) {
  state.withdraw.stage = stage;
  Object.entries(el.wdViews).forEach(([name, view]) => { view.hidden = name !== stage; });
  const panel = $('#panel-withdraw');
  panel.focus({ preventScroll: true });
  focusPanelTop(panel);
  updateMobileAction();
}

function clearWithdrawErrors() {
  setFieldError(el.wdAmount, el.wdErrorAmount, '');
  setFieldError(el.wdKey, el.wdErrorKey, '');
}

el.wdAmount.addEventListener('input', () => {
  clearWithdrawErrors();
  updateWithdrawSummary();
});

el.wdAmount.addEventListener('focus', () => el.wdAmount.select());

el.wdAmount.addEventListener('blur', () => {
  const tkn = readWithdrawTkn();
  if (Number.isFinite(tkn) && tkn > 0) {
    el.wdAmount.value = fmtNum(tkn);
    updateWithdrawSummary();
  }
});

$$('.preset[data-pct]').forEach((button) => {
  button.addEventListener('click', () => {
    const pct = Number(button.dataset.pct);
    const value = Math.floor((state.balanceTkn * pct) / 100 * 100) / 100;
    el.wdAmount.value = fmtNum(value);
    clearWithdrawErrors();
    updateWithdrawSummary();
  });
});

el.wdKeyType.addEventListener('change', () => {
  const type = el.wdKeyType.value;
  el.wdKey.value = '';
  el.wdKey.type = 'text';
  el.wdKey.inputMode = type === 'email' ? 'email' : (type === 'random' ? 'text' : 'numeric');
  el.wdKey.placeholder = keyPlaceholder(type);
  el.wdKeyHelp.textContent = type === 'cpf'
    ? 'A chave precisa estar no seu nome. O Pix sai após a análise da mesa.'
    : 'Confira a chave. O Pix será enviado para este destino após a análise.';
  setFieldError(el.wdKey, el.wdErrorKey, '');
  updateWithdrawSummary();
});

el.wdKey.addEventListener('input', () => {
  const type = el.wdKeyType.value;
  if (type === 'cpf') el.wdKey.value = formatCpfInput(el.wdKey.value);
  if (type === 'phone') el.wdKey.value = formatPhoneInput(el.wdKey.value);
  setFieldError(el.wdKey, el.wdErrorKey, '');
});

function validateWithdraw() {
  const tkn = readWithdrawTkn();
  if (!Number.isFinite(tkn) || tkn <= 0) {
    return { field: el.wdAmount, error: el.wdErrorAmount, message: 'Informe o valor que você quer sacar.' };
  }
  if (tkn < MIN_WITHDRAW) {
    return { field: el.wdAmount, error: el.wdErrorAmount, message: `O saque mínimo é de ${fmtNum(MIN_WITHDRAW)} TKN.` };
  }
  if (tkn > state.balanceTkn) {
    return { field: el.wdAmount, error: el.wdErrorAmount, message: `Saldo insuficiente. Você tem ${fmtNum(state.balanceTkn)} TKN disponíveis.` };
  }
  const keyError = validateKey(el.wdKeyType.value, el.wdKey.value);
  if (keyError) return { field: el.wdKey, error: el.wdErrorKey, message: keyError };
  return null;
}

function fillWithdrawDialog() {
  const type = el.wdKeyType.value;
  const masked = maskKey(type, el.wdKey.value);
  el.dialogTkn.textContent = `${fmtNum(state.withdraw.tkn)} TKN`;
  el.dialogGross.textContent = fmtBRL(state.withdraw.gross);
  el.dialogFee.textContent = `− ${fmtBRL(state.withdraw.fee)}`;
  el.dialogNet.textContent = fmtBRL(state.withdraw.net);
  el.dialogKey.textContent = masked;
  el.dialogBalance.textContent = `${fmtNum(state.balanceTkn - state.withdraw.tkn)} TKN`;
}

el.btnWithdraw.addEventListener('click', () => {
  const problem = validateWithdraw();
  if (problem) {
    setFieldError(problem.field, problem.error, problem.message);
    problem.field.focus({ preventScroll: true });
    problem.error.scrollIntoView({
      block: window.innerWidth <= 860 ? 'center' : 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
    return;
  }
  updateWithdrawSummary();
  fillWithdrawDialog();
  el.dialog.showModal();
});

$('#dialog-close').addEventListener('click', () => el.dialog.close());
$('#dialog-back').addEventListener('click', () => el.dialog.close());
el.dialog.addEventListener('click', (event) => {
  if (event.target === el.dialog) el.dialog.close();
});

el.dialog.addEventListener('close', () => {
  if (!el.dialog.returnValue) el.btnWithdraw.focus({ preventScroll: true });
});

$('#dialog-confirm').addEventListener('click', () => {
  el.dialog.returnValue = 'confirm';
  el.dialog.close();
  requestWithdrawal();
});

function requestWithdrawal() {
  const serial = state.withdraw.serial;
  const tkn = state.withdraw.tkn;
  const gross = state.withdraw.gross;
  const fee = state.withdraw.fee;
  const net = state.withdraw.net;
  const type = el.wdKeyType.value;
  const masked = maskKey(type, el.wdKey.value);

  state.balanceTkn -= tkn;
  renderBalance(true);

  const entry = {
    serial,
    type: 'withdraw',
    date: nowStamp(),
    tkn,
    brl: gross,
    fee,
    net,
    status: 'pending'
  };
  state.history.unshift(entry);
  renderHistory();
  renderMiniLedger();

  el.procSerial.textContent = serial;
  el.procTime.textContent = nowTime();
  el.procTkn.textContent = fmtNum(tkn);
  el.procNet.textContent = fmtBRL(net);
  el.procKey.textContent = masked;
  el.procFee.textContent = `− ${fmtBRL(fee)}`;
  resetTimeline();
  showWithdrawStage('processing');
  showToast('Saque solicitado. A mesa está analisando a operação.');

  withdrawTimers.forEach(clearTimeout);
  withdrawTimers = [
    setTimeout(() => setTimelineStep(1), 1800),
    setTimeout(() => completeWithdrawal(entry, masked), 3900)
  ];
}

function resetTimeline() {
  $$('li', el.wdTimeline).forEach((item, index) => {
    item.classList.toggle('is-done', index === 0);
    item.classList.toggle('is-current', index === 1);
    const note = $('span:last-child', item);
    if (index === 1) note.textContent = 'Conferindo chave e saldo';
    if (index === 2) note.textContent = 'Aguardando';
  });
}

function setTimelineStep(step) {
  const items = $$('li', el.wdTimeline);
  items.forEach((item, index) => {
    item.classList.toggle('is-done', index < step);
    item.classList.toggle('is-current', index === step);
    const note = $('span:last-child', item);
    if (index === 2) note.textContent = 'Enviando para a chave Pix';
  });
}

function completeWithdrawal(entry, masked) {
  entry.status = 'paid';
  state.withdraw.doneAt = nowStamp();

  el.wdDoneSerial.textContent = entry.serial;
  el.wdDoneSerial2.textContent = entry.serial;
  el.wdDoneNet.textContent = fmtBRL(entry.net);
  el.wdDoneTkn.textContent = `${fmtNum(entry.tkn)} TKN convertidos`;
  el.wdDoneKey.textContent = masked;
  el.wdDoneFee.textContent = fmtBRL(entry.fee);
  el.wdDoneDate.textContent = state.withdraw.doneAt;
  el.wdDoneId.textContent = `S${serialDigits(entry.serial)}`;
  el.wdDoneBalance.textContent = `${fmtNum(state.balanceTkn)} TKN`;

  showWithdrawStage('done');
  renderHistory();
  renderMiniLedger();
  showToast(`Saque pago. ${fmtBRL(entry.net)} enviados via Pix.`);
}

el.btnWdAgain.addEventListener('click', resetWithdraw);
el.btnWdHistory.addEventListener('click', () => switchTab('history'));

function resetWithdraw() {
  withdrawTimers.forEach(clearTimeout);
  withdrawTimers = [];
  state.withdraw.serial = nextSerial();
  state.withdraw.stage = 'form';
  state.withdraw.key = '';
  el.wdSerial.textContent = state.withdraw.serial;
  el.wdKey.value = '';
  setFieldError(el.wdAmount, el.wdErrorAmount, '');
  setFieldError(el.wdKey, el.wdErrorKey, '');
  const suggested = Math.min(2000, state.balanceTkn);
  el.wdAmount.value = fmtNum(suggested);
  updateWithdrawSummary();
  showWithdrawStage('form');
}

/* --------------------------------------------------------------- history -- */

const STATUS_LABELS = {
  paid: 'Liquidado',
  pending: 'Em análise',
  expired: 'Expirado',
  failed: 'Falhou'
};

const STATUS_CLASSES = {
  paid: 'is-paid',
  pending: 'is-pending',
  expired: 'is-failed',
  failed: 'is-failed'
};

function operationIcon(type) {
  return type === 'deposit'
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16V7m0 0 3.5 3.5M10 7 6.5 10.5M4 4.5h12"/></svg>';
}

function renderHistory() {
  const filtered = state.history.filter((entry) => state.filter === 'all' || entry.type === state.filter);
  el.historyCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'operação' : 'operações'}`;
  el.historyEmpty.hidden = filtered.length > 0;
  el.historyBody.innerHTML = '';

  filtered.forEach((entry) => {
    const row = document.createElement('tr');
    const isDeposit = entry.type === 'deposit';
    const isVoid = entry.status === 'expired' || entry.status === 'failed';
    let value = '';
    let valueClass = isDeposit ? 'is-in' : 'is-out';

    if (isVoid) {
      value = `<span>${fmtBRL(isDeposit ? entry.brl : entry.net)}</span><span class="brl">${isDeposit ? 'não creditado' : 'não enviado'}</span>`;
      valueClass = 'is-void';
    } else if (isDeposit) {
      value = `<span>+${fmtNum(entry.tkn)} TKN</span><span class="brl">${fmtBRL(entry.brl)}</span>`;
    } else {
      value = `<span>${fmtBRL(entry.net)}</span><span class="brl">−${fmtNum(entry.tkn)} TKN</span>`;
    }

    const statusLabel = entry.status === 'paid' && !isDeposit ? 'Pago' : STATUS_LABELS[entry.status];
    row.innerHTML = `
      <td>
        <div class="op-cell">
          <span class="op-icon">${operationIcon(entry.type)}</span>
          <div>
            <strong>${isDeposit ? 'Depósito Pix' : 'Saque Pix'}</strong>
            <span>${entry.serial}</span>
          </div>
        </div>
      </td>
      <td class="date-cell">${entry.date}</td>
      <td class="value-cell ${valueClass}">${value}</td>
      <td><span class="status-pill ${STATUS_CLASSES[entry.status]}">${statusLabel}</span></td>
    `;
    el.historyBody.appendChild(row);
  });
}

$$('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    $$('.filter').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderHistory();
  });
});

function renderMiniLedger() {
  const entries = state.history.slice(0, 3);
  el.miniLedger.innerHTML = '';

  if (!entries.length) {
    el.miniLedger.innerHTML = '<li><div class="mini-op"><strong>Nenhuma operação ainda</strong><span>Seu histórico aparece aqui.</span></div></li>';
    return;
  }

  entries.forEach((entry) => {
    const isDeposit = entry.type === 'deposit';
    const isVoid = entry.status === 'expired' || entry.status === 'failed';
    const status = entry.status === 'pending'
      ? 'Em análise'
      : entry.status === 'paid'
        ? (isDeposit ? 'Liquidado' : 'Pago')
        : entry.status === 'expired'
          ? 'Expirado'
          : 'Falhou';
    const shortDate = entry.date.replace(/\/\d{4}/, '');
    const value = isVoid
      ? `<span>${isDeposit ? 'Não creditado' : 'Não enviado'}</span><span>${fmtBRL(isDeposit ? entry.brl : entry.net)}</span>`
      : isDeposit
        ? `+${fmtNum(entry.tkn)} TKN<span>${fmtBRL(entry.brl)}</span>`
        : `−${fmtNum(entry.tkn)} TKN<span>${fmtBRL(entry.net)}</span>`;
    const valueClass = isVoid ? 'is-void' : isDeposit ? 'is-in' : 'is-out';

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="mini-op">
        <strong>${isDeposit ? 'Depósito Pix' : 'Saque Pix'}</strong>
      </div>
      <div class="mini-value ${valueClass}">${value}</div>
      <span class="mini-meta">${shortDate} · ${status}</span>
    `;
    el.miniLedger.appendChild(li);
  });
}

/* ----------------------------------------------------------------- clock -- */

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function renderClock() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const label = `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())} BRT`;
  el.clock.textContent = label;
  el.clock.setAttribute('datetime', d.toISOString());
}

/* ---------------------------------------------------------------- extras -- */

el.mobileActionBtn.addEventListener('click', () => {
  if (typeof mobileActionHandler === 'function') mobileActionHandler();
});

$('#btn-support').addEventListener('click', () => {
  const serial = state.activeTab === 'withdraw'
    ? state.withdraw.serial
    : state.activeTab === 'deposit'
      ? state.deposit.serial
      : 'VP-2026-048196';
  showToast(`Atendimento simulado. Informe o borderô ${serial} no chat da mesa.`, 4200);
});

/* ------------------------------------------------------------------ init -- */

setDepositSerial(state.deposit.serial);
el.wdSerial.textContent = state.withdraw.serial;
el.wdKey.placeholder = keyPlaceholder('cpf');
el.depAmount.value = fmtNum(250);
el.wdAmount.value = fmtNum(2000);
updateDepositSummary();
updateWithdrawSummary();
renderBalance();
renderHistory();
renderMiniLedger();
renderClock();
updateMobileAction();
setInterval(renderClock, 30000);
