# Lane Shooter

A professional web-based lane shooter game where enemies descend from above and players must shoot them while avoiding collisions. Features a dual-lane system, power-ups, and an extensible architecture for easy expansion.

## 🎮 Play Online

**[Play the game here](https://loolos.github.io/LaneShooter/)**

## Features

- **Dual Lane System**: Two lanes for strategic gameplay
- **Enemy Types**: Multiple enemy types with different behaviors (Basic, Fast, Tank, Swarm)
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
- **Anti-empty-screen safeguard**: while the game is in `playing` state, if no active enemies remain for 500ms, the game force-spawns one random enemy to keep combat continuous

## Enemy Spawn Workflow (Developer Notes)

This section documents the runtime spawn flow in `js/game.js` and `js/enemy.js`.

### Per-frame flow (`Game.update`)

1. `spawnEnemies()` runs first (random spawn logic + carrier checks)
2. Existing enemies are updated/cleaned up
3. `ensureEnemyPresence(now)` runs to prevent prolonged empty screens

Code paths:
- `js/game.js` → `spawnEnemies()`
- `js/game.js` → `ensureEnemyPresence(now)`
- `js/enemy.js` → `EnemyFactory.createRandom(...)`

### Spawn constraints and formulas

- **Active enemy cap**: `spawnEnemies()` stops random spawning when active enemies reach **50**
- **Base spawn rate**: starts from `CONFIG.ENEMY_SPAWN_RATE` and is scaled by:
  - level growth factor: `min(1 + sqrt(level - 1) * 0.1, 2)`
  - early-level nerf (levels 1-3): `0.78`, `0.86`, `0.94`
- **Carrier lane rule**: random lane spawns pass an `excludeCarrier` flag when that lane already has an active carrier
- **Forced spawn fallback**: when no active enemies exist for `>= 500ms`, one enemy is spawned at `y = -40` in a random lane

### Why this fallback exists

At low probability rolls or after fast cleanups, players could briefly see no enemies on screen.  
`ensureEnemyPresence(now)` guarantees combat resumes quickly without waiting indefinitely for probability-based spawning.

## Troubleshooting Spawn Behavior

### "I still see short moments with no enemies"

Expected: the safeguard triggers after a **500ms** empty window, not instantly.

### "No enemies spawn at all"

Check in order:

1. Game state is actually `playing` (spawn/update logic is skipped outside `playing`)
2. `Game.update()` is running each frame from the main loop
3. You did not accidentally remove `this.ensureEnemyPresence(now)` from `update()`
4. `CONFIG.LANE_COUNT` and `CONFIG.LANE_POSITIONS` are valid (spawn needs a valid lane index and X position)

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
