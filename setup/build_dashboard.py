#!/usr/bin/env python3
"""
build_dashboard.py — regenerate the dashboard's interactive report pages
from the Markdown reports produced by the music-transcription-monitor swarm.

Inputs (read):
    reports/weekly_YYYY-MM-DD_arxiv.md
    reports/weekly_YYYY-MM-DD_github.md
    reports/asset_research_YYYY-MM-DD.md
    setup/dashboard_prompts.py    (the "Copy prompt" payload per page)

Outputs (written):
    dashboard/arxiv.html
    dashboard/github.html
    dashboard/assets.html
    dashboard/links.html          (aggregated link dump across all reports)
    dashboard/data/links.json     (machine-readable link index)
    dashboard/data/papers.json    (arxiv papers, machine-readable)
    dashboard/data/repos.json     (github repos, machine-readable)
    dashboard/data/sources.json   (asset sources, machine-readable)

Usage:
    python3 setup/build_dashboard.py
    python3 setup/build_dashboard.py --reports-dir /path/to/reports
"""

from __future__ import annotations
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Local: prompts
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dashboard_prompts import PROMPTS  # type: ignore

# ----------------------------------------------------------------------
# Paths
# ----------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
DASHBOARD_DIR = PROJECT_DIR / "dashboard"
DATA_DIR = DASHBOARD_DIR / "data"
REPORTS_DIR = PROJECT_DIR / "reports"
SHARED_DIR = DASHBOARD_DIR / "shared"

TODAY = datetime.now().strftime("%Y-%m-%d")


# ----------------------------------------------------------------------
# Markdown parsers
# ----------------------------------------------------------------------

def _strip_md_inline(text: str) -> str:
    """Lightweight cleanup for inline markdown (bold, code, links)."""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text.strip()


def parse_arxiv(md: str) -> dict:
    """Extract papers + Hot Take from the arXiv weekly report."""
    papers: list[dict] = []
    current: dict | None = None

    paper_re = re.compile(r"^###\s+(\d+)\.\s+(.+?)\s*(?:\(([^)]+)\))?\s*$")
    section_re = re.compile(r"^##\s+(.+)$")

    for raw in md.splitlines():
        line = raw.rstrip()
        sm = section_re.match(line)
        if sm and current is not None and current.get("summary"):
            papers.append(current)
            current = None
        pm = paper_re.match(line)
        if pm:
            if current is not None:
                papers.append(current)
            current = {
                "num": int(pm.group(1)),
                "title": pm.group(2).strip(),
                "authors_line": (pm.group(3) or "").strip(),
                "arxiv_id": None,
                "url": None,
                "submitted": None,
                "abstract": None,
                "summary": None,
                "code": None,
                "reproducible": None,
            }
            continue
        if current is None:
            continue
        m = re.match(r"^-\s+\*\*arXiv ID:\*\*\s+`?([^`\s]+)`?(?:\s*\(?([^)]*)\)?)?", line)
        if m:
            current["arxiv_id"] = m.group(1).strip()
            if m.group(2):
                current["arxiv_id_label"] = m.group(2).strip()
            continue
        m = re.match(r"^-\s+\*\*URL:\*\*\s+(\S+)", line)
        if m:
            current["url"] = m.group(1).strip()
            continue
        m = re.match(r"^-\s+\*\*Submitted:\*\*\s+(.+)$", line)
        if m:
            current["submitted"] = m.group(1).strip()
            continue
        m = re.match(r"^-\s+\*\*Abstract excerpt:\*\*\s+\"?(.*?)\"?\s*$", line)
        if m:
            current["abstract"] = m.group(1).strip()
            continue
        m = re.match(r"^-\s+\*\*Summary in my own words:\*\*\s+(.+)$", line)
        if m:
            current["summary"] = m.group(1).strip()
            continue
        m = re.match(r"^-\s+\*\*Reproducibility:\*\*\s+(.+)$", line)
        if m:
            current["reproducible"] = m.group(1).strip()
            continue
        # Code link inside Reproducibility line
        m = re.search(r"<(https?://github\.com/[^>]+)>", line)
        if m and current is not None and "code" not in current:
            current["code"] = m.group(1).strip()

    if current is not None and current.get("summary"):
        papers.append(current)

    hot_take = _extract_section(md, "## Hot Take")
    adjacent = _extract_section(md, "## Adjacent Watch")
    search_trail = _extract_section(md, "## Search Trail")

    return {"papers": papers, "hot_take": hot_take, "adjacent": adjacent, "search_trail": search_trail}


