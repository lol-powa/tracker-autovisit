#!/usr/bin/env python3

import json
import logging
import re
import subprocess
import sys
import time
import random
from datetime import datetime, timedelta
from pathlib import Path
from collections import deque
import requests

try:
    import pyotp
    PYOTP_AVAILABLE = True
except ImportError:
    PYOTP_AVAILABLE = False

try:
    from curl_cffi import requests as curl_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    CURL_CFFI_AVAILABLE = False

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
CONFIG   = DATA_DIR / "config.json"
SITES_D  = DATA_DIR / "sites.d"
LOG_FILE = DATA_DIR / "logs" / f"visit_{datetime.now().strftime('%Y-%m')}.log"

LOG_FILE.parent.mkdir(exist_ok=True)
HISTORY_DB = DATA_DIR / "history.db"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

def parse_args():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="Afficher la config des sites et quitter")
    parser.add_argument("--silent",  action="store_true", help="Aucune notification")
    parser.add_argument("--verbose", action="store_true", help="Notifications mail completes")
    parser.add_argument("--site",    type=str, nargs="+", default=None, help="Visiter uniquement ces sites")
    parser.add_argument("--stats",   action="store_true", help="Afficher uniquement les lignes de stats")
    parser.add_argument("--json-output", action="store_true", help="Ecrire status.json apres le run")
    parser.add_argument("--history-purge", type=int, metavar="JOURS",
        help="Purger les snapshots plus vieux que N jours (avec confirmation)")
    parser.add_argument("--history-show", type=str, metavar="SITE",
        help="Afficher les derniers snapshots d un site")
    parser.add_argument("--last", type=int, default=10, metavar="N",
        help="Nombre de snapshots a afficher avec --history-show (defaut: 10)")
    parser.add_argument("--raw", action="store_true",
        help="Format brut pour --history-show")
    args = parser.parse_args()
    return args

def load_config():
    if not CONFIG.exists():
        log.error("Fichier de config introuvable : " + str(CONFIG))
        sys.exit(1)
    with open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    if not SITES_D.is_dir():
        log.error("Repertoire de sites introuvable : " + str(SITES_D))
        sys.exit(1)
    sites = []
    for path in sorted(SITES_D.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            sites.append(json.load(f))
    if not sites:
        log.error("Aucun site dans " + str(SITES_D))
        sys.exit(1)
    cfg["sites"] = sites
    return cfg


def send_mail(cfg, subject, body):
    """Envoie un mail via msmtp. Desactivable via cfg['mail']['enabled']=false."""
    mc = cfg.get("mail", {})
    if not mc.get("enabled") or not mc.get("to"):
        return
    to = mc["to"]
    msg = "Subject: " + subject + "\nTo: " + to + "\nContent-Type: text/plain; charset=utf-8\n\n" + body
    try:
        r = subprocess.run(
            ["msmtp", to],
            input=msg.encode("utf-8"),
            capture_output=True,
            timeout=30,
        )
        if r.returncode == 0:
            log.info("Mail envoye : " + subject)
        else:
            err = r.stderr.decode("utf-8", errors="replace").strip()
            log.error("Echec mail msmtp (rc=" + str(r.returncode) + ") : " + err)
    except Exception as e:
        log.error("Echec mail : " + str(e))


def send_ntfy(cfg, title, body):
    """Envoie une notification ntfy via HTTP POST. Auth Basic si user+pass."""
    nc = cfg.get("ntfy", {})
    if not nc.get("enabled") or not nc.get("url") or not nc.get("topic"):
        return
    url = nc["url"].rstrip("/") + "/" + nc["topic"]
    headers = {
        "Title": title,
        "Priority": str(nc.get("priority", 4)),
        "Tags": nc.get("tags", "warning"),
    }
    auth = None
    if nc.get("auth_user") and nc.get("auth_pass"):
        auth = (nc["auth_user"], nc["auth_pass"])
    try:
        r = requests.post(url, data=body.encode("utf-8"), headers=headers, auth=auth, timeout=15)
        if r.status_code == 200:
            log.info("ntfy envoye : " + title)
        else:
            log.error("Echec ntfy HTTP " + str(r.status_code) + " : " + r.text[:200])
    except Exception as e:
        log.error("Echec ntfy : " + str(e))


def extract_csrf(html, field_name=None):
    # Si le nom du champ est connu, cherche directement
    if field_name:
        match = re.search(
            r'<input[^>]+name="' + re.escape(field_name) + r'"[^>]+value="([^"]+)"', html
        )
        if match:
            return match.group(1)
        match = re.search(
            r'<input[^>]+value="([^"]+)"[^>]+name="' + re.escape(field_name) + r'"', html
        )
        if match:
            return match.group(1)
        return None
    # Détection automatique — ordre de priorité
    patterns = [
        r'<meta name="csrf-token"\s+content="([^"]+)"',           # Laravel/Vue meta
        r'<input[^>]+name="_token"[^>]+value="([^"]+)"',           # Laravel form
        r'<input[^>]+name="csrf_token"[^>]+value="([^"]+)"',       # Flask/Werkzeug
        r'<input[^>]+name="_csrf_token"[^>]+value="([^"]+)"',      # Symfony
        r'<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"',  # ASP.NET
        # ordre inversé attributs (value avant name)
        r'<input[^>]+value="([^"]+)"[^>]+name="_token"',
        r'<input[^>]+value="([^"]+)"[^>]+name="csrf_token"',
        r'<input[^>]+value="([^"]+)"[^>]+name="_csrf_token"',
        r'<input[^>]+value="([^"]+)"[^>]+name="__RequestVerificationToken"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return match.group(1)
    return None

def extract_hidden_fields(html, exclude=None):
    exclude = exclude or []
    fields = {}
    for match in re.finditer(
        r'<input[^>]+type=["\']hidden["\'][^>]*>', html, re.IGNORECASE
    ):
        tag = match.group(0)
        name_m  = re.search(r'name=["\']([^"\']+)["\']', tag)
        value_m = re.search(r'value=["\']([^"\']*)["\']', tag)
        if name_m:
            name = name_m.group(1)
            if name not in exclude:
                fields[name] = value_m.group(1) if value_m else ""
    return fields

def fmt_bytes(val):
    try:
        n = float(val)
    except (ValueError, TypeError):
        return str(val)
    for unit in ["o", "Ko", "Mo", "Go", "To", "Po"]:
        if abs(n) < 1024.0:
            return f"{n:.2f} {unit}"
        n /= 1024.0
    return f"{n:.2f} Eo"

def extract_stats(html, patterns):
    stats = {}
    factors = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4}
    for key, spec in patterns.items():
        # Support format polymorphe : str (simple) ou dict {"pattern": ..., "unit": ...}
        if isinstance(spec, dict):
            pattern = spec["pattern"]
            unit = spec.get("unit")
        else:
            pattern = spec
            unit = None
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if not match:
            stats[key] = "N/A"
            continue
        value = match.group(1).strip()
        if unit:
            try:
                num = float(value.replace(",", "").replace(" ", "").replace("\xa0", ""))
                stats[key] = fmt_bytes(num * factors[unit.upper()])
            except (ValueError, KeyError):
                stats[key] = value
        else:
            stats[key] = value
    return stats

def get_json_path(data, path, default=None):
    """Walk un path dotted (ex: 'meta.unreadCount') ou plat (ex: 'total')
    dans un dict/liste JSON. Retourne default si le chemin n'existe pas.
    Conserve le type d'origine de la valeur (int, str, bool, ...)."""
    try:
        val = data
        for part in path.split("."):
            val = val[part] if isinstance(val, dict) else val[int(part)]
        return val
    except (KeyError, IndexError, TypeError, ValueError):
        return default

def extract_stats_json(data, fields):
    stats = {}
    for key, path in fields.items():
        try:
            val = data
            for part in path.split("."):
                val = val[part] if isinstance(val, dict) else val[int(part)]
            # Conversion automatique si la clé suggère des octets
            if any(w in key.lower() for w in ["upload", "download", "bytes", "size"]):
                val = fmt_bytes(val)
            elif key.lower() == "ratio":
                try:
                    val = f"{float(val):.2f}"
                except (ValueError, TypeError):
                    val = str(val)
            else:
                val = str(val)
            stats[key] = val
        except (KeyError, IndexError, TypeError):
            stats[key] = "N/A"
    return stats

def fetch_extra_stats(session, url, fields, name, timeout, fmt="json"):
    """Recupere une URL supplementaire (JSON ou HTML) avec la session courante
    et extrait les champs definis dans fields. Le format est selectionne par fmt :
      - "json" (defaut) : parse JSON puis extract_stats_json (dotted path)
      - "html"          : recupere r.text puis extract_stats (regex polymorphe)
    En cas d'echec (HTTP, timeout, parse), log un warning et retourne un dict vide
    pour ne pas casser la collecte principale."""
    if fmt not in ("json", "html", "html_count"):
        log.warning("[" + name + "] extra_format inconnu '" + str(fmt) + "', fallback json")
        fmt = "json"
    try:
        r = session.get(url, timeout=timeout)
        if r.status_code != 200:
            log.warning("[" + name + "] extra_url HTTP " + str(r.status_code))
            return {}
        if fmt == "html":
            return extract_stats(r.text, fields)
        if fmt == "html_count":
            out = {}
            for field, pattern in fields.items():
                try:
                    out[field] = str(len(re.findall(pattern, r.text)))
                except Exception as e:
                    log.warning("[" + name + "] extra_stats html_count " + field + " : " + str(e))
            return out
        data = r.json()
    except Exception as e:
        log.warning("[" + name + "] extra_url echec : " + str(e))
        return {}
    return extract_stats_json(data, fields)

def is_retryable_error(msg):
    """Determine si un msg d'echec correspond a une erreur transitoire retryable.
    Couvre : timeout, codes HTTP 5xx, 429, 403, DNS, connexion refusee/reset."""
    if not msg:
        return False
    m = msg.lower()
    if re.search(r"\bhttp\s+5\d{2}\b", m):
        return True
    if re.search(r"\bhttp\s+429\b", m):
        return True
    if re.search(r"\bhttp\s+403\b", m):
        return True
    if "timeout" in m or "timed out" in m:
        return True
    if "connection refused" in m or "connection reset" in m:
        return True
    if "max retries exceeded" in m:
        return True
    if "name or service not known" in m or "temporary failure in name resolution" in m:
        return True
    return False

MAINTENANCE_KEYWORDS = [
    "maintenance",
    "hors ligne",
    "back soon",
    "temporarily unavailable",
    "currently unavailable",
    "site is down",
    "we'll be back",
    "we will be back",
    "revenez bientot",
    "revenez bient\u00f4t",
    "under maintenance",
    "scheduled maintenance",
    "temporairement indisponible",
    "site indisponible",
    "service indisponible",
    "en cours de maintenance",
    "migration en cours",
    "intermission",
    "not available",
    "will return",
]

_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)

