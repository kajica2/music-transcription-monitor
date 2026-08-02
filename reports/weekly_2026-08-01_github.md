# Weekly GitHub Pulse — Music Transcription & Agent Frameworks
**Report date:** Saturday, 2026-08-01
**Scope:** Core music transcription repos + agent framework dependencies
**Repos covered:** 8 / 8 attempted (1 failed — see notes)

---

## Summary Table

| Repo | Stars | Forks | License | Last release | Last release date | Status |
|---|---:|---:|---|---|---|---|
| `langchain-ai/langgraph` | 38.6k | 6.5k | MIT | `v1.2.5` | 2026-06-12 (~7 wks ago) | **Active** |
| `crewAIInc/crewAI` | 56.5k | 8.0k | MIT | `v1.15.3a2` (alpha) | 2026-07-16 (~2 wks ago) | **Active** |
| `facebookresearch/demucs` | 10.4k | 1.6k | MIT | *(no formal releases)* | n/a | Active (no GH releases) |
| `spotify/basic-pitch` | 5.4k | 486 | Apache-2.0 | `v0.2.4` | 2023-04-10 | **Dormant** |
| `cuthbertLab/music21` | 2.5k | 450 | BSD-3-Clause | `v10` (per README) | 2026 (date unspec.) | Active (research cadence) |
| `bytedance/piano_transcription` | 2.0k | 253 | Apache-2.0 | *(no releases listed)* | unknown | Quiet |
| `magenta/mt3` | 1.7k | 221 | Apache-2.0 | *(no releases listed)* | unknown | Quiet |
| `omnizart/omnizart` | n/a | n/a | n/a | n/a | n/a | **404 / moved** |

---

## 1. `facebookresearch/demucs` — Source separation
- **Stars:** 10.4k • **Forks:** 1.6k • **License:** MIT
- **Latest release:** None on GitHub Releases tab ("There aren't any releases here" — confirmed 2026-08-01). Repo ships via tags/commits only.
- **Recent activity:** README and codebase reference the MDX21 / Hybrid Transformer architecture; the repo's primary recent artifact is the `mdx21_demucs` MDX-Challenge submission, indicating the team is pushing model improvements through checkpoints rather than versioned releases.
- **Notable:** Despite the lack of formal releases, this is the de-facto standard for music source separation and continues to be referenced in 2026 papers.

## 2. `spotify/basic-pitch` — Audio → MIDI
- **Stars:** 5.4k • **Forks:** 486 • **License:** Apache-2.0
- **Latest release:** `v0.2.4` on **2023-04-10** (over 3 years ago). Last release notes: "Merge pull request #76 from spotify/rabitt/rm-strict-twine-check-in-p…"
- **Status:** **Dormant for releases.** No new GitHub release in ~3.4 years.
- **Implication for our monitor:** The TS/Python audio-to-MIDI pipeline is stable but Spotify has effectively stopped updating the public release. If we depend on it, we should pin `v0.2.4` and not expect upstream fixes. Consider forking if active development is needed.

## 3. `magenta/mt3` — Multi-instrument transcription (T5X)
- **Stars:** 1.7k • **Forks:** 221 • **License:** Apache-2.0
- **Latest release:** None listed on Releases tab. README still advertises the ISMIR 2021 piano checkpoint + ICLR 2022 multi-instrument checkpoint.
- **Status:** **Quiet / archive-like.** Repo description explicitly says "This is not an officially supported Google product." The T5X dependency makes it heavy and tied to JAX ecosystem momentum.
- **Implication:** If we're building a transcription pipeline, MT3 is a research artifact, not a maintained library. Newer T5-based alternatives (e.g. `lcm-lc/lightning` style wrappers) are likely a better investment.

## 4. `bytedance/piano_transcription` — High-resolution piano AMT
- **Stars:** 2.0k • **Forks:** 253 • **License:** Apache-2.0
- **Latest release:** None on Releases tab. Repo provides pretrained checkpoints via Hugging Face / direct download (referenced in README but not as a GH release).
- **Status:** **Quiet but still cited.** Underlying paper "High-resolution Piano Transcription with Pedals" (Kong et al. 2020) is still the SOTA reference for piano AMT. Companion dataset `bytedance/GiantMIDI-Piano` is the de-facto large-scale piano MIDI corpus.
- **Implication:** Treat as a stable pretrained model download, not a library to update.

## 5. `omnizart/omnizart` — Multi-instrument AMT
- **Stars:** n/a • **License:** n/a
- **Status:** **404 / Not found.** Both `https://github.com/omnizart/omnizart` and `https://github.com/omnizart/omnizart/commits` return GitHub's 404 page. The repo appears to have been deleted, transferred, or renamed.
- **Fallback action:** Check the org page `https://github.com/omnizart` and the PyPI package `omnizart` (which still resolves to a project by the same author, Tsung-Ping Chen, now at `mctalk-authoring-tools` org). Recommend de-listing from our monitor or replacing with the active fork.
- **Implication for our monitor:** This is a regression vs. previous weeks. Update the watchlist.

