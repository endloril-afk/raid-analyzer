/* Raid Analyzer : page d'un rapport (une soirée), rapports/Raid_*.html.
   Données : window.RAID_EXPORT (un RaidExport, docs/raid-analyzer.d.ts), chargé par le fichier .js du même nom que la page. */
const X = window.RAID_EXPORT;

/* ---------- Navigation : menu du haut identique à l'accueil (tous ses liens y renvoient) ; menu latéral : un bouton par boss tenté ---------- */
const tried = () => X.roster.filter(r => r.tried).map(r => X.bosses.find(b => b.key === r.key)).filter(Boolean);
const nav = () => topNav(ROOT + "index.html");
function side() {
  return `<aside class="snav"><button data-bossgo="all"><i class="d all"></i>Tous les pulls</button><button data-bossgo="kills"><i class="d kill"></i>Tous les kills</button><hr class="snsep">${tried().map(b => `<button data-bossgo="${b.key}"><i class="d ${b.summary.kills ? "kill" : "best"}"></i>${esc(b.name)}</button>`).join("")}</aside>`;
}
/* Boss ouvert par #auto (clic sur l'encadré du raid à l'accueil) : le seul boss non vaincu s'il n'y en a qu'un, sinon le boss tenté le plus tard.
   L'export ne date pas les pulls : « le plus tard » = plus grand numéro de combat Warcraft Logs (fight=N) des liens des morts, à défaut l'ordre de X.bosses (première tentative). */
function defaultBoss() {
  const bs = tried(), alive = bs.filter(b => !b.summary.kills);
  if (alive.length === 1) return alive[0].key;
  const fight = b => Math.max(-1, ...b.views.flatMap(v => v.raid?.extras?.deaths || []).map(d => +(/fight=(\d+)/.exec(d.link || "")?.[1] ?? -1)));
  return bs.map(b => ({ k: b.key, f: fight(b), i: X.bosses.indexOf(b) })).sort((a, c) => c.f - a.f || c.i - a.i)[0]?.k ?? "ov";
}

/* ---------- Soirée ---------- */
/* Note d'un boss sur cette soirée = history[].avg_score de l'entrée de ce rapport */
const bossNote = b => b.history.find(e => e.code === X.report.code)?.avg_score ?? null;
/* Note du raid = moyenne des notes des boss, pondérée par le nombre de pulls */
function raidNote() {
  const h = X.bosses.flatMap(b => b.history.filter(e => e.code === X.report.code));
  const pulls = h.reduce((n, e) => n + e.pulls, 0);
  return pulls ? h.reduce((n, e) => n + e.avg_score * e.pulls, 0) / pulls : null;
}
const raidName = () => X.bosses[0]?.views[0]?.raid.raid ?? X.report.zone;
/* Une carte par boss du raid (ordre de `roster`) ; seules celles des boss vaincus ou tentés sont affichées. */
function bossTile(b) {
  const s = b.summary, n = bossNote(b), body = s.kills ? '<p class="bf">Boss vaincu cette soirée.</p>'
    : `<div class="big">${fr(s.best_pct)} %</div><p class="bf">PV restants au plus bas</p>`;
  return `<article class="btile" data-bossgo="${b.key}" tabindex="0">${ban(TILE_HUE, initials(b.name), bossImg(b.name))}<div class="bt"><h3>${esc(b.name)}</h3>${s.kills ? st("kill") : '<span class="st best"><i>◎</i>Meilleure tentative</span>'}<hr>${body}<p class="bf small">${s.pulls} pull${s.pulls > 1 ? "s" : ""}${n != null ? ` · note ${fr(n)}/10` : ""}</p></div></article>`;
}
const offTile = name => `<article class="btile off" hidden>${ban(TILE_HUE, initials(name), bossImg(name))}<div class="bt"><h3>${esc(name)}</h3>${st("none")}<hr><p class="bf">Pas tenté cette soirée.</p></div></article>`;
function overview() {
  const note = raidNote(), nc = note == null ? "" : lvl(note), raid = raidName();
  const diffs = [...new Set(X.bosses.map(b => b.difficulty))].sort((a, b) => Object.keys(DIFF).indexOf(a) - Object.keys(DIFF).indexOf(b));
  const killed = X.bosses.filter(b => b.summary.kills).length, pulls = X.bosses.reduce((n, b) => n + b.summary.pulls, 0);
  return `<div class="boss" data-boss="ov" hidden><div class="panel"><section class="shero">${ban(TILE_HUE, "", raidImg(raid))}
    <div class="hl"><div class="hd">${ico("cal")}${dateFr(X.report.raid_date)}</div><h2 class="htitle">${titleDiff(raid, diffs)}</h2><div class="hs">${SKULL("hskull")}${killed} boss vaincu${killed > 1 ? "s" : ""} <b>·</b> ${pulls} pulls</div></div>
    <div class="hr"><div class="hk">Note du raid</div>${note == null ? '<div class="hn">–</div>' : `<div class="hn ${nc}">${fr(note)}<span>/10</span></div><div class="bar10 ${nc}"><i style="width:${note * 10}%"></i></div><div class="hv ${nc}">${ico("trophy")}${verdict(note)}</div>`}</div></section>
    <section class="inner"><div class="sechead"><h2>${SKULL()}Progression des boss</h2><div class="leg"><span><i class="d kill"></i>Vaincu</span><span><i class="d best"></i>Meilleure tentative</span></div></div>
    <div class="bgrid">${X.roster.map(r => r.tried ? bossTile(X.bosses.find(b => b.key === r.key)) : offTile(r.name)).join("")}</div></section></div></div>`;
}

