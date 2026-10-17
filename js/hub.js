/* Raid Analyzer : page d'accueil (index.html) : Soirées, Récap / Membres (#/recap), Méthode.
   Données : liste des soirées publiées, au format de rapports/index.json (voir docs/MAPPING.md, section Accueil).
   Chargée par rapports/index.js (window.RAPPORTS_INDEX, fonctionne sans serveur), sinon lue dans rapports/index.json. */

async function loadIndex() {
  if (window.RAPPORTS_INDEX) return window.RAPPORTS_INDEX;
  try { const r = await fetch("rapports/index.json?" + Date.now()); return r.ok ? await r.json() : []; } catch (e) { return []; }
}
const CC = c => clsColor(String(c || "").replace(/\s/g, ""));
const pname = p => `<td data-v="${esc(p.name)}"><span class="pdot" style="--cc:${CC(p.class)}"></span>${esc(p.name)}</td>`;
const nchip = (v, href, strong) => v == null ? '<td class="num" data-v="-1"><span class="muted">—</span></td>'
  : `<td class="num" data-v="${v}">${href ? `<a class="nlink" href="${esc(href)}" title="Voir le détail de cette note">` : ""}<span class="nchip ${lvl(v)}${strong ? " strong" : ""}">${fr(v)}</span>${href ? "</a>" : ""}</td>`;
/* Lien vers le détail d'une note dans le rapport : #go=m|joueur ou #go=p|clé du boss|joueur|rôle (géré par js/app.js) */
const golink = (file, ...parts) => file ? file + "#go=" + encodeURIComponent(parts.join("|")) : null;
const avg = a => { const v = a.filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : null; };