## 6. `cuthbertLab/music21` — Symbolic music toolkit
- **Stars:** 2.5k • **Forks:** 450 • **License:** BSD-3-Clause
- **Latest release:** README explicitly references **"v10"** as of 2026: *"These detailed explanations of the license were moved to this README.md file in 2026 (v10) and out of LICENSE, music21/LICENSE and music21/license.txt in order to make the music21 license more parsable by tooling."*
- **Status:** **Active research project.** Michael Cuthbert (MIT) continues to maintain. The v10 README reorganisation is a meaningful change — non-functional but signals a release milestone.
- **Notable:** License clarification (BSD-3-Clause is unchanged; the README move is *not* a relicensing).

## 7. `langchain-ai/langgraph` — Agent framework ⭐
- **Stars:** 38.6k • **Forks:** 6.5k • **License:** MIT
- **Latest release:** **`v1.2.5` on 2026-06-12** (auto-released by `github-actions`).
- **Notable changes since 1.2.4:**
  - `fix(langgraph)`: merge `lc_versions` config metadata (#8052)
  - `fix`: `updateState` bug for `deltaChannel` on empty thread (#8011)
  - `release(cli)`: `0.4.28` (LangGraph CLI)
  - `chore`: **migrate Python type checking from mypy to [`ty`](https://github.com/astral-sh/ty)** (#8002) — first major toolchain switch in the project
  - 14 minor+patch dependency bumps in `/libs/langgraph`
- **Cadence:** 56 pages of releases. The 1.2.x line is stable; expect 1.3 in late summer 2026.
- **Implication:** Active, well-maintained. The `ty` migration is the most consequential change — it signals the project is betting on Astral's tooling and may deprecate some mypy-only patterns downstream.

## 8. `crewAIInc/crewAI` — Agent framework
- **Stars:** 56.5k • **Forks:** 8.0k • **License:** MIT
- **Latest release:** **`v1.15.3a2` (alpha) on 2026-07-16** by `vinibrsl` (and `lucasgomide`).
- **Changes in 1.15.3a2:**
  - `fix`: synchronization of `kickoff-completed` event with `OUTPUT` hook result
  - `chore(deps)`: bump `setuptools` to 0.83.0 to address **PYSEC-2026-3447** (supply-chain advisory)
- **Cadence:** 23 pages of releases. v1.15.x is currently the active line; `1.15.3a2` is an alpha (the `a2` suffix confirms pre-release). Expect a stable `1.15.3` shortly.
- **Implication:** Active. The setuptools bump is non-trivial — anyone pinned to old setuptools in their env will need to update. The kickoff/OUTPUT hook fix is a correctness improvement for production crews.

---

## Hot Take — Impact Ranking

Ordered by *impact on a music-transcription agent pipeline*:

1. **`langchain-ai/langgraph` v1.2.5** — Highly relevant. The `updateState` / `deltaChannel` fix and the `ty` migration are real engineering signals. If our agent orchestration is on LangGraph, upgrade promptly.
2. **`crewAIInc/crewAI` v1.15.3a2** — Relevant. The `kickoff-completed` ↔ `OUTPUT` hook bug fix is the kind of issue that would silently corrupt audit logs in production. PYSEC-2026-3447 setuptools bump is mandatory.
3. **`cuthbertLab/music21` v10 (2026)** — Moderate. License-clarity reorg, no API break, but confirms the project is still maintained by Cuthbert. Safe to upgrade.
4. **`facebookresearch/demucs`** — Moderate. No formal release, but model checkpoints continue to flow. Pin to a known checkpoint hash rather than `main`.
5. **`spotify/basic-pitch` v0.2.4 (2023-04-10)** — **Dormant.** 3+ years since last release. Treat as frozen; do not expect upstream fixes.
6. **`magenta/mt3`** — Quiet. Research artifact, not a maintained library. Re-evaluate as a dependency.
7. **`bytedance/piano_transcription`** — Quiet. Stable pretrained model; no library churn.
8. **`omnizart/omnizart`** — **Gone (404).** Remove from our watchlist or substitute with the active PyPI package / `mctalk-authoring-tools` org fork.

**Biggest surprises this week:**
- `omnizart/omnizart` repo is **no longer reachable** — first 404 we've hit on this watchlist.
- LangGraph's switch from mypy to Astral `ty` is the most consequential non-feature change across all monitored repos.
- Basic-pitch is functionally abandoned on the public repo (3+ years without a release) — anyone building a real product on it should fork.

---

## Data Caveats
- All release tags and dates were extracted from the `Releases` pages on `github.com`. Where a repo has no Releases tab, this is noted explicitly.
- `omnizart/omnizart` 404 was reproduced on both the repo URL and `/commits` URL — consistent with deletion/rename, not a transient network failure.
- HTML was extracted by the local `web_fetch` tool on 2026-08-01; release dates use GitHub's `<relative-time>` display (UTC).
- Star/fork counts are point-in-time snapshots; not historical.
