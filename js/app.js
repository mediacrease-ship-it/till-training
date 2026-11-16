import { buildDefaultPlan, PLAN_VERSION, RULES, slug } from "./plan.js";
import * as DB from "./db.js";
import {
  dateStr, addDays, weekStart, fmt, fmt1, fmtDate, fmtShort, fmtDM, weekRange, weekOfMonth, parseNum, fmtPct, pct, repRange, uid,
  fmtDuration, setText, newSession, newSessionExercise, exStats, historyFor, lastTime, hintFor, splitStaleDrafts, finalizeSession,
  dayProgress, exerciseState, sessionTotals, weeklyOverview, exerciseWeekly, bodyWeekly, doneSessions, improved, sum,
  foodDay, foodWeek, parseDate, parseMealText,
} from "./logic.js";
import { lineChart, barChart, sparkline } from "./charts.js";
import { art } from "./art.js";
import { altsFor } from "./alternatives.js";
import { imgUrls } from "./images.js";
import { DEFAULT_FOODS, TEMPLATES } from "./meals.js";

const APP_VERSION = "2026-11-16 · Einarmig-Modus";

/* =====================================================================
   State
   ===================================================================== */
const MEALS = ["Frühstück", "Pause", "Mittagessen", "Abendessen", "Nach dem Training", "Snacks & Shakes"];
const S = {
  plan: [], sessions: [], body: [], foods: [], foodlog: [], photos: {}, photoRec: {},
  settings: { key: "settings", theme: "light", planVersion: 0 },
  ui: { seg: "ex", search: "", metric: "weight", edit: false, planEdit: false, note: false, foodDate: null, foodEdit: false, lastMeal: MEALS[0] },
};
const $app = document.getElementById("app");
const $tab = document.getElementById("tabbar");
const $timer = document.getElementById("timer");
const $sheet = document.getElementById("sheet");
const $toast = document.getElementById("toast");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dayById = (id) => S.plan.find((d) => d.id === id);
const draftOf = (dayId) => S.sessions.find((s) => s.status === "draft" && s.dayId === dayId);
function getDraft(dayId) {
  let d = draftOf(dayId);
  if (!d) {
    const day = dayById(dayId);
    if (!day) return null;
    d = newSession(day);
    S.sessions.push(d);
    DB.put("sessions", d);
  }
  return d;
}
const saveSession = (s) => DB.put("sessions", s);
function planExByKey(key) { for (const d of S.plan) for (const e of d.exercises) if (e.key === key) return e; return null; }
const repMaxFor = (key) => { const e = planExByKey(key); return e && e.kind === "sets" ? repRange(e.reps).max : null; };

/* =====================================================================
   Icons
   ===================================================================== */
const SV = (vb, body, extra = "") => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
const ICON = {
  chev: `<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>`,
  back: SV("0 0 12 20", `<path d="M10 2L2 10l8 8"/>`, 'stroke-width="2.6"'),
  fwd: SV("0 0 12 20", `<path d="M2 2l8 8-8 8"/>`, 'stroke-width="2.6"'),
  check: SV("0 0 20 20", `<path d="M4 10.5l4 4 8-9"/>`, 'stroke-width="3"'),
  up: SV("0 0 24 24", `<circle cx="12" cy="12" r="10"/><path d="M12 17V8M8 12l4-4 4 4"/>`, 'stroke-width="2"'),
  warn: SV("0 0 24 24", `<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>`, 'stroke-width="2"'),
  camera: SV("0 0 24 24", `<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>`, 'stroke-width="1.8"'),
  pull: SV("0 0 24 24", `<path d="M12 4v15M6 13l6 6 6-6"/>`, 'stroke-width="2.2"'),
  push: SV("0 0 24 24", `<path d="M12 20V5M6 11l6-6 6 6"/>`, 'stroke-width="2.2"'),
  tabs: {
    plan: SV("0 0 28 28", `<rect x="4" y="5" width="20" height="19" rx="5"/><path d="M4 11h20M10 3.5v4M18 3.5v4"/>`, 'stroke-width="1.9"'),
    food: SV("0 0 28 28", `<path d="M9 4v7a3.2 3.2 0 0 0 6.4 0V4M12.2 4v20M21 4v20M21 4c-3.4 1.4-4.6 6-3.4 10h3.4"/>`, 'stroke-width="1.9"'),
    history: SV("0 0 28 28", `<circle cx="14" cy="14" r="10"/><path d="M14 8v6.5l4 2.5"/>`, 'stroke-width="1.9"'),
    body: SV("0 0 28 28", `<rect x="4" y="4" width="20" height="20" rx="6"/><path d="M9 11.5a7 7 0 0 1 10 0M14 16l2.6-3.6"/>`, 'stroke-width="1.9"'),
    analysis: SV("0 0 28 28", `<path d="M6 23v-7M14 23V6M22 23V12"/>`, 'stroke-width="3"'),
  },
};
const TABS = [
  { id: "plan", label: "Plan", href: "#/" },
  { id: "food", label: "Essen", href: "#/food" },
  { id: "history", label: "Verlauf", href: "#/history" },
  { id: "body", label: "Körper", href: "#/body" },
  { id: "analysis", label: "Analyse", href: "#/analysis" },
];

/* =====================================================================
   UI-Bausteine
   ===================================================================== */
const navbar = ({ back, backLabel, title, right = "" }) =>
  `<div class="navbar"><a class="gbtn glass" href="${back}" aria-label="Zurück zu ${esc(backLabel)}">${ICON.back}<span>${esc(backLabel)}</span></a><div class="nav-title glass">${esc(title)}</div><div style="justify-self:end">${right}</div></div>`;
const seg = (opts, val, action) =>
  `<div class="seg glass" role="tablist">${opts.map((o) => `<button role="tab" aria-selected="${o.v === val}" class="${o.v === val ? "on" : ""}" data-a="${action}" data-v="${o.v}">${esc(o.l)}</button>`).join("")}</div>`;
const notFound = () => `<h1 class="large">Nicht gefunden</h1><p class="subtitle">Diese Seite gibt es nicht.</p><a class="btn" href="#/">Zur Startseite</a>`;
const empty = (title, text) => `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`;
const thumbOf = (name, key) => {
  if (S.photos[key]) return `<img src="${S.photos[key]}" alt="">`;
  const u = imgUrls(key)[0];
  return u ? `<img src="${u}" alt="" loading="lazy" data-art="${esc(name)}">` : art(name);
};
function heroOf(name, key) {
  if (S.photos[key]) return { html: `<img src="${S.photos[key]}" alt="Dein Foto: ${esc(name)}">`, cls: "" };
  const urls = imgUrls(key);
  if (urls.length) return { cls: "imgs", html: urls.map((u, i) => `<img src="${u}" alt="${i ? "Endposition" : "Startposition"}: ${esc(name)}" ${i ? "data-hide" : `data-art="${esc(name)}"`}>`).join("") };
  return { html: art(name), cls: "" };
}

function toast(msg) {
  $toast.textContent = msg; $toast.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => $toast.classList.remove("show"), 2200);
}
let sheetActions = [];
function showSheet({ title, message, html = "", actions = [] }) {
  sheetActions = actions;
  $sheet.innerHTML = `<div class="scrim" data-a="sheetClose"></div><div class="sheet" role="dialog" aria-modal="true">` +
    (title ? `<h3>${esc(title)}</h3>` : "") + (message ? `<p>${esc(message)}</p>` : "") + html +
    `<div class="sheet-actions">${actions.map((a, i) => `<button class="sheet-btn ${a.style || ""}" data-a="sheetAct" data-i="${i}">${esc(a.label)}</button>`).join("")}</div></div>`;
  $sheet.classList.add("open");
}
const closeSheet = () => { $sheet.classList.remove("open"); $sheet.innerHTML = ""; sheetActions = []; };

/* =====================================================================
   Tageslogik
   ===================================================================== */
const todayDay = () => S.plan.find((x) => x.weekday === new Date().getDay()) || null;
function doneThisWeek(dayId) {
  const w = weekStart(dateStr());
  return S.sessions.some((s) => s.status === "done" && s.dayId === dayId && weekStart(s.date) === w);
}
function nextTraining() {
  for (let k = 1; k <= 7; k++) {
    const d = new Date(); d.setDate(d.getDate() + k);
    const day = S.plan.find((x) => x.weekday === d.getDay());
    if (day) return { day, k, date: dateStr(d) };
  }
  return null;
}
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/* =====================================================================
   Screen: Plan (Heute)
   ===================================================================== */
function viewPlan() {
  const today = dateStr(), w = weekStart(today), td = todayDay();
  const now = new Date();
  let h = `<h1 class="large">Heute</h1><p class="subtitle">${now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} · ${weekOfMonth(w)}</p>`;

  if (td) {
    const dr = draftOf(td.id), pr = dr ? dayProgress(dr) : { done: 0, total: 0, ratio: 0 };
    const doneToday = S.sessions.some((s) => s.status === "done" && s.dayId === td.id && s.date === today);
    const sets = td.exercises.reduce((n, e) => n + e.workSets, 0), exN = td.exercises.filter((e) => e.kind === "sets").length;
    h += `<a class="hero k-${td.kind}" href="#/day/${td.id}">
      <div class="eyebrow">${doneToday ? "Heute erledigt" : "Heute steht an"}</div>
      <h2>${esc(td.name)} ${doneToday ? "ist geschafft" : "ist heute dran"}</h2><p>${esc(td.focus)}</p>
      <div class="meta">${exN} Übungen · ${sets} Arbeitssätze</div>
      ${pr.done > 0 && !doneToday ? `<div class="prog"><i style="width:${Math.round(pr.ratio * 100)}%"></i></div>` : ""}
      <div class="cta glass dark">${doneToday ? "Ansehen" : pr.done > 0 ? `Fortsetzen · ${pr.done} von ${pr.total}` : "Training starten"}</div></a>`;
  } else {
    const nx = nextTraining();
    h += `<${nx ? `a href="#/day/${nx.day.id}"` : "div"} class="hero"><div class="eyebrow">Heute</div><h2>Heute ist Pause</h2><p>Erholung gehört zum Training.</p>` +
      (nx ? `<div class="meta">Als Nächstes: ${WD[parseDate(nx.date).getDay()]}, ${esc(fmtShort(nx.date))} · ${esc(nx.day.name)}</div><div class="cta glass dark">${esc(nx.day.name)} ansehen</div>` : "") + `</${nx ? "a" : "div"}>`;
  }

  h += `<div class="section-h">Diese Woche · ${weekRange(w)}</div><div class="weekstrip">`;
  for (let i = 0; i < 7; i++) {
    const date = addDays(w, i), wd = parseDate(date).getDay();
    const d = S.plan.find((x) => x.weekday === wd);
    const done = d && S.sessions.some((s) => s.status === "done" && s.dayId === d.id && weekStart(s.date) === w);
    const inner = `<span class="l">${WD[wd]}</span><span class="n">${parseDate(date).getDate()}</span><span class="dt">${d ? (done ? ICON.check : "<i></i>") : ""}</span>`;
    h += d ? `<a class="wd k-${d.kind} ${date === today ? "today" : ""}" href="#/day/${d.id}" aria-label="${esc(d.name)}, ${WD[wd]} ${parseDate(date).getDate()}.">${inner}</a>` : `<div class="wd off ${date === today ? "today" : ""}">${inner}</div>`;
  }
  h += `</div><div style="height:14px"></div>`;
  for (const d of [...S.plan].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))) {
    const date = addDays(w, (d.weekday + 6) % 7);
    const dr = draftOf(d.id), pr = dr ? dayProgress(dr) : null, done = doneThisWeek(d.id), isToday = date === today;
    const state = isToday && !done ? `<span class="pill ink">Heute</span>` : done ? `<span class="pill acc">${ICON.check.replace("<svg", '<svg width="12" height="12"')} Erledigt</span>` : pr && pr.done > 0 ? `<span class="pill">${pr.done}/${pr.total}</span>` : "";
    h += `<a class="daycard k-${d.kind}" href="#/day/${d.id}"><div class="dc-ico">${ICON[d.kind]}</div>
      <div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${WD[d.weekday]}, ${esc(fmtShort(date))} · ${esc(d.focus)}</div></div>${state}${ICON.chev}</a>`;
  }
  h += `<div style="height:8px"></div><div class="list" style="margin-top:14px">
    <a class="row" href="#/rules"><div class="grow"><div class="t">Regeln &amp; Hinweise</div><div class="s">Steigern · Schulter · Stopp</div></div><div class="trail">${ICON.chev}</div></a>
    <a class="row" href="#/settings"><div class="grow"><div class="t">Einstellungen &amp; Backup</div><div class="s">Darstellung · Export · Import</div></div><div class="trail">${ICON.chev}</div></a></div>`;
  return h;
}

