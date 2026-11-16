// IndexedDB-Schicht. Alle Datensätze haben id (UUID), createdAt, updatedAt und optional deletedAt
// (Soft-Delete) – damit lässt sich später ohne Umbau mit Supabase o. Ä. synchronisieren.
//
// Stores:
//   plan        Trainingstage inkl. Übungen            { id, name, weekday, exercises:[...], ... }
//   sessions    Trainings (draft | done)               { id, dayId, date, status, exercises:[{sets:[...]}], shoulder, ... }
//   bodyweight  Körpergewicht pro Tag                  { id, date, kg, ... }
//   meta        Einstellungen                          { key:"settings", theme, planVersion }
//   foods       Geplante Lebensmittel/Mahlzeiten       { id, name, meal, kcal, protein }
//   foodlog     Gegessen pro Tag (portion 0 | 0.5 | 1) { id, date, foodId, portion }
//   photos      Eigene Fotos je Übung (JPEG-DataURL)   { id, key, data }
const DB_NAME = "gym-tracker";
const DB_VERSION = 2;
const STORES = { plan: "id", sessions: "id", bodyweight: "id", meta: "key", foods: "id", foodlog: "id", photos: "id" };

let dbp = null;
export let persistent = true;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => { persistent = false; console.warn("IndexedDB nicht verfügbar", e); return null; });
  return dbp;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const st = t.objectStore(store);
    const r = fn(st);
    t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getAll(store) {
  const db = await open();
  if (!db) return [];
  return tx(db, store, "readonly", (s) => s.getAll());
}

export async function put(store, rec, touch = true) {
  const db = await open();
  if (!db) return;
  if (touch) rec.updatedAt = Date.now();
  await tx(db, store, "readwrite", (s) => s.put(JSON.parse(JSON.stringify(rec))));
}

// Soft-Delete: Datensatz bleibt mit deletedAt erhalten (Tombstone für späteren Sync).
export async function softDelete(store, rec) {
  rec.deletedAt = Date.now();
  await put(store, rec);
}

export async function clearStore(store) {
  const db = await open();
  if (!db) return;
  await tx(db, store, "readwrite", (s) => s.clear());
}

export async function replaceAll(data) {
  const db = await open();
  if (!db) return;
  for (const store of Object.keys(STORES)) {
    await clearStore(store);
    for (const rec of data[store] || []) await put(store, rec, false);
  }
}

export async function persistRequest() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}
