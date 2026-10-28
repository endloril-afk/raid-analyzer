/* Raid Analyzer : données partagées et petits utilitaires de rendu. */
/* Chemin de la racine du site depuis la page courante : "" pour index.html, "../" pour rapports/*.html */
const ROOT = window.ROOT || "";

/* Boss qui ont l'onglet « Intermission » (mini-carte des paires, erreurs par joueur) dans Raid : nom exact du boss (anglais, comme dans l'export).
   Ajouter un boss ici quand son intermission est analysée. */
const INTERMISSION_BOSSES = ["Entombed Sentinels"];

/* Note partielle : une catégorie principale manque (gameplay ou référence du top non chargés, quota) → « ≈ » après la note */
const partialTitle = m => `Note partielle : ${Array.isArray(m) ? m.join(", ") + " manquant(s)" : "une catégorie manque"} (données non chargées, quota de l'API). La note sera complétée à la prochaine mise à jour.`;
const pmark = m => m ? `<sup class="partial" title="${esc(partialTitle(m))}">≈</sup>` : "";

/* Classes jouables : l'export ne donne que leur nom anglais */
const CLASSES = {
  DeathKnight: ["Chevalier de la mort", "#C41E3A"], DemonHunter: ["Chasseur de démons", "#A330C9"], Druid: ["Druide", "#FF7C0A"],
  Evoker: ["Évocateur", "#33937F"], Hunter: ["Chasseur", "#AAD372"], Mage: ["Mage", "#3FC7EB"], Monk: ["Moine", "#00FF98"],
  Paladin: ["Paladin", "#F48CBA"], Priest: ["Prêtre", "#FFFFFF"], Rogue: ["Voleur", "#FFF468"], Shaman: ["Chaman", "#0070DD"],
  Warlock: ["Démoniste", "#8788EE"], Warrior: ["Guerrier", "#C69B6D"],
};
const clsName = c => (CLASSES[c] || [c])[0];
const clsColor = c => (CLASSES[c] || [, "#9ca3af"])[1];

/* Images rattachées par le nom exporté : « The Twin Fangs » → assets/bosses/the-twin-fangs.png,
   « The Venomous Abyss » → assets/raids/the-venomous-abyss.png. Fichier absent = dégradé + initiales. */
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const raidImg = name => `${ROOT}assets/raids/${slug(name)}.png`;
const bossImg = name => `${ROOT}assets/bosses/${slug(name)}.png`;
/* Dates : timestamps en millisecondes */
const dateFr = ms => new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase());
const timeFr = ms => new Date(ms).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");

/* ---------- utilitaires ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON = n => `https://wow.zamimg.com/images/wow/icons/medium/${n}.jpg`;
const QM = ICON("inv_misc_questionmark");
const fr = (n, d = 1) => Number(n).toFixed(d).replace(".", ",").replace(/,0$/, "");
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const short = n => n == null ? "–" : n >= 1e6 ? fr(n / 1e6) + " M" : n >= 1e3 ? Math.round(n / 1e3) + " k" : String(Math.round(n));
const num = (n, d = 1) => n == null ? "–" : fr(n, d);
const pct = (n, d = 1) => n == null ? "–" : fr(n, d) + " %";
/* Écart en % déjà calculé par l'export (vs_top) */
const gap = (d, invert = false) => d == null ? '<span class="muted small">–</span>' : chip(`${d > 0 ? "+" : ""}${d} % vs top`, (invert ? -d : d) >= -10 ? "good" : (invert ? -d : d) >= -25 ? "warn" : "bad");
const noteCls = v => v >= 8 ? "good" : v >= 6 ? "warn" : "bad";
const vsTop = (me, top) => { const d = Math.round((me / top - 1) * 100); return chip(`${d > 0 ? "+" : ""}${d}% vs top`, d >= -10 ? "good" : d >= -25 ? "warn" : "bad"); };
const ptsTop = (me, top) => { const d = me - top; return chip(`${d >= 0 ? "+" : ""}${d} pts vs top`, d <= 5 ? "good" : d <= 9 ? "warn" : "bad"); };