/* =====================================================================
   Screen: Trainingstag
   ===================================================================== */
function viewDay(id) {
  const day = dayById(id);
  if (!day) return notFound();
  const dr = getDraft(id), pr = dayProgress(dr);
  const curIdx = dr.exercises.findIndex((e) => exerciseState(e) !== "done");
  const lastShoulder = [...doneSessions(S.sessions)].reverse().find((s) => s.shoulder != null);
  const date = addDays(weekStart(dateStr()), (day.weekday + 6) % 7);

  let h = navbar({ back: "#/", backLabel: "Plan", title: day.name, right: `<button class="gbtn glass" data-a="planEdit">${S.ui.planEdit ? "Fertig" : "Ändern"}</button>` }) +
    `<h1 class="large">${esc(day.name)}</h1><p class="subtitle">${WD[day.weekday]}, ${esc(fmtDate(date, { day: "numeric", month: "long" }))} · ${esc(day.focus)}</p>`;
  if (day.note) h += `<div class="note">${esc(day.note)}</div>`;
  if (lastShoulder && lastShoulder.shoulder >= 3)
    h += `<div class="callout orange">${ICON.warn}<div><b>Schulter beim letzten Training: ${lastShoulder.shoulder}/10</b>Ab 3/10: Übung weglassen, Alternative nehmen.</div></div>`;

  h += `<div style="display:flex;justify-content:space-between;margin:20px 6px 8px;font-size:14px;color:var(--ink2)"><span>${pr.done} von ${pr.total} erledigt</span><span>${Math.round(pr.ratio * 100)} %</span></div><div class="progress" style="margin:0 6px 16px"><i style="width:${Math.round(pr.ratio * 100)}%"></i></div>`;

  dr.exercises.forEach((sx, i) => {
    const px = day.exercises[i] || {};
    const st = exerciseState(sx), cur = i === curIdx;
    const work = sx.sets.filter((s) => s.type === "work"), dw = work.filter((s) => s.done).length;
    const status = `<span class="status ${st}" style="--p:${work.length ? Math.round((dw / work.length) * 100) : 0}%" aria-hidden="true">${st === "done" ? ICON.check : ""}</span>`;
    const th = `<div class="thumb">${thumbOf(sx.name, sx.key)}</div>`;
    const nx = cur && st !== "done" ? `<div class="nx">Als Nächstes</div>` : "";
    if (S.ui.planEdit) {
      h += `<div class="xcard"><button class="minus" data-a="exRemove" data-i="${i}" aria-label="${esc(sx.name)} entfernen"></button>${th}<div class="grow"><div class="t">${esc(sx.name)}</div><div class="s">${sx.kind === "check" ? esc(px.reps) : `${px.workSets} × ${esc(px.reps)}`}${px.optional ? " · optional" : ""}</div></div>
        <div style="display:flex;flex-direction:column;gap:6px"><button class="gbtn round glass" style="height:34px;width:34px;min-width:34px" data-a="exMove" data-i="${i}" data-d="-1" aria-label="nach oben" ${i === 0 ? "disabled style=\"opacity:.3;height:34px;width:34px;min-width:34px\"" : ""}>▲</button><button class="gbtn round glass" style="height:34px;width:34px;min-width:34px" data-a="exMove" data-i="${i}" data-d="1" aria-label="nach unten" ${i === dr.exercises.length - 1 ? "disabled style=\"opacity:.3;height:34px;width:34px;min-width:34px\"" : ""}>▼</button></div></div>`;
      return;
    }
    if (sx.kind === "check") {
      h += `<button class="xcard ${cur ? "current" : ""} ${st}" data-a="toggleCheck" data-i="${i}" aria-pressed="${st === "done"}">${th}<div class="grow">${nx}<div class="t">${esc(sx.name)}</div><div class="s">${esc(px.note || px.reps)}</div></div>${status}</button>`;
      return;
    }
    const hist = historyFor(sx.key, S.sessions);
    const hint = hintFor(hist, repRange(px.reps).max, sx);
    const lt = hist.length ? hist[hist.length - 1] : null;
    h += `<a class="xcard ${cur ? "current" : ""} ${st}" href="#/day/${id}/ex/${i}">${th}<div class="grow">${nx}<div class="t">${esc(sx.name)}</div>
      <div class="s">${work.length} × ${esc(px.reps)}${px.optional ? " · optional" : ""}</div>
      ${lt ? `<div class="s">Zuletzt ${lt.st.sets.map(setText).join(" · ")}</div>` : ""}
      ${hint ? `<div class="hint ${hint.type === "increase" ? "up" : "warn"}">${hint.type === "increase" ? ICON.up : ICON.warn}${esc(hint.short)}</div>` : ""}</div>${status}</a>`;
  });

  if (S.ui.planEdit) return h + `<button class="btn" data-a="exAdd">+ Übung hinzufügen</button><div class="section-f" style="text-align:center">Änderungen gelten für alle kommenden ${esc(day.name)}-Trainings. Bisherige Daten bleiben im Verlauf.</div>`;
  const sh = dr.shoulder;
  h += `<div class="section-h">Schulter links (optional)</div><div class="card"><div class="scale">` +
    Array.from({ length: 11 }, (_, v) => `<button data-a="shoulder" data-v="${v}" class="${sh === v ? "on " + (v >= 6 ? "high" : v >= 3 ? "mid" : "") : ""}" aria-pressed="${sh === v}" aria-label="Schulter ${v} von 10">${v}</button>`).join("") +
    `</div><div style="font-size:13px;color:var(--ink2);margin-top:10px">0 = keine Beschwerden · 10 = starke Schmerzen</div></div>`;
  if (sh != null && sh >= 3) h += `<div class="callout red">${ICON.warn}<div><b>Warnung: Schulter ${sh}/10</b>Übung weglassen, Alternative nehmen. Kein Drücken über Kopf bis Arzt/Physio.</div></div>`;

  h += `<button class="btn acc" data-a="finish" data-day="${id}" style="margin-top:22px">Training abschließen</button>
        <button class="btn destructive" data-a="resetDay" data-day="${id}">Zurücksetzen</button>`;
  return h;
}

/* =====================================================================
   Screen: Übung
   ===================================================================== */