/* ---------- Soirées ---------- */
/* Soirée = jour : toutes les entrées de l'index du même jour (autre raid, autre difficulté…) sont affichées ensemble */
const dayKey = ms => ms ? new Date(ms).toDateString() : "?";
let sel = 0;
function tile(b, file) {
  if (!b.tried) return `<div class="btile off" hidden>${ban(TILE_HUE, initials(b.name), bossImg(b.name))}<div class="bt"><h3>${esc(b.name)}</h3>${st("none")}<hr><p class="bf">Pas tenté cette soirée.</p></div></div>`;
  const body = b.kills ? '<p class="bf">Boss vaincu cette soirée.</p>' : `<div class="big">${fr(b.best_pct)} %</div><p class="bf">PV restants au plus bas</p>`;
  return `<a class="btile" href="${esc(file)}#${esc(b.key)}">${ban(TILE_HUE, initials(b.name), bossImg(b.name))}<div class="bt"><h3>${esc(b.name)}</h3>${b.kills ? st("kill") : '<span class="st best"><i>◎</i>Meilleure tentative</span>'}<hr>${body}</div></a>`;
}
const BEST_ROLES = [["Meilleur tank", q => q.role === "tank"], ["Meilleur healer", q => q.role === "healer"], ["Meilleur DPS mêlée", q => q.role === "dps" && q.sub === "melee"], ["Meilleur DPS distance", q => q.role === "dps" && q.sub !== "melee"]];
/* Entrées de l'index groupées par jour, entrées du jour sélectionné (ordre chronologique), sélecteur de soirée (si plus d'un jour) */
const byDay = list => [...list.reduce((m, e) => m.set(dayKey(e.raid_date), [...(m.get(dayKey(e.raid_date)) || []), e]), new Map()).values()];
const dayEntries = days => [...(days[sel] || days[0])].sort((a, b) => (a.raid_date || 0) - (b.raid_date || 0));
const carousel = days => days.length > 1 ? `<div class="car">${days.map((d, i) => `<button class="sc${i === sel ? " on" : ""}" data-i="${i}"><span>${esc(sday(d[0].raid_date))}</span><b>${esc([...new Set(d.map(e => e.zone || e.title))].join(" · "))}${d.length > 1 ? ` <small class="muted">(${d.length})</small>` : ""}</b><em class="${lvl(avg(d.map(e => e.note)))}">${fr(avg(d.map(e => e.note)))}</em></button>`).join("")}</div>` : "";
function soirees(list) {
  const days = byDay(list), cur = dayEntries(days), car = carousel(days);
  /* Une seule entrée : tout est ouvert. Plusieurs : seuls les bandeaux sont visibles, une flèche ouvre chaque carte */
  const many = cur.length > 1;
  return car + `<div class="panel">${cur.map(x => entryCard(x, many)).join("")}</div>`;
}
/* Carte d'une entrée de l'index : encadré du raid, meilleurs de l'entrée, progression des boss */
function entryCard(x, toggle = false) {
  const bs = x.bosses || [], k = bs.filter(b => b.kills).length, zone = x.zone || x.title;
  const diffs = [...new Set(bs.filter(b => b.tried).map(b => b.difficulty))].sort((a, b) => Object.keys(DIFF).indexOf(a) - Object.keys(DIFF).indexOf(b));
  const hero = `<section class="shero${toggle ? " tog" : ""}" data-href="${esc(x.file)}#auto" role="link" tabindex="0" title="Ouvrir le rapport complet">${ban(TILE_HUE, "", raidImg(zone))}<div class="hl"><div class="hd">${ico("cal")}${dateFr(x.raid_date)}</div>
    <h2 class="htitle">${titleDiff(zone, diffs)}</h2><div class="hs">${SKULL("hskull")}${k} boss vaincu${k > 1 ? "s" : ""} <b>·</b> ${x.pulls ?? "?"} pulls</div></div>
    <div class="hr"><div class="hk">Note du raid${x.partial ? ` <span class="partial" title="${esc(partialTitle())}">(partielle)</span>` : ""}</div><div class="hn ${lvl(x.note)}">${fr(x.note)}<span>/10</span></div><div class="bar10 ${lvl(x.note)}"><i style="width:${(x.note ?? 0) * 10}%"></i></div><div class="hv ${lvl(x.note)}">${ico("trophy")}${esc(verdict(x.note))}</div></div>${toggle ? '<button class="etog" type="button" aria-expanded="false" title="Afficher le détail"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>' : ""}</section>`;
  /* Meilleur par rôle : note moyenne de la soirée, puis morts par pull (deaths / pulls, absent des anciens index), puis pulls */
  const dpp = q => q.deaths != null && q.pulls ? q.deaths / q.pulls : null;
  const pl = [...(x.players || [])].sort((a, b) => (b.note ?? 0) - (a.note ?? 0) || (dpp(a) ?? 0) - (dpp(b) ?? 0) || (b.pulls ?? 0) - (a.pulls ?? 0));
  /* Même cadre que la vue d'ensemble du rapport en ligne : icône de classe, nom (couleur de classe), rôle + note, pulls · morts/pull ; cartes alignées à gauche */
  const cls = q => String(q.class || "").replace(/\s/g, "");
  const bestc = BEST_ROLES.map(([l, ok]) => { const q = pl.find(ok); if (q && pl.filter(ok).some(x => x.partial)) return `<div class="pod best"><div class="plbl">${ico("trophy")}${l}</div><div class="pn muted" title="${esc(partialTitle())}">Non élu</div><small>notes partielles (données manquantes) : élu à la prochaine mise à jour</small></div>`; return q ? `<div class="pod best"><div class="plbl">${ico("trophy")}${l}</div>${clsic(cls(q), 44)}
    <div class="pn" style="--cc:${CC(q.class)}">${esc(q.name)}</div><div class="pr">${rolic(roleKey(q.role, q.sub))} <b>${fr(q.note)}/10</b>${pmark(q.partial)}</div><small>${q.pulls ?? "?"} pulls</small></div>` : ""; }).join("");
  const best = bestc ? `<section class="inner"><div class="sechead"><h2>${ico("trophy")}Les meilleurs de la soirée</h2><span class="muted small">Par rôle : note moyenne de tous leurs pulls de la soirée</span></div><div class="podium bestg">${bestc}</div></section>` : "";
  return `<article class="entry${toggle ? " closed" : ""}">${hero}<div class="ebody"><div>${best}<section class="inner"><div class="sechead"><h2>${SKULL()}Progression des boss</h2><div class="leg"><span><i class="d kill"></i>Vaincu</span><span><i class="d best"></i>Meilleure tentative</span></div></div>
    <div class="bgrid">${bs.map(b => tile(b, x.file)).join("")}</div></section></div></div></article>`;
}