def detect_maintenance(text, extra_keywords=None):
    """Detection heuristique d'une page de maintenance via mots-cles generiques
    (MAINTENANCE_KEYWORDS), independante du tracker visite. extra_keywords permet
    d'ajouter du vocabulaire propre a un site (page de coupure atypique), sans quoi
    la detection reste purement automatique a chaque run.
    Le contenu des balises <script>/<style> est exclu de la recherche : les bundles
    JS (ex. Next.js) embarquent parfois des noms de composants (ex. "MaintenanceCheck")
    qui matcheraient a tort sans etre du texte reellement affiche."""
    if not text:
        return False
    cleaned = _SCRIPT_STYLE_RE.sub(" ", text)
    t = cleaned.lower()
    keywords = MAINTENANCE_KEYWORDS + list(extra_keywords or [])
    return any(kw.lower() in t for kw in keywords)

def init_history_db():
    """Cree la table stat_snapshots si elle n existe pas."""
    import sqlite3
    try:
        conn = sqlite3.connect(HISTORY_DB)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS stat_snapshots (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                site         TEXT NOT NULL,
                status       TEXT NOT NULL,
                error        TEXT,
                alert        TEXT,
                fields_json  TEXT NOT NULL,
                captured_at  TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_stat_snapshots_site_time
                ON stat_snapshots (site, captured_at)
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        log.warning("Init history.db echouee : " + str(e))

def purge_old_history(days):
    """Supprime les snapshots plus vieux que `days` jours. Retourne le nombre supprime."""
    if not days or days <= 0:
        return 0
    import sqlite3
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = sqlite3.connect(HISTORY_DB)
        cur = conn.execute("DELETE FROM stat_snapshots WHERE captured_at < ?", (cutoff,))
        n = cur.rowcount
        conn.commit()
        conn.close()
        return n
    except Exception as e:
        log.warning("Purge history echouee : " + str(e))
        return 0

def purge_old_logs(days):
    """Supprime les visit_YYYY-MM.log plus vieux que `days` jours. Retourne le nombre supprime."""
    if not days or days <= 0:
        return 0
    cutoff = time.time() - days * 86400
    n = 0
    try:
        for p in (DATA_DIR / "logs").glob("visit_*.log"):
            if p.stat().st_mtime < cutoff:
                p.unlink()
                n += 1
    except Exception as e:
        log.warning("Purge logs echouee : " + str(e))
    return n

def find_site_by_name(arg, cfg):
    """Resout un argument CLI (nom de site, casse libre) vers le nom canonique.
    Renvoie le champ name exact du JSON site, ou None si introuvable."""
    if not arg:
        return None
    needle = arg.strip().lower()
    for s in cfg.get("sites", []):
        if s.get("name", "").lower() == needle:
            return s["name"]
    return None

def show_history(site_name, last=10, raw=False):
    """Affiche les derniers snapshots d un site. Format parse par defaut, brut si raw=True."""
    import sqlite3
    import json as _json
    try:
        conn = sqlite3.connect(HISTORY_DB)
        rows = conn.execute(
            "SELECT captured_at, status, error, alert, fields_json "
            "FROM stat_snapshots WHERE site = ? ORDER BY id DESC LIMIT ?",
            (site_name, last),
        ).fetchall()
        conn.close()
    except Exception as e:
        print("Erreur de lecture de history.db : " + str(e))
        return
    if not rows:
        print("Aucun snapshot trouve pour " + site_name + ".")
        return
    if raw:
        print("{:<20}  {:<6}  {:<12}  fields_json".format("captured_at", "status", "alert"))
        print("-" * 100)
        for captured_at, status, error, alert, fields_json in rows:
            alert_str = alert or ""
            print("{:<20}  {:<6}  {:<12}  {}".format(captured_at, status, alert_str, fields_json))
        return
    print("=== " + site_name + " -- " + str(len(rows)) + " dernier(s) snapshot(s) ===")
    for captured_at, status, error, alert, fields_json in rows:
        print()
        tag = "[" + status + "]"
        extras = ""
        if alert:
            extras += "  ALERTE: " + alert
        if error and status != "ok":
            extras += "  " + error
        print(captured_at + "  " + tag + extras)
        try:
            fields = _json.loads(fields_json)
            if fields:
                line = " | ".join(k + ": " + str(v) for k, v in fields.items())
                print("  " + line)
        except Exception:
            pass

def parse_stats_str(s):
    """Parse 'upload: X | ratio: Y | bonus: Z' en dict."""
    if not s:
        return {}
    result = {}
    for part in s.split("|"):
        if ":" not in part:
            continue
        k, v = part.split(":", 1)
        result[k.strip()] = v.strip()
    return result

def write_snapshot(site_name, status, error, alert, fields):
    """Insere un snapshot dans stat_snapshots."""
    import sqlite3
    import json
    try:
        conn = sqlite3.connect(HISTORY_DB)
        conn.execute(
            "INSERT INTO stat_snapshots (site, status, error, alert, fields_json, captured_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                site_name,
                status,
                error,
                alert,
                json.dumps(fields, ensure_ascii=False),
                datetime.now().isoformat(timespec="seconds"),
            )
        )
        conn.commit()
        conn.close()
    except Exception as e:
        log.warning("Ecriture history.db echouee pour " + site_name + " : " + str(e))

def last_ok_date(site_name):
    """Retourne la date (ISO) du dernier snapshot status='ok' pour ce site, ou None."""
    import sqlite3
    try:
        conn = sqlite3.connect(HISTORY_DB)
        cur = conn.execute(
            "SELECT captured_at FROM stat_snapshots "
            "WHERE site = ? AND status = 'ok' ORDER BY id DESC LIMIT 1",
            (site_name,),
        )
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None

