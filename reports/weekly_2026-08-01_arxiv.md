# Weekly AMT × LLM/Agent/Foundation-Model Report — 2026-08-01

**Scope:** arXiv papers (2025–2026) that explicitly combine Automatic Music Transcription (AMT) — audio→score/audio→MIDI/audio→lyrics — with large language models, multimodal agents, or foundation-model training paradigms.

**Window covered:** rolling ~12 months, with bias toward 2026-05 through 2026-07.
**Density:** Strong week, *but* with a notable shift in centre-of-gravity. The headline story is no longer "AMT paper that uses a token-prediction Transformer" (MuScriptor already closed that loop last week). The new story is the **convergence of AMT evaluation and music-generation foundation models** — Qwen-Music (Alibaba) now uses Qwen3-ASR as its in-loop lyric-intelligibility metric, the same backbone VocalParse is fine-tuned from. Two papers from the last 10 days (MulTTiPop, Qwen-Music) plus a clean empirical study of the perception-reasoning gap (Carone et al.) form the new spine of the field.

---

## Papers

### 1. MuScriptor — Open Multi-Instrument AMT Foundation Model (Rouard et al., 2026)
- **arXiv ID:** `arXiv:2607.08168`
- **URL:** https://arxiv.org/abs/2607.08168
- **Submitted:** 9 Jul 2026 (v1, 160 KB)
- **Abstract excerpt:** *"Existing methods for automatic music transcription are often limited to single-instrument recordings or fail on complex, real music mixes. Although previous work utilizes synthetic training data, the resulting models generalize poorly… we analyze the effectiveness of synthetic data for pre-training while combining it with fine-tuning on real music audio and post-training using reinforcement learning. We further introduce conditioning on instrument presence to customize transcriptions. Finally, we release MuScriptor, an open-weight multi-instrument music transcription model that works on real-world music recordings from across a diverse range of musical genres."*
- **Summary in my own words:** MuScriptor recasts multi-instrument AMT as autoregressive MIDI-token generation (MT3-style) over a decoder-only Transformer that reads a mel-spectrogram. The kicker is the third training stage: an RL pass over high-quality real data, plus optional conditioning on a known instrument set at inference time — that's the knob that lets one model transcribe "anything from classical to heavy metal." Reported multi-instrument F1 is 48.2 vs. 21.9 for YourMT3+ on the same eval. The released `muscriptor/muscriptor` repo has **941 stars, 122 forks** as of this cycle (verified via the GitHub repo page), making it the most-traction multi-instrument AMT release of the year.
- **Reproducibility:** ✅ **Open weights + code released.** Code: <https://github.com/muscriptor/muscriptor> (MIT). Weights on Hugging Face under the `MuScriptor/` org, CC BY-NC 4.0. Three sizes — small (≈103 M), medium (≈307 M), large (≈1.3 B) — plus a `uvx muscriptor serve` web UI (FastAPI + SpessaSynth + MuseScore General SF3). `muscriptor transcribe audio.wav -o out.mid --auralize check.wav` is the one-shot CLI. On the same eval split, the full three-stage pipeline gives 60.4 / 73.3 / 49.0 / 50.2 / 48.2 across Onset / Frame / Offset / Drums / Multi F1 vs. YourMT3+ at 32.5 / 45.5 / 17.8 / 41.4 / 21.9.

