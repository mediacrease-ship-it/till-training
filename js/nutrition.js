// Eingebaute Nährwert-Datenbank für „Oder etwas anderes gegessen?“. Läuft komplett offline.
// Werte je 100 g (bzw. 100 ml), gerundete Richtwerte aus gängigen Nährwerttabellen und Packungsangaben.
// [Anzeigename, Suchbegriffe, kcal/100, Protein/100, Gramm je Stück/Scheibe (0 = keins), Standardmenge in g, Einheit des Standards]
// Wichtig: längere/genauere Suchbegriffe gewinnen (z. B. "magerquark" vor "quark").
const DB = [
  // Brot, Backwaren
  ["Weizentoast", ["weizentoast", "weizen toast", "toastbrot", "toast", "sandwichbrot"], 265, 8, 30, 60],
  ["Vollkorntoast", ["vollkorntoast", "vollkorn toast"], 245, 9, 30, 60],
  ["Brot", ["mischbrot", "graubrot", "brotscheibe", "brot"], 230, 7.5, 45, 90],
  ["Vollkornbrot", ["vollkornbrot"], 215, 8, 45, 90],
  ["Brötchen", ["brötchen", "broetchen", "semmel", "weckle"], 265, 9, 60, 60],
  ["Baguette", ["baguette"], 275, 9, 0, 100],
  ["Laugenbrezel", ["laugenbrezel", "brezel", "laugengebäck", "laugenstange"], 235, 8, 85, 85],
  ["Croissant", ["croissant"], 400, 8, 60, 60],
  ["Reiswaffeln", ["reiswaffel"], 385, 8, 8, 16],
  // Aufstriche, Fette
  ["Nutella", ["nutella", "nuss-nougat-creme", "nusscreme", "nuss nougat"], 539, 6.3, 0, 20],
  ["Erdnussbutter", ["erdnussbutter", "peanutbutter", "peanut butter", "erdnusscreme"], 600, 25, 0, 20],
  ["Butter", ["butter", "margarine"], 741, 0.7, 0, 10],
  ["Marmelade", ["marmelade", "konfitüre", "konfituere", "gelee", "jam"], 250, 0.5, 0, 20],
  ["Honig", ["honig"], 306, 0.4, 0, 20],
  ["Frischkäse", ["frischkäse", "frischkaese", "philadelphia"], 250, 5.5, 0, 30],
  ["Olivenöl", ["olivenöl", "olivenoel", "öl"], 884, 0, 0, 10],
  ["Pesto grün", ["grünes pesto", "gruenes pesto", "pesto"], 500, 6.5, 0, 15],
  ["Hummus", ["hummus"], 230, 7, 0, 40],
  // Milchprodukte, Eier
  ["Skyr", ["skyr"], 62, 11, 0, 250],
  ["Magerquark", ["magerquark", "quark"], 67, 12, 0, 250],
  ["Naturjoghurt", ["naturjoghurt", "joghurt", "jogurt"], 62, 4, 0, 150],
  ["Milch 3,5 %", ["vollmilch", "milch"], 65, 3.4, 0, 250],
  ["Milch 1,5 %", ["fettarme milch", "milch 1,5", "halbfettmilch"], 47, 3.4, 0, 250],
  ["Mozzarella", ["mozzarella"], 243, 18, 0, 125],
  ["Käse", ["gouda", "edamer", "emmentaler", "käse", "kaese", "käsescheibe"], 356, 25, 25, 25],
  ["Ei", ["spiegelei", "rührei", "ruehrei", "gekochtes ei", "eier", "ei"], 143, 12.6, 55, 55],
  ["Proteinpulver (Whey)", ["proteinpulver", "whey", "proteinshake", "eiweißpulver", "eiweisspulver", "protein pulver"], 374, 74, 30, 30],
  ["Proteinriegel", ["proteinriegel", "eiweißriegel", "eiweissriegel"], 350, 30, 45, 45],
  // Fleisch, Fisch
  ["Rumpsteak", ["rumpsteak", "rindersteak", "steak", "rinderfilet"], 129, 21, 0, 200],
  ["Hähnchenbrust", ["hähnchenbrust", "haehnchenbrust", "hähnchen", "haehnchen", "hühnchen", "huhn", "chicken", "pute", "putenbrust"], 107, 22, 0, 150],
  ["Rinderhack", ["rinderhack", "hackfleisch", "hack"], 215, 18, 0, 150],
  ["Schinken", ["kochschinken", "schinken"], 107, 19, 20, 40],
  ["Salami", ["salami"], 420, 22, 6, 30],
  ["Lachs", ["lachs"], 200, 20, 0, 150],
  ["Thunfisch (Dose)", ["thunfisch"], 110, 25, 0, 120],
  // Beilagen
  ["Nudeln (trocken)", ["spaghetti", "nudeln", "pasta", "penne", "fusilli", "makkaroni", "tagliatelle"], 355, 12.5, 0, 100],
  ["Reis (trocken)", ["basmatireis", "reis"], 350, 7, 0, 80],
  ["Kartoffeln", ["kartoffeln", "kartoffel", "salzkartoffeln"], 77, 2, 0, 250],
  ["Pommes", ["curly fries", "pommes", "fries"], 160, 2.5, 0, 150],
  ["Haferflocken", ["haferflocken", "porridge", "oats"], 372, 13.5, 0, 50],
  ["Müsli", ["müsli", "muesli", "granola"], 380, 10, 0, 50],
  ["Cornflakes", ["cornflakes"], 375, 7, 0, 40],
  // Obst, Gemüse, Nüsse
  ["Banane", ["banane"], 90, 1.1, 115, 115],
  ["Apfel", ["apfel"], 52, 0.3, 180, 180],
  ["Beeren", ["beeren", "blaubeeren", "himbeeren", "erdbeeren"], 50, 1, 0, 80],
  ["Nüsse", ["nüsse", "nuesse", "studentenfutter", "walnüsse", "cashews", "haselnüsse"], 620, 19, 0, 30],
  ["Mandeln", ["mandeln"], 580, 21, 1.2, 30],
  ["Erdnüsse", ["erdnüsse", "erdnuesse", "erdnuss"], 600, 26, 0, 30],
  ["Tomate", ["tomaten", "tomate"], 18, 0.9, 0, 100],
  ["Gurke", ["gurke"], 12, 0.6, 0, 100],
  ["Paprika", ["paprika"], 30, 1, 0, 100],
  ["Brokkoli", ["brokkoli"], 34, 2.8, 0, 150],
  ["Gemüse", ["gemüse", "gemuese", "salat"], 30, 2, 0, 150],
  // Süßes, Getränke
  ["Spekulatius", ["spekulatius", "keks", "kekse", "plätzchen"], 480, 6, 10, 20],
  ["Schokolade", ["schokolade", "schoki"], 540, 6, 0, 25],
  ["Gummibärchen", ["gummibärchen", "gummibaerchen", "haribo"], 340, 6, 0, 30],
  ["Chips", ["chips"], 530, 6, 0, 40],
  ["Saft", ["orangensaft", "apfelsaft", "saft"], 46, 0.5, 0, 250],
  ["Cola", ["cola", "limo", "limonade"], 42, 0, 0, 330],
];