def visit_site_playwright(site):
    name = site["name"]
    timeout = site.get("timeout", 20) * 1000

    if not PLAYWRIGHT_AVAILABLE:
        msg = "ECHEC [" + name + "] playwright non installe"
        log.error(msg)
        return False, msg, None

    try:
        with sync_playwright() as p:
            browser = p.firefox.launch(headless=True)
            page = browser.new_page()

            # Interception des reponses API (playwright_intercept)
            intercepted = {}
            intercept_urls = site.get("playwright_intercept", [])
            def _on_response(response):
                for iurl in intercept_urls:
                    if response.url == iurl or response.url.startswith(iurl):
                        try:
                            intercepted[response.url] = response.json()
                        except Exception:
                            pass
            if intercept_urls:
                page.on("response", _on_response)

            log.info("[" + name + "] Chargement de la page de login (Playwright) : " + site["url"])
            page.goto(site["url"], timeout=timeout)
            page.wait_for_timeout(2000)
            if detect_maintenance(page.inner_text("body"), site.get("maintenance_keywords")):
                browser.close()
                msg = "MAINTENANCE [" + name + "] Site en maintenance (detection automatique)"
                log.warning(msg)
                return False, msg, {"maintenance": True}

            username_field = site.get("username_field", "username")
            password_field = site.get("password_field", "password")
            submit_selector = site.get("playwright_submit", "button[type=submit]")
            pwd_selector = site.get("playwright_password_selector")
            user_selector = site.get("playwright_username_selector")

            # Attendre que le champ password soit pret (utile pour les hooks JS / LiveView)
            if pwd_selector:
                try:
                    page.wait_for_selector(pwd_selector, timeout=15000)
                    page.wait_for_timeout(2000)
                except Exception:
                    pass
            if site.get("username"):
                if user_selector:
                    page.wait_for_selector(user_selector, timeout=15000)
                    page.fill(user_selector, site["username"])
                elif username_field:
                    page.fill("input[name='" + username_field + "']", site["username"])
            if pwd_selector:
                page.fill(pwd_selector, site["password"])
            else:
                page.fill("input[name='" + password_field + "']", site["password"])
            page.click(submit_selector)
            login_url = page.url
            wait_url_change = site.get("playwright_wait_url_change")
            post_login_wait = site.get("playwright_post_login_wait")
            if wait_url_change:
                # Attendre que l'URL change apres le submit
                try:
                    page.wait_for_function(
                        "url => window.location.href !== url",
                        arg=login_url,
                        timeout=int(wait_url_change) * 1000
                    )
                except Exception:
                    pass
                page.wait_for_timeout(int(post_login_wait or 3) * 1000)
            elif post_login_wait:
                page.wait_for_timeout(int(post_login_wait) * 1000)
            else:
                page.wait_for_load_state("networkidle", timeout=timeout)

            log.info("[" + name + "] URL apres login : " + page.url)

            # Gestion 2FA TOTP
            if "two-factor" in page.url or "2fa" in page.url:
                totp_secret = site.get("totp_secret")
                if not totp_secret:
                    browser.close()
                    msg = "ECHEC [" + name + "] 2FA detecte mais totp_secret absent"
                    log.error(msg)
                    return False, msg, None
                if not PYOTP_AVAILABLE:
                    browser.close()
                    msg = "ECHEC [" + name + "] pyotp non installe -- 2FA impossible"
                    log.error(msg)
                    return False, msg, None
                import pyotp as _pyotp
                totp_code = _pyotp.TOTP(totp_secret).now()
                totp_field = site.get("totp_field", "code")
                log.info("[" + name + "] Code TOTP genere pour 2FA Playwright : " + totp_code)
                page.fill("input[name='" + totp_field + "']", totp_code)
                try:
                    page.click("button.auth-form__primary-button", timeout=timeout)
                except Exception:
                    pass  # Navigation deja en cours
                page.wait_for_load_state("networkidle", timeout=timeout)
                log.info("[" + name + "] URL apres 2FA : " + page.url)

            # Mode fetch verify_url directement via Playwright (Nostradamus / sites a fingerprint strict)
            if site.get("playwright_fetch_verify"):
                verify_url = site.get("verify_url")
                if not verify_url:
                    browser.close()
                    msg = "ECHEC [" + name + "] verify_url manquant (playwright_fetch_verify)"
                    log.error(msg)
                    return False, msg, None
                page.goto(verify_url, timeout=timeout)
                page.wait_for_timeout(int(site.get("playwright_post_verify_wait", 3)) * 1000)
                html = page.content()
                browser.close()
                body_lower = html.lower()

                # Stats
                site_stats = site.get("stats", {})
                if site_stats:
                    stats = extract_stats(html, site_stats)
                    stats_str = format_stats(stats, site)
                    log.info("[" + name + "] Stats -- " + stats_str)

                # Alertes MP
                alert_keywords = site.get("alert_keywords", [])
                for kw in alert_keywords:
                    if kw.lower() in body_lower:
                        alert_label = site.get("alert_label", kw)
                        log.info("[" + name + "] ALERTE : " + alert_label)
                        return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}

                # Verification succes
                custom_keywords = site.get("success_keywords", [])
                if custom_keywords:
                    matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
                    if matched:
                        msg = "OK [" + name + "] Connexion reussie (mot-cle : " + matched + ")"
                        log.info(msg)
                        return True, msg, None
                    else:
                        msg = "ECHEC [" + name + "] Mot-cle introuvable apres playwright_fetch_verify"
                        log.warning(msg)
                        return False, msg, None
                msg = "OK [" + name + "] Connexion reussie (playwright_fetch_verify)"
                log.info(msg)
                return True, msg, None

            # Appel extra_url tant que le navigateur est encore ouvert (page.request
            # reutilise cookies et fingerprint du navigateur).
            extra_data = None
            extra_url_cfg = site.get("extra_url")
            if extra_url_cfg:
                try:
                    r_extra = page.request.get(extra_url_cfg, timeout=site.get("timeout", 20) * 1000)
                    if r_extra.status == 200:
                        extra_data = r_extra.json()
                    else:
                        log.warning("[" + name + "] extra_url HTTP " + str(r_extra.status))
                except Exception as e:
                    log.warning("[" + name + "] extra_url echec : " + str(e))
            cookies = page.context.cookies()
            browser.close()

        # Traitement des donnees interceptees (playwright_intercept)
        if intercepted:
            # Stats JSON
            stats_json = site.get("stats_json", {})
            stats_url = site.get("playwright_stats_url", "")
            if stats_json and stats_url:
                jdata = intercepted.get(stats_url)
                if jdata:
                    stats = extract_stats_json(jdata, stats_json)
                    # Stats supplementaires via endpoint JSON additionnel (extra_url + extra_stats)
                    # Appel via la session Playwright pour reutiliser les cookies/fingerprint navigateur.
                    extra_fields = site.get("extra_stats")
                    if extra_data and extra_fields:
                        for label, jpath in extra_fields.items():
                            val = get_json_path(extra_data, jpath)
                            if val is not None:
                                stats[label] = str(val)
                    stats_str = format_stats(stats, site)
                    log.info("[" + name + "] Stats -- " + stats_str)
            # MP via mp_url intercepte
            mp_url = site.get("mp_url", "")
            mp_json_field = site.get("mp_json_field", "total")
            if mp_url:
                mp_data = intercepted.get(mp_url)
                if mp_data:
                    mp_count = get_json_path(mp_data, mp_json_field, 0)
                    if mp_count and int(mp_count) > 0:
                        log.info("[" + name + "] ALERTE : " + str(mp_count) + " MP non lu(s)")
                        return True, "ALERTE [" + name + "] " + str("mp_url"), {"alert": True, "alert_kw": str("mp_url")}
            # Si pas de verify_url, retourner OK directement
            if not site.get("verify_url") and intercepted:
                success_keywords = site.get("success_keywords", [])
                if success_keywords:
                    msg = "OK [" + name + "] Connexion reussie (Playwright intercept, mot-cle : " + success_keywords[0] + ")"
                else:
                    msg = "OK [" + name + "] Connexion reussie (Playwright intercept)"
                log.info(msg)
                return True, msg, None

        # Fallback si intercepted vide et pas de verify_url
        if not intercepted and not site.get("verify_url") and intercept_urls:
            msg = "ECHEC [" + name + "] Interception API vide (Cloudflare ?)"
            log.warning(msg)
            return False, msg, None

        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        })
        for c in cookies:
            session.cookies.set(c["name"], c["value"], domain=c.get("domain", "").lstrip("."))

        verify_url = site.get("verify_url")
        if verify_url:
            rv = session.get(verify_url, timeout=site.get("timeout", 20))
        else:
            msg = "ECHEC [" + name + "] verify_url manquant (Playwright)"
            log.error(msg)
            return False, msg, None

        body_lower = rv.text.lower()

        site_stats = site.get("stats", {})
        if site_stats:
            stats = extract_stats(rv.text, site_stats)
            stats_str = format_stats(stats, site)
            log.info("[" + name + "] Stats -- " + stats_str)

        alert_keywords = site.get("alert_keywords", [])
        for kw in alert_keywords:
            if kw.lower() in body_lower:
                alert_label = site.get("alert_label", kw)
                log.info("[" + name + "] ALERTE : " + alert_label)
                return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}

        custom_keywords = site.get("success_keywords", [])
        if custom_keywords:
            matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
            if matched:
                msg = "OK [" + name + "] Connexion reussie (mot-cle : " + matched + ")"
                log.info(msg)
                return True, msg, None
            else:
                msg = "ECHEC [" + name + "] Mot-cle introuvable apres Playwright -- URL : " + rv.url
                log.warning(msg)
                return False, msg, None

        if any(w in body_lower for w in ["logout", "deconnexion", "mon compte", "my account", "bienvenue", "welcome", "sign out"]):
            msg = "OK [" + name + "] Connexion reussie (Playwright)"
            log.info(msg)
            return True, msg, None

        msg = "ECHEC [" + name + "] Connexion douteuse apres Playwright -- URL : " + rv.url
        log.warning(msg)
        return False, msg, None

    except Exception as e:
        msg = "ECHEC [" + name + "] Erreur Playwright : " + str(e)
        log.error(msg)
        return False, msg, None

