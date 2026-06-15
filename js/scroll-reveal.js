/**
 * scroll-reveal.js
 *
 * Subtle entrance animations triggered by IntersectionObserver.
 * Elements fade up into view as the user scrolls down the page.
 *
 * Auto-applies to: .info-panel, .card, .repo-card, .tabs-container,
 * .site-logo, .lead, h1, .repo-grid
 *
 * Skips pages that are primarily editors (code.html, runner-*).
 */
(() => {
  'use strict';

  // Skip editor pages
  const p = location.pathname;
  if (p.includes('code.html') ||
      p.includes('runner-astra') ||
      p.includes('runner-jason') ||
      p.includes('runner-jacamo') ||
      p.includes('404')) return;

  function applyResearchCopy() {
    if (!p.includes('research.html')) return;

    const problem = document.querySelector('#problem p');
    if (problem) {
      problem.textContent = 'Agent programs need access to LLMs, tools, APIs, and services without allowing those outputs to silently become beliefs, intentions, plans, or actions.';
    }

    const contribution = document.querySelector('#contribution p');
    if (contribution) {
      contribution.textContent = 'A Java framework boundary between agent execution and external generative resource use.';
    }

    const rq3 = document.querySelector('#research-questions .card:nth-child(3) p');
    if (rq3) {
      rq3.textContent = 'Can the same governed resource-layer model work across different MAS frameworks?';
    }
  }

  // Selectors to animate
  const SELECTORS = [
    '.main > h1',
    '.main > .lead',
    '.main > .site-logo',
    '.info-panel',
    '.main > .repo-grid',
    '.info-panel > .card',
    '.info-panel > div > .card',
    '.concept-card',
    '.info-panel > h2',
    '.info-panel > p',
    '.info-panel > .tabs-container',
    '.info-panel > div > .tabs-container',
    '.info-panel > div > .concept-card',
  ].join(',');

  // Stagger delay per element group
  const BASE_DELAY = 60;   // ms between sequential elements
  const MAX_DELAY  = 400;  // cap

  function init() {
    applyResearchCopy();

    const els = document.querySelectorAll(SELECTORS);
    if (!els.length) return;

    // Mark elements for reveal
    let index = 0;
    els.forEach(el => {
      // Don't animate elements inside collapsed/hidden containers
      if (el.closest('.concept-details') ||
          el.closest('.pattern-detail') ||
          el.closest('.prereq-details') ||
          el.closest('[style*="display:none"]') ||
          el.closest('[style*="display: none"]')) return;

      // Skip elements already above the fold (visible on load)
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85 && rect.top > 0) {
        // Above fold — just show immediately with a tiny fade
        el.classList.add('sr');
        el.style.transitionDelay = `${Math.min(index * BASE_DELAY, MAX_DELAY)}ms`;
        // Trigger immediately
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.add('sr-visible');
          });
        });
        index++;
        return;
      }

      if (rect.top <= 0) {
        // Already scrolled past — no animation needed
        return;
      }

      // Below fold — observe for scroll
      el.classList.add('sr');
      index++;
    });

    // Observe elements below the fold
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sr-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.sr:not(.sr-visible)').forEach(el => {
      observer.observe(el);
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