def parse_github(md: str) -> dict:
    """Extract repos + Hot Take from the GitHub weekly report."""
    repos: list[dict] = []
    current: dict | None = None

    section_re = re.compile(r"^##\s+(\d+)\.\s+`?([^`]+)`?\s+—\s+(.+)$")
    table_re = re.compile(r"^\|\s*`?([\w\-]+/[\w\-]+)`?\s*\|")

    # First: try table-row parse for the summary table at the top.
    in_table = False
    for line in md.splitlines():
        if line.startswith("|") and "Repo" in line and "Stars" in line:
            in_table = True
            continue
        if in_table and line.startswith("|---"):
            continue
        if in_table and line.startswith("|"):
            cols = [c.strip().strip("`") for c in line.strip("|").split("|")]
            if len(cols) >= 5 and "/" in cols[0]:
                repos.append({
                    "name": cols[0],
                    "stars": cols[1] if len(cols) > 1 else "",
                    "forks": cols[2] if len(cols) > 2 else "",
                    "license": cols[3] if len(cols) > 3 else "",
                    "release": cols[4] if len(cols) > 4 else "",
                    "release_date": cols[5] if len(cols) > 5 else "",
                    "status": cols[6] if len(cols) > 6 else "",
                    "notes": "",
                    "url": "https://github.com/" + cols[0],
                })
            continue
        if in_table and not line.startswith("|"):
            in_table = False
        sm = section_re.match(line)
        if sm:
            if current is not None:
                repos.append(current)
            current = {
                "name": sm.group(2).strip(),
                "role": sm.group(3).strip(),
                "stars": "", "forks": "", "license": "",
                "release": "", "release_date": "", "status": "",
                "notes": "",
                "url": "https://github.com/" + sm.group(2).strip(),
                "details": [],
            }
            continue
        if current is None:
            continue
        m = re.match(r"^-\s+\*\*Stars:\*\*\s+(.+?)\s*(?:•\s+\*\*Forks:\*\*\s+(.+?))?\s*(?:•\s+\*\*License:\*\*\s+(.+?))?\s*$", line)
        if m:
            current["stars"] = (m.group(1) or "").strip()
            current["forks"] = (m.group(2) or "").strip()
            current["license"] = (m.group(3) or "").strip()
            continue
        m = re.match(r"^-\s+\*\*Latest release:\*\*\s+(.+?)\s+on\s+(.+?)(?:\s+\((.+?)\))?\s*$", line)
        if m:
            current["release"] = m.group(1).strip()
            current["release_date"] = m.group(2).strip()
            if m.group(3):
                current["release_date"] += " (" + m.group(3).strip() + ")"
            continue
        m = re.match(r"^-\s+\*\*Status:\*\*\s+(.+)$", line)
        if m:
            current["status"] = m.group(1).strip()
            continue
        if line.startswith("- "):
            current["details"].append(_strip_md_inline(line[2:]))

    if current is not None:
        repos.append(current)

    # De-dupe (table summary AND section detail may both appear)
    seen = set()
    deduped = []
    for r in repos:
        if r["name"] in seen:
            # Merge: prefer the one with more fields
            idx = next(i for i, x in enumerate(deduped) if x["name"] == r["name"])
            for k in ("stars", "forks", "license", "release", "release_date", "status", "notes", "details"):
                if r.get(k) and not deduped[idx].get(k):
                    deduped[idx][k] = r[k]
        else:
            seen.add(r["name"])
            deduped.append(r)

    hot_take = _extract_section(md, "## Hot Take")
    caveats = _extract_section(md, "## Data Caveats")
    return {"repos": deduped, "hot_take": hot_take, "caveats": caveats}