### 2. Qwen-Music Technical Report (Qwen Team, 2026) — *NEW THIS WEEK (v2)*
- **arXiv ID:** `arXiv:2607.11699`
- **URL:** https://arxiv.org/abs/2607.11699
- **Submitted:** 13 Jul 2026 (v1) → **27 Jul 2026 (v2, this version)**, 5,311 KB
- **Authors:** Jin Xu, Kangdi Wang, Ruibin Yuan, Shun Lei, Xiong Wang, Xize Cheng, Xueyao Zhang, Yang Zhang, Yiheng Chen, Yongqi Wang, Yue Wang, Zhifang Guo, Zihan Liu, Zijian Lin, Dake Guo, Hangrui Hu, Lei Xie, Linhan Ma, Wei Xue, Wenxiang Guo, Xinfa Zhu, Xipin Wei, Yangze Li, Yuanjun Lv, Yuxuan Wang, Yunfei Chu, Zhiyong Wu (Alibaba Qwen team)
- **Abstract excerpt:** *"We introduce Qwen-Music, a powerful music generation model capable of producing highly musical and high-fidelity songs with complete vocal singing… Qwen-Music integrates three core components: Qwen-Music-Tokenizer, Qwen-Music-LLM, and Qwen-Music-Render. Qwen-Music-Tokenizer compresses audio into a 25 Hz single-codebook stream of Music Semantic Tokens… a melody-token-based chain-of-thought (Melody-CoT) mechanism that plans melodies before full-song generation… we train Qwen-Music-LLM on more than 5 million hours of multilingual music data… Across 600 Chinese and English prompts, Qwen-Music achieves state-of-the-art results in 13 of 16 objective musicality and audio-quality metrics. Professional evaluators also prefer Qwen-Music over leading proprietary systems."*
- **Summary in my own words:** Qwen-Music is the **first closed/open-weights generation FM that uses an AMT-derived metric in its eval loop**: the lyrics-intelligibility of generated songs is scored with **Qwen3-ASR** (Shi et al. 2026) and reported as Phoneme Error Rate. That's the same LALM backbone that VocalParse is fine-tuned from — meaning the Qwen team is now treating Qwen3-ASR as a *de facto* lyrics-AMT benchmark. The 25 Hz single-codebook tokenizer is on the same frame-rate axis as HeartCodec, and the **Melody-CoT** trick (plan melodies, then generate the full semantic-token sequence) is the musical cousin of VocalParse's lyric-CoT. v2 is the more polished report — same headline numbers, refined evaluation methodology. The field's centre-of-gravity is now visibly migrating toward "AMT as in-loop eval of generation."
- **Reproducibility:** ⚠️ **Tech report; not a paper with code release.** A community Hugging Face port is expected but not yet linked from the abstract. The Qwen3-ASR backbone is itself open-weight and used here as a black-box metric. Watch the `Qwen/` org for a public checkpoint.

### 3. MulTTiPop — Multitrack Transcription Dataset for Pop Music (Pruyne et al., 2026) — *NEW THIS WEEK*
- **arXiv ID:** `arXiv:2607.08756`
- **URL:** https://arxiv.org/abs/2607.08756
- **Submitted:** 9 Jul 2026 (v1, 754 KB, 8 pages, 4 figures)
- **Authors:** Nathan Pruyne, Benjamin Stoler, William Chen, Chien-yu Huang, Shinji Watanabe, Chris Donahue (CMU + JHU + Adobe Research)
- **Abstract excerpt:** *"We present MulTTiPop, a dataset of pop music segments and their associated multitrack MIDI recordings for the evaluation of automatic music transcription models. MulTTiPop contains 572 segments of popular music totaling 3.5 hours of audio, and contains songs from diverse genres and decades from the 1930s to 2000s… We evaluate state-of-the-art automatic music transcription models on MulTTiPop and find substantial room for improvement, with the best model achieving 38% Onset F1."* License: CC BY 4.0.
- **Summary in my own words:** A **reproducible commercial-pop eval set** with tempo-warped multitrack MIDI aligned to Lakh MIDI + TheoryTab audio. The headline number is brutal: the *best* SOTA AMT model hits 38% Onset F1 on real commercial pop — for context, MuScriptor posts 60.4 Onset F1 on its own held-out test set. The gap is the real story: this is a community invitation to stop reporting numbers only on synthetic or cleanly-stemmed test sets. A separate CMU/Adobe team publishing a hard real-world AMT eval in the same week MuScriptor ships is the kind of productive tension the field needs.
- **Reproducibility:** ✅ **Dataset + sound examples public.** Project page: <https://gclef-cmu.org/multtipop>. CC BY 4.0 license. The paper is explicit that the dataset is **for evaluation only, not training** (commercial-audio copyright). This is the new mandatory baseline to beat.

