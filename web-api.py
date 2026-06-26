#!/usr/bin/env python3
"""
web-api.py v5 — service d'aide pour tracker-autovisit (127.0.0.1:8099, exposé via Nginx, LAN).
Flux "tester puis confirmer" : un test écrit le fichier (avec sauvegarde) mais ne l'affiche pas ;
seul /confirm le valide (régénère status.json). /cancel nettoie (rien enregistré).

  GET  /sites              liste détaillée
  GET  /site?slug=xxx      un site (mot de passe masqué)
  GET  /settings           réglages dashboard (nom, url, accent, dark, cron, favicon)
  POST /test    {site, original_slug?}          -> écrit (backup si existant), teste
  POST /confirm {slug, original_slug?}          -> valide (renomme si besoin) + régénère
  POST /cancel  {slug, original_slug?, created} -> supprime (si créé) ou restaure le backup
  POST /delete  {slug}                          -> supprime + régénère
  POST /toggle  {slug}                          -> bascule enabled + régénère
  POST /settings {name,url,accent,dark,cron_hours} -> écrit settings.json (+ maj cron)
  POST /favicon  {data}                         -> écrit favicon.png (+ .ico si Pillow)
"""
import base64, json, os, re, shutil, subprocess, sys, threading, glob, io
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = "/opt/tracker-autovisit"
SITES_DIR = os.path.join(BASE, "data", "sites.d")
BAK_DIR = os.path.join(BASE, "data", ".sitebak")
STATUS = os.path.join(BASE, "data", "status.json")
SCRIPT = os.path.join(BASE, "autovisit.py")
HOST, PORT = "127.0.0.1", 8099
REQUIRED = ("name", "url", "post_url", "username")

WEBROOT = "/var/www/autovisit"
ICONDIR = os.path.join(WEBROOT, "icones")
LOGODIR = os.path.join(WEBROOT, ".logos")
SETTINGS = os.path.join(BASE, "data", "settings.json")
LOGFILE = os.path.join(BASE, "data", "logs", "cron.log")
DEFAULTS = {"name": "Autovisit", "url": "", "accent": "#e0892b",
            "dark": False, "cron_hours": 24, "favicon": False, "css": ""}

AUTH = os.path.join(BASE, "data", "auth.json")
COOKIE = "av_session"
TTL_REMEMBER = 30 * 24 * 3600   # « se souvenir » : 30 jours
TTL_SESSION = 12 * 3600         # sinon : 12 h (et cookie de session)
PENDING_2FA = {}   # token -> secret en cours d'activation

# --- Auth desactivee (phase 1-3 du portage Fork Worm's). Repasser a True
#     pour reactiver login + 2FA TOTP en phase 4. Tant que ce flag est False,
#     is_configured() et valid_session() renvoient True, les routes /auth/*
#     restent exposees mais inertes.
AUTH_ENABLED = False


# --- Throttle anti brute-force du login (en mémoire, global, remis à zéro au
#     redémarrage). Clé globale plutôt que par IP : derrière nginx/Docker toutes
#     les requêtes semblent venir du proxy, une clé IP serait inutile. ---
_login_fails = []                 # horodatages des échecs récents
_login_lock = threading.Lock()
_LOGIN_MAX = 5                    # nb d'échecs tolérés dans la fenêtre
_LOGIN_WINDOW = 300              # fenêtre glissante (s)


def _login_locked():
    import time
    now = time.time()
    with _login_lock:
        while _login_fails and _login_fails[0] < now - _LOGIN_WINDOW:
            _login_fails.pop(0)
        return len(_login_fails) >= _LOGIN_MAX


def _login_fail():
    import time
    with _login_lock:
        _login_fails.append(time.time())


def _login_reset():
    with _login_lock:
        _login_fails.clear()


def load_auth():
    try:
        return json.load(open(AUTH, encoding="utf-8"))
    except Exception:
        return {}


