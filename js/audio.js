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
}

