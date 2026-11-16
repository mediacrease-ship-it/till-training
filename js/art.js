// Einheitliche Strichzeichnungen je Bewegungstyp (Maschine/Kabel + Körper). Farben kommen aus CSS:
// .b = Körper (Tinte), .m = bewegter Teil (Akzent), .e = Gerät (hell), .fm = Akzent-Füllung.
// Eigene Fotos (Kamera-Button auf der Übungsseite) ersetzen die Zeichnung.

const l = (x1, y1, x2, y2, c = "b", w) => `<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${w ? ` stroke-width="${w}"` : ""}/>`;
const pl = (pts, c = "b") => `<polyline class="${c}" points="${pts}"/>`;
const head = (x, y) => `<circle class="b hd" cx="${x}" cy="${y}" r="10"/>`;
const dot = (x, y, r = 6) => `<circle class="fm" cx="${x}" cy="${y}" r="${r}"/>`;
const hd = (x2, y2, a) => { const h = 7, f = (t) => `${(x2 + Math.cos(a + t) * h).toFixed(1)} ${(y2 + Math.sin(a + t) * h).toFixed(1)}`; return `M${f(2.6)}L${x2} ${y2}L${f(-2.6)}`; };
const arr = (x1, y1, x2, y2) => `<path class="m thin" d="M${x1} ${y1}L${x2} ${y2}${hd(x2, y2, Math.atan2(y2 - y1, x2 - x1))}"/>`;
const carr = (x1, y1, cx, cy, x2, y2) => `<path class="m thin" d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}${hd(x2, y2, Math.atan2(y2 - cy, x2 - cx))}"/>`;
const floor = l(16, 130, 184, 130, "e", 3);
const legsFront = (x, y) => l(x, y, x - 14, 128) + l(x, y, x + 14, 128);

