#!/usr/bin/env python3
"""Prepares the game's music, sound effects and voice lines from the raw Fish Audio downloads.

The raw files stay out of Git in .local-data/audio/raw (docs/EQUIPMENT-AND-SOUND-2026-11-10.md and docs/MUSIC-THEMES-2026-11-11.md
say how each was made):
  music-<theme>.mp4                  15 s clips of Fish's heygen-video-1 model; only their generated soundtrack is used
                                     (map, map-road, map-blight, map-council, battle, battle-charge, boss)
  sfx-<name>.mp4                     5 s clips of the same model, one sound each
  voice-<name>.mp3                   Fish text-to-speech lines (drama-3)
This writes public/assets/audio/{themes,sfx,voice}/*.mp3: the music as loops of 13.6 s (the last 1.5 s crossfaded into the first)
with 0.2 s of the same music before and after, so that the game can loop inside continuous sound,
each effect cut to its sound, the voices without leading or trailing silence, all at an even loudness.

    python3 scripts/prepare-audio.py
"""
import glob, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, '.local-data', 'audio', 'raw'), os.path.join(ROOT, 'public', 'assets', 'audio')
# Where each effect's sound lies in its 5 s clip (seconds), measured on the loudness envelope of the downloads.
EFFECTS = {'dice': (0.12, 2.3), 'sword': (1.45, 3.6), 'card': (2.45, 3.6), 'coins': (0.28, 1.9), 'levelup': (2.8, 5.2), 'victory': (1.35, 5.2)}
# Music: seconds used of each clip, the crossfade of its end into its start, the period that results, and the extra kept at each end.
LOOP, FADE = 15.1, 1.5
PERIOD, LEAD = LOOP - FADE, 0.2


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def samples(path, rate):
    """How many samples of sound the file decodes to at the given rate."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(rate), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return len(raw) // 2


def main():
    if not os.path.isdir(RAW):
        sys.exit(f'No raw audio in {RAW}')
    for d in ('themes', 'sfx', 'voice'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    for src in sorted(glob.glob(os.path.join(RAW, 'music-*.mp4'))):
        name = os.path.basename(src)[len('music-'):-len('.mp4')]
        rate = 32000
        if samples(src, rate) < round(LOOP * rate):
            sys.exit(f'{src} has less than {LOOP} s of sound')
        fade, body, loop, period, lead = (round(v * rate) for v in (FADE, LOOP - FADE, LOOP, PERIOD, LEAD))
        # 1. One period: equal-power fades let the clip's tail run into its opening, so the period repeats without a seam. The cuts
        #    count samples from the first one decoded: the soundtrack of these clips starts 51 ms after time zero, and cutting by time
        #    made the opening 51 ms shorter than the tail, a gap of silence at every repeat.
        # 2. Three periods go through the loudness normalisation and only the middle one is kept: the normaliser changes its gain
        #    slowly and treats the ends of its input differently.
        # 3. The file keeps LEAD seconds before and after the period. The game loops between those marks (audio.tsx > LOOP), so the
        #    loop points lie inside continuous sound whatever the MP3 coder and the browser's decoder do at the edges of a file.
        graph = (f'[0:a]aresample={rate},asetpts=N/SR/TB,asplit=3[h][b][t];'
                 f'[h]atrim=end_sample={fade},asetpts=N/SR/TB,afade=t=in:ns={fade}:curve=qsin[head];'
                 f'[b]atrim=start_sample={fade}:end_sample={body},asetpts=N/SR/TB[body];'
                 f'[t]atrim=start_sample={body}:end_sample={loop},asetpts=N/SR/TB,afade=t=out:ns={fade}:curve=qsin[tail];'
                 f'[tail][head]amix=inputs=2:normalize=0[join];[body][join]concat=n=2:v=0:a=1,asplit=3[p1][p2][p3];'
                 f'[p1][p2][p3]concat=n=3:v=0:a=1,loudnorm=I=-21:TP=-2:LRA=11,aresample={rate},'
                 f'atrim=start_sample={period - lead}:end_sample={2 * period + lead},asetpts=N/SR/TB[out]')
        ffmpeg('-i', src, '-filter_complex', graph, '-map', '[out]', '-ar', str(rate), '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, 'themes', f'{name}.mp3'))
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
