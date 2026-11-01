"""効果音を合成して WAV にする。使い方: python3 sfx.py sfx.json out.wav"""
import json, sys, wave
import numpy as np

SR = 44100
data = json.load(open(sys.argv[1]))
dur = data['frames'] / data['fps'] + 0.5
out = np.zeros(int(SR * dur))
rng = np.random.default_rng(7)


def add(t, sig):
    i = int(t * SR)
    n = min(len(sig), len(out) - i)
    if n > 0:
        out[i:i + n] += sig[:n]


def osc(phase, kind):
    if kind == 'square':
        return np.sign(np.sin(phase)) * 0.6
    if kind == 'tri':
        x = (phase / (2 * np.pi)) % 1
        return 2 * np.abs(2 * x - 1) - 1
    if kind == 'saw':
        return 2 * ((phase / (2 * np.pi)) % 1) - 1
    return np.sin(phase)


def tone(f, d, kind='sine', vol=0.3, decay=6.0):
    t = np.arange(int(SR * d)) / SR
    return osc(2 * np.pi * f * t, kind) * np.exp(-decay * t) * np.minimum(1, t / 0.004) * vol


def sweep(f0, f1, d, kind='sine', vol=0.3, decay=3.0):
    t = np.arange(int(SR * d)) / SR
    f = f0 + (f1 - f0) * t / d
    phase = 2 * np.pi * np.cumsum(f) / SR
    return osc(phase, kind) * np.exp(-decay * t) * np.minimum(1, t / 0.004) * vol


def noise(d, vol=0.2, decay=10.0):
    t = np.arange(int(SR * d)) / SR
    n = rng.standard_normal(len(t))
    n = np.convolve(n, np.ones(6) / 6, mode='same')  # 少し丸める
    return n * np.exp(-decay * t) * vol


def coin(t, v=1.0):
    add(t, tone(1976, 0.07, 'square', 0.10 * v, 10))
    add(t + 0.06, tone(2637, 0.22, 'square', 0.10 * v, 9))


SOUNDS = {
    'beep': lambda t: add(t, tone(880, 0.16, 'square', 0.16, 8)),
    'go': lambda t: add(t, tone(1320, 0.4, 'square', 0.18, 4)),
    'coin': lambda t: coin(t, 0.8),
    'gate': lambda t: (coin(t), coin(t + 0.13), add(t, tone(196, 0.25, 'tri', 0.3, 9))),
    'boss': lambda t: (add(t, sweep(170, 85, 0.7, 'saw', 0.2, 3)), add(t, noise(0.35, 0.08, 8))),
    'warn': lambda t: [add(t + k * 0.2, tone(660 if k % 2 == 0 else 880, 0.18, 'square', 0.08, 2)) for k in range(6)],
    'crash': lambda t: (add(t, noise(0.5, 0.32, 8)), add(t, sweep(170, 45, 0.35, 'sine', 0.45, 6))),
    'stamp': lambda t: (add(t, sweep(150, 42, 0.32, 'sine', 0.65, 7)), add(t, noise(0.12, 0.25, 30))),
    'answer': lambda t: [add(t + k * 0.11, tone(f, 0.6 if k == 3 else 0.2, 'tri', 0.26, 4 if k == 3 else 7))
                         for k, f in enumerate([523, 659, 784, 1047])],
    'lose': lambda t: ([add(t + k * 0.26, tone(f, 0.26, 'tri', 0.25, 3)) for k, f in enumerate([392, 370, 349])],
                       add(t + 0.78, sweep(330, 262, 0.9, 'tri', 0.25, 2))),
    'end': lambda t: (add(t, tone(1047, 1.0, 'sine', 0.22, 3)), add(t + 0.09, tone(1568, 1.0, 'sine', 0.12, 3))),
}

# エンジン音（走っている間だけ低くうなる）
on = None
segments = []
for e in data['events']:
    if e['kind'] == 'engine_on':
        on = e['t']
    elif e['kind'] == 'engine_off' and on is not None:
        segments.append((on, e['t']))
        on = None
if on is not None:
    segments.append((on, dur - 0.5))
for a, b in segments:
    t = np.arange(int(SR * (b - a))) / SR
    lfo = 1 + 0.04 * np.sin(2 * np.pi * 7 * t)
    hum = osc(2 * np.pi * np.cumsum(58 * lfo) / SR, 'saw') * 0.6 + osc(2 * np.pi * np.cumsum(116 * lfo) / SR, 'saw') * 0.3
    hum = np.convolve(hum, np.ones(24) / 24, mode='same')
    fade = np.minimum(1, np.minimum(t / 0.15, (t[-1] - t) / 0.15 + 1e-9))
    add(a, hum * fade * 0.07)

for e in data['events']:
    f = SOUNDS.get(e['kind'])
    if f:
        f(e['t'])

peak = np.max(np.abs(out)) or 1
out = out / peak * 0.85
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wav', round(dur, 2), 's,', len(data['events']), 'events')
