(function () {
  'use strict';

  /* ─── Intro animation: dismiss after 2.4 s ─── */
  const introEl = document.getElementById('intro');
  if (introEl) setTimeout(() => introEl.classList.add('hide'), 2400);

  /* ─── Supabase auth guard ─── */
  let currentUser = null;

  async function initAuth() {
    try {
      currentUser = await SupaDB.getCurrentUser();
    } catch (e) {
      /* Supabase not configured yet – run in offline/localStorage mode */
      currentUser = null;
    }
    // If no user and supabase is configured, redirect to login
    if (!currentUser && window.SupaDB && window.SupaDB.getSupabase()) {
      const sb = window.SupaDB.getSupabase();
      if (sb && sb.auth) {
        // Only redirect if real credentials are set (not placeholder)
        const url = typeof SUPABASE_URL !== 'undefined' && !SUPABASE_URL.includes('YOUR_PROJECT');
        if (url) {
          window.location.href = 'login.html';
          return;
        }
      }
    }
    // Listen for auth changes
    try {
      SupaDB.onAuthChange((user) => {
        currentUser = user;
        if (!user) {
          const url = typeof SUPABASE_URL !== 'undefined' && !SUPABASE_URL.includes('YOUR_PROJECT');
          if (url) window.location.href = 'login.html';
        }
      });
    } catch (e) { /* offline */ }
    startApp();
  }

  /* ─── Logout button ─── */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await SupaDB.signOut().catch(() => {});
      window.location.href = 'login.html';
    });
  }

  /* ═══════════════════════════════════════════════════════════
     App logic (localStorage with Supabase sync)
  ═══════════════════════════════════════════════════════════ */
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = iso(new Date());
  const fmt = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  const nights = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5) + 1;
  const overlap = (a, b, c, d) => a <= d && c <= b;

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  let items = store.get('lendloop_items', null) || JSON.parse(JSON.stringify(window.SEED_ITEMS));
  let reqs  = store.get('lendloop_requests', []);
  let role  = store.get('lendloop_role', 'renter');

  const now = new Date();
  const state = {
    cat: 'All', q: '',
    itemId: items[0].id,
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    start: null, end: null
  };
  const colors = ['#FFD60A', '#FF8A00', '#22D3EE', '#FF4F9A'];

  const itemById  = (id) => items.find((i) => i.id === id);
  const persist   = () => { store.set('lendloop_items', items); store.set('lendloop_requests', reqs); store.set('lendloop_role', role); };
  const setMsg    = (sel, text, ok) => { const el = $(sel); el.textContent = text; el.className = 'msg ' + (text ? (ok ? 'ok' : 'err') : ''); };

  /* ─── Supabase sync helpers (no-op when offline) ─── */
  async function syncItemsFromDB() {
    try {
      const { data, error } = await SupaDB.fetchItems();
      if (!error && data && data.length) { items = data.map(r => ({ id: r.id, name: r.name, cat: r.cat, desc: r.descr, price: r.price, color: r.color })); persist(); }
    } catch (e) { /* offline */ }
  }
  async function syncReqsFromDB() {
    try {
      const { data, error } = await SupaDB.fetchRequests();
      if (!error && data) { reqs = data.map(r => ({ id: r.id, itemId: r.item_id, renter: r.renter, start: r.start_date, end: r.end_date, note: r.note, status: r.status })); persist(); }
    } catch (e) { /* offline */ }
  }

  function dayStatus(itemId, d) {
    const own = reqs.filter((r) => r.itemId === itemId && d >= r.start && d <= r.end);
    if (own.some((r) => r.status === 'approved')) return 'booked';
    if (own.some((r) => r.status === 'pending'))  return 'pending';
    return '';
  }

  /* ── Feature 1: listings ── */
  function renderChips() {
    const cats = ['All'].concat([...new Set(items.map((i) => i.cat))]);
    $('#chips').innerHTML = cats.map((c) =>
      '<button type="button" class="btn' + (c === state.cat ? '' : ' alt') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'
    ).join('');
  }

  function renderItems() {
    const q = state.q.trim().toLowerCase();
    const list = items.filter((i) => (state.cat === 'All' || i.cat === state.cat) && (!q || (i.name + ' ' + (i.desc||'') + ' ' + i.cat).toLowerCase().includes(q)));
    $('#itemGrid').innerHTML = list.length ? list.map((i) => {
      const booked = reqs.some((r) => r.itemId === i.id && r.status === 'approved' && today >= r.start && today <= r.end);
      return '<article class="card"><div class="img" style="background:' + i.color + '">' + esc(i.cat) + '</div><div style="padding:18px">' +
        '<h3 style="font-size:20px">' + esc(i.name) + '</h3>' +
        '<p class="muted" style="margin:6px 0 14px;font-size:14px">' + esc(i.desc || '') + '</p>' +
        '<div class="row" style="justify-content:space-between"><b>₹' + esc(i.price) + '/day</b>' +
        '<span class="tag' + (booked ? ' red' : '') + '">' + (booked ? 'Booked today' : 'Available') + '</span></div>' +
        '<button type="button" class="btn" style="width:100%;margin-top:14px" data-book="' + esc(i.id) + '">Check dates</button>' +
        '</div></article>';
    }).join('') : '<p class="muted">No items match your search.</p>';
  }

  /* ── Feature 2: calendar ── */
  function renderCal() {
    const y = state.month.getFullYear(), m = state.month.getMonth();
    $('#calTitle').textContent = new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    let h = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => '<b>' + d + '</b>').join('') + '<span></span>'.repeat(lead);
    for (let i = 1; i <= days; i++) {
      const d = y + '-' + pad(m + 1) + '-' + pad(i);
      const st  = dayStatus(state.itemId, d);
      const sel = state.start && d >= state.start && d <= (state.end || state.start);
      const cls = ['d', st === 'booked' && 'b', st === 'pending' && 'p', sel && 's'].filter(Boolean).join(' ');
      h += '<button type="button" class="' + cls + '" data-day="' + d + '"' + (d < today || st === 'booked' ? ' disabled' : '') + ' aria-label="' + fmt(d) + (st ? ', ' + st : '') + '">' + i + '</button>';
    }
    $('#cal').innerHTML = h;
    $('#prevMonth').disabled = y * 12 + m <= now.getFullYear() * 12 + now.getMonth();
    const it = itemById(state.itemId);
    $('#calItem').textContent  = it ? it.name : '';
    $('#bookItem').value       = it ? it.name : '';
    renderSelection();
  }

  function renderSelection() {
    const { start, end } = state, it = itemById(state.itemId);
    $('#dates').value = start ? (end && end !== start ? fmt(start) + ' – ' + fmt(end) : fmt(start)) : '';
    const n = start ? nights(start, end || start) : 0;
    $('#total').textContent = n && it ? n + (n > 1 ? ' days' : ' day') + ' · estimated total ₹' + n * it.price : '';
  }

  function pickDay(d) {
    setMsg('#bookMsg', '', true);
    if (!state.start || state.end) { state.start = d; state.end = null; }
    else if (d < state.start) { state.start = d; }
    else if (reqs.some((r) => r.itemId === state.itemId && r.status === 'approved' && overlap(state.start, d, r.start, r.end))) {
      setMsg('#bookMsg', 'That range includes a booked day. Choose other dates.', false);
      state.start = d; state.end = null;
    } else { state.end = d; }
    renderCal();
  }

  /* ── Feature 3: booking request ── */
  async function submitBooking(e) {
    e.preventDefault();
    const renter = $('#renter').value.trim();
    if (!state.start) return setMsg('#bookMsg', 'Pick your dates on the calendar first.', false);
    if (renter.length < 2) return setMsg('#bookMsg', 'Please enter your name.', false);
    const req = { id: Date.now().toString(36), itemId: state.itemId, renter, start: state.start, end: state.end || state.start, note: $('#note').value.trim(), status: 'pending' };
    reqs.push(req);
    persist();
    /* sync to Supabase */
    try {
      await SupaDB.insertRequest({ id: req.id, item_id: req.itemId, renter: req.renter, start_date: req.start, end_date: req.end, note: req.note });
    } catch (e) { /* offline – local only */ }
    state.start = state.end = null;
    $('#note').value = '';
    renderAll();
    setMsg('#bookMsg', 'Request sent. The owner will approve or decline it.', true);
  }

  /* ── Feature 4: approve / decline ── */
  function renderReqs() {
    const owner = role === 'owner';
    $('#reqTitle').textContent = owner ? 'Owner dashboard' : 'My booking requests';
    $('#reqIntro').textContent = owner
      ? 'Approve or decline each request. Approved dates are blocked on the calendar.'
      : 'Track the requests you sent. Switch to Owner to approve or decline them.';
    const list = reqs.slice().reverse();
    $('#reqList').innerHTML = list.length ? list.map((r) => {
      const it  = itemById(r.itemId);
      const tag = r.status === 'approved' ? 'tag' : r.status === 'declined' ? 'tag red' : 'tag pending';
      let actions = '';
      if (r.status === 'pending') actions = owner
        ? '<div class="row"><button type="button" class="btn" data-act="approve" data-id="' + r.id + '">Approve</button><button type="button" class="btn no" data-act="decline" data-id="' + r.id + '">Decline</button></div>'
        : '<button type="button" class="btn alt" data-act="cancel" data-id="' + r.id + '">Cancel request</button>';
      return '<div class="card" style="padding:22px"><div class="row" style="justify-content:space-between"><h3 style="font-size:20px">' + esc(it ? it.name : 'Removed item') + '</h3><span class="' + tag + '">' + r.status[0].toUpperCase() + r.status.slice(1) + '</span></div>' +
        '<p class="muted" style="margin:8px 0 ' + (r.note ? '6' : '18') + 'px">' + esc(r.renter) + ' · ' + fmt(r.start) + (r.end !== r.start ? ' – ' + fmt(r.end) : '') + '</p>' +
        (r.note ? '<p style="margin:0 0 18px;font-size:14px">' + esc(r.note) + '</p>' : '') + actions + '</div>';
    }).join('') : '<p class="muted">No requests yet. Pick an item and dates above.</p>';
  }

  async function decide(id, approve) {
    const r = reqs.find((x) => x.id === id);
    if (!r) return;
    if (approve) {
      if (reqs.some((x) => x.id !== id && x.itemId === r.itemId && x.status === 'approved' && overlap(x.start, x.end, r.start, r.end)))
        return setMsg('#reqMsg', 'Cannot approve: those dates overlap an approved booking.', false);
      r.status = 'approved';
      reqs.forEach((x) => { if (x !== r && x.itemId === r.itemId && x.status === 'pending' && overlap(x.start, x.end, r.start, r.end)) x.status = 'declined'; });
    } else r.status = 'declined';
    persist();
    try { await SupaDB.updateRequestStatus(id, r.status); } catch (e) { /* offline */ }
    renderAll();
    setMsg('#reqMsg', approve ? 'Approved. Those dates are now blocked.' : 'Request declined.', true);
  }

  /* ── Roles + list an item ── */
  function renderRole() {
    $('#roleRenter').setAttribute('aria-pressed', role === 'renter');
    $('#roleOwner').setAttribute('aria-pressed', role === 'owner');
    $('#listBtn').hidden = role !== 'owner';
  }

  async function addItem(e) {
    e.preventDefault();
    const name = $('#iName').value.trim(), price = Number($('#iPrice').value);
    if (!name || !(price > 0)) return setMsg('#itemMsg', 'Enter a name and a price above 0.', false);
    const item = { id: 'i' + Date.now().toString(36), name, cat: $('#iCat').value, desc: $('#iDesc').value.trim(), price, color: colors[items.length % colors.length] };
    items.push(item);
    persist();
    try { await SupaDB.insertItem({ id: item.id, name: item.name, cat: item.cat, descr: item.desc, price: item.price, color: item.color }); } catch (e) { /* offline */ }
    $('#itemForm').reset(); setMsg('#itemMsg', '', true); $('#itemDialog').close(); renderAll();
  }

  function renderAll() { renderRole(); renderChips(); renderItems(); renderCal(); renderReqs(); }

  /* ─── Events ─── */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.cat)                { state.cat = t.dataset.cat; renderChips(); renderItems(); }
    else if (t.dataset.book)          { state.itemId = t.dataset.book; state.start = state.end = null; setMsg('#bookMsg', '', true); renderCal(); $('#book').scrollIntoView({ behavior: 'smooth' }); }
    else if (t.dataset.day)           pickDay(t.dataset.day);
    else if (t.dataset.act === 'approve') decide(t.dataset.id, true);
    else if (t.dataset.act === 'decline') decide(t.dataset.id, false);
    else if (t.dataset.act === 'cancel')  { reqs = reqs.filter((r) => r.id !== t.dataset.id); persist(); renderAll(); setMsg('#reqMsg', 'Request cancelled.', true); }
  });

  $('#prevMonth').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); });
  $('#nextMonth').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); });
  $('#roleRenter').addEventListener('click', () => { role = 'renter'; persist(); renderRole(); renderReqs(); });
  $('#roleOwner').addEventListener('click', () => { role = 'owner'; persist(); renderRole(); renderReqs(); });
  $('#listBtn').addEventListener('click', () => $('#itemDialog').showModal());
  $('#cancelItem').addEventListener('click', () => $('#itemDialog').close());
  $('#itemForm').addEventListener('submit', addItem);
  $('#bookForm').addEventListener('submit', submitBooking);
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; renderItems(); });
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); $('#browse').scrollIntoView({ behavior: 'smooth' }); });

  /* ─── Boot ─── */
  function startApp() {
    renderAll();
    /* Optionally sync from Supabase in the background */
    syncItemsFromDB().then(() => { if (items.length) { state.itemId = items[0].id; renderAll(); } }).catch(() => {});
    syncReqsFromDB().then(() => renderReqs()).catch(() => {});
  }

  initAuth();

})();