def parse_assets(md: str) -> dict:
    """Extract sources (test excerpt + eval set) + recommended pick from the asset research report."""
    sources: list[dict] = []
    current: dict | None = None

    section_re = re.compile(r"^###\s+(\d+)\.(\d+)\s+(.+)$")
    field_re = {
        "name": re.compile(r"^-\s+\*\*Name:\*\*\s+(.+)$"),
        "url":  re.compile(r"^-\s+\*\*URL:\*\*\s+(\S+)$"),
        "license": re.compile(r"^-\s+\*\*License:\*\*\s+(.+)$"),
        "description": re.compile(r"^-\s+\*\*Description:\*\*\s+(.+)$"),
        "fit": re.compile(r"^-\s+\*\*Why a good fit / limitations:\*\*\s+(.+)$"),
        "verified": re.compile(r"^-\s+\*\*Primary source verified:\*\*\s+(.+)$"),
    }
    category = "test"  # "test" until we hit the eval section

    for raw in md.splitlines():
        line = raw.rstrip()
        if "50-100 Piece" in line or "Eval Set" in line and "## 2" in line:
            category = "eval"
        sm = section_re.match(line)
        if sm:
            if current is not None:
                sources.append(current)
            current = {
                "category": category,
                "name": sm.group(3).strip(),
                "url": None, "license": None,
                "description": None, "fit": None, "verified": None,
            }
            continue
        if current is None:
            continue
        for key, pat in field_re.items():
            m = pat.match(line)
            if m:
                current[key] = m.group(1).strip()
                break

    if current is not None:
        sources.append(current)

    # Recommended picks
    rec_test = ""
    rec_eval = ""
    in_test = False
    in_eval = False
    for line in md.splitlines():
        if "## 4. Recommended Pick" in line:
            in_test = False; in_eval = False
        if "4.1 For the 30-second" in line:
            in_test = True; in_eval = False
        elif "4.2 For the 50-100" in line:
            in_test = False; in_eval = True
        if in_test and line.strip().startswith("**") and "MusicNet" in line:
            rec_test = _strip_md_inline(line)
        if in_eval and line.strip().startswith("**") and "Slakh" in line:
            rec_eval = _strip_md_inline(line)

    risks = _extract_section(md, "## 5. Risks / Gaps")
    sources_section = _extract_section(md, "## 6. Sources cited")

    return {
        "sources": sources,
        "rec_test": rec_test,
        "rec_eval": rec_eval,
        "risks": risks,
        "sources_section": sources_section,
    }


def _extract_section(md: str, header: str) -> str:
    """Return the body of the first section starting with `header` (## Hot Take)."""
    lines = md.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip() == header.strip() or line.strip().startswith(header.strip()):
            start = i + 1
            break
    if start is None:
        return ""
    body = []
    for line in lines[start:]:
        if line.startswith("## "):
            break
        body.append(line)
    return "\n".join(body).strip()


# ----------------------------------------------------------------------
# HTML rendering
# ----------------------------------------------------------------------

PAGE_HEAD = """<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>{title} — Agentic Music Transcription Monitor</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%237dd3c0'/%3E%3Ctext x='50' y='72' font-size='72' font-family='ui-monospace,monospace' font-weight='700' text-anchor='middle' fill='%230a0b10'%3EM%3C/text%3E%3C/svg%3E" />
  <link rel="stylesheet" href="{css_href}" />
</head>
<body>
  <div class="container">
    <header class="site-header">
      <div class="site-header__inner">
        <div class="brand">
          <div class="brand__mark" aria-hidden="true">M</div>
          <div class="brand__text">
            <h1><a href="index.html" style="color: inherit;">Agentic Music Transcription Monitor</a></h1>
            <p id="date-subtitle">—</p>
          </div>
        </div>
        <div class="header-actions">
          <nav class="nav" aria-label="Primary">
            <a class="nav__link" href="index.html">Hub</a>
            <a class="nav__link" href="arxiv.html">arXiv</a>
            <a class="nav__link" href="github.html">GitHub</a>
            <a class="nav__link" href="assets.html">Assets</a>
            <a class="nav__link" href="links.html">Links</a>
            <a class="nav__link" href="tester.html">Tester</a>
          </nav>
          <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle color theme">
            <svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
            <span id="theme-label">Theme</span>
          </button>
        </div>
      </div>
    </header>
    <main>
{breadcrumb}
"""

PAGE_FOOT = """
    </main>
    <footer class="site-footer">
      <span>music-transcription-monitor</span>
      <span><span class="dot">·</span>dashboard v0.2<span class="dot">·</span><span id="footer-date">—</span></span>
    </footer>
  </div>
  <script src="{js_href}"></script>
</body>
</html>
"""