/* ---------- Récapitulatif ---------- */
let bsel = null;
function recap(list) {
  const L = [...list].sort((a, b) => (a.raid_date || 0) - (b.raid_date || 0));
  const names = new Map(); for (const e of L) for (const p of e.players || []) if (!names.has(p.name)) names.set(p.name, p);
  const rows = [...names.values()].map(p => { const v = L.map(e => (e.players || []).find(x => x.name === p.name)?.note ?? null); return { p, v, a: avg(v), n: v.filter(x => x != null).length }; }).sort((a, b) => (b.a ?? -1) - (a.a ?? -1));
  const t1 = `<section class="inner"><div class="sechead"><h2>Note des joueurs, soirée par soirée</h2><span class="muted small">${L.length} soirée${L.length > 1 ? "s" : ""} · moyenne des soirées où le joueur était présent · clique une note pour son détail, un en-tête pour trier</span></div>
    <div class="tw"><table class="rtab sortable"><thead><tr><th>Joueur</th>${L.map(e => `<th class="num" title="${esc(e.zone || e.title)}">${esc(sday(e.raid_date))}</th>`).join("")}<th class="num">Moyenne</th><th class="num">Soirées</th></tr></thead>
    <tbody>${rows.map(r => `<tr>${pname(r.p)}${r.v.map((v, i) => nchip(v, golink(L[i].file, "m", r.p.name))).join("")}${nchip(r.a, null, true)}<td class="num" data-v="${r.n}">${r.n}</td></tr>`).join("")}</tbody></table></div></section>`;
  const order = []; for (const e of [...L].reverse()) for (const b of e.bosses || []) if (!order.includes(b.name)) order.push(b.name);
  const triedNames = order.filter(n => L.some(e => (e.bosses || []).some(b => b.name === n && b.tried)));
  if (!bsel || !triedNames.includes(bsel)) bsel = triedNames[0];
  let t2 = `<section class="inner"><div class="sechead"><h2>Par boss</h2><span class="muted small">Basé sur tous les rapports publiés · clique une note pour son détail</span></div>`;
  if (!triedNames.length) return `<div class="panel">${t1}${t2}<p class="muted">Aucun boss tenté pour l'instant.</p></section></div>`;
  t2 += `<div class="bpills">${order.map(n => { const ok = triedNames.includes(n), k = L.some(e => (e.bosses || []).some(b => b.name === n && b.kills)); return `<button class="bp${n === bsel ? " on" : ""}${ok ? "" : " off"}" data-b="${esc(n)}"${ok ? "" : " disabled"}><i class="d ${k ? "kill" : ok ? "best" : "none"}"></i>${esc(n)}</button>`; }).join("")}</div>`;
  const S = L.map(e => ({ e, b: (e.bosses || []).find(b => b.name === bsel && b.tried) })).filter(x => x.b);
  const pulls = S.reduce((a, x) => a + (x.b.pulls || 0), 0), kills = S.reduce((a, x) => a + (x.b.kills || 0), 0), fk = S.find(x => x.b.kills);
  const bests = S.filter(x => !x.b.kills && x.b.best_pct != null).map(x => x.b.best_pct);
  const kp = (v, l) => `<div class="mk"><b>${v}</b><span>${l}</span></div>`;
  t2 += `<div class="mkpi2">${kp(S.length, "soirée" + (S.length > 1 ? "s" : "") + " sur ce boss")}${kp(pulls, "pulls au total")}${kp(kills ? "✓ " + kills : "—", "kill" + (kills > 1 ? "s" : ""))}${kp(fk ? esc(sday(fk.e.raid_date)) : bests.length ? fr(Math.min(...bests)) + " %" : "—", fk ? "premier kill" : "meilleur essai")}</div>`;
  const bn = new Map(); for (const x of S) for (const p of x.b.players || []) if (!bn.has(p.name)) bn.set(p.name, p);
  const br = [...bn.values()].map(p => {
    const v = S.map(x => (x.b.players || []).find(y => y.name === p.name)?.note ?? null), w = S.map(x => (x.b.players || []).find(y => y.name === p.name)?.pulls ?? 0), tw = w.reduce((a, b) => a + b, 0);
    return { p, v, a: tw ? Math.round(S.reduce((a, x, i) => a + (v[i] ?? 0) * w[i], 0) / tw * 10) / 10 : null, t: tw };
  }).sort((a, b) => (b.a ?? -1) - (a.a ?? -1));
  t2 += `<div class="tw"><table class="rtab sortable"><thead><tr><th>Joueur</th>${S.map(x => `<th class="num">${esc(sday(x.e.raid_date))}<br><small class="muted">${x.b.kills ? "✓ vaincu" : fr(x.b.best_pct) + " %"} · ${x.b.pulls ?? "?"} pulls</small></th>`).join("")}<th class="num">Moyenne</th><th class="num">Pulls</th></tr></thead>
    <tbody>${br.map(r => `<tr>${pname(r.p)}${r.v.map((v, i) => nchip(v, S[i].b.key ? golink(S[i].e.file, "p", S[i].b.key, r.p.name, r.p.role || "") : golink(S[i].e.file, "m", r.p.name))).join("")}${nchip(r.a, null, true)}<td class="num" data-v="${r.t}">${r.t}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted small">Moyenne sur ce boss pondérée par le nombre de pulls de chaque soirée.</p></section>`;
  return `<div class="panel">${t1}${t2}</div>`;
}

