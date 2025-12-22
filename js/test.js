/**
 * Automated Test System for Lane Shooter
 * Simulates game execution to detect bugs, infinite loops, and performance issues
 */

class GameTester {
    constructor() {
        this.testResults = [];
        this.maxIterations = 10000; // Maximum iterations to prevent infinite loops
        this.performanceThreshold = 16; // 60fps threshold in ms
        this.memoryLeakThreshold = 1000; // Max entities before warning
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('=== Starting Game Tests ===');
        
        this.testResults = [];
        
        // Test 1: Basic game initialization
        this.testGameInitialization();
        
        // Test 2: Game loop performance
        this.testGameLoopPerformance();
        
        // Test 3: Entity spawning and cleanup
        this.testEntityManagement();
        
        // Test 4: Collision detection performance
        this.testCollisionDetection();
        
        // Test 5: Audio system stability
        this.testAudioSystem();
        
        // Test 6: Memory leak detection
        this.testMemoryLeaks();
        
        // Test 7: Stress test with many entities
        this.testStressScenario();
        
        // Test 8: Simulate gameplay session
        this.testGameplaySession();
        
        // Print results
        this.printResults();
        
        return this.testResults;
    }

    /**
     * Test 1: Game initialization
     */
    testGameInitialization() {
        console.log('Test 1: Game Initialization...');
        const startTime = performance.now();
        
        try {
            const game = new Game('gameCanvas');
            const initTime = performance.now() - startTime;
            
            // Check if game initialized correctly
            const checks = {
                gameExists: game !== null,
                canvasExists: game.canvas !== null,
                audioManagerExists: game.audioManager !== null,
                initialState: game.state === 'menu',
                initTime: initTime < 100 // Should initialize quickly
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Game Initialization', passed, checks, initTime);
            
        } catch (error) {
            this.recordTest('Game Initialization', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 2: Game loop performance
     */
    testGameLoopPerformance() {
        console.log('Test 2: Game Loop Performance...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            const iterations = 100;
            const times = [];
            let lastEntityCount = { enemies: 0, bullets: 0, powerups: 0 };
            
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                
                // Simulate one frame
                game.handleInput();
                game.update();
                game.draw();
                
                const duration = performance.now() - start;
                times.push(duration);
                
                // Check for entity explosion every 10 iterations
                if (i % 10 === 0) {
                    const currentCounts = {
                        enemies: game.enemies.length,
                        bullets: game.player.bullets.length,
                        powerups: game.powerups.length
                    };
                    
                    // Check if entities are growing too fast
                    if (currentCounts.enemies > lastEntityCount.enemies + 50 ||
                        currentCounts.bullets > lastEntityCount.bullets + 50) {
                        this.recordTest('Game Loop Performance', false, {
                            warning: 'Entity explosion detected',
                            iteration: i,
                            lastCounts: lastEntityCount,
                            currentCounts
                        }, duration);
                        return;
                    }
                    lastEntityCount = currentCounts;
                }
                
                // Safety check: stop if taking too long
                if (duration > 100) {
                    this.recordTest('Game Loop Performance', false, {
                        warning: 'Frame took too long',
                        iteration: i,
                        duration: duration.toFixed(2)
                    }, duration);
                    return;
                }
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);
            const minTime = Math.min(...times);
            
            const checks = {
                averageTime: avgTime < this.performanceThreshold,
                maxTime: maxTime < this.performanceThreshold * 2,
                minTime: minTime >= 0,
                iterations: iterations
            };
            
            const passed = checks.averageTime && checks.maxTime;
            this.recordTest('Game Loop Performance', passed, {
                ...checks,
                avgTimeMs: avgTime.toFixed(2),
                maxTimeMs: maxTime.toFixed(2),
                minTimeMs: minTime.toFixed(2)
            }, avgTime);
            
        } catch (error) {
            this.recordTest('Game Loop Performance', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 3: Entity management
     */
    testEntityManagement() {
        console.log('Test 3: Entity Management...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            // Simulate spawning many enemies
            const spawnCount = 50;
            for (let i = 0; i < spawnCount; i++) {
                game.spawnEnemies();
            }
            
            // Simulate many updates
            for (let i = 0; i < 100; i++) {
                game.update();
            }
            
            const checks = {
                enemiesCleaned: game.enemies.length < spawnCount * 2, // Should clean up off-screen enemies
                noInfiniteGrowth: game.enemies.length < this.memoryLeakThreshold,
                powerupsReasonable: game.powerups.length < 100,
                bulletsReasonable: game.player.bullets.length < 200
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Entity Management', passed, {
                ...checks,
                enemyCount: game.enemies.length,
                powerupCount: game.powerups.length,
                bulletCount: game.player.bullets.length
            }, 0);
            
        } catch (error) {
            this.recordTest('Entity Management', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 4: Collision detection performance
     */
    testCollisionDetection() {
        console.log('Test 4: Collision Detection Performance...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            // Create many enemies and bullets
            for (let i = 0; i < 20; i++) {
                game.spawnEnemies();
            }
            
            // Fire many bullets
            for (let i = 0; i < 10; i++) {
                game.player.shoot(game.audioManager);
            }
            
            const start = performance.now();
            
            // Run collision detection many times
            for (let i = 0; i < 50; i++) {
                game.update();
            }
            
            const duration = performance.now() - start;
            const avgTime = duration / 50;
            
            const checks = {
                collisionTime: avgTime < this.performanceThreshold * 2,
                noInfiniteLoop: duration < 5000, // Should complete in 5 seconds
                entitiesReasonable: game.enemies.length < 100 && game.player.bullets.length < 200
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Collision Detection', passed, {
                ...checks,
                avgTimeMs: avgTime.toFixed(2),
                totalTimeMs: duration.toFixed(2)
            }, avgTime);
            
        } catch (error) {
            this.recordTest('Collision Detection', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 5: Audio system stability
     */
    testAudioSystem() {
        console.log('Test 5: Audio System Stability...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            // Simulate tension changes
            for (let i = 0; i < 100; i++) {
                const tension = Math.random();
                game.audioManager.updateMusicTension(tension);
                game.update();
            }
            
            // Check audio system state
            const checks = {
                audioContextExists: game.audioManager.musicContext !== null,
                noExcessiveIntervals: Object.keys(game.audioManager.patternIntervals || {}).length < 10,
                noExcessiveOscillators: (game.audioManager.musicOscillators || []).length < 20,
                killQueueReasonable: (game.audioManager.killAccentQueue || []).length < 100
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Audio System Stability', passed, checks, 0);
            
        } catch (error) {
            this.recordTest('Audio System Stability', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 6: Memory leak detection
     */
    testMemoryLeaks() {
        console.log('Test 6: Memory Leak Detection...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            const initialCounts = {
                enemies: game.enemies.length,
                powerups: game.powerups.length,
                bullets: game.player.bullets.length,
                effects: game.effects.length
            };
            
            // Run many updates
            for (let i = 0; i < 500; i++) {
                game.update();
                
                // Check for excessive growth
                if (i % 100 === 0) {
                    const currentCounts = {
                        enemies: game.enemies.length,
                        powerups: game.powerups.length,
                        bullets: game.player.bullets.length,
                        effects: game.effects.length
                    };
                    
                    // Check if any entity type is growing unbounded
                    if (currentCounts.enemies > this.memoryLeakThreshold ||
                        currentCounts.powerups > this.memoryLeakThreshold ||
                        currentCounts.bullets > this.memoryLeakThreshold ||
                        currentCounts.effects > this.memoryLeakThreshold) {
                        this.recordTest('Memory Leak Detection', false, {
                            iteration: i,
                            initialCounts,
                            currentCounts,
                            warning: 'Excessive entity growth detected'
                        }, 0);
                        return;
                    }
                }
            }
            
            const finalCounts = {
                enemies: game.enemies.length,
                powerups: game.powerups.length,
                bullets: game.player.bullets.length,
                effects: game.effects.length
            };
            
            const checks = {
                noExcessiveGrowth: true,
                entitiesReasonable: Object.values(finalCounts).every(v => v < this.memoryLeakThreshold)
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Memory Leak Detection', passed, {
                ...checks,
                initialCounts,
                finalCounts
            }, 0);
            
        } catch (error) {
            this.recordTest('Memory Leak Detection', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 7: Stress test
     */
    testStressScenario() {
        console.log('Test 7: Stress Test (Many Entities)...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            // Create stress scenario
            const start = performance.now();
            let iterations = 0;
            let maxDuration = 0;
            
            // Spawn many entities
            for (let i = 0; i < 30; i++) {
                game.spawnEnemies();
            }
            
            // Run updates with performance monitoring
            for (let i = 0; i < 200; i++) {
                const frameStart = performance.now();
                game.update();
                const frameTime = performance.now() - frameStart;
                maxDuration = Math.max(maxDuration, frameTime);
                iterations++;
                
                // Safety check: stop if taking too long
                if (performance.now() - start > 10000) {
                    this.recordTest('Stress Test', false, {
                        warning: 'Test timed out after 10 seconds',
                        iterations,
                        maxFrameTime: maxDuration.toFixed(2)
                    }, maxDuration);
                    return;
                }
            }
            
            const totalTime = performance.now() - start;
            const avgTime = totalTime / iterations;
            
            const checks = {
                completed: true,
                avgTime: avgTime < this.performanceThreshold * 3,
                maxTime: maxDuration < this.performanceThreshold * 5,
                noTimeout: totalTime < 10000
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Stress Test', passed, {
                ...checks,
                iterations,
                avgTimeMs: avgTime.toFixed(2),
                maxTimeMs: maxDuration.toFixed(2),
                totalTimeMs: totalTime.toFixed(2)
            }, avgTime);
            
        } catch (error) {
            this.recordTest('Stress Test', false, { error: error.message }, 0);
        }
    }

    /**
     * Test 8: Simulate gameplay session
     */
    testGameplaySession() {
        console.log('Test 8: Simulated Gameplay Session...');
        
        try {
            const game = new Game('gameCanvas');
            game.start();
            
            const sessionDuration = 1000; // Simulate 1000 frames
            const start = performance.now();
            let lastLogTime = 0;
            const frameTimes = [];
            let consecutiveSlowFrames = 0;
            let maxEntities = { enemies: 0, bullets: 0, powerups: 0 };
            
            for (let frame = 0; frame < sessionDuration; frame++) {
                const frameStart = performance.now();
                
                // Simulate player input occasionally
                if (frame % 60 === 0 && game.player) {
                    try {
                        game.player.switchLane(Math.random() > 0.5 ? 1 : -1);
                    } catch (e) {
                        console.warn(`Error switching lane at frame ${frame}:`, e);
                    }
                }
                
                // Update game with error handling
                try {
                    game.update();
                } catch (error) {
                    this.recordTest('Gameplay Session', false, {
                        warning: 'Error during update',
                        frame,
                        error: error.message,
                        stack: error.stack
                    }, 0);
                    return;
                }
                
                const frameTime = performance.now() - frameStart;
                frameTimes.push(frameTime);
                
                // Track slow frames
                if (frameTime > this.performanceThreshold * 2) {
                    consecutiveSlowFrames++;
                    if (consecutiveSlowFrames > 10) {
                        this.recordTest('Gameplay Session', false, {
                            warning: 'Too many consecutive slow frames',
                            frame,
                            consecutiveSlowFrames,
                            lastFrameTime: frameTime.toFixed(2)
                        }, frameTime);
                        return;
                    }
                } else {
                    consecutiveSlowFrames = 0;
                }
                
                // Track max entities
                if (game.enemies.length > maxEntities.enemies) maxEntities.enemies = game.enemies.length;
                if (game.player && game.player.bullets.length > maxEntities.bullets) maxEntities.bullets = game.player.bullets.length;
                if (game.powerups.length > maxEntities.powerups) maxEntities.powerups = game.powerups.length;
                
                // Log status every 5 seconds (300 frames at 60fps)
                if (frame % 300 === 0 && frame > 0) {
                    const currentTime = performance.now();
                    const elapsed = (currentTime - start) / 1000;
                    const avgFPS = frame / elapsed;
                    const recentAvgFrameTime = frameTimes.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, frameTimes.length);
                    
                    console.log(`Frame ${frame}: FPS=${avgFPS.toFixed(1)}, AvgFrame=${recentAvgFrameTime.toFixed(2)}ms, Enemies=${game.enemies.length}, Bullets=${game.player ? game.player.bullets.length : 0}, Powerups=${game.powerups.length}`);
                }
                
                // Safety check: timeout
                if (performance.now() - start > 30000) {
                    this.recordTest('Gameplay Session', false, {
                        warning: 'Session timed out after 30 seconds',
                        framesCompleted: frame,
                        avgFrameTime: (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length).toFixed(2)
                    }, 0);
                    return;
                }
                
                // Check for infinite loops (entity count explosion)
                if (game.enemies.length > 500 || (game.player && game.player.bullets.length > 500)) {
                    this.recordTest('Gameplay Session', false, {
                        warning: 'Entity count explosion detected',
                        frame,
                        enemies: game.enemies.length,
                        bullets: game.player ? game.player.bullets.length : 0,
                        powerups: game.powerups.length
                    }, 0);
                    return;
                }
            }
            
            const totalTime = performance.now() - start;
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const maxFrameTime = Math.max(...frameTimes);
            const minFrameTime = Math.min(...frameTimes);
            
            const checks = {
                completed: true,
                avgFrameTime: avgFrameTime < this.performanceThreshold,
                maxFrameTime: maxFrameTime < this.performanceThreshold * 3,
                noTimeout: totalTime < 30000,
                entitiesReasonable: game.enemies.length < 200 && (game.player ? game.player.bullets.length < 200 : true),
                noSlowFrames: consecutiveSlowFrames === 0
            };
            
            const passed = Object.values(checks).every(v => v === true);
            this.recordTest('Gameplay Session', passed, {
                ...checks,
                frames: sessionDuration,
                totalTimeMs: totalTime.toFixed(2),
                avgFrameTimeMs: avgFrameTime.toFixed(2),
                maxFrameTimeMs: maxFrameTime.toFixed(2),
                minFrameTimeMs: minFrameTime.toFixed(2),
                finalEnemies: game.enemies.length,
                finalBullets: game.player ? game.player.bullets.length : 0,
                finalPowerups: game.powerups.length,
                maxEntities: maxEntities,
                consecutiveSlowFrames: consecutiveSlowFrames
            }, avgFrameTime);
            
        } catch (error) {
            this.recordTest('Gameplay Session', false, { error: error.message, stack: error.stack }, 0);
        }
    }

    /**
     * Record test result
     */
    recordTest(name, passed, details, performance) {
        this.testResults.push({
            name,
            passed,
            details,
            performance: performance ? `${performance.toFixed(2)}ms` : 'N/A'
        });
        
        const status = passed ? '✓ PASS' : '✗ FAIL';
        console.log(`  ${status}: ${name}`);
        if (!passed) {
            console.log('    Details:', details);
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n=== Test Results Summary ===');
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const failed = total - passed;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} (${(passed/total*100).toFixed(1)}%)`);
        console.log(`Failed: ${failed} (${(failed/total*100).toFixed(1)}%)`);
        
        console.log('\nDetailed Results:');
        this.testResults.forEach(result => {
            const icon = result.passed ? '✓' : '✗';
            console.log(`${icon} ${result.name} - ${result.performance}`);
            if (!result.passed) {
                console.log(`  Failed:`, result.details);
            }
        });
        
        console.log('\n=== End of Test Results ===\n');
    }
}

// Auto-run tests when script loads (if in test mode)
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    window.addEventListener('load', () => {
        console.log('Test mode enabled. Running automated tests...');
        setTimeout(() => {
            const tester = new GameTester();
            tester.runAllTests().then(results => {
                // Store results for inspection
                window.testResults = results;
                console.log('\n✅ Tests completed! Check results above.');
                console.log('💡 Tip: Type "window.testResults" in console to see detailed results.');
            }).catch(error => {
                console.error('❌ Test execution failed:', error);
            });
        }, 1000); // Wait 1 second for everything to initialize
    });
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.GameTester = GameTester;
    
    // Add a simple test runner function
    window.runTests = function() {
        console.log('🧪 Starting automated tests...');
        const tester = new GameTester();
        return tester.runAllTests();
    };
    
    console.log('📝 Test system loaded!');
    console.log('   - Add ?test=true to URL to auto-run tests');
    console.log('   - Or type runTests() in console to run manually');
}

