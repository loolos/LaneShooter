/**
 * Performance Testing and Monitoring System
 * Provides tools to simulate high-load scenarios and monitor performance
 */

class PerformanceMonitor {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.showPanel = false;
        this.panel = null;
        
        // Performance metrics
        this.frameTimes = [];
        this.maxFrameHistory = 300; // Keep last 5 seconds at 60fps
        this.fps = 60;
        this.avgFrameTime = 16.67; // ms
        this.minFrameTime = 16.67;
        this.maxFrameTime = 16.67;
        
        // Entity counts
        this.entityCounts = {
            enemies: 0,
            bulletGroups: 0,
            effects: 0,
            powerups: 0,
            xpTexts: 0
        };
        
        // Performance warnings
        this.warningThreshold = 33; // ms (30fps)
        this.criticalThreshold = 50; // ms (20fps)
        this.warnings = [];
        
        // Test scenarios
        this.testActive = false;
        this.testScenario = null;
        this.testStartTime = 0;
        this.testDuration = 0;
        
        this.initPanel();
    }
    
    /**
     * Initialize performance monitoring panel
     */
    initPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'performancePanel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid #00ff00;
        `;
        
        document.body.appendChild(this.panel);
        this.updatePanel();
    }
    
    /**
     * Enable/disable performance monitoring
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled && !this.showPanel) {
            this.showPanel = true;
            this.panel.style.display = 'block';
        } else if (!this.enabled) {
            this.showPanel = false;
            this.panel.style.display = 'none';
        }
    }
    
    /**
     * Update performance metrics
     */
    update(frameTime) {
        if (!this.enabled) return;
        
        // Update frame time history
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameHistory) {
            this.frameTimes.shift();
        }
        
        // Calculate FPS and frame time stats
        this.fps = Math.round(1000 / frameTime);
        this.avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.minFrameTime = Math.min(...this.frameTimes);
        this.maxFrameTime = Math.max(...this.frameTimes);
        
        // Update entity counts
        if (this.game) {
            this.entityCounts.enemies = this.game.enemies ? this.game.enemies.filter(e => e.active).length : 0;
            this.entityCounts.bulletGroups = this.game.player && this.game.player.bulletGroups ? 
                this.game.player.bulletGroups.filter(bg => bg.active && bg.remainingCount > 0).length : 0;
            this.entityCounts.effects = this.game.effects ? this.game.effects.filter(e => e.active).length : 0;
            this.entityCounts.powerups = this.game.powerups ? this.game.powerups.filter(p => p.active).length : 0;
            this.entityCounts.xpTexts = this.game.xpTexts ? this.game.xpTexts.filter(x => x.active).length : 0;
        }
        
        // Check for performance warnings
        if (frameTime > this.criticalThreshold) {
            this.warnings.push({
                time: Date.now(),
                type: 'critical',
                frameTime: frameTime.toFixed(2),
                entities: { ...this.entityCounts }
            });
        } else if (frameTime > this.warningThreshold) {
            this.warnings.push({
                time: Date.now(),
                type: 'warning',
                frameTime: frameTime.toFixed(2),
                entities: { ...this.entityCounts }
            });
        }
        
        // Keep only last 50 warnings
        if (this.warnings.length > 50) {
            this.warnings.shift();
        }
        
        this.updatePanel();
    }
    
    /**
     * Update performance panel display
     */
    updatePanel() {
        if (!this.panel) return;
        
        const fpsColor = this.fps >= 55 ? '#00ff00' : this.fps >= 30 ? '#ffff00' : '#ff0000';
        const frameTimeColor = this.avgFrameTime < 20 ? '#00ff00' : this.avgFrameTime < 33 ? '#ffff00' : '#ff0000';
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444;">
                <h3 style="margin: 0; color: #00ff00;">Performance Monitor</h3>
                <button id="closeMonitor" style="background: #ff0000; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">X</button>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Frame Rate:</strong>
                <span style="color: ${fpsColor};">${this.fps} FPS</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Frame Time:</strong>
                <span style="color: ${frameTimeColor};">
                    Avg: ${this.avgFrameTime.toFixed(2)}ms | 
                    Min: ${this.minFrameTime.toFixed(2)}ms | 
                    Max: ${this.maxFrameTime.toFixed(2)}ms
                </span>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                <strong>Entity Counts:</strong><br>
                Enemies: <span style="color: ${this.entityCounts.enemies > 50 ? '#ff0000' : '#00ff00'}">${this.entityCounts.enemies}</span><br>
                Bullet Groups: <span style="color: ${this.entityCounts.bulletGroups > 100 ? '#ff0000' : '#00ff00'}">${this.entityCounts.bulletGroups}</span><br>
                Effects: <span style="color: ${this.entityCounts.effects > 30 ? '#ff0000' : '#00ff00'}">${this.entityCounts.effects}</span><br>
                Powerups: ${this.entityCounts.powerups}<br>
                XP Texts: ${this.entityCounts.xpTexts}
            </div>
        `;
        
        // Add test scenario info
        if (this.testActive && this.testScenario) {
            html += `
                <div style="margin-bottom: 10px; padding: 10px; background: rgba(255,255,0,0.2); border-radius: 4px;">
                    <strong>Test Active:</strong> ${this.testScenario.name}<br>
                    Duration: ${(Date.now() - this.testStartTime) / 1000}s
                </div>
            `;
        }
        
        // Add warnings section
        if (this.warnings.length > 0) {
            const recentWarnings = this.warnings.slice(-5).reverse();
            html += `
                <div style="margin-top: 10px; padding: 10px; background: rgba(255,0,0,0.2); border-radius: 4px;">
                    <strong>Recent Warnings (last 5):</strong><br>
                    ${recentWarnings.map(w => `
                        <div style="font-size: 10px; margin-top: 5px;">
                            [${new Date(w.time).toLocaleTimeString()}] ${w.type.toUpperCase()}: 
                            ${w.frameTime}ms | 
                            E:${w.entities.enemies} B:${w.entities.bulletGroups} FX:${w.entities.effects}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        this.panel.innerHTML = html;
        
        // Add close button handler
        const closeBtn = document.getElementById('closeMonitor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggle();
            });
        }
    }
    
    /**
     * Clear performance data
     */
    clear() {
        this.frameTimes = [];
        this.warnings = [];
        this.fps = 60;
        this.avgFrameTime = 16.67;
        this.minFrameTime = 16.67;
        this.maxFrameTime = 16.67;
    }
}