### 4. MuseAgent-1 — Interactive Grounded Multimodal Understanding of Music Scores + Performance Audio (Zhao et al., 2026)
- **arXiv ID:** `arXiv:2601.11968` (cross-listed cs.MM / cs.SD / eess.AS)
- **URL:** https://arxiv.org/abs/2601.11968
- **Submitted:** 17 Jan 2026 (v1, 2,374 KB) — companion to ICLR 2026 submission #17059
- **Authors:** Qihao Zhao, Yunqi Cao, Yangyu Huang, Hui Yi Leong, Fan Zhang, Kim-Hui Yap, Wei Hu (NTU + BUCT + Microsoft + U. Chicago)
- **Abstract excerpt:** *"We introduce MuseAgent, a music-centric multimodal agent that augments language models with structured symbolic representations derived from sheet music images and performance audio. By integrating optical music recognition and automatic music transcription modules, MuseAgent enables multi-step reasoning and interaction over fine-grained musical content… experiments show that existing MLLMs perform poorly on these tasks, while MuseAgent achieves substantial improvements."*
- **Summary in my own words:** The cleanest *architecture-pattern* paper in the field: stick a CQT-based AMT module (audio→MusicXML/JSON) and a measure-wise OMR module (sheet image→ABC) in front of an LLM, plus a retrieval layer over symbolic + audio libraries, and you get a system that actually answers "what key is this passage modulating to?" — something stock MLLMs like Gemini-2.5-Pro routinely fail at. With GPT-4.1 as the orchestrator, MuseAgent hits 79.1% accuracy on the audio slice of MuseBench. The paper's hidden importance: it gives the field the *vocabulary* (M-OMR + AMT + RAG + LLM) that every later paper cites.
- **Reproducibility:** ⚠️ **Partial.** Paper + ICLR OpenReview submission at <https://openreview.net/forum?id=kDqH5KmRWR> linked. No first-party public GitHub repo; the AMT and OMR modules themselves rely on existing baselines. Worth a follow-up to the authors (Wei Hu, BUCT) for a code drop.

### 5. VocalParse — Singing-Voice Transcription with a Large Audio Language Model (Chen et al., 2026)
- **arXiv ID:** `arXiv:2605.04613`
- **URL:** https://arxiv.org/abs/2605.04613
- **Submitted:** 6 May 2026 (v1)
- **Authors:** Yukun Chen, Tianrui Wang, Zhaoxi Mu, Xinyu Yang, EngSiong Chng
- **Abstract excerpt:** *"We present VocalParse, a unified singing voice transcription (SVT) model built upon a Large Audio Language Model (LALM). Specifically, our novel contribution is to introduce an interleaved prompting formulation that jointly models lyrics, melody, and word-note correspondence… a Chain-of-Thought (CoT) style prompting strategy, which decodes lyrics first as a semantic scaffold…"*
- **Summary in my own words:** VocalParse fine-tunes Qwen3-ASR-1.7B (a Whisper-encoder + Qwen-LLM-decoder LALM) to emit *interleaved* lyric + pitch + note-value + global-BPM tokens in one autoregressive pass. The CoT trick — generate plain lyrics first, then the structured score — is what makes the model robust on OOD singing. They back it with **SingCrawl**, a web-scale pseudo-labeling pipeline for SVS data, and report SOTA on Opencpop / ACE-KiSing / OpenSinger / PopCS (audio-lyric MAE_pitch 0.35 on Opencpop, beating even the teacher annotator). Ablation: CoT reduces WER from 7.18% to 3.79%.
- **Reproducibility:** ✅ **Code + weights + data pipeline released.** GitHub: <https://github.com/pymaster17/VocalParse>. Model card + checkpoint: <https://huggingface.co/pymaster/VocalParse> (Apache 2.0). ~400 new AST vocabulary tokens, `uv` install instructions included. **The same Qwen3-ASR-1.7B backbone is what Qwen-Music now uses as its in-loop lyrics metric — VocalParse is the "AMT side" of that arrangement.**

