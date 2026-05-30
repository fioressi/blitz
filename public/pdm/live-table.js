(() => {
  if (window.self !== window.top) document.documentElement.classList.add('embedded');

  const API_BASE = 'https://pdm-api.azurewebsites.net/api';
  const cfg = window.HERPERT_LIVE_CONFIG;
  const STORE = 'herpert-lang';
  let lang = localStorage.getItem(STORE) || 'de';

  const L = {
    de: { loading:'Daten werden geladen…', error:'Fehler beim Laden', empty:'Keine Einträge', search:'Suche…', home:'← Hauptmenü', all:'Alle', count:'Einträge' },
    en: { loading:'Loading data…', error:'Error loading data', empty:'No entries', search:'Search…', home:'← Main Menu', all:'All', count:'entries' },
    hu: { loading:'Adatok betöltése…', error:'Betöltési hiba', empty:'Nincs bejegyzés', search:'Keresés…', home:'← Főmenü', all:'Mind', count:'bejegyzés' },
  };
  const ui = k => (L[lang] || L.de)[k];
  const title = () => (cfg.title[lang] || cfg.title.de);

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v, col) => {
    if (v === null || v === undefined || v === '') return '<span style="color:#6a7c90">—</span>';
    if (col.badge) {
      const map = col.badge;
      const color = map[String(v)] || map['*'] || '#6a7c90';
      return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700">${esc(v)}</span>`;
    }
    if (col.date && v) { try { return new Date(v).toLocaleDateString(lang === 'hu' ? 'hu-HU' : lang === 'en' ? 'en-GB' : 'de-DE'); } catch { return esc(v); } }
    if (col.currency) return `<strong>${esc(v)}</strong> <span style="color:#6a7c90">${esc(col.currency)}</span>`;
    return esc(v);
  };

  let allRows = [];
  let searchVal = '';

  const filtered = () => {
    if (!searchVal) return allRows;
    const q = searchVal.toLowerCase();
    return allRows.filter(r => (cfg.searchKeys || cfg.columns.map(c => c.key)).some(k => String(r[k] ?? '').toLowerCase().includes(q)));
  };

  const renderTable = () => {
    const rows = filtered();
    const tbody = document.getElementById('ht-tbody');
    const countEl = document.getElementById('ht-count');
    if (countEl) countEl.textContent = `${rows.length} ${ui('count')}`;
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" style="text-align:center;padding:32px;color:#6a7c90">${ui('empty')}</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r =>
      `<tr>${cfg.columns.map(c => `<td>${fmt(r[c.key], c)}</td>`).join('')}</tr>`
    ).join('');
  };

  const render = () => {
    document.documentElement.lang = lang;
    document.title = title() + ' | HERPERT';
    document.getElementById('ht-title').textContent = title();
    document.getElementById('ht-search').placeholder = ui('search');
    document.getElementById('ht-home').textContent = ui('home');
    const thead = document.getElementById('ht-thead');
    if (thead) thead.innerHTML = `<tr>${cfg.columns.map(c => `<th>${esc(c.label[lang] || c.label.de || c.label)}</th>`).join('')}</tr>`;
    renderTable();
  };

  const load = async () => {
    const tbody = document.getElementById('ht-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" style="text-align:center;padding:40px;color:#6a7c90">${ui('loading')}</td></tr>`;
    try {
      const res = await fetch(API_BASE + cfg.endpoint);
      if (!res.ok) throw new Error(res.status);
      allRows = await res.json();
      if (!Array.isArray(allRows)) allRows = allRows.items || allRows.data || [];
      renderTable();
      const countEl = document.getElementById('ht-count');
      if (countEl) countEl.textContent = `${allRows.length} ${ui('count')}`;
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" style="text-align:center;padding:40px;color:#f87171">${ui('error')}: ${e.message}</td></tr>`;
    }
  };

  const CSS = `
    :root{--bg:#101928;--panel:rgba(255,255,255,.07);--line:rgba(255,255,255,.13);--text:#edf4ff;--muted:#aab8ca;--accent:#66d9ef}
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at top,#1e3350,var(--bg) 65%);color:var(--text);min-height:100vh}
    .topbar{display:flex;align-items:center;gap:14px;padding:13px 22px;background:rgba(255,255,255,.06);border-bottom:1px solid var(--line);backdrop-filter:blur(10px)}
    .embedded .topbar{display:none}
    .embedded body{background:transparent}
    .embedded .wrap{padding-top:8px}
    a.back{color:var(--muted);text-decoration:none;font-size:13px;font-weight:600;padding:5px 10px;border:1px solid var(--line);border-radius:7px}
    a.back:hover{background:rgba(255,255,255,.08);color:var(--text)}
    .brand{font-size:15px;font-weight:900;color:var(--accent);letter-spacing:.04em;margin-left:4px}
    .spacer{flex:1}
    select.lang{padding:5px 10px;font-size:12px;font-weight:900;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:7px;color:var(--text);cursor:pointer;appearance:none;-webkit-appearance:none;min-width:52px;text-align:center}
    .wrap{width:min(1200px,94%);margin:0 auto;padding:24px 0 40px}
    .page-head{margin-bottom:18px}
    h1{margin:0 0 4px;font-size:26px;font-weight:900;color:var(--accent)}
    .toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
    .search{flex:1;min-width:180px;padding:8px 13px;background:var(--panel);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:13px}
    .search:focus{outline:none;border-color:rgba(102,217,239,.4)}
    .count{font-size:12px;color:var(--muted);white-space:nowrap}
    .table-wrap{overflow-x:auto;border-radius:10px;border:1px solid var(--line)}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead{background:rgba(255,255,255,.05)}
    th{padding:10px 14px;text-align:left;font-weight:700;color:var(--muted);font-size:11px;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--line);white-space:nowrap}
    td{padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(255,255,255,.03)}
  `;

  const html = `
    <style>${CSS}</style>
    <div class="topbar">
      <a class="back" id="ht-home" href="./index.html">← Hauptmenü</a>
      <span class="brand">HERPERT</span>
      <span class="spacer"></span>
      <select class="lang" id="ht-lang" aria-label="Language">
        <option value="de"${lang==='de'?' selected':''}>DE</option>
        <option value="en"${lang==='en'?' selected':''}>EN</option>
        <option value="hu"${lang==='hu'?' selected':''}>HU</option>
      </select>
    </div>
    <div class="wrap">
      <div class="page-head"><h1 id="ht-title"></h1></div>
      <div class="toolbar">
        <input class="search" id="ht-search" type="search" placeholder="Suche…">
        <span class="count" id="ht-count"></span>
      </div>
      <div class="table-wrap">
        <table>
          <thead id="ht-thead"></thead>
          <tbody id="ht-tbody"><tr><td style="padding:40px;text-align:center;color:#6a7c90">…</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  document.getElementById('ht-lang').addEventListener('change', e => {
    lang = e.target.value;
    localStorage.setItem(STORE, lang);
    render();
  });
  document.getElementById('ht-search').addEventListener('input', e => {
    searchVal = e.target.value;
    renderTable();
  });

  render();
  load();
})();