def save_auth(a):
    fd = os.open(AUTH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(a, f)


def is_configured():
    if not AUTH_ENABLED:
        return True
    return bool(load_auth().get("pwd_hash"))


def _hash(pw, salt):
    import hashlib
    return hashlib.pbkdf2_hmac("sha256", (pw or "").encode(), bytes.fromhex(salt), 120000).hex()


def set_password(new):
    import secrets
    a = load_auth()
    salt = secrets.token_hex(16)
    a["pwd_salt"] = salt
    a["pwd_hash"] = _hash(new, salt)
    # Rotation du secret de signature à chaque (re)définition du mot de passe :
    # invalide toutes les sessions existantes (les anciens cookies ne valident plus).
    a["server_secret"] = secrets.token_hex(32)
    save_auth(a)


def check_password(pw):
    import hmac
    a = load_auth()
    if not a.get("pwd_hash"):
        return False
    return hmac.compare_digest(_hash(pw, a.get("pwd_salt", "")), a["pwd_hash"])


def check_totp(code):
    a = load_auth()
    sec = a.get("totp_secret")
    if not (a.get("twofa") and sec):
        return True  # 2FA non activé -> rien à vérifier
    try:
        import pyotp
        return pyotp.TOTP(sec).verify((code or "").strip(), valid_window=1)
    except Exception:
        return False


def _server_secret():
    import secrets
    a = load_auth()
    s = a.get("server_secret")
    if not s:
        s = secrets.token_hex(32)
        a["server_secret"] = s
        save_auth(a)
    return s


def new_session(ttl=TTL_REMEMBER):
    """Jeton signé sans état (survit à un redémarrage du service)."""
    import hmac, hashlib, time
    exp = int(time.time()) + int(ttl)
    sig = hmac.new(_server_secret().encode(), str(exp).encode(), hashlib.sha256).hexdigest()
    return "%d.%s" % (exp, sig)


def valid_session(tok):
    if not AUTH_ENABLED:
        return True
    import hmac, hashlib, time
    if not tok or "." not in tok:
        return False
    exp_s, _, sig = tok.partition(".")
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if exp < time.time():
        return False
    good = hmac.new(_server_secret().encode(), exp_s.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(good, sig)


def cookie_token(handler):
    raw = handler.headers.get("Cookie", "") or ""
    for part in raw.split(";"):
        if "=" in part:
            k, v = part.strip().split("=", 1)
            if k == COOKIE:
                return v
    return ""


def read_settings():
    s = dict(DEFAULTS)
    try:
        s.update(json.load(open(SETTINGS, encoding="utf-8")))
    except Exception:
        pass
    return s


def write_settings(s):
    cur = read_settings()
    for k in DEFAULTS:
        if k in s and s[k] is not None:
            cur[k] = s[k]
    fd = os.open(SETTINGS, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(cur, f, ensure_ascii=False, indent=2)
    return cur


def update_cron(hours):
    """Planifie autovisit tous les N jours (N = hours/24) à 6h, sans toucher au reste du crontab."""
    n = max(1, int(hours) // 24)
    line = "0 6 */%d * * %s --json-output >> %s 2>&1" % (n, SCRIPT, LOGFILE)
    try:
        cur = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        existing = cur.stdout if cur.returncode == 0 else ""
    except Exception:
        existing = ""
    kept = [l for l in existing.splitlines()
            if l.strip() and "autovisit.py" not in l]
    kept.append(line)
    payload = ("\n".join(kept) + "\n").encode("utf-8")
    try:
        p = subprocess.run(["crontab", "-"], input=payload, capture_output=True)
        return p.returncode == 0
    except Exception:
        return False


def save_favicon(data_url):
    """Accepte un dataURL base64 (image), écrit favicon.png (+ .ico si Pillow dispo)."""
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    img = base64.b64decode(raw)
    os.makedirs(WEBROOT, exist_ok=True)
    png = os.path.join(WEBROOT, "favicon.png")
    with open(png, "wb") as f:
        f.write(img)
    os.chmod(png, 0o644)
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(img)).convert("RGBA")
        im.save(os.path.join(WEBROOT, "favicon.ico"),
                sizes=[(16, 16), (32, 32), (48, 48)])
        im.resize((180, 180)).save(os.path.join(WEBROOT, "apple-touch-icon.png"))
    except Exception:
        pass
    return True


_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def fetch_favicon(domain, dest):
    """Recupere le favicon d'un domaine -> PNG 64px dans dest. Best-effort, le conteneur a Internet."""
    try:
        import requests
        from PIL import Image
    except Exception:
        return False
    dom = (domain or "").strip().lower()
    if not dom:
        return False

    def _save(b):
        im = Image.open(io.BytesIO(b)).convert("RGBA")
        im.thumbnail((64, 64))
        im.save(dest, "PNG")
        return True

    for url in ("https://%s/favicon.ico" % dom, "https://%s/favicon.png" % dom,
                "http://%s/favicon.ico" % dom):
        try:
            r = requests.get(url, timeout=12, headers={"User-Agent": _UA}, allow_redirects=True)
            if r.ok and r.content and len(r.content) >= 70 and b"<html" not in r.content[:200].lower():
                return _save(r.content)
        except Exception:
            pass
    # secours : lien <link rel=icon> de la page d'accueil
    try:
        r = requests.get("https://%s/" % dom, timeout=12, headers={"User-Agent": _UA})
        m = re.search(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*>', r.text, re.I)
        if m:
            h = re.search(r'href=["\']([^"\']+)["\']', m.group(0))
            if h:
                href = h.group(1)
                if href.startswith("//"):
                    href = "https:" + href
                elif href.startswith("/"):
                    href = "https://%s%s" % (dom, href)
                elif not href.lower().startswith("http"):
                    href = "https://%s/%s" % (dom, href)
                rr = requests.get(href, timeout=12, headers={"User-Agent": _UA})
                if rr.ok and rr.content and len(rr.content) >= 70:
                    return _save(rr.content)
    except Exception:
        pass
    return False


# Etat de la reactualisation globale des stats (run en arriere-plan)
_refreshing = {"on": False}

# Revisites individuelles en cours (par slug) : permet de rendre /revisit non
# bloquant (le subprocess de reconnexion peut durer ~180 s) tout en laissant le
# navigateur interroger l'avancement via /revisitstate, sans garder de connexion
# HTTP ouverte (ce qui saturerait son pool de connexions).
_revisiting = set()
_revisiting_lock = threading.Lock()


def _bg_revisit(slug, name):
    try:
        regenerate_one(name)
    finally:
        with _revisiting_lock:
            _revisiting.discard(slug)


def _bg_refresh():
    try:
        regenerate_status()
    finally:
        _refreshing["on"] = False


def slugify(name):
    return re.sub(r"[^a-z0-9_-]", "", (name or "").strip().lower().replace(" ", "-"))


def site_path(slug):
    p = os.path.join(SITES_DIR, slug + ".json")
    if os.path.dirname(os.path.realpath(p)) != os.path.realpath(SITES_DIR):
        raise ValueError("Chemin invalide")
    return p


def _abs_url(site, u):
    """Resout une URL de page de stats : absolue telle quelle, sinon collee sur
    la racine (scheme+host) du site."""
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    base = site.get("url") or site.get("verify_url") or site.get("login_url") or ""
    m = re.match(r"^(https?://[^/]+)", base or "")
    root = m.group(1) if m else ""
    if not u.startswith("/"):
        u = "/" + u
    return root + u


def bak_path(slug):
    return os.path.join(BAK_DIR, slug + ".json")


def write_site(site):
    slug = slugify(site.get("name", ""))
    if not slug:
        raise ValueError("Nom de site invalide")
    # Auth par cookies de session : on écrit les cookies dans un fichier dédié
    cookie_auth = ("session_cookies" in site) or site.get("session_cookies_file") or site.get("cf_solver")
    sc = site.pop("session_cookies", None)
    if sc is not None:
        cdir = os.path.join(BASE, "data", "cookies")
        os.makedirs(cdir, exist_ok=True)
        cf = os.path.join(cdir, slug + ".json")
        with open(cf, "w", encoding="utf-8") as f:
            json.dump(sc, f, ensure_ascii=False)
        try:
            os.chmod(cf, 0o600)
        except Exception:
            pass
        site["session_cookies_file"] = cf
    if not site.get("name") or not site.get("url"):
        raise ValueError("Champ manquant : name/url")
    if cookie_auth:
        if not (site.get("session_cookies_file") or site.get("cf_solver")):
            raise ValueError("Cookies de session manquants")
    else:
        if not site.get("post_url"):
            raise ValueError("Champ manquant : post_url")
        if site.get("username_field") and not site.get("username"):
            raise ValueError("Champ manquant : username")
        if not site.get("password"):
            raise ValueError("Mot de passe manquant")
    os.makedirs(SITES_DIR, exist_ok=True)
    p = site_path(slug)
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(site, f, ensure_ascii=False, indent=2)
    return slug, p


def read_site(slug):
    return json.load(open(site_path(slug), encoding="utf-8"))


def test_site(name):
    # Une seule connexion : on teste ET on met a jour le tableau, pour eviter une
    # deuxieme connexion a l'enregistrement (qui reutiliserait le meme code 2FA).
    try:
        out = regenerate_one(name)
    except Exception as e:
        return False, "Erreur : %s" % e
    if not out:
        return False, "Aucune sortie du test."
    resume = out.split("=== Resume")[-1] if "=== Resume" in out else out
    fail = ("ECHEC" in resume) or ("echec(s)" in resume)
    win = ("reussie" in resume.lower()) or ("succes" in resume.lower())
    ok = win and not fail
    lines = [l for l in out.splitlines() if l.strip()]
    return ok, "\n".join(lines[-14:])


def regenerate_status():
    try:
        p = subprocess.run([sys.executable, SCRIPT, "--json-output"],
                           cwd=BASE, capture_output=True, text=True, timeout=120)
        out = (p.stdout or "") + (p.stderr or "")
        if "Aucun site" in out:
            open(STATUS, "w", encoding="utf-8").write("{}")
    except Exception:
        pass


def regenerate_one(name):
    """Visite UNIQUEMENT ce site puis fusionne son resultat dans status.json,
    sans revisiter tous les autres. Retourne la sortie du run."""
    if not name:
        regenerate_status()
        return ""
    full = _load_status()
    if not isinstance(full, dict):
        full = {}
    full_sites = full.get("sites", []) or []
    out = ""
    try:
        p = subprocess.run([sys.executable, SCRIPT, "--site", name, "--json-output"],
                           cwd=BASE, capture_output=True, text=True, timeout=180)
        out = (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        out = "ECHEC subprocess : %s" % e
    one = _load_status()
    one_sites = one.get("sites", []) if isinstance(one, dict) else []
    nl = (name or "").lower()
    fresh = [s for s in one_sites if (s.get("name") or "").lower() == nl]
    merged = [s for s in full_sites if (s.get("name") or "").lower() != nl] + fresh
    full["sites"] = merged
    if isinstance(one, dict) and one.get("updated"):
        full["updated"] = one["updated"]
    _save_status(full)
    return out


def list_sites():
    res = []
    try:
        files = sorted(f for f in os.listdir(SITES_DIR) if f.endswith(".json"))
    except FileNotFoundError:
        files = []
    for f in files:
        try:
            d = json.load(open(os.path.join(SITES_DIR, f), encoding="utf-8"))
        except Exception:
            continue
        res.append({"slug": f[:-5], "name": d.get("name", f[:-5]),
                    "url": d.get("url", ""), "enabled": d.get("enabled", True)})
    return res


def clear_bak(slug):
    b = bak_path(slug)
    if os.path.exists(b):
        os.remove(b)


def _safe_key(n):
    n = (n or "").strip().lower().replace("/", "").replace("\\", "").replace("..", "")
    return n


def assign_logo(key, logo):
    """Copie .logos/<logo>.png -> icones/<key>.png (idempotent, n'écrase pas un icône existant)."""
    key = _safe_key(key); logo = _safe_key(logo)
    if not key or not logo:
        return False
    src = os.path.join(LOGODIR, logo + ".png")
    if not os.path.exists(src):
        return False
    os.makedirs(ICONDIR, exist_ok=True)
    dst = os.path.join(ICONDIR, key + ".png")
    if os.path.exists(dst):
        return True
    shutil.copy2(src, dst)
    try:
        os.chmod(dst, 0o644)
    except Exception:
        pass
    return True


def _load_status():
    try:
        return json.load(open(STATUS, encoding="utf-8"))
    except Exception:
        return {}


def _save_status(d):
    fd = os.open(STATUS, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)


def prune_status(name):
    d = _load_status()
    if isinstance(d.get("sites"), list):
        low = (name or "").lower()
        d["sites"] = [s for s in d["sites"] if s.get("name", "").lower() != low]
        _save_status(d)


def set_status_disabled(name, disabled):
    d = _load_status()
    low = (name or "").lower()
    for s in d.get("sites", []) or []:
        if s.get("name", "").lower() == low:
            s["disabled"] = bool(disabled)
    _save_status(d)


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj, cookie=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads((self.rfile.read(n) if n else b"{}").decode("utf-8"))

    def _authed(self):
        return valid_session(cookie_token(self))

    def _gate(self):
        """True si l'accès est refusé. Deux cas : (a) l'auth est configurée mais la
        session est invalide, ou (b) aucun mot de passe n'est encore défini — on
        n'expose alors AUCUNE donnée tant que l'admin n'a pas verrouillé l'instance."""
        if not is_configured():
            return True
        return not self._authed()

    def log_message(self, *a):
        pass

    def do_GET(self):
        u = urlparse(self.path); route = u.path.rstrip("/")
        if route == "/auth/status":
            return self._send(200, {"ok": True, "configured": is_configured(),
                                    "twofa": bool(load_auth().get("twofa")),
                                    "authed": self._authed()})
        if self._gate():
            return self._send(401, {"ok": False, "error": "auth"})
        if route == "/status":
            d = _load_status()
            return self._send(200, d if d else {})
        if route == "/sites":
            return self._send(200, {"ok": True, "sites": list_sites()})
        if route == "/site":
            slug = slugify((parse_qs(u.query).get("slug") or [""])[0])
            try:
                d = read_site(slug)
            except Exception:
                return self._send(404, {"ok": False, "error": "site introuvable"})
            d["password"] = ""
            return self._send(200, {"ok": True, "site": d})
        if route == "/settings":
            return self._send(200, {"ok": True, "settings": read_settings()})
        if route == "/logs":
            logsdir = os.path.join(BASE, "data", "logs")
            files = []
            try:
                files = sorted(os.path.basename(f) for f in glob.glob(os.path.join(logsdir, "*"))
                               if os.path.isfile(f))
            except Exception:
                files = []
            want = (parse_qs(u.query).get("file") or [""])[0]
            want = os.path.basename(want) if want else "cron.log"
            path = os.path.join(logsdir, want)
            txt = ""
            if (os.path.realpath(os.path.dirname(path)) == os.path.realpath(logsdir)
                    and os.path.isfile(path)):
                try:
                    # Lecture de la FIN du fichier uniquement (128 Ko), 400 dernières
                    # lignes : evite de charger un journal qui grossit toute la journee
                    # et allege le rendu live cote navigateur.
                    with io.open(path, "rb") as f:
                        f.seek(0, 2)
                        size = f.tell()
                        f.seek(max(0, size - 131072))
                        chunk = f.read().decode("utf-8", "replace")
                    txt = "\n".join(chunk.splitlines()[-400:])
                except Exception:
                    txt = ""
            return self._send(200, {"ok": True, "log": txt, "files": files, "file": want})
        if route == "/refreshstate":
            return self._send(200, {"ok": True, "running": bool(_refreshing["on"])})
        if route == "/revisitstate":
            slug = slugify((parse_qs(u.query).get("slug") or [""])[0])
            with _revisiting_lock:
                running = slug in _revisiting
            return self._send(200, {"ok": True, "running": running})
        return self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        route = urlparse(self.path).path.rstrip("/")
        try:
            data = self._body()
        except Exception as e:
            return self._send(400, {"ok": False, "error": "JSON invalide: %s" % e})

        # --- routes d'authentification (non protégées) ---
        if route == "/auth/login":
            if not AUTH_ENABLED:
                return self._send(400, {"ok": False, "error": "Authentification desactivee cote serveur"})
            if not is_configured():
                return self._send(400, {"ok": False, "error": "aucun mot de passe défini"})
            if _login_locked():
                return self._send(429, {"ok": False, "error": "Trop de tentatives. Réessaie dans quelques minutes."})
            if not check_password(data.get("password", "")):
                _login_fail()
                return self._send(401, {"ok": False, "error": "Mot de passe incorrect"})
            if load_auth().get("twofa"):
                if not data.get("code"):
                    return self._send(200, {"ok": False, "need_2fa": True})
                if not check_totp(data.get("code", "")):
                    _login_fail()
                    return self._send(401, {"ok": False, "need_2fa": True, "error": "Code 2FA invalide"})
            _login_reset()
            tok = new_session(TTL_REMEMBER if data.get("remember") else TTL_SESSION)
            if data.get("remember"):
                ck = "%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d" % (COOKIE, tok, TTL_REMEMBER)
            else:
                ck = "%s=%s; Path=/; HttpOnly; SameSite=Lax" % (COOKIE, tok)  # cookie de session
            return self._send(200, {"ok": True}, cookie=ck)

        if route == "/auth/logout":
            ck = "%s=; Path=/; HttpOnly; Max-Age=0" % COOKIE
            return self._send(200, {"ok": True}, cookie=ck)

        if route == "/auth/password":
            # 1er réglage autorisé sans session ; changement = session requise + mot de passe actuel
            if is_configured():
                if not self._authed():
                    return self._send(401, {"ok": False, "error": "auth"})
                if not check_password(data.get("current", "")):
                    return self._send(401, {"ok": False, "error": "Mot de passe actuel incorrect"})
            new = (data.get("new") or "").strip()
            if len(new) < 8:
                return self._send(400, {"ok": False, "error": "Mot de passe trop court (min 8)"})
            set_password(new)
            tok = new_session(TTL_REMEMBER)
            ck = "%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d" % (COOKIE, tok, TTL_REMEMBER)
            return self._send(200, {"ok": True}, cookie=ck)

        if route == "/auth/2fa/init":
            if self._gate():
                return self._send(401, {"ok": False, "error": "auth"})
            try:
                import pyotp
            except Exception:
                return self._send(400, {"ok": False, "error": "pyotp non installé sur le serveur"})
            sec = pyotp.random_base32()
            PENDING_2FA[cookie_token(self)] = sec
            name = read_settings().get("name", "Autovisit")
            uri = pyotp.totp.TOTP(sec).provisioning_uri(name=name, issuer_name="Autovisit")
            return self._send(200, {"ok": True, "secret": sec, "uri": uri})

        if route == "/auth/2fa/enable":
            if self._gate():
                return self._send(401, {"ok": False, "error": "auth"})
            sec = PENDING_2FA.get(cookie_token(self))
            if not sec:
                return self._send(400, {"ok": False, "error": "Lance d'abord la configuration 2FA"})
            try:
                import pyotp
                ok = pyotp.TOTP(sec).verify((data.get("code") or "").strip(), valid_window=1)
            except Exception:
                ok = False
            if not ok:
                return self._send(401, {"ok": False, "error": "Code invalide"})
            a = load_auth(); a["totp_secret"] = sec; a["twofa"] = True; save_auth(a)
            PENDING_2FA.pop(cookie_token(self), None)
            return self._send(200, {"ok": True})

        if route == "/auth/2fa/disable":
            if self._gate():
                return self._send(401, {"ok": False, "error": "auth"})
            a = load_auth(); a["twofa"] = False; a.pop("totp_secret", None); save_auth(a)
            return self._send(200, {"ok": True})

        # --- toutes les autres routes POST sont protégées ---
        if self._gate():
            return self._send(401, {"ok": False, "error": "auth"})

        if route == "/test":
            try:
                site = data.get("site") or {}
                orig = slugify(data.get("original_slug", "") or "")
                site.setdefault("enabled", True)
                if not site.get("password"):
                    src = orig or slugify(site.get("name", ""))
                    try:
                        site["password"] = read_site(src).get("password", "")
                    except Exception:
                        pass
                slug = slugify(site.get("name", ""))
                created = not os.path.exists(site_path(slug)) if slug else True
                if not created and not os.path.exists(bak_path(slug)):
                    os.makedirs(BAK_DIR, exist_ok=True)
                    shutil.copy2(site_path(slug), bak_path(slug))
                write_site(site)
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            ok, log = test_site(site["name"])
            return self._send(200, {"ok": True, "slug": slug, "created": created,
                                    "login_ok": ok, "log": log})

        if route == "/confirm":
            try:
                slug = slugify(data.get("slug", ""))
                orig = slugify(data.get("original_slug", "") or "")
                if orig and orig != slug and os.path.exists(site_path(orig)):
                    try:
                        oldname = read_site(orig).get("name", "")
                    except Exception:
                        oldname = ""
                    os.remove(site_path(orig))
                    clear_bak(orig)
                    if oldname:
                        prune_status(oldname)
                clear_bak(slug)
                if data.get("logo"):
                    assign_logo(data.get("icon_key") or slug, data.get("logo"))
                # Pas de seconde connexion ici : le test a deja mis a jour le tableau
                # (evite de reutiliser le meme code 2FA -> faux echec).
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "slug": slug})

        if route == "/cancel":
            try:
                slug = slugify(data.get("slug", ""))
                orig = slugify(data.get("original_slug", "") or "")
                created = bool(data.get("created"))
                if slug:
                    if created and os.path.exists(site_path(slug)):
                        os.remove(site_path(slug))
                    elif os.path.exists(bak_path(slug)):
                        shutil.copy2(bak_path(slug), site_path(slug))
                    clear_bak(slug)
                if orig and orig != slug:
                    clear_bak(orig)
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True})

        if route == "/delete":
            try:
                slug = slugify(data.get("slug", ""))
                if not slug:
                    raise ValueError("slug manquant")
                name = ""
                try:
                    name = read_site(slug).get("name", "")
                except Exception:
                    pass
                if os.path.exists(site_path(slug)):
                    os.remove(site_path(slug))
                clear_bak(slug)
                if name:
                    prune_status(name)
                else:
                    regenerate_status()
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "slug": slug})

        if route == "/toggle":
            try:
                slug = slugify(data.get("slug", ""))
                d = read_site(slug)
                d["enabled"] = not d.get("enabled", True)
                fd = os.open(site_path(slug), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(d, f, ensure_ascii=False, indent=2)
                set_status_disabled(d.get("name", ""), not d["enabled"])
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "slug": slug, "enabled": d["enabled"]})

        if route == "/inspect":
            # Capture ce que le bot recoit reellement sur la page de stats (HTML ou JSON),
            # via la variable d'env AUTOVISIT_INSPECT lue par autovisit patche.
            try:
                slug = slugify(data.get("slug", ""))
                name = ""
                try:
                    name = read_site(slug).get("name", "")
                except Exception:
                    name = ""
                if not name:
                    return self._send(404, {"ok": False, "error": "site introuvable"})
                dump = os.path.join(BASE, "data", ".inspect_" + slug + ".txt")
                try:
                    os.remove(dump)
                except Exception:
                    pass
                # On sauvegarde le fichier site entier, on le modifie temporairement pour
                # forcer la capture de la bonne page, puis on restaure tout a la fin.
                sp = site_path(slug)
                orig_text = None
                try:
                    orig_text = io.open(sp, encoding="utf-8").read()
                except Exception:
                    orig_text = None
                try:
                    raw = json.loads(orig_text) if orig_text else read_site(slug)
                    # URL de la page de stats : override de la requete si present, sinon stockee.
                    if "extra_url" in data:
                        eu = _abs_url(raw, data.get("extra_url"))
                    else:
                        eu = (raw.get("extra_url") or "").strip()
                    if eu:
                        # Page de stats separee : on vide stats (sinon extract_stats se
                        # declenche d'abord sur l'accueil) et on met la sonde dans
                        # extra_stats -> le hook capture bien la page extra_url.
                        raw["extra_url"] = eu
                        raw["extra_format"] = "html"
                        raw["extra_stats"] = {"_autovisit_probe": "(?!)"}
                        raw["stats"] = {}
                        raw.pop("stats_json", None)
                        json.dump(raw, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                    elif not raw.get("stats") and not raw.get("stats_json"):
                        # Sonde sur l'accueil (aucune regex configuree).
                        if raw.get("api_json"):
                            raw["stats_json"] = {"_autovisit_probe": "x"}
                        else:
                            raw["stats"] = {"_autovisit_probe": "(?!)"}
                        json.dump(raw, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                except Exception:
                    pass
                env = dict(os.environ); env["AUTOVISIT_INSPECT"] = dump
                try:
                    subprocess.run([sys.executable, SCRIPT, "--site", name],
                                   cwd=BASE, capture_output=True, text=True, timeout=180, env=env)
                except Exception:
                    pass
                # Restauration integrale du fichier site.
                if orig_text is not None:
                    try:
                        io.open(sp, "w", encoding="utf-8").write(orig_text)
                    except Exception:
                        pass
                content = ""
                try:
                    import io as _io
                    content = _io.open(dump, encoding="utf-8", errors="replace").read()
                except Exception:
                    content = ""
                try:
                    os.remove(dump)
                except Exception:
                    pass
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            if not content:
                return self._send(200, {"ok": False, "content": "",
                    "error": "Rien capture : le bot n'a pas atteint la page apres connexion. Cause probable : login en echec (identifiants, 2FA, ou protection anti-bot type Cloudflare). Voir l'onglet Logs pour le detail."})
            truncated = len(content) > 200000
            return self._send(200, {"ok": True, "content": content[:200000], "truncated": truncated})

        if route == "/logosync":
            try:
                done = 0
                for pair in (data.get("pairs") or []):
                    if assign_logo(pair.get("key", ""), pair.get("logo", "")):
                        done += 1
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "assigned": done})

        if route == "/favsync":
            # Recupere le favicon des sites depuis leur domaine (le conteneur a Internet)
            # et l'ecrit dans icones/<slug>.png. targets = [{slug, domain}], force = bool.
            try:
                force = bool(data.get("force"))
                os.makedirs(ICONDIR, exist_ok=True)
                results = []
                for t in (data.get("targets") or []):
                    slug = _safe_key(t.get("slug", ""))
                    dom = (t.get("domain") or "").strip().lower()
                    if not slug or not dom:
                        continue
                    dest = os.path.join(ICONDIR, slug + ".png")
                    if not force and os.path.exists(dest):
                        results.append({"slug": slug, "ok": True, "skipped": True})
                        continue
                    ok = fetch_favicon(dom, dest)
                    if ok:
                        try:
                            os.chmod(dest, 0o644)
                        except Exception:
                            pass
                    results.append({"slug": slug, "ok": bool(ok)})
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "results": results})

        if route == "/refreshall":
            # Reactualise toutes les stats en arriere-plan (revisite chaque site).
            if _refreshing["on"]:
                return self._send(200, {"ok": True, "already": True})
            _refreshing["on"] = True
            threading.Thread(target=_bg_refresh, daemon=True).start()
            return self._send(200, {"ok": True, "started": True})

        if route == "/revisit":
            # Re-visite UN site existant (rafraichit ses stats) sans modifier sa config.
            try:
                slug = slugify(data.get("slug", ""))
                name = ""
                try:
                    name = read_site(slug).get("name", "")
                except Exception:
                    name = ""
                if not name:
                    return self._send(404, {"ok": False, "error": "site introuvable"})
                # Revisite en arriere-plan : on rend la main tout de suite. Garder la
                # connexion ouverte pendant ~180 s saturerait le pool du navigateur et
                # bloquerait les requetes suivantes (ex. /sitestats).
                with _revisiting_lock:
                    already = slug in _revisiting
                    if not already:
                        _revisiting.add(slug)
                if not already:
                    threading.Thread(target=_bg_revisit, args=(slug, name), daemon=True).start()
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "started": True})

        if route == "/sitestats":
            # Edition manuelle des regex de stats d'un site (depuis l'inspection).
            try:
                slug = slugify(data.get("slug", ""))
                d = read_site(slug)
                es = data.get("extra_stats")
                if "extra_url" in data:
                    eu = _abs_url(d, data.get("extra_url"))
                    if eu:
                        # Stats sur une page separee : regex dans extra_stats, accueil vide.
                        d["extra_url"] = eu
                        d["extra_format"] = "html"
                        if isinstance(es, dict):
                            d["extra_stats"] = es
                        d["stats"] = {}
                        d.pop("stats_json", None)
                    else:
                        # URL videe -> retour aux stats de l'accueil.
                        d.pop("extra_url", None)
                        d.pop("extra_stats", None)
                        d.pop("extra_format", None)
                elif isinstance(es, dict):
                    d["extra_stats"] = es
                st = data.get("stats")
                if st is not None:
                    if not isinstance(st, dict):
                        return self._send(400, {"ok": False, "error": "stats: objet JSON attendu"})
                    d["stats"] = st
                sj = data.get("stats_json")
                if sj is not None and isinstance(sj, dict):
                    d["stats_json"] = sj
                # Sauvegarde de securite : archive la config PRECEDENTE (telle que
                # sur disque) avant ecrasement -> data/.statsbak/<slug>.json.
                # Restauration manuelle possible depuis l'hote si besoin.
                try:
                    bakdir = os.path.join(BASE, "data", ".statsbak"); os.makedirs(bakdir, exist_ok=True)
                    shutil.copy2(site_path(slug), os.path.join(bakdir, slug + ".json"))
                except Exception:
                    pass
                # Ecriture STATS-ONLY : on reecrit le MEME fichier que celui lu
                # (site_path(slug)), SANS passer par write_site -> pas de
                # re-validation auth (post_url/password/cookies) qui pourrait lever
                # une erreur et bloquer l'enregistrement de simples regex, et aucun
                # risque de re-slugification ecrivant dans un autre fichier.
                p = site_path(slug)
                fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(d, f, ensure_ascii=False, indent=2)
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "slug": slug, "keys": sorted((d.get("stats") or {}).keys())})

        if route == "/siterestore":
            # Restaure la config de stats depuis la derniere sauvegarde
            # (data/.statsbak/<slug>.json), ecrite avant le dernier enregistrement.
            try:
                slug = slugify(data.get("slug", ""))
                bakf = os.path.join(BASE, "data", ".statsbak", slug + ".json")
                if not os.path.exists(bakf):
                    return self._send(404, {"ok": False, "error": "Aucune sauvegarde pour ce site (enregistre au moins une fois avant)."})
                bak = json.load(open(bakf, encoding="utf-8"))
                d = read_site(slug)
                # On ne restaure QUE les champs de stats (pas l'auth / mdp).
                for k in ("stats", "stats_json", "extra_stats", "extra_url", "extra_format"):
                    d.pop(k, None)
                for k in ("stats", "stats_json", "extra_stats", "extra_url", "extra_format"):
                    if k in bak:
                        d[k] = bak[k]
                p = site_path(slug)
                fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(d, f, ensure_ascii=False, indent=2)
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "slug": slug, "keys": sorted((d.get("stats") or {}).keys())})

        if route == "/settings":
            try:
                s = write_settings(data)
                if "cron_hours" in data and data["cron_hours"]:
                    update_cron(data["cron_hours"])
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True, "settings": s})

        if route == "/favicon":
            try:
                if not data.get("data"):
                    raise ValueError("image manquante")
                save_favicon(data["data"])
                write_settings({"favicon": True})
            except Exception as e:
                return self._send(400, {"ok": False, "error": str(e)})
            return self._send(200, {"ok": True})

        return self._send(404, {"ok": False, "error": "not found"})


if __name__ == "__main__":
    print("web-api v5 sur http://%s:%d" % (HOST, PORT), flush=True)
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
