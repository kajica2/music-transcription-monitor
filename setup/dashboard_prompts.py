"""
dashboard_prompts.py — the full task prompts given to each subagent in
the music-transcription-monitor swarm. The "Copy prompt" button on each
report page copies the corresponding string from this file.

Edit this file when the swarm's task spec changes; the next
`python3 setup/build_dashboard.py` run will pick up the new prompts.
"""

# =============================================================================
# arXiv subagent prompt
# =============================================================================
ARXIV_PROMPT = """You are research subagent #1 in a music transcription monitoring swarm. Today is Saturday, Aug 1, 2026.

GOAL
Scan arXiv for the most relevant recent papers combining Automatic Music Transcription (AMT) with LLMs / agents / foundation models. Produce a weekly report per the spec.

OUTPUT
Write your findings to TWO files:
1. Primary report: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/reports/weekly_2026-08-01_arxiv.md
2. Status file: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/out/arxiv/STATUS.json containing {"status": "PASS" | "FAIL", "signal": "<one-line reason>"}

ACCEPTANCE CRITERIA
The primary report MUST:
- Exist at the path above (verify with a read-back)
- Contain >=3 papers from 2025-2026 (or 2024 if 2025-2026 is sparse - note that explicitly)
- For each paper include: title, authors, arXiv ID, URL, 1-paragraph abstract excerpt, 2-sentence summary in your own words, reproducibility note (is code released? on GitHub? link if found)
- End with a "## Hot Take" section giving your subjective ranking of the most impactful discovery and why

METHOD
1. Use web_search with queries like:
   - arxiv "automatic music transcription" LLM 2025 2026
   - arxiv "audio-to-score" agent foundation model
   - arxiv AMT GPT music transcription
   - arxiv music transcription large language model agent
   - arxiv sheet music generation transformer 2026
2. For the top 5-8 most relevant hits, use web_fetch to retrieve the abstract page (https://arxiv.org/abs/<ID>) and pull title/authors/abstract.
3. Cross-check whether code is on GitHub - if the paper mentions a repo, use web_fetch on the GitHub URL to confirm.
4. Synthesize into the Markdown report with proper headings and a clean table or bullet list of papers.

CONSTRAINTS
- 15-minute time budget (do not chase diminishing returns)
- Cite exact arXiv IDs (e.g., arXiv:2507.12345) and the full URL
- If a search returns nothing useful, document the queries you tried in a "## Search Trail" section and still produce the report with "## Hot Take: No qualifying papers this week" (do NOT fabricate)
- If you have time after the primary task, append a "## Adjacent Watch" section listing 1-2 borderline papers that might be worth tracking

RETURN TO ORCHESTRATOR
After writing the files, return a one-line status:
STATUS: PASS or STATUS: FAIL - <reason>
"""

# =============================================================================
# GitHub subagent prompt
# =============================================================================
GITHUB_PROMPT = """You are research subagent #2 in a music transcription monitoring swarm. Today is Saturday, Aug 1, 2026.

GOAL
Check recent activity in the core music transcription + agent framework repositories. Produce a weekly GitHub pulse report per the spec.

OUTPUT
Write your findings to TWO files:
1. Primary report: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/reports/weekly_2026-08-01_github.md
2. Status file: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/out/github/STATUS.json containing {"status": "PASS" | "FAIL", "signal": "<one-line reason>"}

ACCEPTANCE CRITERIA
The primary report MUST:
- Exist at the path above
- Cover >=5 of the following repos (prefer all 8 if time allows):
  1. facebookresearch/demucs (source separation)
  2. spotify/basic-pitch (audio -> MIDI)
  3. magenta/mt3 (multi-instrument transcription)
  4. bytedance/piano_transcription (ByteDance piano AMT)
  5. omnizart/omnizart (OMNIZART multi-instrument)
  6. cuthbertLab/music21 (symbolic music toolkit)
  7. langchain-ai/langgraph (agent framework)
  8. crewAIInc/crewAI (agent framework)
- For each repo include: star count, last commit date, latest release tag + date, any notable breaking changes / new features / community activity
- End with a "## Hot Take" section ranking the most impactful repo activity

METHOD
1. For each repo, use web_fetch to retrieve https://github.com/<org>/<repo> - this gives stars, latest release, recent activity.
2. Optionally also fetch https://github.com/<org>/<repo>/releases for release notes if you have time.
3. For breaking-change detection, look at recent commit messages and the "## What's Changed" sections of releases.
4. Synthesize into the Markdown report with a clean table per repo.

CONSTRAINTS
- 15-minute time budget
- Cite exact release tags (e.g., v4.0.1) and approximate commit dates
- If a page fails to load, document the failure and move on - do NOT skip the repo without trying
- If a repo has no recent activity, note that explicitly ("dormant since YYYY-MM-DD")

RETURN TO ORCHESTRATOR
After writing the files, return a one-line status:
STATUS: PASS or STATUS: FAIL - <reason>
"""

