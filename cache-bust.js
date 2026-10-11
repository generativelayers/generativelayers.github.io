#!/usr/bin/env node
/**
 * cache-bust.js — Append ?cb=<hash> to all local JS and CSS references
 * in every HTML file. The hash is derived from the referenced file's content,
 * so it only changes when the file actually changes.
 *
 * Usage: node cache-bust.js
 * Run this before every git push.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const HTML_FILES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

function fileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch (e) {
    // File doesn't exist (external resource) — use timestamp
    return Date.now().toString(36);
  }
}

let totalUpdated = 0;

for (const htmlFile of HTML_FILES) {
  const htmlPath = path.join(ROOT, htmlFile);
  let html = fs.readFileSync(htmlPath, 'utf-8');
  let changed = false;

  // Match: src="js/..." or src="something.js" or href="style.css" etc.
  // Covers: <script src="js/foo.js">, <script defer src="js/foo.js">,
  //         <link href="style.css">, <link href="framework-layout.css">
  // Does NOT touch external URLs (https://, http://, //)
  html = html.replace(
    /((?:src|href)\s*=\s*")((?!https?:\/\/|\/\/)(?:[^"]*\.(?:js|css)))(\?cb=[a-f0-9]+)?(")/gi,
    (match, prefix, filePart, oldCb, suffix) => {
      // Resolve the file path relative to the HTML file
      const resolved = path.join(ROOT, filePart);
      const hash = fileHash(resolved);
      changed = true;
      return `${prefix}${filePart}?cb=${hash}${suffix}`;
    }
  );

  if (changed) {
    fs.writeFileSync(htmlPath, html, 'utf-8');
    totalUpdated++;
    console.log(`  ✓ ${htmlFile}`);
  }
}

console.log(`\nCache-busted ${totalUpdated} HTML files.`);