def solve_cloudflare(solver_url, target_url, timeout=60):
    """Resout un challenge Cloudflare via FlareSolverr.
    Retourne (cookies, user_agent) ou (None, None) en cas d'echec.
    cookies = liste d'objets {name, value, domain, path} (format FlareSolverr).
    L'UA retourne DOIT etre reutilise dans la session : le cf_clearance y est lie."""
    try:
        r = requests.post(
            solver_url,
            json={
                "cmd": "request.get",
                "url": target_url,
                "maxTimeout": timeout * 1000,
            },
            timeout=timeout + 10,
        )
    except Exception as e:
        log.error("FlareSolverr injoignable (" + solver_url + ") : " + str(e))
        return None, None
    try:
        data = r.json()
    except Exception as e:
        log.error("FlareSolverr reponse illisible : " + str(e))
        return None, None
    if data.get("status") != "ok":
        log.error("FlareSolverr status != ok : " + str(data.get("message")))
        return None, None
    sol = data.get("solution", {})
    if sol.get("status") != 200:
        log.error("FlareSolverr HTTP cible " + str(sol.get("status")))
        return None, None
    cookies = sol.get("cookies", [])
    ua = sol.get("userAgent")
    if not cookies or not ua:
        log.error("FlareSolverr : cookies ou userAgent manquant")
        return None, None
    return cookies, ua

def check_alert_stat(stats, site, name):
    """Si la stat surveillee (alert_stat) est numerique et > 0, retourne le label
    d'alerte, sinon None. Gere cle absente, valeur '0', valeur formatee."""
    key = site.get("alert_stat")
    if not key or not stats:
        return None
    raw = stats.get(key)
    if raw is None:
        return None
    digits = re.sub(r"[^\d]", "", str(raw))
    if digits and int(digits) > 0:
        label = site.get("alert_label", key)
        log.info("[" + name + "] ALERTE : " + label)
        return label
    return None

def format_stats(stats, site):
    """Construit la ligne de stats affichable, en excluant la stat surveillee
    par alert_stat (compteur de MP : declencheur d'alerte, pas une vraie stat)."""
    skip = site.get("alert_stat")
    return " | ".join(k + ": " + v for k, v in stats.items() if k != skip)

def visit_site_session(site):
    """Visite un site en utilisant des cookies de session pre-existants (skip login)."""
    name = site["name"]
    timeout = site.get("timeout", 20)
    cookies_file = site.get("session_cookies_file")
    cf_solver = site.get("cf_solver")
    user_agent = site.get("user_agent")

    # cf_solver (FlareSolverr) rend session_cookies_file et user_agent optionnels :
    # le challenge Cloudflare est resolu a la volee, le cf_clearance et l'UA en sont issus.
    if not cookies_file and not cf_solver:
        msg = "ECHEC [" + name + "] session_cookies_file ou cf_solver requis"
        log.error(msg)
        return False, msg, None
    if not cf_solver and not user_agent and "User-Agent" not in site.get("extra_headers", {}):
        msg = "ECHEC [" + name + "] user_agent requis en mode session (les cookies cf_clearance y sont lies)"
        log.error(msg)
        return False, msg, None

    cookies_data = []
    if cookies_file:
        cookies_path = Path(cookies_file)
        if not cookies_path.exists():
            msg = "ECHEC [" + name + "] fichier cookies introuvable : " + cookies_file
            log.error(msg)
            return False, msg, None
        try:
            with open(cookies_path, encoding="utf-8") as f:
                cookies_data = json.load(f)
        except Exception as e:
            msg = "ECHEC [" + name + "] erreur lecture cookies : " + str(e)
            log.error(msg)
            return False, msg, None

    session = requests.Session()
    session.headers.update({
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    })
    if user_agent:
        session.headers["User-Agent"] = user_agent
    extra_headers = site.get("extra_headers", {})
    if extra_headers:
        session.headers.update(extra_headers)

    # Resolution du challenge Cloudflare via FlareSolverr (si configure)
    if cf_solver:
        target = site.get("url") or site.get("verify_url")
        log.info("[" + name + "] Resolution Cloudflare via FlareSolverr : " + cf_solver)
        cf_cookies, cf_ua = solve_cloudflare(cf_solver, target, timeout=site.get("cf_solver_timeout", 60))
        if not cf_cookies:
            msg = "ECHEC [" + name + "] FlareSolverr n'a pas resolu le challenge"
            log.error(msg)
            return False, msg, None
        # L'UA renvoye par FlareSolverr fait foi (le cf_clearance y est lie)
        session.headers["User-Agent"] = cf_ua
        log.info("[" + name + "] FlareSolverr OK -- UA force : " + cf_ua)
        # Les cookies FlareSolverr sont ajoutes a ceux du fichier (s'il y en a)
        cookies_data = list(cookies_data) + list(cf_cookies)

    # Chargement des cookies (format Cookie-Editor : liste d objets)
    for c in cookies_data:
        # Les cookies prefixe __Host- ne doivent pas avoir de domaine explicite
        if c["name"].startswith("__Host-"):
            session.cookies.set(c["name"], c["value"], path="/")
        else:
            session.cookies.set(
                c["name"],
                c["value"],
                domain=c.get("domain", "").lstrip("."),
                path=c.get("path", "/"),
            )

    source = cookies_file if cookies_file else "FlareSolverr"
    log.info("[" + name + "] " + str(len(cookies_data)) + " cookie(s) charge(s) depuis " + source)

    # Mode hybride : si post_url + username/password definis, faire le login derriere les cookies
    post_url = site.get("post_url")
    if post_url and site.get("username") and site.get("password"):
        login_url = site.get("url", post_url)
        try:
            r_login = session.get(login_url, timeout=timeout)
            if r_login.status_code != 200:
                msg = "ECHEC [" + name + "] GET login HTTP " + str(r_login.status_code)
                log.error(msg)
                return False, msg, None
            payload = {
                site["username_field"]: site["username"],
                site["password_field"]: site["password"],
            }
            # CSRF si configure
            csrf_field = site.get("csrf_field")
            csrf_token = extract_csrf(r_login.text, csrf_field)
            if csrf_token:
                field_key = csrf_field if csrf_field else "_token"
                payload[field_key] = csrf_token
                log.info("[" + name + "] Token CSRF detecte et inclus (" + field_key + ")")
            payload.update(site.get("extra_fields", {}))
            time.sleep(random.uniform(0.5, 1.5))
            r_post = session.post(post_url, data=payload, timeout=timeout, allow_redirects=True)
            log.info("[" + name + "] Login effectue (HTTP " + str(r_post.status_code) + ")")
        except Exception as e:
            msg = "ECHEC [" + name + "] erreur login hybride : " + str(e)
            log.error(msg)
            return False, msg, None

    verify_url = site.get("verify_url")
    if not verify_url:
        msg = "ECHEC [" + name + "] verify_url manquant (mode session)"
        log.error(msg)
        return False, msg, None

    try:
        rv = session.get(verify_url, timeout=timeout)
    except Exception as e:
        msg = "ECHEC [" + name + "] erreur GET verify_url : " + str(e)
        log.error(msg)
        return False, msg, None

    if detect_maintenance(rv.text, site.get("maintenance_keywords")):
        msg = "MAINTENANCE [" + name + "] Site en maintenance (detection automatique)"
        log.warning(msg)
        return False, msg, {"maintenance": True}

    body_lower = rv.text.lower()

    # Stats
    site_stats = site.get("stats", {})
    stats = {}
    if site_stats:
        stats = extract_stats(rv.text, site_stats)
    # Stats supplementaires via endpoint JSON (extra_url + extra_stats)
    extra_url = site.get("extra_url")
    extra_fields = site.get("extra_stats")
    if extra_url and extra_fields:
        extra = fetch_extra_stats(session, extra_url, extra_fields, name, timeout, site.get("extra_format", "json"))
        if extra:
            stats.update(extra)
    if stats:
        log.info("[" + name + "] Stats -- " + format_stats(stats, site))

    # Alertes MP via stat numerique surveillee (alert_stat)
    stat_label = check_alert_stat(stats, site, name)
    if stat_label:
        return True, "ALERTE [" + name + "] " + str(stat_label), {"alert": True, "alert_kw": str(stat_label)}

    # Alertes MP via mot-cle dans le HTML (alert_keywords)
    alert_keywords = site.get("alert_keywords", [])
    for kw in alert_keywords:
        if kw.lower() in body_lower:
            alert_label = site.get("alert_label", kw)
            log.info("[" + name + "] ALERTE : " + alert_label)
            return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}

    # Verification succes
    custom_keywords = site.get("success_keywords", [])
    if custom_keywords:
        matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
        if matched:
            msg = "OK [" + name + "] Connexion reussie via session (mot-cle : " + matched + ")"
            log.info(msg)
            return True, msg, None
        else:
            msg = "ECHEC [" + name + "] Mot-cle introuvable -- cookies expires ? URL : " + rv.url
            log.warning(msg)
            return False, msg, None

    msg = "OK [" + name + "] Connexion reussie via session"
    log.info(msg)
    return True, msg, None

