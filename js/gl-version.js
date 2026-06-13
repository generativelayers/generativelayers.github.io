/**
 * gl-version.js — Single source of truth for the Generative Layers version.
 *
 * Every JS file that needs the GL version reads window.GL_VERSION
 * instead of hardcoding the string. When bumping to a new release,
 * update ONLY this file (and getting-started.html Maven/Gradle snippets).
 */
window.GL_VERSION = '0.2.1';
