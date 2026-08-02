# Music Transcription Monitor — Agent Instructions

## Project Goal

The **Music Transcription Monitor** is an automated research and monitoring pipeline that tracks state-of-the-art progress in automatic music transcription (AMT), audio-to-MIDI conversion, score rendering, and source separation. The pipeline ingests new academic papers (arXiv), open-source releases (GitHub), and library changelogs on a scheduled cadence, distills them into structured reports, and renders scored examples via a small Python pipeline (Demucs → Basic-Pitch → music21/Verovio). Agents operating inside this repo must keep the monitoring loop trustworthy, reproducible, and grounded in primary sources — never substitute rumor, paraphrase, or training-cutoff knowledge for verified evidence.

## Dashboard (v0.2 — interactive)

The Markdown reports under `reports/` are mirrored as interactive HTML pages under `dashboard/`:

| File | Source report | Re-build with |
|---|---|---|
| `dashboard/index.html`   | (hub, no MD source) | hand-edited |
| `dashboard/arxiv.html`  | `reports/weekly_*_arxiv.md`  | `python3 setup/build_dashboard.py` |
| `dashboard/github.html` | `reports/weekly_*_github.md` | `python3 setup/build_dashboard.py` |
| `dashboard/assets.html` | `reports/asset_research_*.md` | `python3 setup/build_dashboard.py` |
| `dashboard/links.html`  | aggregated from the three above | `python3 setup/build_dashboard.py` |
| `dashboard/tester.html` | (browser tool, no MD source) | hand-edited |
| `dashboard/data/*.json` | machine-readable mirrors | `python3 setup/build_dashboard.py` |
| `dashboard/shared/*.{css,js}` | design system + nav + copy-prompt | hand-edited |

**After any swarm cycle that regenerates the MD reports, run the build script to refresh the dashboard pages.** The script reads prompts from `setup/dashboard_prompts.py` and embeds them in each report page so the "Copy full prompt" button keeps working.

To re-run the Puppeteer e2e that verifies all pages: start a static server in `dashboard/` (`python3 -m http.server 8765`) then `node setup/test_dashboard.js` from `setup/`.

---

## Scheduled Routines

The pipeline runs three scheduled routines. Each routine produces a dated artifact under `out/` with a consistent naming scheme so cycles can be diffed over time.

### 1. Weekly — arXiv Sweep
- **File naming:** `out/arxiv/arxiv-YYYY-MM-DD.md` (one file per sweep, one sweep per week)
- **Time budget:** ≤ 20 minutes wall clock
- **Deliverable:** A markdown report listing 5–15 new or updated arXiv papers in `cs.SD`, `cs.LG`, `eess.AS`, and `cs.MM` touching transcription, source separation, optical music recognition (OMR), or score rendering. Each entry: arXiv ID, title, authors, abstract snippet (≤ 40 words), 1-line relevance tag, direct `https://arxiv.org/abs/...` link.
- **Acceptance criteria:**
  - File exists at the dated path.
  - ≥ 5 entries, each with a working arXiv link (verified via `web_fetch` HEAD or `web_search`).
  - No duplicate entries from prior weeks (cross-check `out/arxiv/` before adding).
  - Report is grounded: no claim made without a primary URL.

### 2. Monthly — GitHub & Ecosystem Sweep
- **File naming:** `out/github/github-YYYY-MM.md` (one file per month)
- **Time budget:** ≤ 30 minutes wall clock
- **Deliverable:** Markdown report tracking releases, notable commits, and trending repos for the trusted stack: `demucs`, `basic-pitch`, `music21`, `mido`, `librosa`, `verovio`, `langgraph`, `crewai`. For each: latest release tag + date, breaking changes since prior sweep, ≥ 1 direct link to the release notes or commit.
- **Acceptance criteria:**
  - File exists at the dated path.
  - Every listed package has its latest release tag verified via `web_fetch` on the repo's releases page or via the GitHub API.
  - Changelog diff (this month vs. prior month) is included as a short bullet list.
  - At least one "watch item" flagged — a repo that may need a package bump or a workaround.

### 3. Quarterly — Pipeline Health & Foundation Sweep
- **File naming:** `out/foundation/foundation-YYYY-Qn.md` (e.g. `foundation-2026-Q3.md`)
- **Time budget:** ≤ 45 minutes wall clock
- **Deliverable:** A quarterly report covering: (a) trusted_packages.txt review (still used? still maintained? security advisories?), (b) `setup/pipeline_starter.py` dry-run health check, (c) three-month diff of arXiv + GitHub reports highlighting persistent trends, (d) recommended stack changes (additions/removals) for the next quarter.
- **Acceptance criteria:**
  - File exists at the dated path.
  - `pipeline_starter.py` is re-parsed with `python3 -c "import ast; ast.parse(...)"` and the result is recorded in the report.
  - Every recommended change cites a primary source (release page, CVE, deprecation notice).
  - STATUS.json updated to reflect the quarterly outcome.