function viewExercise(dayId, i) {
  const day = dayById(dayId), dr = day && getDraft(dayId);
  const sx = dr && dr.exercises[i], px = day && day.exercises[i];
  if (!sx || !px) return notFound();
  const hist = historyFor(sx.key, S.sessions);
  const lt = hist.length ? hist[hist.length - 1] : null;
  const rr = repRange(px.reps);
  const hint = sx.kind === "sets" ? hintFor(hist, rr.max, sx) : null;
  const next = dr.exercises[i + 1];
  const right = sx.kind === "sets" ? `<button class="gbtn glass" data-a="toggleEdit">${S.ui.edit ? "Fertig" : "Bearbeiten"}</button>` : "";
  const work = sx.sets.filter((s) => s.type === "work");
  const hasAlts = altsFor(sx.origKey || sx.key).length > 0;
  if (sx.kind === "sets" && sx.uni === undefined) sx.uni = !!(lt && lt.ex.uni);

  let h = navbar({ back: `#/day/${dayId}`, backLabel: day.name, title: sx.name, right }) + `<h1 class="large">${esc(sx.name)}</h1>
    <p class="exmeta">${sx.kind === "sets" ? `${work.length} × ${esc(px.reps)}` : esc(px.reps)}${px.restLabel ? ` · Pause ${esc(px.restLabel)}` : ""}${px.optional ? " · optional" : ""}</p>`;
  if (hint) h += `<div class="hint ${hint.type === "increase" ? "up" : "warn"}" style="font-size:15px;margin-top:8px">${hint.type === "increase" ? ICON.up : ICON.warn}${esc(hint.short)}</div>`;

  const hero = heroOf(sx.name, sx.key);
  h += `<div class="exhero ${hero.cls}">${hero.html}
    <label class="cam glass" for="photoIn" aria-label="Eigenes Foto aufnehmen oder wählen">${ICON.camera}</label>
    ${S.photos[sx.key] ? `<button class="cam rm glass" data-a="rmPhoto" data-key="${esc(sx.key)}" aria-label="Foto entfernen"><span style="font-size:22px;line-height:1">×</span></button>` : ""}
    <input type="file" id="photoIn" accept="image/*" hidden data-key="${esc(sx.key)}"></div>`;
  if (hero.cls === "imgs") h += `<div class="imgnote">Start- und Endposition als Beispiel. Deine Maschine kann anders aussehen: mit der Kamera ein eigenes Foto machen.</div>`;

  h += `<div class="pillrow">${px.note ? `<button class="gbtn glass" data-a="toggleNote" aria-expanded="${S.ui.note}">Hinweis</button>` : ""}
    ${hasAlts || sx.origKey ? `<button class="gbtn glass" data-a="showAlts" data-i="${i}">Alternative anzeigen</button>` : ""}
    ${sx.kind === "sets" ? `<button class="gbtn glass ${sx.uni ? "on" : ""}" data-a="toggleUni" aria-pressed="${!!sx.uni}">${sx.uni ? "Einarmig ✓" : "Einarmig"}</button>` : ""}</div>`;
  if (sx.kind === "sets" && sx.uni) h += `<div class="note">Einarmig: erst rechts, dann links eintragen. Das Gewicht ist pro Arm. In der Auswertung zählt die schwächere Seite.</div>`;
  if (sx.origKey) h += `<div class="note" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>Alternative zu <b style="color:var(--ink)">${esc(sx.origName)}</b></span><button class="gbtn glass" data-a="unswap" data-i="${i}">Original</button></div>`;
  if (px.note && S.ui.note) h += `<div class="note">${esc(px.note)}</div>`;

  if (sx.kind === "check") {
    h += `<button class="btn ${sx.checked ? "secondary" : "acc"}" data-a="toggleCheck" data-i="${i}" style="margin-top:22px">${sx.checked ? "Erledigt ✓ (zurücknehmen)" : "Erledigt"}</button>`;
  } else {
    const lastWarm = lt ? lt.ex.sets.filter((s) => s.type === "warm" && s.done) : [];
    const lastWork = lt ? lt.st.sets : [];
    h += `<div class="sethead"><span>Satz</span><span>Zuletzt</span><span>kg</span><span>Wdh.</span><span></span></div><div class="sets">`;
    let wi = 0, ki = 0;
    const nWarm = sx.sets.filter((x) => x.type === "warm").length;
    sx.sets.forEach((s, idx) => {
      const isWarm = s.type === "warm";
      const n = isWarm ? ++wi : ++ki;
      const ref = (isWarm ? lastWarm : lastWork)[n - 1];
      const prevSetKg = !isWarm ? sx.sets.slice(0, idx).filter((x) => x.type === "work" && x.kg != null).pop() : null;
      const phKg = ref && ref.kg != null ? ref.kg : prevSetKg ? prevSetKg.kg : null;
      const phReps = ref && ref.reps != null ? ref.reps : null;
      const rangeTxt = rr.min === rr.max ? `${rr.max}` : `${rr.min}–${rr.max}`;
      const prevTxt = ref ? (ref.kg > 0 ? `${fmt(ref.kg)}×${ref.reps ?? "–"}` : `${ref.reps ?? "–"} Wdh.`) : "–";
      const uni = !!sx.uni;
      const phReL = ref && ref.repsL != null ? ref.repsL : null, phKgL = ref && ref.kgL != null ? ref.kgL : (s.kg != null ? s.kg : phKg);
      const prevL = ref && ref.repsL != null ? ((ref.kgL > 0 ? ref.kgL : ref.kg) > 0 ? `${fmt(ref.kgL > 0 ? ref.kgL : ref.kg)}×${ref.repsL}` : `${ref.repsL} Wdh.`) : "–";
      if (isWarm && n === 1) h += `<div class="subhead">Aufwärmen</div>`;
      if (!isWarm && n === 1) h += `<div class="subhead">${nWarm ? "Arbeitssätze" : "Sätze"}</div>`;
      h += `<div class="setrow ${s.done ? "done" : ""} ${uni ? "uni" : ""}" data-id="${s.id}" data-phkg="${phKg ?? ""}" data-phreps="${phReps ?? ""}" data-phrepsl="${phReL ?? ""}">
        ${S.ui.edit ? `<button class="minus" data-a="delSet" data-id="${s.id}" aria-label="Satz entfernen"></button>` : `<div class="slabel ${isWarm ? "warm" : ""}">${n}${uni ? "<small>R</small>" : ""}</div>`}
        <div class="prev">${prevTxt}</div>
        <input class="num" data-f="kg" data-id="${s.id}" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="Gewicht in kg${uni ? " rechts" : ""}, ${isWarm ? "Aufwärmsatz" : "Satz"} ${n}" placeholder="${phKg != null ? fmt(phKg) : "kg"}" value="${s.kg != null ? fmt(s.kg) : ""}">
        <input class="num" data-f="reps" data-id="${s.id}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="${uni ? "next" : "done"}" aria-label="Wiederholungen${uni ? " rechts" : ""}, ${isWarm ? "Aufwärmsatz" : "Satz"} ${n}" placeholder="${phReps != null ? phReps : isWarm ? "Wdh." : rangeTxt}" value="${s.reps != null ? s.reps : ""}">
        <button class="check" data-a="toggleSet" data-id="${s.id}" aria-pressed="${s.done}" aria-label="${isWarm ? "Aufwärmsatz" : "Satz"} ${n} ${s.done ? "zurücknehmen" : "abhaken"}">${ICON.check}</button></div>`;
      if (uni) h += `<div class="setrow sub ${s.done ? "done" : ""} uni" data-id="${s.id}">
        <div class="slabel side">L</div>
        <div class="prev">${prevL}</div>
        <input class="num" data-f="kgL" data-id="${s.id}" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="Gewicht in kg links, Satz ${n}" placeholder="${phKgL != null ? fmt(phKgL) : "kg"}" value="${s.kgL != null ? fmt(s.kgL) : ""}">
        <input class="num" data-f="repsL" data-id="${s.id}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="done" aria-label="Wiederholungen links, Satz ${n}" placeholder="${phReL != null ? phReL : isWarm ? "Wdh." : rangeTxt}" value="${s.repsL != null ? s.repsL : ""}">
        <span></span></div>`;
    });
    h += `</div><div class="addrow"><button class="btn secondary small" data-a="addSet" data-type="warm">+ Aufwärmsatz</button><button class="btn secondary small" data-a="addSet" data-type="work">+ Satz</button></div>`;
  }
  h += next
    ? `<a class="btn" href="#/day/${dayId}/ex/${i + 1}" style="margin-top:22px">Weiter: ${esc(next.name)}</a><a class="btn plain" href="#/day/${dayId}">Zum Tagesüberblick</a>`
    : `<a class="btn" href="#/day/${dayId}" style="margin-top:22px">Zum Tagesüberblick</a>`;
  return h;
}

/* =====================================================================
   Screen: Essen
   ===================================================================== */
const foodSorted = () => [...S.foods].sort((a, b) => (MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal)) || (a.position - b.position) || (a.createdAt - b.createdAt));
const portionOf = (date, id) => { const e = S.foodlog.find((l) => l.date === date && l.foodId === id); return e ? e.portion : 0; };
function foodLabel(date) {
  const t = dateStr();
  if (date === t) return "Heute";
  if (date === addDays(t, -1)) return "Gestern";
  return cap(fmtDate(date, { weekday: "long", day: "numeric", month: "long" }));
}
function viewFood() {
  const date = S.ui.foodDate || dateStr(), today = dateStr();
  const foods = foodSorted(), d = foodDay(foods, S.foodlog, date);
  let h = `<h1 class="large">Essen</h1><p class="subtitle">Hake ab, was du gegessen hast. Das fließt in die Analyse ein.</p>
    <div class="datenav"><button class="gbtn round glass" data-a="foodDay" data-d="-1" aria-label="Vorheriger Tag">${ICON.back}</button><b>${esc(foodLabel(date))}</b>
    <button class="gbtn round glass" data-a="foodDay" data-d="1" aria-label="Nächster Tag" ${date >= today ? "disabled style=\"opacity:.35\"" : ""}>${ICON.fwd}</button></div>`;
  if (!foods.length) {
    return h + `<div class="card">${empty("Noch keine Mahlzeiten", "Lege an, was du täglich essen willst. Danach kannst du es jeden Tag abhaken.")}
      <button class="btn acc" data-a="foodAdd">Mahlzeit hinzufügen</button><button class="btn secondary" data-a="foodPaste">Liste einfügen</button></div>`;
  }
  const pctDone = d.ratio != null ? Math.round(d.ratio * 100) : 0;
  h += `<div class="card"><div style="display:flex;align-items:baseline;justify-content:space-between"><div class="big">${pctDone} %</div><div style="color:var(--ink2);font-size:15px">${fmt(d.eaten)} von ${d.n} gegessen</div></div>
    <div class="progress" style="margin-top:12px;--acc:var(--good)"><i style="width:${pctDone}%"></i></div>
    ${d.planKcal || d.planProtein ? `<div class="stats" style="grid-template-columns:1fr 1fr">${d.planKcal ? `<div class="stat"><div class="v">${fmt(Math.round(d.kcal))}</div><div class="l">von ${fmt(Math.round(d.planKcal))} kcal</div></div>` : ""}${d.planProtein ? `<div class="stat"><div class="v">${fmt(Math.round(d.protein))} g</div><div class="l">von ${fmt(Math.round(d.planProtein))} g Protein</div></div>` : ""}</div>` : ""}</div>`;
  for (const meal of [...MEALS, "Sonstiges"]) {
    const items = foods.filter((f) => (meal === "Sonstiges" ? !MEALS.includes(f.meal) : f.meal === meal));
    if (!items.length) continue;
    h += `<div class="section-h">${esc(meal)}</div><div class="fcard">` + items.map((f) => {
      const p = portionOf(date, f.id), le = S.foodlog.find((l) => l.date === date && l.foodId === f.id), alt = le && le.alt;
      const nut = (k, pr) => [k ? `${fmt(k)} kcal` : "", pr ? `${fmt(pr)} g Protein` : ""].filter(Boolean).join(" · ");
      const title = alt ? alt.name : f.name;
      const sub = alt ? `statt ${f.name} · ${nut(alt.kcal, alt.protein)}` : nut(f.kcal, f.protein);
      const act = S.ui.foodEdit ? `data-a="foodEdit" data-id="${f.id}"` : `data-a="foodOpen" data-id="${f.id}"`;
      return `<div class="frow">${S.ui.foodEdit ? `<button class="minus" data-a="foodDel" data-id="${f.id}" aria-label="${esc(f.name)} entfernen"></button>` :
        `<button class="fcheck ${p === 1 ? "full" : p === 0.5 ? "half" : ""}" data-a="foodToggle" data-id="${f.id}" aria-pressed="${p > 0}" aria-label="${esc(title)} ${p === 1 ? "als nicht gegessen markieren" : "als gegessen markieren"}">${p === 1 ? ICON.check : ""}</button>`}
        <div class="grow" ${act} role="button" tabindex="0" style="cursor:pointer"><div class="t">${esc(title)}${alt ? ' <span class="pill acc" style="margin-left:4px">anderes</span>' : ""}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}</div>
        ${S.ui.foodEdit ? ICON.chev : `<button class="half-btn ${p === 0.5 ? "on" : ""}" data-a="foodHalf" data-id="${f.id}" aria-label="${esc(title)} zur Hälfte gegessen">½</button>`}</div>`;
    }).join("") + `</div>`;
  }
  h += `<div class="addrow" style="margin-top:20px"><button class="btn secondary small" data-a="foodAdd">+ Hinzufügen</button><button class="btn secondary small" data-a="foodPaste">Liste einfügen</button></div>
    <button class="btn plain" data-a="foodEditToggle">${S.ui.foodEdit ? "Fertig" : "Liste bearbeiten"}</button>`;
  return h;
}

