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

### Audio Reliability Notes

The audio stack now includes explicit browser autoplay mitigation for short SFX
(`levelup`, `laserWarmup`, `laserFire`, etc.):

- A shared SFX `AudioContext` is created via `getSfxContext()`.
- `unlockAudio()` resumes both SFX and music contexts, then flushes queued SFX.
- Short buffer-backed SFX use `playBufferedSound(buffer, volume)`:
  - If playback is currently blocked, the sound is queued.
  - Queue is capped at 24 entries (oldest entries are dropped first).
  - Queued entries older than 1.5 seconds are discarded during flush.
- At game start, `Game.start()` calls `audioManager.unlockAudio()` before
  `startBackgroundMusic(...)` so first-use SFX are less likely to be missed.

For gate laser flow in `Game`:
- `fireLaneLaser(...)` triggers `laserWarmup` immediately.
- After warmup ends, lane laser enters firing phase and plays `laserFire`.

In-browser regression coverage for this behavior is implemented in
`js/test.js` (`AudioTestSuite`), runnable via browser console.

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
