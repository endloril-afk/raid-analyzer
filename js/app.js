/* Raid Analyzer : interactions d'une page de rapport (onglets, vues par pull, navigation boss, mini-carte, liens #go=). */

/* Onglets et raccourcis vers un onglet (le tri des tableaux est dans ui.js) */
document.addEventListener("click", e => {
  const b = e.target.closest(".tnav button");
  if (b) {
    const ts = b.closest(".tabset");
    const btns = [...ts.querySelector(":scope>.tnav").children], panes = [...ts.querySelectorAll(":scope>.tpane")];
    btns.forEach(x => x.classList.toggle("on", x === b));
    panes.forEach((p, j) => p.classList.toggle("on", j == b.dataset.t));
    return;
  }
  const g = e.target.closest("[data-goto]");
  if (g && !e.target.closest("a")) {
    const ts = g.closest(".tabset");
    ts.querySelector(":scope>.tnav").children[g.dataset.goto].click();
  }
});

/* Sélecteur de pulls : affiche la vue correspondante dans tous les onglets du boss */
document.addEventListener("change", e => {
  const s = e.target;
  if (s.matches && s.matches(".viewsel")) {
    const b = s.closest(".boss") || document;
    b.querySelectorAll(".view").forEach(v => { if (v.dataset.view === s.value && v.dataset.lazy) renderView(v); v.hidden = v.dataset.view !== s.value; });
    /* indicateurs de la soirée (au-dessus des onglets) : seulement sur la vue « tous les pulls » */
    b.querySelectorAll(".bkpis").forEach(k => { k.hidden = k.dataset.for !== s.value; });
  }
});

/* Mini-carte de l'intermission */
(function () {
  const C = { 1: "#3b82f6", 2: "#10b981", 3: "#f59e0b" };
  function at(p, t) {
    if (!p.length) return null;
    let a = p[0];
    for (const q of p) {
      if (q[0] <= t) a = q;
      else { const f = (t - a[0]) / ((q[0] - a[0]) || 1); return a[0] <= t ? [a[1] + f * (q[1] - a[1]), a[2] + f * (q[2] - a[2])] : [q[1], q[2]]; }
    }
    return [a[1], a[2]];
  }
  function draw(sec) {
    const data = JSON.parse(sec.querySelector(".mapdata").textContent), w = data[+sec.querySelector(".mapsel").value], t = +sec.querySelector(".mapt").value;
    sec.querySelector(".maptl").textContent = t + " s";
    if (!w) { sec.querySelector(".map").innerHTML = ""; return; }
    const pts = Object.values(w.traj).flat();
    if (!pts.length) { sec.querySelector(".map").innerHTML = '<p class="muted small">Positions indisponibles.</p>'; return; }
    let x0 = Math.min(...pts.map(p => p[1])), x1 = Math.max(...pts.map(p => p[1])), y0 = Math.min(...pts.map(p => p[2])), y1 = Math.max(...pts.map(p => p[2]));
    const pad = 4; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    const W = 760, H = Math.max(300, Math.min(560, W * (y1 - y0) / Math.max(x1 - x0, 1))), sx = x => (x - x0) / (x1 - x0) * W, sy = y => H - (y - y0) / (y1 - y0) * H;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Mini-carte de l\'intermission">';
    for (const [n, p] of Object.entries(w.traj)) {
      const col = C[w.initial[n]] || "#9ca3af", past = p.filter(q => q[0] <= t);
      if (past.length > 1) s += '<polyline class="trail" stroke="' + col + '" points="' + past.map(q => sx(q[1]) + "," + sy(q[2])).join(" ") + '"/>';
    }
    for (const pr of w.pairs) {
      if (pr.t > t) continue;
      const pa = w.traj[pr.a], pb = w.traj[pr.b], A = pa && at(pa, pr.t), B = pb && at(pb, pr.t);
      if (!A || !B) continue;
      const mx = sx((A[0] + B[0]) / 2), my = sy((A[1] + B[1]) / 2);
      s += pr.ok
        ? '<circle class="ok" cx="' + mx + '" cy="' + my + '" r="6"><title>' + pr.a + " + " + pr.b + " à " + pr.t + " s</title></circle>"
        : '<g><path class="bad" d="M' + (mx - 7) + "," + (my - 7) + "L" + (mx + 7) + "," + (my + 7) + "M" + (mx + 7) + "," + (my - 7) + "L" + (mx - 7) + "," + (my + 7) + '"/><title>' + pr.a + " (" + (pr.na ?? "?") + ") + " + pr.b + " (" + (pr.nb ?? "?") + ") = " + pr.total + (pr.mover ? " — " + pr.mover + " est allé vers l'autre" : "") + "</title></g>";
    }
    const movers = new Set(w.pairs.filter(p => !p.ok && p.t <= t && p.mover).map(p => p.mover));
    for (const [n, p] of Object.entries(w.traj)) {
      const P = at(p.filter(q => q[0] <= t + 1), t);
      if (!P) continue;
      const col = C[w.initial[n]] || "#9ca3af";
      s += '<g><circle cx="' + sx(P[0]) + '" cy="' + sy(P[1]) + '" r="5" fill="' + col + '" stroke="var(--card)" stroke-width="1.5"/><text x="' + (sx(P[0]) + 7) + '" y="' + (sy(P[1]) + 3) + '"' + (movers.has(n) ? ' font-weight="700"' : "") + ">" + n + " (" + (w.initial[n] ?? "?") + ")</text></g>";
    }
    sec.querySelector(".map").innerHTML = s + "</svg>";
  }
  window.initMaps = root => root.querySelectorAll(".mapsel:not([data-init])").forEach(sel => {
    sel.dataset.init = "1";
    const sec = sel.closest("section");
    draw(sec);
    sel.onchange = () => { sec.querySelector(".mapt").value = 30; draw(sec); };
    sec.querySelector(".mapt").oninput = () => draw(sec);
    const b = sec.querySelector(".mapplay");
    let timer = null;
    b.onclick = () => {
      if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; return; }
      const r = sec.querySelector(".mapt");
      if (+r.value >= 30) r.value = 0;
      b.textContent = "❚❚ Pause";
      timer = setInterval(() => {
        r.value = Math.min(30, +r.value + 0.5); draw(sec);
        if (+r.value >= 30) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; }
      }, 200);
    };
  });
  initMaps(document);
})();

