# -*- coding: utf-8 -*-
"""
Script tạo bộ âm thanh thuyết trình 3 phút (AI Voiceover TTS) + Phụ đề .SRT
cho dự án Học Bổng Hunter v4.0 — Meta Global AI Developer Hackathon.
Sử dụng Windows Speech Engine + FFmpeg Studio Mastering (192kbps MP3 + 44.1kHz WAV).
"""
import json
import os
import subprocess

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

SEGMENTS = [
    {
        "id": "01_intro_apology",
        "title": "1. Intro & Polite Apology for Using TTS",
        "action": "intro",
        "text": (
            "Hello Meta and Cerebral Valley judges! My name is Doan Minh Tri, an indie developer from Vietnam. "
            "First, please accept my sincere apologies: because my spoken English is not very fluent yet, "
            "I kindly ask for your permission to use AI Text-to-Speech so I can present my project clearly within the three-minute limit. "
            "Today, I am excited to introduce Hoc Bong Hunter version 4.0 — an open-source, 12-node multi-agent scholarship ecosystem "
            "powered by Meta Muse Wonder 1.0 and Muse Spark 1.3."
        )
    },
    {
        "id": "02_problem_and_i18n",
        "title": "2. Problem Statement, 50 Languages & QuotaGuard Security",
        "action": "switch_lang_and_theme",
        "text": (
            "Every year, millions of students miss out on life-changing international scholarships because portals are scattered across languages, "
            "commercial agencies charge thousands of dollars, and standard LLMs often hallucinate expired deadlines or fake links. "
            "To solve this for students worldwide, Hoc Bong Hunter supports 50 global languages with automatic right-to-left layout, "
            "Light and Dark themes, and five free sponsored live API runs per IP and device MAC address via our QuotaGuard security engine."
        )
    },
    {
        "id": "03_profile_and_radar",
        "title": "3. AI CV Parser, 1-Click Presets & 5-Axis SVG Radar Chart",
        "action": "select_preset_and_radar",
        "text": (
            "Let's see how it works in real time. A student can either paste their raw resume into our AI CV Parser powered by Muse Spark 1.3, "
            "or select a one-click student preset. Immediately, Node 1 analyzes their academic profile and renders a live 5-Axis SVG Radar Chart, "
            "comparing their GPA, IELTS score, and research experience against a Full Scholarship Benchmark."
        )
    },
    {
        "id": "04_multi_agent_pipeline",
        "title": "4. 12-Node Pipeline & Muse Wonder 1.0 + Spark 1.3 Routing",
        "action": "run_pipeline_and_inspect",
        "text": (
            "Now, when we trigger the 12-node pipeline, our Heterogeneous Router pairs Meta's newest models over the official v1 responses API. "
            "Node 2, powered by Muse Wonder 1.0, acts as the Supervisor and designs a three-lane search strategy. "
            "It then fans out to three parallel Muse Spark 1.3 Researcher agents executing concurrent web searches. "
            "Clicking any node on our interactive SVG flowchart opens the live Telemetry Inspector — showing the exact input prompt, "
            "JSON output, model ID, token usage, latency, and USD cost."
        )
    },
    {
        "id": "05_triple_verification",
        "title": "5. Triple-Verification Protocol & Side-by-Side Comparison",
        "action": "show_verification_and_compare",
        "text": (
            "To completely eliminate AI hallucinations, Node 8 runs our Triple-Verification Engine. "
            "Using Muse Wonder 1.0 in a fresh context window alongside deterministic checks, it audits official dot-gov and dot-edu domains, "
            "validates 2026 to 2027 deadlines, and cross-checks GPA and language requirements to compute a transparent Trust Score up to 99 percent. "
            "Students can also select multiple verified cards to compare them side-by-side."
        )
    },
    {
        "id": "06_studio_and_outro",
        "title": "6. AI Mock Interviewer (#11), Essay Critic (#12) & Calendar/PDF Export",
        "action": "run_studio_interview_and_essay",
        "text": (
            "Finally, in our AI Application Studio, Muse Wonder 1.0 drafts a tailored Motivation Letter and a three-stage roadmap. "
            "Agent 11 serves as an AI Mock Interview Coach with voice recognition and STAR method grading, "
            "while Agent 12 acts as an AI Essay Critic that detects clichés and rewrites weak drafts into polished academic English. "
            "Students can export deadlines to Google or Apple Calendar via dot-ICS or print an A4 PDF report. "
            "Thank you Meta and Cerebral Valley for this incredible hackathon!"
        )
    }
]