def _breadcrumb(crumbs: list[tuple[str, str]]) -> str:
    if not crumbs:
        return ""
    items = []
    for i, (label, href) in enumerate(crumbs):
        sep = '<span class="dot">›</span>' if i > 0 else ""
        if href:
            items.append(f'{sep}<a href="{href}">{label}</a>')
        else:
            items.append(f'{sep}<span>{label}</span>')
    return (
        '<nav class="nav" aria-label="Breadcrumb" '
        'style="margin-bottom: var(--s-5); font-family: var(--font-mono); font-size: var(--fs-sm);">'
        + "".join(items) + "</nav>"
    )


def _prompt_box(prompt_id: str, prompt: str, label: str) -> str:
    """Render a 'Copy full prompt' box."""
    # HTML-escape the prompt for embedding in <pre>
    esc = (prompt
           .replace("&", "&amp;")
           .replace("<", "&lt;")
           .replace(">", "&gt;"))
    return f"""
    <div class="prompt-box">
      <div class="prompt-box__head">
        <h3 class="prompt-box__title">{label}</h3>
        <div class="prompt-box__actions">
          <button class="btn" data-copy-target="{prompt_id}">📋 Copy prompt</button>
        </div>
      </div>
      <pre class="prompt-box__body" id="{prompt_id}">{esc}</pre>
    </div>
    """


def _hot_take_box(text: str) -> str:
    if not text:
        return ""
    # First line as the title, rest as body
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return ""
    title = _strip_md_inline(lines[0]).lstrip("#").strip()
    body = _strip_md_inline("\n".join(lines[1:]).strip())
    return f"""
    <div class="hot-take">
      <p class="hot-take__label">🔥 Hot Take</p>
      <h3 class="hot-take__title">{title}</h3>
      <p class="hot-take__body">{body}</p>
    </div>
    """


def _status_pill(status: str) -> str:
    s = (status or "").lower()
    if any(x in s for x in ["active", "ok", "✓", "✅"]):
        return '<span class="pill pill--ok">Active</span>'
    if any(x in s for x in ["dormant", "quiet", "archive", "no formal", "watch", "warn", "⚠"]):
        return '<span class="pill pill--warn">Watch</span>'
    if any(x in s for x in ["404", "gone", "moved", "fail", "err", "✗", "❌"]):
        return '<span class="pill pill--err">Failed</span>'
    return '<span class="pill pill--pending">Info</span>'


# ----------------------------------------------------------------------
# Page renderers
# ----------------------------------------------------------------------