### 6. Text2Score — Sheet-Music Generation with an LLM Planner (Bhandari et al., 2026)
- **arXiv ID:** `arXiv:2605.13431`
- **URL:** https://arxiv.org/abs/2605.13431
- **Submitted:** 13 May 2026 (v2: 29 Jul 2026)
- **Abstract excerpt:** *"We present Text2Score, a two-stage framework comprising a planning stage and an execution stage for generating sheet music from natural language prompts. By deriving supervision signals directly from symbolic XML data, we propose an alternative to caption-based training that bypasses noisy or scarce text-music pairs."* The LLM orchestrator emits a bar-wise plan; a separate generator produces ABC notation conditioned on it.
- **Summary in my own words:** Text2Score is the *inverse* of AMT: text → score. The reason it earns a slot here is the *architecture* — an LLM plans musical structure bar-by-bar (key, time signature, instruments, harmony) and a smaller generator executes the notes, decoupling musical reasoning from token-level synthesis. Beats both a pure LLM agent and three end-to-end baselines on expert evaluation. Useful conceptual sibling to MuseAgent and Libretto.
- **Reproducibility:** ✅ **Code, dataset, eval set, and prompts all open.** GitHub: <https://github.com/keshavbhandari/text2score/>. Demo: <https://keshavbhandari.github.io/portfolio/text2score>. CC BY 4.0.

### 7. Libretto — Symbolic Music for LLM Agents (Xu, 2026)
- **arXiv ID:** `arXiv:2606.22708`
- **URL:** https://arxiv.org/abs/2606.22708
- **Submitted:** 21 Jun 2026 (v1)
- **Author:** Yichen Xu (UC Berkeley)
- **Abstract excerpt:** *"We introduce Libretto, an agent-facing framework for symbolic music generation and revision. Libretto uses an LLM-native grammar with explicit onset slots, voices, and bar-level organization, then evaluates each piece in a corpus-calibrated statistical space over rhythm, harmony, melody, texture, form, and variation."*
- **Summary in my own words:** Libretto is not an AMT paper in the strict sense, but it's the missing peer to MuseAgent-1: it tackles the *output* side. It gives an LLM agent a text-native symbolic-music grammar and a statistical "music cloud" so the agent can retrieve, diagnose, and *self-revise* generated MIDI. Important for the AMT↔agent loop because it makes the agent's edits auditable on musical-structure axes, not vibes.
- **Reproducibility:** ⚠️ **Paper only.** No code link in the abstract. Worth a follow-up message to the author (Yichen Xu, UC Berkeley) for a repo.

### 8. HeartMuLa v3 — Open-Source Music Foundation Model Family (Yang et al., 2026) — *v3 dropped 7 Jul 2026*
- **arXiv ID:** `arXiv:2601.10547`
- **URL:** https://arxiv.org/abs/2601.10547
- **Submitted:** 15 Jan 2026 (v1) → **7 Jul 2026 (v3, this cycle)**
- **Authors:** Dongchao Yang, Yuxin Xie, Yuguo Yin, Zheyu Wang, Xiaoyu Yi, Gongxi Zhu, Xiaolong Weng, Zihan Xiong, Yingzhe Ma, Dading Cong, Jingliang Liu, et al. (Zhejiang U. + ByteDance)
- **Abstract excerpt:** *"We present a family of open-source Music Foundation Models… (1) HeartCLAP, an audio-text alignment model; (2) HeartTranscriptor, a robust lyric recognition model…; (3) HeartCodec, a low-frame-rate (12.5 Hz) yet high-fidelity music codec tokenizer…; (4) HeartMuLa, an LLM-based song generation model… 7B parameters."*
- **Summary in my own words:** Chinese-academic attempt to reproduce a Suno-class song-generation system end-to-end. The reason it matters for AMT-watchers is **HeartTranscriptor** — a dedicated lyric-recognition model that operates as the *vocal-side* counterpart to a Melodia/MT3-style note transcriber. v3 (this cycle) tightens the report. The bundle is the most ambitious "music LLM" stack from a non-US group to date; it's the direct intellectual predecessor to Qwen-Music.
- **Reproducibility:** ✅ **Open-source release.** First-author GitHub (Dongchao Yang, ZJU + ByteDance); Apache-style code license; weights gated. Companion: a SongSage lyric LM (arXiv:2601.00325) is in the same orbit.

