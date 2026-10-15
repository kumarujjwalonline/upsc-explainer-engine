"""Real screenshots of sources (production rule 15), taken on GitHub before rendering.

For every scene whose visual is {"type": "source", "url": ...}: open the live page in Chromium,
dismiss cookie banners, check the page is really the article (not a bot wall or error page),
and save a screenshot of the top of the page. The scene then shows that screenshot.
If a page can't be captured honestly, the scene keeps its details without a picture.
usage: python scripts/fetch_sources.py out/job.final.json

If the publisher blocks automated visits (common for journals), the same study is looked up on
PubMed (US National Library of Medicine) by its title and that real record page is captured.
Any other page that blocks capture (government sites, newspapers, reports) falls back to its most
recent Internet Archive (Wayback Machine) copy, which is the same real page and is credited as such.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

from PIL import Image
from playwright.sync_api import sync_playwright

path = sys.argv[1] if len(sys.argv) > 1 else "out/job.final.json"
job = json.load(open(path, encoding="utf-8"))
scenes = [s for s in job["scenes"] if (s.get("visual") or {}).get("type") == "source" and s["visual"].get("url")]
if not scenes:
    print("No source scenes")
    sys.exit(0)
out_dir = os.path.join("public", "jobs", job["id"], "sources")
os.makedirs(out_dir, exist_ok=True)
BLOCKED = ["just a moment", "access denied", "captcha", "are you a robot", "verify you are human", "403 forbidden", "404 not found", "page not found", "enable javascript and cookies", "unusual traffic"]
BUTTONS = ["Accept all", "Accept All Cookies", "Accept", "I agree", "I Accept", "Agree", "Allow all", "Got it", "OK", "Continue"]
done = {}
report = []

# Pop-ups, ads, cookie bars, sticky headers and video players removed before the capture.
CLEAN_JS = """
() => {
  const kill = (el) => { try { el.remove(); } catch (e) {} };
  document.querySelectorAll('iframe, ins, video, dialog, [role=dialog], [aria-modal=true], aside').forEach(kill);
  const adRe = /(^|[-_ ])(ad|ads|advert|advertisement|banner|popup|pop-up|modal|overlay|subscribe|newsletter|cookie|consent|gdpr|paywall|promo|sticky|taboola|outbrain|notification|interstitial)([-_ ]|$)/i;
  document.querySelectorAll('div, section, header, footer, nav, span').forEach((el) => {
    const cs = getComputedStyle(el);
    const id = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
    const r = el.getBoundingClientRect();
    if (cs.position === 'fixed' || cs.position === 'sticky') { kill(el); return; }
    if (adRe.test(id) && !el.querySelector('h1')) kill(el);
    else if (parseInt(cs.zIndex || '0', 10) > 999 && r.width > 200 && !el.querySelector('h1')) kill(el);
  });
  for (const el of [document.documentElement, document.body]) { el.style.overflow = 'visible'; el.style.filter = 'none'; }
  window.scrollTo(0, 0);
}
"""

# The headline (h1, else the biggest heading) and what follows it, up to ~620 px tall.
HEADLINE_JS = """
() => {
  let h = [...document.querySelectorAll('h1')].find((e) => e.innerText.trim().length > 15 && e.getBoundingClientRect().height > 0);
  if (!h) h = [...document.querySelectorAll('h2, [class*=title], [class*=headline]')].filter((e) => e.innerText.trim().length > 15 && e.getBoundingClientRect().height > 0).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
  if (!h) return null;
  let c = h;
  while (c.parentElement && c.parentElement.getBoundingClientRect().width < 900 && c.parentElement !== document.body) c = c.parentElement;
  const r = h.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.left, cr.left) - 24), w = Math.min(document.documentElement.clientWidth - x, Math.max(cr.width, r.width) + 48);
  const y = Math.max(0, r.top + window.scrollY - 28);
  return {x, y, width: w, height: Math.min(620, Math.max(360, r.height + 420))};
}
"""


def pubmed_url(title):
    """The PubMed record of a study, found by its title (free NCBI E-utilities, no key)."""
    if not title:
        return None
    q = urllib.parse.urlencode({"db": "pubmed", "retmode": "json", "retmax": 1, "term": f"{title}[Title]"})
    try:
        data = json.load(urllib.request.urlopen(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?{q}", timeout=20))
        ids = data.get("esearchresult", {}).get("idlist", [])
        return ids[0] if ids else None
    except Exception:  # noqa: BLE001
        return None


def wayback_url(url):
    """The latest Internet Archive copy of a page (free, no key), or None."""
    q = urllib.parse.urlencode({"url": url})
    try:
        data = json.load(urllib.request.urlopen(f"https://archive.org/wayback/available?{q}", timeout=20))
        snap = data.get("archived_snapshots", {}).get("closest") or {}
        return snap.get("url") if snap.get("available") and str(snap.get("status", "200")).startswith("2") else None
    except Exception:  # noqa: BLE001
        return None


def capture_pdf(url, sid):
    """A PDF (press releases, fact sheets): the top of its first page, rendered with poppler."""
    import subprocess
    import tempfile
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36"})
        data = urllib.request.urlopen(req, timeout=60).read()
        if not data.startswith(b"%PDF"):
            return {"shot_error": "not a PDF"}
        with tempfile.TemporaryDirectory() as t:
            open(os.path.join(t, "doc.pdf"), "wb").write(data)
            subprocess.run(["pdftoppm", "-png", "-r", "130", "-f", "1", "-l", "1", os.path.join(t, "doc.pdf"), os.path.join(t, "p")], check=True, timeout=120)
            first = sorted(f for f in os.listdir(t) if f.endswith(".png"))[0]
            img = Image.open(os.path.join(t, first)).convert("RGB")
        img = img.crop((0, 0, img.width, int(img.height * 0.42)))
        shot = os.path.join(out_dir, f"{sid}.png")
        img.save(shot, optimize=True)
        return {"shot": f"jobs/{job['id']}/sources/{sid}.png", "shotRatio": round(img.height / img.width, 3), "capturedUrl": url, "clipped": True}
    except Exception as e:  # noqa: BLE001
        return {"shot_error": f"pdf: {str(e)[:150]}"}


def capture(ctx, url, sid):
    if urllib.parse.urlparse(url).path.lower().endswith(".pdf"):
        return capture_pdf(url, sid)
    page = ctx.new_page()
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3500)
        for label in BUTTONS:
            try:
                page.get_by_role("button", name=label).first.click(timeout=700)
                page.wait_for_timeout(700)
                break
            except Exception:  # noqa: BLE001
                pass
        title = (page.title() or "").lower()
        body = (page.inner_text("body") or "")[:4000].lower()
        status = resp.status if resp else 0
        hit = next((k for k in BLOCKED if k in title or k in body[:600]), None)
        if status >= 400 or not body.strip() or hit:
            why = hit or ("empty page" if not body.strip() else "")
            return {"shot_error": f"page not capturable (status {status}{', ' + why if why else ''})"}
        page.evaluate(CLEAN_JS)
        page.wait_for_timeout(600)
        box = page.evaluate(HEADLINE_JS)
        shot = os.path.join(out_dir, f"{sid}.png")
        if box:
            # just the news itself: headline, byline and the start of the story
            page.screenshot(path=shot, clip=box)
        else:
            page.screenshot(path=shot)
        img = Image.open(shot)
        return {"shot": f"jobs/{job['id']}/sources/{sid}.png", "shotRatio": round(img.height / img.width, 3), "capturedUrl": url, "clipped": bool(box)}
    except Exception as e:  # noqa: BLE001
        return {"shot_error": str(e)[:160]}
    finally:
        page.close()


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--disable-blink-features=AutomationControlled"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 1400}, locale="en-IN",
                              user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
    ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    for s in scenes:
        v = s["visual"]
        url = v["url"]
        if url in done:
            v.update(done[url])
            continue
        result = capture(ctx, url, s["id"])
        if "shot" not in result:
            pmid = pubmed_url(v.get("title"))
            # the study's record on PubMed, then on Europe PMC (same paper, gentler bot checks)
            for alt in ([f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/", f"https://europepmc.org/article/MED/{pmid}"] if pmid else []):
                second = capture(ctx, alt, s["id"])
                if "shot" in second:
                    result = second
                    break
                result["shot_error"] += f"; {alt.split('/')[2]} failed ({second.get('shot_error')})"
        if "shot" not in result:
            alt = wayback_url(url)
            if alt:
                second = capture(ctx, alt, s["id"])
                if "shot" in second:
                    result = {**second, "archived": True}
                else:
                    result["shot_error"] += f"; web.archive.org failed ({second.get('shot_error')})"
        v.update(result)
        done[url] = result
        report.append({"id": s["id"], "url": url, **result})
        print(s["id"], url, "->", result.get("shot") or result.get("shot_error"), result.get("capturedUrl", ""))
    browser.close()
json.dump(job, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(report, open("out/sources-report.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