const norm = (s) => String(s).toLowerCase().replace(/ /g, " ").replace(/ß/g, "ss");
// Alle Suchbegriffe (normalisiert) mit Verweis auf den Eintrag, längste zuerst
const INDEX = DB.flatMap((e, i) => e[1].map((a) => ({ a: norm(a), i }))).sort((x, y) => y.a.length - x.a.length);

const WORD = (s) => s.replace(/\([^)]*\)/g, " ").replace(/\b(ca|circa|etwa|so)\b\.?/gi, " ").replace(/\s+/g, " ").trim();
const NUMW = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, halbe: 0.5, halben: 0.5, halber: 0.5, halb: 0.5 };
const UNITS = { g: "g", gramm: "g", kg: "kg", ml: "g", l: "l", el: "el", esslöffel: "el", essloeffel: "el", löffel: "el", loeffel: "el", tl: "tl", teelöffel: "tl", teeloeffel: "tl",
  stück: "pc", stueck: "pc", stk: "pc", scheibe: "pc", scheiben: "pc", glas: "glas", gläser: "glas", glaeser: "glas", portion: "port", portionen: "port", x: "pc", tasse: "glas", becher: "port" };
const UNIT_RE = "(kg|gramm|g|ml|l|el|esslöffel|essloeffel|löffel|loeffel|tl|teelöffel|teeloeffel|stück|stueck|stk|scheiben|scheibe|gläser|glaeser|glas|portionen|portion|becher|tasse|x)";
const NUM_RE = "(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|ein(?:e|en|em|er)?|zwei|drei|vier|fünf|fuenf|halbe[nr]?|halb)";