/* ---------- Méthode (texte fixe) ---------- */
const METHODE = `<div class="panel mth"><section class="mflow">
  <div class="mstep"><b>1</b><div><h3>Un lien</h3><p>On colle le lien du rapport Warcraft Logs dans Claude.</p></div></div><i>→</i>
  <div class="mstep"><b>2</b><div><h3>Toute la soirée</h3><p>Chaque boss et chaque pull sont analysés, kills compris.</p></div></div><i>→</i>
  <div class="mstep"><b>3</b><div><h3>Mise à jour seule</h3><p>Nouveaux pulls et données manquantes ajoutés jusqu'à la clôture.</p></div></div></section>
  <div class="mgrid">
  <article class="mcard"><h3>📊 Note de strat</h3><p>Chaque joueur est comparé à la moyenne du raid sur le même pull, mécanique par mécanique. Un écart ne compte que s'il est régulier :</p>
    <div class="mkpi"><div><b>1,5×</b><span>la moyenne du raid</span></div><div><b>30 %</b><span>des pulls au moins</span></div><div><b>1 %</b><span>des dégâts subis</span></div></div>
    <p class="muted small">Pénalités plafonnées à 2,5 points par mécanique ; note de 1 à 10.</p></article>
  <article class="mcard"><h3>✂️ Ce qui est gardé d'un wipe</h3><p>Le pull est analysé jusqu'à l'événement qui le cause, plus le fail suivant. La suite n'est reprochée à personne.</p>
    <div class="mline"><span>Pull</span><i></i><span class="hit">2e mort, tank non relevé ou 1er fail majeur</span><i></i><span class="hit">fail suivant</span><i class="off"></i><span class="off">ignoré</span></div></article>
  <article class="mcard"><h3>💀 Morts</h3><p>Signalé quand un joueur meurt nettement plus que le raid, régulièrement.</p>
    <div class="mkpi"><div><b>2×</b><span>le raid, sur 3 pulls</span></div><div><b>1,25×</b><span>pour un tank, sur 2 pulls</span></div></div><p class="muted small">Ne comptent pas dans la survie : les morts après l'appel du wipe (cascade de fin de pull) et les morts sans aucun soin reçu des healers dans les 8 s quand le joueur s'est protégé (défensif, potion ou healthstone), sauf sur une mécanique à éviter.</p></article>
  <article class="mcard"><h3>🎯 Gameplay et stuff</h3><p>Healers, DPS et tanks sont comparés aux meilleurs logs mondiaux de leur spé, sur le même boss et la même difficulté.</p>
    <p class="small"><b>Note d'un fight</b> = moyenne pondérée de catégories notées sur 10, selon le rôle. DPS : strat, dégâts, survie, gameplay. Healer : strat, soins, survie, gameplay (poids 1), dégâts (poids 0,25). Tank : strat, mitigation et survie, gameplay (poids 1), dégâts et soins (poids 0,5). Les morts comptent dans la survie, pas dans la strat.</p>
    <p class="muted small">Buffs d'avant pull et bijoux exclus ; enchantements vérifiés par rapport au raid et au top.</p></article>
  <article class="mcard"><h3>🏆 Classements</h3><p>Pour chaque boss et pour toute la soirée : meilleur tank, meilleur healer, meilleur DPS mêlée et meilleur DPS distance.</p>
    <p class="muted small">Soirée : note moyenne de tous les pulls de chaque joueur, puis morts par pull.</p></article>
  <article class="mcard"><h3>🔄 Mise à jour</h3><p>Pendant et après la soirée, le rapport se complète tout seul.</p>
    <ul class="small"><li>Données manquantes : nouvel essai après la remise à zéro du quota.</li><li>Pulls en cours : vérification toutes les 10 min.</li><li>Clôturé quand tout est chargé et qu'aucun pull n'a été ajouté depuis 1 h.</li></ul></article>
  </div></div>`;

