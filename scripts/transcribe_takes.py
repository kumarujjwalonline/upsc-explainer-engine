"""Word timings for voice takes recorded in a Claude thread (free faster-whisper on GitHub).
usage: python scripts/transcribe_takes.py voice-takes/<id>
Reads s*.mp3 and takes.json (the text sent to the voice, used as the prompt so English words keep
their spelling), writes s*.words.json as {"text", "words": [{"text", "type": "word", "start", "end"}]}.
"""
import glob
import json
import os
import subprocess
import sys

import numpy as np

from faster_whisper import WhisperModel

d = sys.argv[1]
texts = json.load(open(os.path.join(d, "takes.json"), encoding="utf-8"))
model = WhisperModel(os.environ.get("WHISPER", "large-v3-turbo"), device="cpu", compute_type="int8")
for mp3 in sorted(glob.glob(os.path.join(d, "s*.mp3"))):
    k = os.path.basename(mp3)[:-4]
    t = texts.get(k)
    t = t if isinstance(t, str) else (t or {}).get("text", "")
    # decode with ffmpeg: some PyAV builds reject faster-whisper's own decoder arguments
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    segs, _ = model.transcribe(audio, language="hi", word_timestamps=True, beam_size=5, initial_prompt=t[:600], condition_on_previous_text=True)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append({"text": w.word.strip(), "type": "word", "start": round(w.start, 3), "end": round(w.end, 3)})
    json.dump({"text": " ".join(w["text"] for w in words), "words": words}, open(os.path.join(d, f"{k}.words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(k, len(words), "words")
