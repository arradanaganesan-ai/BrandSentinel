/**
 * BrandSentinel dark -> light theme mechanical conversion.
 * Run from BrandSentinel/frontend:  node scripts/theme-migrate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Hex palette migration (chart / graph hardcoded colours)
const HEX_MAP = {
  '#6366F1': '#C83232', // indigo -> vermilion
  '#818CF8': '#A32B26',
  '#4F46E5': '#8E2521',
  '#EC4899': '#B83A60', // pink
  '#10B981': '#1E7A4F', // emerald
  '#14B8A6': '#1F6E52', // teal
  '#F59E0B': '#A8761A', // amber
  '#EF4444': '#A3231D', // red
  '#DC2626': '#A3231D',
  '#3B82F6': '#2C5A8A', // blue
  '#64748B': '#8B7F76', // axis text
  '#1E293B': '#E6DDCC', // grid
  '#334155': '#D8CDB8', // grid / borders
  '#0F172A': '#FFFFFF', // tooltip / node surface
  '#0B0F17': '#F8F4EC',
  '#07090E': '#F8F4EC',
  '#0F1523': '#FDFBF7',
  '#141C2E': '#F1EADD',
  '#F8FAFC': '#251C19', // light text -> ink
  '#1E1B4B': '#F9EAE7', // indigo node tint
  '#064E3B': '#E9F5EF', // emerald node tint
  '#451A03': '#FAF2E0', // amber node tint
  '#500724': '#FAEEF2', // pink node tint
  '#134E4A': '#E3F0EA', // teal node tint
};

const ACCENT_BG = /bg-(?:indigo|red|emerald|amber|teal|purple|pink|blue|gradient)-/;
const REPLACEMENTS = { textWhite: [], shadows: [], hex: [], radius: [], scrim: [] };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const original = src;

  // 1. text-white -> text-ink (unless the element itself sits on an accent background)
  src = src.replace(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g, (m, a, b, offset) => {
    const cls = a ?? b;
    if (!cls || !/\btext-white\b/.test(cls)) return m;
    if (ACCENT_BG.test(cls)) return m;
    REPLACEMENTS.textWhite.push(`${rel}:${lineOf(src, offset)} :: ${cls.trim().slice(0, 120)}`);
    const next = cls.replace(/\btext-white\b/g, 'text-ink');
    return a !== undefined ? `className="${next}"` : `className={\`${next}\`}`;
  });

  // 2. Coloured drop shadows -> neutral card shadow
  src = src.replace(/\bshadow-(?:indigo|red|emerald|amber|teal|purple|pink|blue)-\d+(?:\/\d+)?/g, (m) => {
    REPLACEMENTS.shadows.push(`${rel} :: ${m}`);
    return 'shadow-card';
  });

  // 3. Hardcoded hex colours
  src = src.replace(/#[0-9A-Fa-f]{6}\b/g, (m) => {
    const up = m.toUpperCase();
    if (HEX_MAP[up]) {
      REPLACEMENTS.hex.push(`${rel} :: ${m} -> ${HEX_MAP[up]}`);
      return HEX_MAP[up];
    }
    return m;
  });

  // 4. Reduce oversized corner radii (cards 16px -> 8px, controls 12px -> 6px)
  src = src.replace(/\brounded-(2xl|xl)\b/g, (m) => {
    REPLACEMENTS.radius.push(`${rel} :: ${m}`);
    return m === 'rounded-2xl' ? 'rounded-lg' : 'rounded-md';
  });

  // 5. Modal scrim: neutral black -> warm ink at lower opacity
  src = src.replace(/\bbg-black\/75\b/g, () => {
    REPLACEMENTS.scrim.push(rel);
    return 'bg-[#251C19]/45';
  });

  if (src !== original) fs.writeFileSync(file, src, 'utf8');
}

console.log(`text-white replacements (${REPLACEMENTS.textWhite.length}):`);
REPLACEMENTS.textWhite.forEach((l) => console.log('  ' + l));
console.log(`\nshadow replacements: ${REPLACEMENTS.shadows.length}`);
console.log(`hex replacements: ${REPLACEMENTS.hex.length}`);
console.log(`radius reductions: ${REPLACEMENTS.radius.length}`);
console.log(`scrim replacements: ${REPLACEMENTS.scrim.length}`);