def render_arxiv(data: dict) -> str:
    papers = data["papers"]
    title = f"arXiv Report — {TODAY}"
    body = []
    body.append(_breadcrumb([("Hub", "index.html"), ("arXiv", None)]))
    body.append(f"""
    <section>
      <div class="section-head">
        <div>
          <p class="section-eyebrow">02 / Weekly</p>
          <h2 class="section-title">arXiv: AMT × LLM/Agent/Foundation Model</h2>
        </div>
        <p class="section-meta">{len(papers)} papers · generated {TODAY}</p>
      </div>
    </section>
    """)
    body.append(_hot_take_box(data["hot_take"]))
    body.append(_prompt_box("prompt-arxiv", PROMPTS["arxiv"][1], "📜 Full arXiv subagent prompt"))
    body.append('<section><div class="grid grid--weekly" id="papers-grid">')
    for p in papers:
        code_html = ""
        if p.get("code"):
            code_html = f"""
              <div class="paper__code" title="Code repository">
                <span class="paper__code-label">code</span>
                <a href="{p['code']}" target="_blank" rel="noopener">{p['code'].replace('https://', '')}</a>
              </div>"""
        url_html = ""
        if p.get("url"):
            url_html = f'<a href="{p["url"]}" target="_blank" rel="noopener">{p.get("arxiv_id") or "arXiv link"}</a>'
        submitted = p.get("submitted") or ""
        arxiv_id = p.get("arxiv_id") or ""
        body.append(f"""
        <article class="paper" id="paper-{p['num']}">
          <div class="paper__head">
            <div>
              <p class="paper__num">Paper #{p['num']} · {p.get('authors_line','')}</p>
              <h3 class="paper__title">{p['title']}</h3>
              <p class="paper__meta">
                <span>{arxiv_id}</span>
                <span>·</span>
                <span>Submitted {submitted}</span>
              </p>
            </div>
          </div>
          <p class="paper__details"><strong>arXiv:</strong> {url_html or '—'}</p>
          <p class="paper__summary"><strong>Summary:</strong> {p.get('summary','')}</p>
          <p class="paper__details"><strong>Reproducibility:</strong> {p.get('reproducible','')}</p>
          {code_html}
        </article>
        """)
    body.append("</div></section>")
    if data.get("adjacent"):
        body.append(f"""
        <section>
          <div class="section-head">
            <div>
              <p class="section-eyebrow">Adjacent Watch</p>
              <h2 class="section-title">Borderline — log for next week</h2>
            </div>
          </div>
          <div class="card">
            <pre class="tester__output" style="max-height: 300px;">{_strip_md_inline(data['adjacent'])}</pre>
          </div>
        </section>
        """)
    if data.get("search_trail"):
        body.append(f"""
        <section>
          <div class="section-head">
            <div>
              <p class="section-eyebrow">Search Trail</p>
              <h2 class="section-title">Queries run during this scan</h2>
            </div>
          </div>
          <div class="card">
            <pre class="tester__output" style="max-height: 240px;">{data['search_trail']}</pre>
          </div>
        </section>
        """)
    head = PAGE_HEAD.format(title=title, css_href="shared/styles.css", breadcrumb="")
    foot = PAGE_FOOT.format(js_href="shared/app.js")
    return head + "\n".join(body) + foot


def render_github(data: dict) -> str:
    repos = data["repos"]
    title = f"GitHub Pulse — {TODAY}"
    body = []
    body.append(_breadcrumb([("Hub", "index.html"), ("GitHub", None)]))
    body.append(f"""
    <section>
      <div class="section-head">
        <div>
          <p class="section-eyebrow">03 / Monthly</p>
          <h2 class="section-title">GitHub Pulse: Core Transcription &amp; Agent Repos</h2>
        </div>
        <p class="section-meta">{len(repos)} repos · generated {TODAY}</p>
      </div>
    </section>
    """)
    body.append(_hot_take_box(data["hot_take"]))
    body.append(_prompt_box("prompt-github", PROMPTS["github"][1], "📜 Full GitHub subagent prompt"))
    body.append('<section><table class="summary-table"><thead><tr><th>Repo</th><th>Stars</th><th>License</th><th>Latest release</th><th>Status</th></tr></thead><tbody>')
    for r in repos:
        body.append(f"""
        <tr>
          <td><strong><a href="{r['url']}" target="_blank" rel="noopener">{r['name']}</a></strong><br>
              <span style="color: var(--text-dim); font-size: var(--fs-xs);">{r.get('role','')}</span></td>
          <td>{r.get('stars','')}</td>
          <td>{r.get('license','')}</td>
          <td><code>{r.get('release','—')}</code><br>
              <span style="color: var(--text-faint); font-size: var(--fs-xs);">{r.get('release_date','')}</span></td>
          <td>{_status_pill(r.get('status','') or ' '.join(r.get('details',[])))}</td>
        </tr>
        """)
    body.append("</tbody></table></section>")

    body.append('<section><div class="grid grid--2">')
    for r in repos:
        if not r.get("details"):
            continue
        details = "<br>".join("• " + d for d in r["details"])
        body.append(f"""
        <article class="card">
          <div class="card__head">
            <div>
              <p class="card__step">{r.get('role','')}</p>
              <h3 class="card__title"><a href="{r['url']}" target="_blank" rel="noopener">{r['name']}</a></h3>
            </div>
            {_status_pill(r.get('status','') or ' '.join(r.get('details',[])))}
          </div>
          <p class="card__desc" style="font-size: var(--fs-xs);">{details}</p>
        </article>
        """)
    body.append("</div></section>")

    if data.get("caveats"):
        body.append(f"""
        <section>
          <div class="section-head">
            <div>
              <p class="section-eyebrow">Data Caveats</p>
              <h2 class="section-title">How this report was sourced</h2>
            </div>
          </div>
          <div class="card">
            <p class="card__desc">{_strip_md_inline(data['caveats'])}</p>
          </div>
        </section>
        """)
    head = PAGE_HEAD.format(title=title, css_href="shared/styles.css", breadcrumb="")
    foot = PAGE_FOOT.format(js_href="shared/app.js")
    return head + "\n".join(body) + foot


