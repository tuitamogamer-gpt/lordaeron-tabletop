#!/usr/bin/env python3
"""Prepares the game's music, sound effects and voice lines from the raw Fish Audio downloads.

The raw files stay out of Git in .local-data/audio/raw (see docs/AUDIO-2026-11-10.md for how each was made):
  music-map.mp4, music-battle.mp4   15 s clips of Fish's heygen-video-1 model; only their generated soundtrack is used
  sfx-<name>.mp4                     5 s clips of the same model, one sound each
  voice-<name>.mp3                   Fish text-to-speech lines (drama-3)
This writes public/assets/audio/{music,sfx,voice}/*.mp3: the music as seamless loops (the last 1.5 s crossfaded into the first),
each effect cut to its sound, the voices without leading or trailing silence, all at an even loudness.

    python3 scripts/prepare-audio.py
"""
import glob, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, '.local-data', 'audio', 'raw'), os.path.join(ROOT, 'public', 'assets', 'audio')
# Where each effect's sound lies in its 5 s clip (seconds), measured on the loudness envelope of the downloads.
EFFECTS = {'dice': (0.12, 2.3), 'sword': (1.45, 3.6), 'card': (2.45, 3.6), 'coins': (0.28, 1.9), 'levelup': (2.8, 5.2), 'victory': (1.35, 5.2)}
LOOP, FADE = 15.1, 1.5


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def main():
    if not os.path.isdir(RAW):
        sys.exit(f'No raw audio in {RAW}')
    for d in ('music', 'sfx', 'voice'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    for name in ('map', 'battle'):
        src = os.path.join(RAW, f'music-{name}.mp4')
        body = LOOP - FADE
        # Equal-power fades: the tail fades out while the opening fades in, so the file's end runs into its own body without a seam.
        graph = (f'[0:a]atrim=0:{FADE},asetpts=N/SR/TB,afade=t=in:d={FADE}:curve=qsin[head];[0:a]atrim={FADE}:{body},asetpts=N/SR/TB[body];'
                 f'[0:a]atrim={body}:{LOOP},asetpts=N/SR/TB,afade=t=out:d={FADE}:curve=qsin[tail];[tail][head]amix=inputs=2:normalize=0[join];'
                 f'[body][join]concat=n=2:v=0:a=1,loudnorm=I=-21:TP=-2:LRA=11[out]')
        ffmpeg('-i', src, '-filter_complex', graph, '-map', '[out]', '-ar', '32000', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, 'music', f'{name}.mp3'))
    for name, (start, end) in EFFECTS.items():
        length = end - start
        ffmpeg('-i', os.path.join(RAW, f'sfx-{name}.mp4'), '-vn', '-af',
               f'atrim={start}:{end},asetpts=N/SR/TB,afade=t=in:d=0.02,afade=t=out:st={max(0, length - 0.4):.2f}:d=0.4,loudnorm=I=-17:TP=-1.5',
               '-ar', '32000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '80k', os.path.join(OUT, 'sfx', f'{name}.mp3'))
    for src in sorted(glob.glob(os.path.join(RAW, 'voice-*.mp3'))):
        name = os.path.basename(src)[len('voice-'):-len('.mp3')]
        trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05'
        ffmpeg('-i', src, '-af', f'{trim},areverse,{trim},areverse,afade=t=out:st=0:d=0.01:curve=nofade,loudnorm=I=-16:TP=-1.5',
               '-ar', '32000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', os.path.join(OUT, 'voice', f'{name}.mp3'))
    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, '*', '*.mp3')))
    print(f'{len(glob.glob(os.path.join(OUT, "*", "*.mp3")))} files, {total / 1e6:.2f} MB in public/assets/audio')


if __name__ == '__main__':
    main()