function foodForm(f) {
  const meal = (f && f.meal) || S.ui.lastMeal;
  showSheet({
    title: f ? "Bearbeiten" : "Mahlzeit hinzufügen",
    html: `<div class="form"><input id="fName" placeholder="Was, z. B. Haferflocken mit Skyr" value="${esc(f ? f.name : "")}" autocomplete="off" aria-label="Name">
      <select id="fMeal" aria-label="Mahlzeit">${MEALS.map((m) => `<option ${m === meal ? "selected" : ""}>${m}</option>`).join("")}</select>
      <div class="field"><input id="fKcal" inputmode="numeric" placeholder="kcal (optional)" value="${f && f.kcal ? f.kcal : ""}" aria-label="Kalorien"><input id="fProt" inputmode="decimal" placeholder="Protein g (optional)" value="${f && f.protein ? fmt(f.protein) : ""}" aria-label="Protein in Gramm"></div></div>`,
    actions: [
      { label: "Speichern", style: "primary", form: true, onClick: () => saveFood(f) },
      ...(f ? [{ label: "Löschen", style: "destructive", onClick: () => delFood(f) }] : [{ label: "Speichern & nächste", form: true, onClick: () => { if (saveFood(f, true) === false) return false; foodForm(null); return false; } }]),
      { label: "Abbrechen" },
    ],
  });
}
function saveFood(f, silent) {
  const name = document.getElementById("fName").value.trim();
  if (!name) { toast("Bitte einen Namen eintragen"); return false; }
  const meal = document.getElementById("fMeal").value;
  const kcal = parseNum(document.getElementById("fKcal").value), protein = parseNum(document.getElementById("fProt").value);
  S.ui.lastMeal = meal;
  if (f) Object.assign(f, { name, meal, kcal, protein });
  else { f = { id: uid(), name, meal, kcal, protein, position: S.foods.length, createdAt: Date.now() }; S.foods.push(f); }
  DB.put("foods", f);
  if (!silent) toast("Gespeichert");
  render({ keepScroll: true });
}
function delFood(f) {
  S.foods = S.foods.filter((x) => x !== f); DB.softDelete("foods", f); render({ keepScroll: true });
}
function foodPasteForm() {
  showSheet({
    title: "Liste einfügen", message: "Eine Mahlzeit pro Zeile. Optional: Name; kcal; Protein.",
    html: `<div class="form"><textarea id="fList" placeholder="Haferflocken mit Skyr; 450; 32\nHähnchen mit Reis; 650; 50\nProteinshake; 150; 30" aria-label="Liste"></textarea>
      <select id="fMeal" aria-label="Mahlzeit für alle Zeilen">${MEALS.map((m) => `<option ${m === S.ui.lastMeal ? "selected" : ""}>${m}</option>`).join("")}</select></div>`,
    actions: [{ label: "Hinzufügen", style: "primary", form: true, onClick: () => {
      const meal = document.getElementById("fMeal").value;
      const lines = document.getElementById("fList").value.split("\n").map((x) => x.replace(/^[\s\-•*\d.)]+/, "").trim()).filter(Boolean);
      if (!lines.length) { toast("Bitte mindestens eine Zeile eintragen"); return false; }
      S.ui.lastMeal = meal;
      for (const line of lines) {
        const [name, kcal, prot] = line.split(";").map((x) => x.trim());
        const f = { id: uid(), name, meal, kcal: parseNum(kcal), protein: parseNum(prot), position: S.foods.length, createdAt: Date.now() };
        S.foods.push(f); DB.put("foods", f);
      }
      toast(`${lines.length} hinzugefügt`); render({ keepScroll: true });
    } }, { label: "Abbrechen" }],
  });
}
const altLine = (i) => `${i.name} | ${i.kcal != null ? fmt(i.kcal) : 0} kcal | ${i.protein != null ? fmt(i.protein) : 0} g Protein`;
function altPreviewHtml(text) {
  const r = parseMealText(text);
  if (!text.trim()) return "Füge hier den Text ein, den du von mir bekommen hast.";
  if (!r) return "Noch nichts erkannt. Jede Zeile braucht kcal und Protein, z. B. Steak (80 g) | 190 kcal | 22 g Protein";
  return `Erkannt: <b style="color:var(--ink)">${esc(r.name)}</b> · ${fmt(r.kcal)} kcal · ${fmt(r.protein)} g Protein`;
}
function mealSheet(f) {
  const date = S.ui.foodDate || dateStr();
  const e = S.foodlog.find((l) => l.date === date && l.foodId === f.id), alt = e && e.alt, p = portionOf(date, f.id);
  const plan = [f.kcal ? `${fmt(f.kcal)} kcal` : "", f.protein ? `${fmt(f.protein)} g Protein` : ""].filter(Boolean).join(" · ");
  const text = alt ? (alt.text || (alt.items || []).map(altLine).join("\n")) : "";
  showSheet({
    title: f.name, message: plan ? `Geplant: ${plan}` : "",
    html: `<div class="form"><div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink2)">Oder etwas anderes gegessen?</div>
      <textarea id="altText" aria-label="Text mit Nährwerten einfügen" placeholder="Text aus dem Chat einfügen, z. B.&#10;Steak (80 g) | 190 kcal | 22 g Protein&#10;Curly Fries (150 g) | 240 kcal | 3 g Protein">${esc(text)}</textarea>
      <div class="tags" style="margin:0">${TEMPLATES.map((t, i) => `<button class="gbtn glass" style="height:36px;font-size:13px" data-a="altTpl" data-i="${i}">${esc(t.name)}</button>`).join("")}</div>
      <div id="altPreview" class="imgnote" style="margin:0">${altPreviewHtml(text)}</div></div>`,
    actions: [
      { label: "Statt der Mahlzeit übernehmen", style: "primary", form: true, onClick: () => {
        const txt = document.getElementById("altText").value, r = parseMealText(txt);
        if (!r) { toast("Nichts erkannt. Jede Zeile braucht kcal und Protein."); return false; }
        setAlt(date, f.id, { name: r.name, kcal: r.kcal, protein: r.protein, items: r.items, text: txt });
        toast("Übernommen");
      } },
      { label: p === 1 ? "Als nicht gegessen markieren" : "Als gegessen markieren", onClick: () => setPortion(date, f.id, p === 1 ? 0 : 1) },
      ...(alt ? [{ label: "Zurück zur geplanten Mahlzeit", style: "destructive", onClick: () => setAlt(date, f.id, null) }] : []),
      { label: "Schließen" },
    ],
  });
}
function setAlt(date, foodId, alt) {
  let e = S.foodlog.find((l) => l.date === date && l.foodId === foodId);
  if (!e) { e = { id: `${date}_${foodId}`, date, foodId, portion: 0, createdAt: Date.now() }; S.foodlog.push(e); }
  if (alt) { e.alt = alt; if (e.portion === 0) e.portion = 1; } else delete e.alt;
  DB.put("foodlog", e); render({ keepScroll: true });
}
function setPortion(date, foodId, portion) {
  let e = S.foodlog.find((l) => l.date === date && l.foodId === foodId);
  if (!e) { e = { id: `${date}_${foodId}`, date, foodId, portion: 0, createdAt: Date.now() }; S.foodlog.push(e); }
  e.portion = portion; DB.put("foodlog", e); render({ keepScroll: true });
}

/* =====================================================================
   Screens: Verlauf
   ===================================================================== */
function exerciseIndex() {
  const map = new Map();
  for (const s of doneSessions(S.sessions)) {
    for (const ex of s.exercises) {
      const st = exStats(ex);
      if (!st) continue;
      const e = map.get(ex.key) || { key: ex.key, name: ex.name, n: 0, last: null };
      e.n++; e.name = ex.name; e.last = { date: s.date, st };
      map.set(ex.key, e);
    }
  }
  return [...map.values()].sort((a, b) => (a.last.date < b.last.date ? 1 : a.last.date > b.last.date ? -1 : a.name.localeCompare(b.name)));
}
function exListHtml() {
  const q = S.ui.search.trim().toLowerCase();
  const items = exerciseIndex().filter((e) => !q || e.name.toLowerCase().includes(q));
  if (!items.length) return empty(q ? "Nichts gefunden" : "Noch keine Daten", q ? "Probiere einen anderen Suchbegriff." : "Schließe ein Training ab, dann erscheint hier der Verlauf pro Übung.");
  return `<div class="list">` + items.map((e) =>
    `<a class="row" href="#/history/ex/${e.key}"><div class="thumb" style="width:48px;height:48px;border-radius:14px">${thumbOf(e.name, e.key)}</div><div class="grow"><div class="t">${esc(e.name)}</div><div class="s last">${esc(fmtShort(e.last.date))} · ${e.last.st.sets.map(setText).join(" · ")}</div></div><div class="trail">${e.n}×${ICON.chev}</div></a>`).join("") + `</div>`;
}
function viewHistory() {
  let h = `<h1 class="large">Verlauf</h1><div style="height:8px"></div>` + seg([{ v: "ex", l: "Übungen" }, { v: "sessions", l: "Trainings" }], S.ui.seg, "histSeg");
  if (S.ui.seg === "ex") {
    h += `<input class="search" id="search" type="search" placeholder="Übung suchen" value="${esc(S.ui.search)}" aria-label="Übung suchen"><div id="exlist">${exListHtml()}</div>`;
  } else {
    const list = doneSessions(S.sessions).reverse();
    if (!list.length) h += empty("Noch keine Trainings", "Abgeschlossene Trainings erscheinen hier.");
    else h += `<div class="list">` + list.map((s) => {
      const t = sessionTotals(s);
      return `<a class="row" href="#/history/session/${s.id}"><div class="grow"><div class="t">${esc(s.dayName)}</div><div class="s">${esc(fmtDate(s.date, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }))} · ${t.sets} Sätze${t.volume ? " · " + fmt(Math.round(t.volume)) + " kg" : ""}</div></div><div class="trail">${s.shoulder != null && s.shoulder >= 3 ? `<span class="pill orange">Schulter ${s.shoulder}</span>` : ""}${ICON.chev}</div></a>`;
    }).join("") + `</div>`;
  }
  return h;
}

function viewExHistory(key) {
  const hist = historyFor(key, S.sessions);
  if (!hist.length) return navbar({ back: "#/history", backLabel: "Verlauf", title: "Übung" }) + `<h1 class="large">Keine Daten</h1>` + empty("Noch keine Einträge", "Für diese Übung gibt es noch keine abgeschlossenen Trainings.");
  const name = hist[hist.length - 1].ex.name;
  const hasKg = hist.some((x) => x.st.maxKg > 0);
  let metric = S.ui.metric;
  if (!hasKg && metric !== "reps") metric = "reps";
  const opts = (hasKg ? [{ v: "weight", l: "Gewicht" }] : []).concat([{ v: "reps", l: "Wdh." }, ...(hasKg ? [{ v: "volume", l: "Volumen" }] : [])]);
  const val = { weight: (x) => x.st.maxKg, reps: (x) => x.st.totalReps, volume: (x) => x.st.volume }[metric];
  const unit = { weight: "kg", reps: "Wdh.", volume: "kg" }[metric];
  const pts = hist.slice(-30).map((x) => ({ label: fmtShort(x.date), y: val(x) }));
  const hint = hintFor(hist, repMaxFor(key));

  let h = navbar({ back: "#/history", backLabel: "Verlauf", title: name }) + `<h1 class="large">${esc(name)}</h1><p class="subtitle">${hist.length} ${hist.length === 1 ? "Training" : "Trainings"}</p>`;
  if (hint) h += `<div class="callout ${hint.type === "increase" ? "green" : "orange"}">${hint.type === "increase" ? ICON.up : ICON.warn}<div><b>${esc(hint.short)}</b>${esc(hint.text)}</div></div>`;
  h += `<div style="margin-top:14px">${seg(opts, metric, "metric")}</div><div class="card" style="padding:14px 10px 8px">${lineChart(pts, { unit })}</div>`;
  h += `<div class="section-h">Alle Trainings</div><div class="list">` + [...hist].reverse().map((x) => {
    const warm = x.ex.sets.filter((s) => s.type === "warm" && s.done && s.reps > 0);
    return `<a class="row" href="#/history/session/${x.session.id}"><div class="grow"><div class="t">${esc(fmtDate(x.date, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }))}</div>
      <div class="s last">${x.st.sets.map(setText).join(" · ")}</div>${warm.length ? `<div class="s last" style="opacity:.8">Aufwärmen: ${warm.map(setText).join(" · ")}</div>` : ""}</div><div class="trail">${esc(x.session.dayName)}${ICON.chev}</div></a>`;
  }).join("") + `</div>`;
  return h;
}

