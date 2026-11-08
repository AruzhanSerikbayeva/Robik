@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Robik: kazakh voice generation ===
where py >nul 2>nul && (set PY=py) || (set PY=python)
%PY% -m pip install -U edge-tts
%PY% make_audio_simple.py %*
pause
