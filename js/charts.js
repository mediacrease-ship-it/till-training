// Kleine SVG-Diagramme ohne Bibliothek. Farben kommen aus CSS (.ch-*), damit Hell/Dunkel automatisch passt.
import { fmt1 } from "./logic.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// pts: [{label, y}]
export function lineChart(pts, { height = 190, unit = "" } = {}) {
  if (!pts.length) return "";
  const W = 340, H = height, pl = 40, pr = 14, pt = 16, pb = 26;
  let min = Math.min(...pts.map((p) => p.y)), max = Math.max(...pts.map((p) => p.y));
  if (min === max) { min -= 1; max += 1; }
  const padY = (max - min) * 0.18; min -= padY; max += padY;
  const x = (i) => (pts.length === 1 ? pl + (W - pl - pr) / 2 : pl + (i * (W - pl - pr)) / (pts.length - 1));
  const y = (v) => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  let g = "";
  for (let i = 0; i < 3; i++) {
    const v = min + ((max - min) * i) / 2, yy = y(v);
    g += `<line class="ch-grid" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="ch-txt" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${fmt1(v)}</text>`;
  }
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const dots = pts.map((p, i) => `<circle class="ch-dot${i === pts.length - 1 ? " last" : ""}" cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3.5}"/>`).join("");
  const xl = [];
  const idx = pts.length === 1 ? [0] : pts.length < 5 ? [0, pts.length - 1] : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  for (const i of idx) xl.push(`<text class="ch-txt" x="${x(i)}" y="${H - 7}" text-anchor="${i === 0 && pts.length > 1 ? "start" : i === pts.length - 1 && pts.length > 1 ? "end" : "middle"}">${esc(pts[i].label)}</text>`);
  const lastP = pts[pts.length - 1];
  const lx = x(pts.length - 1), ly = y(lastP.y);
  const lab = `<text class="ch-val" x="${Math.min(lx, W - pr - 10)}" y="${ly - 10}" text-anchor="${pts.length === 1 ? "middle" : "end"}">${fmt1(lastP.y)}${unit ? " " + esc(unit) : ""}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlaufsdiagramm">${g}<path class="ch-line" d="${path}"/>${dots}${lab}${xl.join("")}</svg>`;
}

// items: [{label, value}]
export function barChart(items, { height = 170 } = {}) {
  if (!items.length) return "";
  const W = 340, H = height, pl = 8, pr = 8, pt = 22, pb = 24;
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = (W - pl - pr) / items.length;
  const bars = items.map((it, i) => {
    const h = ((H - pt - pb) * it.value) / max;
    const bx = pl + i * bw + bw * 0.18, w = bw * 0.64;
    const last = i === items.length - 1;
    return `<rect class="ch-bar${last ? " last" : ""}" x="${bx.toFixed(1)}" y="${(H - pb - h).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="4"/>` +
      (items.length <= 8 ? `<text class="ch-val" x="${(bx + w / 2).toFixed(1)}" y="${(H - pb - h - 5).toFixed(1)}" text-anchor="middle">${esc(it.top ?? "")}</text>` : "") +
      `<text class="ch-txt" x="${(bx + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(it.label)}</text>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Balkendiagramm"><line class="ch-grid" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>${bars}</svg>`;
}

export function sparkline(values, { w = 64, h = 26 } = {}) {
  if (values.length < 2) return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const x = (i) => 2 + (i * (w - 4)) / (values.length - 1);
  const y = (v) => 3 + (h - 6) * (1 - (v - min) / (max - min));
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return `<svg class="spark ${up ? "up" : "down"}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/><circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(values[values.length - 1]).toFixed(1)}" r="2.5"/></svg>`;
}
