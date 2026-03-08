# Lane Shooter

A professional web-based lane shooter game where enemies descend from above and players must shoot them while avoiding collisions. Features a dual-lane system, power-ups, and an extensible architecture for easy expansion.

## 🎮 Play Online

**[Play the game here](https://loolos.github.io/LaneShooter/)**

## Features

- **Dual Lane System**: Two lanes for strategic gameplay
- **Enemy Types**: Multiple enemy types with different behaviors (Basic, Fast, Splinter, Tank, Swarm, Formation, Carrier)
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

## Enemy Spawn & Difficulty Workflow

### Spawn pipeline (codepaths)

Enemy spawning is controlled by a small chain of methods:

1. `Game.spawnEnemies()` in `js/game.js`
   - Applies a hard cap of 50 active enemies.
   - Computes per-frame spawn chance from level.
2. `EnemyFactory.createRandom(...)` in `js/enemy.js`
   - Selects enemy type using weighted random by level.
3. `Game.ensureEnemyPresence(now)` in `js/game.js`
   - If no active enemies remain for 500ms, force-spawns one random enemy to avoid dead air.

### Spawn frequency vs composition

Two systems are applied together:

- **Frequency** (how often enemies appear) from `Game.spawnEnemies()`:

```javascript
spawnRate = CONFIG.ENEMY_SPAWN_RATE
          * Math.min(1 + Math.sqrt(level - 1) * 0.1, 2)
          * earlyLevelSpawnNerf

earlyLevelSpawnNerf = 0.78 (Level 1), 0.86 (Level 2), 0.94 (Level 3), 1.0 (Level 4+)
```

- **Composition** (which enemy types appear) from `EnemyFactory.createRandom(...)` weights.

Changing only weights will not change overall spawn frequency.

### Early-game enemy weights (Level 1-3)

Current weighted mix for early game (`level <= 3`):

| Enemy type | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Basic | 50 | 44 | 38 |
| Fast | 24 | 28 | 32 |
| Splinter | 0 | 8 | 11 |
| Tank | 0 | 6 | 9 |
| Swarm | 0 | 0 | 5 |
| Formation | 0 | 0 | 5 |
| Carrier | 0 | 0 | 0 |

Notes:
- These are **relative weights**, not direct percentages.
- Example normalized distributions:
  - Level 1 total = 74 (Basic 67.6%, Fast 32.4%)
  - Level 2 total = 86 (Basic 51.2%, Fast 32.6%, Splinter 9.3%, Tank 7.0%)
  - Level 3 total = 100 (same as weight percentages)

### Carrier spawn constraints

Carrier behavior is intentionally constrained in multiple places:

- In `createRandom(...)`, carrier weight is non-zero only at level 5+.
- `excludeCarrier` prevents selecting carrier for a lane that already has an active carrier.
- `Game.spawnEnemies()` also has a direct random carrier spawn (`0.001`) for levels 5+ except exact multiples of 5.
- `Game.onLevelUp(...)` force-spawns one carrier at levels divisible by 5 (if a lane is free).

### Balancing checklist (common pitfalls)

When tuning enemy variety:

1. Verify both spawn frequency and composition; they are independent controls.
2. Test long enough to smooth randomness (short 15-30 second sessions can mislead).
3. Keep `ensureEnemyPresence` in mind; it can mask low spawn-rate droughts by injecting enemies.
4. Carrier behavior depends on both weighted spawn and explicit spawn paths.

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
