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
  // ASTRA
  'astra/story-to-book/pom.xml',
  'astra/story-to-book/src/main/astra/Main.astra',
  'astra/story-to-book/src/main/astra/Writer.astra',
  'astra/story-to-book/src/main/astra/Reviewer.astra',
  'astra/story-to-book/src/main/java/artifacts/ManuscriptArtifact.java',
  'astra/story-to-book/src/main/java/artifacts/PromptConfigArtifact.java',
  'astra/story-to-book/src/main/java/dashboard/Dashboard.java',
  'astra/story-to-book/src/main/java/dashboard/DashboardServer.java',
  // Jason
  'jason/story-to-book/pom.xml',
  'jason/story-to-book/src/main/asl/main.asl',
  'jason/story-to-book/src/main/asl/writer.asl',
  'jason/story-to-book/src/main/asl/reviewer.asl',
  'jason/story-to-book/src/main/asl/config.asl',
  'jason/story-to-book/src/main/java/dash/board.java',
  'jason/story-to-book/src/main/java/ms/get.java',
  'jason/story-to-book/src/main/java/ms/set.java',
  'jason/story-to-book/src/main/java/store/ManuscriptStore.java',
  'jason/story-to-book/src/main/java/dashboard/DashboardServer.java',
  // JaCaMo
  'jacamo/story-to-book/pom.xml',
  'jacamo/story-to-book/story_to_book.mas2j',
  'jacamo/story-to-book/src/agt/main.asl',
  'jacamo/story-to-book/src/agt/writer.asl',
  'jacamo/story-to-book/src/agt/reviewer.asl',
  'jacamo/story-to-book/src/main/java/artifacts/ManuscriptArtifact.java',
  'jacamo/story-to-book/src/main/java/artifacts/PromptConfigArtifact.java',
  'jacamo/story-to-book/src/main/java/dashboard/DashboardArtifact.java',
  'jacamo/story-to-book/src/main/java/dashboard/DashboardServer.java',
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
