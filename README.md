# Code I/O 2026 — Signal Lost

STEM escape room web app for middle schoolers at the Youth for STEM Equity Code I/O 2026 event.

Students play as Net Ranger rookies solving 5 coding puzzles (HTML, Python, Binary, Blockly, Python) in 90 minutes while a rogue AI named GLITCH.exe corrupts the web. An AI helper (BYTE, powered by Claude) gives tiered hints without revealing answers.

## Stack

- **Web:** Vite + React 18 + TypeScript + Tailwind + Zustand + React Router
- **Worker:** Cloudflare Worker (TypeScript) proxying Claude Haiku 4.5 via Anthropic Messages API
- **Code editor:** CodeMirror 6
- **Python runtime:** Pyodide (in-browser, lazy-loaded)
- **Blockly:** Google Blockly with custom toolbox
- **Animation:** Framer Motion + GSAP (for cinematic + disarm timelines)
- **Sprites:** Lottie (character expressions) + SVG
- **Audio:** Howler.js with sprite sheet
- **Hosting:** Cloudflare Pages + Workers

## Repository layout

```
apps/web         Vite React SPA
apps/worker      Cloudflare Worker (hint proxy)
packages/shared  Shared TS types + Zod schemas
docs             Puzzle source (HTML Problems PDF)
ops              Runbook, volunteer binder, key rotation
tests            E2E, unit, and load test suites
```

## Getting started

```bash
pnpm install
pnpm dev        # runs web + worker concurrently
```

Web dev server: http://localhost:5173
Worker dev server: http://localhost:8787

## Plan

Full implementation plan lives at `C:\Users\User\.claude\plans\we-are-going-to-ancient-thompson.md`.
