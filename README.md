# Lane Shooter

A professional web-based lane shooter game where enemies descend from above and players must shoot them while avoiding collisions. Features a dual-lane system, power-ups, and an extensible architecture for easy expansion.

## 🎮 Play Online

**[Play the game here](https://loolos.github.io/LaneShooter/)**

## Features

- **Dual Lane System**: Two lanes for strategic gameplay
- **Enemy Types**: Seven enemy archetypes with distinct behaviors (Basic, Fast, Splinter, Tank, Swarm, Formation, Carrier)
- **Permanent Upgrade System**: Collect power-ups for permanent upgrades that stack and level up (Rapid Fire, Multi Shot, Speed Boost, Lane Speed)
- **Mobile Support**: Touch controls and responsive design for mobile devices
- **Extensible Architecture**: Easy to add new enemies, power-ups, and sound effects
- **Level Progression**: Difficulty increases with score
- **Modern UI**: Clean, responsive interface with smooth animations

## Controls

- **A / Left Arrow / Tap Left Side**: Move to left lane
- **D / Right Arrow / Tap Right Side**: Move to right lane
- **Shooting**: Automatic (no need to press any key)

## Game Mechanics

- Enemies spawn from the top and move downward
- Player must avoid enemy collisions (game over on contact)
- Shooting enemies awards points
- Collect power-ups for **permanent upgrades** that stack and level up
- Game difficulty increases with each level
- **Swarm Enemies**: Visual units decrease as you shoot them

## Architecture

The game is built with a modular, extensible architecture:

### Core Classes

- **Game**: Main game loop and state management
- **Player**: Player movement, shooting, and power-up handling
- **Enemy**: Base enemy class with multiple types
- **Bullet**: Projectile system
- **Powerup**: Base power-up class with multiple types
- **AudioManager**: Sound effect management

### Extensibility

#### Adding New Enemy Types

1. Create a new class extending `Enemy`:
```javascript
class NewEnemy extends Enemy {
    constructor(x, y, laneIndex) {
        super(x, y, laneIndex);
        this.type = 'newenemy';
        this.color = '#colorcode';
        // Customize properties
    }
}
```

2. Register in `EnemyFactory`:
```javascript
const enemyClasses = {
    'basic': BasicEnemy,
    'newenemy': NewEnemy  // Add here
};
```

3. Include it in random spawn balancing (`EnemyFactory.createRandom`) so it can appear during normal gameplay:
```javascript
const weights = {
    // Existing enemy weights...
    'newenemy': 3
};
```

4. If the enemy has special constraints (for example, one-per-lane limits like `carrier`), also update `Game.spawnEnemies()` and any level-up forced-spawn logic.

#### Adding New Power-up Types

1. Create a new class extending `Powerup`:
```javascript
class NewPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'newpowerup';
        this.color = '#colorcode';
        this.duration = 10000;
    }
    
    apply(player) {
        // Implement power-up effect
    }
}
```

2. Register in `PowerupFactory`:
```javascript
const powerupClasses = {
    'rapidfire': RapidFirePowerup,
    'newpowerup': NewPowerup  // Add here
};
```

#### Adding Sound Effects

Use the `AudioManager` to register and play sounds:

```javascript
// Register a sound
audioManager.registerSound('soundname', 'path/to/sound.mp3');

// Play a sound
audioManager.play('soundname');
```

## File Structure

```
LaneShooter/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Game styles
├── js/
│   ├── main.js         # Entry point
│   ├── game.js         # Main game class
│   ├── player.js       # Player class
│   ├── enemy.js        # Enemy system
│   ├── bullet.js       # Bullet class
│   ├── powerup.js      # Power-up system
│   ├── audio.js        # Audio manager
│   └── utils.js        # Utility functions
└── README.md           # This file
```

## Configuration

Game parameters can be adjusted in `js/utils.js`:

- `CANVAS_WIDTH`, `CANVAS_HEIGHT`: Game canvas dimensions
- `LANE_COUNT`: Number of lanes
- `BULLET_SPEED`: Bullet movement speed
- `ENEMY_SPAWN_RATE`: Enemy spawn probability
- `POWERUP_SPAWN_RATE`: Power-up spawn probability
- `ENEMY_BASE_SPEED`: Base enemy speed
- `SCORE_PER_ENEMY`: Points per enemy
- `LEVEL_UP_SCORE`: Score needed per level

## Enemy Spawn & Difficulty Workflow

Enemy generation is controlled by both `js/game.js` and `js/enemy.js`.

### Spawn pipeline

1. `Game.spawnEnemies()` first enforces a hard cap of **50 active enemies**.
2. It computes runtime spawn chance:
   - Base: `CONFIG.ENEMY_SPAWN_RATE`
   - Level scaling: `min(1 + sqrt(level - 1) * 0.1, 2)`
   - Early-level nerf (levels 1-3): `0.78`, `0.86`, `0.94`
3. On a successful spawn roll, lane is chosen randomly and `EnemyFactory.createRandom(...)` picks a type by weights.
4. If all enemies are gone for 500ms, `ensureEnemyPresence()` force-spawns one random enemy to avoid downtime.

### Current type weights (`EnemyFactory.createRandom`)

Level `<= 3`:

| Type | Weight |
|---|---:|
| basic | 15 |
| fast | 15 |
| splinter | 2 |
| tank | 2 |
| swarm | 2 |
| formation | 2 |
| carrier | 0 |

Level `>= 4`:

| Type | Weight |
|---|---:|
| basic | 8 |
| fast | 8 |
| splinter | 5 |
| tank | 5 |
| swarm | 5 |
| formation | 5 |
| carrier | 1 (only when `level >= 5` and lane has no active carrier) |

### Carrier-specific rules

- `carrier` can be selected by random weighting only when:
  - current level is at least 5, and
  - target lane does not already have an active carrier.
- Additional random carrier spawn path in `Game.spawnEnemies()`:
  - active on levels `>= 5` that are **not** multiples of 5,
  - chance per frame: `0.001`,
  - also blocked if that lane already has a carrier.
- Forced spawn on level-up (`Game.onLevelUp()`):
  - at levels `5, 10, 15, ...`,
  - at most once per such level (`carrierSpawnedAtLevels` set),
  - only into a lane without an active carrier.
- Active carriers periodically spawn escort enemies (`formation` or `swarm`) based on carrier `spawnInterval`.

### Balancing notes and common pitfalls

- **Weight changes affect type mix, not overall spawn frequency.** Use `CONFIG.ENEMY_SPAWN_RATE` and spawn-rate scaling for global pacing.
- **Carrier appearance rate is not weight-only.** Lane constraints plus forced/random carrier paths can dominate observed frequency.
- **Empty-screen force spawn can bias perception in sparse moments.** If playtests focus on low-enemy windows, `ensureEnemyPresence()` behavior matters.
- **Only `fast` enemies gain movement speed from level in the main loop.** Other enemy pressure mostly comes from health/type behavior and spawn composition.

## Browser Compatibility

- Modern browsers with HTML5 Canvas support
- Web Audio API support for sound effects
- ES6+ JavaScript support

## Future Enhancements

The architecture supports easy addition of:
- More enemy types with unique behaviors
- Additional power-up types
- Boss enemies
- Particle effects
- Background music
- High score system
- Multiple difficulty modes
- Mobile touch controls

## License

This project is open source and available for modification and distribution.
