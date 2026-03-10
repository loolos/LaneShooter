# Performance Testing and Monitoring Guide

## Overview

The in-browser test system in `js/test.js` helps you:

- simulate high-load gameplay scenarios,
- monitor real-time frame performance,
- and run audio reliability checks.

## Prerequisites

1. Start a local static server from repository root:
   - `python3 -m http.server 8080`
2. Open `http://localhost:8080/` in Chrome.
3. Click **START GAME** so the game state is `playing` before running scenario tests.

## Quick Start

### 1) Open the performance monitor

- Press **Ctrl+P**, or
- Run in console: `testManager.monitor.toggle()`

### 2) Run a test scenario

Use browser DevTools console commands:

#### Scenario 1: Many enemies

```javascript
testManager.runTest('manyEnemies', 100);
testManager.runTest('manyEnemies', 50, 'tank');
testManager.runTest('manyEnemies', 30, 'fast');
```

#### Scenario 2: Many units (formation + swarm)

```javascript
testManager.runTest('manyUnits', 20, 20);
```

#### Scenario 3: Many bullet groups

```javascript
testManager.runTest('manyBullets', 200);
```

#### Scenario 4: Many effects

```javascript
testManager.runTest('manyEffects', 100);
```

#### Scenario 5: Combined stress test

```javascript
testManager.runTest('combined');
```

### 3) Run audio reliability tests

```javascript
testManager.runTest('audio');
```

Equivalent direct calls:

```javascript
audioTests.runAll();
audioTests.run('queue_when_playback_blocked');
```

### 4) Stop active gameplay stress tests

```javascript
testManager.stopTest();
```

## What the monitor displays

### Real-time metrics

- **FPS**
  - Green: `>=55 FPS`
  - Yellow: `30-54 FPS`
  - Red: `<30 FPS`
- **Frame Time**
  - Average, minimum, and maximum frame time in milliseconds.

### Entity counters

- Active enemies
- Active bullet groups
- Active effects
- Active powerups
- Active XP texts

### Warning logs

Warnings are captured when frame time exceeds thresholds:

- Warning threshold: `33ms` (~30 FPS)
- Critical threshold: `50ms` (~20 FPS)

Each warning includes timestamp, severity, frame time, and entity counts.

## Scenario details

### `manyEnemies`

- Purpose: stress test enemy update/render throughput.
- Parameters:
  - `count` (default `100`)
  - `type` (default `'basic'`)

### `manyUnits`

- Purpose: stress test multi-unit enemies.
- Parameters:
  - `formationCount` (default `20`)
  - `swarmCount` (default `20`)

### `manyBullets`

- Purpose: stress test projectile and collision load.
- Parameter:
  - `bulletGroupCount` (default `200`)

### `manyEffects`

- Purpose: stress test effect rendering load.
- Parameter:
  - `effectCount` (default `100`)

### `combined`

- Purpose: run a mixed high-load sequence.
- Steps:
  1. Spawn 50 basic enemies
  2. Spawn 20 formation enemies
  3. Spawn 20 swarm enemies
  4. Spawn 50 effects

## Audio reliability suite

Audio tests validate queue/unlock/playback behavior and game-start audio ordering.

Current test names:

- `queue_when_playback_blocked`
- `flush_drops_expired_entries`
- `unlock_resumes_contexts_and_flushes`
- `play_routes_buffer_sound`
- `set_volume_updates_html_audio_only`
- `game_start_unlocks_before_music`

Run one test:

```javascript
audioTests.run('game_start_unlocks_before_music');
```

Run all tests:

```javascript
audioTests.runAll();
```

## Useful advanced commands

Clear monitor data:

```javascript
testManager.monitor.clear();
```

Check if a stress test is active:

```javascript
if (testManager.tests.active) {
  console.log('Active scenario:', testManager.tests.scenario.name);
}
```

## Optimization tips

- If enemy-heavy tests drop FPS:
  - cap concurrent enemies,
  - reduce multi-unit enemy size,
  - simplify enemy draw paths and shadows.
- If bullet-heavy tests drop FPS:
  - cap bullet groups,
  - optimize collision checks,
  - reuse objects where possible.
- If effects-heavy tests drop FPS:
  - limit concurrent effects,
  - reduce particle count per effect,
  - clean inactive effects aggressively.

## Notes

1. Stress tests intentionally alter game state; use in dev/test sessions.
2. Monitoring itself has minor overhead; disable it when not needed.
3. Use a modern browser with Canvas and ES6+ support.

## Troubleshooting

### Monitor does not appear

- Press `Ctrl+P` again.
- Check browser console for runtime errors.
- Confirm `js/test.js` is loaded in `index.html`.

### Test does not start

- Ensure the game is in `playing` state (press **START GAME** first).
- Ensure no other scenario test is currently active.
- Validate command arguments.

### Metrics look unstable

- Close heavy background tabs/apps.
- Let the sample run for a few seconds.
- Re-run the same test scenario for comparison.