def visit_site(site):
    name = site["name"]
    timeout = site.get("timeout", 20)
    use_curl = site.get("use_curl_cffi", False)

    if use_curl:
        if not CURL_CFFI_AVAILABLE:
            msg = "ECHEC [" + name + "] curl_cffi non installe"
            log.error(msg)
            return False, msg, None
        session = curl_requests.Session(impersonate="firefox")
    else:
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        })

    extra_headers = site.get("extra_headers", {})
    if extra_headers:
        session.headers.update(extra_headers)

    try:
        get_headers = {"Accept-Encoding": "identity"} if use_curl else {}

        # GET preliminaires optionnels (initialisation de session, cookies d'API, etc.)
        # Doivent etre executes AVANT le GET de la page de login.
        for pre_url in site.get("pre_visit_urls", []):
            try:
                session.get(pre_url, timeout=timeout, headers=get_headers)
                log.info("[" + name + "] GET preliminaire : " + pre_url)
                time.sleep(random.uniform(0.3, 0.8))
            except:
                pass

        log.info("[" + name + "] Chargement de la page de login : " + site["url"])
        r = session.get(site["url"], timeout=timeout, headers=get_headers)
        if detect_maintenance(r.text, site.get("maintenance_keywords")):
            msg = "MAINTENANCE [" + name + "] Site en maintenance (detection automatique)"
            log.warning(msg)
            return False, msg, {"maintenance": True}
        if r.status_code != 200:
            msg = "ECHEC [" + name + "] Page de login inaccessible (HTTP " + str(r.status_code) + ")"
            log.error(msg)
            return False, msg, None

        time.sleep(random.uniform(1.5, 3.0))


        csrf_field = site.get("csrf_field")
        csrf_token = extract_csrf(r.text, csrf_field)

        payload = {
            site["username_field"]: site["username"],
            site["password_field"]: site["password"],
        }

        if site.get("extract_hidden_fields"):
            hidden = extract_hidden_fields(r.text, exclude=["_token", site.get("csrf_field", "")])
            payload.update(hidden)
            log.info("[" + name + "] Champs hidden extraits : " + ", ".join(hidden.keys()))


        if csrf_token and not site.get("api_json"):
            field_key = csrf_field if csrf_field else "_token"
            payload[field_key] = csrf_token
            log.info("[" + name + "] Token CSRF detecte et inclus (" + field_key + ")")

        totp_secret = site.get("totp_secret")
        totp_url = site.get("totp_url")

        if totp_secret and not totp_url:
            if not PYOTP_AVAILABLE:
                log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                return False, "ECHEC [" + name + "] pyotp manquant", None
            totp_code = pyotp.TOTP(totp_secret).now()
            totp_field = site.get("totp_field", "mfa")
            payload[totp_field] = totp_code
            log.info("[" + name + "] Code TOTP genere : " + totp_code)

        extra_fields = site.get("extra_fields", {})
        payload.update(extra_fields)

        post_url = site.get("post_url", site["url"])
        log.info("[" + name + "] Envoi des identifiants")
        time.sleep(random.uniform(0.5, 1.5))

        if site.get("api_json"):
            post_headers = {"Content-Type": "application/json"}
            if use_curl:
                post_headers["Accept-Encoding"] = "identity"
            if csrf_token:
                post_headers["csrf-token"] = csrf_token
                log.info("[" + name + "] Header csrf-token inclus")
            if not use_curl:
                origin = "https://" + site["url"].split("/")[2]
                post_headers["Origin"] = origin
                post_headers["Referer"] = site["url"]
            r2 = session.post(post_url, json=payload, headers=post_headers, timeout=timeout, allow_redirects=False)
        else:
            r2 = session.post(post_url, data=payload, timeout=timeout, allow_redirects=True)

        if site.get("api_json") and r2.status_code in [200, 201]:
            try:
                data = r2.json()

                # Flux MFA JSON (ex: C411)
                if data.get("mfaRequired"):
                    if not totp_url or not totp_secret:
                        msg = "ECHEC [" + name + "] MFA requis mais totp_url/totp_secret absent dans la config"
                        log.error(msg)
                        return False, msg, None
                    if not PYOTP_AVAILABLE:
                        log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                        return False, "ECHEC [" + name + "] pyotp manquant", None
                    totp_code = pyotp.TOTP(totp_secret).now()
                    log.info("[" + name + "] MFA requis (API JSON), envoi du code TOTP : " + totp_code)
                    time.sleep(random.uniform(0.5, 1.0))
                    totp_headers = {"Content-Type": "application/json", "csrf-token": csrf_token}
                    if use_curl:
                        totp_headers["Accept-Encoding"] = "identity"
                        totp_headers["Origin"] = "https://" + site["url"].split("/")[2]
                        totp_headers["Referer"] = site["url"]
                    r3 = session.post(totp_url, json={"code": totp_code}, headers=totp_headers, timeout=timeout, allow_redirects=False)
                    try:
                        data3 = r3.json()
                        if data3.get("success"):
                            custom_keywords = site.get("success_keywords", [])
                            verify_url = site.get("verify_url")
                            if custom_keywords and verify_url:
                                rv = session.get(verify_url, timeout=timeout, headers={"Accept-Encoding": "identity"} if use_curl else {})
                                # Alertes MP
                                alert_keywords = site.get("alert_keywords", [])
                                if alert_keywords:
                                    for kw in alert_keywords:
                                        if kw.lower() in rv.text.lower():
                                            alert_label = site.get("alert_label", kw)
                                            log.info("[" + name + "] ALERTE : " + alert_label)
                                            return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}
                                # Stats
                                site_stats = site.get("stats", {})
                                stats = {}
                                if site_stats:
                                    stats = extract_stats(rv.text, site_stats)
                                # Stats supplementaires via endpoint JSON (extra_url + extra_stats)
                                extra_url = site.get("extra_url")
                                extra_fields = site.get("extra_stats")
                                if extra_url and extra_fields:
                                    extra = fetch_extra_stats(session, extra_url, extra_fields, name, timeout, site.get("extra_format", "json"))
                                    if extra:
                                        stats.update(extra)
                                if stats:
                                    log.info("[" + name + "] Stats -- " + format_stats(stats, site))
                                matched = next((kw for kw in custom_keywords if kw.lower() in rv.text.lower()), None)
                                if matched:
                                    msg = "OK [" + name + "] Connexion reussie apres MFA JSON (mot-cle : " + matched + ")"
                                    log.info(msg)
                                    return True, msg, None
                                else:
                                    msg = "ECHEC [" + name + "] MFA JSON ok mais mot-cle introuvable sur " + verify_url
                                    log.warning(msg)
                                    return False, msg, None
                            msg = "OK [" + name + "] Connexion reussie apres MFA JSON"
                            log.info(msg)
                            return True, msg, None
                    except:
                        pass
                    msg = "ECHEC [" + name + "] Echec apres MFA JSON -- HTTP " + str(r3.status_code)
                    log.warning(msg)
                    return False, msg, None

                success_json_field = site.get("success_json_field")
                if success_json_field:
                    if data.get(success_json_field):
                        # Detection MP / extraction stats : depuis verify_url si declare,
                        # sinon directement depuis le body JSON de la reponse de login.
                        verify_url = site.get("verify_url")
                        jwt_token = data.get("token") or data.get("access_token")
                        if jwt_token:
                            auth_headers = {"Authorization": "Bearer " + jwt_token}
                        else:
                            auth_headers = {}
                        auth_headers["Accept"] = "application/json"
                        auth_headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
                        rv = None
                        if verify_url:
                            if use_curl and site.get("stats_json"):
                                import requests as _req
                                _s = _req.Session()
                                _s.cookies.update(dict(session.cookies))
                                _headers = {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
                                    "Accept": "application/json",
                                }
                                if jwt_token:
                                    _headers["Authorization"] = "Bearer " + jwt_token
                                _s.headers.update(_headers)
                                rv = _s.get(verify_url, timeout=timeout)
                            else:
                                rv = session.get(verify_url, headers=auth_headers, timeout=timeout)
                        # Sources unifiees : si pas de verify_url, on retombe sur le body de login.
                        html_source = rv.text if rv is not None else json.dumps(data)
                        try:
                            json_source = rv.json() if rv is not None else data
                        except Exception:
                            json_source = data
                        stats = {}
                        # Stats JSON
                        stats_json = site.get("stats_json", {})
                        if stats_json:
                            try:
                                stats = extract_stats_json(json_source, stats_json)
                            except Exception as e:
                                log.warning("[" + name + "] Erreur parsing stats JSON : " + str(e))
                        # Stats HTML
                        site_stats = site.get("stats", {})
                        if site_stats:
                            stats.update(extract_stats(html_source, site_stats))
                        # Stats supplementaires via endpoint JSON (extra_url + extra_stats)
                        extra_url = site.get("extra_url")
                        extra_fields = site.get("extra_stats")
                        if extra_url and extra_fields:
                            extra = fetch_extra_stats(session, extra_url, extra_fields, name, timeout, site.get("extra_format", "json"))
                            if extra:
                                stats.update(extra)
                        if stats:
                            log.info("[" + name + "] Stats -- " + format_stats(stats, site))
                        # Alertes MP via stat numerique surveillee (alert_stat)
                        stat_label = check_alert_stat(stats, site, name)
                        if stat_label:
                            return True, "ALERTE [" + name + "] " + str(stat_label), {"alert": True, "alert_kw": str(stat_label)}
                        # Alertes MP via mp_url
                        mp_url = site.get("mp_url")
                        mp_json_field = site.get("mp_json_field", "total")
                        if mp_url:
                            try:
                                rmp = session.get(mp_url, headers=auth_headers, timeout=timeout)
                                mp_data = rmp.json()
                                mp_count = get_json_path(mp_data, mp_json_field, 0)
                                if mp_count and int(mp_count) > 0:
                                    log.info("[" + name + "] ALERTE : " + str(mp_count) + " MP non lu(s)")
                                    return True, "ALERTE [" + name + "] " + str("mp_url"), {"alert": True, "alert_kw": str("mp_url")}
                            except Exception as e:
                                log.warning("[" + name + "] Erreur mp_url : " + str(e))
                        # Alertes MP via mot-cle dans le HTML (alert_keywords)
                        alert_keywords = site.get("alert_keywords", [])
                        for kw in alert_keywords:
                            if kw.lower() in html_source.lower():
                                alert_label = site.get("alert_label", kw)
                                log.info("[" + name + "] ALERTE : " + alert_label)
                                return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}
                        msg = "OK [" + name + "] Connexion reussie (champ JSON : " + success_json_field + ")"
                        log.info(msg)
                        return True, msg, None
                    else:
                        msg = "ECHEC [" + name + "] Champ JSON manquant : " + success_json_field
                        log.warning(msg)
                        return False, msg, None

                if data.get("token") or data.get("access_token") or data.get("user") or data.get("success"):
                    msg = "OK [" + name + "] Connexion reussie (API JSON)"
                    log.info(msg)
                    return True, msg, None

                msg = "ECHEC [" + name + "] Reponse API JSON inattendue : " + r2.text[:200]
                log.warning(msg)
                return False, msg, None

            except Exception as e:
                msg = "ECHEC [" + name + "] Erreur parsing JSON : " + str(e)
                log.error(msg)
                return False, msg, None

        if totp_secret and totp_url and totp_url.split("?")[0] in r2.url:
            if not PYOTP_AVAILABLE:
                log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                return False, "ECHEC [" + name + "] pyotp manquant", None
            log.info("[" + name + "] Page 2FA detectee, envoi du code TOTP")
            # Le formulaire 2FA est dans la reponse au POST initial (r2.text),
            # pas dans un GET ulterieur de la meme URL (qui re-affiche la page de login vierge).
            r2fa = r2
            totp_code = pyotp.TOTP(totp_secret).now()
            totp_field = site.get("totp_field", "code")
            totp_payload = {totp_field: totp_code}
            csrf_field2 = site.get("csrf_field")
            csrf_token2 = extract_csrf(r2fa.text, csrf_field2)
            if csrf_token2:
                field_key2 = csrf_field2 if csrf_field2 else "_token"
                totp_payload[field_key2] = csrf_token2
                log.info("[" + name + "] Token CSRF 2FA inclus (" + field_key2 + ")")
            # Champs hidden supplementaires sur la page 2FA (toujours extrait)
            hidden2 = extract_hidden_fields(r2fa.text, exclude=[csrf_field2 or "_token"])
            totp_payload.update(hidden2)
            if hidden2:
                log.info("[" + name + "] Champs hidden 2FA extraits : " + ", ".join(hidden2.keys()))
            time.sleep(random.uniform(0.5, 1.0))
            # Extraction de l'action du formulaire 2FA (les sites Gazelle postent souvent
            # sur une URL distincte de la page d'affichage, ex: login.php?act=otp).
            otp_post_url = r2.url
            m_action = re.search(r'<form[^>]*id="loginform"[^>]*action="([^"]+)"', r2fa.text)
            if not m_action:
                m_action = re.search(r'<form[^>]*action="([^"]+)"[^>]*id="loginform"', r2fa.text)
            if m_action:
                action = m_action.group(1)
                if action.startswith("http"):
                    otp_post_url = action
                else:
                    base = r2.url.rsplit("/", 1)[0]
                    otp_post_url = base + "/" + action.lstrip("/")
                log.info("[" + name + "] POST 2FA cible : " + otp_post_url)
            r3 = session.post(otp_post_url, data=totp_payload, timeout=timeout, allow_redirects=True)
            # GET verify_url post-2FA pour recuperer la page contenant la top-bar (stats)
            verify_url = site.get("verify_url")
            if verify_url:
                r3 = session.get(verify_url, timeout=timeout)
            body_lower = r3.text.lower()

            custom_keywords = site.get("success_keywords", [])
            if custom_keywords:
                matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
                if matched:
                    # Stats (extraites avant les alertes pour etre historisees meme en cas de MP)
                    site_stats = site.get("stats", {})
                    stats = {}
                    if site_stats:
                        stats = extract_stats(r3.text, site_stats)
                    # Stats supplementaires via endpoint JSON (extra_url + extra_stats)
                    extra_url = site.get("extra_url")
                    extra_fields = site.get("extra_stats")
                    if extra_url and extra_fields:
                        extra = fetch_extra_stats(session, extra_url, extra_fields, name, timeout, site.get("extra_format", "json"))
                        if extra:
                            stats.update(extra)
                    if stats:
                        log.info("[" + name + "] Stats -- " + format_stats(stats, site))
                    # Alertes MP via stat numerique surveillee (alert_stat)
                    stat_label = check_alert_stat(stats, site, name)
                    if stat_label:
                        return True, "ALERTE [" + name + "] " + str(stat_label), {"alert": True, "alert_kw": str(stat_label)}
                    # Alertes MP via mot-cle dans le HTML (alert_keywords)
                    alert_keywords = site.get("alert_keywords", [])
                    for kw in alert_keywords:
                        if kw.lower() in body_lower:
                            alert_label = site.get("alert_label", kw)
                            log.info("[" + name + "] ALERTE : " + alert_label)
                            return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}
                    msg = "OK [" + name + "] Connexion reussie apres 2FA (mot-cle : " + matched + ")"
                    log.info(msg)
                    return True, msg, None
                else:
                    msg = "ECHEC [" + name + "] Mot-cle introuvable apres 2FA -- URL : " + r3.url
                    log.warning(msg)
                    return False, msg, None

            if any(w in body_lower for w in ["logout", "deconnexion", "mon compte", "my account", "bienvenue", "welcome", "sign out"]):
                msg = "OK [" + name + "] Connexion reussie apres 2FA"
                log.info(msg)
                return True, msg, None
            success_kw = site.get("success_url_contains", "")
            if success_kw and success_kw.lower() in r3.url.lower():
                msg = "OK [" + name + "] Connexion reussie apres 2FA -> " + r3.url
                log.info(msg)
                return True, msg, None
            msg = "ECHEC [" + name + "] Echec apres 2FA -- URL : " + r3.url
            log.warning(msg)
            return False, msg, None

        # GET de vérification optionnel (ex: login AJAX qui retourne body vide)
        verify_url = site.get("verify_url")
        if verify_url:
            r2 = session.get(verify_url, timeout=timeout)

        body_lower = r2.text.lower()

        # Stats
        site_stats = site.get("stats", {})
        stats = {}
        if site_stats:
            stats = extract_stats(r2.text, site_stats)
        # Stats supplementaires via endpoint JSON (extra_url + extra_stats)
        extra_url = site.get("extra_url")
        extra_fields = site.get("extra_stats")
        if extra_url and extra_fields:
            extra = fetch_extra_stats(session, extra_url, extra_fields, name, timeout, site.get("extra_format", "json"))
            if extra:
                stats.update(extra)
        if stats:
            log.info("[" + name + "] Stats -- " + format_stats(stats, site))
        # Alertes MP via stat numerique surveillee (alert_stat)
        stat_label = check_alert_stat(stats, site, name)
        if stat_label:
            return True, "ALERTE [" + name + "] " + str(stat_label), {"alert": True, "alert_kw": str(stat_label)}
        # Alertes MP via mot-cle dans le HTML (alert_keywords)
        alert_keywords = site.get("alert_keywords", [])
        if alert_keywords:
            for kw in alert_keywords:
                if kw.lower() in body_lower:
                    alert_label = site.get("alert_label", kw)
                    log.info("[" + name + "] ALERTE : " + alert_label)
                    return True, "ALERTE [" + name + "] " + str(kw), {"alert": True, "alert_kw": str(kw)}

        custom_keywords = site.get("success_keywords", [])
        if custom_keywords:
            matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
            if matched:
                msg = "OK [" + name + "] Connexion reussie (mot-cle : " + matched + ")"
                log.info(msg)
                return True, msg, None
            else:
                msg = "ECHEC [" + name + "] Mot-cle introuvable dans la page -- URL : " + r2.url
                log.warning(msg)
                return False, msg, None

        success_kw = site.get("success_url_contains", "")
        if success_kw and success_kw.lower() in r2.url.lower():
            msg = "OK [" + name + "] Connexion reussie -> " + r2.url
            log.info(msg)
            return True, msg, None

        if any(w in body_lower for w in ["logout", "deconnexion", "mon compte", "my account", "bienvenue", "welcome", "sign out"]):
            msg = "OK [" + name + "] Connexion reussie (detectee dans la page)"
            log.info(msg)
            return True, msg, None

        if any(w in body_lower for w in ["invalid", "incorrect", "wrong", "error", "invalide"]):
            msg = "ECHEC [" + name + "] Identifiants refuses"
            log.warning(msg)
            return False, msg, None

        msg = "ECHEC [" + name + "] Connexion douteuse -- URL : " + r2.url + " HTTP " + str(r2.status_code)
        log.warning(msg)
        return False, msg, None

    except requests.exceptions.Timeout:
        msg = "ECHEC [" + name + "] Timeout"
        log.error(msg)
        return False, msg, None
    except Exception as e:
        msg = "ECHEC [" + name + "] Erreur : " + str(e)
        log.error(msg)
        return False, msg, None