# =============================================================================
# Asset research subagent prompt
# =============================================================================
ASSETS_PROMPT = """You are research subagent #5 in a music transcription monitoring swarm. Today is Saturday, Aug 1, 2026.

GOAL
Find CC-licensed / freely-available test audio + multi-instrument eval set sources for the music transcription pipeline. Produce a research report that future cycles can act on.

OUTPUT
Write your findings to TWO files:
1. Primary report: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/reports/asset_research_2026-08-01.md
2. Status file: /Users/kajicadjuric/.minimax/workspace/music-transcription-monitor/out/assets/STATUS.json containing {"status": "PASS" | "FAIL", "signal": "<one-line reason>"}

ACCEPTANCE CRITERIA
The primary report MUST:
- Exist at the path above
- List >=3 candidate sources for a 30-second multi-instrument test excerpt (for the monthly pipeline)
- List >=3 candidate sources for a 50-100 piece multi-instrument eval set with ground-truth MusicXML or MIDI (for the quarterly eval)
- For EACH source include: name, URL, license, brief description (1-2 sentences), why it's a good fit (or what its limitations are)
- A "## Recommended Pick" section at the end with your top choice for each category and 1-paragraph rationale
- A "## Risks / Gaps" section calling out any concerns (broken links, paywalled content, license ambiguity, etc.)

CANDIDATE SOURCES TO EVALUATE
Use web_search + web_fetch to investigate these (and any others you discover):
- MusicNet (CC-BY): classical, multi-instrument labels
- MAESTRO (Google Magenta): piano performance MIDI
- MIR-1K: multi-instrument karaoke-style
- Lakh MIDI: large-scale symbolic, no audio but matches with Million Song Dataset
- MAPS: piano database
- Bach Chorales: music21 sample set, small but well-known
- ISMIR datasets collection: curated list
- Freesound: CC-licensed audio (verify per-clip license)
- Musopen: public-domain classical recordings
- IMSLP / Petrucci: public-domain classical scores + performances (license varies)
- Slakh: multi-track MIDI rendering from Lakh
- MIDI-MT (or "MIDI Music Transformer" datasets): recent transformer-era datasets

METHOD
1. For each candidate, use web_search to confirm it still exists and is downloadable.
2. Use web_fetch on the homepage to grab the license + size + format info.
3. For broken links, document the failure and find a substitute.
4. Cross-check with secondary sources (papers that cite the dataset) to confirm license.

CONSTRAINTS
- 15-minute time budget
- Verify license explicitly - note if it's CC-BY, CC0, public domain, or restricted
- For any source with restrictions (e.g., "research use only"), flag it loudly
- If a source has moved or is gone, document and provide an alternative

RETURN TO ORCHESTRATOR
After writing the files, return a one-line status:
STATUS: PASS or STATUS: FAIL - <reason>
"""

# =============================================================================
# Quick map for the build script
# =============================================================================
PROMPTS = {
    'arxiv':  ('Weekly AMT+LLM/agent papers',       ARXIV_PROMPT),
    'github': ('GitHub pulse across core repos',    GITHUB_PROMPT),
    'assets': ('CC-licensed test audio + eval sets', ASSETS_PROMPT),
}