function viewSession(id) {
  const s = S.sessions.find((x) => x.id === id && x.status === "done");
  if (!s) return navbar({ back: "#/history", backLabel: "Verlauf", title: "Training" }) + notFound();
  const t = sessionTotals(s);
  let h = navbar({ back: "#/history", backLabel: "Verlauf", title: s.dayName }) +
    `<h1 class="large">${esc(s.dayName)}</h1><p class="subtitle">${esc(fmtDate(s.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</p>
     <div class="card"><div class="stats" style="margin-top:0"><div class="stat"><div class="v">${t.sets}</div><div class="l">Sätze</div></div><div class="stat"><div class="v">${fmt(Math.round(t.volume))}</div><div class="l">Volumen (kg)</div></div><div class="stat"><div class="v">${s.shoulder ?? "–"}</div><div class="l">Schulter</div></div></div></div>`;
  if (s.shoulder != null && s.shoulder >= 3) h += `<div class="callout orange">${ICON.warn}<div><b>Schulter ${s.shoulder}/10</b>Ab 3/10 Übung weglassen, Alternative nehmen.</div></div>`;
  h += `<div class="section-h">Übungen</div><div class="list">` + s.exercises.map((e) => {
    if (e.kind === "check") return `<div class="row"><div class="grow"><div class="t">${esc(e.name)}</div></div><div class="trail"><span class="pill green">Erledigt</span></div></div>`;
    const warm = e.sets.filter((x) => x.type === "warm"), work = e.sets.filter((x) => x.type === "work");
    const f = (x) => (x.reps > 0 ? setText(x) : "✓");
    return `<a class="row" href="#/history/ex/${e.key}"><div class="grow"><div class="t">${esc(e.name)}</div>${warm.length ? `<div class="s last" style="opacity:.8">Aufwärmen: ${warm.map(f).join(" · ")}</div>` : ""}<div class="s last">${work.map(f).join(" · ")}</div></div><div class="trail">${ICON.chev}</div></a>`;
  }).join("") + `</div><button class="btn destructive" data-a="deleteSession" data-id="${s.id}">Training löschen</button>`;
  return h;
}

/* =====================================================================
   Screen: Körpergewicht
   ===================================================================== */
function viewBody() {
  const entries = [...S.body].sort((a, b) => (a.date < b.date ? 1 : -1));
  const weeks = bodyWeekly(entries);
  const today = dateStr();
  const todayEntry = entries.find((e) => e.date === today);
  const w0 = weeks[0];
  let h = `<h1 class="large">Körpergewicht</h1><p class="subtitle">Ein Eintrag pro Tag, Wochendurchschnitt automatisch.</p>`;
  h += `<div class="card"><h3>Eintragen</h3><div class="field" style="margin-top:10px"><input type="date" id="bodyDate" value="${today}" max="${today}" aria-label="Datum"><input class="kg" id="bodyKg" inputmode="decimal" autocomplete="off" placeholder="kg" value="${todayEntry ? fmt(todayEntry.kg) : ""}" aria-label="Körpergewicht in kg"></div>
    <button class="btn acc" data-a="saveBody" style="--acc:var(--ink)">Speichern</button></div>`;
  if (w0) {
    const d = w0.delta;
    h += `<div class="card"><div style="color:var(--ink2);font-size:15px">${w0.week === weekStart(today) ? "Ø diese Woche" : "Ø Woche ab " + esc(fmtShort(w0.week))} · ${esc(weekRange(w0.week))}</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px;flex-wrap:wrap"><div class="big">${fmt1(w0.avg)} <span style="font-size:20px">kg</span></div>
      ${d != null ? `<div class="delta flat">${d > 0 ? "▲" : d < 0 ? "▼" : "●"} ${fmt1(Math.abs(d))} kg zur Vorwoche</div>` : ""}</div>
      <div style="color:var(--ink2);font-size:14px">${w0.n} ${w0.n === 1 ? "Eintrag" : "Einträge"} in dieser Woche</div></div>`;
    const asc = [...entries].reverse().slice(-30).map((e) => ({ label: fmtShort(e.date), y: e.kg }));
    if (asc.length > 1) h += `<div class="card" style="padding:14px 10px 8px"><h3 style="padding:0 8px">Verlauf</h3>${lineChart(asc, { unit: "kg" })}</div>`;
    h += `<div class="section-h">Wochendurchschnitt</div><div class="list">` + weeks.slice(0, 12).map((w) =>
      `<div class="row"><div class="grow"><div class="t">${esc(weekRange(w.week))}</div><div class="s">${esc(weekOfMonth(w.week))} · ${w.n} ${w.n === 1 ? "Eintrag" : "Einträge"}</div></div>
      <div class="trail"><div style="text-align:right"><div style="color:var(--ink);font-weight:650;font-size:17px">${fmt1(w.avg)} kg</div>${w.delta != null ? `<div class="s">${w.delta > 0 ? "▲" : w.delta < 0 ? "▼" : "●"} ${fmt1(Math.abs(w.delta))}</div>` : ""}</div></div></div>`).join("") + `</div>`;
    h += `<div class="section-h">Einträge</div><div class="list">` + entries.slice(0, 14).map((e) =>
      `<button class="row" data-a="bodyRow" data-id="${e.id}"><div class="grow"><div class="t">${esc(fmtDate(e.date, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }))}</div></div><div class="trail" style="color:var(--ink);font-weight:650">${fmt(e.kg)} kg</div></button>`).join("") + `</div><div class="section-f">Eintrag antippen zum Löschen.</div>`;
  } else {
    h += empty("Noch kein Eintrag", "Trage oben dein Gewicht ein, am besten morgens nach dem Aufstehen.");
  }
  return h;
}

/* =====================================================================
   Screen: Analyse
   ===================================================================== */
function viewAnalysis() {
  const done = doneSessions(S.sessions);
  const thisW = weekStart(dateStr()), prevW = addDays(thisW, -7);
  let h = `<h1 class="large">Analyse</h1><p class="subtitle">Bin ich von Woche zu Woche stärker geworden?</p>`;

  const fw = foodWeek(foodSorted(), S.foodlog, thisW), fp = foodWeek(foodSorted(), S.foodlog, prevW);
  const foodCard = () => {
    if (!S.foods.length || (!fw.tracked && !fp.tracked)) return "";
    const cur = fw.tracked ? fw : fp, label = fw.tracked ? "Diese Woche" : "Vorwoche", base = fw.tracked ? fp : null;
    const dd = base && base.avg != null ? (cur.avg - base.avg) * 100 : null;
    const wk = fw.tracked ? thisW : prevW;
    const bars = cur.days.map((d, i) => ({ label: WD[(i + 1) % 7], value: d.tracked && d.ratio != null ? d.ratio * 100 : 0, top: d.tracked && d.ratio != null ? Math.round(d.ratio * 100) + "" : "" }));
    return `<div class="card"><h3>Ernährung · ${label}</h3><div style="color:var(--ink2);font-size:14px">${esc(weekRange(wk))} · an ${cur.tracked} ${cur.tracked === 1 ? "Tag" : "Tagen"} eingetragen</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px;flex-wrap:wrap"><div class="big">${Math.round(cur.avg * 100)} %</div>${dd != null ? `<div class="delta ${dd > 1 ? "up" : dd < -1 ? "down" : "flat"}">${dd > 0 ? "+" : dd < 0 ? "−" : "±"}${fmt1(Math.abs(dd))} Prozentpunkte zur Vorwoche</div>` : ""}</div>
      <div style="color:var(--ink2);font-size:14px;margin-bottom:4px">des Essensplans pro Tag gegessen${cur.protein ? ` · Ø ${fmt(Math.round(cur.protein))} g Protein` : ""}${cur.kcal ? ` · Ø ${fmt(Math.round(cur.kcal))} kcal` : ""}</div>${barChart(bars, { height: 150 })}</div>`;
  };

  if (!done.length) return h + (foodCard() || empty("Noch keine Daten", "Sobald du Trainings abgeschlossen hast, siehst du hier deine Entwicklung pro Woche.")) + (foodCard() ? empty("Training", "Sobald du Trainings abschließt, siehst du hier deine Entwicklung.") : "");

  const weeks = weeklyOverview(S.sessions);
  const cur = weeks.find((w) => w.week === thisW) || { trainings: 0, sets: 0, volume: 0 };
  const prev = weeks.find((w) => w.week === prevW);
  const dv = prev && prev.volume > 0 && cur.trainings > 0 ? pct(cur.volume, prev.volume) : null;
  h += `<div class="card"><h3>Diese Woche · ${esc(weekRange(thisW))}</h3><div class="stats">
    <div class="stat"><div class="v">${cur.trainings}</div><div class="l">Trainings</div></div>
    <div class="stat"><div class="v">${cur.sets}</div><div class="l">Sätze</div></div>
    <div class="stat"><div class="v">${fmt(Math.round(cur.volume))}</div><div class="l">Volumen (kg)</div></div></div>
    <div style="font-size:14px;color:var(--ink2);margin-top:12px">${prev ? `Vorwoche: ${prev.trainings} ${prev.trainings === 1 ? "Training" : "Trainings"} · ${prev.sets} Sätze · ${fmt(Math.round(prev.volume))} kg${dv != null ? ` · <span class="delta ${dv > 0.5 ? "up" : dv < -0.5 ? "down" : "flat"}">${fmtPct(dv)}</span>` : ""}` : "Noch keine Daten aus der Vorwoche."}</div></div>`;
  h += foodCard();

  const bars = [];
  for (let k = 7; k >= 0; k--) {
    const w = addDays(thisW, -7 * k), r = weeks.find((x) => x.week === w);
    if (w < weeks[0].week && !bars.length) continue;
    bars.push({ label: fmtDM(w), value: r ? r.volume : 0, top: r ? fmt1(r.volume / 1000) + " t" : "" });
  }
  h += `<div class="card" style="padding:16px 10px 8px"><h3 style="padding:0 8px">Wochenvolumen</h3><div style="font-size:13px;color:var(--ink2);padding:0 8px 4px">Gewicht × Wiederholungen aller Arbeitssätze, Wochenbeginn am Montag</div>${barChart(bars)}</div>`;

  const ex = exerciseWeekly(S.sessions).filter((e) => e.pts.length);
  const refWeek = ex.reduce((m, e) => (e.pts[e.pts.length - 1].week > m ? e.pts[e.pts.length - 1].week : m), "");
  let up = 0, same = 0, down = 0;
  const rows = ex.map((e) => {
    const l = e.pts[e.pts.length - 1], p = e.pts.length > 1 ? e.pts[e.pts.length - 2] : null;
    const ch = p ? pct(l.score, p.score) : null;
    const tot = e.pts.length > 2 ? pct(l.score, e.pts[0].score) : null;
    if (l.week === refWeek && ch != null) { if (ch > 0.5) up++; else if (ch < -0.5) down++; else same++; }
    return { e, l, p, ch, tot };
  }).sort((a, b) => (a.l.week < b.l.week ? 1 : a.l.week > b.l.week ? -1 : a.e.name.localeCompare(b.e.name)));

  if (up + same + down > 0)
    h += `<div class="card"><h3>Wochenvergleich</h3><div style="font-size:14px;color:var(--ink2)">Beste Leistung je Übung in der Woche ab ${esc(fmtShort(refWeek))} gegenüber der vorherigen Woche mit Daten</div>
      <div class="stats"><div class="stat"><div class="v delta up" style="font-size:22px">${up}</div><div class="l">gesteigert</div></div><div class="stat"><div class="v" style="color:var(--ink2)">${same}</div><div class="l">gleich</div></div><div class="stat"><div class="v delta down" style="font-size:22px">${down}</div><div class="l">niedriger</div></div></div></div>`;

  h += `<div class="section-h">Stärker geworden?</div><div class="list">` + rows.map(({ e, l, p, ch, tot }) => {
    const cls = ch == null ? "flat" : ch > 0.5 ? "up" : ch < -0.5 ? "down" : "flat";
    return `<a class="row" href="#/history/ex/${e.key}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s last">Beste Serie ${esc(setText(l.top))}${tot != null ? ` · seit Start ${esc(fmtPct(tot))}` : ""}</div></div>
      <div class="trail">${ch != null ? `<div style="text-align:right"><div class="delta ${cls}">${fmtPct(ch)}</div><div class="s">vs. ${esc(fmtDM(p.week))}</div></div>${sparkline(e.pts.slice(-8).map((x) => x.score))}` : `<span class="pill gray">Erster Wert</span>`}${ICON.chev}</div></a>`;
  }).join("") + `</div><div class="section-f">Verglichen wird die beste Serie je Woche (geschätztes Maximalgewicht, bei Übungen ohne Gewicht die Wiederholungen).</div>`;

  const hints = [];
  for (const e of ex) { const hint = hintFor(historyFor(e.key, S.sessions), repMaxFor(e.key)); if (hint) hints.push({ e, hint }); }
  if (hints.length) h += `<div class="section-h">Hinweise</div><div class="list">` + hints.map(({ e, hint }) =>
    `<a class="row" href="#/history/ex/${e.key}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(hint.text)}</div></div><div class="trail"><span class="pill ${hint.type === "increase" ? "green" : "orange"}">${esc(hint.type === "increase" ? "Gewicht erhöhen" : "Stagnation")}</span>${ICON.chev}</div></a>`).join("") + `</div>`;
  return h;
}