def list_sites(cfg):
    sites = cfg.get("sites", [])
    if not sites:
        print("Aucun site configure.")
        return

    def trunc(url, n=28):
        domain = url.split("/")[2] if "//" in url else url
        return domain[:n] + "…" if len(domain) > n else domain

    def get_2fa_type(s):
        if s.get("api_json") and s.get("totp_url"):
            return "api_json"
        if s.get("totp_url"):
            return "page"
        if s.get("totp_secret"):
            return "inline"
        return "-"

    def get_path(s):
        """Chemin de visite emprunte par le site."""
        if s.get("use_playwright"):
            return "playwright"
        if s.get("session_cookies_file") or s.get("cf_solver"):
            return "session"
        return "visit"

    def get_mp_type(s):
        """Mecanisme de detection des MP non lus."""
        if s.get("mp_url"):
            return "api"
        if s.get("alert_stat"):
            return "stat"
        if s.get("alert_keywords"):
            return "kw"
        return "-"

    def fmt_last_ok(iso_str):
        """Format court : MM-DD HH:MM, ou - si pas de visite OK."""
        if not iso_str:
            return "-"
        # Tolere ISO avec T ou espace
        s = iso_str.replace("T", " ")
        # On garde MM-DD HH:MM
        try:
            return s[5:16]
        except Exception:
            return iso_str[:11]

    COL = [
        ("Nom",        20),
        ("Actif",       5),
        ("URL",        30),
        ("Chemin",     10),
        ("TOTP",        4),
        ("2FA",         8),
        ("Stats",       5),
        ("MP",          4),
        ("CF",          2),
        ("Dernier OK", 11),
    ]

    sep = "─" * (sum(w for _, w in COL) + len(COL) * 2)
    header = "  ".join(n.ljust(w) for n, w in COL)
    print(header)
    print(sep)

    for s in sites:
        actif  = "✓" if s.get("enabled", True) else "✗"
        totp   = "✓" if s.get("totp_secret") else "-"
        two_fa = get_2fa_type(s)
        stats  = "✓" if s.get("stats") or s.get("stats_json") else "-"
        mp     = get_mp_type(s)
        path   = get_path(s)
        cf     = "✓" if s.get("cf_solver") else "-"
        lastok = fmt_last_ok(last_ok_date(s["name"]))

        row = [
            s["name"][:COL[0][1]],
            actif,
            trunc(s.get("url", ""), COL[2][1]),
            path,
            totp,
            two_fa,
            stats,
            mp,
            cf,
            lastok,
        ]
        print("  ".join(str(v).ljust(w) for v, (_, w) in zip(row, COL)))