const toNum = (s) => {
  const t = norm(s).trim();
  if (NUMW[t] != null) return NUMW[t];
  const f = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (f) return Number(f[1]) / Number(f[2]);
  const v = parseFloat(t.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

// Menge am Anfang ("2 Weizen Toast", "150 g Skyr", "1 EL Pesto") oder am Ende ("Nutella 20 g") abtrennen
function splitQty(seg) {
  let m = seg.match(new RegExp(`^${NUM_RE}\\s*${UNIT_RE}?\\s*(?:von\\s+|vom\\s+)?(.+)$`, "i"));
  if (m && m[3] && !/^\d/.test(m[3])) return { qty: toNum(m[1]), unit: m[2] ? UNITS[norm(m[2])] : null, name: m[3].trim() };
  m = seg.match(new RegExp(`^(.+?)\\s+${NUM_RE}\\s*${UNIT_RE}?$`, "i"));
  if (m && /^\d|^ein|^zwei|^drei|^halb/i.test(m[2]) && (m[3] || /\d/.test(m[2]))) return { qty: toNum(m[2]), unit: m[3] ? UNITS[norm(m[3])] : null, name: m[1].trim() };
  return { qty: null, unit: null, name: seg.trim() };
}

function findEntry(name) {
  const n = norm(name);
  for (const { a, i } of INDEX) {
    // ganzes Wort bzw. Wortanfang (Plural/Endungen wie "Eier", "Nüsse" werden über eigene Begriffe abgedeckt)
    const re = new RegExp(`(^|[^a-zäöüß])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${a.length <= 3 ? "(?![a-zäöüß])" : ""}`);
    if (re.test(n)) return DB[i];
  }
  return null;
}

const r1 = (x) => Math.round(x * 10) / 10;

// Ein Teilstück wie "2 Weizen Toast" oder "Nutella 20 g" → { name, kcal, protein, grams, assumed } oder null
export function lookupFood(segment) {
  const seg = WORD(segment);
  if (!seg) return null;
  const { qty, unit, name } = splitQty(seg);
  const e = findEntry(name);
  if (!e) return null;
  const [label, , k100, p100, pc, def] = e;
  let grams, assumed = false, desc;
  if (qty == null) { grams = def; assumed = true; desc = `${def} g`; }
  else if (unit === "g") { grams = qty; desc = `${r1(qty)} g`; }
  else if (unit === "kg") { grams = qty * 1000; desc = `${r1(qty)} kg`; }
  else if (unit === "l") { grams = qty * 1000; desc = `${r1(qty)} l`; }
  else if (unit === "el") { const per = /öl/.test(norm(label)) ? 10 : /pesto/.test(norm(label)) ? 15 : 20; grams = qty * per; desc = `${r1(qty)} EL`; }
  else if (unit === "tl") { const per = /öl/.test(norm(label)) ? 4 : 7; grams = qty * per; desc = `${r1(qty)} TL`; }
  else if (unit === "glas") { grams = qty * (def >= 200 ? def : 250); desc = `${r1(qty)} Glas`; }
  else if (unit === "pc") { grams = qty * (pc || def); desc = `${r1(qty)} Stück`; }
  else { grams = qty * (pc || def); desc = `${r1(qty)}×`; }  // "2 Toast", "2 Eier", "1 Banane"
  const f = grams / 100;
  return { name: `${label} (${desc}${assumed ? ", geschätzt" : ""})`, kcal: Math.round(k100 * f), protein: r1(p100 * f), grams: Math.round(grams), assumed };
}

// Zeile ohne kcal-Angabe aufteilen: "2 Weizen Toast mit Nutella" → ["2 Weizen Toast", "Nutella"]
export const splitLine = (line) => String(line).split(/\s*(?:\+|,|;|&|\bund\b|\bmit\b|\bplus\b)\s*/i).map((s) => s.trim()).filter(Boolean);
