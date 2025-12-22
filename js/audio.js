/**
 * Audio Manager - Handles all game sounds
 * Designed for easy extension with new sound effects
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        this.musicEnabled = true;
        this.musicVolume = 0.3; // Lower volume for background music
        this.currentMusic = null;
        this.musicContext = null;
        this.musicSource = null;
        this.musicGainNode = null;
        this.musicOscillators = [];
        
        // Dynamic music system
        this.tension = 0; // Current tension level (0-1)
        this.targetTension = 0; // Target tension for smooth transitions
        this.musicLayers = {}; // Store music layers by name
        this.beatTime = 0; // Current beat time for synchronization
        this.beatDuration = 0; // Duration of one beat in seconds
        this.lastBeatTime = 0; // Last beat timestamp
        this.killAccentQueue = []; // Queue for kill accents synchronized to beats
        this.beatSyncInterval = null; // Interval ID for beat sync
        this.patternIntervals = {}; // Store all pattern intervals for cleanup
        this.lastLayerUpdate = 0; // Timestamp of last layer update (for debouncing)
    }

    /**
     * Register a sound effect
     * @param {string} name - Sound identifier
     * @param {string} url - Path to audio file
     */
    registerSound(name, url) {
        if (this.sounds[name]) {
            console.warn(`Sound "${name}" already registered`);
            return;
        }
        
        const audio = new Audio(url);
        audio.volume = this.volume;
        this.sounds[name] = audio;
    }

    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {number} volume - Optional volume override (0-1)
     */
    play(name, volume = null) {
        if (!this.enabled) return;
        
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound "${name}" not found`);
            return;
        }

        // Handle Web Audio API generated sounds
        if (sound.play && typeof sound.play === 'function' && sound.buffer) {
            sound.play();
            return;
        }

        // Handle HTML Audio elements
        const audioClone = sound.cloneNode();
        if (volume !== null) {
            audioClone.volume = volume;
        }
        audioClone.play().catch(err => {
            // Silently handle autoplay restrictions
            console.debug('Audio play failed:', err);
        });
    }

    /**
     * Stop a sound
     * @param {string} name - Sound identifier
     */
    stop(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.volume = clamp(volume, 0, 1);
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Enable/disable sounds
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Initialize default sounds (can be extended)
     */
    initializeDefaultSounds() {
        // Using Web Audio API to generate simple sounds
        // In production, these would be actual audio files
        this.createToneSound('shoot', 200, 0.1);
        this.createToneSound('hit', 150, 0.15);
        this.createToneSound('powerup', 400, 0.2);
        this.createToneSound('gameover', 100, 0.5);
        
        // Enemy destruction sounds
        this.createEnemyDeathSound('basic', 120, 0.2);
        this.createEnemyDeathSound('fast', 180, 0.15);
        this.createEnemyDeathSound('tank', 80, 0.3);
        this.createEnemyDeathSound('formation', 100, 0.25);
        this.createEnemyDeathSound('swarm', 160, 0.18);
        this.createEnemyDeathSound('carrier', 60, 0.8); // Epic carrier explosion sound
    }

    /**
     * Create a simple tone sound using Web Audio API
     * @param {string} name - Sound identifier
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in seconds
     */
    createToneSound(name, frequency, duration) {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a simple audio buffer
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            // Simple sine wave with envelope
            const envelope = Math.exp(-t * 5); // Exponential decay
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }

        // Convert to Audio element for compatibility
        const audio = new Audio();
        audio.volume = this.volume;
        
        // Store the buffer for later use
        const soundObj = {
            buffer: buffer,
            audioContext: audioContext,
            play: function() {
                try {
                    // Resume audio context if suspended (browser autoplay policy)
                    if (this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.buffer;
                    source.connect(this.audioContext.destination);
                    source.start();
                } catch (err) {
                    // Silently handle audio errors
                    console.debug('Audio play error:', err);
                }
            }
        };
        this.sounds[name] = soundObj;
    }

    /**
     * Create enemy death sound with varying characteristics
     * @param {string} name - Sound identifier (enemy type)
     * @param {number} frequency - Base frequency in Hz
     * @param {number} duration - Duration in seconds
     */
    createEnemyDeathSound(name, frequency, duration) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            let value = 0;
            
            if (name === 'carrier') {
                // Epic carrier explosion: multiple frequencies with heavy bass
                const envelope = Math.exp(-t * 2); // Slower decay for epic feel
                value += Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4; // Base tone
                value += Math.sin(2 * Math.PI * frequency * 0.5 * t) * envelope * 0.3; // Bass
                value += Math.sin(2 * Math.PI * frequency * 2 * t) * envelope * 0.2; // High tone
                value += Math.sin(2 * Math.PI * frequency * 3 * t) * envelope * 0.1; // Higher tone
                // Add some noise for explosion effect
                value += (Math.random() * 2 - 1) * envelope * 0.1;
            } else if (name === 'tank') {
                // Heavy tank explosion: low frequency with rumble
                const envelope = Math.exp(-t * 3);
                value += Math.sin(2 * Math.PI * frequency * t) * envelope * 0.5;
                value += Math.sin(2 * Math.PI * frequency * 0.7 * t) * envelope * 0.3;
            } else if (name === 'fast') {
                // Quick, sharp sound for fast enemy
                const envelope = Math.exp(-t * 8);
                value = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
            } else if (name === 'formation') {
                // Multiple tones for formation
                const envelope = Math.exp(-t * 4);
                value += Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
                value += Math.sin(2 * Math.PI * frequency * 1.5 * t) * envelope * 0.2;
            } else if (name === 'swarm') {
                // High-pitched sparkle sound
                const envelope = Math.exp(-t * 6);
                value = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
            } else {
                // Basic explosion: standard tone
                const envelope = Math.exp(-t * 5);
                value = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
            }
            
            data[i] = value;
        }

        const audio = new Audio();
        audio.volume = this.volume;
        
        const soundObj = {
            buffer: buffer,
            audioContext: audioContext,
            play: function() {
                try {
                    if (this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.buffer;
                    source.connect(this.audioContext.destination);
                    source.start();
                } catch (err) {
                    console.debug('Audio play error:', err);
                }
            }
        };
        this.sounds[name] = soundObj;
    }

    /**
     * Initialize music system
     */
    initializeMusic() {
        try {
            this.musicContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGainNode = this.musicContext.createGain();
            this.musicGainNode.connect(this.musicContext.destination);
            this.musicGainNode.gain.value = this.musicVolume;
        } catch (err) {
            console.debug('Music initialization failed:', err);
        }
    }

    /**
     * Start dynamic background music with tension-based layers
     * @param {number} level - Current game level
     */
    startBackgroundMusic(level) {
        if (!this.musicEnabled || !this.musicContext) return;
        
        this.stopMusic();
        
        try {
            if (this.musicContext.state === 'suspended') {
                this.musicContext.resume();
            }

            // Base tempo: 60 BPM, increases with level and tension
            const baseTempo = 60;
            const tempoMultiplier = 1 + (level - 1) * 0.02;
            const tempo = baseTempo * tempoMultiplier;
            this.beatDuration = 60 / tempo;
            this.lastBeatTime = this.musicContext.currentTime;
            this.beatTime = 0;

            // Initialize music layers
            this.musicLayers = {};
            this.musicOscillators = [];
            
            // Base layer (always present): Main melody + harmony
            this.createBaseLayer();
            
            // Start beat synchronization
            this.startBeatSync();

            this.currentMusic = 'background';
            this.tension = 0;
            this.targetTension = 0;
        } catch (err) {
            console.debug('Background music start failed:', err);
        }
    }
    
    /**
     * Create base music layer (melody + harmony)
     */
    createBaseLayer() {
        if (!this.musicContext || !this.musicGainNode) return;
        
        // Main melody (soft sine wave)
        const melodyOsc = this.musicContext.createOscillator();
        melodyOsc.type = 'sine';
        melodyOsc.frequency.value = 220; // A3
        const melodyGain = this.musicContext.createGain();
        melodyGain.gain.value = 0.15;
        melodyOsc.connect(melodyGain);
        melodyGain.connect(this.musicGainNode);
        
        // Harmony (lower frequency)
        const harmonyOsc = this.musicContext.createOscillator();
        harmonyOsc.type = 'sine';
        harmonyOsc.frequency.value = 165; // E3
        const harmonyGain = this.musicContext.createGain();
        harmonyGain.gain.value = 0.1;
        harmonyOsc.connect(harmonyGain);
        harmonyGain.connect(this.musicGainNode);
        
        melodyOsc.start();
        harmonyOsc.start();
        
        this.musicLayers.base = {
            melody: {osc: melodyOsc, gain: melodyGain},
            harmony: {osc: harmonyOsc, gain: harmonyGain}
        };
        this.musicOscillators.push({osc: melodyOsc, gain: melodyGain});
        this.musicOscillators.push({osc: harmonyOsc, gain: harmonyGain});
        
        // Start melody pattern
        this.startMelodyPattern();
    }
    
    /**
     * Start melody pattern for base layer
     */
    startMelodyPattern() {
        if (!this.musicLayers.base) return;
        
        // Clear existing interval if any
        if (this.patternIntervals.base) {
            clearInterval(this.patternIntervals.base);
        }
        
        let noteIndex = 0;
        const melodyNotes = [220, 247, 262, 294, 330, 294, 262, 247];
        const harmonyNotes = [165, 185, 196, 220, 247, 220, 196, 185];
        
        this.patternIntervals.base = setInterval(() => {
            if (!this.musicLayers.base || !this.musicContext) {
                if (this.patternIntervals.base) {
                    clearInterval(this.patternIntervals.base);
                    delete this.patternIntervals.base;
                }
                return;
            }
            
            const baseLayer = this.musicLayers.base;
            baseLayer.melody.osc.frequency.setTargetAtTime(
                melodyNotes[noteIndex],
                this.musicContext.currentTime,
                0.1
            );
            baseLayer.harmony.osc.frequency.setTargetAtTime(
                harmonyNotes[noteIndex],
                this.musicContext.currentTime,
                0.1
            );
            
            noteIndex = (noteIndex + 1) % melodyNotes.length;
        }, this.beatDuration * 1000);
    }
    
    /**
     * Start beat synchronization system
     */
    startBeatSync() {
        // Clear any existing beat sync
        if (this.beatSyncInterval) {
            clearInterval(this.beatSyncInterval);
        }
        
        // Use setInterval instead of requestAnimationFrame to avoid multiple loops
        this.beatSyncInterval = setInterval(() => {
            if (!this.musicContext || !this.currentMusic) {
                if (this.beatSyncInterval) {
                    clearInterval(this.beatSyncInterval);
                    this.beatSyncInterval = null;
                }
                return;
            }
            
            const now = this.musicContext.currentTime;
            const timeSinceLastBeat = now - this.lastBeatTime;
            
            if (timeSinceLastBeat >= this.beatDuration) {
                this.beatTime = (this.beatTime + 1) % 4; // 4/4 time signature
                this.lastBeatTime = now;
                
                // Process kill accent queue (limit to 1 per beat to avoid spam)
                this.processKillAccents();
            }
        }, 16); // Check every ~16ms (60fps)
    }
    
    /**
     * Process kill accents synchronized to beats
     */
    processKillAccents() {
        if (this.killAccentQueue.length === 0) return;
        
        // Limit queue processing to avoid overwhelming the audio system
        // Only process one accent per beat, but limit queue size
        if (this.killAccentQueue.length > 10) {
            // If queue is too long, clear old entries and keep only the most recent
            this.killAccentQueue = this.killAccentQueue.slice(-5);
        }
        
        // Play the first accent in queue
        const accent = this.killAccentQueue.shift();
        if (accent) {
            this.playKillAccent(accent.enemyType, accent.intensity);
        }
    }
    
    /**
     * Play kill accent sound synchronized to beat
     * @param {string} enemyType - Type of enemy killed
     * @param {number} intensity - Intensity of accent (0-1)
     */
    playKillAccent(enemyType, intensity = 0.5) {
        if (!this.musicContext || !this.musicGainNode) return;
        
        try {
            // Create a short accent sound based on enemy type
            const accentDuration = 0.1;
            const accentGain = this.musicContext.createGain();
            accentGain.gain.setValueAtTime(0, this.musicContext.currentTime);
            accentGain.gain.linearRampToValueAtTime(intensity * 0.3, this.musicContext.currentTime + 0.01);
            accentGain.gain.exponentialRampToValueAtTime(0.001, this.musicContext.currentTime + accentDuration);
            accentGain.connect(this.musicGainNode);
            
            // Determine frequency based on enemy type
            let frequency = 200;
            if (enemyType === 'tank' || enemyType === 'carrier') {
                frequency = 100; // Low, powerful accent
            } else if (enemyType === 'formation' || enemyType === 'swarm') {
                frequency = 300; // Medium accent
            } else {
                frequency = 250; // Standard accent
            }
            
            const accentOsc = this.musicContext.createOscillator();
            accentOsc.type = 'square';
            accentOsc.frequency.value = frequency;
            accentOsc.connect(accentGain);
            accentOsc.start();
            accentOsc.stop(this.musicContext.currentTime + accentDuration);
        } catch (err) {
            console.debug('Kill accent failed:', err);
        }
    }
    
    /**
     * Queue a kill accent to be played on the next beat
     * @param {string} enemyType - Type of enemy killed
     * @param {number} intensity - Intensity of accent (0-1)
     */
    queueKillAccent(enemyType, intensity = 0.5) {
        this.killAccentQueue.push({enemyType, intensity});
    }
    
    /**
     * Update music based on tension level
     * @param {number} tension - Tension level (0-1)
     */
    updateMusicTension(tension) {
        if (!this.musicEnabled || !this.musicContext) return;
        
        // Smooth transition to target tension
        this.targetTension = Math.max(0, Math.min(1, tension));
        
        // Smooth interpolation (avoid sudden changes)
        const tensionChangeRate = 0.05; // How fast tension changes
        this.tension += (this.targetTension - this.tension) * tensionChangeRate;
        
        // Update tempo based on tension
        const baseTempo = 60;
        const tensionTempo = baseTempo + (this.tension * 60); // 60-120 BPM range
        this.beatDuration = 60 / tensionTempo;
        
        // Update music layers based on tension
        this.updateMusicLayers();
    }
    
    /**
     * Update music layers based on current tension
     */
    updateMusicLayers() {
        if (!this.musicContext || !this.musicGainNode) return;
        
        // Debounce layer updates to prevent rapid creation/destruction
        const now = Date.now();
        if (now - this.lastLayerUpdate < 200) { // Only update every 200ms
            this.updateLayerVolumes();
            return;
        }
        this.lastLayerUpdate = now;
        
        // Tension thresholds
        const battleThreshold = 0.3;
        const intenseThreshold = 0.6;
        const extremeThreshold = 0.8;
        
        // Battle layer (tension > 0.3): Add drums and bass
        if (this.tension > battleThreshold && !this.musicLayers.battle) {
            this.createBattleLayer();
        } else if (this.tension <= battleThreshold && this.musicLayers.battle) {
            this.removeBattleLayer();
        }
        
        // Intense layer (tension > 0.6): Add high frequency layer
        if (this.tension > intenseThreshold && !this.musicLayers.intense) {
            this.createIntenseLayer();
        } else if (this.tension <= intenseThreshold && this.musicLayers.intense) {
            this.removeIntenseLayer();
        }
        
        // Extreme layer (tension > 0.8): Add extra tension effects
        if (this.tension > extremeThreshold && !this.musicLayers.extreme) {
            this.createExtremeLayer();
        } else if (this.tension <= extremeThreshold && this.musicLayers.extreme) {
            this.removeExtremeLayer();
        }
        
        // Update layer volumes based on tension
        this.updateLayerVolumes();
    }
    
    /**
     * Create battle layer (drums and bass)
     */
    createBattleLayer() {
        if (!this.musicContext || !this.musicGainNode) return;
        
        // Bass drum (low frequency)
        const bassOsc = this.musicContext.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 110; // A2
        const bassGain = this.musicContext.createGain();
        bassGain.gain.value = 0; // Start at 0, fade in
        bassGain.gain.linearRampToValueAtTime(0.15, this.musicContext.currentTime + 0.5);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGainNode);
        
        // Rhythm bass (square wave)
        const rhythmOsc = this.musicContext.createOscillator();
        rhythmOsc.type = 'square';
        rhythmOsc.frequency.value = 165; // E3
        const rhythmGain = this.musicContext.createGain();
        rhythmGain.gain.value = 0;
        rhythmGain.gain.linearRampToValueAtTime(0.1, this.musicContext.currentTime + 0.5);
        rhythmOsc.connect(rhythmGain);
        rhythmGain.connect(this.musicGainNode);
        
        bassOsc.start();
        rhythmOsc.start();
        
        this.musicLayers.battle = {
            bass: {osc: bassOsc, gain: bassGain},
            rhythm: {osc: rhythmOsc, gain: rhythmGain}
        };
        this.musicOscillators.push({osc: bassOsc, gain: bassGain});
        this.musicOscillators.push({osc: rhythmOsc, gain: rhythmGain});
        
        // Start battle pattern
        this.startBattlePattern();
    }
    
    /**
     * Start battle pattern
     */
    startBattlePattern() {
        if (!this.musicLayers.battle) return;
        
        // Clear existing interval if any
        if (this.patternIntervals.battle) {
            clearInterval(this.patternIntervals.battle);
        }
        
        let noteIndex = 0;
        const bassNotes = [110, 123, 131, 147, 165, 147, 131, 123];
        const rhythmNotes = [165, 185, 196, 220, 247, 220, 196, 185];
        
        this.patternIntervals.battle = setInterval(() => {
            if (!this.musicLayers.battle || !this.musicContext) {
                if (this.patternIntervals.battle) {
                    clearInterval(this.patternIntervals.battle);
                    delete this.patternIntervals.battle;
                }
                return;
            }
            
            const battleLayer = this.musicLayers.battle;
            battleLayer.bass.osc.frequency.setTargetAtTime(
                bassNotes[noteIndex],
                this.musicContext.currentTime,
                0.05
            );
            battleLayer.rhythm.osc.frequency.setTargetAtTime(
                rhythmNotes[noteIndex],
                this.musicContext.currentTime,
                0.05
            );
            
            noteIndex = (noteIndex + 1) % bassNotes.length;
        }, this.beatDuration * 1000);
    }
    
    /**
     * Remove battle layer
     */
    removeBattleLayer() {
        if (!this.musicLayers.battle || !this.musicContext) return;
        
        // Clear pattern interval
        if (this.patternIntervals.battle) {
            clearInterval(this.patternIntervals.battle);
            delete this.patternIntervals.battle;
        }
        
        const battleLayer = this.musicLayers.battle;
        const fadeOutTime = 0.5;
        const now = this.musicContext.currentTime;
        
        // Safely fade out with checks
        try {
            if (battleLayer.bass && battleLayer.bass.gain && typeof battleLayer.bass.gain.linearRampToValueAtTime === 'function') {
                battleLayer.bass.gain.linearRampToValueAtTime(0, now + fadeOutTime);
            }
            if (battleLayer.rhythm && battleLayer.rhythm.gain && typeof battleLayer.rhythm.gain.linearRampToValueAtTime === 'function') {
                battleLayer.rhythm.gain.linearRampToValueAtTime(0, now + fadeOutTime);
            }
        } catch (err) {
            console.debug('Error fading out battle layer:', err);
        }
        
        setTimeout(() => {
            if (this.musicLayers.battle) {
                try {
                    if (this.musicLayers.battle.bass && this.musicLayers.battle.bass.osc) {
                        this.musicLayers.battle.bass.osc.stop();
                    }
                    if (this.musicLayers.battle.rhythm && this.musicLayers.battle.rhythm.osc) {
                        this.musicLayers.battle.rhythm.osc.stop();
                    }
                } catch (err) {
                    // Oscillator may already be stopped
                }
                delete this.musicLayers.battle;
            }
        }, fadeOutTime * 1000);
    }
    
    /**
     * Create intense layer (high frequency melody)
     */
    createIntenseLayer() {
        if (!this.musicContext || !this.musicGainNode) return;
        
        const highOsc = this.musicContext.createOscillator();
        highOsc.type = 'triangle';
        highOsc.frequency.value = 440; // A4
        const highGain = this.musicContext.createGain();
        highGain.gain.value = 0;
        highGain.gain.linearRampToValueAtTime(0.12, this.musicContext.currentTime + 0.5);
        highOsc.connect(highGain);
        highGain.connect(this.musicGainNode);
        
        highOsc.start();
        
        this.musicLayers.intense = {
            high: {osc: highOsc, gain: highGain}
        };
        this.musicOscillators.push({osc: highOsc, gain: highGain});
        
        this.startIntensePattern();
    }
    
    /**
     * Start intense pattern
     */
    startIntensePattern() {
        if (!this.musicLayers.intense) return;
        
        // Clear existing interval if any
        if (this.patternIntervals.intense) {
            clearInterval(this.patternIntervals.intense);
        }
        
        let noteIndex = 0;
        const highNotes = [440, 494, 523, 587, 659, 587, 523, 494];
        
        this.patternIntervals.intense = setInterval(() => {
            if (!this.musicLayers.intense || !this.musicContext) {
                if (this.patternIntervals.intense) {
                    clearInterval(this.patternIntervals.intense);
                    delete this.patternIntervals.intense;
                }
                return;
            }
            
            const intenseLayer = this.musicLayers.intense;
            intenseLayer.high.osc.frequency.setTargetAtTime(
                highNotes[noteIndex],
                this.musicContext.currentTime,
                0.05
            );
            
            noteIndex = (noteIndex + 1) % highNotes.length;
        }, this.beatDuration * 1000);
    }
    
    /**
     * Remove intense layer
     */
    removeIntenseLayer() {
        if (!this.musicLayers.intense || !this.musicContext) return;
        
        // Clear pattern interval
        if (this.patternIntervals.intense) {
            clearInterval(this.patternIntervals.intense);
            delete this.patternIntervals.intense;
        }
        
        const intenseLayer = this.musicLayers.intense;
        const fadeOutTime = 0.5;
        const now = this.musicContext.currentTime;
        
        // Safely fade out with checks
        try {
            if (intenseLayer.high && intenseLayer.high.gain && typeof intenseLayer.high.gain.linearRampToValueAtTime === 'function') {
                intenseLayer.high.gain.linearRampToValueAtTime(0, now + fadeOutTime);
            }
        } catch (err) {
            console.debug('Error fading out intense layer:', err);
        }
        
        setTimeout(() => {
            if (this.musicLayers.intense) {
                try {
                    if (this.musicLayers.intense.high && this.musicLayers.intense.high.osc) {
                        this.musicLayers.intense.high.osc.stop();
                    }
                } catch (err) {
                    // Oscillator may already be stopped
                }
                delete this.musicLayers.intense;
            }
        }, fadeOutTime * 1000);
    }
    
    /**
     * Create extreme layer (extra tension effects)
     */
    createExtremeLayer() {
        if (!this.musicContext || !this.musicGainNode) return;
        
        const extremeOsc = this.musicContext.createOscillator();
        extremeOsc.type = 'sawtooth';
        extremeOsc.frequency.value = 330; // E4
        const extremeGain = this.musicContext.createGain();
        extremeGain.gain.value = 0;
        extremeGain.gain.linearRampToValueAtTime(0.1, this.musicContext.currentTime + 0.5);
        extremeOsc.connect(extremeGain);
        extremeGain.connect(this.musicGainNode);
        
        extremeOsc.start();
        
        this.musicLayers.extreme = {
            extreme: {osc: extremeOsc, gain: extremeGain}
        };
        this.musicOscillators.push({osc: extremeOsc, gain: extremeGain});
        
        this.startExtremePattern();
    }
    
    /**
     * Start extreme pattern
     */
    startExtremePattern() {
        if (!this.musicLayers.extreme) return;
        
        // Clear existing interval if any
        if (this.patternIntervals.extreme) {
            clearInterval(this.patternIntervals.extreme);
        }
        
        let noteIndex = 0;
        const extremeNotes = [330, 370, 392, 440, 494, 440, 392, 370];
        
        this.patternIntervals.extreme = setInterval(() => {
            if (!this.musicLayers.extreme || !this.musicContext) {
                if (this.patternIntervals.extreme) {
                    clearInterval(this.patternIntervals.extreme);
                    delete this.patternIntervals.extreme;
                }
                return;
            }
            
            const extremeLayer = this.musicLayers.extreme;
            extremeLayer.extreme.osc.frequency.setTargetAtTime(
                extremeNotes[noteIndex],
                this.musicContext.currentTime,
                0.03
            );
            
            noteIndex = (noteIndex + 1) % extremeNotes.length;
        }, this.beatDuration * 1000);
    }
    
    /**
     * Remove extreme layer
     */
    removeExtremeLayer() {
        if (!this.musicLayers.extreme || !this.musicContext) return;
        
        // Clear pattern interval
        if (this.patternIntervals.extreme) {
            clearInterval(this.patternIntervals.extreme);
            delete this.patternIntervals.extreme;
        }
        
        const extremeLayer = this.musicLayers.extreme;
        const fadeOutTime = 0.5;
        const now = this.musicContext.currentTime;
        
        // Safely fade out with checks
        try {
            if (extremeLayer.extreme && extremeLayer.extreme.gain && typeof extremeLayer.extreme.gain.linearRampToValueAtTime === 'function') {
                extremeLayer.extreme.gain.linearRampToValueAtTime(0, now + fadeOutTime);
            }
        } catch (err) {
            console.debug('Error fading out extreme layer:', err);
        }
        
        setTimeout(() => {
            if (this.musicLayers.extreme) {
                try {
                    if (this.musicLayers.extreme.extreme && this.musicLayers.extreme.extreme.osc) {
                        this.musicLayers.extreme.extreme.osc.stop();
                    }
                } catch (err) {
                    // Oscillator may already be stopped
                }
                delete this.musicLayers.extreme;
            }
        }, fadeOutTime * 1000);
    }
    
    /**
     * Update layer volumes based on tension
     */
    updateLayerVolumes() {
        if (!this.musicContext) return;
        
        const now = this.musicContext.currentTime;
        
        // Base layer: volume decreases slightly as tension increases
        if (this.musicLayers.base) {
            try {
                const baseVolume = 0.15 - (this.tension * 0.05);
                if (this.musicLayers.base.melody && this.musicLayers.base.melody.gain && typeof this.musicLayers.base.melody.gain.setTargetAtTime === 'function') {
                    this.musicLayers.base.melody.gain.gain.setTargetAtTime(baseVolume, now, 0.1);
                }
                if (this.musicLayers.base.harmony && this.musicLayers.base.harmony.gain && typeof this.musicLayers.base.harmony.gain.setTargetAtTime === 'function') {
                    this.musicLayers.base.harmony.gain.gain.setTargetAtTime(baseVolume * 0.67, now, 0.1);
                }
            } catch (err) {
                console.debug('Error updating base layer volume:', err);
            }
        }
        
        // Battle layer: volume increases with tension
        if (this.musicLayers.battle) {
            try {
                const battleVolume = (this.tension - 0.3) / 0.7 * 0.2; // Scale from 0.3 to 1.0
                if (this.musicLayers.battle.bass && this.musicLayers.battle.bass.gain && typeof this.musicLayers.battle.bass.gain.setTargetAtTime === 'function') {
                    this.musicLayers.battle.bass.gain.gain.setTargetAtTime(battleVolume, now, 0.1);
                }
                if (this.musicLayers.battle.rhythm && this.musicLayers.battle.rhythm.gain && typeof this.musicLayers.battle.rhythm.gain.setTargetAtTime === 'function') {
                    this.musicLayers.battle.rhythm.gain.gain.setTargetAtTime(battleVolume * 0.67, now, 0.1);
                }
            } catch (err) {
                console.debug('Error updating battle layer volume:', err);
            }
        }
        
        // Intense layer: volume increases with tension
        if (this.musicLayers.intense) {
            try {
                const intenseVolume = (this.tension - 0.6) / 0.4 * 0.15;
                if (this.musicLayers.intense.high && this.musicLayers.intense.high.gain && typeof this.musicLayers.intense.high.gain.setTargetAtTime === 'function') {
                    this.musicLayers.intense.high.gain.gain.setTargetAtTime(intenseVolume, now, 0.1);
                }
            } catch (err) {
                console.debug('Error updating intense layer volume:', err);
            }
        }
        
        // Extreme layer: volume increases with tension
        if (this.musicLayers.extreme) {
            try {
                const extremeVolume = (this.tension - 0.8) / 0.2 * 0.12;
                if (this.musicLayers.extreme.extreme && this.musicLayers.extreme.extreme.gain && typeof this.musicLayers.extreme.extreme.gain.setTargetAtTime === 'function') {
                    this.musicLayers.extreme.extreme.gain.gain.setTargetAtTime(extremeVolume, now, 0.1);
                }
            } catch (err) {
                console.debug('Error updating extreme layer volume:', err);
            }
        }
    }

    /**
     * Start intense music for carrier battles
     */
    startCarrierMusic() {
        if (!this.musicEnabled || !this.musicContext) return;
        
        this.stopMusic();
        
        try {
            if (this.musicContext.state === 'suspended') {
                this.musicContext.resume();
            }

            // Faster, more intense tempo: 90 BPM
            const tempo = 90;
            const beatDuration = 60 / tempo;

            this.musicOscillators = [];
            
            // Intense bass (low frequency)
            const bassOsc = this.musicContext.createOscillator();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.value = 110; // A2
            const bassGain = this.musicContext.createGain();
            bassGain.gain.value = 0.2;
            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: bassOsc, gain: bassGain});

            // Intense melody (higher frequency, sawtooth for intensity)
            const melodyOsc = this.musicContext.createOscillator();
            melodyOsc.type = 'sawtooth';
            melodyOsc.frequency.value = 330; // E4
            const melodyGain = this.musicContext.createGain();
            melodyGain.gain.value = 0.15;
            melodyOsc.connect(melodyGain);
            melodyGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: melodyOsc, gain: melodyGain});

            // High frequency layer for intensity
            const highOsc = this.musicContext.createOscillator();
            highOsc.type = 'square';
            highOsc.frequency.value = 440; // A4
            const highGain = this.musicContext.createGain();
            highGain.gain.value = 0.1;
            highOsc.connect(highGain);
            highGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: highOsc, gain: highGain});

            // Start oscillators
            bassOsc.start();
            melodyOsc.start();
            highOsc.start();

            // Create intense melody pattern
            let noteIndex = 0;
            const bassNotes = [110, 123, 131, 147, 165, 147, 131, 123];
            const melodyNotes = [330, 370, 392, 440, 494, 440, 392, 370];
            const highNotes = [440, 494, 523, 587, 659, 587, 523, 494];

            const playNextNote = () => {
                if (!this.musicOscillators.length) return;

                this.musicOscillators[0].osc.frequency.setTargetAtTime(
                    bassNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.05
                );
                this.musicOscillators[1].osc.frequency.setTargetAtTime(
                    melodyNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.05
                );
                this.musicOscillators[2].osc.frequency.setTargetAtTime(
                    highNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.05
                );

                noteIndex = (noteIndex + 1) % bassNotes.length;
                
                setTimeout(() => {
                    if (this.musicOscillators.length) {
                        playNextNote();
                    }
                }, beatDuration * 1000);
            };

            playNextNote();

            this.currentMusic = 'carrier';
        } catch (err) {
            console.debug('Carrier music start failed:', err);
        }
    }

    /**
     * Stop current music
     */
    stopMusic() {
        // Stop beat sync
        if (this.beatSyncInterval) {
            clearInterval(this.beatSyncInterval);
            this.beatSyncInterval = null;
        }
        
        // Clear all pattern intervals
        Object.keys(this.patternIntervals).forEach(key => {
            if (this.patternIntervals[key]) {
                clearInterval(this.patternIntervals[key]);
            }
        });
        this.patternIntervals = {};
        
        if (this.musicOscillators.length) {
            this.musicOscillators.forEach(({osc, gain}) => {
                try {
                    osc.stop();
                    gain.disconnect();
                } catch (err) {
                    // Oscillator may already be stopped
                }
            });
            this.musicOscillators = [];
        }
        this.musicLayers = {};
        this.killAccentQueue = [];
        this.currentMusic = null;
        this.tension = 0;
        this.targetTension = 0;
    }

    /**
     * Update music tempo based on level (for background music)
     * @param {number} level - Current game level
     */
    updateMusicTempo(level) {
        // Music tempo is updated when restarting music
        // This method can be used for smooth tempo transitions if needed
        if (this.currentMusic === 'background') {
            // Restart with new tempo
            this.startBackgroundMusic(level);
        }
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = clamp(volume, 0, 1);
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = this.musicVolume;
        }
    }

    /**
     * Enable/disable music
     * @param {boolean} enabled
     */
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (!enabled) {
            this.stopMusic();
        }
    }

    /**
     * Start victory music - epic and triumphant
     */
    startVictoryMusic() {
        if (!this.musicEnabled || !this.musicContext) return;
        
        this.stopMusic();
        
        try {
            if (this.musicContext.state === 'suspended') {
                this.musicContext.resume();
            }

            // Epic victory tempo: 100 BPM
            const tempo = 100;
            const beatDuration = 60 / tempo;

            this.musicOscillators = [];
            
            // Triumphant bass (low frequency, strong)
            const bassOsc = this.musicContext.createOscillator();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.value = 110; // A2
            const bassGain = this.musicContext.createGain();
            bassGain.gain.value = 0.25;
            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: bassOsc, gain: bassGain});

            // Victory melody (bright and uplifting)
            const melodyOsc = this.musicContext.createOscillator();
            melodyOsc.type = 'sine';
            melodyOsc.frequency.value = 440; // A4
            const melodyGain = this.musicContext.createGain();
            melodyGain.gain.value = 0.2;
            melodyOsc.connect(melodyGain);
            melodyGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: melodyOsc, gain: melodyGain});

            // High frequency layer for epic feel
            const highOsc = this.musicContext.createOscillator();
            highOsc.type = 'triangle';
            highOsc.frequency.value = 880; // A5
            const highGain = this.musicContext.createGain();
            highGain.gain.value = 0.15;
            highOsc.connect(highGain);
            highGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: highOsc, gain: highGain});

            // Start oscillators
            bassOsc.start();
            melodyOsc.start();
            highOsc.start();

            // Create triumphant melody pattern
            let noteIndex = 0;
            const bassNotes = [110, 123, 131, 147, 165, 147, 131, 123];
            const melodyNotes = [440, 494, 523, 587, 659, 587, 523, 494]; // Ascending then descending - triumphant
            const highNotes = [880, 988, 1047, 1175, 1319, 1175, 1047, 988];

            const playNextNote = () => {
                if (!this.musicOscillators.length) return;

                this.musicOscillators[0].osc.frequency.setTargetAtTime(
                    bassNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.1
                );
                this.musicOscillators[1].osc.frequency.setTargetAtTime(
                    melodyNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.1
                );
                this.musicOscillators[2].osc.frequency.setTargetAtTime(
                    highNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.1
                );

                noteIndex = (noteIndex + 1) % bassNotes.length;
                
                setTimeout(() => {
                    if (this.musicOscillators.length) {
                        playNextNote();
                    }
                }, beatDuration * 1000);
            };

            playNextNote();

            this.currentMusic = 'victory';
        } catch (err) {
            console.debug('Victory music start failed:', err);
        }
    }
}