/**
 * Performance Test Scenarios
 */
class PerformanceTest {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.scenario = null;
    }
    
    /**
     * Test scenario: Spawn many enemies
     */
    testManyEnemies(count = 100, enemyType = 'basic') {
        if (!this.game || this.game.state !== 'playing') {
            console.warn('Game must be in playing state to run test');
            return;
        }
        
        this.active = true;
        this.scenario = {
            name: `Many Enemies (${count}x ${enemyType})`,
            type: 'manyEnemies',
            count: count,
            enemyType: enemyType,
            spawnInterval: 100, // Spawn every 100ms
            spawnCount: 0,
            lastSpawnTime: Date.now()
        };
        
        console.log(`Starting test: ${this.scenario.name}`);
    }
    
    /**
     * Test scenario: Spawn Formation/Swarm enemies (high unit count)
     */
    testManyUnits(formationCount = 20, swarmCount = 20) {
        if (!this.game || this.game.state !== 'playing') {
            console.warn('Game must be in playing state to run test');
            return;
        }
        
        this.active = true;
        this.scenario = {
            name: `Many Units (${formationCount} formations + ${swarmCount} swarms)`,
            type: 'manyUnits',
            formationCount: formationCount,
            swarmCount: swarmCount,
            spawnedFormations: 0,
            spawnedSwarms: 0,
            spawnInterval: 200,
            lastSpawnTime: Date.now()
        };
        
        console.log(`Starting test: ${this.scenario.name}`);
    }
    
    /**
     * Test scenario: Spawn many bullet groups
     */
    testManyBullets(bulletGroupCount = 200) {
        if (!this.game || this.game.state !== 'playing' || !this.game.player) {
            console.warn('Game must be in playing state with player to run test');
            return;
        }
        
        this.active = true;
        // Boost player multishot to create many bullets
        const oldMultishot = this.game.player.upgrades.multishot;
        this.game.player.upgrades.multishot = Math.max(50, bulletGroupCount / 2);
        
        this.scenario = {
            name: `Many Bullets (${bulletGroupCount} groups)`,
            type: 'manyBullets',
            count: bulletGroupCount,
            originalMultishot: oldMultishot
        };
        
        // Rapidly shoot many bullet groups
        let shotCount = 0;
        const shootInterval = setInterval(() => {
            if (shotCount >= bulletGroupCount || !this.active) {
                clearInterval(shootInterval);
                if (this.active) {
                    this.stop();
                }
                return;
            }
            this.game.player.shoot(this.game.audioManager);
            shotCount++;
        }, 50); // Shoot every 50ms
        
        console.log(`Starting test: ${this.scenario.name}`);
    }
    
    /**
     * Test scenario: Create many effects
     */
    testManyEffects(effectCount = 100) {
        if (!this.game || this.game.state !== 'playing') {
            console.warn('Game must be in playing state to run test');
            return;
        }
        
        this.active = true;
        this.scenario = {
            name: `Many Effects (${effectCount})`,
            type: 'manyEffects',
            count: effectCount
        };
        
        // Create many explosion effects
        const canvasWidth = this.game.canvas.width;
        const canvasHeight = this.game.canvas.height;
        
        for (let i = 0; i < effectCount; i++) {
            const x = Math.random() * canvasWidth;
            const y = Math.random() * canvasHeight;
            const effect = EffectManager.createEffect(x, y, 'basic');
            this.game.effects.push(effect);
        }
        
        console.log(`Starting test: ${this.scenario.name}`);
    }
    
    /**
     * Test scenario: Combined stress test
     */
    testCombinedStress() {
        if (!this.game || this.game.state !== 'playing') {
            console.warn('Game must be in playing state to run test');
            return;
        }
        
        this.active = true;
        this.scenario = {
            name: 'Combined Stress Test',
            type: 'combined',
            steps: [
                { action: 'manyEnemies', count: 50, type: 'basic' },
                { action: 'manyEnemies', count: 20, type: 'formation' },
                { action: 'manyEnemies', count: 20, type: 'swarm' },
                { action: 'manyEffects', count: 50 }
            ],
            currentStep: 0
        };
        
        // Execute first step
        this.executeStressStep();
        
        console.log(`Starting test: ${this.scenario.name}`);
    }
    
    /**
     * Execute a step in combined stress test
     */
    executeStressStep() {
        if (!this.scenario || this.scenario.type !== 'combined') return;
        
        const step = this.scenario.steps[this.scenario.currentStep];
        if (!step) {
            this.stop();
            return;
        }
        
        if (step.action === 'manyEnemies') {
            for (let i = 0; i < step.count; i++) {
                setTimeout(() => {
                    const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const enemy = EnemyFactory.create(step.type || 'basic', x, -40, laneIndex, this.game.level);
                    this.game.enemies.push(enemy);
                }, i * 50);
            }
        } else if (step.action === 'manyEffects') {
            for (let i = 0; i < step.count; i++) {
                const x = Math.random() * this.game.canvas.width;
                const y = Math.random() * this.game.canvas.height;
                const effect = EffectManager.createEffect(x, y, 'basic');
                this.game.effects.push(effect);
            }
        }
        
        this.scenario.currentStep++;
        if (this.scenario.currentStep < this.scenario.steps.length) {
            setTimeout(() => this.executeStressStep(), 2000);
        } else {
            setTimeout(() => this.stop(), 5000);
        }
    }
    
    /**
     * Update test scenario
     */
    update() {
        if (!this.active || !this.scenario) return;
        
        const now = Date.now();
        
        if (this.scenario.type === 'manyEnemies') {
            // Spawn enemies over time
            if (now - this.scenario.lastSpawnTime >= this.scenario.spawnInterval) {
                if (this.scenario.spawnCount < this.scenario.count) {
                    const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const enemy = EnemyFactory.create(
                        this.scenario.enemyType, 
                        x, 
                        -40, 
                        laneIndex, 
                        this.game.level
                    );
                    this.game.enemies.push(enemy);
                    this.scenario.spawnCount++;
                    this.scenario.lastSpawnTime = now;
                } else {
                    // All enemies spawned, stop after a delay
                    setTimeout(() => this.stop(), 10000);
                }
            }
        } else if (this.scenario.type === 'manyUnits') {
            // Spawn Formation/Swarm enemies
            if (now - this.scenario.lastSpawnTime >= this.scenario.spawnInterval) {
                if (this.scenario.spawnedFormations < this.scenario.formationCount) {
                    const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const enemy = EnemyFactory.create('formation', x, -40, laneIndex, this.game.level);
                    this.game.enemies.push(enemy);
                    this.scenario.spawnedFormations++;
                    this.scenario.lastSpawnTime = now;
                } else if (this.scenario.spawnedSwarms < this.scenario.swarmCount) {
                    const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const enemy = EnemyFactory.create('swarm', x, -40, laneIndex, this.game.level);
                    this.game.enemies.push(enemy);
                    this.scenario.spawnedSwarms++;
                    this.scenario.lastSpawnTime = now;
                } else {
                    setTimeout(() => this.stop(), 10000);
                }
            }
        }
    }
    
    /**
     * Stop current test
     */
    stop() {
        if (!this.active) return;
        
        // Restore original values if needed
        if (this.scenario && this.scenario.type === 'manyBullets' && this.scenario.originalMultishot !== undefined) {
            if (this.game && this.game.player) {
                this.game.player.upgrades.multishot = this.scenario.originalMultishot;
            }
        }
        
        console.log(`Test stopped: ${this.scenario ? this.scenario.name : 'Unknown'}`);
        this.active = false;
        this.scenario = null;
    }
}

