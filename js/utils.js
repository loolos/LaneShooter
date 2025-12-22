/**
 * Utility functions and constants
 */

// Game configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    LANE_COUNT: 2,
    LANE_WIDTH: 400,
    LANE_POSITIONS: [200, 600], // X positions for each lane
    PLAYER_Y: 550,
    PLAYER_SIZE: 30,
    BULLET_SPEED: 8,
    ENEMY_SPAWN_RATE: 0.02, // Probability per frame
    POWERUP_SPAWN_RATE: 0.003, // Probability per frame (slightly increased)
    ENEMY_BASE_SPEED: 2,
    ENEMY_SPEED_INCREMENT: 0.1,
    SCORE_PER_ENEMY: 10,
    LEVEL_UP_SCORE: 300, // Base score required for level 1
    LEVEL_UP_SCORE_INCREMENT: 100 // Additional score needed per level
};

/**
 * Check collision between two rectangles
 */
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * Get lane index from x position
 */
function getLaneIndex(x) {
    for (let i = 0; i < CONFIG.LANE_POSITIONS.length; i++) {
        if (Math.abs(x - CONFIG.LANE_POSITIONS[i]) < CONFIG.LANE_WIDTH / 2) {
            return i;
        }
    }
    return 0;
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Random number between min and max
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

