(() => {
  const data = window.HERPERT_PAGE_DATA;
  const key = window.HERPERT_PAGE_KEY;
  const page = data.pages.find((item) => item.key === key);
  const storeKey = "herpert-lang";
  let lang = localStorage.getItem(storeKey) || document.documentElement.lang || "de";
  if (!data.i18n[lang]) lang = "de";
  const t = (name) => data.i18n[lang][name] || data.i18n.de[name] || name;
  const local = (value) => value?.[lang] || value?.de || "";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const inputFor = (label, index) => {
    const low = label.toLowerCase();
    const isLong = low.includes("notiz") || low.includes("beschreibung") || low.includes("vorlage") || low.includes("grund");
    const cls = isLong || index % 5 === 4 ? "field full" : "field";
    const control = isLong ? '<textarea placeholder="' + esc(t("enter")) + '"></textarea>' : '<input placeholder="' + esc(t(low.includes("suche") ? "search" : "enter")) + '">';
    return '<div class="' + cls + '"><label>' + esc(label) + '</label>' + control + '</div>';
  };
  const render = () => {
    document.documentElement.lang = lang;
    document.title = local(page.titles) + " | HERPERT";
    const filters = page.filters.map((label, index) => inputFor(label, index)).join("");
    const fields = page.fields.map((label, index) => inputFor(label, index)).join("");
    const actions = page.actions.map((label, index) => '<button ' + (index === 0 ? 'class="primary"' : '') + ' disabled>' + esc(label) + '</button>').join("");
    const sampleRows = page.fields.slice(0, 5).map((label, index) => '<div class="row"><div><strong>' + esc(label) + '</strong><span>' + esc(t("prepared")) + '</span></div><span>#' + String(index + 1).padStart(2, "0") + '</span></div>').join("");
    document.getElementById("app").innerHTML = '<div class="shell"><header class="topbar"><div class="topbar-inner"><a class="back" href="./index.html">' + esc(t("home")) + '</a><div class="brand">HERPERT</div><div class="spacer"></div><select id="lang-switcher" class="lang-select notranslate" aria-label="Language selector" translate="no"><option value="de"' + (lang === "de" ? " selected" : "") + '>DE</option><option value="en"' + (lang === "en" ? " selected" : "") + '>EN</option><option value="hu"' + (lang === "hu" ? " selected" : "") + '>HU</option></select></div></header><main><section class="hero"><div><div class="kicker">' + esc(t("source")) + ' · ' + esc(page.form) + '</div><h1>' + esc(local(page.titles)) + '</h1><p>' + esc(local(page.summary)) + '</p></div><div class="badges"><span class="badge warn">' + esc(t("preparedBadge")) + '</span><span class="badge">' + esc(page.section) + '</span></div></section><section class="grid"><aside class="panel"><h2>' + esc(t("filters")) + '</h2><div class="panel-body"><div class="field-grid">' + filters + '</div></div></aside><section class="panel"><h2>' + esc(t("details")) + '</h2><div class="panel-body"><div class="field-grid">' + fields + '</div></div></section><aside class="panel"><h2>' + esc(t("actions")) + '</h2><div class="panel-body"><div class="actions">' + actions + '</div><p class="notice" style="margin-top:12px">' + esc(t("preparedText")) + '</p></div></aside><section class="panel"><h2>' + esc(t("lines")) + '</h2><div class="panel-body"><div class="list">' + sampleRows + '</div><p class="source" style="margin-top:12px">' + esc(page.form) + '</p></div></section></section></main></div>';
    document.getElementById("lang-switcher").addEventListener("change", (event) => {
      lang = event.target.value;
      localStorage.setItem(storeKey, lang);
      render();
    });
  };
  render();
})();
