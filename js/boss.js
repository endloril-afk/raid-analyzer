/* Raid Analyzer : page d'un boss, lue depuis un boss de l'export (RaidExportBoss, docs/raid-analyzer.d.ts).
   Chaque entrée de `views` (tous les pulls, puis un pull) est déjà calculée par l'export : la page l'affiche telle quelle. */

/* ---------- Raid : composants ---------- */
function rings(roles) {
  return `<div class="rings">${roles.map(r => {
    if (r.partial) return `<div class="ring" title="${esc(partialTitle())}"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><text x="40" y="45" text-anchor="middle">—</text></svg><b>${esc(r.label)}</b><small>${r.partial} note(s) partielle(s) sur ${r.players}</small></div>`;
    const c = 2 * Math.PI * 34, col = r.avg >= 8 ? "var(--good)" : r.avg >= 6 ? "var(--warn)" : "var(--bad)";
    return `<div class="ring" title="${esc(r.label)} : note moyenne ${fr(r.avg)}/10 sur ${r.players} joueur(s)"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" style="stroke:${col}" stroke-dasharray="${(c * r.pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle">${r.pct}%</text></svg><b>${esc(r.label)}</b><small>${fr(r.avg)}/10 · ${r.players} joueur(s)${r.partial ? ` · <span title="${esc(partialTitle())}">${r.partial} note(s) partielle(s)</span>` : ""}</small></div>`;
  }).join("")}</div>`;
}
const AVOID_T = "Part des dégâts évitables : part du total des dégâts évitables pris par tout le raid que ce joueur a prise. Plus c'est bas, mieux c'est.";
function podium(ranking) {
  const medals = ["🥇", "🥈", "🥉"];
  const pods = ranking.slice(0, 5).map((p, i) => `<div class="pod p${i + 1}">${i < 3 ? `<div class="medal">${medals[i]}</div>` : `<div class="medal num">${i + 1}</div>`}
    ${clsic(p.class, 44)}<div class="pn" style="--cc:${clsColor(p.class)}">${esc(p.player)}</div>
    <div class="pr">${rolic(roleKey(p.role, p.sub))} <b>${fr(p.score)}/10</b>${pmark(p.partial)}</div>
    <small>${[p.avoidable_pct ? `<span title="${esc(AVOID_T)}">${pct(p.avoidable_pct)} des dégâts évitables</span>` : ""].filter(Boolean).join(" · ") || "&nbsp;"}</small></div>`).join("");
  const full = table([{ l: "#", num: 1 }, { l: "Joueur" }, { l: "Note du fight", num: 1 }, { l: "Strat", num: 1 }, { l: "Morts / pull", num: 1 }, { l: "Part des dégâts évitables", num: 1, title: AVOID_T }],
    ranking.map(p => [{ h: p.rank, v: p.rank }, { h: pl(p.player, p.class, p.role, p.sub), v: p.player }, { h: fr(p.score), v: p.score }, { h: p.strat != null ? fr(p.strat) : "–", v: p.strat ?? "" }, { h: fr(p.deaths_per_pull, 2), v: p.deaths_per_pull }, { h: pct(p.avoidable_pct), v: p.avoidable_pct ?? "" }]));
  return card("Top 5 du fight", `${ranking.some(p => p.partial) ? '<p class="banner small"><b>Notes partielles</b> : le gameplay ou les références du top manquent pour certains joueurs (quota de l\'API). Pas de podium tant que les notes sont incomplètes : il sera établi à la prochaine mise à jour.</p>' : ""}${ranking.some(p => p.partial) ? "" : `<div class="podium">${pods}</div>`}${muted("Classement sur la note du fight (strat, survie, dégâts ou soins, gameplay), tous rôles confondus. À note égale, la survie départage, puis les morts par pull et la part des dégâts évitables.")}<details${ranking.some(p => p.partial) ? " open" : ""}><summary>Classement complet (${ranking.length} joueurs)</summary>${full}</details>`);
}
function cause(c) {
  if (!c || !c.rows.length) return "";
  const top = c.rows[0];
  return card("Cause probable du wipe", muted(`Pour chaque mécanique, dégâts pris par joueur et par minute, comparés à ${c.kills} kill(s) du même boss${c.guilds.length ? ` (${esc(c.guilds.join(", "))})` : ""}. Score = part des kills qui ont fait aussi mal ou pire que vous : 0/100 = pire que tous les kills, la mécanique fait probablement wipe.`) +
    `<p><b>À travailler en priorité :</b> ${sp(top.name, top.icon, 18, true, top.spell_id)} ×${fr(top.ratio)}</p>` +
    `<details><summary>Détail par mécanique (${c.rows.length})</summary>${table([{ l: "Mécanique" }, { l: "Vous (/joueur/min)", num: 1 }, { l: "Kills (/joueur/min)", num: 1 }, { l: "Ratio", num: 1 }, { l: "Score", num: 1 }],
      c.rows.map(r => [{ h: sp(r.name, r.icon, 18, true, r.spell_id), v: r.name }, { h: short(r.ours), v: r.ours }, { h: short(r.kills), v: r.kills }, { h: fr(r.ratio), v: r.ratio }, { h: chip(r.score + "/100", r.score >= 60 ? "good" : r.score >= 30 ? "warn" : "bad"), v: r.score }]))}</details>`);
}
function filterPulls(pulls) {
  return `<details class="card"><summary>Filtrage des pulls : où chaque pull a été coupé</summary>${muted("Un wipe est analysé jusqu'à l'événement qui le cause : 2e mort, mort d'un tank non rez, ou 1er fail majeur sur une mécanique. Ce qui suit n'est pas compté. Wipe appelé : la cascade de morts de la fin du pull (3 morts ou plus à moins de 10 s d'intervalle) ne compte dans la survie de personne, pour ne pas avantager ceux qui reset sans mourir.")}
    ${table([{ l: "Pull", num: 1 }, { l: "Résultat" }, { l: "Boss %", num: 1 }, { l: "Coupé à" }, { l: "Morts", num: 1 }, { l: "Durée (s)", num: 1 }, { l: "Gardé (s)", num: 1 }],
      pulls.map(p => [{ h: p.pull, v: p.pull }, p.result, { h: fr(p.boss_pct), v: p.boss_pct }, p.cut_reason + (p.wipe_call_s != null ? ` · wipe appelé vers ${mmss(p.wipe_call_s)} (${p.wipe_call_deaths} morts non comptées)` : ""), p.deaths, { h: p.duration_s, v: p.duration_s }, { h: p.kept_s, v: p.kept_s }]))}</details>`;
}
const ROLE_FR = { tank: "Tank", healer: "Heal", dps: "DPS", melee: "Mêlée", ranged: "Distance" };
function mechCards(r) {
  const cards = r.flagged_mechanics.map(m => `<article class="card mech"><header>${sp(m.name, m.icon, 40, false, m.spell_id)}<div class="mt"><h3>${esc(m.name)}</h3><div>${chip(esc(m.category_label))}</div></div></header>
    <p class="advice">${esc(m.advice)}</p>${m.assigned_soakers && m.assigned_soakers.length ? `<p class="small"><b>Équipe de soak détectée</b> (les ${m.assigned_soakers.length} joueurs qui prennent le plus la mécanique) : <b>${m.assigned_soakers.map(esc).join(", ")}</b>. Tout autre joueur qui la prend est en faute.</p>` : ""}<table class="flag"><thead><tr><th>Joueur</th><th class="num">${m.intruders ? "Fautes" : "Dégâts vs raid"}</th><th class="num">${m.intruders ? "Pulls" : "Régularité"}</th><th class="num">Dégâts / pull</th></tr></thead><tbody>` +
    m.above.map(x => `<tr><td>${esc(x.player)} <span class="muted small">${ROLE_FR[x.role] || esc(x.role)}</span></td><td class="num"><b class="bad">+${x.pct} %</b></td><td class="num">${x.pulls_above}/${x.pulls} pulls</td><td class="num">${short(x.damage_per_pull)}</td></tr>`).join("") +
    (m.low_soak || []).map(x => `<tr><td>${esc(x.player)} <span class="muted small">${ROLE_FR[x.role] || esc(x.role)} · soake trop peu</span></td><td class="num"><b class="warn">${x.pct} %</b></td><td class="num">${x.pulls} pulls</td><td class="num">${short(x.damage_per_pull)}</td></tr>`).join("") +
    (m.intruders || []).map(x => `<tr><td>${esc(x.player)} <span class="muted small">${ROLE_FR[x.role] || esc(x.role)} · ${m.any_hit ? "touché" : "soak hors équipe assignée"}</span></td><td class="num"><b class="bad">${x.hits} ${m.any_hit ? "coup(s)" : "soak(s)"}</b></td><td class="num">${x.pulls_hit}/${x.pulls} pulls</td><td class="num">${short(x.damage_per_pull)}</td></tr>`).join("") +
    `</tbody></table>${m.any_hit ? muted("Chaque coup reçu compte comme une faute : la mécanique ne doit toucher personne.") : ""}${muted(`Moyenne du raid : ${short(m.raid_avg_damage_per_pull)} de dégâts par joueur et par pull · mécanique présente sur ${m.pulls_with_mechanic} pulls.`)}</article>`).join("");
  const all = r.mechanics.filter(m => m.all.length).map(m => {
    const nf = m.all.filter(x => x.flagged).length;
    return `<details><summary>${sp(m.name, m.icon, 16, false, m.spell_id)} <b>${esc(m.name)}</b> <span class="muted small">${esc(m.category_label)} · ${m.all.length} joueur(s) concerné(s) · ${nf ? nf + " signalé(s)" : "personne de signalé"}</span></summary>
    ${table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Écart vs raid", num: 1 }, { l: "Dégâts / pull", num: 1 }, { l: "Au-dessus", num: 1 }, { l: "Coups", num: 1 }, { l: "Statut" }],
      m.all.map(x => [x.player, ROLE_FR[x.role] || x.role, { h: `${x.pct > 0 ? "+" : ""}${x.pct} %`, v: x.pct }, { h: short(x.damage_per_pull), v: x.damage_per_pull }, `${x.pulls_above}/${x.pulls}`, x.hits,
        { h: x.team ? chip("équipe de soak", "good") : x.flagged ? chip(m.intruders ? (m.any_hit ? "touché" : "hors équipe") : "au-dessus", "bad") : x.minor ? chip("léger", "warn") : chip("dans la moyenne", "good"), v: x.flagged ? 2 : x.minor ? 1 : 0 }]))}</details>`;
  }).join("");
  const g = r.global;
  return dispelCard(r.special && r.special.dispel) + (cards ? `<div class="cards">${cards}</div>` : muted("Aucune mécanique ne fait ressortir un joueur de façon régulière.")) +
    (g.mechanics_clean.length ? muted(`Personne au-dessus du raid sur : ${esc(g.mechanics_clean.join(", "))}.`) : "") +
    (g.mechanics_not_in_log.length ? muted(`Absentes du log : ${esc(g.mechanics_not_in_log.join(", "))}.`) : "") +
    (all ? `<section class="card allmech"><h3>Récapitulatif de tout le raid par mécanique</h3>${muted("Clique sur une mécanique pour voir les joueurs, y compris ceux qui la font bien. Écart = dégâts subis par pull comparés à la moyenne du raid.")}${all}</section>` : "") +
    interruptsCard(r.extras.interrupts) + soaksCard(r.extras.soaks);
}
/* Debuff à dispel au bord de la salle (special.dispel) */
function dispelCard(d) {
  if (!d) return "";
  return `<div class="cards"><article class="card mech wide"><header>${sp(d.label, d.icon, 40, false, d.spell_id)}<div class="mt"><h3>${esc(d.label)} — dispels au bord</h3><div>${chip(`${d.total} debuffs · ${d.phases} phases`)}</div></div></header>
    <p class="advice">Le porteur rejoint le bord, puis un healer le dispel. En tort : le porteur qui met plus de ${d.late_s} s à rejoindre le bord (ses dégâts élevés ne comptent que dans ce cas : s'il était au bord à temps, l'attente vient du dispel), le healer qui dispel alors que le joueur est encore loin du bord (on tolère un joueur presque au bord ou qui y arrive), le healer qui ne dispel personne sur une phase. Les phases où un healer est dans le puits ne lui sont pas reprochées, et une phase n'est exigée que s'il y a assez de debuffs pour tous les healers disponibles. ${d.short_phases ? `${d.short_phases} phase(s) avec moins de healers disponibles que de debuffs : des dispels tardifs y sont normaux. ` : ""}Bord estimé à partir des positions des joueurs (${d.positions}/${d.total} debuffs avec positions). Dégâts moyens par debuff : ${short(d.mean_dmg)}.</p>
    <h4>Porteurs</h4>${table([{ l: "Joueur" }, { l: "Debuffs", num: 1 }, { l: "Délai moyen pour atteindre le bord (s)", num: 1, title: "Temps entre la réception du debuff et l'arrivée au bord de la salle." }, { l: "Délai moyen avant dispel (s)", num: 1 }, { l: "En retard", num: 1 }, { l: "Dégâts élevés", num: 1 }, { l: "Dégâts / debuff", num: 1 }],
      d.carriers.map(c => [c.player, c.apps, { h: num(c.reach_avg), v: c.reach_avg ?? "" }, { h: num(c.dispel_avg), v: c.dispel_avg ?? "" }, { h: c.late ? chip(c.late, "bad") : "0", v: c.late }, c.high, { h: short(c.dmg_avg), v: c.dmg_avg }]))}
    <h4>Healers</h4>${table([{ l: "Healer" }, { l: "Dispels", num: 1 }, { l: "Part (%)", num: 1 }, { l: "Trop tôt (loin du bord)", num: 1 }, { l: "Phases", num: 1 }, { l: "Phases sans dispel", num: 1 }, { l: "Excusées", num: 1 }],
      d.healers.map(h => [h.player, h.dispels, h.share, { h: h.early ? chip(h.early, "bad") : "0", v: h.early }, h.phases, { h: h.missed ? chip(h.missed, "warn") : "0", v: h.missed }, h.excused]))}
    <details><summary>Liste des debuffs (${d.list.length})</summary>${table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "Porteur" }, { l: "Au bord au dispel" }, { l: "Délai bord (s)", num: 1 }, { l: "Durée (s)", num: 1 }, { l: "Dégâts", num: 1 }, { l: "Dispel par" }, { l: "" }],
      d.list.map(x => [x.pull, { h: mmss(x.time_s), v: x.time_s }, x.player, x.at_edge ? "oui" : "non", { h: num(x.reach_s), v: x.reach_s ?? "" }, x.dur_s, { h: x.high_dmg ? chip(short(x.dmg), "bad") : short(x.dmg), v: x.dmg }, x.dispeller || "—", { h: link(x.link), v: "" }]))}</details></article></div>`;
}
/* Interrupts (extras.interrupts) */
function interruptsCard(list) {
  if (!list || !list.length) return "";
  return card("Interrupts", list.map(i => `<div class="intr"><div>${sp(i.name, i.icon, 22, true, i.spell_id)} ${chip(i.kicked + " interrompus", "good")} ${i.missed ? chip(i.missed + " ratés", "bad") : ""}${i.by_healers ? ` ${chip(i.by_healers + " par des healers")}` : ""}</div><div class="who">${i.kickers.map(k => chip(`${esc(k.player)} · ${k.n}`)).join(" ")}</div></div>`).join(""));
}
/* Soaks (extras.soaks) */
function soaksCard(list) {
  if (!list || !list.length) return "";
  return list.map(s => `<section class="card"><h3>${sp(s.name, s.icon, 22, true, s.spell_id)} — soaks</h3>${muted(`${s.soaks} soaks · ${fr(s.avg_soakers)} joueurs en moyenne par soak${s.team ? ` · équipes de ${s.team}` : ""}. Participation = part des soaks où le joueur était dedans.`)}
    ${table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Dedans", num: 1 }, { l: "Participation", num: 1 }, { l: "Hors rôle", num: 1 }, { l: "Excusés", num: 1 }],
      s.players.map(x => [x.player, ROLE_FR[x.role] || x.role, { h: `${x.in}/${x.total}`, v: x.in }, { h: chip(x.rate + " %", x.rate >= 75 ? "good" : x.rate >= 50 ? "warn" : "bad"), v: x.rate }, x.offrole, x.excused]))}
    <details><summary>Chaque soak (${s.rows.length})</summary>${table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "Joueurs", num: 1 }, { l: "Qui" }, { l: "" }],
      s.rows.map(x => [x.pull, { h: mmss(x.time_s), v: x.time_s }, x.n, x.who.join(", "), { h: link(x.link), v: "" }]))}</details></section>`).join("");
}

/* Intermission (special.intermission) et éruptions (special.eruptions) */
function intermission(sp_) {
  const it = sp_.intermission;
  const opts = it.windows.map((w, i) => `<option value="${i}">Pull ${w.pull} — intermission ${w.inter}${w.stopped ? " (arrêtée)" : ""}${w.pairs.some(p => !p.ok) ? " ✗" : ""}</option>`).join("");
  const errs = it.errors.map(e => e.fail ? `<tr><td class="num">${e.pull}</td><td class="num">${e.inter}</td><td class="num">${mmss(e.time_s)}</td><td colspan="2"><b class="bad">Échec</b> — ${esc(e.fail)} (debuff expiré sans résolution)</td><td>${link(e.link)}</td></tr>` : `<tr><td class="num">${e.pull}</td><td class="num">${e.inter}</td><td class="num">${mmss(e.time_s)}</td><td>${esc(e.a)} <i class="muted">(${e.na ?? "?"})</i> + ${esc(e.b)} <i class="muted">(${e.nb ?? "?"})</i> = <b class="bad">${e.total}</b></td><td>${e.mover ? `<b>${esc(e.mover)}</b> est allé vers l'autre` : '<span class="muted">indéterminé</span>'}</td><td>${link(e.link)}</td></tr>`).join("");
  const map = it.windows.length ? `<section class="card"><h3>Mini-carte</h3>${muted("Positions des joueurs pendant l'intermission. Couleur = orbes de départ. Rond vert = bonne paire, croix rouge = paire erronée, nom en gras = celui qui est allé vers l'autre. Fais glisser le curseur ou lance la lecture.")}
      <div class="mapbar"><select class="mapsel">${opts}</select><button class="mapplay" type="button">▶ Lecture</button><input class="mapt" type="range" min="0" max="30" step="0.5" value="30"><span class="maptl">30 s</span></div>
      <div class="legend"><span><i style="background:#3b82f6"></i>1 orbe</span><span><i style="background:#10b981"></i>2 orbes</span><span><i style="background:#f59e0b"></i>3 orbes</span><span><i style="background:#9ca3af"></i>inconnu</span></div>
      <div class="map"></div><script type="application/json" class="mapdata">${JSON.stringify(it.windows.map(w => ({ traj: w.traj, initial: w.initial, pairs: w.pairs }))).replace(/</g, "\\u003c")}</script></section>` : "";
  const er = sp_.eruptions;
  const erup = er && er.list.length ? card(`Éruptions (${er.total})`, muted(`${er.caused} causée(s) par un joueur identifié, ${er.ambiguous} ambiguë(s).`) +
    table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "Responsable" }, { l: "Comment" }, { l: "Touchés" }, { l: "" }],
      er.list.map(e => [e.pull, { h: mmss(e.time_s), v: e.time_s }, e.causer, e.how, e.hit.join(", "), { h: link(e.link), v: "" }]))) : "";
  return `<div class="kpis">${kpi("Intermissions", it.total, `${it.stopped} arrêtée(s) à la 2e erreur`)}${kpi("Paires erronées", it.wrong, "comptées avant l'arrêt")}${kpi("Échecs", it.failures, "debuff expiré sans résolution")}</div>
    ${map}${it.errors.length ? `<section class="card"><h3>Erreurs à revoir</h3><div class="tw"><table class="flag"><thead><tr><th class="num">Pull</th><th class="num">Inter.</th><th class="num">Temps</th><th>Paire (orbes)</th><th>Qui a bougé</th><th></th></tr></thead><tbody>${errs}</tbody></table></div>
      ${muted("« Qui a bougé » : sur les 3 s avant le contact, celui qui s'est rapproché d'au moins 3 m et 1,5× plus que l'autre. Sinon : indéterminé.")}</section>` : ""}${erup}
    ${card("Par joueur", table([{ l: "Joueur" }, { l: "Intermissions", num: 1 }, { l: "Paires erronées", num: 1 }, { l: "Allé vers l'autre", num: 1 }, { l: "Échecs", num: 1 }, { l: "Résolution moy. (s)", num: 1 }, { l: "Éruptions causées", num: 1 }],
      sp_.players.map(r => [r.player, r.inters, r.wrong, r.moved, r.fails, { h: num(r.resolve_avg), v: r.resolve_avg ?? "" }, r.caused])))}`;
}
function playersRecap(players) {
  return card("Récapitulatif par joueur", muted("Strat sur 10 : 10 = aucune erreur régulière sur les mécaniques, 1 = gros souci. Les morts sont listées mais comptent dans la Survie (note du fight), pas dans la strat. Clique sur une colonne pour trier.") +
    table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Classe" }, { l: "Pulls", num: 1 }, { l: "Morts / pull", num: 1, title: "Morts avant la coupure du pull uniquement (les morts après la coupure ne comptent pas)" }, { l: "Points à améliorer" }, { l: "Strat", num: 1 }, { l: "Note du fight", num: 1 }],
      players.map(p => [{ h: pl(p.player, p.class, p.role, p.sub), v: p.player }, p.role_label, clsName(p.class), p.pulls, { h: fr(p.deaths_per_pull, 2) + (p.deaths_excused ? ` <small class="muted" title="Aucun soin reçu des healers dans les 8 s avant la mort alors que le joueur s'était protégé : voir la revue des morts">+${p.deaths_excused} excusée${p.deaths_excused > 1 ? "s" : ""}</small>` : ""), v: p.deaths_per_pull },
        { h: p.issues.map(i => `<span class="issue" title="${esc(i.kind)}">${i.icon ? sp(i.mechanic, i.icon, 16, false, i.spell_id) : ""}<b>${esc(i.mechanic)}</b> ${esc(i.text)} <i>${esc(i.detail)}</i></span>`).join("") || '<span class="muted">—</span>', v: p.issues.length },
        { h: chip(fr(p.score) + "/10", noteCls(p.score)), v: p.score }, { h: p.fight_score != null ? chip(fr(p.fight_score) + "/10", noteCls(p.fight_score)) + pmark(p.fight_partial) : "–", v: p.fight_score ?? -1 }])));
}
function deathsCard(deaths, g) {
  return card("Revue des morts", muted(`${g.deaths_kept} morts gardées (avant la coupe du pull, hors morts après l'appel du wipe) sur ${g.deaths_total}, dont <b>${deaths.filter(d => d.avoidable).length}</b> sans défensif récent${deaths.some(d => d.excused) ? ` et <b>${deaths.filter(d => d.excused).length}</b> excusée(s) : aucun soin reçu des healers dans les 8 s avant la mort, alors que le joueur s'était protégé (défensif ou potion / healthstone dans les 20 s, ou plus rien de disponible), sur une mécanique qui n'est pas à éviter (non comptées dans la survie)` : ""}.`) +
    table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "Joueur" }, { l: "Rôle" }, { l: "Tué par", title: "Coup fatal : la dernière capacité qui a infligé des dégâts au joueur (killing blow WCL), pas forcément celle qui a fait le plus de dégâts." }, { l: "Défensifs récents" }, { l: "Potion de soins / pierre" }, { l: "Défensifs non utilisés" }, { l: "Évitable" }, { l: "" }],
      deaths.map(d => [d.pull, { h: mmss(d.time_s), v: d.time_s }, d.player, ROLE_FR[d.role] || d.role, { h: sp(d.killer, d.killer_icon, 18, true, d.killer_id), v: d.killer },
        d.recent_def.length ? d.recent_def.join(", ") : "—", (d.heal_potion_used != null ? `potion : ${d.heal_potion_used ? "oui" : '<b class="bad">non</b>'} · pierre : ${d.stone_available === false ? '<span class="muted small">pas de Démoniste</span>' : d.healthstone_used ? "oui" : '<b class="bad">non</b>'}` : d.healthstone ? "oui" : "non"), d.unused_def.length ? d.unused_def.join(", ") : "—",
        { h: (d.avoidable ? chip("évitable", "bad") : chip("non", "good")) + (d.excused ? ` <span title="${esc(d.excused)}">${chip("excusée : aucun soin reçu", "warn")}</span>` : ""), v: d.avoidable ? 1 : 0 }, { h: link(d.link), v: "" }])));
}

