# Music Transcription Monitor

An autonomous research and pipeline project for **Automatic Music Transcription (AMT)**, audio-to-MIDI conversion, score rendering, and source separation. A subagent swarm runs on a weekly / monthly / quarterly schedule; the results are surfaced as an interactive HTML dashboard you can click through in any browser.

> **One-click access:**
> - **Public URL (always fresh):** https://r50ix59e9vxop.space.minimax.io
> - **Desktop launcher (macOS):** double-click `~/Desktop/open-dashboard.command` — opens the public URL, falls back to local if you're offline.
> - **Local file (no server):** `open dashboard/index.html` from a terminal.

---

## What's in this project

### User-facing — the dashboard

The interactive HTML you click through. All six pages are static (no server, no external dependencies), and they share a single design system.

| File | What it is |
|---|---|
| `dashboard/index.html` | **Hub** — start here. Cards link into every other page. |
| `dashboard/arxiv.html` | This week's arXiv sweep on AMT × LLMs/agents/foundation models. 10 papers, clickable arXiv links, code-repo links, "Copy full prompt" button. |
| `dashboard/github.html` | GitHub pulse across Demucs, Basic Pitch, MT3, music21, LangGraph, crewAI. Stars, latest release tags, breaking changes. |
| `dashboard/assets.html` | CC-licensed test audio + eval-set sources for the pipeline. License verification per source; NC flags called out. |
| `dashboard/links.html` | **Total Links** — every URL from every report in one searchable/filterable list. |
| `dashboard/tester.html` | **Solo Instrument Transcription Tester** — browser-only monophonic pitch detection (ACF2+). Upload audio or use a built-in sample; get a piano roll + multi-instrument description. |
| `dashboard/shared/styles.css` | Design system: CSS custom properties, dark/light theme, all component styles. |
| `dashboard/shared/app.js` | Theme toggle, nav active state, copy-to-clipboard, search/filter. |
| `dashboard/data/*.json` | Machine-readable mirrors of the reports. Useful for CI, email digests, downstream consumers. |

### Reports — what the swarm produced

The raw Markdown the agents wrote. Read these if you want the full context; the HTML pages summarize them.

| File | What it is |
|---|---|
| `reports/weekly_2026-08-01_arxiv.md` | The full arXiv sweep (10 papers, each with abstract + 2-sentence summary + reproducibility note + Hot Take). |
| `reports/weekly_2026-08-01_github.md` | Full GitHub pulse (8 repos, summary table + per-repo detail + Hot Take). |
| `reports/asset_research_2026-08-01.md` | 19 source survey (6 test-excerpt + 13 eval-set) with primary-source license verification, recommended picks, and risks. |
| `reports/digest_2026-08-01.txt` | 5-minute email-ready digest. |

### Swarm infrastructure — files the agents use

You don't need to touch any of these for the demo to work. They're documented here so the project isn't mysterious.

| File | What it is |
|---|---|
| `AGENTS.md` | Instructions for any future agent session that picks up this project. Covers the three scheduled routines, file layout, tool surface, constraints, and termination rules. |
| `trusted_packages.txt` | Pre-approved Python packages (demucs, basic-pitch, music21, mido, librosa, torch, langgraph, crewai, verovio, etc.). One per line with a `# reason`. |
| `setup/pipeline_starter.py` | The 4-stage pipeline (Demucs → audio-to-MIDI → music21 cleanup → Verovio engraving). Currently a stub — each stage prints a `[STAGE] … starting…` line and returns a path. Real execution is a later cycle. |
| `setup/build_dashboard.py` | Re-generates the 4 report HTML pages + 4 JSON data files from the Markdown reports. Run this after any new swarm cycle. |
| `setup/dashboard_prompts.py` | The full subagent task prompts. These are what the "Copy full prompt" button copies. Edit this file when the task spec changes. |
| `setup/test_dashboard.js` | Puppeteer e2e test — visits all 6 pages, checks expected strings, clicks the copy-prompt button, types into the links filter, runs the tester with a built-in sample. Run after any UI change. |
| `setup/verify_deploy.js` | Puppeteer check that the *deployed* public URL serves all 6 pages with no console errors. Run after every deploy. |
| `setup/package.json` / `setup/package-lock.json` / `setup/node_modules/` | Puppeteer dependency. Installed once via `npm install --prefix setup`. |

### Logs, scratch, and outputs

| File / dir | What it is |
|---|---|
| `logs/agent_actions.log` | Append-only log of every external call the agents make (search, shell exec, eval). |
| `scratchpad/cycle-1-2026-08-01.md` | The last cycle's Cycle Report (what ran, what passed, what failed, next actions). |
| `out/*/STATUS.json` | Per-subagent pass/fail status from the last cycle. |
| `assets/` | Currently empty. Will hold downloaded test audio (MusicNet 30s clip for the monthly pipeline). |

---

## How to use

### Just look at the dashboard
Double-click `~/Desktop/open-dashboard.command`. Or paste the public URL into any browser. Or `open dashboard/index.html` from a terminal.

### Re-run after the next swarm cycle
```bash
cd /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor
python3 setup/build_dashboard.py   # regenerates the 4 report HTML pages
```
The hub (`index.html`) and the tester (`tester.html`) are hand-edited and don't need rebuilding.

### Deploy a fresh public URL
Re-run the deploy (the agent does this on request):
```bash
# The agent invokes the website_deploy tool. After deploy it auto-runs
# python3 setup/build_dashboard.py and updates the README with the new URL.
```

### Run the e2e tests locally
```bash
# Start a static server
cd dashboard && python3 -m http.server 8765 &

# Run the local Puppeteer test
cd setup && node test_dashboard.js
```

### Run the deployed-URL verification
```bash
cd setup && node verify_deploy.js
```

---

## How the swarm is structured

The swarm is dispatched in waves per the `subagent-swarm` skill. Each routine has its own time budget:

| Routine | Cadence | Time budget | Output |
|---|---|---|---|
| **Weekly** | Every Monday | 15 min | arXiv sweep → `reports/weekly_*.md` |
| **Monthly** | First Monday of the month | 2 hours | Pipeline rebuild + GitHub pulse |
| **Quarterly** | First Mon of Jan/Apr/Jul/Oct | 8 hours | Full eval against 50–100 piece test set |

Each cycle: orchestrator plans the wave, subagents execute in parallel, orchestrator verifies each artifact by reading it (not by trusting self-reports), writes a Cycle Report to `scratchpad/cycle-N-YYYY-MM-DD.md`, and re-plans for the next cycle.

---

## License

Project files: MIT. The **MuScriptor** paper (arXiv:2607.08168) recommends a CC BY-NC 4.0 weight license — be aware if you redistribute those weights. **MAESTRO** and **MAPS** are CC BY-NC-SA and are flagged in the assets report as not safe for commercial eval-set use.
