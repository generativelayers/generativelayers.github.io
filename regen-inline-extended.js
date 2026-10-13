#!/usr/bin/env node
/**
 * Regenerates js/inline-extended-sources.js from the expanded-examples repo.
 * Run from the generativelayers root:
 *   node generativelayers.github.io/regen-inline-extended.js
 */
const fs = require('fs');
const path = require('path');

const EXAMPLES_ROOT = path.join(__dirname, '..', 'expanded-examples');
const OUTPUT = path.join(__dirname, 'js', 'inline-extended-sources.js');

// Files to include (relative to expanded-examples/)
const FILES = [
  'astra/story-to-book/pom.xml',
  'astra/story-to-book/src/main/astra/Main.astra',
  'astra/story-to-book/src/main/astra/Writer.astra',
  'astra/story-to-book/src/main/astra/Reviewer.astra',
  'astra/story-to-book/src/main/java/artifacts/ManuscriptArtifact.java',
  'astra/story-to-book/src/main/java/artifacts/PromptConfigArtifact.java',
  'astra/story-to-book/src/main/java/dashboard/Dashboard.java',
  'astra/story-to-book/src/main/java/dashboard/DashboardServer.java',
];

const sources = {};
for (const rel of FILES) {
  const abs = path.join(EXAMPLES_ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`Missing: ${abs}`);
    process.exit(1);
  }
  // Normalize line endings to \n
  sources[rel] = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
}

const js = 'window.__INLINE_EXTENDED_SOURCES = ' + JSON.stringify(sources, null, null) + ';\n';
fs.writeFileSync(OUTPUT, js, 'utf8');
console.log(`Wrote ${OUTPUT} (${js.length} bytes, ${FILES.length} files)`);

// Auto-update cache buster in extended-patterns.html
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(js).digest('hex').slice(0, 8);
const htmlPath = path.join(__dirname, 'extended-patterns.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const updated = html.replace(
    /inline-extended-sources\.js\?cb=[a-f0-9]+/,
    `inline-extended-sources.js?cb=${hash}`
  );
  if (updated !== html) {
    fs.writeFileSync(htmlPath, updated, 'utf8');
    console.log(`Updated cache buster in extended-patterns.html -> ?cb=${hash}`);
  }
}

