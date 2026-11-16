// Reine Logik ohne DOM: Datum, Formatierung, Sessions, Progression, Stagnation, Wochenauswertung.

/* ---------- Datum ---------- */
export const pad = (n) => String(n).padStart(2, "0");
export const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
export function weekStart(s) { const d = parseDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateStr(d); }
export function isoWeek(s) {
  const d = parseDate(s); d.setHours(12);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4); w1.setHours(12);
  return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

/* ---------- Zahlen ---------- */
const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
export const fmt = (n) => (n == null || Number.isNaN(n) ? "–" : nf.format(n));
export const fmt1 = (n) => (n == null || Number.isNaN(n) ? "–" : nf1.format(n));
export const fmtDate = (s, o) => parseDate(s).toLocaleDateString("de-DE", o || { day: "2-digit", month: "2-digit", year: "numeric" });
export const fmtShort = (s) => parseDate(s).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
export function parseNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export function pct(a, b) { return b ? ((a / b) - 1) * 100 : null; }
export function fmtPct(p) {
  if (p == null) return "–";
  const r = Math.round(p * 10) / 10;
  return (r > 0 ? "+" : r < 0 ? "−" : "±") + nf1.format(Math.abs(r)) + " %";
}
export function repRange(str) {
  const n = (String(str).match(/\d+/g) || []).map(Number);
  return n.length ? { min: Math.min(...n), max: Math.max(...n) } : { min: null, max: null };
}
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${pad(s)}`;
}
export function setText(s) {
  if (s.kg > 0) return `${fmt(s.kg)} × ${s.reps}`;
  return `${s.reps} Wdh.`;
}

/* ---------- Sessions ---------- */
const mkSet = (type) => ({ id: uid(), type, kg: null, reps: null, done: false });

export function newSession(day) {
  const now = Date.now();
  return {
    id: uid(), dayId: day.id, dayName: day.name, date: dateStr(), status: "draft",
    startedAt: now, finishedAt: null, shoulder: null,
    exercises: day.exercises.map((ex) => ({
      exId: ex.id, key: ex.key, name: ex.name, kind: ex.kind, checked: false,
      sets: ex.kind === "check" ? [] : [
        ...Array.from({ length: ex.warmupSets }, () => mkSet("warm")),
        ...Array.from({ length: ex.workSets }, () => mkSet("work")),
      ],
    })),
    createdAt: now, updatedAt: now,
  };
}

export const workDone = (ex) => ex.sets.filter((s) => s.type === "work" && s.done && s.reps > 0);

export function exStats(ex) {
  const w = workDone(ex);
  if (!w.length) return null;
  const maxKg = Math.max(...w.map((s) => s.kg || 0));
  const totalReps = sum(w.map((s) => s.reps));
  const volume = sum(w.map((s) => (s.kg || 0) * s.reps));
  const e1rm = Math.max(...w.map((s) => (s.kg || 0) * (1 + s.reps / 30)));
  return { sets: w, maxKg, totalReps, volume, e1rm, score: maxKg > 0 ? e1rm : totalReps, unit: maxKg > 0 ? "kg" : "Wdh." };
}

const cmpSession = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || 0) - (b.finishedAt || 0));
export const doneSessions = (sessions) => sessions.filter((s) => s.status === "done").sort(cmpSession);

// Alle abgeschlossenen Trainings einer Übung (aufsteigend). Identität der Übung = key (Slug des Namens),
// dadurch zählt z. B. "Brustpresse Maschine" in Einstieg und Push B als dieselbe Übung.
export function historyFor(key, sessions) {
  const out = [];
  for (const s of doneSessions(sessions)) {
    for (const ex of s.exercises) {
      if (ex.key !== key) continue;
      const st = exStats(ex);
      if (st) out.push({ session: s, ex, st, date: s.date });
    }
  }
  return out;
}

export function lastTime(key, sessions, excludeId) {
  const h = historyFor(key, sessions).filter((x) => x.session.id !== excludeId);
  return h.length ? h[h.length - 1] : null;
}

export const improved = (a, b) => a.maxKg > b.maxKg || (a.maxKg === b.maxKg && a.totalReps > b.totalReps);

// Doppelte Progression + Stagnation. hist = historyFor(...), repMax = oberes Ende des Wdh.-Bereichs.
export function hintFor(hist, repMax, draftEx) {
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const w = last.st.sets;
  if (repMax && w.length >= 2 && w.every((s) => s.reps >= repMax)) {
    // schon erledigt, wenn im aktuellen Training bereits mehr Gewicht eingetragen wurde
    const already = draftEx && draftEx.sets.some((s) => s.type === "work" && s.kg > last.st.maxKg);
    if (!already) {
      return last.st.maxKg > 0
        ? { type: "increase", short: "Gewicht erhöhen", text: `Letztes Mal alle Sätze bei ${repMax} Wdh. oder mehr. Heute Gewicht erhöhen (zuletzt ${fmt(last.st.maxKg)} kg).` }
        : { type: "increase", short: "Gewicht erhöhen", text: `Letztes Mal alle Sätze bei ${repMax} Wdh. oder mehr. Heute schwerer machen.` };
    }
    return null;
  }
  if (hist.length >= 4) {
    const l = hist.slice(-4);
    let any = false;
    for (let i = 1; i < 4; i++) if (improved(l[i].st, l[i - 1].st)) any = true;
    if (!any) return { type: "stagnation", short: "Stagnation seit 3 Trainings", text: "Seit 3 Trainings keine Steigerung (weder Gewicht noch Wdh.). Pause, Technik und Schlaf prüfen, ggf. Gewicht leicht senken." };
  }
  return null;
}

// Nicht abgeschlossene Entwürfe: >12 h alt → mit erledigten Sätzen automatisch speichern, sonst verwerfen.
export function splitStaleDrafts(sessions, now = Date.now()) {
  const save = [], drop = [];
  for (const s of sessions) {
    if (s.status !== "draft" || now - (s.updatedAt || s.startedAt) < 12 * 3600e3) continue;
    const any = s.exercises.some((e) => e.checked || e.sets.some((x) => x.done));
    (any ? save : drop).push(s);
  }
  return { save, drop };
}

export function finalizeSession(s) {
  s.exercises = s.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
    .filter((e) => e.checked || e.sets.length);
  s.status = "done";
  s.finishedAt = Date.now();
  s.date = dateStr();
  return s;
}

export function dayProgress(draft) {
  let total = 0, done = 0;
  for (const e of draft.exercises) {
    if (e.kind === "check") { total++; if (e.checked) done++; continue; }
    for (const s of e.sets) if (s.type === "work") { total++; if (s.done) done++; }
  }
  return { total, done, ratio: total ? done / total : 0 };
}

export function exerciseState(sx) {
  if (sx.kind === "check") return sx.checked ? "done" : "todo";
  const work = sx.sets.filter((s) => s.type === "work");
  const doneWork = work.filter((s) => s.done).length;
  if (work.length && doneWork === work.length) return "done";
  if (sx.sets.some((s) => s.done)) return "active";
  return "todo";
}

/* ---------- Auswertung ---------- */
export function sessionTotals(s) {
  let sets = 0, volume = 0;
  for (const e of s.exercises) for (const x of e.sets) if (x.type === "work" && x.done && x.reps > 0) { sets++; volume += (x.kg || 0) * x.reps; }
  return { sets, volume };
}

export function weeklyOverview(sessions) {
  const map = new Map();
  for (const s of doneSessions(sessions)) {
    const w = weekStart(s.date);
    const t = sessionTotals(s);
    const r = map.get(w) || { week: w, trainings: 0, sets: 0, volume: 0 };
    r.trainings++; r.sets += t.sets; r.volume += t.volume;
    map.set(w, r);
  }
  return [...map.values()].sort((a, b) => (a.week < b.week ? -1 : 1));
}

// Pro Übung die beste Leistung je Woche (Score = geschätztes 1RM, bei Körpergewichtsübungen Wdh.).
export function exerciseWeekly(sessions) {
  const map = new Map();
  for (const s of doneSessions(sessions)) {
    const w = weekStart(s.date);
    for (const ex of s.exercises) {
      const st = exStats(ex);
      if (!st) continue;
      const e = map.get(ex.key) || { key: ex.key, name: ex.name, pts: [] };
      e.name = ex.name;
      let p = e.pts.find((x) => x.week === w);
      if (!p) { p = { week: w, score: 0 }; e.pts.push(p); }
      if (st.score >= p.score) {
        const top = st.sets.reduce((a, b) => ((b.kg || 0) > (a.kg || 0) || ((b.kg || 0) === (a.kg || 0) && b.reps > a.reps) ? b : a));
        Object.assign(p, { score: st.score, unit: st.unit, top });
      }
      map.set(ex.key, e);
    }
  }
  for (const e of map.values()) e.pts.sort((a, b) => (a.week < b.week ? -1 : 1));
  return [...map.values()];
}

export function bodyWeekly(entries) {
  const map = new Map();
  for (const e of entries) {
    const w = weekStart(e.date);
    const r = map.get(w) || { week: w, kgs: [] };
    r.kgs.push(e.kg); map.set(w, r);
  }
  const rows = [...map.values()].sort((a, b) => (a.week < b.week ? 1 : -1)).map((r) => ({ week: r.week, n: r.kgs.length, avg: sum(r.kgs) / r.kgs.length }));
  rows.forEach((r, i) => { r.delta = rows[i + 1] ? r.avg - rows[i + 1].avg : null; });
  return rows;
}

/* ---------- Wochen-Beschriftung ohne Kalenderwoche ---------- */
export const fmtDM = (s) => parseDate(s).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
export function weekRange(w) {
  const a = parseDate(w), b = parseDate(addDays(w, 6));
  const m = (d) => d.toLocaleDateString("de-DE", { month: "short" });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}.–${b.getDate()}. ${m(b)}` : `${a.getDate()}. ${m(a)} – ${b.getDate()}. ${m(b)}`;
}
export function weekOfMonth(w) {
  const d = parseDate(w);
  return `${Math.ceil(d.getDate() / 7)}. Woche im ${d.toLocaleDateString("de-DE", { month: "long" })}`;
}