---

## File / Directory Layout

```
music-transcription-monitor/
├── AGENTS.md                  # This file
├── trusted_packages.txt       # Declared pip dependencies (one per line, with reason)
├── setup/
│   └── pipeline_starter.py    # Minimal stub showing the 4-stage pipeline
├── logs/
│   └── agent_actions.log      # Append-only agent action log (one line per action)
├── assets/                    # Raw input audio (gitignored normally)
├── reports/                   # Human-readable summary reports
├── out/
│   ├── arxiv/                 # Weekly arXiv sweeps
│   ├── github/                # Monthly GitHub sweeps
│   ├── foundation/            # Quarterly foundation sweeps + STATUS.json
│   ├── dashboard/             # Rendered dashboard fragments (HTML subagent's territory)
│   └── assets/                # Output figures (MIDI, MusicXML, PNG scores)
├── dashboard/                 # Source for the HTML dashboard (subagent builds here)
└── scratchpad/                # Throwaway working notes; safe to .gitignore
```

`.gitkeep` placeholders live in every empty directory so the structure is committed even before content arrives.

---

## Tool Surface

Agents in this repo have access to the following tools. Use the right tool for the job; do not over-rely on `bash` when a dedicated search/read tool fits.

| Tool | When to use |
| --- | --- |
| `web_search` | Discovering recent papers, releases, discussions. Default for open-ended questions. |
| `web_fetch` | Verifying a specific URL (release page, arXiv abstract, README). Use to confirm a claim. |
| `bash` | Running `python3 -c "..."` syntax checks, `ls`, `date`, `git status`, `mkdir`. Avoid heavy builds. |
| `read` | Reading local files (AGENTS.md, prior reports, pipeline script). |
| `write` | Creating new files (reports, log entries, scripts). |
| `edit` | Surgical edits to existing files (append log line, tweak config). |
| `glob` | Listing files by pattern (e.g. `out/arxiv/*.md`). |
| `grep` | Searching within files for prior references to a package, paper, or tag. |
| `update_goal` | Mark a monitoring cycle complete or blocked at the orchestrator level. |

Out of scope (do not use): arbitrary `pip install` without orchestrator sign-off, network calls to private endpoints, destructive shell commands (`rm -rf`, `git push --force`).

---

## Constraints

1. **Trusted packages gate.** All Python dependencies must be declared in `trusted_packages.txt` *before* being installed. Adding a new package requires a one-line justification in the file and an orchestrator confirmation. No unverified `pip install`.
2. **Ground-truth gate.** Every factual claim in a report (release tag, paper title, author, version number, CVE) must trace to a primary URL that was fetched or directly searched during the current cycle. No "from memory" or training-data citations.
3. **Reproducibility.** Reports are dated and immutable once written. A re-run of the same cycle must produce a file with a different date stamp, never silently overwriting the prior cycle's report.
4. **Time budgets.** Respect the wall-clock budgets above. If a sweep is at risk of exceeding budget, narrow scope (fewer entries) and document the cut in the report's footer.
5. **No silent failures.** If a fetch fails, log it explicitly in `logs/agent_actions.log` and surface it in the report's "Issues" section. Do not fabricate a fallback.
6. **No execution of the pipeline in bootstrap.** `setup/pipeline_starter.py` is a *stub* — the four stages are TODOs. Real execution happens in a later cycle, owned by a different subagent.

---

## Termination Rules

A monitoring cycle (weekly, monthly, or quarterly) is **complete** when *all* of the following hold:

1. The dated output file exists at the expected path.
2. The output file satisfies its routine's acceptance criteria above.
3. `logs/agent_actions.log` has a final line of the form `[<ISO8601>] [<agent-id>] <cycle> complete.`
4. `out/foundation/STATUS.json` (for quarterly cycles) or the report's footer (for weekly/monthly) records the outcome.

A cycle is **blocked** (and must be reported as `STATUS: FAIL` back to the orchestrator) when:

- A required primary URL is unreachable after one retry.
- The trusted_packages list has changed and no orchestrator confirmation has arrived within the budget.
- The pipeline stub fails to parse (caught by the `ast.parse` dry-run).
- A prior cycle's report contains a claim that cannot be re-verified.

When blocked, do not silently downgrade scope. Write the issue into the report, log it, and return `STATUS: FAIL — <reason>` to the orchestrator.
