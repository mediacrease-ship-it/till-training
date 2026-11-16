// Fest hinterlegter Trainingsplan (aus "Tills Trainingsplan.html" übernommen).
// Wird beim ersten Start in IndexedDB geschrieben und ist dort später editierbar.
// Wenn du hier etwas änderst: PLAN_VERSION erhöhen, dann wird der Plan neu eingespielt.
export const PLAN_VERSION = 4;

// Standard laut Till: 1 Aufwärmsatz + 3 Arbeitssätze pro Übung.
const DEFAULT_WARM = 1;
const DEFAULT_WORK = 3;

const WARMUP_PULL = "Armkreisen 10 · Band Pull-Aparts 15 · Außenrotation am Kabel 15/Seite · Wandrutschen 10";
const WARMUP_PUSH = "Armkreisen 10 · Band Pull-Aparts 15 · Außenrotation am Kabel 15/Seite · 1 Satz Seitheben halbes Gewicht";

// [Name, Aufwärmsätze (Original), Arbeitssätze (Original), Wdh., Pause, Hinweis, optional, letzter Satz Versagen]
const RAW = {
  "pull-a": {
    name: "Pull A", short: "Mo", label: "Montag", weekday: 1, kind: "pull",
    focus: "Rücken · Bizeps", std: false,
    note: "Ca. 1 Stunde. 3 Rückenübungen, 4 Bizepsübungen (kurzer Kopf, langer Kopf, Brachialis, Abschluss). Aufwärmsatz nur bei den ersten Übungen je Muskel (mit + Aufwärmsatz jederzeit ergänzbar).",
    ex: [
      ["Schulter-Warm-up", 0, 1, "5 Min", "", WARMUP_PULL],
      ["Latzug, schulterbreit", 1, 3, "8–12", "2–3 Min", "Breite. Nicht ganz breit greifen, Ellbogen nach unten zu den Hüften. 1–2 Wdh. im Tank. Schulter ab 3/10: Griff neutral oder Alternative."],
      ["Rudern Maschine, Brust aufgelegt", 1, 3, "8–12", "2 Min", "Rücken-Dicke. Schulter schonen: Ellbogen nah am Körper, Schulterblätter nur leicht zusammen, Gewicht eher niedrig. Ab 3/10 Schulterschmerz: Alternative nehmen. 1–2 Wdh. im Tank."],
      ["Einarmiger Latzug am Kabel", 0, 3, "10–12 /Seite", "90 s", "Links nach Gefühl dosieren. 1 Wdh. im Tank."],
      ["Bizepscurl Maschine / Scott", 1, 3, "8–12", "90 s", "Kurzer Kopf (Dicke). Arm fixiert, kein Schwung.", 0, 1],
      ["Schrägbank-Curls Kurzhantel", 0, 3, "10–12", "90 s", "Langer Kopf (Höhe/Peak). Bank ca. 45–60°, Arme hängen hinter dem Körper, volle Dehnung unten.", 0, 1],
      ["Hammercurls Kurzhantel", 0, 3, "10–12", "90 s", "Brachialis: macht den Arm dicker. Daumen nach oben, 1 Wdh. im Tank."],
      ["Bizepscurl am Kabel", 0, 3, "10–12", "60 s", "Zum Schluss, konstante Spannung.", 0, 1],
      ["Beinbeuger sitzend", 0, 3, "12–15", "60 s", "Leicht, ruhig atmen. Bei Druckgefühl abbrechen.", 1],
    ],
  },
  "push-a": {
    name: "Push A", short: "Di", label: "Dienstag", weekday: 2, kind: "push",
    focus: "Schulter · obere Brust · Trizeps", std: true,
    ex: [
      ["Schulter-Warm-up", 0, 1, "5 Min", "", WARMUP_PUSH],
      ["Seitheben am Kabel", 1, 3, "12–15", "60–90 s", "Wichtigste Übung für breite Schultern. Nur bis Schulterhöhe. Alternative: Seitheben-Maschine.", 0, 1],
      ["Schrägbankdrücken Maschine", 2, 3, "8–12", "2–3 Min", "Obere Brust, ca. 30°. 1–2 Wdh. im Tank. Alternative: Kurzhantel, neutraler Griff."],
      ["Kabel-Flys von unten nach oben", 0, 2, "12–15", "90 s", "Obere Brust isoliert.", 0, 1],
      ["Trizepsdrücken Kabel, Seil", 1, 3, "10–12", "90 s", "Trizeps = 2/3 vom Oberarm.", 0, 1],
      ["Trizeps über Kopf am Kabel", 0, 2, "10–12", "90 s", "Langer Kopf. Bei Schulterschmerz: einarmiges Trizepsdrücken."],
      ["Dead Bug (Bauch)", 0, 2, "10/Seite", "60 s", "Rücken am Boden, ohne Pressen."],
      ["Beinstrecker", 0, 2, "12–15", "60 s", "Leicht, ruhig atmen.", 1],
    ],
  },
  "pull-b": {
    name: "Pull B", short: "Do", label: "Donnerstag", weekday: 4, kind: "pull",
    focus: "Bizeps · Rücken dick · Unterarm", std: true,
    ex: [
      ["Schulter-Warm-up", 0, 1, "5 Min", "", WARMUP_PULL],
      ["Bizepscurl am Kabel, stehend", 2, 3, "8–12", "90 s", "Bizeps zuerst. Konstante Spannung.", 0, 1],
      ["Hammercurls am Kabel, Seil", 0, 2, "10–12", "90 s", "Dicker Arm + Unterarm.", 0, 1],
      ["Kabelrudern sitzend, eng", 1, 3, "8–12", "2–3 Min", "Oberkörper ruhig. 1–2 Wdh. im Tank."],
      ["Einarmiger Latzug am Kabel", 1, 3, "10–12 /Seite", "90 s", "Links nach Gefühl dosieren. 1 Wdh. im Tank."],
      ["Face Pulls", 0, 2, "12–15", "60–90 s", "Hintere Schulter, hält die Schulter gesund."],
      ["Reverse Curls SZ-Stange", 0, 2, "12–15", "60 s", "Unterarm-Oberseite, leicht.", 0, 1],
      ["Beinbeuger sitzend", 0, 2, "12–15", "60 s", "Leicht, ruhig atmen.", 1],
    ],
  },
  "push-b": {
    name: "Push B", short: "Fr", label: "Freitag", weekday: 5, kind: "push",
    focus: "Schulter extra · Brust · Trizeps", std: true,
    ex: [
      ["Schulter-Warm-up", 0, 1, "5 Min", "", WARMUP_PUSH],
      ["Seitheben Maschine / KH sitzend", 1, 3, "12–15", "60–90 s", "Zweiter Schultertag.", 0, 1],
      ["Brustpresse Maschine", 2, 3, "8–12", "2–3 Min", "Ellbogen ca. 45°. 1–2 Wdh. im Tank."],
      ["Butterfly Maschine", 0, 2, "12–15", "90 s", "Nicht zu weit nach hinten dehnen.", 0, 1],
      ["Einarmiges Seitheben Kabel", 0, 2, "15–20 /Seite", "60 s", "Extra für die Breite.", 0, 1],
      ["Trizepsdrücken Stange", 1, 3, "8–12", "90 s", "", 0, 1],
      ["Trizeps-Kickbacks Kabel", 0, 2, "12–15", "60 s", "", 0, 1],
      ["Crunch Maschine, leicht", 0, 2, "12–15", "60 s", "Ausatmen beim Hochkommen. Bei Druckgefühl: Dead Bug."],
    ],
  },
};

