# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Lane Shooter is a zero-dependency, static HTML5 Canvas game. There is no build system, no package manager, no linter, and no automated test framework.

### Running the dev server

Serve the repository root with any static HTTP server:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in Chrome.

### Testing

- There are no automated tests (no Jest, Mocha, etc.).
- The project includes an in-browser performance testing system (`js/test.js`) invoked via the browser console; see `PERFORMANCE_TESTING.md` for details.
- Manual testing is done by playing the game in the browser: click **START GAME**, use **A/D** or arrow keys to switch lanes, and verify enemies spawn, bullets fire, power-ups appear, and levels progress.

### Key files

| File | Purpose |
|---|---|
| `index.html` | Entry point |
| `js/game.js` | Main game loop & state |
| `js/utils.js` | `CONFIG` constants (canvas size, speeds, spawn rates) |
| `js/test.js` | In-browser performance test harness |
