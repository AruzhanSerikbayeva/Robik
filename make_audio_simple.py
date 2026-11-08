#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Робик: репликаларды Microsoft қазақ дауысымен (Daulet / Aigul) қайта дыбыстайды.
ffmpeg ПЕН pydub ҚАЖЕТ ЕМЕС — тек Python және `pip install -U edge-tts`. Интернет керек.

Жоба папкасында (voice_lines.js жанында) іске қосыңыз:
    python make_audio_simple.py                       # ер дауыс Daulet
    python make_audio_simple.py --pause 0.6           # паузаларды қысқарту (1.3 = ұзарту)
    python make_audio_simple.py --emotion 1.5         # интонация күштірек (0 = интонациясыз)
    python make_audio_simple.py --voice kk-KZ-AigulNeural   # әйел дауыс
    python make_audio_simple.py --only i4,i5          # тек кейбір реплика

Интонация: ? -> сұрақ (биігірек), ! -> қуанышты, ... -> ойланып.
«Бип-бип!» сөзі дауыспен АЙТЫЛМАЙДЫ — орнына бос орын қалдырылады, ал core.js сол сәтте робот сигналын ойнатады.
Мәтінді өзгерткіңіз келсе — voice_lines.js ішіндегі "t" жолын түзетіп, осы скриптті қайта іске қосыңыз.
"""
import argparse, asyncio, json, os, re, shutil

PAUSE_MS = {"comma": 200, "sentence": 450, "ellipsis": 800, "colon": 350}
STYLE = {
    "question": {"pitch": 18, "rate": -3, "volume": 5},
    "exclaim":  {"pitch": 10, "rate": 8,  "volume": 12},
    "ellipsis": {"pitch": -4, "rate": -8, "volume": -5},
    "normal":   {"pitch": 0,  "rate": 0,  "volume": 0},
}
BEEP_RE = re.compile(r"бип[\s-]*бип[\s!.,…]*", re.I)   # core.js-тегі BEEP_RE-мен бірдей
BEEP_GAP_MS = 600
HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "voice_lines.js")
OUT = os.path.join(HERE, "audio")

# edge-tts: MPEG-2 Layer III, 24 кГц, 48 кбит/с, моно -> кадр 144 байт = 24 мс (бос кадр = тыныштық)
SILENT_FRAME = bytes([0xFF, 0xF3, 0x64, 0xC0]) + bytes(140)
BYTES_PER_SEC = 48000 / 8

def silence(ms):
    return b"" if ms <= 0 else SILENT_FRAME * max(1, round(ms / 24))

def load_lines():
    s = open(JS, encoding="utf-8").read()
    m = re.search(r"window\.AZ_LINES\s*=\s*(\{.*\})\s*;?\s*$", s, re.S)
    return json.loads(m.group(1)), s[:m.start(1)]

def spoken(t):
    t = t.replace("100%-ға", "жүз пайызға").replace("100%", "жүз пайыз").replace("10%", "он пайыз").replace("%", " пайыз")
    return re.sub(r"\s+", " ", t).strip()

def split(text, scale):
    t = spoken(text); raw = []
    for m in re.finditer(r"([^.!?…,;:]+)(\.{2,}|…|[.!?]+|[,;:])?", t):
        body, p = m.group(1).strip(" —-"), m.group(2) or ""
        if not body: continue
        key = None if not p else "ellipsis" if re.search(r"\.{2,}|…", p) else "sentence" if re.search(r"[.!?]", p) else "comma" if p == "," else "colon"
        kind = "question" if "?" in p else "exclaim" if "!" in p else "ellipsis" if key == "ellipsis" else "normal"
        mark = "?" if kind == "question" else "!" if kind == "exclaim" else "..." if kind == "ellipsis" else "." if key == "sentence" else "," if key == "comma" else ":" if key == "colon" else ""
        raw.append([body + mark, 0 if key is None else int(PAUSE_MS[key] * scale), key, len(body.split()), kind])
    out = []
    for i, (s, g, k, w, kind) in enumerate(raw):      # «Ой,» сияқты бір сөзді бөлікті келесімен біріктіру
        if k == "comma" and w < 2 and i < len(raw) - 1:
            raw[i + 1][0] = s + " " + raw[i + 1][0]; continue
        out.append((s, g, kind))
    if out: out[-1] = (out[-1][0], 0, out[-1][2])
    return out

def strip_id3(b):
    if b[:3] == b"ID3" and len(b) > 10:
        n = ((b[6] & 0x7F) << 21) | ((b[7] & 0x7F) << 14) | ((b[8] & 0x7F) << 7) | (b[9] & 0x7F)
        return b[10 + n:]
    return b

def prosody(base_rate, kind, emo):
    st = STYLE.get(kind, STYLE["normal"])
    rate = int(base_rate.replace("%", "")) + round(st["rate"] * emo)
    return "%+d%%" % rate, "%+d%%" % round(st["volume"] * emo), "%+dHz" % round(st["pitch"] * emo)

async def synth(text, voice, rate, volume, pitch):
    import edge_tts
    data = bytearray()
    async for ch in edge_tts.Communicate(text, voice, rate=rate, volume=volume, pitch=pitch).stream():
        if ch["type"] == "audio": data += ch["data"]
    if not data: raise RuntimeError("бос жауап")
    return strip_id3(bytes(data))

def chunk(text, voice, rate, volume, pitch):
    last = None
    for _ in range(4):
        try: return asyncio.run(synth(text, voice, rate, volume, pitch))
        except Exception as e: last = e
    raise SystemExit("Дауыс алынбады: %s\nЖаңартып көріңіз: pip install -U edge-tts (және интернетті тексеріңіз)" % last)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="kk-KZ-DauletNeural")
    ap.add_argument("--rate", default="-10%")
    ap.add_argument("--pause", type=float, default=1.0, help="пауза көбейткіші: 0.6 = қысқа, 1.3 = ұзын")
    ap.add_argument("--emotion", type=float, default=1.0, help="интонация күші: 0 = жоқ, 1 = әдепкі, 1.5 = күшті")
    ap.add_argument("--only")
    a = ap.parse_args()
    lines, head = load_lines()
    if os.path.isdir(OUT) and not os.path.isdir(OUT + "_old"): shutil.copytree(OUT, OUT + "_old")   # ескі файлдардың көшірмесі
    os.makedirs(OUT, exist_ok=True)
    keys = a.only.split(",") if a.only else list(lines)
    for n, k in enumerate(keys, 1):
        buf = bytearray(silence(60)); beep_at = None
        mb = BEEP_RE.search(lines[k]["t"])
        segs = [lines[k]["t"][:mb.start()], None, lines[k]["t"][mb.end():]] if mb else [lines[k]["t"]]
        for seg in segs:
            if seg is None:
                beep_at = len(buf) / BYTES_PER_SEC; buf += silence(BEEP_GAP_MS); continue
            for txt, gap, kind in split(seg, a.pause):
                r, v, p = prosody(a.rate, kind, a.emotion)
                c = chunk(txt, a.voice, r, v, p)
                if c[:2] not in (b"\xff\xf3", b"\xff\xf2"):
                    raise SystemExit("Күтпеген аудио форматы. Қатені маған жіберіңіз.")
                buf += c + silence(gap)
        buf += silence(80)
        open(os.path.join(OUT, k + ".mp3"), "wb").write(buf)
        lines[k]["d"] = round(len(buf) / BYTES_PER_SEC, 2)
        if beep_at is not None: lines[k]["b"] = round(beep_at, 2)
        else: lines[k].pop("b", None)
        print("[%d/%d] %s: %.1f с%s" % (n, len(keys), k, lines[k]["d"], "  (бип-бип сигналы %.1f с-та)" % beep_at if beep_at is not None else ""), flush=True)
    open(JS, "w", encoding="utf-8").write(head + json.dumps(lines, ensure_ascii=False, indent=1) + ";\n")
    print("\nДайын! Енді ойынды ашып, Ctrl+F5 басыңыз.")

if __name__ == "__main__":
    main()