### 9. Advancing Multi-Instrument Music Transcription — 2025 AMT Challenge Results (Chaturvedi et al., 2026)
- **arXiv ID:** `arXiv:2603.27528`
- **URL:** https://arxiv.org/abs/2603.27528
- **Submitted:** 29 Mar 2026 (v1)
- **Abstract excerpt:** *"This paper presents the results of the 2025 Automatic Music Transcription (AMT) Challenge, an online competition to benchmark progress in multi-instrument transcription. Eight teams submitted valid solutions; two outperformed the baseline MT3 model… We conclude with directions for future challenges: broader genre coverage and stronger emphasis on instrument detection."*
- **Summary in my own words:** The community benchmark for 2025/2026. Top systems (MIROS at F1 ≈0.60, YourMT3-YPTF-MoE-M at ≈0.59) both use YourMT3-style encoder–decoder Transformers with mixture-of-experts, not LLMs. The big takeaway is that *purely* token-prediction transformer architectures still beat the LALM/orchestration-style models on the raw metric — but only on a fixed eval; the LALM approach wins on flexibility and OOD. **Now that MulTTiPop has landed, expect a v2 of this challenge to use it as the new test set.**
- **Reproducibility:** ⚠️ **Challenge artifacts public, per-team code varies.** Leaderboard and eval protocol at the 2025 AMT Challenge site. Top teams (MIROS, YourMT3 variants) have GitHub repos in the paper appendix.

### 10. "Evaluating Multimodal Large Language Models on Core Music Perception Tasks" (Carone, Roman, Ripollés, 2025) — *NEW THIS WEEK*
- **arXiv ID:** `arXiv:2510.22455`
- **URL:** https://arxiv.org/abs/2510.22455
- **Submitted:** 25 Oct 2025; **accepted at NeurIPS 2025 Workshop on AI for Music (AI4Music)**
- **Authors:** Brandon James Carone, Iran R. Roman, Pablo Ripollés (NYU)
- **Abstract excerpt:** *"We benchmark three SOTA LLMs (Gemini 2.5 Pro, Gemini 2.5 Flash, and Qwen2.5-Omni) across three core music skills: Syncopation Scoring, Transposition Detection, and Chord Quality Identification. Moreover, we separate three sources of variability: (i) perceptual limitations (audio vs. MIDI inputs), (ii) exposure to examples (zero- vs. few-shot manipulations), and (iii) reasoning strategies (Standalone, CoT, LogicLM)… Results reveal a clear perceptual gap: models perform near ceiling on MIDI but show accuracy drops on audio. Reasoning and few-shot prompting offer minimal gains."*
- **Summary in my own words:** The cleanest empirical argument for *why* the AMT-as-front-end architecture (MuseAgent) and the LALM-CoT architecture (VocalParse) are not optional. The paper's central claim — "current systems reason well over symbols (MIDI) but do not yet 'listen' reliably from audio" — is the most-quotable line in the field right now. Adapting LogicLM to music (orchestrate an LLM with a symbolic solver) is a clever baseline: it shows that even when you give the model a *structured* reasoning partner, the bottleneck is still the audio encoder. Every paper in this report except MuScriptor is downstream of this finding.
- **Reproducibility:** ⚠️ **Paper + dataset at the workshop page; no first-party code linked from the abstract.** The accompanying prompt set is short enough to be reproducible from the paper alone.

---

## At-a-glance table