/* Navigation entre la vue d'ensemble et les boss (menu latéral, mémorisée dans l'ancre #).
   Liens venant de l'accueil : #auto (boss choisi par defaultBoss(), report.js), #b0 (un boss), #go=m|joueur (sa ligne dans « Tous les pulls » de la soirée ; #go=k|joueur : « Tous les kills »),
   #go=p|b0|joueur|rôle (sa ligne dans l'onglet Joueurs du boss). L'ancienne page #members ouvre l'onglet Membres du même boss. */
(function () {
  let switchBoss = k => show(k, true);
  const show = (k, top) => {
    document.querySelectorAll(".boss").forEach(b => b.hidden = b.dataset.boss !== k);
    /* Menu du haut : « Soirées » toujours actif dans un rapport. Menu latéral : la page affichée */
    document.querySelectorAll(".pnav [data-r]").forEach(a => a.classList.toggle("on", a.dataset.r === "/"));
    document.querySelectorAll(".snav [data-bossgo]").forEach(b => b.classList.toggle("on", b.dataset.bossgo === k));
    try { history.replaceState(null, "", "#" + k); } catch (e) {}
    if (top) window.scrollTo({ top: 0 });
  };
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-bossgo]");
    if (g && !e.target.closest("a")) { switchBoss(g.dataset.bossgo); return; }
    const v = e.target.closest("[data-view-go]");
    if (v) {
      const b = v.closest(".boss"), s = b.querySelector(".viewsel");
      s.value = v.dataset.viewGo;
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("[data-bossgo]")) switchBoss(e.target.dataset.bossgo); });
  /* Met en évidence une ligne ou une fiche (clignote, puis défile jusqu'à elle) */
  const flash = (el, block = "center") => { if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1900); setTimeout(() => el.scrollIntoView({ behavior: "smooth", block }), 60); };
  /* Ouvre un onglet d'une barre d'onglets par son libellé ; renvoie le panneau ouvert */
  const tabIn = (ts, label) => { if (!ts) return null; const b = [...ts.querySelector(":scope>.tnav").children].find(x => x.textContent.trim() === label); if (b) b.click(); return b ? ts.querySelector(":scope>.tpane.on") : null; };
  const mainTabs = page => page.querySelector(":scope>.tabset.main");
  /* Ligne du joueur dans Raid › Joueurs (note de strat) */
  const stratRow = (page, name) => {
    const p = tabIn(mainTabs(page), "Raid"); if (!p) return;
    const v = p.querySelector(".view:not([hidden])") || p, ts = [...v.querySelectorAll(".tabset")].find(t => [...t.querySelector(":scope>.tnav").children].some(x => x.textContent.trim() === "Joueurs"));
    const pane = ts ? tabIn(ts, "Joueurs") : v;
    flash([...pane.querySelectorAll("td[data-v]")].find(c => c.dataset.v === name)?.parentNode);
  };
  /* Fiche d'un joueur dans l'onglet Gameplay (vue « tous les pulls » ou la vue demandée, ex. le kill) ; sinon sa ligne de strat */
  const goPlayer = (key, name, role, vw) => {
    const page = document.querySelector('.boss[data-boss="' + key + '"]');
    if (!page) return show("ov", false);
    show(key, false);
    const s = page.querySelector(".viewsel"), want = vw && page.querySelector('.view[data-view="' + vw + '"]') ? vw : page.querySelector(".view")?.dataset.view;
    if (s && want && s.value !== want) { s.value = want; s.dispatchEvent(new Event("change", { bubbles: true })); }
    const p = tabIn(mainTabs(page), "Gameplay"), v = p && (p.querySelector(".view:not([hidden])") || p), b = v && [...v.querySelectorAll(".gpb")].find(x => x.dataset.name === name);
    if (b) { b.click(); flash(v.querySelector('.gpp[data-gpp="' + b.dataset.gp + '"]'), "start"); } else stratRow(page, name);
  };
  document.addEventListener("click", e => {
    const n = e.target.closest("[data-goplayer]");
    if (n) { e.preventDefault(); goPlayer(n.dataset.goboss, n.dataset.goplayer, n.dataset.gorole, n.dataset.goview); return; }
    const g = e.target.closest("[data-stratgo]");
    if (g) { e.preventDefault(); stratRow(g.closest(".boss"), g.dataset.stratgo); }
  });
  const tab = (page, label) => tabIn(mainTabs(page), label);
  /* Changement de boss depuis le menu de gauche : on reste sur le même onglet (Gameplay, Stuff…) et sur le même joueur
     (fiche Gameplay ou healer), avec les données du boss choisi ; si le joueur n'a pas joué ce boss, la première fiche s'affiche */
  switchBoss = k => {
    const cur = document.querySelector(".boss:not([hidden])"), ts = cur && mainTabs(cur);
    const label = ts ? ts.querySelector(":scope>.tnav>button.on")?.textContent.trim() : null;
    const pane = ts && ts.querySelector(":scope>.tpane.on"), vw = pane && (pane.querySelector(".view:not([hidden])") || pane);
    const player = label === "Gameplay" && vw ? vw.querySelector(".gpb.on")?.dataset.name : null;
    show(k, !label);
    const page = document.querySelector('.boss[data-boss="' + k + '"]'); if (!page || !label || !mainTabs(page)) return;
    const p = tab(page, label); if (!player || !p) return;
    const v = p.querySelector(".view:not([hidden])") || p, b = [...v.querySelectorAll(".gpb")].find(x => x.dataset.name === player);
    if (b) b.click();
  };
  /* Ouverture de la page selon l'ancre, une fois tous les scripts chargés (le sélecteur du Gameplay est plus bas) */
  setTimeout(() => {
  let h = location.hash.slice(1); try { h = decodeURIComponent(h); } catch (e) {}
  if (h.startsWith("go=")) {
    const [kind, a, b, c, d] = h.slice(3).split("|");
    if (kind === "p") goPlayer(a, b, c, d);
    else { const k = kind === "k" ? "kills" : "all", page = document.querySelector('.boss[data-boss="' + k + '"]'); show(k, false); flash([...page.querySelectorAll("td[data-v]")].find(x => x.dataset.v === a)?.parentNode); }
  } else if (h === "members") show("all", false);
  else if (h === "auto") show(defaultBoss(), false);
  else show(document.querySelector('.boss[data-boss="' + h + '"]') ? h : defaultBoss(), false); /* sans ancre : boss choisi comme pour #auto */
  }, 0);
})();

