#!/usr/bin/env node
/**
 * sync-tokens.mjs
 * Reads Token Studio's multi-file export (tokens/ folder) and
 * updates src/app/globals.css with the correct CSS custom properties.
 *
 * Usage:
 *   node sync-tokens.mjs
 */

import fs from "fs";
import path from "path";

const tokensDir = "./tokens";
const cssPath   = "./src/app/globals.css";

// --- Recursively extract { name: value } from nested Token Studio JSON ---
function extractTokens(obj, prefix = "") {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === "$themes" || key === "$metadata") continue;
    if (val && typeof val === "object" && val.value !== undefined) {
      // Leaf token — use the full dotted path as the CSS var name
      const cssKey = prefix ? `${prefix}-${key}` : key;
      result[cssKey] = val.value;
    } else if (val && typeof val === "object") {
      // Nested group — recurse
      const nested = extractTokens(val, prefix ? `${prefix}-${key}` : key);
      Object.assign(result, nested);
    }
  }
  return result;
}

// --- Load a JSON file from the tokens folder ---
function loadSet(name) {
  const filePath = path.join(tokensDir, `${name}.json`);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const global = extractTokens(loadSet("global"));
const light  = extractTokens(loadSet("Light"));
const dark   = extractTokens(loadSet("Dark"));

// --- Build CSS variable blocks ---
function toCSSVars(obj, indent = "  ") {
  return Object.entries(obj)
    .map(([key, value]) => `${indent}--${key}: ${value};`)
    .join("\n");
}

const generatedBlock = `/* ============================================================
   AUTO-GENERATED — do not edit this block manually.
   Run: node sync-tokens.mjs to regenerate from tokens/ folder
   ============================================================ */

/* Global tokens (mode-independent) */
:root {
${toCSSVars(global)}

/* Light mode tokens */
${toCSSVars(light)}
}

.dark {
${toCSSVars(dark)}
}
/* ============================================================
   END AUTO-GENERATED
   ============================================================ */`;

// --- Read existing globals.css ---
if (!fs.existsSync(cssPath)) {
  console.error(`❌ CSS file not found: ${cssPath}`);
  process.exit(1);
}

let css = fs.readFileSync(cssPath, "utf8");

const startMarker = "/* ============================================================\n   AUTO-GENERATED";
const endMarker   = "/* ============================================================\n   END AUTO-GENERATED\n   ============================================================ */";

if (css.includes(startMarker)) {
  const start = css.indexOf(startMarker);
  const end   = css.indexOf(endMarker) + endMarker.length;
  css = css.slice(0, start) + generatedBlock + css.slice(end);
  console.log("✅ Updated existing token block in globals.css");
} else {
  const importLine = '@import "tailwindcss";';
  if (css.includes(importLine)) {
    css = css.replace(importLine, `${importLine}\n\n${generatedBlock}`);
  } else {
    css = generatedBlock + "\n\n" + css;
  }
  console.log("✅ Inserted new token block into globals.css");
}

fs.writeFileSync(cssPath, css, "utf8");

console.log(`
Token sync complete:
  Source : ${path.resolve(tokensDir)}
  Output : ${path.resolve(cssPath)}
  Global : ${Object.keys(global).length} tokens
  Light  : ${Object.keys(light).length} tokens
  Dark   : ${Object.keys(dark).length} tokens
`);
