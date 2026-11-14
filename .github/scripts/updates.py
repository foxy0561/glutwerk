"""
Glutwerk · Update-Liste erzeugen
Liest aus der Git-Geschichte, wann jedes Spiel zuletzt geändert wurde und was dabei neu war,
und schreibt alles in updates.json. Die Startseite sortiert damit die Spiele
(zuletzt und am häufigsten aktualisiert zuerst) und füllt das Update-Fenster.
Läuft automatisch über .github/workflows/updates.yml bei jedem Push.
"""
import json, os, re, subprocess, urllib.request
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Ordner, die keine Spiele sind
SKIP = {".github", "admin", "shots", "covers", "img", "node_modules"}
# Spiele in eigenen Repos: Link auf der Seite -> GitHub-Repo
EXTERN = {"https://foxy0561.github.io/Kiko-H-pft/": "foxy0561/Kiko-H-pft"}
MAX_ITEMS = 12
NOW = datetime.now(timezone.utc)

def clean(msg):
    """'Ameisenbau 2.3.5: Regen flutet ...' -> 'v2.3.5 · Regen flutet ...'"""
    msg = msg.strip()
    m = re.match(r"^([^:]{1,40}):\s*(.+)$", msg)
    if not m:
        return msg
    head, text = m.group(1), m.group(2)
    v = re.search(r"\bv?(\d+\.\d+(?:\.\d+)?)\b", head)
    return (f"v{v.group(1)} · " if v else "") + text[0].upper() + text[1:]

def skip(msg):
    return bool(re.match(r"^(merge|revert|updates\.json)", msg, re.I)) or "[skip upd]" in msg

def entry(commits):
    commits = [c for c in commits if not skip(c[1])]
    if not commits:
        return None
    seit = NOW - timedelta(days=14)
    n14 = sum(1 for d, _ in commits if datetime.fromisoformat(d) >= seit)
    items, seen = [], set()
    for d, s in commits:
        t = clean(s)
        if t in seen:
            continue
        seen.add(t)
        items.append({"d": d[:10], "t": t})
        if len(items) >= MAX_ITEMS:
            break
    return {"last": commits[0][0], "n14": n14, "items": items}

def spiele():
    """Ordner -> Titel aus der Spieleliste in index.html (plus Karten-Tab)"""
    html = open(os.path.join(ROOT, "index.html"), encoding="utf8").read()
    out = {"karten": "Karten"}
    for t, u in re.findall(r'title:\s*"([^"]+)"[^{}]*?url:\s*"([^"]*)"', html):
        if u and not u.startswith("http"):
            out[u.strip("/")] = t
    return out

def norm(s):
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]", "", s)

def lokal(ordner):
    """Alle Commits im Repo einmal lesen und den Spielen zuordnen.
       Ändert ein Commit mehrere Spiele, zählt er nur für die, die in der Nachricht stehen."""
    out = subprocess.run(["git", "log", "--format=@@%cI%x09%s", "--name-only"],
                         cwd=ROOT, capture_output=True, text=True).stdout
    res = {o: [] for o in ordner}
    res["glutwerk"] = []
    for block in out.split("@@")[1:]:
        kopf, *dateien = block.strip().split("\n")
        if "\t" not in kopf:
            continue
        d, msg = kopf.split("\t", 1)
        drin = {f.split("/")[0] for f in dateien if "/" in f} & set(ordner)
        # Steht vorne "Spielname:", gehört der Commit genau dorthin. "Glutwerk:" ist die Seite selbst.
        kopf_name = norm(msg.split(":", 1)[0]) if ":" in msg[:40] else ""
        nach_name = [o for o in ordner if kopf_name and (kopf_name.startswith(norm(ordner[o])) or kopf_name.startswith(norm(o)))]
        if kopf_name.startswith("glutwerk"):
            res["glutwerk"].append((d, msg))
            continue
        if nach_name:
            drin = set(nach_name) & (drin or set(nach_name))
        elif len(drin) > 1:
            n = norm(msg)
            drin = {o for o in drin if norm(ordner[o]) in n or norm(o) in n}
        for o in drin:
            res[o].append((d, msg))
    return res

def remote(repo):
    req = urllib.request.Request(f"https://api.github.com/repos/{repo}/commits?per_page=60",
                                 headers={"Accept": "application/vnd.github+json", "User-Agent": "glutwerk"})
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        req.add_header("Authorization", "Bearer " + tok)
    try:
        data = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        print("Konnte", repo, "nicht lesen:", e)
        return None
    return [(c["commit"]["committer"]["date"].replace("Z", "+00:00"), c["commit"]["message"].split("\n")[0]) for c in data]

games = {}
ordner = {o: t for o, t in spiele().items() if os.path.isdir(os.path.join(ROOT, o))}
for o, commits in lokal(ordner).items():
    e = entry(commits)
    if e:
        games[o + "/"] = e

alt = {}
try:
    alt = json.load(open(os.path.join(ROOT, "updates.json"))).get("games", {})
except Exception:
    pass
for url, repo in EXTERN.items():
    c = remote(repo)
    e = entry(c) if c else alt.get(url)   # bei Fehler alten Stand behalten
    if e:
        games[url] = e

neu = {"games": games}
pfad = os.path.join(ROOT, "updates.json")
try:
    if json.load(open(pfad)).get("games") == games:
        print("Keine Änderung.")
        raise SystemExit(0)
except (FileNotFoundError, json.JSONDecodeError):
    pass
neu["stand"] = NOW.isoformat(timespec="minutes")
json.dump(neu, open(pfad, "w"), ensure_ascii=False, indent=1)
print("updates.json geschrieben:", ", ".join(f"{k} ({v['n14']})" for k, v in games.items()))