/* Gameplay : choix du joueur et graphiques (chronologie des CD, activité, soin, ouverture), dessinés quand la fiche s'affiche.
   Données : data-gpref = « clé du boss | clé de la vue | g (DPS, tanks) ou h (healers) | index », lues dans window.RAID_EXPORT. */
(function () {
  const ICO = i => "https://wow.zamimg.com/images/wow/icons/medium/" + (i || "inv_misc_questionmark") + ".jpg";
  const mm = t => Math.floor(t / 60) + ":" + String(Math.round(t % 60)).padStart(2, "0");
  const data = pp => {
    const [bk, vk, k, i] = (pp.dataset.gpref || "").split("|"), b = X.bosses.find(x => x.key === bk), v = b && b.views.find(x => x.key === vk);
    const o = v && (k === "h" ? v.healers?.healers?.[+i] : v.gameplay?.players?.[+i]);
    return o && o.chrono;
  };
  function ticks(x, dur, y0, y1) { let g = ""; const st = dur > 420 ? 60 : 30; for (let t = 0; t <= dur; t += st) g += `<line x1="${x(t)}" x2="${x(t)}" y1="${y0}" y2="${y1}" class="gl"/><text x="${x(t)}" y="${y1 + 14}" text-anchor="middle">${mm(t)}</text>`; return g; }
  const phases = (x, ph, y0, y1) => (ph || []).map(p => `<line x1="${x(p.t)}" x2="${x(p.t)}" y1="${y0}" y2="${y1}" class="ph"/><text x="${x(p.t) + 3}" y="${y0 + 10}" class="pht">P${p.id}</text>`).join("");
  function cdChart(d, pi) {
    const me = d.ours[pi], tops = d.tops, W = 1000, L = 190, R = 14, T = 16, B = 24, tl = 7, rowH = 22 + tops.length * tl + 8;
    const dur = Math.max(me.dur, ...tops.map(t => t.dur), 30), x = t => L + Math.min(t, dur) / dur * (W - L - R), H = T + d.spells.length * rowH + B;
    let g = ticks(x, dur, T, H - B) + phases(x, me.phases, 2, H - B) + `<line x1="${x(me.dur)}" x2="${x(me.dur)}" y1="${T}" y2="${H - B}" class="end"><title>Fin de ton pull (${mm(me.dur)})</title></line>`;
    d.spells.forEach((s, i) => {
      const y = T + i * rowH, cy = y + 11, ts = me.casts[s.id] || [];
      g += `<line x1="0" x2="${W}" y1="${y + rowH}" y2="${y + rowH}" class="rs"/><image href="${ICO(s.icon)}" x="4" y="${y + 2}" width="18" height="18"/><text x="28" y="${y + 12}" class="lb">${esc(s.name.length > 22 ? s.name.slice(0, 21) + "…" : s.name)}</text><text x="28" y="${y + 24}">${s.kind === "cd" ? "CD" : "Défensif"}${s.cd ? " · ~" + s.cd + " s" : ""}</text>`;
      if (s.cd) {
        const lost = s.kind === "cd" && !s.irregular; let ready = s.start;
        for (const t of ts) {
          if (lost && t > ready) g += `<rect x="${x(ready)}" y="${cy - 4}" width="${Math.max(1, x(t) - x(ready))}" height="8" rx="2" class="lost"><title>${esc(s.name)} prêt sans être lancé : ${mm(ready)} → ${mm(t)} (${Math.round(t - ready)} s)</title></rect>`;
          g += `<rect x="${x(t)}" y="${cy - 3}" width="${Math.max(1, x(Math.min(me.dur, t + s.cd)) - x(t))}" height="6" rx="2" class="rc"/>`; ready = t + s.cd;
        }
        if (lost && me.dur > ready) g += `<rect x="${x(ready)}" y="${cy - 4}" width="${Math.max(1, x(me.dur) - x(ready))}" height="8" rx="2" class="lost"><title>${esc(s.name)} prêt sans être lancé : ${mm(ready)} → fin (${Math.round(me.dur - ready)} s)</title></rect>`;
      }
      for (const t of ts) g += `<circle cx="${x(t)}" cy="${cy}" r="5.5" class="me"><title>Toi : ${esc(s.name)} à ${mm(t)}</title></circle>`;
      tops.forEach((tp, j) => { const ty = y + 24 + j * tl; g += `<line x1="${x(0)}" x2="${x(tp.dur)}" y1="${ty}" y2="${ty}" class="tl"/>`; for (const t of tp.casts[s.id] || []) g += `<rect x="${x(t) - 2}" y="${ty - 3}" width="4" height="6" rx="1" class="tp"><title>${esc(tp.name)} (top) : ${esc(s.name)} à ${mm(t)}</title></rect>`; });
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chronologie des CD">${g}</svg>`;
  }
  function actChart(d, pi, key = "act") {
    const me = d.ours[pi], W = 1000, L = 56, R = 14, T = 14, B = 24, H = 200, bs = d.bin_s, S = o => o[key] || [];
    const n = Math.max(...d.tops.map(t => S(t).length), 0), top = [];
    for (let i = 0; i < n; i++) { const v = d.tops.map(t => S(t)[i]).filter(v => v != null); top.push(v.length ? v.reduce((a, b) => a + b, 0) / v.length : null); }
    const dur = Math.max(me.dur, ...d.tops.map(t => t.dur), 30), x = t => L + Math.min(t, dur) / dur * (W - L - R), mx = Math.max(10, ...S(me), ...top.filter(v => v != null)) * 1.1, y = v => T + (1 - v / mx) * (H - T - B);
    const path = a => a.map((v, i) => v == null ? "" : (i ? "L" : "M") + x((i + .5) * bs).toFixed(1) + "," + y(v).toFixed(1)).join("");
    const fk = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v));
    const stp = key === "act" ? Math.max(10, Math.round(mx / 40) * 10) : Math.pow(10, Math.floor(Math.log10(mx / 4))) * Math.ceil(mx / 4 / Math.pow(10, Math.floor(Math.log10(mx / 4))));
    let g = ticks(x, dur, T, H - B) + phases(x, me.phases, 2, H - B);
    for (let v = 0; v <= mx; v += stp) g += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fk(v)}</text>`;
    const un = key === "act" ? " sorts/min" : " soin/s";
    g += `<path d="${path(top)}" class="ctop"/><path d="${path(S(me))}" class="cme"/>`;
    S(me).forEach((v, i) => g += `<circle cx="${x((i + .5) * bs)}" cy="${y(v)}" r="6" fill="transparent"><title>Toi ${mm(i * bs)}–${mm((i + 1) * bs)} : ${fk(v)}${un}${top[i] != null ? " (top " + fk(top[i]) + ")" : ""}</title></circle>`);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Activité">${g}</svg>`;
  }
  function openSeq(d, pi) {
    const cds = new Set(d.spells.map(s => s.id)), row = (lbl, o) => `<div>${lbl}</div><div class="seq">${o.length ? o.map(c => { const n = d.names[c.id] || ["?", null]; return `<span class="ic${cds.has(c.id) ? " cd" : ""}" title="${esc(n[0])} à ${c.t} s"><img src="${ICO(n[1])}" alt="" loading="lazy"><b>${c.t}</b></span>`; }).join("") : '<span class="muted small">rien</span>'}</div>`;
    const me = d.ours[pi];
    return `<div class="gpo">${row(`<b>Toi</b> (pull ${me.pull})`, me.opener)}${d.tops.map(t => row(`<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a> <span class="muted">(top)</span>`, t.opener)).join("")}</div><p class="muted small">Encadré : un des CD de la chronologie.</p>`;
  }
  function draw(pp, pi) {
    const d = data(pp); if (!d || !d.ours || !d.ours.length) return;
    if (pi == null) { const s = pp.querySelector(".gppull"); pi = s ? +s.value : +(pp.dataset.def || 0); }
    pp.querySelectorAll(".gppull").forEach(o => o.value = String(pi));
    pp.querySelectorAll(".gpc").forEach(c => { const k = c.dataset.chart; c.innerHTML = k === "cd" ? cdChart(d, pi) : k === "act" ? actChart(d, pi) : k === "hps" ? actChart(d, pi, "hps") : openSeq(d, pi); });
    pp.dataset.drawn = pi;
  }
  /* Dessine les fiches visibles pas encore dessinées */
  const init = () => document.querySelectorAll(".gpp[data-gpref]:not([data-drawn])").forEach(p => { if (p.offsetParent) draw(p); });
  function pick(w, key) {
    w.querySelectorAll(".gpb").forEach(b => b.classList.toggle("on", b.dataset.gp === key));
    w.querySelectorAll(":scope>.gpp").forEach(p => p.hidden = p.dataset.gpp !== key);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest(".gpb,.gplink");
    if (b) { e.preventDefault(); const w = b.closest(".gpwrap"); pick(w, b.dataset.gp); if (b.classList.contains("gplink")) w.querySelector(':scope>.gpp[data-gpp="' + b.dataset.gp + '"]')?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    setTimeout(init, 0);
  });
  document.addEventListener("change", e => {
    const s = e.target.closest && e.target.closest(".gppull");
    if (s) draw(s.closest(".gpp"), +s.value);
    setTimeout(init, 0);
  });
  /* Suivi automatique : rechargement toutes les 5 min, seulement si l'onglet est en arrière-plan ou inactif depuis 2 min */
  if (X.auto_update && X.auto_update.active) {
    let last = Date.now(); ["click", "keydown", "scroll", "mousemove"].forEach(ev => addEventListener(ev, () => last = Date.now(), { passive: true }));
    setInterval(() => { if (document.hidden || Date.now() - last > 120000) location.reload(); }, 300000);
  }
  init();
})();