/* =====================================================================
   Screens: Einstellungen & Regeln
   ===================================================================== */
function viewSettings() {
  const nSess = S.sessions.filter((s) => s.status === "done").length;
  return navbar({ back: "#/", backLabel: "Plan", title: "Einstellungen" }) + `<h1 class="large">Einstellungen</h1>
    <div class="section-h">Darstellung</div>${seg([{ v: "light", l: "Hell" }, { v: "auto", l: "Automatisch" }, { v: "dark", l: "Dunkel" }], S.settings.theme, "theme")}
    <div class="section-h">Daten &amp; Backup</div><div class="list">
      <button class="row" data-a="export"><div class="grow"><div class="t">Daten exportieren</div><div class="s">Backup als JSON-Datei sichern</div></div></button>
      <label class="row" for="importFile" style="cursor:pointer"><div class="grow"><div class="t">Daten importieren</div><div class="s">Backup (JSON) wiederherstellen</div></div></label>
      <button class="row" data-a="cacheImages"><div class="grow"><div class="t">Übungsbilder offline speichern</div><div class="s">Einmal im WLAN laden, dann auch ohne Netz im Gym sichtbar (ca. 3 MB)</div></div></button>
      <button class="row" data-a="reloadApp"><div class="grow"><div class="t">Auf Update prüfen</div><div class="s">Lädt die neueste Version (Internet nötig)</div></div></button>
      <button class="row" data-a="wipe"><div class="grow"><div class="t" style="color:var(--warn)">Alle Trainingsdaten löschen</div></div></button></div>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
    <div class="section-f">Alle Daten liegen nur auf diesem Gerät (IndexedDB): ${nSess} Trainings, ${S.body.length} Gewichtseinträge, ${S.foods.length} Mahlzeiten, ${Object.keys(S.photos).length} Fotos. ${DB.persistent ? "" : "Achtung: Speicher nicht verfügbar, Daten gehen beim Schließen verloren. "}Mache regelmäßig einen Export als Backup, besonders wenn die App nicht auf dem Home-Bildschirm liegt.<br><br>Übungsbilder: free-exercise-db (gemeinfrei, Unlicense), geladen über cdn.jsdelivr.net. Dabei wird nur die Bild-Adresse abgerufen, keine Daten aus der App gesendet.<br><br>Version: ${esc(APP_VERSION)}</div>`;
}
function viewRules() {
  return navbar({ back: "#/", backLabel: "Plan", title: "Regeln" }) + `<h1 class="large">Regeln</h1>` +
    RULES.map((r) => `<div class="${r.warn ? "callout red" : "card"}" style="${r.warn ? "display:block;margin-top:12px" : ""}"><h3 style="${r.warn ? "margin:0 0 4px;color:var(--warn)" : ""}">${esc(r.h)}</h3><div style="font-size:15px;white-space:pre-line;color:var(--ink2)">${esc(r.p)}</div></div>`).join("");
}

/* =====================================================================
   Router / Rendering
   ===================================================================== */
const parseRoute = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);

function render({ keepScroll = false } = {}) {
  const [a, b, c, d] = parseRoute();
  const y = keepScroll ? window.scrollY : 0;
  let html, tab = "plan";
  if (!a) html = viewPlan();
  else if (a === "day" && b) html = c === "ex" ? viewExercise(b, Number(d)) : viewDay(b);
  else if (a === "food") { tab = "food"; html = viewFood(); }
  else if (a === "history") { tab = "history"; html = b === "ex" ? viewExHistory(c) : b === "session" ? viewSession(c) : viewHistory(); }
  else if (a === "body") { tab = "body"; html = viewBody(); }
  else if (a === "analysis") { tab = "analysis"; html = viewAnalysis(); }
  else if (a === "settings") html = viewSettings();
  else if (a === "rules") html = viewRules();
  else html = viewPlan();
  const dd = a === "day" && b ? dayById(b) : null;
  $app.dataset.kind = dd ? dd.kind : "";
  $app.innerHTML = html;
  $app.classList.toggle("has-timer", !!timer);
  $tab.className = "glass";
  $tab.innerHTML = `<div class="in">${TABS.map((t) => `<a href="${t.href}" class="${t.id === tab ? "on" : ""}" ${t.id === tab ? 'aria-current="page"' : ""}>${ICON.tabs[t.id]}<span>${t.label}</span></a>`).join("")}</div>`;
  window.scrollTo(0, y);
  onScroll();
  wakeLock(a === "day");
}
function onScroll() { const n = document.querySelector(".navbar"); if (n) n.classList.toggle("scrolled", window.scrollY > 36); }
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("hashchange", () => { S.ui.planEdit = false; S.ui.edit = false; S.ui.note = false; S.ui.foodEdit = false; render(); });

/* =====================================================================
   Pausen-Timer
   ===================================================================== */
let timer = null, tickId = null, actx = null;
function unlockAudio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {}
}
function beep() {
  try {
    if (actx) [0, 0.25].forEach((t) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + t;
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.22);
    });
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}
function startTimer(sec, label) {
  if (!sec) return;
  unlockAudio();
  timer = { end: Date.now() + sec * 1000, total: sec * 1000, label, finishedAt: null };
  $timer.innerHTML = `<div class="timer" id="tbox"><div class="trow"><div class="tl"><div class="tlabel" id="tlabel"></div><div class="ttime" id="ttime"></div></div>
    <button class="tb" data-a="timerAdd">+15 s</button><button class="tb" data-a="timerSkip" id="tskip">Überspringen</button></div><div class="tprog"><i id="tbar"></i></div></div>`;
  $timer.classList.add("show"); $app.classList.add("has-timer");
  if (!tickId) tickId = setInterval(tick, 250);
  tick();
}
function stopTimer() {
  timer = null; clearInterval(tickId); tickId = null;
  $timer.classList.remove("show"); $app.classList.remove("has-timer");
}
function tick() {
  if (!timer) return;
  const rem = timer.end - Date.now(), box = document.getElementById("tbox");
  if (!box) return;
  if (rem <= 0) {
    if (!timer.finishedAt) { timer.finishedAt = Date.now(); beep(); }
    box.classList.add("finished");
    document.getElementById("tlabel").textContent = "Pause vorbei · weiter geht's";
    document.getElementById("ttime").textContent = "0:00";
    document.getElementById("tskip").textContent = "OK";
    if (Date.now() - timer.finishedAt > 10000) stopTimer();
    return;
  }
  box.classList.remove("finished");
  document.getElementById("tlabel").textContent = "Pause · " + timer.label;
  document.getElementById("ttime").textContent = fmtDuration(Math.ceil(rem / 1000));
  document.getElementById("tbar").style.width = Math.min(100, (rem / timer.total) * 100) + "%";
  document.getElementById("tskip").textContent = "Überspringen";
}

/* =====================================================================
   Bildschirm wach halten
   ===================================================================== */
let wake = null;
async function wakeLock(on) {
  try {
    if (on && !wake && "wakeLock" in navigator && document.visibilityState === "visible") {
      wake = await navigator.wakeLock.request("screen");
      wake.addEventListener("release", () => { wake = null; });
    } else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { const [a] = parseRoute(); wakeLock(a === "day"); tick(); } });

/* =====================================================================
   Aktionen
   ===================================================================== */
function ctx() {
  const [a, b, c, d] = parseRoute();
  if (a !== "day" || !b) return null;
  const day = dayById(b), dr = draftOf(b);
  return { dayId: b, day, dr, i: c === "ex" ? Number(d) : null, sx: c === "ex" && dr ? dr.exercises[Number(d)] : null, px: c === "ex" && day ? day.exercises[Number(d)] : null };
}

// Plan geändert: speichern, als „eigene Änderung“ markieren (wird bei App-Updates nicht überschrieben), Entwurf angleichen
function applyPlanChange(day) {
  day.customized = true; DB.put("plan", day);
  const dr = draftOf(day.id);
  if (dr) { dr.exercises = day.exercises.map((ex) => dr.exercises.find((x) => x.exId === ex.id) || newSessionExercise(ex)); saveSession(dr); }
  render({ keepScroll: true });
}