def render_assets(data: dict) -> str:
    sources = data["sources"]
    title = f"Asset Research — {TODAY}"
    body = []
    body.append(_breadcrumb([("Hub", "index.html"), ("Assets", None)]))
    body.append(f"""
    <section>
      <div class="section-head">
        <div>
          <p class="section-eyebrow">04 / Foundation</p>
          <h2 class="section-title">Asset Research: Test Audio &amp; Eval Sets</h2>
        </div>
        <p class="section-meta">{len(sources)} sources · generated {TODAY}</p>
      </div>
    </section>
    """)
    body.append(_prompt_box("prompt-assets", PROMPTS["assets"][1], "📜 Full Asset subagent prompt"))
    body.append('<section><div class="hot-take"><p class="hot-take__label">🏆 Recommended Picks</p>'
                f'<h3 class="hot-take__title">30-second test: {data.get("rec_test","MusicNet")}</h3>'
                f'<h3 class="hot-take__title">50-100 piece eval: {data.get("rec_eval","Slakh2100 + URMP + DCMLab Bach Chorales")}</h3>'
                '<p class="hot-take__body">See full rationale in section 4 of the report.</p></div></section>')

    test_sources = [s for s in sources if s["category"] == "test"]
    eval_sources = [s for s in sources if s["category"] == "eval"]

    def _license_pill(lic: str | None) -> str:
        lic = lic or "—"
        L = lic.upper()
        if "NC" in L or "CONFLICT" in L.lower() or "UNCLEAR" in L.lower():
            return '<span class="pill pill--warn">NC-flag</span>'
        if "CC0" in L or "PD" in L or "PUBLIC DOMAIN" in L:
            return '<span class="pill pill--ok">CC0/PD</span>'
        return '<span class="pill pill--pending">CC-BY</span>'

    body.append('<section><div class="section-head"><div><p class="section-eyebrow">Test audio (30s)</p><h2 class="section-title">Multi-Instrument Test Excerpt Sources</h2></div></div>')
    body.append('<div class="grid grid--2">')
    for s in test_sources:
        url = s.get("url") or "#"
        license_html = s.get("license") or "—"
        body.append(f"""
        <article class="card">
          <div class="card__head">
            <div>
              <p class="card__step">30-second test source</p>
              <h3 class="card__title"><a href="{url}" target="_blank" rel="noopener">{s['name']}</a></h3>
            </div>
            {_license_pill(license_html)}
          </div>
          <p class="card__desc">{s.get('description','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);"><strong>License:</strong> {license_html}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);">{s.get('fit','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs); color: var(--text-faint);">{s.get('verified','')}</p>
        </article>
        """)
    body.append("</div></section>")

    body.append('<section><div class="section-head"><div><p class="section-eyebrow">Eval set (50-100 pieces)</p><h2 class="section-title">Multi-Instrument Eval Set Sources</h2></div></div>')
    body.append('<div class="grid grid--2">')
    for s in eval_sources:
        url = s.get("url") or "#"
        license_html = s.get("license") or "—"
        body.append(f"""
        <article class="card">
          <div class="card__head">
            <div>
              <p class="card__step">Eval set source</p>
              <h3 class="card__title"><a href="{url}" target="_blank" rel="noopener">{s['name']}</a></h3>
            </div>
            {_license_pill(license_html)}
          </div>
          <p class="card__desc">{s.get('description','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);"><strong>License:</strong> {license_html}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);">{s.get('fit','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs); color: var(--text-faint);">{s.get('verified','')}</p>
        </article>
        """)
    body.append("</div></section>")
    body.append('<section><div class="section-head"><div><p class="section-eyebrow">Eval set (50-100 pieces)</p><h2 class="section-title">Multi-Instrument Eval Set Sources</h2></div></div>')
    body.append('<div class="grid grid--2">')
    for s in eval_sources:
        url = s.get("url") or "#"
        license_html = s.get("license") or "—"
        body.append(f"""
        <article class="card">
          <div class="card__head">
            <div>
              <p class="card__step">Eval set source</p>
              <h3 class="card__title"><a href="{url}" target="_blank" rel="noopener">{s['name']}</a></h3>
            </div>
            {_license_pill(license_html)}
          </div>
          <p class="card__desc">{s.get('description','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);"><strong>License:</strong> {license_html}</p>
          <p class="card__desc" style="font-size: var(--fs-xs);">{s.get('fit','')}</p>
          <p class="card__desc" style="font-size: var(--fs-xs); color: var(--text-faint);">{s.get('verified','')}</p>
        </article>
        """)
    body.append("</div></section>")

    if data.get("risks"):
        body.append(f"""
        <section>
          <div class="section-head">
            <div>
              <p class="section-eyebrow">Risks &amp; Gaps</p>
              <h2 class="section-title">License + integrity flags</h2>
            </div>
          </div>
          <div class="card">
            <pre class="tester__output" style="max-height: 480px;">{data['risks']}</pre>
          </div>
        </section>
        """)

    head = PAGE_HEAD.format(title=title, css_href="shared/styles.css", breadcrumb="")
    foot = PAGE_FOOT.format(js_href="shared/app.js")
    return head + "\n".join(body) + foot