/* Vashnik : carte simulée d'une Plague Froth. Chaque porteur envoie une vague en croix (4 branches) autour de lui, à viser
   sur un totem ; orientation de la croix déduite des joueurs touchés (le log ne la donne pas), sinon cercle « orientation inconnue ». */
(function () {
  const SIDE = { feu: "#f97316", ombre: "#a78bfa", "?": "#9ca3af" };
  const arms = w => w.cross == null ? [] : [0, 1, 2, 3].map(i => { const a = w.cross + i * Math.PI / 2; return [Math.cos(a), Math.sin(a)]; });
  function draw(box) {
    const data = JSON.parse(box.querySelector(".vkdata").textContent), m = data[+box.querySelector(".vksel").value], t = +box.querySelector(".vkt").value;
    box.querySelector(".vktl").textContent = t.toFixed(1) + " s";
    if (!m) return;
    const R = Math.max(40, ...m.totems.filter(x => x.dist != null).map(x => x.dist + 4)), B = m.boss;
    /* anciens rapports : porteurs sans orientation */
    const waves = (m.waves || m.players.filter(p => p.carrier).map(p => ({ name: p.name, x: p.x, y: p.y, cross: null, hits: 0 })));
    const pts = [B, ...m.players.map(p => [p.x, p.y]), ...m.hits.map(h => [h.x, h.y]), ...(m.opened || []).map(o => [o.x, o.y]), ...(m.totems_at || []).map(o => [o.x, o.y]), ...waves.flatMap(w => arms(w).map(d => [w.x + d[0] * R, w.y + d[1] * R]))];
    let x0 = Math.min(...pts.map(p => p[0])) - 6, x1 = Math.max(...pts.map(p => p[0])) + 6, y0 = Math.min(...pts.map(p => p[1])) - 6, y1 = Math.max(...pts.map(p => p[1])) + 6;
    const W = 760, H = Math.max(320, Math.min(620, W * (y1 - y0) / Math.max(x1 - x0, 1))), k = Math.min(W / (x1 - x0), H / (y1 - y0));
    const sx = x => (x - x0) * k, sy = y => H - (y - y0) * k;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Carte de la vague">';
    const r = Math.min(R, m.speed * t);
    for (const w of waves) {
      const A = arms(w);
      for (const d of A) { const e = [w.x + d[0] * R, w.y + d[1] * R], f = [w.x + d[0] * r, w.y + d[1] * r], nx = -d[1], ny = d[0], hw = 2.5;
        s += '<line x1="' + sx(w.x) + '" y1="' + sy(w.y) + '" x2="' + sx(e[0]) + '" y2="' + sy(e[1]) + '" stroke="#f59e0b" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 5"><title>Branche de la vague en croix de ' + w.name + (w.from === "axes" ? ' (croix alignée sur les axes de la carte)' : ' (orientation déduite de ' + w.hits + ' joueur(s) touché(s))') + '</title></line>';
        if (t > 0) s += '<line x1="' + sx(f[0] + nx * hw) + '" y1="' + sy(f[1] + ny * hw) + '" x2="' + sx(f[0] - nx * hw) + '" y2="' + sy(f[1] - ny * hw) + '" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>'; }
      if (!A.length && t > 0) s += '<circle cx="' + sx(w.x) + '" cy="' + sy(w.y) + '" r="' + r * k + '" fill="none" stroke="#ef4444" stroke-opacity=".5" stroke-dasharray="4 4"><title>Vague de ' + w.name + ' : orientation de la croix inconnue (aucun joueur touché), distance parcourue</title></circle>';
    }
    for (const h of m.hits.filter(h => h.dt <= t)) s += '<circle cx="' + sx(h.x) + '" cy="' + sy(h.y) + '" r="9" fill="none" stroke="#ef4444" stroke-width="1.5"><title>' + h.name + ' touché par une vague à ' + h.dt + ' s' + (h.amount ? ' : ' + Math.round(h.amount / 1000) + 'k' : '') + (h.died ? ' (mort)' : '') + '</title></circle>' + '<text x="' + (sx(h.x) + 10) + '" y="' + (sy(h.y) - 8) + '" class="small" fill="#ef4444">' + h.name + (h.amount ? ' ' + Math.round(h.amount / 1000) + 'k' : '') + '</text>';
    const dead = m.totems.filter(x => x.dt <= t);
    /* totems présents pendant la vague, à leur position (log) : cercle de la couleur du côté, barré une fois mort */
    for (const o of m.totems_at || []) { const gone = o.died_dt != null && o.died_dt <= t;
      s += '<circle cx="' + sx(o.x) + '" cy="' + sy(o.y) + '" r="8" fill="' + (gone ? "none" : SIDE[o.side]) + '" fill-opacity=".35" stroke="' + SIDE[o.side] + '" stroke-width="2"><title>Totem ' + o.side + (o.opened ? ", touché par une vague" : ", jamais touché par cette vague") + (o.died_dt != null ? ", détruit à " + o.died_dt + " s" : ", toujours en vie") + '</title></circle>' + (gone ? '<path d="M' + (sx(o.x) - 6) + ' ' + (sy(o.y) - 6) + 'l12 12m0 -12l-12 12" stroke="' + SIDE[o.side] + '" stroke-width="2"/>' : ""); }
    /* totems touchés par une vague (position réelle du log) : carré à la couleur du côté, relié au porteur */
    for (const o of (m.opened || []).filter(o => o.dt <= t + 0.05)) { const c = waves.find(w => w.name === o.by);
      if (c) s += '<line x1="' + sx(c.x) + '" y1="' + sy(c.y) + '" x2="' + sx(o.x) + '" y2="' + sy(o.y) + '" stroke="' + SIDE[o.side] + '" stroke-width="2"/>';
      s += '<rect x="' + (sx(o.x) - 7) + '" y="' + (sy(o.y) - 7) + '" width="14" height="14" fill="' + SIDE[o.side] + '" stroke="var(--card)" stroke-width="2"><title>Totem ' + o.side + ' touché à ' + o.dt + ' s par la vague de ' + (o.by || "?") + (o.killed_s != null ? ', tué ' + o.killed_s + ' s après' : ', pas tué ensuite') + '</title></rect>'; }
    /* positions possibles d'un totem détruit : à la distance parcourue, sur chaque branche de chaque croix (le log ne dit pas laquelle) */
    for (const x of dead.filter(x => x.dist != null)) for (const w of waves) { /* toujours affichées : les totems avec position du log (cercles, carrés) s'ajoutent par-dessus */
      const op = t - x.dt < 0.6 ? 1 : 0.45, A = arms(w);
      /* graduation en travers de chaque branche, à la distance parcourue par la vague quand le totem est mort */
      for (const d of A) { const X = w.x + d[0] * x.dist, Y = w.y + d[1] * x.dist, nx = -d[1] * 1.6, ny = d[0] * 1.6;
        s += '<line x1="' + sx(X + nx) + '" y1="' + sy(Y + ny) + '" x2="' + sx(X - nx) + '" y2="' + sy(Y - ny) + '" stroke="' + SIDE[x.side] + '" stroke-width="3" stroke-opacity="' + op * 0.8 + '"><title>Totem ' + x.side + ' détruit à ' + x.dt + ' s : sur une des branches, à ~' + x.dist + ' m d\'un porteur (' + w.name + ' ?)</title></line>'; }
      if (!A.length) s += '<circle cx="' + sx(w.x) + '" cy="' + sy(w.y) + '" r="' + x.dist * k + '" fill="none" stroke="' + SIDE[x.side] + '" stroke-opacity="' + op * 0.6 + '" stroke-dasharray="2 4"><title>Totem ' + x.side + ' détruit à ' + x.dt + ' s, à ~' + x.dist + ' m de ' + w.name + '</title></circle>';
    }
    for (const p of m.players) s += p.carrier ? '<g><circle cx="' + sx(p.x) + '" cy="' + sy(p.y) + '" r="7" fill="#f59e0b" stroke="var(--card)" stroke-width="2"/><text x="' + (sx(p.x) + 9) + '" y="' + (sy(p.y) + 4) + '" font-weight="700">' + p.name + '</text></g>'
      : '<circle cx="' + sx(p.x) + '" cy="' + sy(p.y) + '" r="4" fill="#9ca3af"><title>' + p.name + '</title></circle>';
    s += '<path d="M' + sx(B[0]) + ' ' + (sy(B[1]) - 10) + 'l10 10-10 10-10-10z" fill="#ef4444" fill-opacity=".6"><title>Vashnik (repère)</title></path>';
    const atB = dead.filter(x => x.at_burst), byS = side => dead.filter(x => x.side === side).length;
    s += '<text x="10" y="20" font-weight="700">Totems détruits : ' + dead.length + '/' + (m.alive || m.totems.length) + ' (feu ' + byS("feu") + ', ombre ' + byS("ombre") + ')' + (atB.length ? ' · ' + atB.length + ' à l\'explosion' : '') + '</text>';
    s += '<text x="10" y="38" class="muted">vitesse de vague ' + m.speed + ' m/s' + (m.speed_measured ? '' : ' (estimée)') + (m.waves ? ' · croix : ' + waves.filter(w => w.cross != null).length + '/' + waves.length + (waves.some(w => w.from === "axes") ? ' alignée(s) sur les axes de la carte' : ' déduite(s) des joueurs touchés') : '') + '</text>';
    box.querySelector(".vkcanvas").innerHTML = s + "</svg>";
  }
  window.initVk = root => root.querySelectorAll(".vkmap:not([data-init])").forEach(box => {
    box.dataset.init = "1"; draw(box);
    box.querySelector(".vksel").onchange = () => { box.querySelector(".vkt").value = 8; draw(box); };
    box.querySelector(".vkt").oninput = () => draw(box);
    const b = box.querySelector(".vkplay"); let timer = null;
    b.onclick = () => { if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; return; }
      const r = box.querySelector(".vkt"); if (+r.value >= 8) r.value = 0; b.textContent = "❚❚ Pause";
      timer = setInterval(() => { r.value = Math.min(8, +r.value + 0.1); draw(box); if (+r.value >= 8) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; } }, 60); };
  });
  initVk(document);
})();