const A = {
  histSeg(t) { S.ui.seg = t.dataset.v; render(); },
  metric(t) { S.ui.metric = t.dataset.v; render({ keepScroll: true }); },
  theme(t) { S.settings.theme = t.dataset.v; applyTheme(); DB.put("meta", S.settings); render({ keepScroll: true }); },
  planEdit() { S.ui.planEdit = !S.ui.planEdit; render({ keepScroll: true }); },
  exMove(t) {
    const c = ctx(); if (!c || !c.day) return;
    const i = Number(t.dataset.i), j = i + Number(t.dataset.d), a = c.day.exercises;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; applyPlanChange(c.day);
  },
  exRemove(t) {
    const c = ctx(); if (!c || !c.day) return;
    const ex = c.day.exercises[Number(t.dataset.i)]; if (!ex) return;
    showSheet({
      title: `„${ex.name}“ entfernen?`, message: `Die Übung verschwindet aus ${c.day.name}. Bisherige Daten bleiben im Verlauf.`,
      actions: [{ label: "Entfernen", style: "destructive", onClick: () => { c.day.exercises = c.day.exercises.filter((x) => x !== ex); applyPlanChange(c.day); } }, { label: "Abbrechen" }],
    });
  },
  exAdd() {
    const c = ctx(); if (!c || !c.day) return;
    const names = [...new Set([...S.plan.flatMap((d) => d.exercises.filter((e) => e.kind === "sets").map((e) => e.name)), ...S.plan.flatMap((d) => d.exercises.flatMap((e) => altsFor(e.key).map((a) => a.name)))])].sort((a, b) => a.localeCompare(b, "de"));
    showSheet({
      title: "Übung hinzufügen", message: "Name eintippen oder aus den Vorschlägen wählen.",
      html: `<div class="form"><input id="exName" list="exlib" placeholder="Name der Übung" autocomplete="off" aria-label="Name der Übung"><datalist id="exlib">${names.map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist>
        <div class="field"><input id="exSets" inputmode="numeric" placeholder="Sätze" value="3" aria-label="Arbeitssätze"><input id="exReps" placeholder="Wdh." value="8–12" aria-label="Wiederholungen"></div>
        <div class="field"><input id="exRest" inputmode="numeric" placeholder="Pause in Sekunden" value="90" aria-label="Pause in Sekunden"><select id="exWarm" aria-label="Aufwärmsätze"><option value="0">ohne Aufwärmsatz</option><option value="1">1 Aufwärmsatz</option></select></div></div>`,
      actions: [{ label: "Hinzufügen", style: "primary", form: true, onClick: () => {
        const name = document.getElementById("exName").value.trim();
        if (!name) { toast("Bitte einen Namen eintragen"); return false; }
        const sets = Math.max(1, Math.min(10, Math.round(parseNum(document.getElementById("exSets").value) || 3)));
        const reps = document.getElementById("exReps").value.trim() || "8–12";
        const rest = Math.max(0, Math.round(parseNum(document.getElementById("exRest").value) || 90));
        c.day.exercises.push({ id: `${c.day.id}-${uid().slice(0, 6)}`, key: slug(name), name, kind: "sets", warmupSets: Number(document.getElementById("exWarm").value), workSets: sets,
          reps, restLabel: rest ? `${rest} s` : "", restSec: rest, note: "", optional: false, failureLast: false });
        applyPlanChange(c.day); toast("Übung hinzugefügt");
      } }, { label: "Abbrechen" }],
    });
  },
  toggleEdit() { S.ui.edit = !S.ui.edit; render({ keepScroll: true }); },
  toggleNote() { S.ui.note = !S.ui.note; render({ keepScroll: true }); },

  toggleSet(t) {
    const c = ctx(); if (!c || !c.sx) return;
    const s = c.sx.sets.find((x) => x.id === t.dataset.id); if (!s) return;
    if (!s.done) {
      const row = t.closest(".setrow");
      const phKg = parseNum(row.dataset.phkg), phReps = parseNum(row.dataset.phreps);
      if (s.kg == null && phKg != null) s.kg = phKg;
      if (s.reps == null && phReps != null) s.reps = phReps;
      if (s.type === "work" && !(s.reps > 0)) {
        const inp = row.querySelector('[data-f="reps"]'); inp.classList.add("shake"); inp.focus();
        setTimeout(() => inp.classList.remove("shake"), 350); toast(c.sx.uni ? "Bitte Wiederholungen rechts eintragen" : "Bitte Wiederholungen eintragen"); return;
      }
      if (c.sx.uni) {
        const phL = parseNum(row.dataset.phrepsl);
        if (s.kgL == null) s.kgL = s.kg;
        if (s.repsL == null && phL != null) s.repsL = phL;
        if (s.type === "work" && !(s.repsL > 0)) {
          const inp = row.nextElementSibling && row.nextElementSibling.querySelector('[data-f="repsL"]');
          if (inp) { inp.classList.add("shake"); inp.focus(); setTimeout(() => inp.classList.remove("shake"), 350); }
          toast("Bitte Wiederholungen links eintragen"); return;
        }
      }
      s.done = true;
      const rest = c.px ? c.px.restSec : 0;
      startTimer(s.type === "warm" ? Math.min(rest, 60) : rest, c.sx.name);
    } else s.done = false;
    saveSession(c.dr); render({ keepScroll: true });
  },
  toggleUni() {
    const c = ctx(); if (!c || !c.sx) return;
    c.sx.uni = !c.sx.uni; saveSession(c.dr); render({ keepScroll: true });
  },
  toggleCheck(t) {
    const c = ctx(); if (!c || !c.dr) return;
    const sx = c.dr.exercises[Number(t.dataset.i)]; if (!sx) return;
    sx.checked = !sx.checked; saveSession(c.dr); render({ keepScroll: true });
  },
  addSet(t) {
    const c = ctx(); if (!c || !c.sx) return;
    const s = { id: uid(), type: t.dataset.type, kg: null, reps: null, done: false };
    if (s.type === "warm") { const n = c.sx.sets.filter((x) => x.type === "warm").length; c.sx.sets.splice(n, 0, s); } else c.sx.sets.push(s);
    saveSession(c.dr); render({ keepScroll: true });
  },
  delSet(t) {
    const c = ctx(); if (!c || !c.sx) return;
    c.sx.sets = c.sx.sets.filter((x) => x.id !== t.dataset.id);
    saveSession(c.dr); render({ keepScroll: true });
  },
  shoulder(t) {
    const c = ctx(); if (!c || !c.dr) return;
    const v = Number(t.dataset.v); c.dr.shoulder = c.dr.shoulder === v ? null : v;
    saveSession(c.dr); render({ keepScroll: true });
  },
  showAlts(t) {
    const c = ctx(); if (!c || !c.sx) return;
    const sx = c.sx, alts = altsFor(sx.origKey || sx.key);
    showSheet({
      title: "Alternativen", message: alts.length ? "Gerät fehlt oder ist besetzt? Heute stattdessen machen:" : "Für diese Übung ist keine Alternative hinterlegt.",
      html: alts.map((a) => `<button class="altitem" data-a="swapEx" data-i="${t.dataset.i}" data-name="${esc(a.name)}"><div class="thumb">${thumbOf(a.name, slug(a.name))}</div><div><div class="t">${esc(a.name)}</div><div class="s">${esc(a.how)}</div></div></button>`).join("") +
        (sx.origKey ? `<button class="altitem" data-a="unswap" data-i="${t.dataset.i}"><div class="thumb">${thumbOf(sx.origName, sx.origKey)}</div><div><div class="t">${esc(sx.origName)}</div><div class="s">Original-Übung</div></div></button>` : ""),
      actions: [{ label: "Schließen" }],
    });
  },
  swapEx(t) {
    const c = ctx(); if (!c || !c.dr) return;
    const sx = c.dr.exercises[Number(t.dataset.i)]; if (!sx) return;
    if (!sx.origKey) { sx.origKey = sx.key; sx.origName = sx.name; }
    sx.name = t.dataset.name; sx.key = slug(sx.name);
    closeSheet(); saveSession(c.dr); render({ keepScroll: true }); toast("Alternative gewählt");
  },
  unswap(t) {
    const c = ctx(); if (!c || !c.dr) return;
    const sx = c.dr.exercises[Number(t.dataset.i)]; if (!sx || !sx.origKey) return;
    sx.name = sx.origName; sx.key = sx.origKey; delete sx.origKey; delete sx.origName;
    closeSheet(); saveSession(c.dr); render({ keepScroll: true });
  },
  rmPhoto(t) {
    const rec = S.photoRec[t.dataset.key]; if (!rec) return;
    delete S.photos[t.dataset.key]; delete S.photoRec[t.dataset.key]; DB.softDelete("photos", rec); render({ keepScroll: true });
  },
  finish(t) {
    const dr = draftOf(t.dataset.day); if (!dr) return;
    const pr = dayProgress(dr);
    if (!pr.done) return toast("Noch keine Sätze abgehakt");
    showSheet({
      title: "Training abschließen?",
      message: `${pr.done} von ${pr.total} Sätzen erledigt.${pr.done < pr.total ? "\nNicht abgehakte Sätze werden nicht gespeichert." : ""}`,
      actions: [{ label: "Abschließen", style: "primary", onClick: () => doFinish(t.dataset.day) }, { label: "Weiter trainieren" }],
    });
  },
  resetDay(t) {
    showSheet({
      title: "Training zurücksetzen?", message: "Alle eingetragenen Werte dieses Trainingstages gehen verloren.",
      actions: [{ label: "Zurücksetzen", style: "destructive", onClick: async () => {
        const dr = draftOf(t.dataset.day);
        if (dr) { S.sessions = S.sessions.filter((s) => s !== dr); await DB.softDelete("sessions", dr); }
        stopTimer(); render();
      } }, { label: "Abbrechen" }],
    });
  },
  deleteSession(t) {
    showSheet({
      title: "Training löschen?", message: "Dieses Training verschwindet aus Verlauf und Analyse.",
      actions: [{ label: "Löschen", style: "destructive", onClick: async () => {
        const s = S.sessions.find((x) => x.id === t.dataset.id);
        if (s) { S.sessions = S.sessions.filter((x) => x !== s); await DB.softDelete("sessions", s); }
        location.hash = "#/history"; toast("Training gelöscht");
      } }, { label: "Abbrechen" }],
    });
  },
  saveBody() {
    const date = document.getElementById("bodyDate").value || dateStr();
    const kg = parseNum(document.getElementById("bodyKg").value);
    if (!kg || kg < 20 || kg > 400) return toast("Bitte ein gültiges Gewicht eintragen");
    let e = S.body.find((x) => x.date === date);
    if (e) e.kg = kg; else { e = { id: uid(), date, kg, createdAt: Date.now() }; S.body.push(e); }
    DB.put("bodyweight", e); toast("Gewicht gespeichert"); render({ keepScroll: true });
  },
  bodyRow(t) {
    const e = S.body.find((x) => x.id === t.dataset.id); if (!e) return;
    showSheet({
      title: `${fmt(e.kg)} kg`, message: fmtDate(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      actions: [{ label: "Eintrag löschen", style: "destructive", onClick: async () => { S.body = S.body.filter((x) => x !== e); await DB.softDelete("bodyweight", e); render({ keepScroll: true }); } }, { label: "Abbrechen" }],
    });
  },
  /* Essen */
  foodDay(t) {
    const today = dateStr(), cur = S.ui.foodDate || today, nd = addDays(cur, Number(t.dataset.d));
    if (nd > today) return;
    S.ui.foodDate = nd === today ? null : nd; render({ keepScroll: true });
  },
  foodToggle(t) { const date = S.ui.foodDate || dateStr(); setPortion(date, t.dataset.id, portionOf(date, t.dataset.id) === 1 ? 0 : 1); },
  foodHalf(t) { const date = S.ui.foodDate || dateStr(); setPortion(date, t.dataset.id, portionOf(date, t.dataset.id) === 0.5 ? 0 : 0.5); },
  altTpl(t) { const ta = document.getElementById("altText"); if (!ta) return; ta.value = TEMPLATES[Number(t.dataset.i)].text; document.getElementById("altPreview").innerHTML = altPreviewHtml(ta.value); },
  reloadApp() { toast("Suche nach Update …"); (navigator.serviceWorker ? navigator.serviceWorker.getRegistration() : Promise.resolve()).then((r) => r && r.update()).catch(() => {}).finally(() => setTimeout(() => location.reload(), 800)); },
  foodOpen(t) { const f = S.foods.find((x) => x.id === t.dataset.id); if (f) mealSheet(f); },
  foodAdd() { foodForm(null); },
  foodPaste() { foodPasteForm(); },
  foodEditToggle() { S.ui.foodEdit = !S.ui.foodEdit; render({ keepScroll: true }); },
  foodEdit(t) { const f = S.foods.find((x) => x.id === t.dataset.id); if (f) foodForm(f); },
  foodDel(t) {
    const f = S.foods.find((x) => x.id === t.dataset.id); if (!f) return;
    showSheet({ title: `„${f.name}“ entfernen?`, message: "Bereits abgehakte Tage bleiben in der Analyse erhalten.", actions: [{ label: "Entfernen", style: "destructive", onClick: () => delFood(f) }, { label: "Abbrechen" }] });
  },
  cacheImages() { prefetchImages(true); },
  timerAdd() {
    if (!timer) return;
    const now = Date.now();
    if (timer.finishedAt || timer.end < now) { timer.end = now + 15000; timer.total = 15000; timer.finishedAt = null; }
    else { timer.end += 15000; timer.total += 15000; }
    tick();
  },
  timerSkip() { stopTimer(); },
  sheetAct(t) {
    const a = sheetActions[Number(t.dataset.i)];
    if (a && a.form) { if (a.onClick() !== false) closeSheet(); return; }
    closeSheet(); if (a && a.onClick) a.onClick();
  },
  sheetClose() { closeSheet(); },
  export: exportData,
  wipe() {
    showSheet({
      title: "Alle Trainingsdaten löschen?", message: "Trainings, Körpergewicht und Essens-Häkchen werden von diesem Gerät entfernt. Mahlzeitenliste und Fotos bleiben. Das kann nicht rückgängig gemacht werden. Tipp: vorher exportieren.",
      actions: [{ label: "Alles löschen", style: "destructive", onClick: async () => {
        await DB.clearStore("sessions"); await DB.clearStore("bodyweight"); await DB.clearStore("foodlog");
        S.sessions = []; S.body = []; S.foodlog = []; stopTimer(); toast("Daten gelöscht"); render();
      } }, { label: "Abbrechen" }],
    });
  },
};

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-a]");
  if (t && A[t.dataset.a]) { e.preventDefault(); A[t.dataset.a](t, e); return; }
  const tabLink = e.target.closest("#tabbar a");
  if (tabLink && tabLink.classList.contains("on") && location.hash.replace(/^#\/?/, "") === tabLink.getAttribute("href").replace(/^#\/?/, "")) window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "altText") { document.getElementById("altPreview").innerHTML = altPreviewHtml(t.value); return; }
  if (t.id === "search") { S.ui.search = t.value; document.getElementById("exlist").innerHTML = exListHtml(); return; }
  if (!t.classList || !t.classList.contains("num")) return;
  const c = ctx(); if (!c || !c.sx) return;
  const s = c.sx.sets.find((x) => x.id === t.dataset.id); if (!s) return;
  const v = parseNum(t.value);
  s[t.dataset.f] = v == null ? null : /^reps/.test(t.dataset.f) ? Math.round(v) : v;
  saveSession(c.dr);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !e.target.classList || !e.target.classList.contains("num")) return;
  e.preventDefault();
  const f = e.target.dataset.f;
  const next = f === "kg" ? e.target.closest(".setrow").querySelector('[data-f="reps"]') : f === "kgL" ? e.target.closest(".setrow").querySelector('[data-f="repsL"]')
    : f === "reps" && e.target.closest(".setrow").nextElementSibling && e.target.closest(".setrow").nextElementSibling.classList.contains("sub") ? e.target.closest(".setrow").nextElementSibling.querySelector('[data-f="repsL"]') : null;
  if (next) next.focus(); else e.target.blur();
});
document.addEventListener("focusin", (e) => { if (e.target.classList && e.target.classList.contains("num")) e.target.select(); });
document.addEventListener("change", (e) => {
  if (e.target.id === "importFile") importData(e.target.files[0]);
  if (e.target.id === "photoIn") setPhoto(e.target.dataset.key, e.target.files[0]);
});