def render_links(all_links: list[dict]) -> str:
    title = f"Total Links — {TODAY}"
    body = []
    body.append(_breadcrumb([("Hub", "index.html"), ("Links", None)]))
    body.append(f"""
    <section>
      <div class="section-head">
        <div>
          <p class="section-eyebrow">All Reports</p>
          <h2 class="section-title">Total Links</h2>
        </div>
        <p class="section-meta" id="links-meta">{len(all_links)} unique URLs · generated {TODAY}</p>
      </div>
    </section>
    """)
    body.append(f"""
    <div class="filter-bar">
      <input type="search" placeholder="Filter by title, source, or URL…" data-filter-target="links-list" />
      <span class="filter-bar__count" id="links-list-count">{len(all_links)} of {len(all_links)} links</span>
    </div>
    """)
    body.append('<div class="link-list" id="links-list">')
    # Group by source for legibility
    by_source: dict[str, list[dict]] = {}
    for ln in all_links:
        by_source.setdefault(ln["source"], []).append(ln)
    for source in sorted(by_source.keys()):
        body.append(f'<p class="section-eyebrow" style="margin-top: var(--s-5);">{source}</p>')
        for ln in by_source[source]:
            text = (ln.get("title", "") + " " + ln.get("url", "") + " " + ln.get("source", "")).lower()
            body.append(f"""
            <div class="link-row" data-filter-text="{text}">
              <span class="link-row__source">{ln.get('source','')}</span>
              <span class="link-row__title">{ln.get('title', ln.get('url','—'))}</span>
              <span class="link-row__url"><a href="{ln.get('url','#')}" target="_blank" rel="noopener">{ln.get('url','—')}</a></span>
            </div>
            """)
    body.append("</div>")
    head = PAGE_HEAD.format(title=title, css_href="shared/styles.css", breadcrumb="")
    foot = PAGE_FOOT.format(js_href="shared/app.js")
    return head + "\n".join(body) + foot


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--reports-dir", default=str(REPORTS_DIR),
                        help=f"Directory containing weekly_*.md / asset_research_*.md (default: {REPORTS_DIR})")
    parser.add_argument("--dashboard-dir", default=str(DASHBOARD_DIR),
                        help=f"Directory to write HTML pages into (default: {DASHBOARD_DIR})")
    parser.add_argument("--gh-pages-dir", default=str(PROJECT_DIR / "docs"),
                        help="Directory to mirror dashboard/* into for GitHub Pages (default: <project>/docs). Pass '' to disable.")
    args = parser.parse_args()

    reports_dir = Path(args.reports_dir)
    dashboard_dir = Path(args.dashboard_dir)
    data_dir = dashboard_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Find the latest files
    arxiv_files = sorted(reports_dir.glob("weekly_*_arxiv.md"))
    github_files = sorted(reports_dir.glob("weekly_*_github.md"))
    asset_files = sorted(reports_dir.glob("asset_research_*.md"))

    if not arxiv_files or not github_files or not asset_files:
        print(f"[FAIL] missing report files in {reports_dir}")
        print(f"  arxiv: {arxiv_files}")
        print(f"  github: {github_files}")
        print(f"  asset: {asset_files}")
        return 1

    arxiv_md = arxiv_files[-1].read_text(encoding="utf-8")
    github_md = github_files[-1].read_text(encoding="utf-8")
    asset_md = asset_files[-1].read_text(encoding="utf-8")

    print(f"[INFO] parsing arxiv:   {arxiv_files[-1].name}")
    arxiv_data = parse_arxiv(arxiv_md)
    print(f"[INFO] parsing github:  {github_files[-1].name}")
    github_data = parse_github(github_md)
    print(f"[INFO] parsing assets:  {asset_files[-1].name}")
    asset_data = parse_assets(asset_md)

    # Save machine-readable JSON
    (data_dir / "papers.json").write_text(json.dumps(arxiv_data, indent=2), encoding="utf-8")
    (data_dir / "repos.json").write_text(json.dumps(github_data, indent=2), encoding="utf-8")
    (data_dir / "sources.json").write_text(json.dumps(asset_data, indent=2), encoding="utf-8")

    # Aggregate all links
    all_links: list[dict] = []
    for p in arxiv_data["papers"]:
        if p.get("url"):
            all_links.append({"source": "arXiv", "title": p["title"], "url": p["url"]})
        if p.get("code"):
            all_links.append({"source": "arXiv code", "title": f"{p['title']} (code)", "url": p["code"]})
    for r in github_data["repos"]:
        if r.get("url"):
            all_links.append({"source": "GitHub", "title": r["name"], "url": r["url"]})
    for s in asset_data["sources"]:
        if s.get("url"):
            all_links.append({"source": f"Assets · {s['category']}", "title": s["name"], "url": s["url"]})
    (data_dir / "links.json").write_text(json.dumps(all_links, indent=2), encoding="utf-8")

    # Write HTML pages
    print(f"[INFO] writing arxiv.html  ({len(arxiv_data['papers'])} papers)")
    (dashboard_dir / "arxiv.html").write_text(render_arxiv(arxiv_data), encoding="utf-8")
    print(f"[INFO] writing github.html ({len(github_data['repos'])} repos)")
    (dashboard_dir / "github.html").write_text(render_github(github_data), encoding="utf-8")
    print(f"[INFO] writing assets.html ({len(asset_data['sources'])} sources)")
    (dashboard_dir / "assets.html").write_text(render_assets(asset_data), encoding="utf-8")
    print(f"[INFO] writing links.html  ({len(all_links)} links)")
    (dashboard_dir / "links.html").write_text(render_links(all_links), encoding="utf-8")

    # Mirror to GitHub Pages target (defaults to ./docs). Skips index.html
    # (the hand-edited hub) and tester.html (the hand-edited tool).
    gh_dir = args.gh_pages_dir
    if gh_dir:
        gh_path = Path(gh_dir)
        gh_path.mkdir(parents=True, exist_ok=True)
        # Touch .nojekyll so GitHub Pages doesn't try to process us as Jekyll
        (gh_path / ".nojekyll").touch(exist_ok=True)
        # Copy the 4 generated report pages
        for name in ("arxiv.html", "github.html", "assets.html", "links.html"):
            src = dashboard_dir / name
            dst = gh_path / name
            dst.write_bytes(src.read_bytes())
        # Copy hand-edited hub + tester if present
        for name in ("index.html", "tester.html"):
            src = dashboard_dir / name
            if src.exists():
                dst = gh_path / name
                dst.write_bytes(src.read_bytes())
        # Copy shared/ + data/ so the relative links work on Pages
        import shutil
        for sub in ("shared", "data"):
            src_dir = dashboard_dir / sub
            dst_dir = gh_path / sub
            if src_dir.exists():
                if dst_dir.exists():
                    shutil.rmtree(dst_dir)
                shutil.copytree(src_dir, dst_dir)
        print(f"[INFO] mirrored to {gh_path} (GitHub Pages source)")

    print(f"[DONE] dashboard rebuilt at {dashboard_dir}")
    print(f"  arxiv.html, github.html, assets.html, links.html")
    print(f"  data/papers.json, data/repos.json, data/sources.json, data/links.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