/* Nymrissa : film du combat (positions seconde par seconde), animé par un curseur et un bouton Lecture */
(function () {
  const ADD = { "Bubblefin Shorerunner": "#facc15", "Bubblefin Berserker": "#ef4444", "Bubblefin Frostscale": "#60a5fa" };
  const CLS = { DeathKnight: "#C41E3A", DemonHunter: "#A330C9", Druid: "#FF7C0A", Evoker: "#33937F", Hunter: "#AAD372", Mage: "#3FC7EB", Monk: "#00FF98", Paladin: "#F48CBA", Priest: "#FFFFFF", Rogue: "#FFF468", Shaman: "#0070DD", Warlock: "#8788EE", Warrior: "#C69B6D" };
  const mm = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
  /* position à l'instant t : dernière position connue (au plus 8 s avant), sinon rien */
  const at = (pts, t, hold = 8) => { let q = null; for (const p of pts) { if (p[0] > t) break; q = p; } return q && t - q[0] <= hold ? q : null; };
  function draw(box) {
    const F = JSON.parse(box.querySelector(".nydata").textContent), m = F[+box.querySelector(".nysel").value], t = +box.querySelector(".nyt").value;
    box.querySelector(".nytl").textContent = mm(t) + " / " + mm(m.dur);
    if (!m) return;
    if (!m.bounds) { const all = [...m.players.flatMap(p => p.pts), ...m.adds.flatMap(a => a.pts), ...m.boss, ...m.orbs.map(o => [0, o.x, o.y]), ...m.puddles.map(o => [0, o.x, o.y])];
      const xs = all.map(p => p[1]).sort((a, b) => a - b), ys = all.map(p => p[2]).sort((a, b) => a - b), q = (a, f) => a[Math.floor(f * (a.length - 1))];
      /* bornes robustes : 1er et 99e centiles (un joueur projeté loin n'écrase pas la carte) */
      m.bounds = [q(xs, .01) - 8, q(xs, .99) + 8, q(ys, .01) - 8, q(ys, .99) + 8]; }
    const [x0, x1, y0, y1] = m.bounds, W = 760, H = Math.max(360, Math.min(640, W * (y1 - y0) / Math.max(1, x1 - x0))), k = Math.min(W / (x1 - x0), H / (y1 - y0));
    const sx = x => (x - x0) * k, sy = y => H - (y - y0) * k;
    const rain = m.rains.some(([a, b]) => t >= a && t <= b);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Film du combat">';
    const heavy = m.rains.some(r => t >= r[0] && t <= (r[2] ?? r[1]));
    if (rain) s += '<rect width="' + W + '" height="' + H + '" fill="' + (heavy ? "#ef4444" : "#38bdf8") + '" fill-opacity=".10"/><text x="' + (W - 10) + '" y="22" text-anchor="end" font-weight="700" fill="' + (heavy ? "#ef4444" : "#38bdf8") + '">' + (heavy ? "PLUIE : PHASE FORTE (pas d'orbe)" : "PLUIE : DoT (orbes ok)") + '</text>';
    for (const p of m.puddles) { if (t < p.from_s) continue; const gone = p.to_s != null && t >= p.to_s;
      if (gone && t - p.to_s > 3) continue;
      s += '<circle cx="' + sx(p.x) + '" cy="' + sy(p.y) + '" r="' + 4 * k + '" fill="#bae6fd" fill-opacity="' + (gone ? 0.12 : 0.45) + '" stroke="#7dd3fc" stroke-dasharray="' + (gone ? "3 3" : "0") + '"><title>Flaque (' + (p.src === "orbe" ? "orbe prise" : "glace vue sous des joueurs") + ') depuis ' + mm(p.from_s) + (p.to_s != null ? ", nettoyée à " + mm(p.to_s) + " par le jet vers " + p.cleared_by : ", pas nettoyée") + '</title></circle>'; }
    for (const j of m.jets) if (t >= j.s && t - j.s <= 1.5) s += '<line x1="' + sx(j.a[0]) + '" y1="' + sy(j.a[1]) + '" x2="' + sx(j.b[0]) + '" y2="' + sy(j.b[1]) + '" stroke="#3b82f6" stroke-width="' + Math.max(4, 10 * k) + '" stroke-opacity=".55" stroke-linecap="round"><title>Water Jet vers ' + j.tank + ' (' + mm(j.s) + ')</title></line>';
    for (const o of m.orbs) if (t >= o.from_s && t <= o.soak_s + 0.8) s += '<circle cx="' + sx(o.x) + '" cy="' + sy(o.y) + '" r="7" fill="#22d3ee" fill-opacity=".7" stroke="' + (o.state === "heavy" ? "#ef4444" : "#0e7490") + '" stroke-width="3"><title>Frost Orb' + (o.dropped_by ? " posée par " + o.dropped_by : "") + ", prise par " + o.by + " à " + mm(o.soak_s) + (o.state === "heavy" ? " (pendant la phase forte de la pluie)" : o.state === "dot" ? " (pendant le DoT de la pluie)" : "") + '</title></circle>';
    for (const a of m.adds) { if (a.death_s != null && t > a.death_s) continue; const q = at(a.pts, t, 6); if (!q) continue; const X = sx(q[1]), Y = sy(q[2]);
      s += '<path d="M' + X + " " + (Y - 7) + "l6 11h-12z" + '" fill="' + (ADD[a.n] || "#f97316") + '" stroke="var(--card)"><title>' + a.n + '</title></path>'; }
    const b = at(m.boss, t, 30); if (b) s += '<path d="M' + sx(b[1]) + " " + (sy(b[2]) - 11) + 'l11 11-11 11-11-11z" fill="#a78bfa" stroke="var(--card)" stroke-width="2"><title>Nymrissa</title></path>';
    for (const p of m.players) { const q = at(p.pts, t, 30); if (!q) continue; const dead = m.deaths.some(d => d.n === p.n && t >= d.s); if (dead) continue; const X = sx(q[1]), Y = sy(q[2]), c = CLS[p.cls] || "#9ca3af";
      s += p.role === "tank" ? '<rect x="' + (X - 5) + '" y="' + (Y - 5) + '" width="10" height="10" fill="' + c + '" stroke="#000" stroke-opacity=".4"><title>' + p.n + '</title></rect>' : '<circle cx="' + X + '" cy="' + Y + '" r="4.5" fill="' + c + '" stroke="#000" stroke-opacity=".4"><title>' + p.n + '</title></circle>'; }
    for (const d of m.deaths) if (t >= d.s && t - d.s < 6) s += '<text x="' + sx(d.p[0]) + '" y="' + (sy(d.p[1]) + 5) + '" text-anchor="middle" fill="#ef4444" font-size="16">✕<title>' + d.n + " mort à " + mm(d.s) + '</title></text>';
    const nP = m.puddles.filter(p => t >= p.from_s && (p.to_s == null || t < p.to_s)).length;
    s += '<text x="10" y="20" font-weight="700">' + mm(t) + ' · ' + nP + ' flaque(s) au sol</text>';
    box.querySelector(".nycanvas").innerHTML = s + "</svg>";
  }
  window.initNy = root => root.querySelectorAll(".nymap:not([data-init])").forEach(box => {
    box.dataset.init = "1"; const r = box.querySelector(".nyt"), F = JSON.parse(box.querySelector(".nydata").textContent);
    draw(box);
    box.querySelector(".nysel").onchange = () => { r.max = F[+box.querySelector(".nysel").value].dur; r.value = 0; draw(box); };
    r.oninput = () => draw(box);
    const b = box.querySelector(".nyplay"); let timer = null;
    b.onclick = () => { if (timer) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; return; }
      if (+r.value >= +r.max) r.value = 0; b.textContent = "❚❚ Pause";
      timer = setInterval(() => { r.value = Math.min(+r.max, +r.value + 0.1 * +box.querySelector(".nyspd").value); draw(box); if (+r.value >= +r.max) { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; } }, 100); };
  });
  initNy(document);
})();

