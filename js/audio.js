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
     * Start background music (calm, tempo increases with level)
     * @param {number} level - Current game level
     */
    startBackgroundMusic(level) {
        if (!this.musicEnabled || !this.musicContext) return;
        
        this.stopMusic();
        
        try {
            if (this.musicContext.state === 'suspended') {
                this.musicContext.resume();
            }

            // Base tempo: 60 BPM (1 beat per second), increases with level
            const baseTempo = 60; // BPM
            const tempoMultiplier = 1 + (level - 1) * 0.02; // 2% faster per level
            const tempo = baseTempo * tempoMultiplier;
            const beatDuration = 60 / tempo; // Duration of one beat in seconds

            // Create a calm, ambient melody
            // Use multiple oscillators for richer sound
            this.musicOscillators = [];
            
            // Main melody (soft sine wave)
            const melodyOsc = this.musicContext.createOscillator();
            melodyOsc.type = 'sine';
            melodyOsc.frequency.value = 220; // A3
            const melodyGain = this.musicContext.createGain();
            melodyGain.gain.value = 0.15;
            melodyOsc.connect(melodyGain);
            melodyGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: melodyOsc, gain: melodyGain});

            // Harmony (lower frequency)
            const harmonyOsc = this.musicContext.createOscillator();
            harmonyOsc.type = 'sine';
            harmonyOsc.frequency.value = 165; // E3
            const harmonyGain = this.musicContext.createGain();
            harmonyGain.gain.value = 0.1;
            harmonyOsc.connect(harmonyGain);
            harmonyGain.connect(this.musicGainNode);
            this.musicOscillators.push({osc: harmonyOsc, gain: harmonyGain});

            // Start oscillators
            melodyOsc.start();
            harmonyOsc.start();

            // Create a simple melody pattern that loops
            let noteIndex = 0;
            const melodyNotes = [220, 247, 262, 294, 330, 294, 262, 247]; // A, B, C, D, E, D, C, B
            const harmonyNotes = [165, 185, 196, 220, 247, 220, 196, 185]; // E, F#, G, A, B, A, G, F#

            const playNextNote = () => {
                if (!this.musicOscillators.length) return;

                // Update frequencies smoothly
                this.musicOscillators[0].osc.frequency.setTargetAtTime(
                    melodyNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.1
                );
                this.musicOscillators[1].osc.frequency.setTargetAtTime(
                    harmonyNotes[noteIndex], 
                    this.musicContext.currentTime, 
                    0.1
                );

                noteIndex = (noteIndex + 1) % melodyNotes.length;
                
                // Schedule next note change
                setTimeout(() => {
                    if (this.musicOscillators.length) {
                        playNextNote();
                    }
                }, beatDuration * 1000);
            };

            // Start melody pattern
            playNextNote();

            this.currentMusic = 'background';
        } catch (err) {
            console.debug('Background music start failed:', err);
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
        this.currentMusic = null;
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
}