export const ORDER = ["pull-a", "push-a", "pull-b", "push-b"];

export const RULES = [
  { h: "Gewicht steigern", p: "Alle Arbeitssätze schaffen das obere Ende (z. B. 12) sauber → nächstes Mal +1 Stufe, zurück auf ca. 8. Sonst jede Woche 1 Wdh. mehr versuchen." },
  { h: "Wie nah ans Limit", p: "Große Übungen (Latzug, Rudern, Drücken): 1–2 Wdh. im Tank. Orange markierte Übungen: letzter Satz bis Versagen, sauber." },
  { h: "Letzter Satz", p: "Der letzte Arbeitssatz jeder Übung geht immer bis zum sauberen Versagen." },
  { h: "Wochenplan", p: "Mo Pull A · Di Push A · Mi Pause · Do Pull B · Fr Push B · Sa/So frei. Fällt Freitag aus: Push B am Mittwoch." },
  { h: "Aufwärmen", p: "A-Sätze = Aufwärmen: ca. 50 % × 10, dann 75 % × 5. Zählen nicht als Arbeitssätze." },
  { h: "Erste 2 Wochen", p: "Woche 1: nur 2 Arbeitssätze, 3 Wdh. im Tank. Woche 2: alle Sätze, 2 im Tank. Ab Woche 3: Versagen wie markiert." },
  { h: "Stopp", warn: true, p: "Linke Schulter ab 3/10 Schmerz oder stechend → Übung weg, Alternative nehmen. Kein Drücken über Kopf bis Arzt/Physio.\nDruckgefühl oder Schmerz unten → Übung sofort weg. Keine Kniebeugen, Beinpresse, Kreuzheben." },
];

export function slug(name) {
  return name.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// "2–3 Min" → 120, "60–90 s" → 60, "90 s" → 90 (untere Grenze; im Timer per +15 s verlängerbar)
export function parseRest(str) {
  const m = String(str || "").match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(Min|s)/i);
  if (!m) return 0;
  return Number(m[1]) * (/min/i.test(m[2]) ? 60 : 1);
}

export function buildDefaultPlan() {
  const now = Date.now();
  return ORDER.map((id) => {
    const D = RAW[id];
    return {
      id, name: D.name, short: D.short, label: D.label, weekday: D.weekday, kind: D.kind,
      focus: D.focus, note: D.note || "", position: ORDER.indexOf(id),
      exercises: D.ex.map((e, i) => {
        const check = /min/i.test(e[3]);
        return {
          id: `${id}-${i}`, key: slug(e[0]), name: e[0],
          kind: check ? "check" : "sets",
          warmupSets: check ? 0 : (D.std ? DEFAULT_WARM : e[1]),
          workSets: check ? 0 : (D.std ? DEFAULT_WORK : e[2]),
          reps: e[3], restLabel: e[4] || "", restSec: parseRest(e[4]),
          note: e[5] || "", optional: !!e[6], failureLast: !!e[7],
        };
      }),
      createdAt: now, updatedAt: now,
    };
  });
}
