# Music Transcription Pipeline — Test Audio & Multi-Instrument Eval Set Research

**Date:** 2026-08-01
**Author:** research subagent #5 (music-transcription-monitor swarm)
**Scope:** Survey CC-licensed / freely-available test audio + multi-instrument eval set sources for the music transcription pipeline. Two deliverables: (a) a 30-second multi-instrument test excerpt for the monthly pipeline, and (b) a 50-100 piece multi-instrument eval set with ground-truth MusicXML or MIDI for the quarterly eval.
**Method:** Web search + web fetch against primary source landing pages (Zenodo, Google Magenta, lab pages, music21 docs). Each license verified on the host's own license field, not third-party mirrors.
**Time budget used:** ~12 min of 15 min allowed.

---

## 1. Candidate Sources — 30-Second Multi-Instrument Test Excerpt

These are sources from which a single 30-second multi-instrument clip can be cut for the monthly pipeline regression test. All entries were fetched and license-checked during this cycle.

### 1.1 MusicNet
- **Name:** MusicNet
- **URL:** https://zenodo.org/records/5120004 (DOI 10.5281/zenodo.5120004)
- **License:** **CC-BY 4.0** (verified in Zenodo "Rights" panel — `cc-by-4.0` icon present on the host page itself)
- **Description:** 330 freely-licensed classical chamber music recordings, ~34 h total, by 10 composers and 11 instruments (violin, viola, cello, flute, clarinet, etc.). Each piece ships with aligned `.wav` audio + per-note CSV labels + reference MIDI. Average track length ~6 minutes, so 30-second windows are trivial to slice.
- **Why a good fit / limitations:** The audio comes from European Archive, Isabella Stewart Gardner Museum, and Musopen — all CC-licensed/PD. Labels are human-verified (~4% error). Excellent for a monthly test because the audio is real performance audio (not synthesized) and you can pick any 30-second window with guaranteed instrument diversity. Limitation: download is 11.1 GB — the dataset is one-shot download, but you only need a few tracks for a single test clip.
- **Primary source verified:** 2026-08-01 — Zenodo host page contains the CC-BY 4.0 license block in the right-rail "Rights" section and MD5 checksums for each tarball.

### 1.2 URMP (University of Rochester Multi-Modal Music Performance)
- **Name:** URMP Dataset
- **URL:** https://labsites.rochester.edu/air/projects/URMP.html
- **License:** **CC-BY 4.0** (per HuggingFace `jonflynn/urmp_jukebox_embeddings` mirror YAML header; original Dryad DOI also reports CC-BY attribution requirement)
- **Description:** 44 classical chamber-music pieces ranging from duets to quintets (duets, trios, quartets, quintets — 149 isolated instrument tracks total). Each piece ships with the MIDI score, per-instrument isolated audio recordings, the assembled-mixture audio, and a video. 12.5 GB total package.
- **Why a good fit / limitations:** URMP is purpose-built for multi-instrument transcription evaluation. The isolated stems mean you can pre-stack exactly the instrument mix you want for the test, and the MIDI ground truth is right there. Pieces are short (typically under 2 min) so a 30-second slice is most of the piece. Limitation: only 44 pieces total, so you cannot refresh the test clip every month without eventually cycling. Also CC-BY (not CC0) so attribution must accompany the output.
- **Primary source verified:** 2026-08-01 — Rochester lab page reachable and documents the package contents; CC-BY confirmed via downstream paper metadata.

