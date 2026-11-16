// Tills tägliche Mahlzeiten (Richtwerte, Mengen und Nährwerte jederzeit in der App änderbar: Essen → Liste bearbeiten).
// Quellen für die Nährwerte: wikifit.de / fddb (Skyr, Hähnchenbrust, Mozzarella, Laugenbrezel, Spekulatius,
// Aldi Sports Whey Protein Deluxe Cookies & Cream: 374 kcal und 74 g Eiweiß je 100 g), Rest aus Standardwerten.
// [Mahlzeit, Name, kcal, Protein g]
export const DEFAULT_FOODS = [
  ["Frühstück", "Skyr-Bowl: 250 g Skyr, 15 g Proteinpulver, 2 Spekulatius", 307, 40],
  ["Frühstück", "Proteinshake (30 g Pulver, Wasser)", 112, 22],
  ["Pause", "Laugenbrezel (ca. 85 g)", 200, 7],
  ["Pause", "Nüsse (30 g)", 185, 6],
  ["Mittagessen", "Hähnchen mit Nudeln: 150 g Hähnchen, 100 g Nudeln, 1 EL Olivenöl", 605, 46],
  ["Abendessen", "Mozzarella-Baguette: 125 g Mozzarella, 100 g Baguette", 580, 32],
  ["Nach dem Training", "Proteinshake nach dem Training (30 g Pulver, Wasser)", 112, 22],
];

// Schnellauswahl im Feld „Oder etwas anderes gegessen?“
export const TEMPLATES = [
  { name: "All-in-One-Milkshake", text: "Vollmilch 3,5 % (350 ml) | 228 kcal | 12 g Protein\nProteinpulver (30 g) | 112 kcal | 22 g Protein\nErdnussbutter (1 EL, 20 g) | 120 kcal | 5 g Protein" },
  { name: "2 Toast mit Erdnussbutter + Banane", text: "Toastbrot (2 Scheiben) | 160 kcal | 5 g Protein\nErdnussbutter (30 g) | 180 kcal | 8 g Protein\nBanane (1 mittelgroß) | 105 kcal | 1 g Protein" },
  { name: "Skyr-Bowl mit Beeren", text: "Skyr (250 g) | 155 kcal | 28 g Protein\nProteinpulver (15 g) | 56 kcal | 11 g Protein\nSpekulatius (2 Stück) | 96 kcal | 1 g Protein\nBeeren (80 g) | 40 kcal | 1 g Protein" },
  { name: "Banane", text: "Banane (1 mittelgroß) | 105 kcal | 1 g Protein" },
];