/* =====================================================================
   Übungsbilder offline vorladen (landen über den Service Worker im Cache)
   ===================================================================== */
async function prefetchImages(manual) {
  if (!navigator.onLine) { if (manual) toast("Gerade kein Netz"); return; }
  const urls = [...new Set(S.plan.flatMap((d) => d.exercises.flatMap((e) => imgUrls(e.key))))];
  if (manual) toast(`Lade ${urls.length} Bilder …`);
  let ok = 0, i = 0;
  const worker = async () => { while (i < urls.length) { const u = urls[i++]; try { await fetch(u, { mode: "no-cors" }); ok++; } catch (e) {} } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (ok >= urls.length * 0.9) { S.settings.imgCached = true; DB.put("meta", S.settings); }
  if (manual) toast(ok ? "Bilder offline gespeichert" : "Bilder konnten nicht geladen werden");
}
// Bild nicht ladbar → Skizze statt kaputtem Bild
document.addEventListener("error", (e) => {
  const t = e.target;
  if (!t || t.tagName !== "IMG") return;
  if (t.dataset.art) { const d = document.createElement("div"); d.innerHTML = art(t.dataset.art); t.replaceWith(d.firstChild); }
  else if ("hide" in t.dataset) t.remove();
}, true);

/* =====================================================================
   Eigene Fotos
   ===================================================================== */
async function setPhoto(key, file) {
  if (!file) return;
  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.82);
    const rec = S.photoRec[key] || { id: "photo-" + key, key, createdAt: Date.now() };
    rec.data = data; delete rec.deletedAt;
    S.photos[key] = data; S.photoRec[key] = rec; await DB.put("photos", rec);
    render({ keepScroll: true }); toast("Foto gespeichert");
  } catch (e) { toast("Foto konnte nicht geladen werden"); }
}

/* =====================================================================
   Training abschließen
   ===================================================================== */
async function doFinish(dayId) {
  const dr = draftOf(dayId); if (!dr) return;
  const before = S.sessions.filter((s) => s !== dr);
  finalizeSession(dr);
  await saveSession(dr);
  stopTimer();

  const t = sessionTotals(dr), mins = Math.round((dr.finishedAt - dr.startedAt) / 60000);
  const gains = [], next = [];
  for (const ex of dr.exercises) {
    const st = exStats(ex); if (!st) continue;
    const prev = historyFor(ex.key, before).pop();
    if (prev && improved(st, prev.st)) gains.push(`${ex.name}: ${prev.st.maxKg > 0 ? `${fmt(prev.st.maxKg)} → ${fmt(st.maxKg)} kg` : `${prev.st.totalReps} → ${st.totalReps} Wdh.`}`);
    const hint = hintFor(historyFor(ex.key, S.sessions), repMaxFor(ex.key));
    if (hint && hint.type === "increase") next.push(ex.name);
  }
  const row = (t1) => `<div class="row" style="min-height:46px"><div class="grow"><div class="t" style="font-size:16px">${esc(t1)}</div></div></div>`;
  let html = `<div class="stats" style="margin:12px 0 4px"><div class="stat"><div class="v">${t.sets}</div><div class="l">Sätze</div></div><div class="stat"><div class="v">${fmt(Math.round(t.volume))}</div><div class="l">Volumen (kg)</div></div><div class="stat"><div class="v">${mins > 0 && mins < 300 ? mins : "–"}</div><div class="l">Minuten</div></div></div>`;
  if (gains.length) html += `<div class="section-h" style="margin-left:4px">Gesteigert</div><div class="list">${gains.map(row).join("")}</div>`;
  if (next.length) html += `<div class="section-h" style="margin-left:4px">Nächstes Mal Gewicht erhöhen</div><div class="list">${next.map(row).join("")}</div>`;
  if (dr.shoulder != null && dr.shoulder >= 3) html += `<div class="callout orange">${ICON.warn}<div><b>Schulter ${dr.shoulder}/10</b>Ab 3/10: Übung weglassen, Alternative nehmen.</div></div>`;
  location.hash = "#/";
  showSheet({ title: `${dr.dayName} gespeichert`, message: fmtDate(dr.date, { weekday: "long", day: "numeric", month: "long" }), html, actions: [{ label: "Fertig", style: "primary" }] });
}

/* =====================================================================
   Export / Import
   ===================================================================== */
async function exportData() {
  const data = {
    app: "gym-tracker", schema: 2, exportedAt: new Date().toISOString(), settings: S.settings, plan: S.plan, sessions: S.sessions, bodyweight: S.body,
    foods: S.foods, foodlog: S.foodlog, photos: Object.values(S.photoRec),
  };
  const name = `gym-tracker-${dateStr()}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Backup exportiert");
}
async function importData(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "gym-tracker" || !Array.isArray(data.sessions) || !Array.isArray(data.bodyweight)) throw new Error("format");
    const n = data.sessions.filter((s) => s.status === "done").length;
    showSheet({
      title: "Backup importieren?", message: `${n} Trainings und ${data.bodyweight.length} Gewichtseinträge. Alle aktuellen Daten auf diesem Gerät werden ersetzt.`,
      actions: [{ label: "Importieren", style: "primary", onClick: async () => {
        const settings = data.settings && data.settings.key === "settings" ? data.settings : S.settings;
        await DB.replaceAll({ plan: data.plan && data.plan.length ? data.plan : S.plan, sessions: data.sessions, bodyweight: data.bodyweight, foods: data.foods || [], foodlog: data.foodlog || [], photos: data.photos || [], meta: [settings] });
        await loadState(); toast("Backup importiert"); render();
      } }, { label: "Abbrechen" }],
    });
  } catch (e) { toast("Diese Datei ist kein gültiges Backup"); }
  document.getElementById("importFile") && (document.getElementById("importFile").value = "");
}

/* =====================================================================
   Start
   ===================================================================== */
function applyTheme() {
  const t = S.settings.theme || "light";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("gt-theme", t); } catch (e) {}
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#0a0a0c" : "#fbfbfd");
}

async function loadState() {
  const [plan, sessions, body, meta, foods, foodlog, photos] = await Promise.all(["plan", "sessions", "bodyweight", "meta", "foods", "foodlog", "photos"].map(DB.getAll));
  S.settings = meta.find((m) => m.key === "settings") || { key: "settings", theme: "light", planVersion: 0, createdAt: Date.now() };
  S.plan = plan.filter((p) => !p.deletedAt).sort((a, b) => a.position - b.position);
  if (!S.plan.length || (S.settings.planVersion || 0) < PLAN_VERSION) {
    const fresh = buildDefaultPlan();
    for (const old of plan) if (!old.deletedAt && !fresh.some((f) => f.id === old.id)) await DB.softDelete("plan", old);
    // Tage, die Till selbst geändert hat, bleiben unberührt; alle anderen bekommen die neue Standardversion
    S.plan = fresh.map((f) => plan.find((o) => o.id === f.id && o.customized && !o.deletedAt) || f);
    for (const d of S.plan) await DB.put("plan", d);
    S.settings.planVersion = PLAN_VERSION;
    await DB.put("meta", S.settings);
  }
  S.sessions = sessions.filter((s) => !s.deletedAt && S.plan.concat([{ id: "start" }]).some((d) => d.id === s.dayId));
  S.body = body.filter((b) => !b.deletedAt);
  S.foods = foods.filter((f) => !f.deletedAt);
  S.foodlog = foodlog.filter((f) => !f.deletedAt);
  // Beim ersten Start Tills Mahlzeiten eintragen (nur einmal; danach frei änderbar, auch löschbar)
  if (!S.settings.foodsSeed) {
    if (!S.foods.length) {
      const t0 = Date.now() - 30 * 864e5;
      for (const [meal, name, kcal, protein] of DEFAULT_FOODS) {
        const f = { id: uid(), name, meal, kcal, protein, position: S.foods.length, createdAt: t0 };
        S.foods.push(f); await DB.put("foods", f);
      }
    }
    S.settings.foodsSeed = 1; await DB.put("meta", S.settings);
  }
  S.photos = {}; S.photoRec = {};
  for (const p of photos) if (!p.deletedAt) { S.photos[p.key] = p.data; S.photoRec[p.key] = p; }
  const { save, drop } = splitStaleDrafts(S.sessions);
  for (const s of save) { finalizeSession(s); s.date = dateStr(new Date(s.startedAt)); s.finishedAt = s.updatedAt; await DB.put("sessions", s); }
  for (const s of drop) { S.sessions = S.sessions.filter((x) => x !== s); await DB.softDelete("sessions", s); }
  applyTheme();
}

(async function init() {
  await loadState();
  render();
  DB.persistRequest();
  setTimeout(() => { if (!S.settings.imgCached) prefetchImages(false); }, 4000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
  window.__gt = { S, render, art };
})();