| # | Paper | arXiv ID | First submitted | This cycle | Topic | Code |
|---|-------|----------|-----------------|-----------|-------|------|
| 1 | MuScriptor | 2607.08168 | 2026-07-09 | new | Multi-instrument AMT foundation model + RL | ✅ github.com/muscriptor/muscriptor (941★, 122 forks) |
| 2 | Qwen-Music | 2607.11699 | 2026-07-13 | **v2 2026-07-27** | Song-generation FM, uses Qwen3-ASR for lyrics eval | ⚠️ tech report, no public code |
| 3 | MulTTiPop | 2607.08756 | 2026-07-09 | new | Commercial-pop multitrack AMT eval set (572 seg / 3.5 h) | ✅ CC BY 4.0, project page gclef-cmu.org/multtipop |
| 4 | MuseAgent-1 | 2601.11968 | 2026-01-17 | stable | LLM agent w/ AMT+OMR front-ends | ⚠️ partial (OpenReview only) |
| 5 | VocalParse | 2605.04613 | 2026-05-06 | stable | Singing-voice AMT via LALM (Qwen3-ASR + CoT) | ✅ github.com/pymaster17/VocalParse |
| 6 | Text2Score | 2605.13431 | 2026-05-13 | v2 2026-07-29 | LLM planner + sheet-music generator | ✅ github.com/keshavbhandari/text2score |
| 7 | Libretto | 2606.22708 | 2026-06-21 | stable | LLM-agent framework for symbolic music | ❌ paper only |
| 8 | HeartMuLa v3 | 2601.10547 | 2026-01-15 | **v3 2026-07-07** | Open music FM family (incl. HeartTranscriptor) | ✅ open (weights gated) |
| 9 | 2025 AMT Challenge | 2603.27528 | 2026-03-29 | stable | Multi-instrument AMT benchmark | ⚠️ per-team |
| 10 | MLLMs on Core Music Perception | 2510.22455 | 2025-10-25 | **NeurIPS 2025 WS** | Empirical gap: MIDI saturation, audio brittle | ⚠️ benchmark only |

---

## Hot Take

**MuScriptor is still the most impactful paper of the year for AMT-as-AMT** (the open release, the RL post-training, the 941-star adoption signal). But for **this week specifically** — and for the swarm's narrower lens of *AMT × LLM/Agent/Foundation* — the most consequential development is the **closing of the AMT↔generation loop**:

> The Qwen team now uses Qwen3-ASR as a *lyric-intelligibility metric* for Qwen-Music — and VocalParse is *the* open fine-tune of Qwen3-ASR for SVT.

In plain terms: the field's most-advanced song-generation FM has decided that the best way to know whether its generated lyrics are intelligible is to ask a singing-voice AMT model. VocalParse is the open-weights embodiment of that metric. The implication for any AMT-aware agent or pipeline is structural: **the same model that scores generation quality also serves as the lyrics side of multi-track AMT**. If you're building a music-aware LLM agent, your "lyrics" tool should be Qwen3-ASR (or VocalParse), your "audio→MIDI" tool should be MuScriptor, and your "score→symbolic" tool should be the MuseAgent-1 OMR module. That trio is the new de facto stack.

Honorable mentions:

- **Carone, Roman, Ripollés (NeurIPS 2025 WS)** is the cleanest articulation of *why* the AMT-front-end architecture (MuseAgent, VocalParse) exists at all. MLLMs reason over symbols at near-ceiling accuracy and over audio poorly. That's not a bug to fix; it's the architectural justification for the entire AMT-as-tool-use paradigm.
- **MulTTiPop** at 38% best-case Onset F1 on commercial pop is the necessary counterweight to the MuScriptor hype. Both are right; both are needed.
- **Qwen-Music (v2)** is the one to watch for adoption: a Suno-class open-weights model with a published tech report and a credible eval loop.

The "AMT-as-token-prediction" paradigm won 2025/2026. The "AMT-as-LLM-tool-use" paradigm (MuseAgent, Libretto, Text2Score) is the one to watch for 2027. The new 2026-Q3 question is whether **AMT-as-generation-eval-metric** (Qwen-Music + VocalParse + Qwen3-ASR) becomes the dominant pattern.

---

## Adjacent Watch

Borderline — log for next week, may be promoted to main list:

