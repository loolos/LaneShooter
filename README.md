# Lane Shooter

A professional web-based lane shooter game where enemies descend from above and players must shoot them while avoiding collisions. Features a dual-lane system, power-ups, and an extensible architecture for easy expansion.

## 🎮 Play Online

**[Play the game here](https://loolos.github.io/LaneShooter/)**

## Features

- **Dual Lane System**: Two lanes for strategic gameplay
- **Enemy Types**: Seven enemy archetypes with distinct behaviors (Basic, Fast, Tank, Splinter, Swarm, Formation, Carrier)
- **Permanent Upgrade System**: Collect power-ups for permanent upgrades that stack and level up (Rapid Fire, Multi Shot, Power Boost, Alt Lane)
- **Mobile Support**: Touch controls and responsive design for mobile devices
- **Extensible Architecture**: Easy to add new enemies, power-ups, and sound effects
- **Level Progression**: Difficulty increases with score
- **Modern UI**: Clean, responsive interface with smooth animations

## Controls

- **A / Left Arrow**: Move to left lane
- **D / Right Arrow**: Move to right lane
- **Tap / Click on canvas**: Toggle to the other lane
- **Shooting**: Automatic (no need to press any key)

## Game Mechanics

- Enemies spawn from the top and move downward
- Player must avoid enemy collisions (game over on contact)
- Shooting enemies awards points
- Collect power-ups for **permanent upgrades** that stack and level up
- Game difficulty increases with each level
- **Swarm Enemies**: Visual units decrease as you shoot them
- Random lane power-ups stop spawning at level 5+ (`Game.spawnPowerups`)
- Standard upgrade power-ups grant **10 XP** per pickup (`js/powerup.js`)
- Enemy XP gain can be immediate or dropped as collectible XP power-ups depending on XP size (`Game.gainExperienceFromEnemy`)

### Enemy Spawn Workflow (Current Implementation)

`EnemyFactory.createRandom(...)` selects enemy types by weighted randomness, with level-dependent weights:

- `basic`: base weight 50
- `fast`: `15 + (level - 1) * 4`
- `splinter`: `10 + (level - 1) * 2`
- `tank`: `10 + (level - 1) * 3`
- `swarm`: `12 + (level - 1) * 2`
- `formation`: `13 + (level - 1) * 2`
- `carrier`: `0` before level 5, then `5 + (level - 5) * 2`

Additional carrier rules in `Game`:

- At non-multiple-of-5 levels (`level >= 5`), a carrier can appear with low chance if none is active
- At levels divisible by 5, one carrier is force-spawned once per level during level-up handling
- Active carriers periodically spawn only `formation` or `swarm` enemies

### XP / Power-up Workflow

- Random map power-ups (`rapidfire`, `multishot`, `powerboost`, `altlane`) are created via `PowerupFactory.createRandom(...)`
- Each of the four standard upgrade power-ups gives **10 XP** to its matching track
- Enemy-derived XP is routed through `Game.gainExperienceFromEnemy(...)`:
  - Small XP is granted immediately to a random upgrade type
  - Large XP creates an `experience` pickup (`ExperiencePowerup`) bound to one upgrade type
- `experience` pickups reuse the same icon family as upgrade power-ups, based on the bound upgrade type

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

Core balance constants live in `js/utils.js`:

- `CANVAS_WIDTH`, `CANVAS_HEIGHT`: Game canvas dimensions
- `LANE_COUNT`: Number of lanes
- `BULLET_SPEED`: Bullet movement speed
- `ENEMY_SPAWN_RATE`: Base enemy spawn probability per frame (`0.016`)
- `POWERUP_SPAWN_RATE`: Random power-up spawn probability per frame (`0.003`)
- `ENEMY_BASE_SPEED`: Base enemy speed
- `SCORE_PER_ENEMY`: Points per enemy

Other important tuning logic is implemented directly in `js/game.js`:

- Enemy spawn is scaled at runtime by level: `baseRate * min(1 + sqrt(level - 1) * 0.1, 2)`
- Random map power-up spawning is disabled at level 5+
- Level progression currently uses a score/time formula in `Game.update()` (not `LEVEL_UP_SCORE` constants)

### Common Tuning Pitfalls

- Changing `POWERUP_SPAWN_RATE` only affects levels 1-4 due to the level gate in `spawnPowerups()`
- Changing `ENEMY_SPAWN_RATE` impacts all levels, but real spawn frequency is also multiplied by level scaling in `spawnEnemies()`

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