/* Frise chronologique d'un pull (extras.timelines) */
function frise(t) {
  const dur = t.duration_s, W = 1100, L = 170, Rr = 1088, sx = s => L + Math.max(0, Math.min(s, dur)) / dur * (Rr - L);
  const phases = t.phases.filter(p => p.end > p.start && p.start < dur); /* phases incohérentes (fin avant début) ignorées */
  const casts = t.boss.filter(c => c.t && c.t.length), deaths = t.events.filter(e => e.kind === "mort");
  const errs = Object.entries(t.events.filter(e => e.kind !== "mort").reduce((a, e) => ((a[e.cat || e.kind] ||= []).push(e), a), {}));
  const rows = [["Phases", 26], ...casts.map(c => [c.name, 26]), ["Dégâts subis (raid)", 46], ["Morts", 30], ...errs.map(([c]) => ["Erreur : " + c, 30])];
  let y = 4; const Y = rows.map(([, h]) => { const o = y; y += h; return o; }); const H = y + 24, bottom = y;
  let s = `<svg class="frise" viewBox="0 0 ${W} ${H}">`;
  for (let m = 0; m * 60 <= dur; m++) s += `<line x1="${sx(m * 60)}" x2="${sx(m * 60)}" y1="8" y2="${bottom}" class="gl"/><text x="${sx(m * 60)}" y="${bottom + 18}" text-anchor="middle">${m}:00</text>`;
  rows.forEach(([l, h], i) => { s += `<text x="${L - 8}" y="${Y[i] + h / 2 + 4}" text-anchor="end" class="ll">${esc(l)}</text><line x1="${L}" x2="${Rr}" y1="${Y[i] + h}" y2="${Y[i] + h}" class="sep"/>`; });
  phases.forEach((p, k) => { s += `<g><title>${esc(p.name)} : ${mmss(p.start)} → ${mmss(Math.min(p.end, dur))}</title><rect x="${sx(p.start)}" y="${Y[0] + 4}" width="${sx(p.end) - sx(p.start)}" height="18" rx="3" class="ph ${p.inter ? "inter" : "p" + (k % 3 + 1)}"/><text x="${sx(p.start) + 4}" y="${Y[0] + 17}" class="pt">${esc(p.name)}</text></g>`; });
  casts.forEach((c, i) => c.t.filter(x => x <= dur).forEach(x => { s += `<g class="bc"><title>${esc(c.name)} à ${mmss(x)}</title><rect x="${sx(x)}" y="${Y[i + 1] + 6}" width="6" height="14" rx="2"/></g>`; }));
  const di = casts.length + 1, dy = Y[di], dh = 46, v = t.raid_damage.values, mx = Math.max(1, ...v), bin = t.raid_damage.bin_s;
  if (v.length) s += `<path class="rda2" d="M${L},${dy + dh}` + v.map((d, k) => `L${sx(k * bin).toFixed(1)},${(dy + dh - d / mx * (dh - 6)).toFixed(1)}`).join("") + `L${sx((v.length - 1) * bin)},${dy + dh}Z"/>`;
  const my = Y[di + 1];
  deaths.forEach((d, k) => { s += `<g class="fe mort${d.bad ? " bad" : ""}"><title>${mmss(d.t)} — Mort : ${esc(d.text)}</title><text x="${sx(d.t)}" y="${my + 14}" text-anchor="middle" class="sk">✖</text><text x="${sx(d.t)}" y="${my + 26}" text-anchor="${k % 2 ? "start" : "end"}" class="dn">${esc(d.text.split(" — ")[0])}</text></g>`; });
  errs.forEach(([, list], k) => { const ey = Y[di + 2 + k]; list.forEach(e => { s += `<g class="fe erreur"><title>${mmss(e.t)} — ${esc(e.text)}</title><circle cx="${sx(e.t)}" cy="${ey + 11}" r="5"/><text x="${sx(e.t)}" y="${ey + 26}" text-anchor="middle" class="dn">${esc(e.who || "")}</text></g>`; }); });
  if (t.cut_s != null && t.cut_s < dur) s += `<g><title>Après la coupe (${esc(t.cut_reason)}) : non compté dans l'analyse</title><rect x="${sx(t.cut_s)}" y="8" width="${Rr - sx(t.cut_s)}" height="${bottom - 8}" class="cutz"/><text x="${sx(t.cut_s) + 4}" y="${my + 10}" class="cutt">non compté</text></g>`;
  s += "</svg>";
  const evs = [...phases.map(p => [p.start, "Phase", p.name]), ...t.events.map(e => [e.t, e.kind === "mort" ? "Mort" : "Erreur", e.text])].sort((a, b) => a[0] - b[0]);
  return `<details class="tlw"><summary>Pull ${t.pull} · ${esc(t.result)} · ${mmss(dur)} · ${deaths.length} mort(s) · ${t.events.length - deaths.length} erreur(s)</summary>
    <div class="frisew">${s}</div><details class="evlist"><summary>Déroulé détaillé (${evs.length} événements)</summary>${table([{ l: "Temps", num: 1 }, { l: "Type" }, { l: "Détail" }], evs.map(e => [{ h: mmss(e[0]), v: e[0] }, e[1], e[2]]))}</details></details>`;
}
function chrono(timelines) {
  const fr_ = timelines.map(frise).join("").replace('<details class="tlw">', '<details class="tlw" open>');
  return card("Chronologie des pulls", `<div class="tlleg"><span><i class="k-ph"></i>Phases du combat</span><span><i class="k-bc"></i>Compétence du boss (un trait par lancer)</span><span><i class="k-dm"></i>Dégâts subis par le raid</span><span><b class="k-sk">✖</b>Mort</span><span><i class="k-er"></i>Erreur de mécanique, une ligne par type</span><span><i class="k-cut"></i>Après la coupe du pull : non compté</span></div>` +
    muted("Survole un élément pour le détail, ou ouvre « Déroulé détaillé » sous chaque pull pour la liste complète.") + fr_);
}
function prep(rows) {
  const f = (a, n, req) => ({ h: chip(`${a}/${n}`, a === n ? "good" : req ? "bad" : ""), v: a });
  return card("Préparation", muted("Flasque, nourriture, rune et huile d'arme lues au début de chaque pull (rune et huile : bonus, non exigées). Potions et healthstones : utilisations pendant les pulls (avant la coupe).") +
    table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Flasque" }, { l: "Nourriture" }, { l: "Rune" }, { l: "Huile d'arme" }, { l: "Potions", num: 1 }, { l: "Healthstones", num: 1 }, { l: "Manque" }],
      rows.map(r => [r.player, ROLE_FR[r.role] || r.role, f(r.flask, r.pulls, 1), f(r.food, r.pulls, 1), f(r.rune, r.pulls), f(r.oil, r.pulls), r.potion, r.healthstone,
        { h: r.missing.length ? r.missing.map(m => chip(esc(m), "bad")).join(" ") : chip("ok", "good"), v: r.missing.length }])));
}

/* Onglet Raid d'une vue (view.raid) */
function raidView(r, b = null, v = null) {
  const g = r.global, x = r.extras, w = g.wall;
  const [labels, panes] = raidLabelsPanes(r, b, v);
  return tabset(labels, panes);
}
/* Indicateurs du boss (pulls analysés, résultat, mur, données gardées) : au-dessus des onglets, seulement quand plusieurs
   pulls sont analysés et sur la vue « tous les pulls » (pour un pull ou un kill, ils n'apportent rien) */
function bossKpis(r) {
  const g = r.global, ex = new Set(g.resets_excluded || []);
  /* HP moyen du boss : vie du boss à la fin de chaque wipe analysé (resets exclus), en moyenne sur la soirée */
  const W = (r.pulls || []).filter(p => p.result !== "Kill" && !ex.has(p.pull) && !/^exclu/.test(p.cut_reason || "") && p.boss_pct != null);
  const avg = W.length ? W.reduce((a, p) => a + p.boss_pct, 0) / W.length : null;
  return `<div class="kpis">${kpi("Pulls analysés", g.pulls_analyzed, g.resets_excluded && g.resets_excluded.length ? `${g.resets_excluded.length} reset(s) exclu(s)` : g.pulls_total !== g.pulls_analyzed ? `sur ${g.pulls_total}` : undefined)}${g.kills ? kpi("Résultat", "Kill ✓", `${g.kills} kill(s)`) : ""}
    ${kpi("HP moyen du boss", avg != null ? fr(Math.round(avg * 10) / 10) + " %" : "—", avg != null ? `moyenne de fin des ${W.length} wipe(s) · meilleur pull : ${fr(g.best_pct)} %` : "aucun wipe analysé")}${kpi("Données gardées", fr(g.kept_minutes) + " min", `sur ${fr(g.total_minutes)} min de combat`)}</div>`;
}
function raidLabelsPanes(r, b, v) {
  const g = r.global, x = r.extras;
  const labels = ["Erreurs", "À retenir", "Mécaniques"], panes = [ b ? errorsView(b, v) : muted("Erreurs : vue indisponible."),
    cause(g.kills < g.pulls_analyzed ? x.wipe_cause : null) + card("Note du fight par rôle", rings(g.role_scores) + muted("Moyenne de la note du fight des joueurs de chaque rôle (strat, survie, dégâts ou soins, gameplay : les morts y comptent). Vert à partir de 80 %.")) +
    `<section class="card hero"><h2>À retenir</h2><ul>${g.key_points.map(k => `<li>${esc(k)}</li>`).join("")}</ul></section>` + filterPulls(r.pulls) +
    muted("Méthode : pour chaque mécanique, on compare les dégâts subis par chaque joueur à la moyenne du raid. Un joueur est signalé quand il prend nettement plus que les autres, sur plusieurs pulls."),
    mechCards(r)];
  if (r.special && r.special.intermission && INTERMISSION_BOSSES.includes(r.encounter)) { labels.push("Intermission"); panes.push(intermission(r.special)); }
  if (b && b.deep && b.deep.vashnik) { labels.push("Analyse Vashnik"); panes.push(vashnikView(b.deep.vashnik, v && v.key !== "all" && /^p\d+$/.test(v.key) ? +v.key.slice(1) : null)); }
  if (b && b.deep && b.deep.nymrissa) { labels.push("Analyse Nymrissa"); panes.push(nymrissaView(b.deep.nymrissa, v && v.key !== "all" && /^p\d+$/.test(v.key) ? +v.key.slice(1) : null)); }
  if (b && b.deep && b.deep.sszorak) { labels.push("Analyse Sszorak"); panes.push(sszorakView(b.deep.sszorak, v && v.key !== "all" && /^p\d+$/.test(v.key) ? +v.key.slice(1) : null)); }
  labels.push("Joueurs", "Morts", "Chronologie");
  panes.push(playersRecap(r.players), deathsCard(x.deaths, g), chrono(x.timelines));
  if (x.prep_available) { labels.push("Préparation"); panes.push(prep(x.prep)); }
  return [labels, panes];
}

