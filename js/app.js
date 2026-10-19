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
    for (const h of m.hits.filter(h => h.dt <= t)) s += '<circle cx="' + sx(h.x) + '" cy="' + sy(h.y) + '" r="9" fill="none" stroke="#ef4444" stroke-width="1.5"><title>' + h.name + ' touché par une vague à ' + h.dt + ' s</title></circle>';
    const dead = m.totems.filter(x => x.dt <= t);
    /* totems présents pendant la vague, à leur position (log) : cercle de la couleur du côté, barré une fois mort */
    for (const o of m.totems_at || []) { const gone = o.died_dt != null && o.died_dt <= t;
      s += '<circle cx="' + sx(o.x) + '" cy="' + sy(o.y) + '" r="8" fill="' + (gone ? "none" : SIDE[o.side]) + '" fill-opacity=".35" stroke="' + SIDE[o.side] + '" stroke-width="2"><title>Totem ' + o.side + (o.opened ? ", touché par une vague" : ", jamais touché par cette vague") + (o.died_dt != null ? ", détruit à " + o.died_dt + " s" : ", toujours en vie") + '</title></circle>' + (gone ? '<path d="M' + (sx(o.x) - 6) + ' ' + (sy(o.y) - 6) + 'l12 12m0 -12l-12 12" stroke="' + SIDE[o.side] + '" stroke-width="2"/>' : ""); }
    /* totems touchés par une vague (position réelle du log) : carré à la couleur du côté, relié au porteur */
    for (const o of (m.opened || []).filter(o => o.dt <= t + 0.05)) { const c = waves.find(w => w.name === o.by);
      if (c) s += '<line x1="' + sx(c.x) + '" y1="' + sy(c.y) + '" x2="' + sx(o.x) + '" y2="' + sy(o.y) + '" stroke="' + SIDE[o.side] + '" stroke-width="2"/>';
      s += '<rect x="' + (sx(o.x) - 7) + '" y="' + (sy(o.y) - 7) + '" width="14" height="14" fill="' + SIDE[o.side] + '" stroke="var(--card)" stroke-width="2"><title>Totem ' + o.side + ' touché à ' + o.dt + ' s par la vague de ' + (o.by || "?") + (o.killed_s != null ? ', tué ' + o.killed_s + ' s après' : ', pas tué ensuite') + '</title></rect>'; }
    /* positions possibles d'un totem détruit (seulement quand le log n'a pas les coups de vague sur les totems) : à la distance parcourue, sur chaque branche de chaque croix (le log ne dit pas laquelle) */
    for (const x of ((m.opened || []).length || (m.totems_at || []).length ? [] : dead).filter(x => x.dist != null)) for (const w of waves) {
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
    s += '<text x="10" y="20" font-weight="700">Totems détruits : ' + dead.length + '/' + m.totems.length + ' (feu ' + byS("feu") + ', ombre ' + byS("ombre") + ')' + (atB.length ? ' · ' + atB.length + ' à l\'explosion' : '') + '</text>';
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