/**
 * Global test manager
 */
class TestManager {
    constructor(game) {
        this.game = game;
        this.monitor = new PerformanceMonitor(game);
        this.tests = new PerformanceTest(game);
        
        // Expose to window for console access
        window.testManager = this;
        window.perfMonitor = this.monitor;
        window.perfTest = this.tests;
        
        // Add keyboard shortcut to toggle monitor (Press 'P')
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p' && e.ctrlKey) {
                e.preventDefault();
                this.monitor.toggle();
            }
        });
        
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Performance Test & Monitor System Loaded            ║
╠══════════════════════════════════════════════════════════════╣
║  Press Ctrl+P to toggle performance monitor                  ║
║                                                              ║
║  Available test commands (in console):                       ║
║  • testManager.runTest('manyEnemies', 100)                   ║
║  • testManager.runTest('manyUnits', 20, 20)                  ║
║  • testManager.runTest('manyBullets', 200)                   ║
║  • testManager.runTest('manyEffects', 100)                   ║
║  • testManager.runTest('combined')                           ║
║  • testManager.stopTest()                                    ║
║  • testManager.monitor.toggle()                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
    }
    
    /**
     * Run a test scenario
     */
    runTest(testType, ...args) {
        if (this.tests.active) {
            console.warn('A test is already running. Stop it first with testManager.stopTest()');
            return;
        }
        
        // Enable monitor automatically
        if (!this.monitor.enabled) {
            this.monitor.toggle();
        }
        this.monitor.clear();
        
        switch (testType) {
            case 'manyEnemies':
                const [count, type] = args;
                this.tests.testManyEnemies(count || 100, type || 'basic');
                break;
            case 'manyUnits':
                const [formationCount, swarmCount] = args;
                this.tests.testManyUnits(formationCount || 20, swarmCount || 20);
                break;
            case 'manyBullets':
                this.tests.testManyBullets(args[0] || 200);
                break;
            case 'manyEffects':
                this.tests.testManyEffects(args[0] || 100);
                break;
            case 'combined':
                this.tests.testCombinedStress();
                break;
            default:
                console.warn(`Unknown test type: ${testType}`);
                console.log('Available tests: manyEnemies, manyUnits, manyBullets, manyEffects, combined');
        }
        
        if (this.tests.scenario) {
            this.monitor.testActive = true;
            this.monitor.testScenario = this.tests.scenario;
            this.monitor.testStartTime = Date.now();
        }
    }
    
    /**
     * Stop current test
     */
    stopTest() {
        this.tests.stop();
        this.monitor.testActive = false;
        this.monitor.testScenario = null;
    }
    
    /**
     * Update test system (call from game loop)
     */
    update(frameTime) {
        this.monitor.update(frameTime);
        this.tests.update();
        
        // Update test duration
        if (this.monitor.testActive && this.monitor.testStartTime) {
            this.monitor.testDuration = Date.now() - this.monitor.testStartTime;
        }
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor, PerformanceTest, TestManager };
}