/* ---------- Analyse détaillée de Vashnik (boss.deep.vashnik) : totems, Plague Froth, dispels, CC, morts, dégâts sur les adds ---------- */
/* Carte simulée d'une Plague Froth : animée par js/app.js (initVk) */
function vkMap(waves) {
  const W = waves.filter(w => w.map);
  if (!W.length) return "";
  return `<h4>Carte de la vague (simulation)</h4>${muted("Positions au moment où les Plague Froth explosent : porteurs (cercles dorés), raid (points), Vashnik (losange, simple repère). Chaque porteur envoie 4 vagues en croix, alignées sur les axes de la salle (haut, bas, gauche, droite de la carte), quelle que soit l'orientation du joueur : c'est la position du porteur qui vise le totem. Le log ne donne pas la position des totems : chaque totem détruit apparaît comme une graduation sur les branches, à la distance que la vague avait parcourue quand il est mort (le log ne dit pas quelle branche l'a cassé). Les totems détruits à l'explosion même (moins de 0,4 s) étaient sous un porteur.")}
    <div class="vkmap"><div class="mapbar"><select class="vksel">${W.map((w, i) => `<option value="${i}">Pull ${w.pull} — Plague Froth ${w.wave} (${mmss(w.burst_s)}) · ${w.totems_destroyed} totem(s)${w.after_cut ? " · après la coupure" : ""}</option>`).join("")}</select><button class="vkplay" type="button">▶ Lecture</button><input class="vkt" type="range" min="0" max="8" step="0.1" value="8"><span class="vktl">8 s</span></div>
    <div class="legend"><span><i style="background:#f59e0b"></i>porteur</span><span><i style="background:#9ca3af"></i>raid</span><span><i style="background:#f97316"></i>trait orange = un totem feu détruit</span><span><i style="background:#a78bfa"></i>trait violet = un totem ombre détruit</span></div>
    <p class="small muted">Les totems eux-mêmes n'apparaissent pas : le log ne donne pas leur position. Quand un totem meurt, on sait seulement à quelle distance la vague était arrivée. Ce trait est donc reporté en travers de chaque branche de chaque porteur, à cette distance : il y a plus de traits que de totems, et l'un d'eux seulement marque l'endroit où était le totem.</p>
    <div class="vkcanvas map"></div><script type="application/json" class="vkdata">${JSON.stringify(W.map(w => ({ ...w.map, carriers: w.carriers, alive: w.totems_alive }))).replace(/</g, "\\u003c")}</script></div>`;
}
/* vie moyenne du raid autour d'une vague de dispel : courbe, pop (rouge), dispels (bleu), CD de soin (vert) */
function hpSvg(w) {
  const P = w.hp; if (!P || P.length < 3) return "";
  const W = 320, H = 70, t0 = P[0][0], t1 = P[P.length - 1][0], x = t => 4 + (t - t0) / Math.max(1, t1 - t0) * (W - 8), y = v => H - 4 - Math.max(0, Math.min(100, v)) / 100 * (H - 12);
  const min = Math.min(...P.map(p => p[1]));
  let g = `<path d="M${P.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("L")}" fill="none" stroke="var(--acc)" stroke-width="2"/><line x1="4" x2="${W - 4}" y1="${y(50)}" y2="${y(50)}" stroke="var(--line)" stroke-dasharray="3 3"/>`;
  g += `<line x1="${x(w.start_s)}" x2="${x(w.start_s)}" y1="4" y2="${H - 4}" stroke="#ef4444"><title>Pop de l'infection ${mmss(w.start_s)}</title></line>`;
  for (const d of w.dispels || []) g += `<line x1="${x(d.time_s)}" x2="${x(d.time_s)}" y1="4" y2="${H - 4}" stroke="#60a5fa"><title>Dispel ${esc(d.healer)} → ${esc(d.target)} ${mmss(d.time_s)}</title></line>`;
  for (const c of w.cds_after || []) g += `<circle cx="${x(c.time_s)}" cy="10" r="4" fill="#22c55e"><title>${esc(c.healer)} : ${esc(c.spell)} ${mmss(c.time_s)}</title></circle>`;
  return `<div><svg viewBox="0 0 ${W} ${H}" class="hpz" style="width:320px;max-width:100%"><title>Vie moyenne du raid : minimum ${fr(min)} %</title>${g}</svg></div><small class="${min < 50 ? "bad" : min < 70 ? "warn" : "good"}">vie du raid au plus bas : ${fr(min)} %</small>`;
}
function vashnikView(vk, pull) {
  const P = x => pull == null || x.pull === pull;
  const pc = pull == null;
  const pcol = pc ? [{ l: "Pull", num: 1 }] : [], pv = x => pc ? [x.pull] : [];
  const t = vk.totems.filter(P), fr_ = vk.froth.filter(P), dw = vk.dispel_waves.filter(P), cc = vk.cc_hits.filter(P), de = vk.deaths.filter(P);
  const side = o => `<span class="vkf">feu ${o.feu}</span> · <span class="vko">ombre ${o.ombre}</span>`;
  const totems = card("1. Totems (Malignant Totem)", muted("Chaque vague de totems (tumeurs, 99 % de réduction de dégâts) apparaît d'un côté feu et d'un côté ombre. Il faut faire passer une vague verte dessus pour retirer la protection, puis le tuer avant l'Imbibe suivant, sinon il explose (Malignance).") +
    (t.length ? table([...pcol, { l: "Vague", num: 1 }, { l: "Apparition", num: 1 }, { l: "Détruits avant l'Imbibe" }, { l: "Restants à l'Imbibe" }, { l: "Imbibe", num: 1 }, { l: "Destructions (temps)" }],
      t.map(x => [...pv(x), x.wave, { h: mmss(x.spawn_s), v: x.spawn_s }, { h: `${x.destroyed.feu + x.destroyed.ombre}/${x.total} · ${side(x.destroyed)}`, v: x.destroyed.feu + x.destroyed.ombre },
        { h: x.pull_ended ? '<span class="muted small">pull fini avant</span>' : (x.exploded ? chip(`${x.exploded} explosent`, "bad") + " " + side(x.remaining) : chip("aucun", "good")), v: x.exploded },
        { h: x.imbibe_s != null ? mmss(x.imbibe_s) : "—", v: x.imbibe_s ?? 9999 }, x.deaths_s.map(mmss).join(" · ") || "—"])) : muted(`Phase des totems non atteinte dans la partie analysée${(vk.analyzed || []).filter(P).length ? ` (${vk.analyzed.filter(P).map(x => `pull ${x.pull} : ${x.s} s`).join(", ")})` : ""}.`)));
  const tSum = t.length ? `<p class="small"><b>Totems par Imbibe :</b> ${t.map(x => `${pc ? `pull ${x.pull}, ` : ""}Imbibe ${x.wave} : ${x.total} apparus · <b>${x.destroyed.feu + x.destroyed.ombre}</b> détruits${x.pull_ended ? " (pull fini avant l'Imbibe)" : x.exploded ? ` · <span class="bad">${x.exploded} encore en vie à l'Imbibe (explosent)</span>` : " · tous détruits avant l'Imbibe"}${x.after_cut ? ' <small class="muted">(après la coupure du pull)</small>' : ""}`).join(" ; ")}. Total : ${t.reduce((a, x) => a + x.destroyed.feu + x.destroyed.ombre, 0)}/${t.reduce((a, x) => a + x.total, 0)} détruits.</p>` : "";
  const froth = card("2. Plague Froth : qui va casser les totems ?", tSum + muted("Porteurs de chaque Plague Froth et distance parcourue pendant le debuff (6 s) : un porteur qui ne bouge pas (moins de 3 m) attend que les totems viennent à lui. Objectif = totems en jeu à casser avant l\'Imbibe suivant, répartis sur les vagues qui restent d\'ici là (une seule vague : tout casser). Le log ne dit pas quel porteur a cassé quel totem : le compte est collectif, pour tous les porteurs de la vague. Totems détruits = morts dans les 8 s après l\'explosion (hors totems qui explosent à l\'Imbibe). « Restants » = totems laissés aux Plague Froth suivantes, pas forcément à l\'Imbibe : le bilan à l\'Imbibe est la ligne « Totems par Imbibe ». Une vague après la coupure du pull (déjà perdu) n\'est pas jugée.") +
    (fr_.length ? table([...pcol, { l: "Plague Froth", num: 1 }, { l: "Explosion", num: 1 }, { l: "Porteurs (déplacement, totems touchés par leur vague)" }, { l: "Totems détruits" }, { l: "Objectif" }, { l: "Joueurs touchés par les vagues" }],
      fr_.map(x => [...pv(x), x.wave, { h: mmss(x.burst_s), v: x.burst_s }, { h: x.carriers.map(c => `<span class="${c.moved_m != null && c.moved_m < 3 && x.totems_alive ? "bad" : ""}">${esc(c.player)} ${c.moved_m != null ? fr(c.moved_m) + " m" : "—"}${c.opened ? ` <small class="${c.opened ? "good" : "muted"}">(${c.opened} totem${c.opened > 1 ? "s" : ""} touché${c.opened > 1 ? "s" : ""})</small>` : ""}</span>`).join(" · "), v: x.carriers.length },
        { h: x.totems_destroyed ? `${x.totems_destroyed}${x.totems_alive != null ? `/${x.totems_alive}` : ""} · ${side(x.by_side)}` : x.totems_alive === 0 ? '<span class="muted small">pas de totem en jeu</span>' : chip(`aucun${x.totems_alive ? ` sur ${x.totems_alive}` : ""}`, "warn"), v: x.totems_destroyed },
        { h: x.after_cut ? '<span class="muted small">après la coupure : non jugée</span>' : x.not_judged ? `<span class="muted small">${esc(x.not_judged)} : non jugée</span>` : x.goal == null ? '<span class="muted small">—</span>' : `${chip(x.enough ? `assez (${x.totems_destroyed}/${x.goal})` : `pas assez (${x.totems_destroyed}/${x.goal})`, x.enough ? "good" : "bad")}${x.left_after ? ` <small class="muted">${x.left_after} laissé${x.left_after > 1 ? "s" : ""} aux Plague Froth suivantes${x.imb_next != null ? ` (Imbibe à ${mmss(x.imb_next)})` : ""}</small>` : ""}`, v: x.goal == null ? -1 : x.enough ? 1 : 0 },
        { h: (x.wave_hits || []).length ? x.wave_hits.map(h => `${esc(h.player)} <small class="muted">${kk(h.damage)}${h.hits > 1 ? ` · ${h.hits} coups` : ""}</small>${h.died ? " ☠" : ""}`).join("<br>") : '<span class="good small">personne</span>', v: (x.wave_hits || []).reduce((a, h) => a + h.damage, 0) }])) : muted("Aucune Plague Froth dans la partie analysée : phase non atteinte.")) +
    vkMap(fr_) +
    (pc && vk.froth_players.length ? `<h4>Par joueur (soirée)</h4>${table([{ l: "Joueur" }, { l: "Plague Froth", num: 1 }, { l: "Immobile (< 3 m) avec totems en jeu", num: 1 }, { l: "Déplacement moyen", num: 1 }, { l: "Vagues avec totems détruits", num: 1 }, { l: "Vagues où l'objectif est atteint (collectif)" }, { l: "Touché par les vagues (soirée)", num: 1 }],
      vk.froth_players.map(x => [x.player, x.waves, { h: x.still ? chip(x.still, "bad") : "0", v: x.still }, { h: x.avg_moved_m != null ? fr(x.avg_moved_m) + " m" : "—", v: x.avg_moved_m ?? -1 }, `${x.waves_with_kills}/${x.waves}`,
        { h: x.totem_waves ? chip(`${x.totem_waves_ok}/${x.totem_waves} assez (${x.wave_destroyed}/${x.wave_goal} totems)`, x.totem_waves_ok === x.totem_waves ? "good" : x.totem_waves_ok ? "warn" : "bad") : '<span class="muted small">pas de totem en jeu</span>', v: x.totem_waves ? x.totem_waves_ok / x.totem_waves : -1 }, (() => { const h = (vk.wave_hits || []).find(y => y.player === x.player); return h ? { h: `${h.hits} coup${h.hits > 1 ? "s" : ""}, ${kk(h.damage)}${h.deaths ? ` · ☠ ${h.deaths}` : ""}`, v: h.damage } : { h: "—", v: 0 }; })()]))}` : ""));
  const hitsAll = pc && (vk.wave_hits || []).length ? card("Joueurs touchés par les vagues vertes (soirée)", muted("Coups de Plague Wave reçus par tout le raid (porteurs compris) : à éviter en s'écartant des 4 branches de chaque croix.") +
    table([{ l: "Joueur" }, { l: "Coups", num: 1 }, { l: "Dégâts", num: 1 }, { l: "Morts sur une vague", num: 1 }], vk.wave_hits.map(h => [esc(h.player), h.hits, { h: kk(h.damage), v: h.damage }, h.deaths ? chip(h.deaths, "bad") : "0"]))) : "";
  const disp = card("3-4. Vagues de dispel (Exploding Infection)", muted("Une vague = un pop d'infection feu (4 joueurs touchés ensemble). Pour chacune : porteurs (temps gardé, distance moyenne au reste du raid au moment du dispel), dispels (healer → cible, heure ; consigne : un par un, jamais deux à moins de 3 s), CD de soin lancés, et la vie moyenne du raid de 5 s avant le pop à 5 s après le dernier dispel.") +
    (dw.length ? table([...pcol, { l: "Vague", num: 1 }, { l: "Début", num: 1 }, { l: "Porteurs et vie du raid", title: "Courbe : vie moyenne du raid de 5 s avant le pop à 5 s après le dernier dispel. Trait rouge = pop, traits bleus = dispels, points verts = CD de soin." }, { l: "Dispel par (healer → cible, heure)" }, { l: "CD de soin après" }],
      dw.map(w => [...pv(w), w.wave, { h: mmss(w.start_s) + (w.after_cut ? ' <small class="muted">après la coupure</small>' : "") + (w.too_close ? `<br>${chip(`${w.too_close} dispels en ${fr(w.span_s)} s : un par un !`, "bad")}` : "") , v: w.start_s }, { h: ((w.targets || []).length ? `<small>${w.targets.map(t => `${esc(t.player)} ${fr(t.held_s)} s${t.dist_m != null ? `, <span class="${t.dist_m < 15 ? "bad" : t.dist_m < 25 ? "warn" : "good"}">${fr(t.dist_m)} m du raid</span>` : ""}`).join("<br>")}</small>` : "") + hpSvg(w) || "—" }, { h: w.dispels.map(d => `<b>${esc(d.healer)}</b> → ${esc(d.target)} <code>${mmss(d.time_s)}</code>`).join("<br>"), v: w.dispels.length },
        { h: w.cds_after.length ? w.cds_after.map(c => `${esc(c.healer)} : ${sp(c.spell, c.icon, 18, true, c.spell_id)} <code>${mmss(c.time_s)}</code>`).join("<br>") : '<span class="bad small">aucun</span>', v: w.cds_after.length }])) : muted("Aucun dispel d'Exploding Infection sur cette vue.")) +
    ((vk.dispel_pull_missing || []).filter(P).filter(x => x.healers.length).map(x => `<p class="small">${pc ? `Pull ${x.pull} : ` : ""}healer(s) sans aucun dispel sur le pull : ${x.healers.map(n => chip(esc(n), "warn")).join(" ")}</p>`).join("")));
 const ih = (vk.infection_held || []).filter(P), fk = (vk.fire_kills || []).filter(P);
  const infc = card("Infection feu (gros cercle orange)", muted("Consigne : partir le plus loin possible du raid (et à choisir, du CàC) ; gardée longtemps (plus de 8 s, on ne peut pas tout dispel d'un coup) → CD défensif. Temps gardé avant le dispel (seule la partie avant la coupure du pull compte) et défensif lancé pendant. Distance moyenne au raid = distance entre le porteur et chaque autre membre du raid au moment du dispel ou de l'explosion (rouge sous 15 m). Gardée sans défensif = pénalité en Survie ; si le joueur est déjà pénalisé en Strat sur Exploding Infection, cette pénalité de Survie est divisée par deux pour ne pas compter deux fois le même événement : deux joueurs au même comportement peuvent donc perdre des points différents (le détail de la note le précise).") +
    (ih.length ? table([...pcol, { l: "Heure", num: 1 }, { l: "Joueur" }, { l: "Gardée", num: 1 }, { l: "Distance moyenne au raid", num: 1, title: "Distance moyenne entre le porteur et chaque autre membre du raid au moment du dispel ou de l'explosion" }, { l: "Défensif" }],
      ih.map(x => [...pv(x), { h: mmss(x.start_s) + (x.after_cut ? ' <small class="muted">après la coupure, non compté</small>' : ""), v: x.start_s }, x.player, { h: fr(x.held_s) + " s" + (x.held_counted_s != null && x.held_counted_s < x.held_s ? ` <small class="muted">(${fr(x.held_counted_s)} s avant la coupure)</small>` : ""), v: x.held_s }, { h: x.dist_m != null ? `<span class="${x.dist_m < 15 ? "bad" : x.dist_m < 25 ? "warn" : "good"}">${fr(x.dist_m)} m</span>` : "—", v: x.dist_m ?? -1 }, { h: x.defensive ? chip(esc(x.defensive), "good") : x.long ? chip("aucun alors que gardée longtemps", "bad") : '<span class="muted small">—</span>', v: x.defensive ? 1 : x.long ? -1 : 0 }])) : muted("Aucune infection feu dans la partie analysée.")));
  const fkc = card("Adds feu tués rapprochés", muted("Consigne : ne jamais tuer les 2 adds feu ensemble (explosion, et en HM+ un DoT de 3 s cumulable) ; CD défensif ou de soin entre les deux. <b>Seuils :</b> sont listées les morts de deux adds feu à moins de 15 s d'écart (orange : rapprochés, un CD doit couvrir les deux) ; <b>moins de 4 s = tués ensemble</b> (rouge, l'erreur à éviter).") +
    (fk.length ? table([...pcol, { l: "Heure", num: 1 }, { l: "Écart entre les deux morts", num: 1 }],
      fk.map(x => [...pv(x), { h: mmss(x.time_s) + (x.after_cut ? ' <small class="muted">après la coupure</small>' : ""), v: x.time_s }, { h: x.together ? chip(fr(x.gap_s) + " s : ensemble (moins de 4 s)", "bad") : chip(fr(x.gap_s) + " s : rapprochés (moins de 15 s)", "warn"), v: x.gap_s }])) : '<p class="good">Aucune mort d\'adds feu à moins de 15 s d\'écart.</p>'));
  const ccs = card("5. Coups sur un add feu contrôlé", muted("Dégâts (sorts, DoT, cleave) sur un Burning Venom sous contrôle (Banish, Imprison…) pendant qu'un autre Burning Venom est tué.") +
    (cc.length ? table([...pcol, { l: "Heure", num: 1 }, { l: "Joueur" }, { l: "Sort" }, { l: "Add" }, { l: "Contrôle (par)" }],
      cc.map(x => [...pv(x), { h: mmss(x.time_s), v: x.time_s }, x.player, x.ability, x.add, `${x.cc} (${x.cc_by})`])) : '<p class="good">Aucun coup sur un add contrôlé.</p>'));
  const dTable = list => table([...pcol, { l: "Heure", num: 1 }, { l: "Joueur" }, { l: "Tué par", title: "Coup fatal : la dernière capacité qui a infligé des dégâts au joueur (killing blow WCL), pas forcément celle qui a fait le plus de dégâts." }, { l: "80 % → mort", num: 1 }, { l: "Encore disponible" }],
      list.map(d => [...pv(d), { h: mmss(d.time_s), v: d.time_s }, d.player, d.killer, { h: d.from80_s != null ? fr(d.from80_s) + " s" : d.hp_loaded === false ? '<span class="muted small">vie non chargée (quota)</span>' : "—", v: d.from80_s ?? -1 },
        { h: [d.dispel_blast ? chip(`tué par l'explosion du dispel ${esc(d.dispel_blast)} : porteur pas assez loin ?`, "warn") : "", d.tank && d.fangs_stacks != null ? chip(d.fangs_stacks === 0 ? "mort sur le 1er Dripping Fangs : swap pas en cause" : d.fangs_stacks === 1 ? "1 stack de Dripping Fangs : swap pas encore raté" : `${d.fangs_stacks} stacks de Dripping Fangs : swap raté`, d.fangs_stacks >= 2 ? "bad" : "good") : "", ...d.defensives_left.map(n => chip(esc(n), "warn")), d.healthstone_left ? chip("healthstone", "warn") : "", d.potion_left ? chip("potion de soins", "warn") : ""].join(" ") || '<span class="muted small">rien</span>', v: d.defensives_left.length }]));
  const dIn = de.filter(d => !d.after_cut), dOut = de.filter(d => d.after_cut);
  const MB = (vk.bursts || []).filter(P);
  const burst = MB.length ? card("Malignant Burst : quel add a atteint la Cavity", muted("Un venin qui atteint la piscine centrale déclenche Malignant Burst sur tout le raid. L'add responsable est la source du coup dans le log (n° = numéro de l'add dans le pull, comme sur Warcraft Logs).") +
    table([...pcol, { l: "Arrivée", num: 1 }, { l: "Add" }, { l: "Impulsions", num: 1 }, { l: "Joueurs touchés", num: 1 }, { l: "Tués", num: 1 }],
      MB.map(x => [...pv(x), { h: mmss(x.time_s) + (x.after_cut ? ' <small class="muted">après la coupure</small>' : ""), v: x.time_s }, { h: `<b>${esc(x.add)}</b>${x.instance != null ? ` n° ${x.instance}` : ""}`, v: x.add }, { h: `${x.pulses ?? 1}${(x.pulses ?? 1) > 1 ? ` <small class="muted">jusqu'à ${mmss(x.last_s)}</small>` : ""}`, v: x.pulses ?? 1 }, x.hit, { h: x.killed ? `<span class="bad">${x.killed}</span>` : "0", v: x.killed }]))) : "";
  const deaths = card("6. Morts avant le wipe", muted("Hors morts après l'appel du wipe. « 80 % → mort » = temps entre le dernier moment à 80 % de vie ou plus et la mort. Défensifs encore disponibles = défensifs que le joueur utilise d'habitude et pas encore lancés dans ce pull ; healthstone et potion de soins : non utilisées dans ce pull (pas pour les tanks : un tank tué en un coup relève du swap et de ses défensifs). Tanks : stacks de Dripping Fangs déjà présents à la mort (consigne : swap à chaque morsure ; 0 = mort sur la 1re morsure, 2 ou plus = swap raté), et défensifs personnels encore disponibles.") +
    (dIn.length ? dTable(dIn) : '<p class="good">Aucune mort dans la partie analysée des pulls.</p>') +
    (dOut.length ? `<h4>Après la coupure du pull (${dOut.length})</h4>${muted("Morts après le moment où le pull est coupé pour l'analyse (cause du wipe déjà survenue) : utiles pour le débrief, mais non comptées dans les notes ni dans les morts par pull.")}${dTable(dOut)}` : ""));
  /* dégâts sur les adds : soirée (tous les pulls) ou un pull précis */
  const AD = pc ? vk.add_damage : vk.add_damage.filter(x => x.by_pull && x.by_pull[pull]).map(x => ({ player: x.player, ...x.by_pull[pull] })).sort((a, b) => b.total - a.total);
  const adds = AD.length ? card(`7. Dégâts sur les adds (hors healers, ${pc ? "soirée" : `pull ${pull}`})`, muted(`Dégâts faits sur chaque type d'add, et DPS sur les adds ramené à la durée ${pc ? "totale des pulls" : "du pull"}.`) +
    (() => { const names = [...new Set(AD.flatMap(x => Object.keys(x.by_add)))];
      return table([{ l: "Joueur" }, ...names.map(n => ({ l: esc(n), num: 1 })), { l: "Total", num: 1 }, { l: "DPS sur les adds", num: 1 }],
        AD.map(x => [x.player, ...names.map(n => ({ h: short(x.by_add[n] ?? 0), v: x.by_add[n] ?? 0 })), { h: short(x.total), v: x.total }, { h: short(x.dps), v: x.dps ?? 0 }])); })()) : "";
  return burst + totems + froth + hitsAll + disp + infc + ccs + fkc + deaths + adds + muted(vk.notes.map(esc).join(" "));
}

/* ---------- Comparaison au top : commun Healers et Gameplay ---------- */
const ADV_TOPIC = a => `${a.spell ? sp(a.spell.name, a.spell.icon, 20, false, a.spell.id) + " " : ""}<b>${esc(a.topic)}</b> — ${esc(a.text)}`;
const advice = list => `<ul class="adv">${list.map(a => `<li class="${a.level}">${ADV_TOPIC(a)}</li>`).join("")}</ul>`;
/* ---------- Gameplay : DPS, tanks et healers (view.gameplay, view.healers) ----------
   Un sélecteur de joueur par vue : healers (Compo, un bouton par healer, CD de raid), tanks, DPS mêlée, DPS distance.
   Chaque fiche : note du fight par catégories, conseils, chronologie des CD (toi contre chaque log du top), activité, ouverture.
   Les graphiques sont dessinés à l'affichage (js/app.js), à partir des données de l'export (data-gpref). */
const dchip = (v, unit, lower = false) => {
  if (v == null) return "";
  const good = lower ? v <= 0 : v >= 0, near = Math.abs(v) <= (unit === "%" ? 10 : 5);
  const l = good ? "good" : Math.abs(v) >= (unit === "%" ? 25 : 12) ? "bad" : lower ? "warn" : near ? "good" : "warn";
  return chip(`${v > 0 ? "+" : ""}${fr(v)} % vs top`, l);
};
const scoreB = s => s == null ? chip("—") : chip(`${fr(s)}/10`, s >= 8 ? "good" : s >= 5 ? "warn" : "bad");
const ratioC = r => r == null ? chip("—") : chip(Math.round(r * 100) + " %", r < .7 ? "bad" : r > 1.5 ? "warn" : "good");
const kk = n => n == null ? "—" : n >= 1e6 ? fr(n / 1e6, 2) + " M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));
/* Notes par catégorie (strat, dégâts, soins, survie ou mitigation, gameplay) : la note du fight en est la moyenne pondérée */
function catsStrip(cats, total = null, partial = null) {
  if (!cats || !cats.length) return "";
  const w$ = w => String(w).replace(".", ",");
  return `<div class="cats">${total != null ? `<span class="cat tot"><span><b>${fr(total)}</b>/10</span><small>note du fight</small></span>` : ""}${cats.map(c => {
    const q = c.score / 10, w = c.weight ?? 1;
    return `<span class="cat ${q >= .8 ? "good" : q >= .5 ? "warn" : "bad"}" title="${esc(`${w === 1 ? "Catégorie principale (poids 1)" : `Catégorie secondaire : poids ${w$(w)}, elle compte ${w === .5 ? "deux" : "quatre"} fois moins`}${c.note ? " · " + c.note : ""}`)}"><span><b>${fr(c.score)}</b>/10</span><small>${esc(c.label)}${c.why ? ` · ${esc(c.why)}` : w !== 1 ? ` · poids ${w$(w)}` : ""}${c.note ? " ⓘ" : ""}</small></span>`;
  }).join("")}</div>${partial ? `<p class="banner small"><b>Note partielle</b> : ${esc(partial.join(", "))} manquant(s) (données non chargées, quota de l'API). Elle sera complétée à la prochaine mise à jour.</p>` : ""}${muted(`Note du fight = moyenne des catégories, pondérée par leur poids.${cats.filter(c => c.detail).map(c => `<br>${esc(c.label)} : ${esc(c.detail)}${c.note ? ` (${esc(c.note)})` : ""}.`).join("")}`)}`;
}
const timesH = times => !times || !times.length ? '<span class="muted small">jamais</span>'
  : `<span class="cdt">${times.map(p => `${p.pull != null ? `<i>P${p.pull}</i> ` : ""}${p.ts.map(t => `<code>${mmss(t)}</code>`).join(" ")}`).join('<span class="sep">|</span>')}</span>`;
const tabs2 = (labels, panes) => tabset(labels, panes).replace('<div class="tabset ', '<div class="tabset gpt ');
function spellsT(rows, withCd) {
  return table([{ l: "Sort" }, { l: "Toi / min", num: 1 }, { l: "Top / min", num: 1 }, { l: "Toi vs top", title: "Pour les CD : part des utilisations possibles sur la durée de chaque combat, comparée au top (un kill plus court du top ne fausse pas la comparaison). Pour les autres sorts : utilisations par minute." },
    ...(withCd ? [{ l: "Toutes les (s)", num: 1 }, { l: "Top : toutes les (s)", num: 1 }, { l: "1re utilisation (s)", num: 1 }, { l: "Top 1re (s)", num: 1 }] : []),
    { l: "Utilisé par le top" }, ...(withCd ? [{ l: "Utilisé à" }] : [])],
    rows.map(r => [{ h: sp(r.name, r.icon, 22, true, r.id), v: r.name }, { h: num(r.ours_cpm, 2), v: r.ours_cpm ?? "" }, { h: num(r.top_cpm, 2), v: r.top_cpm ?? "" }, { h: ratioC(r.ratio) + (r.eff != null ? `<br><small class="muted" title="Utilisations rapportées au maximum possible sur chaque combat (CD estimé), pour ne pas pénaliser des combats plus longs que les kills du top">${r.eff} % des utilisations possibles (top ${r.top_eff} %)</small>` : ""), v: r.ratio ?? -1 },
      ...(withCd ? [r.ours_interval ?? "—", r.top_interval ?? "—", r.ours_first ?? "—", r.top_first ?? "—"] : []), r.top_users ?? "",
      ...(withCd ? [{ h: timesH(r.times), v: r.times?.[0]?.ts?.[0] ?? 9999 }] : [])]));
}
const lostC = (o, t) => o == null ? chip("—") : chip(`${o} %${t != null ? ` (top ${t} %)` : ""}`, t == null ? "" : o - t >= 30 ? "bad" : o - t >= 15 ? "warn" : "good");
function chronoT(ch) {
  return table([{ l: "Sort" }, { l: "Type" }, { l: "CD estimé (s)", num: 1, title: "Écart le plus court habituel entre deux utilisations chez le top (charges et réductions de CD comprises) : c'est une estimation. « irrégulier » : rythme variable chez le top (sort sur proc, charges), le temps perdu n'est pas calculé." },
    { l: "Utilisations", num: 1 }, { l: "Top par kill", num: 1 }, { l: "Prêt mais pas lancé", title: "CD offensifs (ou de soin pour un healer) : part du temps de combat où le sort était disponible sans être lancé. Pas calculé pour les défensifs, qu'on garde pour les gros dégâts." }, { l: "Utilisations perdues ≈", num: 1 }],
    ch.spells.map(r => [{ h: sp(r.name, r.icon, 22, true, r.id), v: r.name }, r.kind === "cd" ? (ch.kind === "healer" ? "CD de soin" : "CD offensif") : "Défensif",
      r.cd == null ? "—" : r.irregular ? `${r.cd} (irrégulier)` : r.cd, { h: `${r.uses}${ch.ours.length > 1 ? ` sur ${ch.ours.length} pulls` : ""}`, v: r.uses }, r.top_uses ?? "—",
      { h: lostC(r.lost_pct, r.top_lost_pct), v: (r.lost_pct ?? -1) - (r.top_lost_pct ?? 0) }, r.missed ?? "—"]));
}
/* Pull affiché par les graphiques d'une fiche : le kill, sinon le plus long pull */
function pullPick(ch) {
  const P = ch?.ours ?? [], kI = P.findIndex(x => x.kill), def = Math.max(0, kI >= 0 ? kI : P.reduce((b, x, j) => x.dur > P[b].dur ? j : b, 0));
  const sel = P.length > 1 ? `<label class="gpsel">Pull affiché : <select class="gppull">${P.map((x, j) => `<option value="${j}"${j === def ? " selected" : ""}>Pull ${x.pull}${x.kill ? " (kill)" : ""} · ${mmss(x.dur)}</option>`).join("")}</select></label>` : "";
  return { def, sel };
}
const LEG_CD = `<div class="tlleg"><span><i class="k-me"></i>Toi : utilisation</span><span><i class="k-rc"></i>CD en recharge (estimé)</span><span><i class="k-lost"></i>Prêt mais pas lancé</span><span><i class="k-top"></i>Logs du top (une ligne par log)</span><span><i class="k-phl"></i>Changement de phase</span></div>`;
const talentsA = (t, who) => t && t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">talents joués${who ? " par " + esc(who) : ""} (pull ${t.pull}) ↗</a>` : "";
const gpp = (key, ref, shown, cls, html, def = 0) => `<div class="gpp" data-gpp="${key}"${ref ? ` data-gpref="${esc(ref)}" data-def="${def}"` : ""}${shown ? "" : " hidden"}${cls ? ` style="--cc:${clsColor(cls)}"` : ""}>${html}</div>`;

/* Fiche d'un DPS ou d'un tank */
function playerPanel(p, key, ref, shown) {
  const ch = p.chrono, ROLEL = { tank: "Tank", dps: "DPS" };
  const off = ch ? ch.spells.filter(s => s.kind === "cd" && s.lost_pct != null) : [];
  const lostAvg = off.length ? Math.round(off.reduce((a, s) => a + s.lost_pct, 0) / off.length) : null, lostTop = off.length && off.every(s => s.top_lost_pct != null) ? Math.round(off.reduce((a, s) => a + s.top_lost_pct, 0) / off.length) : null;
  const head = `<div class="gph">${clsic(p.class, 46)}<div><div class="gpn">${esc(p.name)}</div><div class="muted small">${esc(`${p.spec} ${clsName(p.class)}`)} · ${ROLEL[p.role] ?? p.role}${p.ilvl ? ` · ilvl ${p.ilvl}` : ""} · ${p.pulls} pull(s), ${fr(p.minutes)} min de combat (pulls entiers, resets exclus)${p.talents ? " · " + talentsA(p.talents) : ""}</div></div>
    <div class="gps">${p.score != null ? scoreB(p.score) : p.gameplay_score != null ? scoreB(p.gameplay_score) : chip("sans référence")}<small class="muted">note du fight · <a href="#" data-stratgo="${esc(p.name)}">détail strat</a></small></div></div>${catsStrip(p.categories, null, p.partial)}`;
  if (!p.reference) return gpp(key, null, shown, p.class, `<section class="card">${head}${muted(`${esc(p.advice[0]?.text ?? "")} Sa note sur ce boss est alors celle de la strat : <a href="#" data-stratgo="${esc(p.name)}">voir le détail strat</a>.`)}</section>`);
  const R = p.reference;
  const kpis = `<div class="kpis">${kpi("DPS (brut)", kk(p.dps), `top ${kk(R.dps)} ${dchip(p.vs_top?.dps, "%")}`)}${kpi("Sorts / min", fr(p.cpm), `top ${fr(R.cpm)} ${dchip(p.vs_top?.cpm, "%")}`)}
    ${kpi("Inactivité", p.idle != null ? fr(p.idle) + " %" : "—", p.idle_top != null ? `top ${fr(p.idle_top)} %` : "&nbsp;")}
    ${lostAvg != null ? kpi("CD offensifs prêts non lancés", lostAvg + " %", lostTop != null ? `top ${lostTop} % du combat` : "du temps de combat") : ""}
    ${ch?.align?.ours != null ? kpi("CD alignés", ch.align.ours + " %", `${ch.align.top != null ? `top ${ch.align.top} % ` : ""}(à ${ch.align_s} s près)`) : ""}
    ${p.role === "tank" ? kpi("Dégâts subis / s", kk(p.dtps), R.dtps != null ? `top ${kk(R.dtps)} ${dchip(p.vs_top?.dtps, "%", true)}` : "&nbsp;") : ""}
    ${p.role === "tank" && p.hps != null ? kpi("Soins / s", kk(p.hps), R.hps != null ? `top ${kk(R.hps)}` : "&nbsp;") : ""}</div>`;
  const { def, sel } = pullPick(ch);
  const by = k => p.spells.filter(s => s.kind === k);
  const cds = by("cd"), defs = by("défensif"), mit = by("mitigation"), rot = by("rotation"), extra = by("absent du top");
  const chronoPane = ch && ch.spells.length ? `${sel}<div class="gpc" data-chart="cd"></div>${LEG_CD}
    ${muted("Chaque ligne est un sort. En haut, ton pull ; en dessous, chaque log du top sur le même boss et la même difficulté. Survole un point pour l'heure exacte. Les kills du top sont souvent plus courts : compare surtout le rythme (le temps entre deux utilisations) et le placement par rapport aux phases.")}
    <h4>Bilan par sort</h4>${chronoT(ch)}` : muted("Pas de CD offensif ou défensif identifié chez le top pour cette spé.");
  const actPane = ch ? `${sel}<h4>Activité dans le temps</h4><div class="gpc" data-chart="act"></div>
    <div class="tlleg"><span><i class="k-me"></i>Toi (sorts lancés par minute)</span><span><i class="k-topl"></i>Moyenne du top</span><span><i class="k-phl"></i>Changement de phase</span></div>
    ${muted(`Sorts lancés par minute, par tranche de ${ch.bin_s} s. Un creux chez toi qui n'existe pas chez le top = déplacement ou temps mort à travailler.`)}
    <h4>Ouverture (${ch.open_s} premières secondes)</h4><div class="gpc" data-chart="open"></div>${muted("Les premiers sorts lancés, dans l'ordre, avec l'heure. Compare l'ordre et le moment où les CD sortent.")}` : "";
  const sorts = `<h4>CD offensifs</h4>${muted("Sorts que les meilleurs lancent au plus environ une fois par minute, avec l'heure de chacune de tes utilisations.")}${cds.length ? spellsT(cds, true) : muted("Aucun.")}
    ${defs.length ? `<h4>Défensifs</h4>${spellsT(defs, true)}` : ""}${mit.length ? `<h4>Mitigation active</h4>${spellsT(mit, true)}` : ""}
    <h4>Rotation</h4>${rot.length ? spellsT(rot, false) : muted("Aucun.")}${extra.length ? `<h4>Sorts que tu lances et que le top n'utilise pas</h4>${spellsT(extra, false)}` : ""}`;
  const dmg = p.share && p.share.length ? muted("Part de chaque sort dans tes dégâts, toi contre la moyenne du top.") + bars(p.share) : muted("Répartition des dégâts indisponible.");
  const refs = table([{ l: "Joueur" }, { l: "Guilde" }, { l: "DPS", num: 1 }, { l: "Durée (s)", num: 1 }],
    R.players.map(r => [{ h: r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name), v: r.name }, r.guild ?? "", { h: kk(r.dps), v: r.dps }, r.duration_s]));
  const L = ["Conseils", ...(ch ? ["Chronologie des CD", "Activité et ouverture"] : []), "Sorts", "Dégâts", `Logs du top (${R.players.length})`];
  const P = [advice(p.advice), ...(ch ? [chronoPane, actPane] : []), sorts, dmg, refs];
  return gpp(key, ch ? ref : null, shown, p.class, `<section class="card">${head}${kpis}${tabs2(L, P)}</section>`, def);
}
/* Barres « toi contre le top » (répartition des dégâts ou du soin) */
const bars = share => `<div class="share">${share.slice(0, 14).map(x => { const m = Math.max(x.ours, x.top, 1); return `<div class="srow"><div class="sname"><span class="sp">${img(x.icon || "inv_misc_questionmark", 20)}<span>${esc(x.name)}</span></span></div><div class="bars"><div class="bar"><i style="width:${(x.ours / m * 100).toFixed(1)}%"></i><span>Toi ${fr(x.ours)} %</span></div><div class="bar top"><i style="width:${(x.top / m * 100).toFixed(1)}%"></i><span>Top ${fr(x.top)} %</span></div></div></div>`; }).join("")}</div>`;

/* Courbe de mana : toi contre la moyenne du top (et du top de même compo) */
function manaC(m) {
  if (!m || (!m.me && !m.top)) return muted("Mana indisponible dans les logs pour ce healer.");
  const W = 760, H = 240, L = 40, R = 12, T = 12, B = 30, n = Math.max(m.me?.length ?? 0, m.top?.length ?? 0, m.compo?.length ?? 0), dur = Math.max(1, (n - 1) * m.bin_s);
  const x = i => L + i * m.bin_s / dur * (W - L - R), y = v => T + (1 - v / 100) * (H - T - B);
  const path = vals => { let d = "", pen = false; (vals || []).forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; }); return d; };
  let g = [0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
  for (let t = 0; t <= dur; t += dur > 400 ? 60 : 30) g += `<line x1="${x(t / m.bin_s)}" x2="${x(t / m.bin_s)}" y1="${T}" y2="${H - B}" class="gl"/><text x="${x(t / m.bin_s)}" y="${H - B + 16}" text-anchor="middle">${mmss(t)}</text>`;
  const pts = (vals, lbl) => (vals || []).map((v, i) => v == null ? "" : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="5" class="hit"><title>${lbl} — ${mmss(i * m.bin_s)} : ${v} %</title></circle>`).join("");
  return `<div class="mana"><div class="legend"><span><i class="lme"></i>Toi${m.pulls > 1 ? ` (moyenne de ${m.pulls} pulls)` : ""}</span>${m.top ? `<span><i class="ltop"></i>Top même nb de healers (${m.top_n} kill${m.top_n > 1 ? "s" : ""})</span>` : ""}${m.compo ? `<span><i class="lcmp"></i>Top même compo (${m.compo_n} kill${m.compo_n > 1 ? "s" : ""})</span>` : ""}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mana au cours du combat">${g}${m.top ? `<path d="${path(m.top)}" class="ctop"/>` : ""}${m.compo ? `<path d="${path(m.compo)}" class="ccmp"/>` : ""}${m.me ? `<path d="${path(m.me)}" class="cme"/>` : ""}${pts(m.top, "Top")}${pts(m.compo, "Top même compo")}${pts(m.me, "Toi")}</svg>
    ${muted(`Mana moyenne par tranche de ${m.bin_s} s depuis le début du pull. Le top, ce sont des kills : ses courbes vont jusqu'à la fin du combat, les tiennes s'arrêtent au wipe.`)}</div>`;
}
/* Fiche d'un healer : Fiche / Chronologie des CD / Soin et activité */
/* Healers comparés à des kills avec un autre nombre de healers (exceptions à la référence annoncée) */
const fbList = H => { const ex = ((H && H.healers) || []).filter(h => /kills à \d+ healers/.test(h.context_note || "")).map(h => `${h.name} (${/kills à \d+ healers/.exec(h.context_note)[0]})`); return ex.length ? ` (sauf ${ex.join(", ")} : aucun kill du top au même nombre)` : ""; };
/* Référence fragile à côté de la note : peu de logs du top, ou kills avec un autre nombre de healers */
function refWarn(h) {
  const n = h.reference?.players?.length ?? null, fb = /kills à (\d+) healers/.exec(h.context_note || "");
  const t = [n != null && n < 5 ? `référence : ${n} log${n > 1 ? "s" : ""} du top seulement` : "", fb ? `comparé à des kills à ${fb[1]} healers` : ""].filter(Boolean);
  return t.length ? `<small>${t.map(x => chip(esc(x), "warn")).join(" ")}</small>` : "";
}
function healerPanel(h, key, ref, shown) {
  const head = `<div class="gph">${clsic(h.class, 46)}<div><div class="gpn">${esc(h.name)}</div><div class="muted small">${esc(`${h.spec} ${clsName(h.class)}`)} · Healer · ilvl ${h.ilvl ?? "?"} · ${h.pulls} pull(s), ${fr(h.minutes)} min${h.talents ? " · " + talentsA(h.talents) : ""}</div></div>
    <div class="gps">${scoreB(h.score)}<small class="muted">note du fight · <a href="#" data-stratgo="${esc(h.name)}">détail strat</a></small>${refWarn(h)}</div></div>${catsStrip(h.categories, null, h.partial)}`;
  if (!h.reference) return gpp(key, null, shown, h.class, `<section class="card">${head}${muted(esc(h.advice[0]?.text ?? ""))}</section>`);
  const R = h.reference, vt = h.vs_top ?? {};
  const kpis = `<div class="kpis">${kpi("Soin / dégâts du raid", h.cover != null ? fr(h.cover) + " %" : "—", R.cover != null ? `top ${fr(R.cover)} % ${dchip(vt.cover, "%")}` : "référence indisponible")}
    ${kpi("HPS (brut)", kk(h.hps), `top ${kk(R.hps)} ${dchip(vt.hps, "%")}`)}${kpi("Sorts / min", fr(h.cpm), `top ${fr(R.cpm)} ${dchip(vt.cpm, "%")}`)}
    ${kpi("Overheal", fr(h.overheal) + " %", `top ${fr(R.overheal)} % ${dchip(vt.overheal, " pts", true)}`)}${kpi("Dispels / min", num(h.dispels_per_min, 2), h.dispels_per_min == null ? "voir la vue soirée" : "top " + num(R.dispels_per_min, 2))}
</div>`;
  const col = (title, r, vs) => `<div class="refc"><h4>${title}</h4>${r ? `<p class="muted small">${r.n} log(s)</p><table class="mini"><tbody>
    <tr><td>Soin / dégâts du raid</td><td class="num">${r.cover != null ? fr(r.cover) + " %" : "—"}</td><td>${dchip(vs?.cover, "%")}</td></tr><tr><td>HPS brut</td><td class="num">${kk(r.hps)}</td><td>${dchip(vs?.hps, "%")}</td></tr>
    <tr><td>Durée moyenne</td><td class="num">${r.minutes != null ? fr(r.minutes) + " min" : "—"}</td><td></td></tr><tr><td>Dégâts du raid / s</td><td class="num">${r.raid_dtps != null ? kk(r.raid_dtps) : "—"}</td><td></td></tr>
    <tr><td>Sorts / min</td><td class="num">${fr(r.cpm)}</td><td>${dchip(vs?.cpm, "%")}</td></tr><tr><td>Overheal</td><td class="num">${fr(r.overheal)} %</td><td>${dchip(vs?.overheal, " pts", true)}</td></tr>
    <tr><td>ilvl moyen</td><td class="num">${r.avg_ilvl ?? "—"}</td><td></td></tr></tbody></table>` : muted("Aucun log du top trouvé avec exactement les mêmes classes de healers.")}</div>`;
  const refs = card("Comparaison aux tops", muted(`Toi : ${h.cover != null ? fr(h.cover) + " % des dégâts du raid soignés · " : ""}${kk(h.hps)} HPS · ${fr(h.cpm)} sorts/min · ${fr(h.overheal)} % d'overheal.${h.context_note ? " " + esc(h.context_note[0].toUpperCase() + h.context_note.slice(1)) + "." : ""} Les conseils et la note se basent sur la première référence.`) +
    `<div class="refs">${col("Top — même nombre de healers", R, vt)}${col("Top — même compo de healers (mêmes classes)", h.reference_compo, h.vs_compo)}</div>`);
  const by = k => h.spells.filter(s => s.kind === k);
  const cds = by("cd"), defs = by("défensif"), rot = by("rotation"), extra = by("absent du top");
  const idle = h.idle && h.idle.ours != null ? `<div class="kpis">${kpi("Inactivité", fr(h.idle.ours) + " %", `top ${h.idle.top != null ? fr(h.idle.top) : "—"} % ${h.idle.top != null ? dchip(Math.round((h.idle.ours - h.idle.top) * 10) / 10, " pts", true) : ""}`)}</div>
    ${muted(`Part du combat sans incantation ni GCD (estimation : GCD de 1,3 s, la hâte n'est pas prise en compte).${h.idle.excluded_s ? ` ${h.idle.excluded_s} s passées dans le ${esc(h.idle.context ?? "contexte")} sont retirées du calcul, chez toi comme chez les tops.` : ""}`)}` : "";
  const eff = h.mana_eff && h.mana_eff.length ? `<h4>Efficacité de la mana</h4>${muted("Soin produit par point de mana dépensé, sort par sort. Un sort qui coûte cher pour peu de soin est à remplacer quand la mana manque.")}${table([{ l: "Sort" }, { l: "Part de ta mana", num: 1 }, { l: "Soin / mana (toi)", num: 1 }, { l: "Soin / mana (top)", num: 1 }, { l: "Toi vs top" }],
    h.mana_eff.map(e => [{ h: sp(e.name, e.icon, 20, true, e.id), v: e.name }, { h: e.share + " %", v: e.share }, e.hpm ?? "—", e.top_hpm ?? "—", { h: e.hpm && e.top_hpm ? ratioC(e.hpm / e.top_hpm) : "—", v: e.hpm && e.top_hpm ? e.hpm / e.top_hpm : -1 }]))}` : "";
  const cdv = h.cd_value && h.cd_value.length ? `<h4>Valeur des CD de raid</h4>${muted("Soin produit (tous sorts) dans les 10 s qui suivent chaque CD, en moyenne par utilisation. Beaucoup d'overheal = CD lancé alors que le raid n'avait pas besoin de soin.")}${table([{ l: "CD" }, { l: "Utilisations", num: 1 }, { l: "Soin / CD (toi)", num: 1 }, { l: "Soin / CD (top)", num: 1 }, { l: "Overheal (toi)", num: 1 }, { l: "Overheal (top)", num: 1 }],
    h.cd_value.map(c => [{ h: sp(c.name, c.icon, 20, true, c.id), v: c.name }, c.uses, { h: kk(c.heal), v: c.heal ?? 0 }, { h: kk(c.top_heal), v: c.top_heal ?? 0 }, c.overheal == null ? "—" : c.overheal + " %", c.top_overheal == null ? "—" : c.top_overheal + " %"]))}` : "";
  const refLogs = (title, rows) => `<details class="card"><summary>${esc(title)}</summary>${table([{ l: "Joueur" }, { l: "Guilde" }, { l: "Région" }, { l: "Healers", num: 1 }, { l: "Compo healers" }, { l: "ilvl", num: 1 }, { l: "HPS", num: 1 }, { l: "Durée (s)", num: 1 }],
    rows.map(r => [{ h: r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name), v: r.name }, r.guild ?? "", r.region ?? "", r.healers ?? "—", r.compo ?? "—", r.ilvl ?? "—", { h: kk(r.hps), v: r.hps }, r.duration_s]))}</details>`;
  const fiche = refs + card("Conseils", advice(h.advice)) +
    card("CD de soin et de soutien du raid", muted("Cooldowns que les meilleurs lancent rarement (au plus environ une fois toutes les 80 s) et qui soignent ou aident à soigner : CD de raid, externes, mana, burst.") + (cds.length ? spellsT(cds, true) : muted("Aucun."))) +
    card("Défensifs personnels", muted("Cooldowns de survie lancés sur soi : moins de soin à recevoir et moins de risque de mourir.") + (defs.length ? spellsT(defs, true) : muted("Aucun défensif personnel détecté dans les logs du top."))) +
    card("Rotation", (rot.length ? spellsT(rot, false) : muted("Aucun.")) + (extra.length ? `<h4>Sorts que tu lances et que le top n'utilise pas</h4>${spellsT(extra, false)}` : "")) +
    (h.share && h.share.length ? card("Répartition du soin", muted("Part de chaque sort dans le soin total, toi contre la moyenne du top.") + bars(h.share)) : "") +
    card("Mana au cours du combat", manaC(h.mana)) + (idle || eff || cdv ? card("Activité, mana et CD", idle + eff + cdv) : "") +
    refLogs(`Logs de référence — même nombre de healers (${R.players.length})`, R.players) + (h.reference_compo ? refLogs(`Logs de référence — même compo de healers (${h.reference_compo.players.length})`, h.reference_compo.players) : "");
  const ch = h.chrono;
  if (!ch) return gpp(key, null, shown, h.class, `<section class="card">${head}${kpis}</section>${fiche}`);
  const { def, sel } = pullPick(ch);
  const cdPane = ch.spells.length ? `${sel}<div class="gpc" data-chart="cd"></div>${LEG_CD}${muted("Chaque ligne est un CD de soin ou un défensif. En haut, ton pull ; en dessous, chaque log du top (même boss, même difficulté, même nombre de healers). La zone rouge = CD de soin disponible mais pas lancé. Un CD gardé pour une phase prévue par la strat est normal : compare surtout avec le placement du top et les phases.")}<h4>Bilan par sort</h4>${chronoT(ch)}`
    : muted("Pas de CD de soin identifié chez le top pour cette spé.");
  const healPane = `${sel}<h4>Soin dans le temps</h4><div class="gpc" data-chart="hps"></div>
    <div class="tlleg"><span><i class="k-me"></i>Toi (soin effectif par seconde)</span><span><i class="k-topl"></i>Moyenne du top</span><span><i class="k-phl"></i>Changement de phase</span></div>
    ${muted(`Soin effectif (hors overheal, absorptions comprises) par tranche de ${ch.bin_s} s. Les tops sont des kills souvent plus intenses : regarde surtout la forme (les creux et les pics) et le moment des montées.`)}
    <h4>Activité dans le temps</h4><div class="gpc" data-chart="act"></div><div class="tlleg"><span><i class="k-me"></i>Toi (sorts lancés par minute)</span><span><i class="k-topl"></i>Moyenne du top</span></div>
    <h4>Ouverture (${ch.open_s} premières secondes)</h4><div class="gpc" data-chart="open"></div>`;
  return gpp(key, ref, shown, h.class, `<section class="card">${head}${kpis}${tabs2(["Fiche", "Chronologie des CD", "Soin et activité"], [fiche, cdPane, healPane])}</section>`, def);
}

/* Chronologie des CD de raid d'un pull : seulement les problèmes (chevauchements, CD sans dégâts, pics sans CD) */
function cdTimeline(tl) {
  const W = 1000, L = 120, R = 16, T = 8, DMG = 70, lane = 34, B = 26, dur = Math.max(tl.duration_s, 30);
  const issues = tl.events.filter(e => e.overlap || e.wasted), H = T + DMG + tl.healers.length * lane + B, x = t => L + Math.min(t, dur) / dur * (W - L - R);
  let g = "";
  for (let t = 0; t <= dur; t += dur > 400 ? 60 : 30) g += `<line x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${H - B}" class="gl"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${mmss(t)}</text>`;
  for (const s of tl.spikes || []) g += `<g><title>Pic de dégâts ${mmss(s.start)}–${mmss(s.end)}${s.covered ? " : couvert par un CD" : " : AUCUN CD de raid"}</title><rect x="${x(s.start)}" y="${T}" width="${Math.max(3, x(s.end) - x(s.start))}" height="${H - B - T}" class="${s.covered ? "spk" : "spk miss"}"/>${s.covered ? "" : `<text x="${(x(s.start) + x(s.end)) / 2}" y="${T + 11}" text-anchor="middle" class="spkt">sans CD</text>`}</g>`;
  const rd = tl.raid_damage;
  if (rd && rd.values && rd.values.length) { const mx = Math.max(...rd.values, 1), base = T + DMG - 4;
    g += `<text x="${L - 8}" y="${T + DMG / 2 + 4}" text-anchor="end" class="hl">Dégâts du raid</text><path class="rda" d="M${x(0)},${base}${rd.values.map((v, i) => `L${x(i * rd.bin_s).toFixed(1)},${(base - v / mx * (DMG - 16)).toFixed(1)}`).join("")}L${x((rd.values.length - 1) * rd.bin_s).toFixed(1)},${base}Z"/>`; }
  tl.healers.forEach((h, i) => { const y0 = T + DMG + i * lane; g += `<text x="${L - 8}" y="${y0 + lane / 2 + 4}" text-anchor="end" class="hl">${esc(h)}</text><line x1="${L}" x2="${W - R}" y1="${y0 + lane}" y2="${y0 + lane}" class="gl"/>`; });
  /* tous les CD de raid lancés (cadre neutre), les problèmes en couleur */
  for (const e of tl.events) { const i = tl.healers.indexOf(e.healer); if (i < 0) continue; const cy = T + DMG + i * lane + lane / 2, x0 = x(e.t);
    g += `<g class="ev ${e.overlap ? "ov" : e.wasted ? "wa" : "ok"}"><title>${esc(e.healer)} — ${esc(e.spell)} à ${mmss(e.t)}${e.overlap ? " : chevauche un autre CD de raid" : e.wasted ? " : lancé alors que le raid ne prenait pas de gros dégâts" : ""}</title><rect x="${(x0 - 13).toFixed(1)}" y="${cy - 13}" width="26" height="26" rx="6"/><image href="${ICON(e.icon || "inv_misc_questionmark")}" x="${(x0 - 11).toFixed(1)}" y="${cy - 11}" width="22" height="22"/><text x="${(x0 + 15).toFixed(1)}" y="${cy + 4}" class="cdn">${esc(e.spell.length > 14 ? e.spell.slice(0, 13) + "…" : e.spell)}</text></g>`; }
  const list = [...issues.map(e => [e.t, e.overlap ? "Chevauchement" : "CD sans dégâts", `${e.healer} — ${e.spell}`]), ...(tl.spikes || []).filter(s => !s.covered).map(s => [s.start, "Pic sans CD", `${mmss(s.start)} → ${mmss(s.end)}`])].sort((a, b) => a[0] - b[0]);
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="CD de raid du pull ${tl.pull}">${g}</svg>` +
    (list.length ? `<details class="evlist"><summary>Détail (${list.length})</summary>${table([{ l: "Temps", num: 1 }, { l: "Problème" }, { l: "Détail" }], list.map(r => [{ h: mmss(r[0]), v: r[0] }, r[1], r[2]]))}</details>` : '<p class="good small">Aucun problème de CD sur ce pull.</p>');
}
/* Compo healers : chiffres clés, répartition du soin, notes, chronologie des CD de raid */
/* Morts excusées (aucun soin reçu des healers dans les 8 s) : elles ne comptent pas pour le joueur, on les montre aux healers */
const unhealedCard = H => (H.unhealed || []).length ? card("Morts sans soin des healers", muted("Joueurs morts sans avoir reçu aucun soin des healers dans les 8 s précédentes, alors qu'ils s'étaient protégés : la mort ne leur est pas reprochée. Elle pèse à la place sur la note Soins de chaque healer de la compo (2 points par mort et par pull, poids réduit sous 5 pulls, plafond 2) : à regarder côté healers (placement, ligne de vue, assignations). Sauf contexte indiqué (joueur tué par un allié sous contrôle, healers silencés ou contrôlés : aucun soin sur tout le raid, ou mort dans les 15 dernières secondes d'un kill) : là, personne n'est pénalisé.") +
  table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "Joueur" }, { l: "Tué par", title: "Coup fatal : la dernière capacité qui a infligé des dégâts au joueur (killing blow WCL), pas forcément celle qui a fait le plus de dégâts." }, { l: "" }], H.unhealed.map(d => [d.pull, { h: mmss(d.time_s), v: d.time_s }, esc(d.player), esc(d.killer) + (d.context ? `<br><small class="muted">${esc(d.context)} : pas forcément une faute de soin</small>` : ""), { h: d.link ? link(d.link) : "", v: "" }]))) : "";
function compoPane(H, b) {
  const c = H.compo, tl = c.timelines || [], sum = k => tl.reduce((a, t) => a + (t.counts?.[k] ?? 0), 0), spikes = sum("spikes"), unc = sum("uncovered"), wasted = sum("wasted"), ov = c.overlaps_total ?? 0;
  const L = [...H.healers].sort((x, y) => (y.hps ?? 0) - (x.hps ?? 0)), tot = L.reduce((a, h) => a + (h.hps ?? 0), 0);
  const k2 = (v, l, s, lv) => `<div class="kpi"><span>${l}</span><b class="${lv}">${v}</b><small>${s}</small></div>`;
  const bar = tot ? `<h4>Répartition du soin</h4><div class="hsplit">${L.map(h => `<i style="width:${(h.hps / tot * 100).toFixed(1)}%;background:${clsColor(h.class)}" title="${esc(h.name)} ${Math.round(h.hps / tot * 100)} %"></i>`).join("")}</div><div class="hleg">${L.map(h => `<span><i style="background:${clsColor(h.class)}"></i>${esc(h.name)} <b>${Math.round(h.hps / tot * 100)} %</b></span>`).join("")}</div>` : "";
  const adv = (c.advice || []).filter(t => !/^Répartition du soin/.test(t) && !/pic\(s\) de dégâts du raid sans aucun CD/.test(t));
  const head = `<section class="card"><h2>La compo healers</h2><div class="kpis">${k2(ov, "CD de raid empilés", "deux CD à moins de 10 s", ov ? "warn" : "good")}${spikes ? k2(`${unc}/${spikes}`, "Pics de dégâts sans CD", "voir la chronologie ci-dessous", unc ? "bad" : "good") : ""}${k2(wasted, "CD lancés sans dégâts", "raid peu touché à ce moment", wasted ? "warn" : "good")}</div>
    ${bar}${adv.length ? `<h4>À retenir</h4><ul class="adv">${adv.map(t => `<li class="warn">${esc(t)}</li>`).join("")}</ul>` : ""}</section>`;
  const notes = card("Notes des healers", muted("Note du fight = moyenne pondérée des catégories (toutes sur 10) : strat, soins, survie, gameplay (poids 1) ; pas de note de dégâts pour les healers. « Soin/dégâts » = soin effectif du healer divisé par les dégâts subis par tout le raid : c'est la comparaison juste, car les kills du top sont plus courts et plus intenses. Écarts en % du top, overheal en points. Clique un nom pour sa fiche.") +
    table([{ l: "Healer" }, { l: "Spé" }, { l: "Soin/dégâts vs top", num: 1 }, { l: "HPS brut vs top", num: 1 }, { l: "Sorts/min vs top", num: 1 }, { l: "Overheal vs top", num: 1 }, { l: "HPS vs même compo", num: 1 }, { l: "Gameplay", num: 1 }, { l: "Strat", num: 1 }, { l: "Note", num: 1 }],
      H.healers.map((h, i) => [{ h: `<a href="#" class="gplink" data-gp="h${i}">${cname(h.name, h.class, 18)}</a>`, v: h.name }, h.spec, { h: dchip(h.vs_top?.cover, "%") || "—", v: h.vs_top?.cover ?? -999 }, { h: dchip(h.vs_top?.hps, "%") || "—", v: h.vs_top?.hps ?? -999 },
        { h: dchip(h.vs_top?.cpm, "%") || "—", v: h.vs_top?.cpm ?? -999 }, { h: dchip(h.vs_top?.overheal, " pts", true) || "—", v: -(h.vs_top?.overheal ?? 999) }, { h: h.vs_compo ? dchip(h.vs_compo.hps, "%") : '<span class="muted small">aucun log</span>', v: h.vs_compo?.hps ?? -999 },
        h.gameplay_score ?? "—", h.strat_score ?? "—", { h: scoreB(h.score), v: h.score ?? 0 }])));
  const m = b.healerMeta || {};
  return head + notes + muted(`Référence : moyenne des ${H.top_count ?? m.top_count} meilleurs logs mondiaux (HPS) de chaque spé sur ${esc(b.name)}, uniquement des kills joués avec ${m.healer_count ?? "le même nombre de"} healers comme vous${fbList(H)}. Les tops sont des kills et nos pulls peuvent être des wipes : tout est ramené à la minute de combat.`) +
    (H.errors && H.errors.length ? muted("Limites : " + esc(H.errors.join(" · "))) : "");
}
function raidCdPane(H) {
  const c = H.compo, tl = c.timelines || [];
  const chrono = tl.length ? card("Chronologie des CD de raid", `<div class="tlleg"><span><i class="k-dm"></i>Dégâts subis par le raid</span><span><i class="k-spk"></i>Pic de dégâts couvert par un CD</span><span><i class="k-miss"></i>Pic de dégâts sans aucun CD de raid</span><span><i class="k-ov"></i>CD qui chevauche un autre CD</span><span><i class="k-wa"></i>CD lancé sans gros dégâts</span></div>` +
    muted(`Tous les CD de raid lancés sont affichés (cadre gris) ; en couleur, les problèmes. Un pic = au moins 1,5× les dégâts habituels du pull et parmi les 20 % les plus forts. Chevauchement = un CD de raid lancé moins de ${c.overlap_s} s après celui d'un autre healer, sauf pendant de très gros dégâts (au moins 2× l'habituel), où empiler est voulu. Survole un élément pour le détail.`) +
    tl.map((t, i) => `<details class="tlw"${i === 0 ? " open" : ""}><summary>Pull ${t.pull} · ${mmss(t.duration_s)} · ${t.counts.overlaps} chevauchement(s) · ${t.counts.wasted} CD sans dégâts · ${t.counts.uncovered}/${t.counts.spikes} pic(s) sans CD</summary>${cdTimeline(t)}</details>`).join("")) : "";
  return chrono + card("CD de raid par healer", muted("Sorts de soin de groupe que le top lance environ une fois toutes les 2 min ou moins souvent (les CD ciblés comme Ironbark ou Innervate sont exclus).") +
    (c.cd_usage || []).map(u => `<h4>${esc(u.healer)} — ${esc(u.spec)}</h4>${u.cds.length ? `<div class="dc">${u.cds.map(x => `<span>${sp(x.name, x.icon, 22, true, x.id)} <b>${fr(x.per_pull)}</b>/pull ${timesH(x.times)}</span>`).join("")}</div>` : muted("Aucun CD majeur détecté.")}`).join("")) +
    card(`CD empilés (${c.overlaps_total ?? 0})`, muted("Un CD de raid lancé moins de 10 s après celui d'un autre healer, hors très gros dégâts (compté une fois par CD, pas par paire) : souvent du soin gaspillé, et un moment fort plus tard sans couverture. Seuls les vrais CD de raid comptent (liste fixe).") +
      (c.overlaps && c.overlaps.length ? table([{ l: "Pull", num: 1 }, { l: "Temps", num: 1 }, { l: "CD 1" }, { l: "CD 2" }], c.overlaps.map(o => [o.pull, { h: mmss(o.time_s), v: o.time_s }, { h: sp(o.a, o.a_icon, 18, true, o.a_id), v: o.a }, { h: sp(o.b, o.b_icon, 18, true, o.b_id), v: o.b }])) : '<p class="good">Aucun chevauchement détecté.</p>'));
}
/* Onglet Gameplay d'une vue : sélecteur (healers, tanks, mêlée, distance) puis la fiche choisie */
function gameplayView(v, b) {
  const G = v.gameplay, okG = G && !G.error, P = okG ? G.players || [] : [], H = v.healers && v.healers.healers ? v.healers.healers : [];
  if (!P.length && !H.length) return muted(esc((G && G.error) || b.healerError || "Pas de données de gameplay pour cette vue (pull trop court ou analyse désactivée)."));
  const first = H.length ? "c" : "0", rf = (k, i) => `${b.key}|${v.key}|${k}|${i}`;
  const btn = (key, name, cls, sub, badge, ic = "") => `<button class="gpb${key === first ? " on" : ""}" data-gp="${key}" data-name="${esc(name)}" style="--cc:${cls ? clsColor(cls) : "var(--acc)"}">${cls ? clsic(cls, 26) : `<span class="gpi">${ic}</span>`}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span>${badge}</button>`;
  const badge = x => x.score != null ? scoreB(x.score) : x.gameplay_score != null ? scoreB(x.gameplay_score) : chip("—");
  const hG = H.length ? `<div class="gpg"><div class="gpgl">Healers</div><div class="gpgb">${btn("c", "Compo", null, "analyse de la compo", "", "◎")}${H.map((h, i) => btn("h" + i, h.name, h.class, h.spec, badge(h))).join("")}${btn("r", "CD de raid", null, "chronologie des CD", "", "⏱")}</div></div>` : "";
  const groups = hG + [["tank", "Tanks"], ["melee", "DPS mêlée"], ["ranged", "DPS distance"]].map(([g, l]) => {
    const L = P.map((p, i) => [p, i]).filter(([p]) => (p.role === "tank" ? "tank" : p.sub === "melee" ? "melee" : "ranged") === g).sort((a, c) => a[0].name.localeCompare(c[0].name, "fr"));
    return L.length ? `<div class="gpg"><div class="gpgl">${l}</div><div class="gpgb">${L.map(([p, i]) => btn(String(i), p.name, p.class, p.spec, badge(p))).join("")}</div></div>` : ""; }).join("");
  const all = P.length ? `<details class="gpall"><summary>Tableau des DPS et tanks</summary>${table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Spé" }, { l: "Note", num: 1 }, { l: "Gameplay", num: 1 }, { l: "DPS", num: 1 }, { l: "vs top" }, { l: "Sorts/min vs top" }, { l: "Inactivité", num: 1 }, { l: "CD alignés", num: 1 }, { l: "Priorité" }],
    P.map((p, i) => [{ h: `<a href="#" class="gplink" data-gp="${i}">${cname(p.name, p.class, 18)}</a>`, v: p.name }, p.role === "tank" ? "Tank" : "DPS", p.spec, { h: p.score != null ? scoreB(p.score) : "—", v: p.score ?? -1 }, { h: p.gameplay_score != null ? scoreB(p.gameplay_score) : '<span class="muted small">sans réf.</span>', v: p.gameplay_score ?? -1 },
      { h: kk(p.dps), v: p.dps ?? 0 }, { h: dchip(p.vs_top?.dps, "%") || "—", v: p.vs_top?.dps ?? -999 }, { h: dchip(p.vs_top?.cpm, "%") || "—", v: p.vs_top?.cpm ?? -999 },
      { h: p.idle != null ? `${fr(p.idle)} %${p.idle_top != null ? ` (top ${fr(p.idle_top)})` : ""}` : "—", v: p.idle ?? -1 }, { h: p.chrono?.align?.ours != null ? `${p.chrono.align.ours} %${p.chrono.align.top != null ? ` (top ${p.chrono.align.top})` : ""}` : "—", v: p.chrono?.align?.ours ?? -1 },
      (p.advice.find(x => x.level === "bad") || p.advice.find(x => x.level === "warn"))?.topic ?? "—"]))}</details>` : "";
  const m = b.healerMeta || {};
  const intro = v.healers ? muted(`${v.healers.pulls} pull(s) · ${fr(v.healers.minutes)} min de combat par healer · références : top ${m.top_count ?? "?"} mondial de chaque spé, kills à ${m.healer_count ?? "?"} healers${m.same_compo ? `, et kills avec la même compo de healers (${esc(m.healer_compo ?? "?")})` : ""}${m.context_label ? ` · si un healer descend dans le ${esc(m.context_label)}, comparé aux tops qui y descendent aussi` : ""}${fbList(v.healers)}`) : "";
  const hPanels = H.length ? gpp("c", null, first === "c", null, intro + unhealedCard(v.healers) + compoPane(v.healers, b)) + H.map((h, i) => healerPanel(h, "h" + i, rf("h", i), false)).join("") + gpp("r", null, false, null, intro + raidCdPane(v.healers)) : "";
  const pPanels = P.map((p, i) => playerPanel(p, String(i), rf("g", i), String(i) === first)).join("");
  return `<div class="gpwrap"><section class="card"><h3>Gameplay — choisis un joueur</h3>
    ${muted(`Chaque joueur est comparé aux meilleurs logs mondiaux de sa spé sur ce boss, à la même difficulté${okG ? ` (${G.top_count} logs pour les DPS et tanks)` : ""}. « Compo » reprend l'analyse de la compo healers, « CD de raid » la chronologie des cooldowns de raid. Le DPS brut est indicatif (les tops sont des kills plus courts, avec Bloodlust) : l'usage des sorts et leur placement dans le temps sont plus fiables.`)}
    <div class="gpick">${groups}</div>${all}${G && G.error ? muted(esc(G.error)) : ""}${okG && G.errors && G.errors.length ? muted("Limites : " + esc(G.errors.join(" · "))) : ""}</section>${hPanels}${pPanels}</div>`;
}

/* ---------- Stuff (boss.stuff) ---------- */
function stuffView(s) {
  if (!s) return muted("Analyse du stuff non demandée.");
  if (s.error) return muted(esc(s.error));
  if (!s.players.length) return muted("Pas de données de stuff pour ce boss.");
  const req = p => (p.enchants || []).filter(e => e.present && e.required), toFix = s.players.reduce((a, p) => a + p.advice.filter(x => x.level === "bad" || x.level === "warn").length, 0), goals = s.players.filter(p => p.advice.some(x => x.level === "goal")).length;
  const ord = p => `<span class="ord">${p.order.map((x, i) => { const off = p.top_order && x !== p.top_order[i], pts = (p.secondaries.find(y => y.label === x) || {}).ours;
    return `<span class="sb${off ? " off" : ""}" title="${p.top_order ? (off ? `Le top a ${esc(p.top_order[i])} à cette place` : "Comme le top") : ""}">${esc(x)} <small>${pts != null ? Math.round(pts).toLocaleString("fr-FR") : ""}</small></span>`; }).join("<i>›</i>")}</span>`;
  const sm = s.summary, miss = sm.missing_enchants;
  const head = `<section class="card"><h2>Optimisation du stuff</h2><div class="kpis">${kpi("Joueurs analysés", sm.players, `ilvl moyen ${fr(sm.avg_ilvl)}`)}<div class="kpi"><span>Enchantements manquants</span><b class="${miss ? "bad" : "good"}">${miss}</b><small>${miss ? "sur des emplacements que la majorité du raid enchante" : "tout le raid est enchanté"}</small></div>
    ${kpi("Points à corriger", toFix, "enchantements, set, stat principale")}${kpi("Objectifs de stats", goals, "joueur(s) avec une répartition à viser")}</div>
    ${!s.refs_loaded ? '<p class="banner small"><b>Références du top non chargées</b> (quota de l\'API) : pas de comparaison des stats ni de note pour l\'instant ; elles seront complétées automatiquement.</p>' : ""}
    <details class="how"><summary>Comment lire cet onglet</summary><ul class="small"><li>Référence : les ${s.top_count} meilleurs de chaque spé sur ce boss (fiches de début de combat Warcraft Logs).</li>
    <li>Les stats secondaires sont en <b>points</b> (le score de la fiche de début de combat, buffs actifs au pull compris), comme dans les guides de stats. Ce ne sont pas les % de la fiche du personnage : chaque stat a son propre taux de conversion (la polyvalence coûte plus de points par % que le critique). Avec plus de points en polyvalence qu'en critique, on peut donc afficher plus de % de critique en jeu.</li>
    <li>Dans « Priorité secondaires », une stat en rouge n'est pas à la même place que chez le top.</li><li>Set : pièces de set comptées jusqu'à 4. Rouge sous 2 pièces, orange à 2 ou 3, vert à 4.</li>
    <li>L'ilvl et le nombre de gemmes sont affichés sans comparaison : ils dépendent surtout du farm de chacun.</li></ul></details>${s.errors && s.errors.length ? muted(esc(s.errors.join(" · "))) : ""}</section>`;
  const over = card("Vue d'ensemble", table([{ l: "Joueur" }, { l: "Spé" }, { l: "ilvl", num: 1 }, { l: "Priorité secondaires" }, { l: "Priorité Secondaire (Top)" },
    { l: "Enchantements", num: 1, title: "Emplacements enchantés sur ceux à enchanter (enchantés par au moins la moitié du raid ou 60 % du top). Vert : tout est enchanté ; rouge : il en manque." }, { l: "Gemmes", num: 1 }, { l: "Set", num: 1 }, { l: "Note", num: 1 }],
    s.players.map(p => { const r = req(p), ok = r.filter(e => e.has).length, t = Math.min(p.tier, 4);
      return [{ h: pl(p.name, p.class, p.role), v: p.name }, p.spec, p.ilvl ?? "—", { h: ord(p), v: p.top_order ? p.order.filter((x, i) => x !== p.top_order[i]).length : 0 }, p.top_order ? p.top_order.join(" > ") : "—",
        { h: chip(`${ok}/${r.length}`, ok === r.length ? "good" : "bad"), v: ok - r.length }, p.gems, { h: chip(`${t} / 4`, t < 2 ? "bad" : t < 4 ? "warn" : "good"), v: t },
        { h: p.score == null ? '<span class="muted small">sans référence</span>' : chip(`${p.score}/10`, p.score >= 8 ? "good" : p.score >= 5 ? "warn" : "bad"), v: p.score ?? -1 }]; })));
  const det = s.players.map(p => `<details class="card"><summary><b>${esc(p.name)}</b> <span class="muted small">${esc(p.spec)} · ilvl ${p.ilvl ?? "?"} · ${p.advice.filter(a => a.level === "bad" || a.level === "warn").length} point(s) à corriger${p.advice.some(a => a.level === "goal") ? " · 1 objectif" : ""}</span></summary>
    ${!p.top_n ? muted("Pas de référence du top chargée pour cette spé : seuls les enchantements sont vérifiés.") : ""}
    ${p.advice.length ? `<ul class="adv short">${p.advice.map(a => `<li class="${a.level}"><details><summary>${esc(a.short ?? a.text)}</summary><p class="small">${esc(a.text)}</p></details></li>`).join("")}</ul>` : p.top_n ? '<p class="good">Rien à signaler par rapport au top.</p>' : ""}
    <h4>Stats secondaires</h4><div class="secs">${p.secondaries.map(x => `<div class="sec"><span>${esc(x.label)}</span><div class="bars"><div class="bar"><i style="width:${x.ours_share}%"></i><span>Toi ${x.ours_share} % (${Math.round(x.ours).toLocaleString("fr-FR")} pts)</span></div>${x.top_share != null ? `<div class="bar top"><i style="width:${x.top_share}%"></i><span>Top ${x.top_share} % (${Math.round(x.top).toLocaleString("fr-FR")} pts)</span></div>` : ""}</div>${x.target != null ? `<span class="tgt ${x.gap_pts >= 3 ? "up" : x.gap_pts <= -3 ? "down" : ""}" title="Valeur à viser avec ton total de secondaires actuel, réparti comme le top">${x.gap_pts >= 3 ? "▲" : x.gap_pts <= -3 ? "▼" : "="} cible ~${Math.round(x.target).toLocaleString("fr-FR")} pts</span>` : ""}</div>`).join("")}</div>
    ${muted("Cible = ton total de stats secondaires actuel réparti comme celui du top : ça montre quoi échanger contre quoi.")}${muted(`Stat principale : ${p.primary}${p.top_primary ? ` (top ${p.top_primary})` : ""}.`)}
    ${p.enchants && p.enchants.length ? `<h4>Enchantements</h4>${muted("Un emplacement est à enchanter s'il l'est chez au moins la moitié du raid (ou 60 % du top de la spé).")}<div class="ench">${p.enchants.map(e => chip(`${esc(e.slot)} ${e.has ? "✓" : e.present ? "✗" : "—"} · raid ${e.raid_pct} %${e.top_pct != null ? ` · top ${e.top_pct} %` : ""}`, e.has ? "good" : e.required && e.present ? "bad" : "")).join(" ")}</div>` : ""}
    ${p.tops && p.tops.length ? `<h4>Fiches de référence</h4>${table([{ l: "Joueur" }, { l: "Guilde" }, { l: "ilvl", num: 1 }, { l: "Ordre des secondaires" }], p.tops.map(r => [{ h: r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.who)}</a>` : esc(r.who), v: r.who }, r.guild ?? "", r.ilvl ?? "", r.order]))}` : ""}</details>`).join("");
  return head + over + det;
}

/* ---------- Progression (boss.history) ---------- */
const DIFF_ID = { 3: "Normal", 4: "Héroïque", 5: "Mythique" };
const histDate = h => h.date ? new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : h.code.slice(0, 6);
function progressionView(b) {
  const hist = [...b.history].sort((a, c) => a.date - c.date), n = hist.length;
  if (!n) return muted("Pas encore d'historique pour ce boss.");
  const W = 760, L = 40, Rr = 720, T = 14, B = 190;
  const sx = i => n === 1 ? (L + Rr) / 2 : L + i / (n - 1) * (Rr - L), yb = v => T + v / 100 * (B - T), ya = v => B - v / 10 * (B - T);
  let s = `<svg class="hist" viewBox="0 0 ${W} 220">`;
  [0, 25, 50, 75, 100].forEach((v, i) => { s += `<line x1="${L}" x2="${Rr}" y1="${yb(v)}" y2="${yb(v)}" class="gl"/><text x="${L - 6}" y="${yb(v) + 4}" text-anchor="end">${v}%</text><text x="${Rr + 6}" y="${yb(v) + 4}">${fr(10 - i * 2.5)}</text>`; });
  s += `<path d="${hist.map((h, i) => `${i ? "L" : "M"}${sx(i)},${yb(h.best_pct)}`).join("")}" class="hbest"/><path d="${hist.map((h, i) => `${i ? "L" : "M"}${sx(i)},${ya(h.avg_score)}`).join("")}" class="havg"/>`;
  hist.forEach((h, i) => { s += `<circle cx="${sx(i)}" cy="${yb(h.best_pct)}" r="4" class="dbest"><title>${histDate(h)} — meilleur pull : ${fr(h.best_pct)} % · ${h.kills} kill(s) sur ${h.pulls} pulls (${DIFF_ID[h.difficulty] || h.difficulty})</title></circle><circle cx="${sx(i)}" cy="${ya(h.avg_score)}" r="4" class="davg"><title>${histDate(h)} — note moyenne : ${fr(h.avg_score)}/10</title></circle><text x="${sx(i)}" y="212" text-anchor="middle">${histDate(h)}</text>`; });
  s += "</svg>";
  const last = hist[n - 1], names = [...new Set(hist.flatMap(h => Object.keys(h.players)))].sort((a, c) => (last.players[a]?.score ?? 99) - (last.players[c]?.score ?? 99));
  return card("Progression sur ce boss", muted(`${n} soirée(s) enregistrée(s) sur ce boss.`) +
    `<div class="legend"><span><i class="lbest"></i>Meilleur pull (% PV du boss, en haut = plus bas)</span><span><i class="lavg"></i>Note moyenne du raid (/10)</span></div>${s}<p class="small">Dernière soirée par rôle : ${last.role_scores.map(r => `${esc(r.label)} ${r.pct} %`).join(" · ")}</p>`) +
    `<section class="card"><h3>Note de chaque joueur, soirée par soirée</h3><div class="tw"><table class="sortable"><thead><tr><th>Joueur</th>${hist.map(h => `<th class="num">${histDate(h)}</th>`).join("")}</tr></thead><tbody>` +
    names.map(p => `<tr><td data-v="${esc(p)}">${esc(p)}</td>${hist.map(h => { const v = h.players[p]; return `<td class="num" data-v="${v ? v.score : ""}">${v ? chip(fr(v.score), noteCls(v.score)) : "–"}</td>`; }).join("")}</tr>`).join("") + "</tbody></table></div></section>";
}

/* ---------- page d'un boss ---------- */
/* id : identifiant unique de la page (soirée + boss), b : RaidExportBoss */
/* mem : contenu de l'onglet Membres (members(), report.js) */
function bossPage(id, b, mem = "") {
  const all = b.views[0], pulls = b.views.slice(1), prog = (all.raid?.global?.pulls_total ?? 0) >= 2 && (b.history || []).length > 0;
  const opts = `<optgroup label="Ensemble"><option value="${all.key}">${esc(all.label)}</option></optgroup>` + (pulls.length ? `<optgroup label="Pulls">${pulls.map(v => `<option value="${v.key}">${v.kill ? "Kill · " : ""}${esc(v.label)}</option>`).join("")}</optgroup>` : "");
  const killView = pulls.find(v => v.kill);
  const best = [...all.raid.pulls].sort((a, c) => a.boss_pct - c.boss_pct)[0], bestView = best && pulls.find(v => v.key === "p" + best.pull);
  const goBtn = killView ? `<button class="vbtn" data-view-go="${killView.key}">Voir le kill</button>` : bestView ? `<button class="vbtn" data-view-go="${bestView.key}">Voir le meilleur pull</button>` : "";
  /* Un seul pull (kill compris) : pas de choix de pull à proposer, la barre est masquée (la vue « tous les pulls » est ce pull) */
  /* Vue « tous les pulls » rendue tout de suite ; les vues d'un pull sont rendues à la première sélection (js/app.js, renderView) */
  const viewed = (fn, kind) => b.views.map((v, i) => i ? `<div class="view" data-view="${v.key}" data-lazy="${kind}" hidden></div>` : `<div class="view" data-view="${v.key}">${fn(v)}</div>`).join("");
  /* En-tête : nom du boss et choix du pull, sur l'image du boss (la même que sur l'accueil), hauteur fixe */
  return `<div class="boss" data-boss="${id}" hidden><section class="bhero">${ban(TILE_HUE, initials(b.name), bossImg(b.name))}<div class="bhin"><div class="bhead"><h2>${esc(b.name)}</h2>${diff(b.difficulty)}<span class="muted">${esc(String(b.subtitle ?? "").replace(/\s*·?\s*fiche intégrée/, ""))}</span></div>
    <div class="viewbar"${pulls.length <= 1 ? " hidden" : ""}><label><b>Pulls :</b></label><select class="viewsel">${opts}</select>${goBtn}<button class="vbtn" data-view-go="${all.key}">Tous les pulls</button><span class="muted small">Par défaut, tous les pulls du boss ; choisis le kill ou un pull précis pour le détail.</span></div></div></section>
    ${b.missing.length ? `<details class="miss"><summary>Données incomplètes pour ce boss (${b.missing.length})</summary><ul class="small">${b.missing.map(m => `<li>${esc(m)}</li>`).join("")}</ul><p class="small muted">Relance l'analyse quand le quota est revenu : seules ces données seront téléchargées.</p></details>` : ""}
    ${(b.limits || []).length ? `<details class="miss lim"><summary>Références du top limitées (${b.limits.length})</summary><ul class="small">${b.limits.map(m => `<li>${esc(m)}</li>`).join("")}</ul><p class="small muted">Pas assez de logs du top comparables sur Warcraft Logs : ce n'est pas un manque de quota, une nouvelle analyse ne changera rien.</p></details>` : ""}
    ${pulls.length >= 2 && (all.raid?.global?.pulls_analyzed ?? 0) >= 2 ? `<div class="bkpis" data-for="${all.key}">${bossKpis(all.raid)}</div>` : ""}
    ${tabset(["Raid", "Analyse", "Membres", "Gameplay", "Stuff", ...(prog ? ["Progression"] : [])], [viewed(v => raidView(v.raid, b, v), "raid"), viewed(v => analyseView(v, b), "an"), mem, viewed(v => gameplayView(v, b), "gp"), stuffView(b.stuff), ...(prog ? [progressionView(b)] : [])], true)}</div>`;
}

/* ---------- Onglet « Analyse » : nouveaux écrans, plus lisibles, construits boss par boss ----------
   Les écrans de l'onglet Raid restent inchangés ; une information peut se trouver aux deux endroits. Chaque boss a (ou aura)
   son propre contenu : ANALYSE associe un test sur le boss à la fonction qui dessine l'onglet pour la vue choisie
   (tous les pulls ou un pull). Un boss sans contenu dédié affiche un message d'attente. */
const ANALYSE = [
  { test: b => /nek.?zali/i.test(b.name || ""), panes: (v, b) => [] /* écrans propres à Nek'zali : à venir */ },
];
function analyseView(v, b) {
  const r = v.raid, x = r.extras || {};
  const spec = ANALYSE.find(a => a.test(b)), own = spec ? spec.panes(v, b) : [];
  /* écrans communs à tous les boss, puis Préparation tout à droite */
  const labels = [...own.map(o => o[0]), "Joueurs", "Chronologie"], panes = [...own.map(o => o[1]), anPlayers(v), anChrono(x.timelines || [], v.key !== "all")];
  if (x.prep_available) { labels.push("Préparation"); panes.push(prep(x.prep)); }
  return tabset(labels, panes);
}
/* Joueurs : strat et gameplay côte à côte ; note du fight = moyenne des deux (strat seule si le gameplay manque) */
function anPlayers(v) {
  const r = v.raid, gp = new Map();
  for (const x of (v.gameplay && !v.gameplay.error ? v.gameplay.players : null) || []) if (x.gameplay_score != null) gp.set(x.name + "|dps", x.gameplay_score);
  for (const h of (v.healers && v.healers.healers) || []) if (h.gameplay_score != null) gp.set(h.name + "|healer", h.gameplay_score);
  const gOf = p => gp.get(p.player + (p.role === "healer" ? "|healer" : "|dps")) ?? gp.get(p.player + (p.role === "healer" ? "|dps" : "|healer")) ?? null;
  const rows = r.players.map(p => { const g = gOf(p), n = g != null ? Math.round((p.score + g) / 2 * 10) / 10 : p.score; return { p, g, n }; }).sort((a, b) => b.n - a.n);
  return `<div class="anplayers">` + card("Joueurs", muted("Strat sur 10 : mécaniques (10 = aucune erreur régulière). Gameplay sur 10 : comparaison aux meilleurs logs de la spé (activité, sorts, CD). Note du fight = moyenne de la strat et du gameplay ; sans gameplay (pas de référence du top), la strat seule, marquée ≈. Les morts sont listées à côté. Clique sur une colonne pour trier.") +
    table([{ l: "Joueur" }, { l: "Rôle" }, { l: "Pulls", num: 1 }, { l: "Morts / pull", num: 1 }, { l: "Points à améliorer" }, { l: "Strat", num: 1 }, { l: "Gameplay", num: 1 }, { l: "Note du fight", num: 1 }],
      rows.map(({ p, g, n }) => [{ h: pl(p.player, p.class, p.role, p.sub), v: p.player }, p.role_label, p.pulls, { h: fr(p.deaths_per_pull, 2), v: p.deaths_per_pull },
        { h: p.issues.map(i => `<span class="issue" title="${esc(i.kind)}">${i.icon ? sp(i.mechanic, i.icon, 16, false, i.spell_id) : ""}<b>${esc(i.mechanic)}</b> ${esc(i.text)} <i>${esc(i.detail)}</i></span>`).join("") || '<span class="muted">—</span>', v: p.issues.length },
        { h: chip(fr(p.score) + "/10", noteCls(p.score)), v: p.score }, { h: g != null ? chip(fr(g) + "/10", noteCls(g)) : '<span class="muted small">sans réf.</span>', v: g ?? -1 },
        { h: chip(fr(n) + "/10", noteCls(n)) + (g == null ? '<sup class="partial" title="Strat seule : gameplay sans référence du top">≈</sup>' : ""), v: n }]))) + `</div>`;
}
/* Chronologie : un bloc repliable par pull (tous fermés sur la vue « tous les pulls » ; ouvert pour un pull choisi) */
function anChrono(timelines, one) {
  if (!timelines.length) return muted("Pas de chronologie pour cette vue.");
  const leg = `<div class="tlleg"><span><i class="k-ph"></i>Phases du combat</span><span><i class="k-bc"></i>Compétence du boss (un trait par lancer)</span><span><i class="k-dm"></i>Dégâts subis par le raid</span><span><b class="k-sk">✖</b>Mort</span><span><i class="k-er"></i>Erreur de mécanique, une ligne par type</span><span><i class="k-cut"></i>Après la coupe du pull : non compté</span></div>`;
  return card("Chronologie", leg + muted(one ? "Survole un élément pour le détail ; « Déroulé détaillé » donne la liste complète." : "Un bloc par pull : ouvre celui qui t'intéresse. Survole un élément pour le détail ; « Déroulé détaillé » donne la liste complète.")) +
    timelines.map(t => `<section class="card anpull">${frise(t).replace('<details class="tlw">', `<details class="tlw"${one ? " open" : ""}>`)}</section>`).join("");
}

/* Rendu d'une vue d'un pull à la demande : el = <div class="view" data-lazy="raid|gp">, dans la page du boss */
function renderView(el) {
  const b = X.bosses.find(x => x.key === el.closest(".boss").dataset.boss), v = b && b.views.find(x => x.key === el.dataset.view);
  if (!v) return;
  el.innerHTML = el.dataset.lazy === "raid" ? raidView(v.raid, b, v) : el.dataset.lazy === "an" ? analyseView(v, b) : gameplayView(v, b);
  el.removeAttribute("data-lazy");
  if (window.initMaps) initMaps(el);
  if (window.initVk) initVk(el);
  if (window.initNy) initNy(el);
}

/* ---------- Analyse détaillée de Sszorak (boss.deep.sszorak) : frise des erreurs, Serpent's Fury, Virulence, Crosswinds, Mutilate, kystes ---------- */
/* Frise d'un pull : une ligne par mécanique, intermissions grisées, enrage en rouge, coupure du pull en pointillés */
function szTimeline(p, refPops) {
  const W = 900, L = 118, R = 12, rows = ["Combo du boss", "Serpent's Fury", "Virulence", "Crosswinds", "Mutilate", "Kystes", "Morts"], RH = 30, T = 18, H = T + rows.length * RH + 22;
  const dur = Math.max(30, p.dur_s), x = t => L + Math.max(0, Math.min(dur, t)) / dur * (W - L - R), ry = i => T + i * RH + RH / 2;
  let g = "";
  for (const it of p.intermissions) g += `<rect x="${x(it.start_s)}" y="${T - 4}" width="${Math.max(2, x(it.end_s) - x(it.start_s))}" height="${rows.length * RH + 4}" fill="var(--line)" fill-opacity=".45"><title>Intermission (Dig In) ${mmss(it.start_s)} → ${mmss(it.end_s)}</title></rect>`;
  rows.forEach((r, i) => { g += `<text x="4" y="${ry(i) + 4}" class="szl">${r}</text><line x1="${L}" x2="${W - R}" y1="${ry(i)}" y2="${ry(i)}" stroke="var(--line)" stroke-dasharray="2 4"/>`; });
  for (let t = 0; t <= dur; t += dur > 360 ? 60 : 30) g += `<text x="${x(t)}" y="${H - 6}" text-anchor="middle" class="szl">${mmss(t)}</text>`;
  const C = { R: ["#ef4444", "Ravage (cône du tank, loin du raid)"], M: ["#60a5fa", "Mutilate (soak de groupe)"], T: ["#a78bfa", "Tempest (tornades)"] };
  for (const c of p.combos) g += `<g><rect x="${x(c.t_s) - 5}" y="${ry(0) - 7}" width="10" height="14" rx="2" fill="${C[c.k][0]}"/><text x="${x(c.t_s)}" y="${ry(0) + 4}" text-anchor="middle" font-size="9" fill="#fff">${c.k}</text><title>${C[c.k][1]} ${mmss(c.t_s)}</title></g>`;
  for (const f of p.fury) { const e = f.pop_s ?? p.dur_s, col = f.ok ? "#22c55e" : "#f59e0b";
    g += `<rect x="${x(f.start_s)}" y="${ry(1) - 6}" width="${Math.max(2, x(e) - x(f.start_s))}" height="12" rx="3" fill="${col}" fill-opacity=".35" stroke="${col}"><title>Serpent's Fury ${f.n} : marque ${mmss(f.start_s)} → pop ${f.pop_s != null ? mmss(f.pop_s) : "jamais"} · ${f.soakers} joueurs packés</title></rect>`;
    if (f.pop_s != null) g += `<text x="${x(f.pop_s)}" y="${ry(1) - 9}" text-anchor="middle" class="szl">${f.soakers}</text>`; }
  for (const [i, t] of (refPops || []).entries()) if (t != null) g += `<line x1="${x(t)}" x2="${x(t)}" y1="${ry(1) + 7}" y2="${ry(1) + 13}" stroke="var(--fg)" stroke-width="2"><title>Pop ${i + 1} du top (médiane) : ${mmss(t)}</title></line>`;
  for (const h of p.vir_hits) g += `<circle cx="${x(h.t_s)}" cy="${ry(2)}" r="${h.died ? 7 : 5}" fill="#ef4444"${h.died ? ' stroke="var(--fg)" stroke-width="2"' : ""}><title>${esc(h.victim)} pris dans la ligne de ${esc(h.from || "?")} ${mmss(h.t_s)}${h.died ? " (mort)" : ""}</title></circle>`;
  for (const w of p.winds) g += `<rect x="${x(w.t_s)}" y="${ry(3) - 5}" width="${Math.max(2, x(w.knock_s) - x(w.t_s))}" height="10" rx="3" fill="${w.bad ? "#ef4444" : "#38bdf8"}" fill-opacity=".5"><title>Raging Crosswinds ${mmss(w.t_s)} → projection ${mmss(w.knock_s)}${w.bad ? " : chute ou mort" : ""}</title></rect>`;
  for (const m of p.mutilate) g += `<g><circle cx="${x(m.t_s)}" cy="${ry(4)}" r="8" fill="${m.low ? "#ef4444" : "#60a5fa"}" fill-opacity=".8"/><text x="${x(m.t_s)}" y="${ry(4) + 3}" text-anchor="middle" font-size="9" fill="#fff">${m.count}</text><title>Mutilate ${mmss(m.t_s)} : ${m.count} soakers${m.low ? " (moins de 5)" : ""}</title></g>`;
  for (const c of p.cysts) g += `<circle cx="${x(c.t_s)}" cy="${ry(5)}" r="5" fill="${c.ok ? "#22c55e" : "#ef4444"}"><title>Kyste éclaté ${mmss(c.t_s)} : ${c.hit} joueurs projetés${c.ok ? " (pendant l'intermission)" : " (hors intermission)"}</title></circle>`;
  for (const d of p.deaths) g += `<text x="${x(d.t_s)}" y="${ry(6) + 5}" text-anchor="middle" fill="#ef4444" font-size="15">✕<title>${esc(d.player)} mort ${mmss(d.t_s)} (${esc(d.killer)})</title></text>`;
  if (p.cut_s != null) g += `<line x1="${x(p.cut_s)}" x2="${x(p.cut_s)}" y1="${T - 6}" y2="${T + rows.length * RH}" stroke="var(--fg)" stroke-dasharray="4 3"><title>Appel du wipe ${mmss(p.cut_s)}</title></line>`;
  if (p.enrage_s != null) g += `<line x1="${x(p.enrage_s)}" x2="${x(p.enrage_s)}" y1="${T - 6}" y2="${T + rows.length * RH}" stroke="#ef4444" stroke-width="3"><title>Enrage (Unbound Ferocity) ${mmss(p.enrage_s)}</title></line>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="szt" style="width:100%;max-width:${W}px" role="img" aria-label="Frise du pull ${p.pull}">${g}</svg>`;
}
/* Carte d'un éclatement de Virulence : chaque porteur et sa croix (axes de la salle, longueur approximative), victimes en rouge */
function szMap(w) {
  const m = w.map; if (!m) return "";
  const ARM = 12, P = m.pts, xs = P.map(p => p.x), ys = P.map(p => p.y);
  const x0 = Math.min(...xs) - ARM, x1 = Math.max(...xs) + ARM, y0 = Math.min(...ys) - ARM, y1 = Math.max(...ys) + ARM;
  const W = 560, H = Math.max(260, Math.min(520, W * (y1 - y0) / Math.max(1, x1 - x0))), k = Math.min(W / (x1 - x0), H / (y1 - y0));
  const sx = x => (x - x0) * k, sy = y => H - (y - y0) * k;
  const vict = new Set(m.hits.map(h => h.victim)), from = new Set(m.hits.map(h => h.from).filter(Boolean));
  let g = "";
  for (const p of P) { const c = from.has(p.n) ? "#f97316" : "#94a3b8", o = from.has(p.n) ? 0.8 : 0.25;
    g += `<line x1="${sx(p.x - ARM)}" x2="${sx(p.x + ARM)}" y1="${sy(p.y)}" y2="${sy(p.y)}" stroke="${c}" stroke-opacity="${o}" stroke-width="3"/><line x1="${sx(p.x)}" x2="${sx(p.x)}" y1="${sy(p.y - ARM)}" y2="${sy(p.y + ARM)}" stroke="${c}" stroke-opacity="${o}" stroke-width="3"/>`; }
  for (const h of m.hits) { const a = P.find(p => p.n === h.from), b = P.find(p => p.n === h.victim); if (a && b) g += `<line x1="${sx(a.x)}" y1="${sy(a.y)}" x2="${sx(b.x)}" y2="${sy(b.y)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"><title>${esc(h.from)} → ${esc(h.victim)}</title></line>`; }
  for (const p of P) g += `<g><circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${vict.has(p.n) ? 7 : 5}" fill="${vict.has(p.n) ? "#ef4444" : clsColor(p.cls)}" stroke="var(--card)" stroke-width="1.5"/><text x="${sx(p.x) + 8}" y="${sy(p.y) - 6}" class="szl">${esc(p.n)}</text><title>${esc(p.n)} : éclate à +${fr(p.t)} s</title></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;background:var(--bg2,transparent)" role="img" aria-label="Carte de la Virulence">${g}</svg>`;
}
function sszorakView(sz, pull) {
  const P = x => pull == null || x.pull === pull, pc = pull == null;
  const pcol = pc ? [{ l: "Pull", num: 1 }] : [], pv = x => pc ? [x.pull] : [];
  const pulls = sz.pulls.filter(P), refMed = n => { const v = (sz.refs || []).map(r => (r.pops.find(q => q.n === n) || {}).pop_s).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
  const refPops = [1, 2, 3, 4, 5, 6, 7, 8].map(refMed);
  const tl = card("Frise des erreurs", muted("Une ligne par mécanique. Combo du boss : R = Ravage, M = Mutilate, T = Tempest. Serpent's Fury : barre de la marque jusqu'au pop (vert si le pop est bon, orange sinon), chiffre = joueurs packés (14 requis), petits traits sous la barre = pops du top au même numéro. Virulence : point rouge = un joueur pris dans une ligne (gros point = mort). Crosswinds : rouge = chute ou mort. Mutilate : chiffre = soakers (rouge sous 5). Kystes : vert pendant l'intermission, rouge hors intermission. Zones grises = intermissions, trait rouge = enrage, pointillés = appel du wipe. Survole un élément pour le détail.") +
    pulls.map((p, i) => `<details class="tlw"${i === 0 ? " open" : ""}><summary>Pull ${p.pull} · ${mmss(p.dur_s)}${p.kill ? " · kill" : ""}${p.enrage_s != null ? ` · <span class="bad">enrage à ${mmss(p.enrage_s)}</span>` : ""} · ${p.vir_hits.length} ligne(s) de Virulence prise(s) · ${p.deaths.length} mort(s)</summary>${szTimeline(p, refPops)}</details>`).join(""));
  const F = sz.fury.filter(P);
  const fury = card("1. Serpent's Fury", muted("Marque sur un joueur : 14 joueurs doivent se packer dans le cercle pour déclencher To the Slaughter, sinon le boss gagne de la rage et s'enrage à 100. « Après le combo » = délai entre le dernier coup du combo (Apex Predator) et le pop. « Avant l'intermission » = avance du pop sur l'intermission ; 2 s plus tôt que le top suffisent à rendre le Fury d'après l'intermission insurvivable. Top = médiane des kills Mythique de référence, au même numéro de pop.") +
    (F.length ? table([...pcol, { l: "Fury", num: 1 }, { l: "Porteur" }, { l: "Marque → pop" }, { l: "Packés", num: 1 }, { l: "Après le combo", num: 1 }, { l: "Avant l'intermission", num: 1 }, { l: "Verdict" }],
      F.map(x => [...pv(x), x.n, x.carrier, { h: `${mmss(x.mark_s)} → ${x.pop_s != null ? mmss(x.pop_s) : "jamais"}${x.held_s != null ? ` <small class="muted">(${fr(x.held_s)} s)</small>` : ""}`, v: x.mark_s },
        { h: `<span class="${x.enough ? "good" : "bad"}">${x.soakers}</span>`, v: x.soakers },
        { h: x.after_combo_s != null ? `${fr(x.after_combo_s)} s${x.ref_after_combo_s != null ? ` <small class="muted">top ${fr(x.ref_after_combo_s)} s</small>` : ""}` : "—", v: x.after_combo_s ?? -1 },
        { h: x.before_int_s != null ? `${fr(x.before_int_s)} s${x.ref_before_int_s != null ? ` <small class="muted">top ${fr(x.ref_before_int_s)} s</small>` : ""}` : "—", v: x.before_int_s ?? -1 },
        { h: x.verdict === "ok" ? '<span class="good">ok</span>' : chip(esc(x.verdict), /enrage|seulement|insurvivable|très dur/.test(x.verdict) ? "bad" : "warn"), v: x.verdict === "ok" ? 0 : 1 }])) : muted("Aucune marque de Serpent's Fury sur cette vue (difficulté sans Fury, ou pull trop court).")));
  const V = sz.virulence.filter(P);
  const vp = (sz.vir_players || []).filter(x => x.hit || x.caused);
  const vir = card("2. Virulence (croix à l'expiration)", muted("Tous les joueurs touchés par To the Slaughter prennent Virulence (5 s). À l'expiration, chacun éclate en croix, alignée sur les axes de la salle : un joueur sur la ligne horizontale ou verticale d'un autre prend un gros coup et reprend Virulence (lignes plus longues la 2e fois). Spread vers les bords tout de suite, en évitant les mêmes lignes.") +
    (V.length ? table([...pcol, { l: "Vague", num: 1 }, { l: "Éclatement", num: 1 }, { l: "Porteurs", num: 1 }, { l: "Lignes prises (victime ← porteur, distance)" }],
      V.map(w => [...pv(w), w.wave, { h: mmss(w.burst_s) + (w.after_cut ? ' <small class="muted">après la coupure</small>' : ""), v: w.burst_s }, w.carriers,
        { h: w.hits.length ? w.hits.map(h => `<span class="${h.died ? "bad" : "warn"}">${esc(h.victim)}</span> ← ${esc(h.from || "?")}${h.dist_m != null ? ` <small class="muted">${fr(h.dist_m)} m</small>` : ""}${h.died ? " (mort)" : ""}`).join("<br>") : '<span class="good">aucune</span>', v: w.hits.length }])) : muted("Aucune Virulence sur cette vue.")) +
    (vp.length ? `<h4>Par joueur</h4>` + table([{ l: "Joueur" }, { l: "Lignes prises", num: 1 }, { l: "Joueurs touchés par sa croix", num: 1 }, { l: "Morts", num: 1 }], vp.map(x => [{ h: pl(x.player, x.class), v: x.player }, x.hit, x.caused, x.deaths])) : "") +
    (() => { const M = V.filter(w => w.map); return M.length ? `<h4>Carte des éclatements</h4>${muted("Position de chaque joueur au moment où il éclate (les éclatements s'enchaînent sur environ 1 s, un joueur après l'autre). Croix grise = la croix de chaque porteur (12 m, longueur approximative) ; orange = un porteur qui a touché quelqu'un ; point rouge = victime ; pointillés = qui a touché qui.")}` +
      M.map((w, i) => `<details${i === 0 ? " open" : ""}><summary>Pull ${w.pull} — vague ${w.wave} (${mmss(w.burst_s)}) · ${w.hits.length} ligne(s) prise(s)</summary>${szMap(w)}</details>`).join("") : ""; })());
  const X = sz.crosswinds.filter(P);
  const cw = card("3. Raging Crosswinds", muted("Joueurs marqués par paires (posés au même instant, directions opposées) : se rentrer dedans en l'air, ou grip / rescue. Chute ou mort dans les 8 s après la projection = paire ratée. Paladins, Prêtres et Chamans : partenaire assigné à l'avance.") +
    (X.length ? table([...pcol, { l: "Set", num: 1 }, { l: "Projection", num: 1 }, { l: "Paires" }, { l: "Chute" }, { l: "Mort" }],
      X.map(x => [...pv(x), x.set, { h: mmss(x.knock_s), v: x.knock_s }, x.pairs.map(p => esc(p.join(" + "))).join("<br>"),
        { h: x.fell.length ? `<span class="bad">${esc(x.fell.join(", "))}</span>` : '<span class="good">aucune</span>', v: x.fell.length }, { h: x.died.length ? `<span class="bad">${esc(x.died.join(", "))}</span>` : '<span class="good">aucune</span>', v: x.died.length }])) : muted("Aucun Raging Crosswinds sur cette vue.")));
  const MU = sz.mutilate.filter(P);
  const mut = card("4. Mutilate (soak de groupe)", muted("Cône du tank tourné vers le groupe : deux groupes égaux en alternance, moins de 5 joueurs dans le soak = mortel. « Déjà au soak précédent » = joueurs qui ont soaké deux Mutilate de suite (alternance ratée).") +
    (MU.length ? table([...pcol, { l: "Mutilate", num: 1 }, { l: "Heure", num: 1 }, { l: "Soakers", num: 1 }, { l: "Déjà au soak précédent" }, { l: "Morts" }],
      MU.map(x => [...pv(x), x.n, { h: mmss(x.t_s), v: x.t_s }, { h: `<span class="${x.low ? "bad" : "good"}" title="${esc(x.soakers.join(", "))}">${x.count}</span>`, v: x.count }, x.again.length ? esc(x.again.join(", ")) : "—", x.died.length ? `<span class="bad">${esc(x.died.join(", "))}</span>` : "—"])) : muted("Aucun Mutilate sur cette vue.")));
  const CY = sz.cysts.filter(P);
  const cy = card("5. Viscous Cyst", muted("Kystes posés par les joueurs marqués (Venomous Surge) : ils doivent exploser pendant les vents de l'intermission (un kyste par poussée) ; un kyste qui éclate ailleurs projette tout le raid.") +
    (CY.length ? table([...pcol, { l: "Heure", num: 1 }, { l: "Joueurs projetés", num: 1 }, { l: "Moment" }, { l: "Posé par" }],
      CY.map(x => [...pv(x), { h: mmss(x.t_s), v: x.t_s }, x.hit, { h: x.during_int ? '<span class="good">intermission</span>' : '<span class="bad">hors intermission</span>', v: x.during_int ? 0 : 1 }, x.placed_by ? `${esc(x.placed_by)} <small class="muted">${mmss(x.placed_s)}</small>` : "—"])) : muted("Aucun kyste éclaté sur cette vue.")));
  return tl + fury + vir + cw + mut + cy + (sz.notes || []).map(n => muted(esc(n))).join("");
}

/* ---------- Nymrissa : orbes de givre prises pendant la pluie, film du combat ---------- */
const NY_COL = { heavy: "#ef4444", heavy_cut: "#f59e0b", dot: "#2dd4bf", out: "#22c55e" };
const NY_LBL = { heavy: "pendant la phase forte (erreur)", heavy_cut: "phase forte, après l'appel du wipe (non compté)", dot: "pendant le DoT (consigne)", out: "hors pluie" };
/* bande de pluie : phase forte (foncée) puis DoT (claire) */
function nyBand(w, x, y, h, label) {
  return `<rect x="${x(w.start_s)}" y="${y}" width="${Math.max(2, x(w.end_s) - x(w.start_s))}" height="${h}" fill="#38bdf8" fill-opacity=".18" stroke="#38bdf8" stroke-opacity=".6"><title>Pluie ${w.n} : ${mmss(w.start_s)} → ${mmss(w.end_s)} (DoT après ${mmss(w.heavy_end_s ?? w.end_s)})</title></rect>` +
    `<rect x="${x(w.start_s)}" y="${y}" width="${Math.max(2, x(w.heavy_end_s ?? w.end_s) - x(w.start_s))}" height="${h}" fill="#ef4444" fill-opacity=".28"><title>Phase forte de la pluie ${w.n} : ${mmss(w.start_s)} → ${mmss(w.heavy_end_s ?? w.end_s)} (pas d'orbe ici)</title></rect>` +
    (label ? `<text x="${x(w.start_s) + 3}" y="${y + 11}" font-size="10" fill="#38bdf8">${label}</text>` : "");
}
/* frise d'un pull : un trait vertical par orbe (couleur = moment), tête ronde au-dessus pour survoler */
function nyLane(S, R, end, W = 900) {
  const L = 8, x = t => L + Math.max(0, Math.min(end, t)) / end * (W - L - 10);
  let g = "";
  for (const w of R) g += nyBand(w, x, 16, 34, `pluie ${w.n}`);
  for (const o of S) { const ua = (o.unauthorized || []).length && !o.after_cut;
    g += `<g><line x1="${x(o.time_s)}" x2="${x(o.time_s)}" y1="14" y2="52" stroke="${NY_COL[o.state]}" stroke-width="2.5"/><circle cx="${x(o.time_s)}" cy="10" r="5" fill="${o.state === "heavy_cut" ? "none" : NY_COL[o.state]}" stroke="${ua ? "#a855f7" : NY_COL[o.state]}" stroke-width="${ua ? 3 : 2}"/>${o.danger ? `<text x="${x(o.time_s)}" y="64" text-anchor="middle" font-size="11" fill="#ef4444">⚠</text>` : ""}<title>Frost Orb ${mmss(o.time_s)} : ${esc(o.soakers.join(", "))} — ${NY_LBL[o.state]} (${esc(o.rel)})${ua ? ` · NON AUTORISÉ : ${esc(o.unauthorized.join(", "))}` : ""}${o.series_len > 1 ? ` · série ${o.series} : orbe ${o.series_idx}/${o.series_len}` : ""}${o.danger ? ` · DANGEREUSE : ${esc(o.low.map(l => l.player + " " + l.pct + " %").join(", "))}` : ""}</title></g>`; }
  for (let t = 0; t <= end; t += end > 360 ? 60 : 30) g += `<text x="${x(t)}" y="66" text-anchor="middle" class="szl">${mmss(t)}</text>`;
  return `<svg viewBox="0 0 ${W} 72" style="width:100%;max-width:${W}px;display:block">${g}</svg>`;
}
/* zoom sur une pluie : 8 s avant à 8 s après, nom du joueur sous chaque orbe */
function nyZoom(w, S) {
  const a = w.start_s - 8, b = w.end_s + 8, W = 900, x = t => 10 + (t - a) / (b - a) * (W - 20);
  const near = S.filter(o => o.time_s >= a && o.time_s <= b);
  let g = nyBand(w, x, 10, 40, "") + `<text x="${x(w.start_s) + 4}" y="22" font-size="11" fill="#fca5a5">phase forte ${mmss(w.start_s)} → ${mmss(w.heavy_end_s ?? w.end_s)}</text><text x="${x(w.heavy_end_s ?? w.end_s) + 4}" y="44" font-size="11" fill="#38bdf8">DoT → ${mmss(w.end_s)}</text>`;
  near.forEach((o, i) => { const X = x(o.time_s), dy = 64 + (i % 3) * 13;
    g += `<line x1="${X}" x2="${X}" y1="8" y2="${dy - 10}" stroke="${NY_COL[o.state]}" stroke-width="2.5"/><text x="${X}" y="${dy}" text-anchor="middle" font-size="11" fill="${NY_COL[o.state]}">${esc(o.soakers.join(", "))} ${mmss(o.time_s)}${(o.unauthorized || []).length ? " ✕ non autorisé" : ""}${o.danger ? " ⚠" : ""}</text>`; });
  for (let t = Math.ceil(a / 5) * 5; t <= b; t += 5) g += `<text x="${x(t)}" y="${110}" text-anchor="middle" class="szl">${mmss(t)}</text>`;
  return `<div class="small"><b>Pluie ${w.n}</b> : ${near.filter(o => o.state === "heavy").length} orbe(s) pendant la phase forte, ${near.filter(o => o.state === "dot").length} pendant le DoT${w.how ? ` <span class="muted">· fin de la phase forte : ${esc(w.how)}</span>` : ""}</div><svg viewBox="0 0 ${W} 116" style="width:100%;max-width:${W}px;display:block">${g}</svg>`;
}
function nymrissaView(ny, pull) {
  const P = x => pull == null || x.pull === pull, pc = pull == null;
  const pcol = pc ? [{ l: "Pull", num: 1 }] : [], pv = x => pc ? [x.pull] : [];
  const S = ny.soaks.filter(P), R = ny.rains.filter(P), bad = S.filter(x => x.state === "heavy");
  const per = new Map(); for (const x of S) for (const n of x.soakers) { const o = per.get(n) || per.set(n, { n, all: 0, rain: 0, dot: 0 }).get(n); o.all++; if (x.state === "heavy") o.rain++; if (x.state === "dot") o.dot++; }
  const cls = new Map((ny.players || []).map(p => [p.player, p.class]));
  const rows = [...per.values()].sort((a, b) => b.rain - a.rain || b.all - a.all);
  const legend = `<div class="legend"><span><i style="background:#ef4444;opacity:.6"></i>phase forte de la pluie (zone rouge)</span><span><i style="background:#38bdf8;opacity:.6"></i>DoT de la pluie (zone bleue)</span><span><i style="background:${NY_COL.heavy}"></i>orbe prise pendant la phase forte (erreur)</span><span><i style="background:${NY_COL.dot}"></i>orbe prise pendant le DoT (consigne)</span><span><i style="background:${NY_COL.heavy_cut}"></i>phase forte, après l'appel du wipe (non comptée)</span><span><i style="background:${NY_COL.out}"></i>hors pluie</span><span><i style="background:#a855f7"></i>contour violet : prise par un joueur non autorisé</span><span>⚠ orbe dangereuse dans une série</span></div>`;
  const lanes = [...new Set([...S.map(x => x.pull), ...R.map(x => x.pull)])].sort((a, b) => a - b).map(pl => {
    const s = S.filter(x => x.pull === pl), r = R.filter(x => x.pull === pl), end = Math.max(30, ...s.map(x => x.time_s + 10), ...r.map(x => x.end_s + 10));
    return `<details class="tlw"${pl === (pull ?? S[0]?.pull) ? " open" : ""}><summary>Pull ${pl} · ${r.length} pluie(s) · ${s.filter(x => x.state === "heavy").length} orbe(s) pendant la phase forte sur ${s.length}</summary>${nyLane(s, r, end)}${r.map(w => nyZoom(w, s)).join("")}</details>`;
  }).join("");
  const orbCard = card("1. Frost Orb et Abyssal Rain", muted("Consigne : les orbes sont prises par les tanks et les chasseurs sous Aspect of the Turtle uniquement, pendant le DoT de la pluie (sinon elles explosent), jamais pendant la phase forte du début (gros coups sur tout le raid). Erreurs : orbe prise par un joueur non autorisé, orbe prise pendant la phase forte. Séries : orbes à moins de 10 s d'écart ; à partir de la 3e, une orbe est dangereuse si des joueurs sont sous 30 % de vie juste après ; la longueur d'une série n'est pas une erreur en soi. Chaque orbe est un trait vertical : sa couleur suffit, même au bord d'une zone. Sous la frise, un zoom par pluie avec le nom de chaque joueur.") + legend + lanes +
    (S.length ? `<h4>Toutes les orbes</h4>` + table([...pcol, { l: "Heure", num: 1 }, { l: "Prise par" }, { l: "Autorisé" }, { l: "Moment" }, { l: "Par rapport à la pluie" }, { l: "Série" }, { l: "Sous 30 % juste après" }, { l: "Morts dans les 6 s" }],
      S.map(x => [...pv(x), { h: mmss(x.time_s), v: x.time_s }, { h: `<span style="color:${NY_COL[x.state]}">${esc(x.soakers.join(", "))}</span>`, v: x.soakers.join(", ") },
        { h: (x.unauthorized || []).length ? chip(`non : ${esc(x.unauthorized.join(", "))}`, x.after_cut ? "warn" : "bad") : chip((x.turtle || []).length ? "oui (carapace)" : "oui", "good"), v: (x.unauthorized || []).length }, { h: chip(NY_LBL[x.state], x.state === "heavy" ? "bad" : x.state === "heavy_cut" ? "warn" : "good"), v: x.state === "heavy" ? 2 : x.state === "heavy_cut" ? 1 : 0 }, esc(x.rel), { h: x.series_len > 1 ? `${x.series} : ${x.series_idx}/${x.series_len}` : "—", v: x.series_idx || 0 }, { h: x.danger ? `<span class="bad">⚠ ${esc(x.low.map(l => `${l.player} ${l.pct} %`).join(", "))}</span>` : x.series_idx >= 3 ? '<span class="good">personne</span>' : "—", v: x.danger ? 1 : 0 }, { h: x.deaths_after.length ? `<span class="bad">${esc(x.deaths_after.join(", "))}</span>` : "—", v: x.deaths_after.length }])) : muted("Aucune orbe prise sur cette vue.")) +
    (bad.length ? "" : `<p class="good">Aucune orbe prise pendant la phase forte de la pluie${R.length ? "" : " (pas de pluie dans la partie analysée)"}.</p>`));
  const ua = new Map(); for (const x of S.filter(x => !x.after_cut)) for (const n of x.unauthorized || []) ua.set(n, (ua.get(n) || 0) + 1);
  const perCard = rows.length ? card("1c. Orbes par joueur", table([{ l: "Joueur" }, { l: "Non autorisé", num: 1 }, { l: "Pendant la phase forte", num: 1 }, { l: "Pendant le DoT", num: 1 }, { l: "Orbes prises", num: 1 }],
    rows.map(o => [{ h: pl(o.n, cls.get(o.n)), v: o.n }, { h: ua.get(o.n) ? `<span class="bad">${ua.get(o.n)}</span>` : "0", v: ua.get(o.n) || 0 }, { h: o.rain ? `<span class="bad">${o.rain}</span>` : "0", v: o.rain }, o.dot, o.all]))) : "";
  const SE = (ny.series || []).filter(P).filter(x => x.count > 1);
  const serCard = SE.length ? card("1b. Séries d'orbes", muted("Orbes prises à moins de 10 s d'écart. À partir de la 3e orbe d'une série, elle est dangereuse si des joueurs sont sous 30 % de vie juste après (joueurs et vie indiqués). La longueur d'une série n'est pas une erreur en soi : seules les orbes dangereuses sont signalées.") +
    table([...pcol, { l: "Série", num: 1 }, { l: "Début → fin" }, { l: "Orbes", num: 1 }, { l: "Verdict" }],
      SE.map(x => [...pv(x), x.n, `${mmss(x.start_s)} → ${mmss(x.end_s)}`, { h: x.check ? `<b class="bad">${x.count}</b>` : x.count, v: x.count },
        { h: [x.check ? chip("plus de 4 d'affilée : à vérifier", "warn") : "", ...x.dangers.map(d => chip(`orbe ${d.idx} dangereuse (${mmss(d.time_s)}) : ${d.low.map(l => `${l.player} ${l.pct} %`).join(", ")}`, "bad"))].filter(Boolean).join(" ") || '<span class="good">ok</span>', v: x.dangers.length * 10 + (x.check ? 1 : 0) }]))) : "";
  const F = (ny.films || []).filter(P);
  const film = F.length ? card("Film du combat", muted("Positions tirées du log, seconde par seconde : joueurs (couleur de classe, tanks en carré), adds Bubblefin (triangles), boss (losange violet), orbes (cercle cyan, contour rouge si prise pendant la phase forte de la pluie), flaques de glace (zones bleu clair) et jets d'eau du boss vers le tank (trait bleu). Les flaques sont déduites : une flaque là où chaque orbe a été prise, et là où des joueurs ont pris des dégâts de Lingering Frost ; elle disparaît quand un jet d'eau passe dessus. Fond bleuté = pluie en cours.") +
    `<div class="nymap"><div class="mapbar"><select class="nysel">${F.map((x, i) => `<option value="${i}">Pull ${x.pull} · ${x.stats.puddles} flaque(s), ${x.stats.cleared} nettoyée(s) par ${x.stats.jets} jet(s)</option>`).join("")}</select><button class="nyplay" type="button">▶ Lecture</button><select class="nyspd"><option value="2">×2</option><option value="5" selected>×5</option><option value="10">×10</option></select><input class="nyt" type="range" min="0" max="${F[0].dur}" step="0.5" value="0"><span class="nytl">0:00</span></div>
    <div class="legend"><span><i style="background:#a78bfa"></i>boss</span><span><i style="background:#facc15"></i>Shorerunner</span><span><i style="background:#ef4444"></i>Berserker</span><span><i style="background:#60a5fa"></i>Frostscale</span><span><i style="background:#22d3ee"></i>orbe</span><span><i style="background:#bae6fd"></i>flaque</span><span><i style="background:#3b82f6"></i>jet d'eau</span></div>
    <div class="nycanvas map"></div><script type="application/json" class="nydata">${JSON.stringify(F).replace(/</g, "\\u003c")}</script></div>`) : "";
  /* 2) petits adds : dégâts par joueur (soirée ou pull), switchs des mêlées ; 3) DPS sur le boss */
  const AD = pc ? (ny.add_damage || []) : (ny.add_damage || []).filter(x => x.by_pull && x.by_pull[pull]).map(x => ({ ...x, ...x.by_pull[pull] }));
  const names = [...new Set(AD.flatMap(x => Object.keys(x.by_add || {})))].filter(n => AD.some(x => x.by_add[n]));
  const addCard = AD.length ? card(`2. Dégâts sur les petits adds (${pc ? "soirée" : `pull ${pull}`})`, muted(`Dégâts de chaque joueur (hors healers) sur les Bubblefin, par type, et DPS sur les adds ramené à la durée ${pc ? "totale des pulls" : "du pull"}.`) +
    table([{ l: "Joueur" }, ...names.map(n => ({ l: esc(n.replace("Bubblefin ", "")), num: 1 })), { l: "Total", num: 1 }, { l: "DPS sur les adds", num: 1 }],
      AD.sort((a, b) => (a.role === "tank") - (b.role === "tank") || b.total - a.total).map(x => [{ h: pl(x.player, x.class, x.role), v: x.player }, ...names.map(n => ({ h: short(x.by_add[n] || 0), v: x.by_add[n] || 0 })), { h: short(x.total), v: x.total }, { h: short(x.dps), v: x.dps || 0 }]))) : "";
  const SW = (ny.switches || []).filter(P).filter(x => !x.after_cut);
  const swp = new Map(); for (const x of SW) { const o = swp.get(x.player) || swp.set(x.player, { player: x.player, class: x.class, n: 0, d: [], t: 0, dmg: 0, lost: 0, poor: 0 }).get(x.player); o.n++; if (x.dist_m != null) o.d.push(x.dist_m); o.t += x.dur_s; o.dmg += x.add_damage; o.lost += x.boss_lost; if (x.poor) o.poor++; }
  const SWP = [...swp.values()].sort((a, b) => b.poor - a.poor || b.n - a.n);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const swCard = SW.length ? card("Switchs des mêlées sur les adds", muted("Un switch = une suite de coups d'un mêlée sur des adds (moins de 4 s entre deux coups) avec au moins une attaque automatique : il est allé au contact (bombes, DoT et cleave seuls ne comptent pas). Distance = entre l'add à la première attaque automatique et le boss à ce moment ; au-delà de 60 m, position jugée aberrante. « Perdu sur le boss » = son DPS boss du pull × (durée du switch + aller-retour à 7 m/s). Peu rentable = add à 15 m ou plus du boss, et moins de 15 % de la vie de l'add infligés ou moins de la moitié de ce qui est perdu sur le boss.") +
      table([{ l: "Mêlée" }, { l: "Switchs", num: 1 }, { l: "Distance moyenne", num: 1 }, { l: "Distance max", num: 1 }, { l: "Temps sur les adds", num: 1 }, { l: "Dégâts sur les adds", num: 1 }, { l: "Perdu sur le boss", num: 1 }, { l: "Peu rentables", num: 1 }],
        SWP.map(o => [{ h: pl(o.player, o.class, "melee"), v: o.player }, o.n, { h: avg(o.d) != null ? fr(avg(o.d)) + " m" : "—", v: avg(o.d) ?? -1 }, { h: o.d.length ? fr(Math.max(...o.d)) + " m" : "—", v: o.d.length ? Math.max(...o.d) : -1 }, { h: fr(o.t) + " s", v: o.t }, { h: short(o.dmg), v: o.dmg }, { h: short(o.lost), v: o.lost }, { h: o.poor ? `<span class="bad">${o.poor}</span>` : "0", v: o.poor }])) +
      `<details><summary>Détail des switchs (${SW.length})</summary>` + table([...pcol, { l: "Heure", num: 1 }, { l: "Mêlée" }, { l: "Distance", num: 1 }, { l: "Durée", num: 1 }, { l: "Dégâts sur l'add", num: 1 }, { l: "% vie de l'add", num: 1 }, { l: "Perdu sur le boss", num: 1 }, { l: "Verdict" }],
        SW.map(x => [...pv(x), { h: mmss(x.time_s), v: x.time_s }, x.player, { h: x.dist_m != null ? fr(x.dist_m) + " m" : "—", v: x.dist_m ?? -1 }, { h: fr(x.dur_s) + " s", v: x.dur_s }, { h: short(x.add_damage), v: x.add_damage }, { h: x.add_share != null ? x.add_share + " %" : "—", v: x.add_share ?? -1 }, { h: short(x.boss_lost), v: x.boss_lost }, { h: x.poor ? chip("peu rentable", "bad") : chip("ok", "good"), v: x.poor ? 1 : 0 }])) + `</details>`) : "";
  const BD = pc ? (ny.boss_damage || []) : (ny.boss_damage || []).filter(x => x.by_pull && x.by_pull[pull]).map(x => ({ ...x, ...x.by_pull[pull] }));
  const bRow = x => [{ h: pl(x.player, x.class, x.role), v: x.player }, { h: short(x.total), v: x.total }, { h: short(x.dps), v: x.dps || 0 }], bCols = [{ l: "Joueur" }, { l: "Dégâts sur le boss", num: 1 }, { l: "DPS sur le boss", num: 1 }];
  const BDd = BD.filter(x => x.role !== "tank").sort((a, b) => b.total - a.total), BDt = BD.filter(x => x.role === "tank").sort((a, b) => b.total - a.total);
  const bossCard = BD.length ? card(`3. DPS sur le boss (${pc ? "soirée" : `pull ${pull}`})`, muted(`Dégâts de chaque DPS sur Nymrissa, et DPS ramené à la durée ${pc ? "totale des pulls" : "du pull"}. Les tanks sont à part (leur rôle n'est pas les dégâts).`) +
    table(bCols, BDd.map(bRow)) + (BDt.length ? `<details><summary>Tanks (${BDt.length})</summary>${table(bCols, BDt.map(bRow))}</details>` : "")) : "";
  /* 4. morts des tanks (et soakeurs) : orbe + jet d'eau en même temps ? */
  const TD = (ny.tank_deaths || []).filter(P), TO = (ny.tank_overlaps || []).filter(P).filter(x => !x.after_cut);
  const CAUSE = { "orbe + jet d'eau": "bad", "orbe (DoT)": "warn", "jet d'eau": "warn", "autre": "" };
  const tdSum = new Map(); for (const x of TD.filter(x => !x.after_cut)) { const o = tdSum.get(x.player) || tdSum.set(x.player, { player: x.player, class: x.class, tank: x.tank, n: 0, both: 0, orb: 0, jet: 0, risk: 0 }).get(x.player); o.n++; if (x.cause === "orbe + jet d'eau") o.both++; else if (x.cause === "orbe (DoT)") o.orb++; else if (x.cause === "jet d'eau") o.jet++; }
  for (const x of TO) { const o = tdSum.get(x.player) || tdSum.set(x.player, { player: x.player, class: null, tank: true, n: 0, both: 0, orb: 0, jet: 0, risk: 0 }).get(x.player); o.risk++; }
  const tankCard = (TD.length || TO.length) ? card("4. Morts des tanks : orbe + jet d'eau", muted("Le soakeur garde un DoT après l'orbe : s'il prend un jet d'eau pendant ce temps, les deux s'additionnent. Orbe active = coup Frost Orb sur lui dans les 4 s avant la mort ; jet = coup Water Jet dans les 5 s avant. Moments à risque = jet d'eau sur un tank dont l'orbe tique encore (mort ou non), avec sa vie la plus basse. Concerne les tanks et tout joueur mort avec une orbe sur lui.") +
    table([{ l: "Joueur" }, { l: "Morts", num: 1 }, { l: "Orbe + jet", num: 1 }, { l: "Orbe seule", num: 1 }, { l: "Jet seul", num: 1 }, { l: "Jet pendant l'orbe (moments à risque)", num: 1 }],
      [...tdSum.values()].sort((a, b) => b.both - a.both || b.risk - a.risk).map(o => [{ h: pl(o.player, o.class, o.tank ? "tank" : null), v: o.player }, o.n, { h: o.both ? `<b class="bad">${o.both}</b>` : "0", v: o.both }, o.orb, o.jet, o.risk])) +
    (TD.length ? `<details open><summary>Détail des morts (${TD.length})</summary>` + table([...pcol, { l: "Heure", num: 1 }, { l: "Joueur" }, { l: "Cause" }, { l: "80 % → 0", num: 1 }, { l: "5 dernières secondes" }, { l: "Défensifs" }],
      TD.map(x => [...pv(x), { h: mmss(x.time_s), v: x.time_s }, x.player + (x.tank ? "" : ' <small class="muted">(soakeur)</small>'), { h: x.after_cut ? '<span class="muted small">après la coupure</span>' : chip(x.cause, CAUSE[x.cause] || ""), v: x.cause },
        { h: x.from80_s != null ? fr(x.from80_s) + " s" : "—", v: x.from80_s ?? -1 },
        { h: x.top_damage.map(d => `${esc(d.ability)} ${short(d.damage)} (${d.share} %)`).join("<br>") + (x.killing_blow ? `<br><small class="muted">coup fatal : ${esc(x.killing_blow)}</small>` : ""), v: x.jet_dmg_5s },
        { h: (x.defensives_active.length ? "actifs : " + x.defensives_active.map(esc).join(", ") : '<span class="bad small">aucun actif</span>') + (x.defensives_30s.length ? `<br><small class="muted">utilisés dans les 30 s : ${x.defensives_30s.map(esc).join(", ")}</small>` : ""), v: x.defensives_active.length }])) + `</details>` : "") +
    (TO.length ? `<details><summary>Moments à risque (${TO.length})</summary>` + table([...pcol, { l: "Heure", num: 1 }, { l: "Tank" }, { l: "Vie la plus basse", num: 1 }, { l: "Issue" }],
      TO.map(x => [...pv(x), { h: mmss(x.time_s), v: x.time_s }, x.player, { h: x.min_hp != null ? x.min_hp + " %" : "—", v: x.min_hp ?? 101 }, { h: x.died ? chip("mort", "bad") : x.min_hp != null && x.min_hp < 30 ? chip("survécu de justesse", "warn") : chip("survécu", "good"), v: x.died ? 2 : 0 }])) + `</details>` : "")) : "";
  return orbCard + serCard + perCard + addCard + swCard + bossCard + tankCard + film + (ny.notes || []).map(n => muted(esc(n))).join("");
}

/* ---------- Erreurs du fight : uniquement ce qui ne va pas, try après try ---------- */
/* liste des erreurs d'un pull : { cat, who, text, t } (t en secondes si connu) */
function pullErrors(b, pull) {
  const E = [], add = (cat, who, text, t = null) => E.push({ cat, who, text, t });
  const pv = b.views.find(x => x.key === "p" + pull), r = pv && pv.raid;
  const pl = r && (r.pulls || []).find(x => x.pull === pull);
  if (r) {
    for (const d of (r.extras && r.extras.deaths || []).filter(d => d.pull === pull && !d.excused))
      add("Morts", d.player, `mort ${d.killer ? "sur " + d.killer : ""}${d.avoidable ? " sans défensif récent" : ""}${d.unused_def && d.unused_def.length ? ` (encore dispo : ${d.unused_def.slice(0, 3).join(", ")})` : ""}`, d.time_s);
    for (const p of r.players || []) for (const i of (p.issues || []).filter(i => !i.positive && i.kind !== "morts" && (i.penalty || 0) > 0))
      add("Mécaniques", p.player, `${i.mechanic} : ${i.text}${i.detail && !/pulls?$/.test(i.detail) ? ` (${i.detail})` : ""}`);
  }
  const d = b.deep || {}, P = x => x.pull === pull && !x.after_cut;
  if (d.vashnik) { const vk = d.vashnik;
    for (const w of (vk.froth || []).filter(x => x.pull === pull && x.goal != null && !x.enough)) add("Totems", w.carriers.map(c => c.player).join(", "), `Plague Froth ${w.wave} : ${w.totems_destroyed}/${w.goal} totems visés détruits`, w.burst_s);
    for (const w of (vk.froth || []).filter(x => x.pull === pull && x.totems_alive && !x.after_cut)) for (const c of w.carriers.filter(c => c.moved_m != null && c.moved_m < 3)) add("Totems", c.player, `Plague Froth ${w.wave} : immobile (${fr(c.moved_m)} m) avec ${w.totems_alive} totems en jeu`, w.burst_s);
    for (const t of (vk.totems || []).filter(x => x.pull === pull && x.exploded && !x.after_cut)) add("Totems", "raid", `Imbibe ${t.wave} : ${t.exploded} totem(s) encore en vie, ils explosent`, t.imbibe_s);
    for (const x of (vk.infection_held || []).filter(x => P(x) && x.long && !x.defensive)) add("Infection feu", x.player, `gardée ${fr(x.held_s)} s sans défensif${x.dist_m != null ? `, à ${fr(x.dist_m)} m du raid` : ""}`, x.start_s);
    for (const w of (vk.dispel_waves || []).filter(x => P(x) && x.too_close)) add("Dispels", w.dispels.map(z => z.healer).join(", "), `vague ${w.wave} : ${w.too_close} dispels en ${fr(w.span_s)} s (un par un)`, w.start_s);
    for (const x of (vk.dispel_pull_missing || []).filter(x => x.pull === pull && x.healers.length)) add("Dispels", x.healers.join(", "), "aucun dispel sur le pull");
    for (const x of (vk.fire_kills || []).filter(x => P(x) && x.together)) add("Adds feu", "raid", `deux adds feu tués à ${fr(x.gap_s)} s d'écart`, x.time_s);
    for (const x of (vk.cc_hits || []).filter(x => x.pull === pull)) add("Adds feu", x.player, `${x.ability} sur ${x.add} sous ${x.cc}`, x.time_s);
    for (const x of (vk.bursts || []).filter(x => x.pull === pull && !x.after_cut)) add("Malignant Burst", `${x.add}${x.instance != null ? ` n° ${x.instance}` : ""}`, `dans la piscine : ${x.pulses ?? 1} impulsion(s), ${x.killed} mort(s)`, x.time_s);
  }
  if (d.sszorak) { const sz = d.sszorak;
    for (const x of (sz.fury || []).filter(x => P(x) && x.verdict !== "ok")) add("Serpent's Fury", x.carrier, `Fury ${x.n} : ${x.verdict}`, x.pop_s ?? x.mark_s);
    for (const w of (sz.virulence || []).filter(P)) for (const h of w.hits) add("Virulence", h.victim, `pris dans la ligne de ${h.from || "?"}${h.died ? " (mort)" : ""}`, h.at_s);
    for (const x of (sz.crosswinds || []).filter(P)) { for (const n of x.fell) add("Crosswinds", n, "chute après la projection", x.knock_s); for (const n of x.died) add("Crosswinds", n, "mort après la projection", x.knock_s); }
    for (const x of (sz.mutilate || []).filter(P)) { if (x.low) add("Mutilate", "raid", `${x.count} soakers seulement (5 minimum)`, x.t_s); if (x.again.length) add("Mutilate", x.again.join(", "), "deux soaks de suite (alternance)", x.t_s); }
    for (const x of (sz.cysts || []).filter(x => P(x) && !x.during_int)) add("Kystes", x.placed_by || "?", `kyste éclaté hors intermission (${x.hit} joueurs projetés)`, x.t_s);
    for (const p of (sz.pulls || []).filter(x => x.pull === pull && x.enrage_s != null)) add("Serpent's Fury", "boss", "enrage (Unbound Ferocity)", p.enrage_s);
  }
  if (d.nymrissa) {
    for (const x of (d.nymrissa.soaks || []).filter(x => x.pull === pull && !x.after_cut)) {
      if ((x.unauthorized || []).length) add("Orbes", x.unauthorized.join(", "), "Frost Orb prise sans être autorisé (tanks et chasseurs sous carapace)", x.time_s);
      if (x.state === "heavy") add("Orbes", x.soakers.join(", "), "Frost Orb prise pendant la phase forte de la pluie (à prendre pendant le DoT)", x.time_s);
      if (x.danger) add("Orbes", x.soakers.join(", "), `orbe ${x.series_idx} d'une série, dangereuse : ${x.low.map(l => `${l.player} ${l.pct} %`).join(", ")} sous 30 %`, x.time_s);
    }
    for (const x of (d.nymrissa.tank_deaths || []).filter(x => x.pull === pull && !x.after_cut && x.cause === "orbe + jet d'eau")) add("Morts", x.player, `mort avec l'orbe (DoT) et un jet d'eau en même temps${x.defensives_active.length ? "" : ", aucun défensif actif"}`, x.time_s);
    for (const x of (d.nymrissa.switches || []).filter(x => x.pull === pull && !x.after_cut && x.poor)) add("Switchs", x.player, `switch peu rentable : add à ${fr(x.dist_m)} m du boss, ${x.add_share != null ? x.add_share + " % de sa vie" : short(x.add_damage)} en ${fr(x.dur_s)} s (perdu sur le boss : ${short(x.boss_lost)})`, x.time_s);
    for (const x of (d.nymrissa.series || []).filter(x => x.pull === pull && !x.after_cut && x.check)) add("Orbes", "raid", `série de ${x.count} orbes d'affilée (${mmss(x.start_s)} → ${mmss(x.end_s)}) : à vérifier`, x.start_s);
  }
  return { E: E.sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9)), pl };
}
function errorsView(b, v) {
  const pulls = (b.views.filter(x => /^p\d+$/.test(x.key)).map(x => +x.key.slice(1))).sort((a, b) => a - b);
  const sel = v && /^p\d+$/.test(v.key) ? [+v.key.slice(1)] : pulls;
  const rows = sel.map(n => ({ n, ...pullErrors(b, n) }));
  const tot = rows.reduce((a, x) => a + x.E.length, 0);
  const COL = { "Morts": "bad", "Mécaniques": "warn" };
  const block = x => {
    const cats = [...new Set(x.E.map(e => e.cat))];
    const head = x.pl ? `${x.pl.result}${x.pl.boss_pct != null ? ` à ${fr(x.pl.boss_pct)} %` : ""} · ${esc(x.pl.cut_reason || "")}` : "";
    return `<details class="tlw"${sel.length === 1 || x.n === sel[sel.length - 1] ? " open" : ""}><summary><b>Pull ${x.n}</b> · ${head} · <b class="${x.E.length ? "bad" : "good"}">${x.E.length} erreur(s)</b></summary>` +
      (x.E.length ? cats.map(c => `<h4>${esc(c)}</h4><ul class="errl">${x.E.filter(e => e.cat === c).map(e => `<li>${e.t != null ? `<code>${mmss(e.t)}</code> ` : ""}<b>${esc(e.who)}</b> — ${esc(e.text)}</li>`).join("")}</ul>`).join("") : '<p class="good">Aucune erreur relevée sur ce pull.</p>') + `</details>`;
  };
  /* récap par joueur sur les tries affichés */
  const per = new Map(); for (const x of rows) for (const e of x.E) for (const n of String(e.who).split(", ")) { if (["raid", "boss", "?"].includes(n)) continue; const o = per.get(n) || per.set(n, { n, k: 0, cats: new Map() }).get(n); o.k++; o.cats.set(e.cat, (o.cats.get(e.cat) || 0) + 1); }
  const P = [...per.values()].sort((a, b) => b.k - a.k);
  return card(`Erreurs du fight (${tot})`, muted("Uniquement ce qui ne va pas, pull par pull, dans l'ordre du combat : cause du wipe, morts, mécaniques ratées (joueurs signalés), et erreurs des analyses détaillées du boss. Les morts excusées et ce qui arrive après l'appel du wipe ne sont pas comptés. Le détail complet (cas corrects compris) reste dans les autres onglets.") +
      rows.map(block).join("")) +
    (P.length && sel.length > 1 ? card("Qui revient le plus souvent", table([{ l: "Joueur" }, { l: "Erreurs", num: 1 }, { l: "Détail" }], P.map(o => [o.n, o.k, [...o.cats].map(([c, k]) => `${esc(c)} ×${k}`).join(", ")]))) : "");
}