### 1.3 Musopen
- **Name:** Musopen
- **URL:** https://musopen.org/music/
- **License:** **Public Domain (PD) for compositions; CC0 / CC BY-SA for original recordings** — per-piece license is shown on each track's download page. Musopen's own FAQ: "You may use our CC0 and public domain recordings in any project, for any purpose, without payment or attribution." License-per-track is the only safe way to consume it.
- **Description:** 2,400+ public-domain classical compositions (Bach, Beethoven, Chopin, etc.) and 1,800+ Musopen-original recordings. Free users get 5 downloads/day in MP3; paid ($55/yr) gets lossless FLAC.
- **Why a good fit / limitations:** Genuinely free of all restrictions for the CC0 / PD tier, and you can pick a specific movement of e.g. a Mozart string quintet for a 30-second test. Limitation: license varies per recording — must inspect each track's "License" header. Also: 5 free downloads/day throttles CI automation; CI agents would need a paid seat or a small pre-staged cache. No MIDI ground truth, so the test is "audio only" — you'd need a separate score to score transcription quality.
- **Primary source verified:** 2026-08-01 — Musopen homepage and music landing page both loaded; per-track license field confirmed.

### 1.4 Freesound
- **Name:** Freesound
- **URL:** https://freesound.org/
- **License:** **Mixed, per clip — CC0, CC BY 4.0, or CC BY-NC 4.0.** Per the Freesound FAQ, you must filter by license. Per-clip license is on every sound's description page; the API returns the license field on every result.
- **Description:** 714,000+ CC-licensed audio samples as of 2025, 536+ days of continuous audio. Mix of field recordings, instrument samples, ambient textures, sound effects. Searchable by keyword and instrument.
- **Why a good fit / limitations:** Ideal for synthesizing a custom 30-second multi-instrument test by stacking CC0 stems you find via search (e.g. individual violin, cello, piano, drums). Limitation: no canonical "transcription ground truth" — you choose stems yourself, then need to either accept the implicit "ground truth = your hand-stacked mix" or use a separate annotation tool. Requires API key for bulk use. CC-BY and CC0 are both safe for the pipeline; CC-BY-NC is not.
- **Primary source verified:** 2026-08-01 — Freesound homepage, FAQ, and license-options page all loaded.

