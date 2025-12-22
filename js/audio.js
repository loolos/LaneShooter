/**
 * Audio Manager - Handles all game sounds
 * Designed for easy extension with new sound effects
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
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
}

