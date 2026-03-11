import wave
import math
import struct
import os
import random

sample_rate = 44100

def generate_wav(filename, duration, freq_func, amp_func):
    num_samples = int(duration * sample_rate)
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            freq = freq_func(t)
            amp = amp_func(t)
            # Mixed waveforms for different character voices
            value = int(amp * 32767.0 * math.sin(2.0 * math.pi * freq * t))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

def ensure_dir():
    os.makedirs("public/audio", exist_ok=True)

# 1. Animal Crossing / Undertale style Anime Voice Pip
# High-pitched, short burst of harmonics
def make_anime_pip():
    # Random base frequency for variation (A4 to C5 range approx)
    base_freq = random.uniform(800, 1200)
    def freq(t): 
        # Quick downward portamento typical of speech syllables
        return base_freq - (300 * (t / 0.08))
    def amp(t): 
        # Quick attack and release
        envelope = math.sin(math.pi * (t / 0.08)) ** 2
        return envelope * 0.4
    generate_wav("public/audio/anime_pip.wav", 0.08, freq, amp)

# 2. Synth Meow
# Gliding formant sweep mimicking a "meow"
def make_cat_meow():
    def freq(t):
        # Sweeps up then down: MEEEE-OOOOW
        # Base around 600Hz, spikes to 900Hz, drops to 400Hz
        if t < 0.2:
            return 600 + (300 * (t/0.2))
        else:
            return 900 - (500 * ((t-0.2)/0.3))
    def amp(t):
        # 500ms duration total
        return math.sin(math.pi * (t / 0.5)) * 0.5
    generate_wav("public/audio/cat_meow.wav", 0.5, freq, amp)

# Also keeping standard typing just in case, but we can update UI to use specific voices
def make_typing():
    def freq(t): return 1200 + 400 * math.sin(t * 1000)
    def amp(t): return max(0.0, 1.0 - (t / 0.05)) * 0.3
    generate_wav("public/audio/typing.wav", 0.05, freq, amp)

def make_hover():
    def freq(t): return 400 + 400 * (t / 0.08)
    def amp(t): return max(0.0, 1.0 - (t / 0.08)) * 0.4
    generate_wav("public/audio/hover.wav", 0.08, freq, amp)

def make_click():
    def freq(t): return 1500 - 1000 * (t / 0.1)
    def amp(t): return max(0.0, 1.0 - (t / 0.1)) * 0.6
    generate_wav("public/audio/click.wav", 0.1, freq, amp)

def make_transition():
    def freq(t): return 200 + 800 * math.sin(t * 20.0) + 400 * math.cos(t * 50.0)
    def amp(t): return max(0.0, 1.0 - (t / 0.5)) * 0.5
    generate_wav("public/audio/transition.wav", 0.5, freq, amp)

if __name__ == "__main__":
    print("Generating bespoke Siggy AI audio assets (Voices Edition)...")
    ensure_dir()
    make_anime_pip()
    make_cat_meow()
    make_typing() # keeping fallback typing
    make_hover()
    make_click()
    make_transition()
    print("Audio generation complete. Saved to public/audio/")