const chip = (t, cls = "") => `<span class="chip ${cls}">${t}</span>`;
const img = (icon, size) => `<img class="ic" style="width:${size}px;height:${size}px" src="${ICON(icon)}" alt="" loading="lazy" onerror="this.src='${QM}'">`;
const sp = (name, icon, size = 22, text = true, id = null) => `<a class="sp"${id ? ` href="https://www.wowhead.com/fr/spell=${id}" target="_blank" rel="noopener"` : ""}>${img(icon || "inv_misc_questionmark", size)}${text ? `<span>${esc(name)}</span>` : ""}</a>`;
const link = (url, t = "Voir ↗") => url ? `<a class="wlink" href="${esc(url)}" target="_blank" rel="noopener">${t}</a>` : "";

const ROLE_SVG = {
  tank: ["Tank", '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>'],
  healer: ["Healer", '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'],
  melee: ["DPS mêlée", '<path d="M14.5 3H21v6.5L10 20.5l-1.5-1.5-2 2L4 18.5l2-2L4.5 15z"/>'],
  ranged: ["DPS distance", '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.6"/>'],
};
/* Rôle de l'export : tank / healer / dps (+ sub melee / ranged) */
const roleKey = (role, sub) => role === "dps" ? (sub === "melee" ? "melee" : "ranged") : ROLE_SVG[role] ? role : sub === "melee" ? "melee" : "ranged";
const rolic = r => `<span class="rolic r-${r}" title="${ROLE_SVG[r][0]}"><svg viewBox="0 0 24 24" fill="currentColor">${ROLE_SVG[r][1]}</svg></span>`;
const clsic = (cls, size) => `<span class="clsic" style="width:${size}px;height:${size}px;background:${clsColor(cls)}" title="${esc(clsName(cls))}"><img src="${ICON("classicon_" + String(cls).toLowerCase())}" alt="" loading="lazy" onerror="this.remove()"></span>`;
/* Nom d'un joueur dans la couleur de sa classe, précédé de l'icône de la classe */
const cname = (name, cls, size = 20) => `<span class="cname" style="color:${clsColor(cls)}">${clsic(cls, size)}${esc(name)}</span>`;
const pl = (name, cls, role, sub) => `<span class="pl">${clsic(cls, 20)} ${rolic(roleKey(role, sub))} ${esc(name)}</span>`;