def main():
    args  = parse_args()
    cfg   = load_config()
    if getattr(args, "history_purge", None) is not None:
        if args.history_purge <= 0:
            print("Erreur : le nombre de jours doit etre positif.")
            sys.exit(1)
        import sqlite3
        cutoff = (datetime.now() - timedelta(days=args.history_purge)).strftime("%Y-%m-%d %H:%M:%S")
        conn = sqlite3.connect(HISTORY_DB)
        n = conn.execute("SELECT COUNT(*) FROM stat_snapshots WHERE captured_at < ?", (cutoff,)).fetchone()[0]
        conn.close()
        if n == 0:
            print("Aucun snapshot anterieur a " + str(args.history_purge) + " jours.")
            sys.exit(0)
        reponse = input("Supprimer " + str(n) + " snapshot(s) anterieur(s) a " + str(args.history_purge) + " jours ? [oui/non] ")
        if reponse.strip().lower() not in ("oui", "o", "yes", "y"):
            print("Annule.")
            sys.exit(0)
        deleted = purge_old_history(args.history_purge)
        print(str(deleted) + " snapshot(s) supprime(s).")
        sys.exit(0)
    if getattr(args, "history_show", None):
        canonical = find_site_by_name(args.history_show, cfg)
        if canonical is None:
            print("Site introuvable : " + args.history_show)
            sys.exit(1)
        show_history(canonical, last=args.last, raw=args.raw)
        sys.exit(0)
    if args.stats:
        for handler in logging.root.handlers:
            if isinstance(handler, logging.StreamHandler) and handler.stream == sys.stdout:
                handler.addFilter(lambda r: "Stats --" in r.getMessage())
    if args.list:
        list_sites(cfg)
        sys.exit(0)
    sites = [s for s in cfg.get("sites", []) if s.get("enabled", True)]
    if args.stats:
        sites = [s for s in sites if s.get("stats") or s.get("stats_json")]
        if not sites:
            log.warning("Aucun site avec stats configure.")
            return
    if args.site:
        resolved = {}
        unresolved = []
        for arg in args.site:
            canonical = find_site_by_name(arg, cfg)
            if canonical is None:
                unresolved.append(arg)
            else:
                resolved[canonical] = True
        if unresolved:
            log.error("Sites introuvables : " + ", ".join(unresolved))
            sys.exit(1)
        sites = [s for s in sites if s["name"] in resolved]
        if not sites:
            log.error("Aucun site actif correspondant a : " + ", ".join(args.site))
            sys.exit(1)
    if not sites:
        log.warning("Aucun site actif trouve dans la config.")
        return
    log.info("=== Demarrage -- " + str(len(sites)) + " site(s) a visiter ===")
    init_history_db()
    ret = cfg.get("retention", {})
    n_hist = purge_old_history(ret.get("history_days", 0))
    n_logs = purge_old_logs(ret.get("logs_days", 0))
    if n_hist or n_logs:
        log.info("Purge automatique : " + str(n_hist) + " snapshot(s), " + str(n_logs) + " log(s)")
    results_ok  = []
    results_err = []
    results_maintenance = []
    # Collecte pour status.json
    status_sites = []
    # Handler de capture des logs pour extraire stats/alertes par site
    captured_logs = []
    class CaptureHandler(logging.Handler):
        def emit(self, record):
            captured_logs.append(record.getMessage())
    capture_handler = CaptureHandler()
    log.addHandler(capture_handler)

    queue = deque(sites)
    attempts = {s["name"]: 0 for s in sites}

    while queue:
        site = queue.popleft()
        name = site["name"]
        attempts[name] += 1
        attempt = attempts[name]
        captured_logs.clear()
        site_url = site.get("url") or site.get("verify_url", "")
        site_domain = site_url.split("/")[2] if "//" in site_url else site_url
        if site.get("session_cookies_file") or site.get("cf_solver"):
            ok, msg, extras = visit_site_session(site)
        elif site.get("use_playwright"):
            ok, msg, extras = visit_site_playwright(site)
        else:
            ok, msg, extras = visit_site(site)
        # Gestion des nouvelles tentatives sur erreur reseau transitoire
        if not ok and is_retryable_error(msg) and attempt < 3:
            if attempt == 1:
                log.warning("[" + name + "] Erreur transitoire (tentative 1/3), remise en fin de file")
                queue.append(site)
                continue
            else:
                log.warning("[" + name + "] Erreur transitoire (tentative 2/3), attente 10s avant tentative 3/3")
                time.sleep(10)
                queue.appendleft(site)
                continue
        # Extraire stats et alerte depuis les logs captures
        site_stats_str = None
        site_alert = None
        for line in captured_logs:
            if "Stats --" in line:
                site_stats_str = line.split("Stats -- ", 1)[1] if "Stats -- " in line else None
            if "ALERTE :" in line:
                site_alert = line.split("ALERTE : ", 1)[1] if "ALERTE : " in line else "MP non lu"
        if ok and extras and extras.get("alert"):
            site_name = site["name"]
            alerte_msg = "MP non lu sur " + site_name
            log.info("[" + site_name + "] " + alerte_msg)
            results_ok.append("OK [" + site_name + "] " + alerte_msg)
            site_alert = "MP non lu"
            status_sites.append({"name": site_name, "url": site_domain, "ok": True, "stats": site_stats_str, "alert": site_alert})
        elif not ok and extras and extras.get("maintenance"):
            results_maintenance.append(msg)
            status_sites.append({"name": site["name"], "url": site_domain, "ok": None, "stats": site_stats_str, "alert": site_alert, "maintenance": True})
        else:
            (results_ok if ok else results_err).append(msg)
            status_sites.append({"name": site["name"], "url": site_domain, "ok": ok, "stats": site_stats_str, "alert": site_alert})
        # Historisation SQLite
        if extras and extras.get("maintenance"):
            snap_status = "maintenance"
        else:
            snap_status = "ok" if ok else "error"
        snap_error = None if ok else msg
        write_snapshot(site["name"], snap_status, snap_error, site_alert, parse_stats_str(site_stats_str))
    log.removeHandler(capture_handler)
    log.info("=== Resume ===")
    for m in results_ok + results_maintenance + results_err:
        log.info(m)
    # Categorisation pour notifications
    ko_sites = [e for e in status_sites if e.get("ok") is False]
    mp_sites = [e for e in status_sites if e.get("ok") is True and e.get("alert")]
    ok_sites = [e for e in status_sites if e.get("ok") is True and not e.get("alert")]
    maintenance_sites = [e for e in status_sites if e.get("maintenance")]
    n_total = len(status_sites)
    n_ok    = len(ok_sites) + len(mp_sites)
    n_ko    = len(ko_sites)
    n_mp    = len(mp_sites)
    today   = datetime.now().strftime("%Y-%m-%d")

    if results_err:
        log.info("Autovisit : " + str(n_ko) + " echec(s)")
    else:
        log.info("Tous les sites ont ete visites avec succes")

    # Routage notifications (rien en --silent)
    if not args.silent:
        # Mail recap complet uniquement en --verbose
        if args.verbose:
            mail_subject = "Autovisit " + today + " : " + str(n_ok) + " OK / " + str(n_ko) + " KO / " + str(n_mp) + " MP"
            mail_body = "Sites visites : " + str(n_total) + "\n\n"
            if mp_sites:
                mail_body += "Sites OK avec MP non lus (" + str(n_mp) + ") :\n"
                for e in mp_sites:
                    mail_body += "- " + e["name"] + "\n"
                mail_body += "\n"
            if ok_sites:
                mail_body += "Sites OK sans alerte (" + str(len(ok_sites)) + ") :\n"
                for e in ok_sites:
                    mail_body += "- " + e["name"] + "\n"
                mail_body += "\n"
            if maintenance_sites:
                mail_body += "Sites en maintenance detectee (" + str(len(maintenance_sites)) + ") :\n"
                for e in maintenance_sites:
                    mail_body += "- " + e["name"] + "\n"
                mail_body += "\n"
            if ko_sites:
                err_by_name = {}
                for m in results_err:
                    mm = re.match(r"ECHEC \[([^\]]+)\] (.*)", m, re.DOTALL)
                    if mm:
                        err_by_name[mm.group(1)] = mm.group(2)
                mail_body += "Sites KO (" + str(n_ko) + ") :\n"
                for e in ko_sites:
                    err_msg = err_by_name.get(e["name"], "Erreur inconnue")
                    err_short = err_msg.split("\n")[0][:200]
                    mail_body += "- " + e["name"] + " : " + err_short + "\n"
            send_mail(cfg, mail_subject, mail_body)
        # ntfy : toujours si KO ou MP (sauf --silent) -- la maintenance ne declenche pas
        # de notification a elle seule, mais s'ajoute au corps si un envoi a deja lieu
        if ko_sites or mp_sites:
            ntfy_title = "Autovisit " + today
            parts = []
            if ko_sites:
                parts.append("KO: " + ", ".join(e["name"] for e in ko_sites))
            if mp_sites:
                parts.append("MP: " + ", ".join(e["name"] for e in mp_sites))
            if maintenance_sites:
                parts.append("MAINT: " + ", ".join(e["name"] for e in maintenance_sites))
            ntfy_body = " | ".join(parts)
            send_ntfy(cfg, ntfy_title, ntfy_body)
    # Ecriture status.json
    if args.json_output:
        import json as _json
        # Inclure aussi les sites desactives (enabled: false)
        for s in cfg.get("sites", []):
            if not s.get("enabled", True):
                site_url = s.get("url") or s.get("verify_url", "")
                site_domain = site_url.split("/")[2] if "//" in site_url else site_url
                status_sites.append({
                    "name": s["name"],
                    "url": site_domain,
                    "ok": None,
                    "stats": None,
                    "alert": None,
                    "disabled": True
                })
        # Injecter la date de derniere connexion reussie (depuis l'historique)
        for entry in status_sites:
            entry["last_ok"] = last_ok_date(entry["name"])
        status = {
            "updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sites": status_sites
        }
        status_path = DATA_DIR / "status.json"
        with open(status_path, "w", encoding="utf-8") as f:
            _json.dump(status, f, ensure_ascii=False, indent=2)
        log.info("status.json ecrit : " + str(status_path))

if __name__ == "__main__":
    main()