/* Sszorak : lecteur d'une projection de Raging Crosswinds (de -4 s à +3 s autour de la projection). Positions relevées dans
   le log (dégâts subis, lancers), interpolées entre deux relevés. */
(function () {
  const PAL = ["#38bdf8", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#fb923c", "#60a5fa", "#e879f9"];
  const fmt = x => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ",") + " s";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /* position à t : interpolée entre deux relevés à moins de 4 s d'écart, sinon le relevé le plus proche (2,5 s avant, 1 s après) */
  const at = (p, t) => { let b = null, n = null; for (const q of p.pts) { if (q[0] <= t) b = q; else { n = q; break; } }
    if (b && n && n[0] - b[0] <= 4) { const k = (t - b[0]) / (n[0] - b[0]); return [b[1] + (n[1] - b[1]) * k, b[2] + (n[2] - b[2]) * k]; }
    return b && t - b[0] <= 2.5 ? [b[1], b[2]] : n && n[0] - t <= 1 ? [n[1], n[2]] : null; };
  function prep(m) {
    if (m.bounds) return;
    const all = m.players.flatMap(p => p.pts.filter(q => q[0] <= 1)), xs = all.map(q => q[1]).sort((a, b) => a - b), ys = all.map(q => q[2]).sort((a, b) => a - b), qn = (a, f) => a[Math.floor(f * (a.length - 1))];
    m.bounds = all.length ? [qn(xs, .02) - 12, qn(xs, .98) + 12, qn(ys, .02) - 12, qn(ys, .98) + 12] : [0, 1, 0, 1];
    /* couleur de chaque paire */
    const seen = new Set(); let i = 0; m.col = {};
    for (const p of m.players.filter(p => p.marked)) { if (seen.has(p.n)) continue; const mate = p.mate !== undefined ? p.mate : (p.near || p.partner); seen.add(p.n); if (mate) seen.add(mate);
      m.col[p.n] = PAL[i % PAL.length]; if (mate) m.col[mate] = PAL[i % PAL.length]; i++; }
  }
  function draw(box) {
    const D = JSON.parse(box.querySelector(".cwdata").textContent), m = D[+box.querySelector(".cwsel").value], t = +box.querySelector(".cwt").value;
    if (!m) return; prep(m);
    box.querySelector(".cwtl").textContent = "t = " + fmt(t);
    box.querySelector(".cwiss").innerHTML = m.issues.length ? "<ul class=\"small\">" + m.issues.map(x => "<li>" + x + "</li>").join("") + "</ul>" : "<p class=\"small muted\">Aucun problème détecté sur cette projection.</p>";
    const [x0, x1, y0, y1] = m.bounds, W = 760, H = Math.max(380, Math.min(620, W * (y1 - y0) / Math.max(1, x1 - x0))), k = Math.min(W / (x1 - x0), H / (y1 - y0));
    const sx = x => (x - x0) * k, sy = y => H - (y - y0) * k;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Projection de Raging Crosswinds">';
    /* bandeau de phase */
    const ph = t < -1.5 ? ["placement", "var(--muted)"] : t < 0 ? ["dernière 1,5 s : ne plus bouger", "#f97316"] : ["projection", "#ef4444"];
    if (t >= 0) s += '<rect width="' + W + '" height="' + H + '" fill="#ef4444" fill-opacity=".06"/>';
    s += '<text x="' + (W - 12) + '" y="22" text-anchor="end" font-weight="700" font-size="13" fill="' + ph[1] + '">' + ph[0].toUpperCase() + "</text>";
    /* échelle 10 m */
    s += '<line x1="12" y1="' + (H - 14) + '" x2="' + (12 + 10 * k) + '" y2="' + (H - 14) + '" stroke="var(--muted)" stroke-width="2"/><text x="12" y="' + (H - 20) + '" fill="var(--muted)">10 m</text>';
    /* flaques de venin au sol à l'instant t (rayon supposé 4 m) */
    for (const q of m.puddles || []) if (q.t <= t) s += '<circle cx="' + sx(q.x) + '" cy="' + sy(q.y) + '" r="' + 4 * k + '" fill="#84cc16" fill-opacity=".18" stroke="#84cc16" stroke-opacity=".55" stroke-dasharray="3 3"><title>Flaque de venin (' + esc(q.src) + ")</title></circle>";
    /* traînées : 1,5 s avant t */
    for (const p of m.players) { const L = []; for (let u = Math.max(-4, t - 1.5); u <= t + 1e-6; u += 0.25) { const q = at(p, u); if (q) L.push(q); }
      if (L.length < 2) continue; const mv = Math.hypot(L[L.length - 1][0] - L[0][0], L[L.length - 1][1] - L[0][1]);
      const c = t > 0 && mv >= 8 ? (p.fell || p.died ? "#ef4444" : "#94a3b8") : t <= 0 && t >= -1.6 && mv >= 3 ? "#f97316" : "#94a3b8";
      s += '<polyline points="' + L.map(q => sx(q[0]).toFixed(1) + "," + sy(q[1]).toFixed(1)).join(" ") + '" fill="none" stroke="' + c + '" stroke-width="' + (c === "#94a3b8" ? 1.2 : 2.6) + '" stroke-opacity="' + (c === "#94a3b8" ? 0.45 : 0.9) + '" stroke-linecap="round"/>'; }
    /* paires : trait entre les deux joueurs (jusqu'à la projection) */
    if (t <= 0.3) { const done = new Set();
      for (const p of m.players.filter(p => p.marked)) { const mate = p.mate !== undefined ? p.mate : (p.near || p.partner), q = mate ? m.players.find(x => x.n === mate) : null; if (!q || done.has(p.n) || done.has(q.n)) continue; done.add(p.n); done.add(q.n);
        const A = at(p, t), B = at(q, t); if (!A || !B) continue; const d = Math.hypot(A[0] - B[0], A[1] - B[1]);
        s += '<line x1="' + sx(A[0]) + '" y1="' + sy(A[1]) + '" x2="' + sx(B[0]) + '" y2="' + sy(B[1]) + '" stroke="' + m.col[p.n] + '" stroke-width="1.5" stroke-dasharray="6 4"/>';
        s += '<text x="' + ((sx(A[0]) + sx(B[0])) / 2 + 4) + '" y="' + ((sy(A[1]) + sy(B[1])) / 2 - 4) + '" fill="' + m.col[p.n] + '" font-weight="700">' + Math.round(d) + " m</text>"; } }
    /* joueurs */
    for (const p of m.players) { const a = at(p, t); if (!a) continue; const X = sx(a[0]), Y = sy(a[1]);
      const late = (p.late_m ?? 0) >= 3, bad = (p.fell || p.died) && t > 0;
      if (!p.marked) { s += '<g><circle cx="' + X + '" cy="' + Y + '" r="4" fill="' + p.color + '" stroke="' + (bad ? "#ef4444" : "none") + '" stroke-width="2"/>' + (late || bad ? '<text x="' + (X + 7) + '" y="' + (Y - 5) + '">' + esc(p.n) + "</text>" : "") + "<title>" + esc(p.n) + (p.late_m != null ? " · " + String(p.late_m).replace(".", ",") + " m dans la dernière 1,5 s" : "") + (p.fell ? " · chute" : "") + (p.died ? " · mort" : "") + "</title></g>"; continue; }
      const c = m.col[p.n] || "#f59e0b";
      if (p.dir && t <= 0.3) { const L2 = 8, ex = sx(a[0] + p.dir[0] * L2), ey = sy(a[1] + p.dir[1] * L2), ux = p.dir[0], uy = -p.dir[1], h = 8;
        s += '<line x1="' + X + '" y1="' + Y + '" x2="' + ex + '" y2="' + ey + '" stroke="' + c + '" stroke-width="3"/><polygon points="' + (ex + ux * h) + "," + (ey + uy * h) + " " + (ex - uy * h * .6) + "," + (ey + ux * h * .6) + " " + (ex + uy * h * .6) + "," + (ey - ux * h * .6) + '" fill="' + c + '"/>'; }
      s += '<g><circle cx="' + X + '" cy="' + Y + '" r="7.5" fill="' + p.color + '" stroke="' + (bad ? "#ef4444" : c) + '" stroke-width="3"/>' + (bad ? '<text x="' + X + '" y="' + (Y + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">✕</text>' : "") +
        '<text x="' + (X + 10) + '" y="' + (Y - 8) + '" font-weight="700" font-size="11">' + esc(p.n) + "</text><title>" + esc(p.n) + " · marqué" + ((p.mate !== undefined ? p.mate : (p.near || p.partner)) ? ", paire avec " + esc(p.mate !== undefined ? p.mate : (p.near || p.partner)) : "") + (p.late_m != null ? " · " + String(p.late_m).replace(".", ",") + " m dans la dernière 1,5 s" : "") + (p.dist_m != null ? " · projeté de " + String(p.dist_m).replace(".", ",") + " m" : "") + (p.fell ? " · chute" : "") + (p.died ? " · mort" : "") + "</title></g>"; }
    box.querySelector(".cwcanvas").innerHTML = s + "</svg>";
  }
  window.initCw = root => root.querySelectorAll(".cwmap:not([data-init])").forEach(box => {
    box.dataset.init = "1"; const r = box.querySelector(".cwt"); draw(box);
    box.querySelector(".cwsel").onchange = () => { r.value = -1.5; draw(box); };
    r.oninput = () => draw(box);
    const b = box.querySelector(".cwplay"); let timer = null;
    const stop = () => { clearInterval(timer); timer = null; b.textContent = "▶ Lecture"; };
    b.onclick = () => { if (timer) return stop();
      if (+r.value >= 3) r.value = -4; b.textContent = "❚❚ Pause";
      timer = setInterval(() => { r.value = Math.min(3, +r.value + 0.1 * +box.querySelector(".cwspd").value); draw(box); if (+r.value >= 3) stop(); }, 100); };
  });
  initCw(document);
})();