/* ---------- Ernährung ---------- */
// Bewertung eines Tages: Anteil der geplanten Lebensmittel, die gegessen wurden (Portion 0 / ½ / 1).
export function foodDay(foods, log, date) {
  const entries = log.filter((l) => l.date === date);
  const list = foods.filter((f) => dateStr(new Date(f.createdAt || 0)) <= date);
  const ent = (f) => entries.find((l) => l.foodId === f.id);
  const por = (f) => { const e = ent(f); return e ? e.portion : 0; };
  // Hat Till statt der geplanten Mahlzeit etwas anderes gegessen (alt), zählen dessen Nährwerte.
  const val = (f, k) => { const e = ent(f); return ((e && e.alt && e.alt[k] != null ? e.alt[k] : f[k]) || 0); };
  const eaten = sum(list.map(por));
  return {
    date, n: list.length, eaten, tracked: entries.length > 0,
    ratio: list.length ? eaten / list.length : null,
    kcal: sum(list.map((f) => val(f, "kcal") * por(f))), protein: sum(list.map((f) => val(f, "protein") * por(f))),
    planKcal: sum(list.map((f) => f.kcal || 0)), planProtein: sum(list.map((f) => f.protein || 0)),
  };
}
export function foodWeek(foods, log, w) {
  const days = Array.from({ length: 7 }, (_, i) => foodDay(foods, log, addDays(w, i)));
  const tr = days.filter((d) => d.tracked && d.ratio != null);
  return { days, tracked: tr.length, avg: tr.length ? sum(tr.map((d) => d.ratio)) / tr.length : null, protein: tr.length ? sum(tr.map((d) => d.protein)) / tr.length : null, kcal: tr.length ? sum(tr.map((d) => d.kcal)) / tr.length : null };
}