/* ---------- Membres (onglet « Membres » de chaque fiche de boss, colonne du boss affiché en gras) ----------
   1) note du fight de chaque joueur sur chaque boss, tous les pulls (summary.players) ; 2) sur les kills seulement (summary.kill) ;
   3) enchantements manquants sur la soirée (stuff). Une note se clique : elle ouvre la fiche du joueur dans l'onglet Gameplay du boss. */
const ngo = (v, name, role, key, view, title, partial = null) => v == null ? { h: "–", v: "" } : { h: `<button class="ngo" data-goplayer="${esc(name)}" data-gorole="${esc(role)}" data-goboss="${esc(key)}"${view ? ` data-goview="${esc(view)}"` : ""} title="${esc(title)}">${chip(fr(v), noteCls(v))}</button>${pmark(partial)}`, v };
const catsTitle = p => p && p.categories && p.categories.length ? p.categories.map(c => `${c.label} ${fr(c.score)}/10${(c.weight ?? 1) !== 1 ? ` (poids ${String(c.weight).replace(".", ",")})` : ""}`).join(" · ") + " · clique pour le détail" : "Clique pour le détail";
/* Membres d'un boss : note de chaque joueur sur tous les pulls du boss, sur chaque pull (kill en tête de colonne) */
function bossMembers(b) {
  const pulls = b.views.slice(1);
  const of = (v, n) => (v.gameplay?.players || []).find(x => x.name === n) || (v.healers?.healers || []).find(x => x.name === n) || null;
  const list = [...b.summary.players].sort((a, c) => c.score - a.score);
  const cols = [{ l: "Joueur" }, { l: "Rôle" }, { l: "Tous les pulls", num: 1 }, ...pulls.map(v => { const [h, t = ""] = String(v.label).split(" — "); return { l: `<span title="${esc(v.label)}">${v.kill ? `<b>${esc(h)}</b>` : esc(h)}<br><small class="muted">${esc(t.replace(/\s*\(.*\)$/, "").replace(/^kill$/, "kill"))}</small></span>`, num: 1 }; }), { l: "Pulls", num: 1 }];
  const rows = list.map(p => [{ h: pl(p.player, p.class, p.role, p.sub), v: p.player }, ROLE_FR[p.role] || p.role,
    ngo(p.score, p.player, p.role, b.key, null, catsTitle(p), p.partial),
    ...pulls.map(v => { const o = of(v, p.player); return ngo(o?.score ?? null, p.player, p.role, b.key, v.key, catsTitle(o), o?.partial); }),
    { h: p.pulls, v: p.pulls }]);
  return `<div class="sechead"><h2>Membres — ${esc(b.name)}</h2><span class="muted small">${list.length} joueurs · note du fight sur tous les pulls du boss puis sur chaque pull (moyenne des catégories du rôle, survole une note) · clique une note pour voir son détail · la soirée entière : « Tous les pulls » et « Tous les kills » dans le menu de gauche</span></div>
    <section class="card">${pulls.length ? `<div class="hscroll">${table(cols, rows, "sortable grid")}</div>` : table(cols, rows, "sortable grid")}</section>`;
}
/* Pages de la soirée entière (menu de gauche) : tous les pulls ou tous les kills, tous boss confondus */
function nightPage(id, title, sub, body) {
  return `<div class="boss" data-boss="${id}" hidden><section class="bhero">${ban(TILE_HUE, "", raidImg(raidName()))}<div class="bhin"><div class="bhead"><h2>${esc(title)}</h2></div><div class="viewbar"><span class="muted small">${esc(sub)}</span></div></div></section><section class="inner">${body}</section></div>`;
}
function members(cur) {
  const bs = tried(), P = {};
  bs.forEach((b, i) => b.summary.players.forEach(p => {
    const m = P[p.player] ||= { name: p.player, cls: p.class, role: p.role, sub: p.sub, vals: [], rows: [], pulls: 0, sum: 0 };
    m.vals[i] = p.score; m.rows[i] = p; m.pulls += p.pulls; m.sum += p.score * p.pulls;
  }));
  const list = Object.values(P).sort((a, b) => b.sum / b.pulls - a.sum / a.pulls);
  const cols = [{ l: "Joueur" }, { l: "Rôle" }, ...bs.map(b => ({ l: `${b.key === cur ? `<b>${esc(b.name)}</b>` : esc(b.name)}<br><small class="muted">${b.summary.pulls} pulls</small>`, num: 1 })), { l: "Soirée", num: 1 }, { l: "Pulls", num: 1 }];
  const rows = list.map(m => [{ h: pl(m.name, m.cls, m.role, m.sub), v: m.name }, ROLE_FR[m.role] || m.role,
    ...bs.map((b, i) => ngo(m.vals[i], m.name, m.role, b.key, null, catsTitle(m.rows[i]), m.rows[i]?.partial)),
    { h: `<b>${fr(m.sum / m.pulls)}</b>`, v: m.sum / m.pulls }, { h: m.pulls, v: m.pulls }]);
  return `<div class="sechead"><h2>Membres — tous les pulls de la soirée</h2><span class="muted small">${list.length} joueurs · note du fight sur chaque boss (moyenne des catégories du rôle, survole une note) · note de la soirée = moyenne de tous leurs pulls · clique une note pour voir son détail</span></div>
    <section class="card">${table(cols, rows, "sortable grid")}</section>` + stuffRecap();
}
function membersKills(cur) {
  const kb = tried().filter(b => b.summary.kill && b.summary.kill.players && b.summary.kill.players.length);
  if (!kb.length) return `<div class="sechead"><h2>Kills de la soirée</h2></div><section class="card">${muted("Aucun boss tué ce soir.")}</section>`;
  const P = new Map(); for (const b of kb) for (const p of b.summary.kill.players) if (!P.has(p.player)) P.set(p.player, p);
  const list = [...P.values()].map(p => { const mine = kb.map(b => b.summary.kill.players.find(x => x.player === p.player)), v = mine.filter(Boolean);
    return { p, mine, avg: v.length ? v.reduce((a, x) => a + x.score, 0) / v.length : null, n: v.length }; }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const cols = [{ l: "Joueur" }, { l: "Rôle" }, ...kb.map(b => ({ l: `${b.key === cur ? `<b>${esc(b.name)}</b>` : esc(b.name)}<br><small class="muted">${b.summary.kill.pulls.length > 1 ? `${b.summary.kill.pulls.length} kills` : `pull ${b.summary.kill.pulls[0]}`}</small>`, num: 1 })), { l: "Moyenne", num: 1 }, { l: "Boss tués", num: 1 }];
  const rows = list.map(r => [{ h: pl(r.p.player, r.p.class, r.p.role, r.p.sub), v: r.p.player }, ROLE_FR[r.p.role] || r.p.role,
    ...r.mine.map((x, i) => ngo(x ? x.score : null, r.p.player, r.p.role, kb[i].key, x ? "p" + x.pull : null, "Note du fight sur le kill · clique pour le détail", x?.partial)),
    { h: `<b>${r.avg == null ? "–" : fr(r.avg)}</b>`, v: r.avg ?? -1 }, { h: r.n, v: r.n }]);
  return `<div class="sechead"><h2>Kills de la soirée</h2><span class="muted small">Note du fight sur les pulls tués uniquement · moyenne des boss tués · clique une note pour voir le détail du kill</span></div><section class="card">${table(cols, rows, "sortable grid")}</section>`;
}
/* Enchantements manquants par joueur, sur combien de boss (une pièce changée en cours de soirée n'est pas enchantée partout) */
function stuffRecap() {
  const bs = tried(), per = new Map();
  for (const b of bs) for (const p of (b.stuff && b.stuff.players) || []) {
    const o = per.get(p.name) || per.set(p.name, { name: p.name, cls: p.class, role: p.role, n: 0, slots: new Map() }).get(p.name); o.n++;
    for (const e of (p.enchants || []).filter(x => x.present && x.required && !x.has)) (o.slots.get(e.slot) || o.slots.set(e.slot, []).get(e.slot)).push(b.name);
  }
  if (!per.size) return potionRecap();
  const rows = [...per.values()].filter(o => o.slots.size).sort((a, b) => b.slots.size - a.slots.size || a.name.localeCompare(b.name, "fr"));
  return `<div class="sechead"><h2>Stuff de la soirée</h2><span class="muted small">Enchantements manquants, sur combien des ${bs.length} boss</span></div><section class="card">${rows.length ? table([{ l: "Joueur" }, { l: "Enchantements manquants" }],
    rows.map(o => [{ h: pl(o.name, o.cls, o.role), v: o.name }, { h: [...o.slots].map(([slot, l]) => `<span class="chip ${l.length === o.n ? "bad" : "warn"}" title="${esc(l.join(", "))}">${esc(slot)} : ${l.length === o.n ? "tous les boss" : `${l.length} boss sur ${o.n}`}</span>`).join(" "), v: o.slots.size }]), "sortable") : '<p class="good">Tout le monde est enchanté sur tous les boss.</p>'}</section>`; + potionRecap();
}

/* Potions de combat jamais prises sur la soirée : conseil « Potion · jamais prise » sur chaque boss où le joueur est comparé au top */
function potionRecap() {
  const per = new Map();
  /* boss pris en compte : kill ou au moins 3 pulls (sur 1-2 pulls de découverte, ne pas prendre de potion est courant) */
  for (const b of tried().filter(b => b.summary.kills || b.summary.pulls >= 3)) { const v = b.views[0] || {};
    for (const o of [...((v.gameplay && v.gameplay.players) || []), ...((v.healers && v.healers.healers) || [])]) { if (!o.reference) continue;
      const m = per.get(o.name) || per.set(o.name, { name: o.name, cls: o.class, role: o.role, n: 0, never: [], less: [] }).get(o.name); m.n++;
      const pa = (o.advice || []).filter(a => a.topic === "Potion");
      if (pa.some(a => /jamais prise/.test(a.text))) m.never.push(b.name); else if (pa.length) m.less.push(b.name); } }
  if (!per.size) return "";
  /* gravité : jamais prise de la soirée, puis jamais prise sur certains boss, puis seulement moins que le top */
  const sev = m => m.never.length === m.n ? 3 : m.never.length ? 2 : 1;
  const rows = [...per.values()].filter(m => m.never.length || m.less.length).sort((a, b) => sev(b) - sev(a) || b.never.length - a.never.length || b.less.length - a.less.length || a.name.localeCompare(b.name, "fr"));
  const what = m => [m.never.length === m.n ? chip(`jamais prise sur la soirée (${m.n} boss)`, "bad") : m.never.length ? `<span title="${esc(m.never.join(", "))}">${chip(`jamais prise sur ${m.never.length} boss sur ${m.n}`, "warn")}</span>` : "",
    m.less.length ? `<span title="${esc(m.less.join(", "))}">${chip(`moins que le top sur ${m.less.length} boss`, "warn")}</span>` : ""].join(" ");
  return `<div class="sechead"><h2>Potions de la soirée</h2><span class="muted small">Potions de combat (dégâts ou soins boostés, ex. Light's Potential) comparées au top de la spé, boss par boss, sur les boss tués ou d'au moins 3 pulls · potions de mana et de soin non comptées · sans pénalité sur la note · survole un badge pour les boss</span></div><section class="card">${rows.length
    ? table([{ l: "Joueur" }, { l: "Potions de combat" }], rows.map(m => [{ h: pl(m.name, m.cls, m.role), v: m.name }, { h: what(m), v: m.never.length * 10 + m.less.length }]), "sortable")
    : '<p class="good">Tout le monde prend ses potions de combat comme le top.</p>'}</section>`;
}

/* Statut de l'analyse : une pastille (vert Clôturé, orange En cours, rouge En échec) ; le détail est dans l'infobulle */
function banners() {
  const a = X.auto_update, c = X.completeness, hm = t => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const missing = c && !c.complete ? [c.missing ? `${c.missing} partie(s) manquante(s)` : "", c.requests_missing ? `${c.requests_missing} requête(s) non chargée(s)` : "", c.stale ? `${c.stale} donnée(s) d'un cache expiré` : ""].filter(Boolean).join(", ") : "";
  const failed = (X.failed || []).length;
  let st, label, info;
  if (a && a.active) { st = "warn"; label = "En cours"; info = `Mise à jour automatique${a.next ? `, prochaine vers ${hm(a.next)}` : ""}. ${a.live ? "Le rapport reçoit encore des pulls (vérification toutes les 10 min)." : "Des données manquent : nouvel essai après la remise à zéro du quota."}${missing ? " Manque : " + missing + "." : ""} La page se recharge toute seule quand tu ne la lis pas.`; }
  else if (failed || missing) { st = "bad"; label = "En échec"; info = `${failed ? `${failed} boss non analysé(s). ` : ""}${missing ? `Données incomplètes : ${missing}. ` : ""}Relance l'analyse${c && c.retry_in_min ? ` dans ${c.retry_in_min} min` : " plus tard"} : seules les données manquantes seront téléchargées.`; }
  else { st = "good"; label = "Clôturé"; info = "Toutes les données sont chargées et aucun pull n'a été ajouté depuis 1 h."; }
  return `<div class="astat" title="${esc(info)}"><span class="muted">Statut de l'analyse :</span><span class="apill ${st}"><i></i>${label}</span>${st !== "good" && a && a.active && a.next ? `<span class="muted small">prochaine mise à jour vers ${hm(a.next)}</span>` : ""}</div>`;
}
function footer() {
  return `<footer class="foot"><span>${ico("cal")}Rapport généré le ${timeFr(X.generated)}</span><span class="muted">Raid Analyzer, par Endloril &amp; Dalrkïra</span><span>${ico("sync")}${X.auto_update && X.auto_update.active ? "Mise à jour automatique en cours" : "Rapport clôturé"}${X.extension_version ? ` · v${esc(X.extension_version)}` : ""}</span>${(X.merged_from_previous || []).length ? `<span class="muted small" title="${esc(X.merged_from_previous.join(", "))}">Fiches reprises de l'analyse précédente (absentes de celle-ci) : ${X.merged_from_previous.length}</span>` : ""}</footer>`;
}

document.title = `${raidName()} — ${dateFr(X.report.raid_date)}`;
document.getElementById("app").innerHTML = header() + nav() + banners() + `<div class="rlay">${side()}<div class="rmain">${overview() + nightPage("all", "Tous les pulls de la soirée", "Note de chaque joueur sur chaque boss et moyenne de tous ses pulls de la soirée.", members(null)) + nightPage("kills", "Tous les kills de la soirée", "Note de chaque joueur sur les pulls tués uniquement.", membersKills(null)) + X.bosses.map(b => bossPage(b.key, b, bossMembers(b))).join("")}</div></div>` + footer();