def get_duration(file_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())


def format_srt_time(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def synthesize_wav(text: str, wav_path: str):
    ps_script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Culture.Name -like 'en-*' }}
if ($voices.Count -gt 0) {{
    $synth.SelectVoice($voices[0].VoiceInfo.Name)
}}
$synth.Rate = 0
$synth.Volume = 100
$synth.SetOutputToWaveFile('{wav_path.replace("'", "''")}')
$synth.Speak('{text.replace("'", "''")}')
$synth.Dispose()
"""
    subprocess.run(["pwsh", "-NoProfile", "-Command", ps_script], check=True)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest = []
    concat_lines = []

    silence_path = os.path.join(OUTPUT_DIR, "silence_600ms.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", "0.6", "-b:a", "192k", "-acodec", "libmp3lame", silence_path
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    current_time = 0.0
    srt_entries = []

    for idx, seg in enumerate(SEGMENTS, start=1):
        raw_wav = os.path.join(OUTPUT_DIR, f"{seg['id']}_raw.wav")
        mp3_path = os.path.join(OUTPUT_DIR, f"{seg['id']}.mp3")

        synthesize_wav(seg["text"], raw_wav)

        # Studio filter: chuẩn hóa stereo 44.1kHz, 192kbps, tốc độ 1.16x để khớp chuẩn < 3 phút (172s)
        subprocess.run([
            "ffmpeg", "-y", "-i", raw_wav,
            "-af", "atempo=1.16,highpass=f=80,acompressor=threshold=-18dB:ratio=2:attack=20:release=250,volume=1.28",
            "-ar", "44100", "-ac", "2", "-acodec", "libmp3lame", "-b:a", "192k",
            mp3_path
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if os.path.exists(raw_wav):
            os.remove(raw_wav)

        dur = get_duration(mp3_path)
        start_t = current_time
        end_t = current_time + dur

        manifest.append({
            "index": idx,
            "id": seg["id"],
            "title": seg["title"],
            "action": seg["action"],
            "file": f"demo_voiceover/{seg['id']}.mp3",
            "duration": round(dur, 2),
            "startTime": round(start_t, 2),
            "endTime": round(end_t, 2),
            "text": seg["text"]
        })

        srt_entries.append(
            f"{idx}\n{format_srt_time(start_t)} --> {format_srt_time(end_t)}\n{seg['text']}\n"
        )

        concat_lines.append(f"file '{mp3_path.replace(os.sep, '/')}'")
        if idx < len(SEGMENTS):
            concat_lines.append(f"file '{silence_path.replace(os.sep, '/')}'")
            current_time = end_t + 0.6
        else:
            current_time = end_t

        print(f"[OK] Generated {seg['id']}.mp3 ({dur:.2f}s)")

    concat_txt = os.path.join(OUTPUT_DIR, "concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(concat_lines) + "\n")

    full_mp3 = os.path.join(OUTPUT_DIR, "hocbong_hunter_3min_pitch_full.mp3")
    full_wav = os.path.join(OUTPUT_DIR, "hocbong_hunter_3min_pitch_full.wav")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
        "-acodec", "libmp3lame", "-b:a", "192k", full_mp3
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    subprocess.run([
        "ffmpeg", "-y", "-i", full_mp3, "-ar", "44100", "-ac", "2", full_wav
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(concat_txt):
        os.remove(concat_txt)
    if os.path.exists(silence_path):
        os.remove(silence_path)

    total_dur = get_duration(full_mp3)

    srt_path = os.path.join(OUTPUT_DIR, "hocbong_hunter_3min_pitch_subtitles.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_entries))

    manifest_path = os.path.join(OUTPUT_DIR, "pitch_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "voice": "English Studio TTS (192kbps)",
            "totalDurationSeconds": round(total_dur, 2),
            "totalDurationFormatted": f"{int(total_dur // 60)}m {int(total_dur % 60):02d}s",
            "fullMp3": "demo_voiceover/hocbong_hunter_3min_pitch_full.mp3",
            "segments": manifest
        }, f, indent=2, ensure_ascii=False)

    print(f"\n=======================================================")
    print(f"COMPLETED! Total Pitch Duration: {int(total_dur // 60)}m {int(total_dur % 60):02d}s ({total_dur:.2f}s)")
    print(f"- Full MP3 : {full_mp3}")
    print(f"- Full WAV : {full_wav}")
    print(f"- SRT Subs : {srt_path}")
    print(f"=======================================================")


if __name__ == "__main__":
    main()