/* ---------- Text aus dem Chat → Nährwerte ---------- */
// Erwartetes Format, eine Zeile pro Bestandteil:  Steak (80 g) | 190 kcal | 22 g Protein
// Auch erkannt: "Name; 190; 22", "Protein 22 g", "Eiweiß". Eine Zeile "Summe | … kcal | … g Protein" ersetzt die Addition.
export function parseMealText(text) {
  const n = (x) => { const v = parseFloat(String(x).replace(",", ".")); return Number.isFinite(v) ? v : null; };
  const lines = String(text || "").split(/\n+/).map((l) => l.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean);
  const items = []; let total = null;
  for (const line of lines) {
    const parts = line.split(/\s*[|;]\s*/);
    const name = parts[0].replace(/[:：]\s*$/, "").trim();
    const rest = parts.length > 1 ? parts.slice(1).join(" | ") : line;
    let kcal = null, protein = null, m;
    if ((m = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:kcal|kalorien)/i))) kcal = n(m[1]);
    if ((m = rest.match(/(\d+(?:[.,]\d+)?)\s*g?\s*(?:protein|eiweiß|eiweiss)/i) || rest.match(/(?:protein|eiweiß|eiweiss)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i))) protein = n(m[1]);
    if (kcal == null && protein == null && parts.length >= 3) { kcal = n(parts[1]); protein = n(parts[2]); }
    if (kcal == null && protein == null) continue;
    if (/^(summe|gesamt|total)/i.test(name)) total = { kcal, protein };
    else items.push({ name, kcal, protein });
  }
  if (!items.length && !total) return null;
  const t = total || { kcal: sum(items.map((i) => i.kcal || 0)), protein: sum(items.map((i) => i.protein || 0)) };
  return { name: items.map((i) => i.name).join(" + ") || "Andere Mahlzeit", kcal: Math.round(t.kcal || 0), protein: Math.round((t.protein || 0) * 10) / 10, items };
}