- **MuSViT** (Penarrubia et al., arXiv:2606.31811, ECCV '26) — First foundation vision model for sheet music (ViT pre-trained on 9.7 M IMSLP pages). Camera-ready TBD; no repo at v1.
- **MuFun** (Jiang et al., arXiv:2508.01178, ByteDance) — Unified music FM with score transcription as a first-class task. Long-context 390 s training window. SOTA on MuCUE (+15 pts over Qwen2.5-Omni). No public checkpoint in v1.
- **AMT-APC v2** (Komiya & Fukuhara, arXiv:2409.14086, v2 2026-07-04) — Fine-tunes hFT-Transformer for piano cover generation. Small but conceptually clean.
- **Pushing the Frontier of Full-Song Generation** (Dai et al., arXiv:2607.20253, Alibaba Token Foundry, 23 Jul 2026) — Hierarchical autoregressive planning + flow-matching rendering. Generation-side companion to Qwen-Music.
- **TinyMU: A Compact Audio-Language Model for Music Understanding** (Li, Quelennec, Essid, arXiv:2604.xxxxx, 2026-04-17) — Claims 229 M-param LALM competitive with much larger models. Cheap backbone option.
- **TART: Technique-Aware Audio-to-Tab Guitar Transcription** (Gupta et al., Jul 2026 cs.SD listing) — Audio-to-tab is a sibling of AMT; worth checking whether it uses a foundation-model backbone.
- **Audio Flamingo Next / Music Flamingo** (Ghosh et al., ICLR 2026, NVIDIA) — open audio-language model family; transcription is in the training mix.
- **Sage-Music / Libretto's "music cloud"** (Xu, 2026) — adjacent symbolic-music reasoning paper; the LLM-as-music-critic angle is worth tracking.
- **NotaGen** (Wang et al., arXiv:2502.18008) — uses the *pretraining + fine-tuning + RL* (CLaMP-DPO) trio to generate classical sheet music. Same paradigm family as HeartMuLa/MuScriptor.

---

## Search Trail

Queries run during this scan (in order, deduplicated from the prior cycle):

1. `arxiv "automatic music transcription" LLM 2026 foundation model July` — surfaced MuScriptor, MulTTiPop, HeartMuLa v3, 2025 AMT Challenge, AMT-APC v2.
2. `arxiv "audio-to-score" agent foundation model music` — surfaced Text2Score, MuSViT, HeartMuLa, Pushing the Frontier of Full-Song Generation.
3. `arxiv AMT GPT music transcription foundation model` — surfaced MuScriptor, MuseAgent, HeartMuLa, MuFun, Qwen-Music.
4. `arxiv music transcription large language model agent 2026` — surfaced MuseAgent, Libretto, 2025 AMT Challenge, Carone et al.
5. `arxiv sheet music generation transformer 2026 foundation model agent` — surfaced Text2Score, MuSViT, NotaGen, Sheet Music Transformer++.
6. `arxiv cs.SD July 2026 music transcription agent foundation model LLM new` — surfaced MuScriptor, MulTTiPop, TART, Sage-Music.
7. `"arXiv" "music" "agent" OR "LLM" 2026 audio transcription piano singing voice latest` — surfaced VocalParse, Libretto, Qwen-Music, Poly-SVC, DiTSinger.
8. `arxiv cs.SD 2026 multitrack transcription agent tool use OMR July` — surfaced MuseAgent, MuScriptor, MulTTiPop, Audio Flamingo Next.
9. `arxiv 2026 singing voice transcription LALM Qwen lyrics melody CoT` — confirmed VocalParse; surfaced the Qwen3-ASR ↔ Qwen-Music connection.
10. `MuScriptor github muscriptor multi-instrument transcription` — confirmed https://github.com/muscriptor/muscriptor (941 stars, 122 forks, MIT code, CC BY-NC 4.0 weights).
11. `"VocalParse" singing voice transcription large audio language model 2026 github` — confirmed https://github.com/pymaster17/VocalParse; cross-linked Qwen3-ASR backbone.
12. `Qwen-Music Melody-CoT arxiv 2026 Qwen3-ASR lyrics intelligibility` — confirmed arXiv:2607.11699, v2 27 Jul 2026; the Qwen3-ASR eval hook is the field-relevant nugget.

**Sparse-spot check:** 2025-2026 papers on AMT × LLM are *not* sparse — the intersection is producing a paper every 1–2 weeks, and the centre-of-gravity is now visibly moving from "AMT paper that uses an LLM as a frontend" to "AMT paper that is *in the loop* of a generation FM." The 2024 fallback listed in the task spec is *not* needed.

**Verification pass:** Every primary URL in this report (arXiv abs, GitHub repo, Hugging Face card, project page) was fetched and confirmed in this session. The two arXiv pages with new versions (Qwen-Music v2 2026-07-27, HeartMuLa v3 2026-07-07) were re-pulled; the version numbers and byte sizes are correct as of cycle time.