const SVG_ICONS = {
  cal: '<path d="M7 2v2H4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3V2h-2v2H9V2zM5 9h14v10H5z"/>',
  skull: '<path d="M12 2C7 2 3.5 5.6 3.5 10.2c0 2.7 1.3 4.6 3 5.8V19a1 1 0 0 0 1 1h1v-2h1.5v2h4v-2H15.5v2h1a1 1 0 0 0 1-1v-3c1.7-1.2 3-3.1 3-5.8C20.5 5.6 17 2 12 2zM8.5 13.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>',
  swords: '<path d="M4 3l7 7-1.5 1.5L3 5V3zm16 0v2l-6.5 6.5L12 10l7-7zM8.5 13.5l2 2L6 20l-1-1-2 1 1-2-1-1zm7 0L21 19l-1 1 1 2-2-1-1 1-4.5-4.5z"/>',
  people: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6zm15.5 0c0-2-.8-3.7-2.1-5 3.3-.3 6.6 1.5 6.6 5z"/>',
  sync: '<path d="M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm8 8a8 8 0 0 1-15.4 3H7v-2H1v6h2v-2.3A10 10 0 0 0 22 12z"/>',
  list: '<path d="M3 4h18v3H3zm0 6h18v3H3zm0 6h18v3H3z"/>',
  chart: '<path d="M5 13h3v7H5zm5.5-5h3v12h-3zM16 4h3v16h-3z"/>',
  trophy: '<path d="M7 2h10v2h4v3a5 5 0 0 1-4.6 5 5 5 0 0 1-3.4 3.8V18h3v2H8v-2h3v-2.2A5 5 0 0 1 7.6 12 5 5 0 0 1 3 7V4h4zM5 6v1a3 3 0 0 0 2 2.8V6zm12 0v3.8A3 3 0 0 0 19 7V6z"/>',
};
const ico = (k, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24">${SVG_ICONS[k]}</svg>`;
const SKULL = (cls = "skull") => `<img class="${cls}" src="${ROOT}assets/skull.png" alt="">`;
/* Bannière : dégradé + initiales, recouverts par l'illustration quand le fichier existe */
const ban = (hue, txt, image) => `<div class="ban" style="--a:${hue[0]};--b:${hue[1]};--x:${hue[2]};--y:${hue[3]}">${txt ? `<span>${esc(txt)}</span>` : ""}${image ? `<i class="pic" style="background-image:url('${esc(image)}')"></i>` : ""}</div>`;

/* Tableau triable. cols : [{l, num, title}] ; rows : [[{h, v} | texte]] */
function table(cols, rows, cls = "sortable") {
  const th = cols.map(c => `<th class="${c.num ? "num" : ""}"${c.title ? ` title="${esc(c.title)}"` : ""}>${c.l}${c.title ? ' <span class="qm">?</span>' : ""}</th>`).join("");
  /* tableau par pull (1re colonne « Pull ») : trait épais entre deux pulls, pour séparer les essais */
  const byPull = cols[0] && cols[0].l === "Pull", pk = r => { const c = r[0]; return typeof c === "object" && c !== null ? c.v : c; };
  const tr = rows.map((r, k) => (byPull && k > 0 && pk(r) !== pk(rows[k - 1]) ? '<tr class="psep">' : "<tr>") + r.map((c, i) => {
    const o = typeof c === "object" && c !== null ? c : { h: esc(c), v: c };
    return `<td class="${cols[i] && cols[i].num ? "num" : ""}" data-v="${esc(o.v ?? "")}">${o.h}</td>`;
  }).join("") + "</tr>").join("");
  return `<div class="tw"><table class="${cls}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
const kpi = (l, v, s = "&nbsp;") => `<div class="kpi"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
const card = (title, body, cls = "") => `<section class="card ${cls}">${title ? `<h3>${title}</h3>` : ""}${body}</section>`;
const muted = t => `<p class="muted small">${t}</p>`;
/* labels : texte, ou { h: html } pour un libellé déjà mis en forme */
function tabset(labels, panes, main = false) {
  return `<div class="tabset ${main ? "main" : ""}"><nav class="tnav">${labels.map((l, i) => `<button data-t="${i}" class="${i ? "" : "on"}">${l && l.h ? l.h : esc(l)}</button>`).join("")}</nav>` +
    panes.map((p, i) => `<div class="tpane ${i ? "" : "on"}">${p}</div>`).join("") + "</div>";
}
const st = (status, best) => status === "kill" ? '<span class="st kill"><i>✓</i>Vaincu</span>'
  : status === "best" ? `<span class="st best"><i>◎</i>${best != null ? fr(best) + " %" : "Meilleure tentative"}</span>`
  : '<span class="st none">○ Non tenté</span>';

/* ---------- Éléments communs à l'accueil et aux rapports ---------- */
function header(sub = "Analyses Warcraft Logs générées par Raid Analyzer et mises à jour automatiquement.") {
  return `<header class="top"><a class="home" href="${ROOT}index.html" title="Retour à l'accueil"><img class="logo" src="${ROOT}assets/guilde_logo.png" alt="Accueil"></a>
    <div class="ttl"><h1><span class="grad">Rapports</span> de raid</h1><div class="sub">${sub}</div></div></header>`;
}
/* Menu du haut, identique sur l'accueil et les rapports. base : chemin de l'accueil ("" sur l'accueil, "../index.html" dans un rapport) */
const TOP_NAV = [["/", "swords", "Soirées"], ["/recap", "list", "Récap / Membres"], ["/methode", "chart", "Méthode"]];
const topNav = (base = "") => `<nav class="pnav">${TOP_NAV.map(([r, i, l]) => `<a href="${base}#${r}" data-r="${r}"><svg viewBox="0 0 24 24">${SVG_ICONS[i]}</svg>${l}</a>`).join("")}</nav>`;
/* Pastille de difficulté (Normal / Héroïque / Mythique) */
const DIFF = { "Normal": "n", "Héroïque": "h", "Mythique": "m" };
const diff = d => `<span class="diff ${DIFF[d] || "n"}"><i>◆</i>${esc(d)}</span>`;
/* Titre + pastilles : le dernier mot reste collé aux pastilles pour qu'elles passent à la ligne ensemble */
const titleDiff = (name, diffs) => { const w = String(name).split(" "), last = w.pop(); return `${esc(w.join(" "))}${w.length ? " " : ""}<span class="nw">${esc(last)}${diffs.map(diff).join("")}</span>`; };
/* Niveau et verdict d'une note de soirée (mêmes seuils que la page d'accueil Raid Analyzer) */
const lvl = n => n == null ? "" : n >= 6.5 ? "good" : n >= 5 ? "warn" : "bad";
const verdict = n => n == null ? "" : n >= 8 ? "Très bonne soirée" : n >= 6.5 ? "Bonne soirée" : n >= 5 ? "Soirée correcte" : "Soirée difficile";
/* Cartes de boss : initiales et teinte du dégradé affiché quand l'image manque */
const initials = name => name.split(/\s+/).filter(w => w.toLowerCase() !== "the").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const TILE_HUE = [250, 280, "30%", "30%"];
const sday = ms => ms ? new Date(ms).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "?";

/* Tri des tableaux .sortable (toutes les pages) */
document.addEventListener("click", e => {
  const th = e.target.closest("table.sortable th");
  if (!th) return;
  const i = [...th.parentNode.children].indexOf(th), tb = th.closest("table").tBodies[0], rows = [...tb.rows], asc = th.dataset.asc !== "1";
  th.dataset.asc = asc ? "1" : "0";
  rows.sort((a, b) => {
    const x = a.cells[i].dataset.v ?? a.cells[i].textContent, y = b.cells[i].dataset.v ?? b.cells[i].textContent;
    const nx = parseFloat(x), ny = parseFloat(y);
    const r = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y, "fr");
    return asc ? r : -r;
  });
  rows.forEach(r => tb.appendChild(r));
  /* séparateurs de pull : recalculés après le tri (seulement si la 1re colonne est « Pull ») */
  const h0 = th.parentNode.children[0], byPull = h0 && h0.textContent.trim().startsWith("Pull");
  rows.forEach((r, k) => r.classList.toggle("psep", byPull && k > 0 && (r.cells[0].dataset.v ?? r.cells[0].textContent) !== (rows[k - 1].cells[0].dataset.v ?? rows[k - 1].cells[0].textContent)));
});

/* Choix de la mécanique affichée dans une analyse de boss : un bouton (icône Wowhead + nom) par mécanique, une seule
   mécanique visible à la fois (lecteurs et cartes en tête de chaque mécanique). Choix retenu par boss dans le navigateur.
   groups : [{ id, label, icon, html }] */
function mechFilter(key, groups) {
  const G = groups.filter(g => g.html);
  if (G.length < 2) return G.map(g => g.html).join("");
  return `<div class="mechf" data-key="${esc(key)}"><div class="mechbar">` +
    G.map((g, i) => `<button type="button" class="mbtn${i ? "" : " on"}" data-m="${esc(g.id)}" title="Afficher : ${esc(g.label)}">${img(g.icon || "inv_misc_questionmark", 18)}<span>${esc(g.label)}</span></button>`).join("") + `</div>` +
    G.map((g, i) => `<div class="mechsec" data-m="${esc(g.id)}"${i ? " hidden" : ""}>${g.html}</div>`).join("") + `</div>`;
}
(function () {
  const load = k => { try { return localStorage.getItem("mech1:" + k); } catch { return null; } };
  const save = (k, v) => { try { localStorage.setItem("mech1:" + k, v); } catch { /* stockage indisponible */ } };
  const apply = (box, m) => { const ids = [...box.querySelectorAll(":scope > .mechbar > .mbtn")].map(b => b.dataset.m); if (!ids.includes(m)) m = ids[0];
    box.querySelectorAll(":scope > .mechbar > .mbtn").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    box.querySelectorAll(":scope > .mechsec").forEach(x => { x.hidden = x.dataset.m !== m; }); };
  window.initMech = root => (root || document).querySelectorAll(".mechf:not([data-init])").forEach(box => { box.dataset.init = "1"; apply(box, load(box.dataset.key)); });
  document.addEventListener("click", e => {
    const b = e.target.closest(".mechf > .mechbar > .mbtn"); if (!b) return;
    const box = b.closest(".mechf"); save(box.dataset.key, b.dataset.m); apply(box, b.dataset.m);
  });
  if (document.readyState !== "loading") initMech(document); else document.addEventListener("DOMContentLoaded", () => initMech(document));
})();
