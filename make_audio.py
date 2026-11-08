#!/usr/bin/env python3
"""
Робик үшін дыбыс жасау: 55 репликаны қайта дыбыстайды (audio/*.mp3) және voice_lines.js ішіндегі ұзақтықтарды жаңартады.

  Негізгі режим (ұсынылады):  python make_audio.py            -> Microsoft Edge табиғи қазақ дауысы (Daulet), интернет керек
  Басқа дауыс:                python make_audio.py --voice kk-KZ-AigulNeural
  Офлайн (сапасы төмен):      python make_audio.py --engine espeak

Мәтін үтір, нүкте, көп нүкте бойынша бөлшектерге бөлінеді; арасына ТЫНЫС ПАУЗАСЫ (тыныштық) қосылады.
Қажет: pip install edge-tts pydub   және   ffmpeg (Windows: winget install Gyan.FFmpeg).
Скриптті жоба папкасында (voice_lines.js жанында) іске қосыңыз.
"""
import argparse, asyncio, json, os, re, subprocess, sys, tempfile
from pydub import AudioSegment

PAUSE_MS = {"sentence": 750, "ellipsis": 1200, "comma": 380, "colon": 550}   # пауза ұзақтығы, мс
HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "voice_lines.js")
OUT = os.path.join(HERE, "audio")

def load_lines():
    s = open(JS, encoding="utf-8").read()
    m = re.search(r"window\.AZ_LINES\s*=\s*(\{.*\})\s*;?\s*$", s, re.S)
    return json.loads(m.group(1)), s[:m.start(1)]

def spoken(t):
    t = t.replace("100%-ға", "жүз пайызға").replace("100%", "жүз пайыз").replace("10%", "он пайыз").replace("%", " пайыз")
    return re.sub(r"\s+", " ", t).strip()

def split(text):
    """[(мәтін, пауза_мс)] — шығатын тыныс белгісіне қарай"""
    t = spoken(text); raw = []
    for m in re.finditer(r"([^.!?…,;:]+)(\.{2,}|…|[.!?]+|[,;:])?", t):
        body, p = m.group(1).strip(), m.group(2) or ""
        if not body: continue
        gap = 0 if not p else PAUSE_MS["ellipsis"] if re.search(r"\.{2,}|…", p) else PAUSE_MS["sentence"] if re.search(r"[.!?]", p) else PAUSE_MS["comma"] if p == "," else PAUSE_MS["colon"]
        raw.append([body.strip(" —-"), gap, len(body.split())])
    out = []
    for i, (s, g, w) in enumerate(raw):
        if g == PAUSE_MS["comma"] and w < 2 and i < len(raw) - 1:      # «Ой,» сияқты қысқа бөлікті келесімен біріктіру
            raw[i + 1][0] = s + ", " + raw[i + 1][0]; continue
        out.append((s, g))
    if out: out[-1] = (out[-1][0], 0)
    return out

async def edge_chunk(text, path, voice, rate):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate).save(path)

def tts_chunk(text, path, a):
    if a.engine == "edge":
        for attempt in range(3):
            try:
                asyncio.run(edge_chunk(text, path, a.voice, a.rate)); return
            except Exception as e:
                if attempt == 2: raise
    else:
        wav = path + ".wav"
        subprocess.run(["espeak-ng", "-v", "kk", "-s", str(a.espeed), "-p", "50", "-g", "6", "-w", wav, text], check=True)
        AudioSegment.from_wav(wav).export(path, format="mp3"); os.remove(wav)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["edge", "espeak"], default="edge")
    ap.add_argument("--voice", default="kk-KZ-DauletNeural")
    ap.add_argument("--rate", default="-12%", help="edge: жылдамдық, мысалы -12%% (баяулау)")
    ap.add_argument("--espeed", type=int, default=120, help="espeak: сөз/минут")
    ap.add_argument("--only", help="тек осы кілттер (үтірмен), мысалы i1,i2")
    a = ap.parse_args()
    lines, head = load_lines(); os.makedirs(OUT, exist_ok=True)
    keys = a.only.split(",") if a.only else list(lines)
    with tempfile.TemporaryDirectory() as tmp:
        for n, k in enumerate(keys, 1):
            seg = AudioSegment.silent(150)
            for j, (txt, gap) in enumerate(split(lines[k]["t"])):
                p = os.path.join(tmp, f"{k}_{j}.mp3"); tts_chunk(txt, p, a)
                seg += AudioSegment.from_file(p) + AudioSegment.silent(gap)
            seg += AudioSegment.silent(200)
            seg.export(os.path.join(OUT, k + ".mp3"), format="mp3", bitrate="96k")
            lines[k]["d"] = round(len(seg) / 1000, 2)
            print(f"[{n}/{len(keys)}] {k}: {lines[k]['d']} с")
    open(JS, "w", encoding="utf-8").write(head + json.dumps(lines, ensure_ascii=False, indent=1) + ";\n")
    print("Дайын: audio/ және voice_lines.js жаңартылды.")

if __name__ == "__main__":
    main()