const G = {
  curl: () => floor + l(34, 100, 98, 100, "e") + l(66, 100, 66, 128, "e") + l(96, 70, 120, 98, "e", 8) +
    head(62, 30) + l(62, 44, 62, 92) + l(62, 92, 110, 92) + l(110, 92, 110, 126) +
    l(64, 52, 96, 78) + l(96, 78, 124, 50, "m") + dot(124, 50) + carr(134, 82, 150, 66, 138, 48),
  pulldown: () => l(100, 4, 100, 18, "e") + l(46, 20, 154, 20, "m", 7) + l(70, 110, 130, 110, "e") +
    head(100, 46) + l(100, 60, 100, 106) + legsFront(100, 106) +
    pl("92 66 74 46 62 22", "m") + pl("108 66 126 46 138 22", "m") + arr(32, 38, 32, 70) + arr(168, 38, 168, 70),
  row: () => floor + l(30, 104, 92, 104, "e") + l(62, 104, 62, 128, "e") + l(84, 68, 186, 68, "e", 3) + l(186, 48, 186, 100, "e", 5) +
    head(58, 32) + l(58, 46, 58, 96) + l(58, 96, 112, 96) + l(112, 96, 112, 126) +
    pl("58 54 50 72 86 68", "m") + dot(86, 68) + arr(160, 52, 120, 52),
  press: () => floor + l(38, 38, 38, 100, "e", 8) + l(38, 102, 90, 102, "e") + l(64, 102, 64, 128, "e") + head(52, 28) + l(52, 42, 52, 96) + l(52, 96, 102, 96) + l(102, 96, 102, 126) +
    l(52, 54, 112, 54, "m") + l(112, 40, 112, 68, "m", 8) + arr(126, 54, 170, 54),
  fly: () => l(70, 110, 130, 110, "e") + head(100, 34) + l(100, 48, 100, 106) + legsFront(100, 106) +
    l(100, 58, 54, 58, "m") + l(100, 58, 146, 58, "m") + dot(46, 58, 9) + dot(154, 58, 9) + arr(22, 84, 46, 84) + arr(178, 84, 154, 84),
  lateral: () => floor + head(100, 30) + l(100, 44, 100, 92) + legsFront(100, 92) +
    l(94, 52, 54, 62, "m") + l(106, 52, 146, 62, "m") + dot(48, 62, 8) + dot(152, 62, 8) + arr(30, 98, 30, 66) + arr(170, 98, 170, 66),
  pushdown: () => floor + dot(124, 12, 5) + l(124, 14, 114, 84, "e", 3) + head(70, 28) + l(70, 42, 70, 94) + l(70, 94, 62, 126) + l(70, 94, 80, 126) +
    l(70, 52, 76, 78) + l(76, 78, 114, 86, "m") + dot(114, 86) + arr(140, 54, 140, 94),
  legext: () => floor + l(30, 98, 90, 98, "e") + l(62, 98, 62, 128, "e") + l(32, 44, 32, 98, "e", 7) + head(50, 28) + l(50, 42, 50, 92) + l(50, 92, 100, 92) +
    l(100, 92, 100, 124, "e") + l(100, 92, 148, 90, "m") + dot(148, 90, 8) + carr(112, 126, 156, 128, 160, 100),
  legcurl: () => floor + l(30, 98, 90, 98, "e") + l(62, 98, 62, 128, "e") + l(32, 44, 32, 98, "e", 7) + head(50, 28) + l(50, 42, 50, 92) + l(50, 92, 100, 92) +
    l(100, 92, 148, 92, "e") + l(100, 92, 86, 124, "m") + dot(86, 124, 8) + carr(148, 100, 150, 130, 108, 130),
  core: () => floor + head(62, 90) + l(72, 100, 104, 122, "m") + l(104, 122, 138, 92) + l(138, 92, 160, 122) + l(76, 98, 104, 92) + carr(40, 122, 28, 100, 44, 82),
  wrist: () => l(24, 98, 132, 98, "b", 10) + l(24, 112, 24, 128, "e") + l(34, 82, 118, 82) + l(118, 82, 138, 66, "m") + dot(144, 60, 8) + carr(156, 88, 168, 72, 158, 54),
  rear: () => floor + head(100, 32) + l(100, 46, 100, 94) + legsFront(100, 94) +
    pl("98 58 66 58 64 30", "m") + pl("102 58 134 58 136 30", "m") + arr(86, 80, 44, 80) + arr(114, 80, 156, 80),
  pullover: () => floor + head(66, 40) + l(66, 54, 66, 100) + legsFront(66, 100) +
    l(68, 62, 116, 26, "m") + dot(118, 24) + l(68, 62, 120, 88, "e") + carr(128, 30, 164, 58, 132, 88),
  warmup: () => floor + head(100, 32) + l(100, 46, 100, 94) + legsFront(100, 94) + l(100, 58, 48, 58, "m") + l(100, 58, 152, 58, "m") +
    `<circle class="m thin" cx="38" cy="58" r="12" stroke-dasharray="4 5"/><circle class="m thin" cx="162" cy="58" r="12" stroke-dasharray="4 5"/>`,
  generic: () => l(50, 70, 150, 70, "b", 8) + l(50, 48, 50, 92, "m", 10) + l(150, 48, 150, 92, "m", 10) + l(34, 58, 34, 82, "e", 8) + l(166, 58, 166, 82, "e", 8),
};

// Bewegungstyp aus dem Übungsnamen ableiten
export function typeFor(name) {
  const n = String(name).toLowerCase();
  if (/warm-up/.test(n)) return "warmup";
  if (/handgelenk/.test(n)) return "wrist";
  if (/curl/.test(n)) return "curl";
  if (/face pull|reverse butterfly|reverse fly|pull-apart/.test(n)) return "rear";
  if (/überzüge|ueberzuege|überzug/.test(n)) return "pullover";
  if (/latzug|klimmzug/.test(n)) return "pulldown";
  if (/rudern/.test(n)) return "row";
  if (/trizeps|dips/.test(n)) return "pushdown";
  if (/beinstrecker/.test(n)) return "legext";
  if (/beinbeuger/.test(n)) return "legcurl";
  if (/dead bug|crunch|plank|bird dog/.test(n)) return "core";
  if (/seitheben/.test(n)) return "lateral";
  if (/fly|butterfly/.test(n)) return "fly";
  if (/brustpresse|schräg|drücken|liegestütz/.test(n)) return "press";
  return "generic";
}

export function art(name) {
  const t = typeFor(name);
  return `<svg class="art" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Skizze: ${String(name).replace(/"/g, "")}">${(G[t] || G.generic)()}</svg>`;
}
export const ART_TYPES = Object.keys(G);
