# Lane Shooter

Lane Shooter is a zero-dependency HTML5 Canvas game with a two-lane combat system, scaling enemy waves, permanent upgrade progression, gate events, and built-in in-browser test tools.

## Play Online

**[Play Lane Shooter](https://loolos.github.io/LaneShooter/)**

## Run Locally

No build step is required.

1. From the repository root, start a static server:
   - `python3 -m http.server 8080`
2. Open:
   - `http://localhost:8080/`

## Controls

- `A` / `Left Arrow` / left side tap: move to the left lane
- `D` / `Right Arrow` / right side tap: move to the right lane
- Shooting is automatic

## Gameplay Overview

- Enemies descend from the top; collision with the player ends the run.
- Level and difficulty scale over time.
- Reaching level 20 triggers a victory screen once; after that, the run can continue infinitely.
- Upgrade progress is permanent within a run and shown in the side upgrade panel.

### Enemy roster

Current enemy families include:

- `basic`
- `fast`
- `splinter` (can split into child units)
- `tank`
- `swarm` (multi-unit enemy)
- `formation` (grid-based multi-unit enemy)
- `carrier` (stationary heavy enemy that spawns escorts)

### Gate system

The lane gate system can spawn temporary gameplay modifiers:

- `LaserGate`: fires a lane laser
- `ExperienceGate`: temporary XP multiplier
- `SlowGate`: temporary enemy slow effect

## Upgrade system

The player progression system includes:

- `rapidfire`
- `multishot`
- `powerboost`
- `altlane` (also unlocks the alt ship at higher level)

## Project Structure

```text
LaneShooter/
|- index.html
|- css/
|  `- style.css
|- js/
|  |- main.js       # bootstrap
|  |- game.js       # main loop, state, UI updates
|  |- player.js     # player + alt ship behavior
|  |- enemy.js      # enemy classes + factory
|  |- bullet.js     # bullet group logic
|  |- powerup.js    # powerup classes + factory
|  |- effect.js     # visual effects
|  |- xpText.js     # floating XP text
|  |- gate.js       # gate framework + registry
|  |- audio.js      # audio manager
|  |- test.js       # performance/audio test harness
|  `- utils.js      # shared config + helpers
|- PERFORMANCE_TESTING.md
`- README.md
```

## Configuration

Core game constants live in `js/utils.js` under `CONFIG`, including canvas size, lane positions, spawn rates, enemy speed scaling, and level score thresholds.

## Testing

There is no automated test framework in this repository. Use:

1. Manual gameplay smoke test:
   - Start game
   - Move between lanes
   - Verify enemy spawning, shooting, powerups, level progression, and game-over flow
2. In-browser performance and audio test harness in `js/test.js`:
   - Press `Ctrl+P` to toggle monitor
   - Run console commands such as:
     - `testManager.runTest('manyEnemies', 100)`
     - `testManager.runTest('manyUnits', 20, 20)`
     - `testManager.runTest('manyBullets', 200)`
     - `testManager.runTest('manyEffects', 100)`
     - `testManager.runTest('combined')`
     - `testManager.runTest('audio')`

For full details, see `PERFORMANCE_TESTING.md`.

## Extending the game

- Add new enemies by extending `Enemy` and registering in `EnemyFactory`.
- Add new powerups by extending `Powerup` and registering in `PowerupFactory`.
- Add new gates by extending `BaseGate` and registering in `GateRegistry`.

## License

This project is open source and available for modification and distribution.