/* ---------- Montage et navigation (#/, #/recap, #/methode) ; menu du haut : topNav() (ui.js) ---------- */
let LIST = [];
function shell(list) {
  const g = list.find(x => x.guild), n = new Set(list.map(e => dayKey(e.raid_date))).size, s = n > 1 ? "s" : "";
  const live = list.find(x => x.auto), last = Math.max(0, ...list.map(x => x.generated || 0));
  const sync = live ? "mise à jour en cours" + (live.next_update ? ` (prochaine vers ${new Date(live.next_update).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : "") : last ? timeFr(last) : "—";
  if (g) document.title = "Rapports de raid — " + g.guild;
  return header(g ? `&lt;${esc(g.guild)}&gt;${g.server ? " · " + esc(g.server) : ""} — analyses Warcraft Logs générées par Raid Analyzer et mises à jour automatiquement.` : undefined) +
    topNav() + `<div id="view"></div>
    <footer class="foot"><span>${ico("cal")}${n} soirée${s} publiée${s}</span><span class="muted">Raid Analyzer, par Endloril &amp; Dalrkïra</span><span>${ico("sync")}Dernière synchronisation : ${sync}</span></footer>`;
}
function route() {
  const r = location.hash.replace(/^#/, "") || "/", v = document.getElementById("view");
  document.querySelectorAll(".pnav [data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === r));
  if (r === "/methode") v.innerHTML = METHODE;
  else if (!LIST.length) v.innerHTML = '<p class="muted">Aucun rapport publié pour l\'instant.</p>';
  else v.innerHTML = r === "/recap" ? recap(LIST) : soirees(LIST);
}
document.addEventListener("click", e => {
  const b = e.target.closest(".sc"); if (b) { sel = +b.dataset.i; route(); return; }
  const q = e.target.closest(".bp"); if (q && !q.disabled) { bsel = q.dataset.b; route(); return; }
  const t = e.target.closest(".etog");
  if (t) { const open = t.closest(".entry").classList.toggle("closed") === false; t.setAttribute("aria-expanded", open); t.title = open ? "Masquer le détail" : "Afficher le détail"; return; }
  const h = e.target.closest(".shero[data-href]"); if (h) location.href = h.dataset.href; /* encadré du raid cliquable, sauf la flèche : ouvre la fiche d'un boss (#auto) */
});
document.addEventListener("keydown", e => { const h = e.target.closest?.(".shero[data-href]"); if (h && e.target === h && e.key === "Enter") location.href = h.dataset.href; });
addEventListener("hashchange", route);
loadIndex().then(list => {
  LIST = [...list].sort((a, b) => (b.raid_date || 0) - (a.raid_date || 0));
  document.getElementById("app").innerHTML = shell(LIST);
  route();
});
