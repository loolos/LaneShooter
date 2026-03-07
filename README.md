# Lane Shooter

A professional web-based lane shooter game where enemies descend from above and players must shoot them while avoiding collisions. Features a dual-lane system, power-ups, and an extensible architecture for easy expansion.

## 🎮 Play Online

**[Play the game here](https://loolos.github.io/LaneShooter/)**

## Features

- **Dual Lane System**: Two lanes for strategic gameplay
- **Enemy Types**: Multiple enemy types with different behaviors (Basic, Fast, Tank, Swarm)
- **Permanent Upgrade System**: Collect power-ups for permanent upgrades that stack and level up (Rapid Fire, Multi Shot, Speed Boost, Lane Speed)
- **Lane Gate Events**: Procedural gate system with lane-targeted effects (Laser strike / XP multiplier)
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
- **Gate Events**:
  - **Laser Gate**: charges, then repeatedly damages enemies in one lane
  - **Experience Gate**: temporarily doubles XP gain (`x2`)

## Architecture

The game is built with a modular, extensible architecture:

### Core Classes

- **Game**: Main game loop and state management
- **Player**: Player movement, shooting, and power-up handling
- **Enemy**: Base enemy class with multiple types
- **Bullet**: Projectile system
- **Powerup**: Base power-up class with multiple types
- **AudioManager**: Sound effect management
- **GateManager / GateRegistry**: Timed gate spawning and weighted gate selection
- **BaseGate / LaserGate / ExperienceGate**: Gate behavior and effects

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

### Gate System Workflow

Gate behavior is implemented through `GateManager` + `GateRegistry` (`js/gate.js`) and integrated in `Game` (`js/game.js`).

#### Spawn lifecycle

1. `GateManager.update()` schedules spawns only while `game.state === 'playing'`.
2. Only **one active gate** is allowed on screen at a time.
3. Spawn lane is weighted by enemy density:
   - lane weight = `1 + enemiesInLane * 1.8`
4. Gate type is weighted in registry:
   - `laser` gets higher weight as lane/total enemy pressure rises
   - `experience` has constant baseline weight

#### Gate effects

- **LaserGate**
  - Trigger: `onPass()` -> `game.fireLaneLaser(laneIndex)`
  - Timeline:
    - Warmup: `1000ms` (`laserWarmup` SFX)
    - Fire duration: random `3000-5000ms` (`laserFire` SFX on fire start)
    - Tick rate: every `500ms`
  - Per tick damage: `max(1, floor(enemy.maxHealth * 0.05))`
  - Scope: only enemies in the same lane **and ahead of the player**

- **ExperienceGate**
  - Trigger: `onPass()` -> `game.activateExperienceGateBoost(10000, 2)`
  - Effect: `x2` XP for `10s` for XP sources that go through game XP helpers

#### Visual/UI states in `Game`

- `gateSubtitle`: center subtitle when a gate triggers
- `laserLaneEffect`: warmup/firing overlay and tick state
- `experienceBoostUntil` + `experienceMultiplier`: XP gate buff window

### Gate & Audio Debug Runbook (Manual)

After opening the game and clicking **START GAME**:

1. Open browser console.
2. Use exposed test handle:
   ```javascript
   const game = testManager.game;
   ```
3. Trigger Laser flow immediately:
   ```javascript
   game.fireLaneLaser(game.player.laneIndex);
   ```
4. Trigger XP gate immediately:
   ```javascript
   game.activateExperienceGateBoost(10000, 2);
   console.log(game.getCurrentExperienceMultiplier()); // Expect 2 while active
   ```
5. End-to-end gate callback check (without waiting for spawn):
   ```javascript
   new LaserGate(game.player.laneIndex).onPass(game);
   new ExperienceGate(game.player.laneIndex).onPass(game);
   ```

### Troubleshooting (Gates / Audio)

- **No gate sound plays**
  - Browser autoplay restrictions require a user gesture first.
  - Click **START GAME** before expecting Web Audio sounds.
- **Laser visual appears but enemies are not damaged**
  - Laser only hits enemies in the same lane and **in front of player Y**.
- **XP x2 “stops” unexpectedly**
  - Expected: boost expires after 10 seconds.
  - `activateExperienceGateBoost` extends from current expiry if reapplied.
- **Gates seem to spawn rarely**
  - Intentional: one active gate max; base interval is long and level-scaled.

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
│   ├── gate.js         # Gate system (Laser/XP gates)
│   ├── effect.js       # Visual effects
│   ├── test.js         # Performance test harness
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