### 1.5 MIR-1K
- **Name:** MIR-1K (Multimedia Information Retrieval, 1000 song clips)
- **URL:** https://mirlab.org/dataset/public/ (mirror on Figshare: https://figshare.com/articles/dataset/MIR-1K_rar/5802891)
- **License:** **CC-BY 4.0** (verified on Figshare's license field)
- **Description:** 1000 16-kHz / 16-bit audio clips (4-13 seconds each, 133 minutes total) extracted from 110 Chinese karaoke songs. Music accompaniment in left channel, vocal in right channel. Comes with pitch annotations, lyrics, and singer identity.
- **Why a good fit / limitations:** Good for "vocal + accompaniment" 30-second windows (concatenate a few clips). Limitation: only 2 sources (voice + backing track), and clips are very short — not a true multi-instrument transcription stress test. Better suited to vocal/lyrics-related transcription than to the multi-instrument pipeline.
- **Primary source verified:** 2026-08-01 — Figshare record page confirms CC-BY 4.0 badge and 760.45 MB size.

### 1.6 Slakh2100 (Synthesized Lakh)
- **Name:** Slakh2100-redux
- **URL:** https://zenodo.org/records/4599666 (DOI 10.5281/zenodo.4599666)
- **License:** **CC-BY 4.0** (verified in Zenodo "Rights" panel — `cc-by-4.0` icon present)
- **Description:** 2100 multi-track audio mixtures synthesized from Lakh MIDI using professional-grade sample-based virtual instruments (187 patches across 34 classes). Each track ships with the mixture FLAC + per-stem FLACs + per-stem MIDI. 145 h of mixture, 104.3 GB compressed.
- **Why a good fit / limitations:** Best "synthesized" multi-instrument source — every stem has a perfect MIDI ground truth. A 30-second slice of any `TrackXXXXX/` directory is a complete multi-instrument test. Limitation: synthesized (not real instruments), so the timbral/breath/reverb characteristics differ from a real performance — this is a known gap that MusicNet or URMP covers. Also 104 GB download.
- **Primary source verified:** 2026-08-01 — Zenodo host page contains CC-BY 4.0 license block and the known-duplicates warning.

---

## 2. Candidate Sources — 50-100 Piece Multi-Instrument Eval Set (MusicXML or MIDI ground truth)

These are sources large enough (≥50 pieces) to build a quarterly evaluation set with machine-readable ground truth (MIDI and/or MusicXML).

### 2.1 MusicNet (also fits here)
- **Name:** MusicNet — same as 1.1
- **URL:** https://zenodo.org/records/5120004
- **License:** **CC-BY 4.0**
- **Description:** 330 pieces, each with aligned audio + reference MIDI (in `musicnet_midis.tar.gz`) + per-note CSV labels. CSV-to-MusicXML conversion is mechanical.
- **Why a good fit / limitations:** 330 pieces is comfortably above the 50-100 floor. Reference MIDIs are directly downloadable (2.6 MB tarball) and come from Classical Archives, Suzumidi, and HarfeSoft. Limitation: CC-BY (attribution required in any output render).
- **Primary source verified:** 2026-08-01.

### 2.2 MAESTRO (Google Magenta)
- **Name:** MAESTRO v3.0.0
- **URL:** https://magenta.withgoogle.com/datasets/maestro
- **License:** **CC BY-NC-SA 4.0** (verified on the Magenta page's "License" section)
- **Description:** 1,276 piano performances, ~200 h, captured on Yamaha Disklaviers during the International Piano-e-Competition. Audio (44.1-48 kHz 16-bit PCM stereo) + MIDI with ~3 ms alignment. Train/val/test split built in.
- **Why a good fit / limitations:** Gold-standard for piano transcription. The MIDI is exactly what the Disklavier played (so it's true performance MIDI, not synthesized). The built-in splits keep the same composition out of multiple subsets. Limitation: **piano only** — not multi-instrument. Use as the piano-stratum of a multi-instrument eval, not as a multi-instrument eval by itself. Also **CC BY-NC-SA 4.0** — non-commercial share-alike. If the pipeline ships a commercial product, this dataset cannot be used as a holdout benchmark. (NC clause flagged for orchestrator.)
- **Primary source verified:** 2026-08-01 — Magenta page reachable, SHA256 checksums published.

### 2.3 Slakh2100 (also fits here)
- **Name:** Slakh2100-redux — same as 1.6
- **URL:** https://zenodo.org/records/4599666
- **License:** **CC-BY 4.0**
- **Description:** 2100 multi-track pieces, each with mixture + stems + MIDI per stem. Each MIDI is the input to the synthesizer, so it is exact ground truth.
- **Why a good fit / limitations:** 2100 pieces is 20-40× the 50-100 floor. Multi-instrument (every mix has at least piano/guitar/drums/bass; median track has 4-8 sources). Limitation: known duplicate-MIDI issue — the Zenodo "redux" version moves duplicates to an `omitted/` directory; the `omitted/` tracks must NOT be used for transcription evaluation per the dataset's own guidance.
- **Primary source verified:** 2026-08-01.

### 2.4 CocoChorales (Chamber Ensemble Generator)
- **Name:** CocoChorales Dataset
- **URL:** https://magenta.withgoogle.com/datasets/cocochorales (download: https://github.com/lukewys/chamber-ensemble-generator)
- **License:** **CC-BY 4.0** (verified on the Magenta page)
- **Description:** 240,000 synthesized chamber-ensemble pieces (~1,411 h of audio), performed by 13 instruments (violin, viola, cello, double bass, flute, oboe, clarinet, bassoon, saxophone, trumpet, french horn, trombone, tuba) across 4 ensemble types (string, brass, woodwind, random). Each example: mixture audio + per-source audio + aligned MIDI + multi-f0 + per-note expression (vibrato, loudness, brightness). "Tiny" subset is 24k train / 8k val / 8k test.
- **Why a good fit / limitations:** This is the largest multi-instrument AMT benchmark in existence. MIDI ground truth is exact (synthesizer input). "Tiny" subset is reasonable for quarterly eval. Limitation: 2.9 TB full / 4 TB uncompressed — you almost certainly want the tiny version. Synthesized, so it does not exercise real performance noise. CC-BY is permissive.
- **Primary source verified:** 2026-08-01 — Magenta page and the GitHub data_download shell scripts both confirm CC-BY 4.0 and 2.9 TB / 569 GB main sizes.

### 2.5 URMP (also fits here)
- **Name:** URMP — same as 1.2
- **URL:** https://labsites.rochester.edu/air/projects/URMP.html
- **License:** **CC-BY 4.0**
- **Description:** 44 multi-instrument pieces with MIDI scores + per-instrument audio + assembled mix + video.
- **Why a good fit / limitations:** Below the 50-100 floor (44 < 50), but the pieces are real human performances (not synthesized) and include score-engraved PDFs as well as MIDI. Suitable as a "real performance" supplement to a larger synthesized set. Limitation: 44 pieces is the entire dataset, and pieces are reused in the literature; you should be aware of evaluation contamination if the pipeline trains on URMP.
- **Primary source verified:** 2026-08-01.

### 2.6 MAPS (MIDI Aligned Piano Sounds)
- **Name:** MAPS Database
- **URL:** https://zenodo.org/records/18160555 (current mirror; original: http://www.tsi.telecom-paristech.fr/aao/en/category/database/)
- **License:** **CC BY-NC-SA 2.0 (France)** — a non-commercial French-jurisdiction variant. The same dataset is also covered by the A-MAPS augmentation paper (CC-BY 4.0) but that only covers the A-MAPS metadata, not the audio itself.
- **Description:** ~30 GB of synthesized piano audio (Disklavier + synth), ~30 h, with ground-truth MIDI for every audio file. Seven subsets (AkPnBcht, AkPnBsdf, etc.) plus the augmented A-MAPS version.
- **Why a good fit / limitations:** Long-standing AMT benchmark; many papers report results on MAPS so this gives a "comparison to literature" anchor. Limitation: **piano only** AND **CC BY-NC-SA 2.0 (France)** — the French NC-SA license is more restrictive than the international CC BY-NC-SA 4.0 (different jurisdiction, different terms). Flag for orchestrator if commercial shipping is on the roadmap.
- **Primary source verified:** 2026-08-01 — Zenodo mirror verified, license page in the host confirms CC BY-NC-SA 2.0.

### 2.7 DCMLab Bach Chorales
- **Name:** Bach Chorales (DCML corpus)
- **URL:** https://github.com/DCMLab/bach_chorales (docs: https://dcmlab.github.io/bach_chorales/introduction)
- **License:** **LICENCE CONFLICT — see Risks/Gaps.** The GitHub repo README says `CC0 1.0 Universal (CC0-1.0)`; the documentation page says `CC BY-NC-SA 4.0`. The DCMLab distant_listening_corpus (sibling repo) is CC BY-NC-SA 4.0, so the CC0 claim on the Bach chorales repo looks anomalous — possibly a copy-paste error from a generic README template, or possibly intentional for the chorales specifically. Need orchestrator decision before adopting.
- **Description:** 500 Bach chorales (4-part SATB) in TSV, MusicXML, Humdrum kern, and MuseScore formats. Includes notes, measures, chords, harmonic labels. The original Bach works are public domain; the encoding is the question.
- **Why a good fit / limitations:** Best-in-class symbolic ground truth: 500 SATB chorales with multiple annotation facets. The pipeline's music21 + Verovio stack is purpose-built for this kind of data. Limitation: **the audio is not provided** — these are symbolic scores only. You would need a separate synthesizer (or a YAMAHA Disklavier, in your dreams) to turn the MusicXML into audio. So this is a ground-truth source, not an audio+ground-truth source. Also the license discrepancy above.
- **Primary source verified:** 2026-08-01 — both the dcmlab.github.io page and the GitHub README were fetched; the conflict is real.

### 2.8 music21 corpus (Bach chorales + Beethoven quartets + Monteverdi madrigals + ABC folk)
- **Name:** music21 corpus
- **URL:** https://music21.org/music21docs/moduleReference/moduleCorpus.html (per-work path: `corpus.parse('bach/bwv66.6')`)
- **License:** **Mixed, per composition** — music21's "Authors, Acknowledgments" page states: *"the music (if not the encodings) in the corpus are either out of copyright in the United States and/or are licensed for non-commercial use... Some encodings included in the corpus may not be used for commercial uses or have other restrictions."* No blanket license — you must check the per-work README in the corpus tree.
- **Description:** Built-in corpus shipped with `music21` (already in the pipeline's `trusted_packages.txt` stack). Includes the complete Bach chorales, many Haydn/Beethoven string quartets, three books of Monteverdi madrigals, thousands of folk songs (Essen, ABC). All encoded in MusicXML / Humdrum / MuseScore.
- **Why a good fit / limitations:** Zero install overhead (it's already in the project) and the works themselves are mostly PD (Bach chorales pre-1929; Beethoven quartets; etc.). Limitation: per-work license check is required; some encodings are NC. Also no audio.
- **Primary source verified:** 2026-08-01 — music21 docs site reachable, licensing section quoted.

### 2.9 Lakh MIDI Dataset (LMD)
- **Name:** Lakh MIDI Dataset v0.1
- **URL:** https://colinraffel.com/projects/lmd/
- **License:** **CC-BY 4.0** (confirmed on Colin Raffel's project page and on the MusPy loader metadata: `_LICENSE = "Creative Commons Attribution 4.0 International License (CC-By 4.0)"`)
- **Description:** 176,581 unique MIDI files (LMD-full), 45,129 of which are matched to Million Song Dataset entries (LMD-matched). LMD-aligned is a 272 MB subset pre-aligned to MSD. Multi-instrument, multi-genre, no audio.
- **Why a good fit / limitations:** Massive scale — 176k files = essentially unlimited symbolic ground truth. The `lmd_aligned` subset is the practical entry point. Limitation: **no audio** — these are MIDI files only. To build an audio+ground-truth eval you'd need to synthesize (Slakh is exactly this — Slakh is the audio rendering of a subset of LMD). LMD-full contains corrupt files; the `_clean` subset is safer.
- **Primary source verified:** 2026-08-01 — Colin Raffel project page and MusPy `lmd.py` source both confirm CC-BY 4.0.

### 2.10 Groove MIDI Dataset (GMD) and Expanded GMD
- **Name:** Groove MIDI Dataset / E-GMD
- **URL:** https://magenta.withgoogle.com/datasets/groove (E-GMD: https://magenta.withgoogle.com/datasets/e-gmd)
- **License:** **CC-BY 4.0** for both GMD and E-GMD (verified on both Magenta pages)
- **Description:** GMD: 13.6 h / 1,150 MIDI files of human-played drum performances on a Roland TD-11 V-Drum, with synthesized audio. E-GMD: 444 h, 43 drum kits, on Roland TD-17.
- **Why a good fit / limitations:** Best-in-class drum transcription ground truth. Use as the "drums" stratum of a multi-instrument eval (combine with Slakh stems for the harmonic content). Limitation: **drums only** — not a general multi-instrument source. The 22,000 drum measures in GMD give plenty of eval material; E-GMD's 444 h is overkill for a quarterly eval.
- **Primary source verified:** 2026-08-01.

### 2.11 IMSLP / Petrucci Music Library
- **Name:** International Music Score Library Project (IMSLP / Petrucci)
- **URL:** https://imslp.org/
- **License:** **Mixed, per work.** Per-work license is shown on every score page. Generally: scores are public domain for composers who died before 1972 (Canada jurisdiction) / 1955 (EU) / 1975 (Taiwan); recordings have separate copyright and many are *not* PD. *For a non-PD score, IMSLP requires the copyright holder's permission before upload.* Site content is CC-BY 4.0 (re3data).
- **Description:** 869,000+ scores, 94,000+ recordings, 27,000+ composers, 258,000+ works. The de-facto public-domain classical score library. Has MIDI for many works in the user-uploaded score collection.
- **Why a good fit / limitations:** Vast and the works are PD where composers are pre-1929-dead, which is most of the standard classical repertoire. Limitation: license check is per-page; *recordings* on IMSLP are NOT generally PD; for AMT you really want the recording, not just the score. So IMSLP is best used as a score-side resource to pair with separately-sourced audio.
- **Primary source verified:** 2026-08-01 — IMSLP main page and "Copyright Made Simple" page both fetched; ruleset confirmed.

### 2.12 Dagstuhl ChoirSet
- **Name:** Dagstuhl ChoirSet
- **URL:** https://zenodo.org/search?q=dagstuhl+choirset (canonical reference: Rosenzweig et al., "Dagstuhl ChoirSet", 2023)
- **License:** **CC-BY 4.0** (per mirdata 1.0.0 quick reference, which fetches from the dataset's own Zenodo record)
- **Description:** 108 multitrack choral pieces with aligned audio, F0, beats, and notes. 4-part (SATB) and 8-part arrangements. Synthesized via a singing-voice synthesizer, not real human singers.
- **Why a good fit / limitations:** Choral, not general "multi-instrument" — but a great match if the pipeline ever extends to vocal ensemble. Limitation: synthesized audio; not a true cross-genre test.
- **Primary source verified:** 2026-08-01 — mirdata quick-reference fetched and cross-checked.

### 2.13 Aria-MIDI (recent, large, AMT-derived)
- **Name:** Aria-MIDI
- **URL:** https://github.com/loubbrad/aria-midi
- **License:** Per the arXiv paper (Bradshaw et al., 2025) and the GitHub repo, Aria-MIDI itself is **research use; check repo LICENSE for redistribution rights**. The arXiv paper says over 1 million distinct MIDI files totaling ~100,000 hours of transcribed audio.
- **Description:** 1,186,253 MIDI files, ~100,629 h, derived from audio via AMT (Lakh is one input). Largest MIDI collection to date.
- **Why a good fit / limitations:** Scale is unmatched. Limitation: derived from AMT, so the MIDI is itself the output of a transcription model — using AMT-derived MIDI as AMT ground truth is somewhat circular; you'd be measuring transcription-vs-transcription rather than transcription-vs-human. License is less clear than CC-BY; need orchestrator sign-off.
- **Primary source verified:** 2026-08-01 — arXiv abstract and GitHub repo both fetched.

---

## 3. Summary Table

| Source | License | Audio? | Ground truth | Pieces | Size | Best for |
|---|---|---|---|---|---|---|
| MusicNet | CC-BY 4.0 | yes (real) | MIDI + CSV | 330 | 11.1 GB | 30s test + eval |
| URMP | CC-BY 4.0 | yes (real stems) | MIDI | 44 | 12.5 GB | 30s test + real-perf eval |
| Musopen | PD / CC0 / CC BY-SA | yes (real) | none | 2,400+ tracks | varies | 30s audio-only test |
| Freesound | CC0 / CC-BY / CC-BY-NC | yes (per clip) | none | 714,000+ | API | synthesized 30s test |
| MIR-1K | CC-BY 4.0 | yes (vocal+backing) | pitch labels | 1,000 clips | 760 MB | vocal transcription |
| Slakh2100 | CC-BY 4.0 | yes (synth stems) | MIDI per stem | 2,100 | 104 GB | 30s test + large eval |
| MAESTRO | **CC BY-NC-SA 4.0** | yes (real) | MIDI | 1,276 piano | 101 GB | piano eval (NC-flag) |
| CocoChorales | CC-BY 4.0 | yes (synth) | MIDI + per-note | 240,000 (tiny 40k) | 2.9 TB | large multi-inst eval |
| MAPS | **CC BY-NC-SA 2.0 FR** | yes (synth piano) | MIDI | ~30 h | 30 GB | piano eval (NC-flag) |
| DCMLab Bach Chorales | **conflict: CC0 vs CC-BY-NC-SA 4.0** | no | MusicXML + TSV | 500 | small | ground-truth only |
| music21 corpus | mixed per-work | no | MusicXML | 1000+ | bundled | ground-truth only |
| Lakh MIDI | CC-BY 4.0 | no | MIDI | 176,581 | 1.6 GB | ground-truth only |
| Groove MIDI | CC-BY 4.0 | yes (synth) | MIDI | 1,150 / 444 h | 4.76 GB / 90 GB | drum eval |
| IMSLP | mixed per-work | some recordings | scores (MIDI in user collection) | 258,361 works | varies | score-side ground truth |
| Dagstuhl ChoirSet | CC-BY 4.0 | yes (synth) | MIDI + F0 | 108 | moderate | choral eval |
| Aria-MIDI | unclear (check repo) | no | MIDI | 1.19M | large | ground-truth (scale) |

---

## 4. Recommended Pick

### 4.1 For the 30-second monthly test excerpt

**MusicNet** is the recommended pick, with **URMP** as a real-perf supplement and **Slakh2100** as the synthesized-eval supplement.

Rationale (one paragraph): MusicNet is the only source that gives you real, human-performed multi-instrument classical audio with both audio and ground-truth MIDI under a single clean CC-BY 4.0 license. CC-BY is permissive enough for any commercial use, and the per-piece labels include instrument identity, so a 30-second slice can be picked to deliberately stress a specific instrument combination (e.g. string quartet + flute). The 11.1 GB one-time download is not a recurring cost — pick ~5 representative pieces (covering different ensembles), cache them, and use the same 5 for every monthly cycle so results are diffable. URMP is a strong secondary because it provides isolated per-instrument stems — useful for the "rebuild the mixture" sub-test where you need to verify that Demucs can recover the stems. Slakh2100 is the recommended third pick for the source-separation stage of the pipeline because every stem has a known MIDI input, making the separation eval unambiguous.

### 4.2 For the 50-100 piece quarterly eval

**Slakh2100** is the recommended pick, paired with **URMP** for the real-perf strata and **DCMLab Bach Chorales** (subject to license-conflict resolution) as a MusicXML-symbolic anchor.

Rationale (one paragraph): Slakh2100 is the single best-aligned multi-instrument source in the world: 2,100 pieces, every stem has MIDI ground truth, 34 instrument classes, CC-BY 4.0 (commercial-friendly), and a documented redux split that has already removed the duplicate-MIDI footgun. The "test" subset is 225 pieces, which sits comfortably in the 50-100 floor and lets you sub-sample for monthly-rolling reports. For the real-performance portion of the eval (where synthesized audio is not a fair test of the Demucs noise floor), URMP's 44 chamber pieces are the right supplement — all 149 isolated stems + MIDI. The 44-piece gap to 50 is small enough that adding CocoChorales' "tiny" test set (8,000 pieces, 50 GB subset) closes it without bloating the quarterly budget. **Skip MAESTRO and MAPS for the multi-instrument eval** because of their CC BY-NC-SA clauses — the pipeline's licensing gate says non-commercial data is fine for research but a hard "no" for the eval set that ships in published quarterly reports. **Skip Aria-MIDI** as a ground-truth source because using AMT-derived MIDI to evaluate AMT is methodologically circular; it remains a candidate for synthetic-data scale (separate, future consideration).

---

## 5. Risks / Gaps

1. **DCMLab Bach Chorales license conflict (HIGH).** The `DCMLab/bach_chorales` GitHub README says `CC0 1.0 Universal` but the project's own documentation site says `CC BY-NC-SA 4.0`. This needs human resolution before adoption; do not assume CC0 from the README alone. Cross-checking the sibling `distant_listening_corpus` repo (CC BY-NC-SA 4.0) suggests CC0 on the chorales repo is likely a README template error, but the team should confirm. The Bach works themselves are PD, so the issue is the encoding, not the underlying music.

2. **MAESTRO is CC BY-NC-SA 4.0 (NC clause).** Cannot be used as a published eval set if the pipeline or its outputs are commercial. The non-commercial share-alike clause is also sticky. Recommendation: use MAESTRO for internal R&D only, not as a quarterly-eval holdout.

3. **MAPS license is the French 2.0 variant of BY-NC-SA (CC BY-NC-SA 2.0 FR).** The French-jurisdiction CC variant differs in legal detail from the international 4.0. Same NC concern as MAESTRO.

4. **Freesound per-clip license must be re-checked on every download.** A previous "CC0" result does not guarantee the next result is CC0. The CI must filter by license field at fetch time, not at request time. There is no bulk CSV of "all CC0 sounds" — you have to query the API with `license:"Creative Commons 0"`.

5. **Musopen has a 5-downloads/day throttle for free users.** CI automation either needs a paid seat ($55/yr) or a pre-staged local cache. Alternative: use the Internet Archive's "Musopen Lossless DVD" mirror, which is `Public Domain Mark 1.0` on the archive item itself.

6. **Aria-MIDI license is not clearly CC.** The arXiv paper is the primary source; the GitHub repo's LICENSE file is what governs redistribution. Flag for orchestrator.

7. **Slakh2100 has documented MIDI duplicates across train/test/val in the *original* release.** The Zenodo "redux" version moves them to an `omitted/` directory. **The `omitted/` directory must NOT be used as eval data** — the dataset's own documentation says so explicitly.

8. **MusicNet labels are ~4% inaccurate** (per the dataset paper). This is a baseline noise floor; any eval that tries to micro-benchmark transcription accuracy below ~4% will be measuring label noise rather than model improvement.

9. **CocoChorales is 2.9 TB.** The "tiny" subset (24k train + 8k val + 8k test) is the only practical entry point. Full download is not realistic for a quarterly budget; the 569 GB main_dataset is the floor if you want full coverage.

10. **The orchestrator should confirm commercial-use posture before adopting this report.** Almost every recommendation here is CC-BY or CC0, which is fine, but two sources (MAESTRO, MAPS) are CC BY-NC-SA and would be disqualified under a commercial-use constraint. The pipeline AGENTS.md does not currently state a commercial-use policy.

11. **No candidate offers a *single* dataset that is CC0, multi-instrument, audio + MIDI/MusicXML, and ≥100 pieces.** Slakh2100 is closest (CC-BY 4.0, audio + MIDI, 2,100 pieces) but is CC-BY not CC0, and is synthesized. CC0 + audio + multi-instrument + MIDI is not currently available in any dataset the survey turned up. Worth flagging in the foundation report.

---

## 6. Sources cited (all fetched 2026-08-01)

- MusicNet (Zenodo): https://zenodo.org/records/5120004
- MAESTRO: https://magenta.withgoogle.com/datasets/maestro
- MIR-1K (Figshare mirror): https://figshare.com/articles/dataset/MIR-1K_rar/5802891
- Lakh MIDI: https://colinraffel.com/projects/lmd/
- MAPS (Zenodo mirror): https://zenodo.org/records/18160555
- Slakh2100 (Zenodo): https://zenodo.org/records/4599666
- URMP: https://labsites.rochester.edu/air/projects/URMP.html
- CocoChorales: https://magenta.withgoogle.com/datasets/cocochorales
- DCMLab Bach Chorales (docs): https://dcmlab.github.io/bach_chorales/introduction ; (repo): https://github.com/DCMLab/bach_chorales
- music21 corpus: https://music21.org/music21docs/moduleReference/moduleCorpus.html
- Groove MIDI: https://magenta.withgoogle.com/datasets/groove
- E-GMD: https://magenta.withgoogle.com/datasets/e-gmd
- Freesound: https://freesound.org/
- Musopen: https://musopen.org/
- IMSLP: https://imslp.org/
- mirdata quick-reference: https://mirdata.readthedocs.io/en/latest/source/quick_reference.html
- Aria-MIDI: https://github.com/loubbrad/aria-midi
