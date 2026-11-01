import type { ProductInput } from "../../src/lib/products/schema";

const GREEN = "#1f4d3a";
const LEAF = "#3f7d5c";
const SAND = "#efe6d3";
const SAND_DARK = "#d9c9a6";
const CHARCOAL = "#2b2f2c";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Simple line icons drawn in a 400×400 box, centered at (800, 470).
const ICONS: Record<string, string> = {
  enclosure: `<rect x="40" y="70" width="320" height="250" rx="14" fill="#fff" fill-opacity=".55" stroke="${GREEN}" stroke-width="14"/>
    <line x1="200" y1="70" x2="200" y2="320" stroke="${GREEN}" stroke-width="10"/>
    <rect x="40" y="70" width="320" height="34" fill="${GREEN}"/>
    <path d="M70 290 q40-60 90-20 q50 40 100-10 q40-40 80 0 v30 h-270z" fill="${LEAF}"/>
    <line x1="80" y1="140" x2="120" y2="180" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <line x1="240" y1="140" x2="280" y2="180" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
  bulb: `<circle cx="200" cy="160" r="100" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14"/>
    <rect x="150" y="255" width="100" height="70" rx="10" fill="${GREEN}"/>
    <line x1="150" y1="280" x2="250" y2="280" stroke="${SAND}" stroke-width="6"/>
    <line x1="150" y1="302" x2="250" y2="302" stroke="${SAND}" stroke-width="6"/>
    <path d="M170 170 q30-40 60 0" fill="none" stroke="${LEAF}" stroke-width="10" stroke-linecap="round"/>`,
  tube: `<rect x="20" y="160" width="360" height="60" rx="30" fill="#fff" fill-opacity=".7" stroke="${GREEN}" stroke-width="14"/>
    <rect x="10" y="170" width="30" height="40" rx="6" fill="${GREEN}"/><rect x="360" y="170" width="30" height="40" rx="6" fill="${GREEN}"/>
    <path d="M70 120 l20 30 M150 110 l0 36 M230 110 l0 36 M310 120 l-20 30" stroke="${LEAF}" stroke-width="10" stroke-linecap="round"/>`,
  device: `<rect x="80" y="70" width="240" height="260" rx="24" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14"/>
    <rect x="115" y="110" width="170" height="80" rx="8" fill="${GREEN}"/>
    <text x="200" y="168" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="${SAND}" text-anchor="middle">88°</text>
    <circle cx="150" cy="250" r="24" fill="${LEAF}"/><circle cx="250" cy="250" r="24" fill="${LEAF}"/>`,
  mat: `<rect x="40" y="100" width="320" height="200" rx="16" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14"/>
    <path d="M80 150 h240 M80 200 h240 M80 250 h240" stroke="${LEAF}" stroke-width="10" stroke-linecap="round"/>
    <path d="M360 200 q30 0 30 40 v80" fill="none" stroke="${GREEN}" stroke-width="10"/>`,
  bag: `<path d="M110 90 h180 l30 250 q0 20 -20 20 h-200 q-20 0 -20 -20z" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14" stroke-linejoin="round"/>
    <rect x="110" y="70" width="180" height="34" rx="6" fill="${GREEN}"/>
    <path d="M200 170 q-60 40 -20 120 q60-40 20-120z" fill="${LEAF}"/>`,
  bottle: `<rect x="160" y="50" width="80" height="50" rx="8" fill="${GREEN}"/>
    <path d="M140 100 h120 q30 0 30 40 v190 q0 20 -20 20 h-140 q-20 0 -20 -20 v-190 q0-40 30-40z" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14"/>
    <rect x="130" y="190" width="140" height="90" rx="6" fill="${LEAF}"/>`,
  tool: `<path d="M120 340 L250 80" stroke="${GREEN}" stroke-width="18" stroke-linecap="round"/>
    <path d="M160 340 L270 90" stroke="${LEAF}" stroke-width="18" stroke-linecap="round"/>
    <path d="M250 80 q30 -40 70 -10" fill="none" stroke="${GREEN}" stroke-width="18" stroke-linecap="round"/>`,
  book: `<path d="M60 90 q70 -30 140 0 v240 q-70 -30 -140 0z" fill="#fff" fill-opacity=".6" stroke="${GREEN}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M340 90 q-70 -30 -140 0 v240 q70 -30 140 0z" fill="${LEAF}" stroke="${GREEN}" stroke-width="14" stroke-linejoin="round"/>`,
  snake: `<path d="M60 300 q0 -60 70 -60 h120 q60 0 60 -55 q0 -55 -60 -55 h-90" fill="none" stroke="${GREEN}" stroke-width="44" stroke-linecap="round"/>
    <ellipse cx="140" cy="130" rx="44" ry="32" fill="${GREEN}"/>
    <circle cx="128" cy="120" r="7" fill="${SAND}"/>
    <path d="M96 136 l-30 6 M96 136 l-28 -8" stroke="#b5482f" stroke-width="5" stroke-linecap="round"/>
    <path d="M110 300 h60 M200 240 h40" stroke="${LEAF}" stroke-width="10" stroke-linecap="round"/>`,
  lizard: `<path d="M330 260 q40 30 40 70 q-40 -10 -80 -60" fill="${GREEN}"/>
    <ellipse cx="210" cy="230" rx="110" ry="46" fill="${GREEN}"/>
    <ellipse cx="80" cy="200" rx="52" ry="36" fill="${GREEN}"/>
    <circle cx="66" cy="190" r="7" fill="${SAND}"/>
    <path d="M150 260 l-30 60 M270 260 l30 60 M150 200 l-30 -60 M270 200 l30 -60" stroke="${GREEN}" stroke-width="22" stroke-linecap="round"/>
    <path d="M150 230 h120" stroke="${LEAF}" stroke-width="10" stroke-linecap="round" stroke-dasharray="14 18"/>`,
  decor: `<path d="M60 320 q20 -120 120 -150 q-20 80 -120 150z" fill="${LEAF}"/>
    <path d="M200 330 q10 -170 140 -230 q-10 140 -140 230z" fill="${GREEN}"/>
    <ellipse cx="200" cy="335" rx="170" ry="22" fill="${SAND_DARK}"/>`,
};

const ICON_BY_SUBCATEGORY: Record<string, keyof typeof ICONS> = {
  "glass-terrariums": "enclosure", "pvc-enclosures": "enclosure", "screen-enclosures": "enclosure",
  "tortoise-tables": "enclosure", "bioactive-kits": "enclosure", "starter-kits": "enclosure",
  "uvb-lighting": "tube", fixtures: "tube", basking: "bulb", "heat-sources": "bulb", thermostats: "device", accessories: "device",
  substrate: "bag", hides: "decor", decor: "decor",
  "frozen-rodents": "bag", "live-feeders": "bag", "dried-food": "bag", supplements: "bottle", "prepared-diets": "bag",
  monitoring: "device", humidity: "bottle", handling: "tool", cleaning: "bottle", books: "book",
};

function iconFor(p: ProductInput) {
  if (p.is_live_animal) return p.subcategory === "snakes" ? ICONS.snake : ICONS.lizard;
  if (/heat mat/i.test(p.name)) return ICONS.mat;
  if (/fixture|dome/i.test(p.name) && /dome/i.test(p.name)) return ICONS.bulb;
  return ICONS[ICON_BY_SUBCATEGORY[p.subcategory ?? ""] ?? "decor"];
}

function wrap(text: string, max = 30) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 3);
}

/** A clean 1600×1200 product illustration used until a real supplier photo is available. */
export function placeholderSvg(p: ProductInput) {
  const lines = wrap(p.name);
  const text = lines
    .map((l, i) => `<text x="800" y="${905 + i * 66}" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="${CHARCOAL}" text-anchor="middle">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#f8f3e8"/><stop offset="1" stop-color="${SAND}"/></radialGradient></defs>
  <rect width="1600" height="1200" fill="url(#g)"/>
  <circle cx="800" cy="470" r="300" fill="#fff" fill-opacity=".45"/>
  <g transform="translate(600 270)">${iconFor(p)}</g>
  ${text}
  <text x="800" y="1140" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="6" fill="${GREEN}" text-anchor="middle">SCALEHAVEN REPTILES</text>
</svg>`;
}
