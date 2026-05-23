#!/usr/bin/env python3

import json
import logging
import re
import sys
import time
import random
from datetime import datetime
from pathlib import Path
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

BASE_DIR = Path(__file__).parent
CONFIG   = BASE_DIR / "sites.json"
LOG_FILE = BASE_DIR / "logs" / f"visit_{datetime.now().strftime('%Y-%m')}.log"

LOG_FILE.parent.mkdir(exist_ok=True)

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
    parser.add_argument("--silent",  action="store_true", help="Aucune notification")
    parser.add_argument("--mp",      action="store_true", help="Notifier les alertes MP")
    parser.add_argument("--error",   action="store_true", help="Notifier les erreurs")
    parser.add_argument("--verbose", action="store_true", help="Toutes les notifications")
    parser.add_argument("--site",    type=str, nargs="+", default=None, help="Visiter uniquement ces sites")
    args = parser.parse_args()
    # Par defaut : --mp --error si aucun mode specifie
    if not any([args.silent, args.mp, args.error, args.verbose]):
        args.mp = True
        args.error = True
    return args

def load_config():
    if not CONFIG.exists():
        log.error("Fichier de config introuvable : " + str(CONFIG))
        sys.exit(1)
    with open(CONFIG, encoding="utf-8") as f:
        return json.load(f)

def send_pushover(cfg, subject, body):
    pc = cfg.get("pushover", {})
    if not pc.get("api_token") or not pc.get("user_key"):
        log.warning("Pushover non configure -- notification ignoree.")
        return
    try:
        r = requests.post("https://api.pushover.net/1/messages.json", data={
            "token":   pc["api_token"],
            "user":    pc["user_key"],
            "title":   subject,
            "message": body,
        }, timeout=15)
        if r.status_code == 200:
            log.info("Pushover envoye : " + subject)
        else:
            log.error("Echec Pushover HTTP " + str(r.status_code))
    except Exception as e:
        log.error("Echec Pushover : " + str(e))

def extract_csrf(html):
    # Methode precise : balise meta name="csrf-token"
    match = re.search(r'<meta name="csrf-token"\s+content="([^"]+)"', html)
    if match:
        return match.group(1)
    # Fallback : input hidden _token
    match = re.search(r'<input[^>]+name="_token"[^>]+value="([^"]+)"', html)
    if match:
        return match.group(1)
    return None

def visit_site(site):
    name = site["name"]
    use_curl = site.get("use_curl_cffi", False)

    if use_curl:
        if not CURL_CFFI_AVAILABLE:
            msg = "ECHEC [" + name + "] curl_cffi non installe"
            log.error(msg)
            return False, msg
        session = curl_requests.Session(impersonate="firefox")
    else:
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        })

    try:
        log.info("[" + name + "] Chargement de la page de login : " + site["url"])
        get_headers = {"Accept-Encoding": "identity"} if use_curl else {}
        r = session.get(site["url"], timeout=20, headers=get_headers)
        if r.status_code != 200:
            msg = "ECHEC [" + name + "] Page de login inaccessible (HTTP " + str(r.status_code) + ")"
            log.error(msg)
            return False, msg

        # GET préliminaires optionnels
        for pre_url in site.get("pre_visit_urls", []):
            try:
                session.get(pre_url, timeout=20, headers=get_headers)
                log.info("[" + name + "] GET preliminaire : " + pre_url)
                time.sleep(random.uniform(0.3, 0.8))
            except:
                pass

        time.sleep(random.uniform(1.5, 3.0))

        csrf_token = extract_csrf(r.text)

        payload = {
            site["username_field"]: site["username"],
            site["password_field"]: site["password"],
        }

        if csrf_token and not site.get("api_json"):
            payload["_token"] = csrf_token
            log.info("[" + name + "] Token CSRF detecte et inclus")

        totp_secret = site.get("totp_secret")
        totp_url = site.get("totp_url")

        if totp_secret and not totp_url:
            if not PYOTP_AVAILABLE:
                log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                return False, "ECHEC [" + name + "] pyotp manquant"
            totp_code = pyotp.TOTP(totp_secret).now()
            totp_field = site.get("totp_field", "mfa")
            payload[totp_field] = totp_code
            log.info("[" + name + "] Code TOTP genere : " + totp_code)

        extra_fields = site.get("extra_fields", {})
        payload.update(extra_fields)

        post_url = site.get("post_url", site["url"])
        log.info("[" + name + "] Envoi des identifiants")
        time.sleep(random.uniform(0.5, 1.5))

        extra_headers = site.get("extra_headers", {})
        if extra_headers:
            session.headers.update(extra_headers)

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
            r2 = session.post(post_url, json=payload, headers=post_headers, timeout=20, allow_redirects=False)
        else:
            r2 = session.post(post_url, data=payload, timeout=20, allow_redirects=True)

        if site.get("api_json"):
            log.info("[" + name + "] POST -- HTTP " + str(r2.status_code) + " -- body : " + r2.text[:300])

        if site.get("api_json") and r2.status_code in [200, 201]:
            try:
                data = r2.json()

                # Flux MFA JSON (ex: C411)
                if data.get("mfaRequired"):
                    if not totp_url or not totp_secret:
                        msg = "ECHEC [" + name + "] MFA requis mais totp_url/totp_secret absent dans la config"
                        log.error(msg)
                        return False, msg
                    if not PYOTP_AVAILABLE:
                        log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                        return False, "ECHEC [" + name + "] pyotp manquant"
                    totp_code = pyotp.TOTP(totp_secret).now()
                    log.info("[" + name + "] MFA requis (API JSON), envoi du code TOTP : " + totp_code)
                    time.sleep(random.uniform(0.5, 1.0))
                    totp_headers = {"Content-Type": "application/json", "csrf-token": csrf_token}
                    if use_curl:
                        totp_headers["Accept-Encoding"] = "identity"
                        totp_headers["Origin"] = "https://" + site["url"].split("/")[2]
                        totp_headers["Referer"] = site["url"]
                    r3 = session.post(totp_url, json={"code": totp_code}, headers=totp_headers, timeout=20, allow_redirects=False)
                    try:
                        data3 = r3.json()
                        if data3.get("success"):
                            custom_keywords = site.get("success_keywords", [])
                            verify_url = site.get("verify_url")
                            if custom_keywords and verify_url:
                                rv = session.get(verify_url, timeout=20, headers={"Accept-Encoding": "identity"} if use_curl else {})
                                matched = next((kw for kw in custom_keywords if kw.lower() in rv.text.lower()), None)
                                if matched:
                                    msg = "OK [" + name + "] Connexion reussie apres MFA JSON (mot-cle : " + matched + ")"
                                    log.info(msg)
                                    return True, msg
                                else:
                                    msg = "ECHEC [" + name + "] MFA JSON ok mais mot-cle introuvable sur " + verify_url
                                    log.warning(msg)
                                    return False, msg
                            msg = "OK [" + name + "] Connexion reussie apres MFA JSON"
                            log.info(msg)
                            return True, msg
                    except:
                        pass
                    msg = "ECHEC [" + name + "] Echec apres MFA JSON -- HTTP " + str(r3.status_code)
                    log.warning(msg)
                    return False, msg

                success_json_field = site.get("success_json_field")
                if success_json_field:
                    if data.get(success_json_field):
                        msg = "OK [" + name + "] Connexion reussie (champ JSON : " + success_json_field + ")"
                        log.info(msg)
                        return True, msg
                    else:
                        msg = "ECHEC [" + name + "] Champ JSON manquant : " + success_json_field
                        log.warning(msg)
                        return False, msg

                if data.get("token") or data.get("access_token") or data.get("user") or data.get("success"):
                    msg = "OK [" + name + "] Connexion reussie (API JSON)"
                    log.info(msg)
                    return True, msg

                msg = "ECHEC [" + name + "] Reponse API JSON inattendue : " + r2.text[:200]
                log.warning(msg)
                return False, msg

            except Exception as e:
                msg = "ECHEC [" + name + "] Erreur parsing JSON : " + str(e)
                log.error(msg)
                return False, msg

        if totp_secret and totp_url and totp_url.split("?")[0] in r2.url:
            if not PYOTP_AVAILABLE:
                log.error("[" + name + "] pyotp non installe -- 2FA impossible")
                return False, "ECHEC [" + name + "] pyotp manquant"
            log.info("[" + name + "] Page 2FA detectee, envoi du code TOTP")
            totp_code = pyotp.TOTP(totp_secret).now()
            totp_field = site.get("totp_field", "code")
            totp_payload = {totp_field: totp_code}
            csrf_token2 = extract_csrf(r2.text)
            if csrf_token2:
                totp_payload["_token"] = csrf_token2
            time.sleep(random.uniform(0.5, 1.0))
            r3 = session.post(r2.url, data=totp_payload, timeout=20, allow_redirects=True)
            body_lower = r3.text.lower()

            custom_keywords = site.get("success_keywords", [])
            if custom_keywords:
                matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
                if matched:
                    msg = "OK [" + name + "] Connexion reussie apres 2FA (mot-cle : " + matched + ")"
                    log.info(msg)
                    return True, msg
                else:
                    msg = "ECHEC [" + name + "] Mot-cle introuvable apres 2FA -- URL : " + r3.url
                    log.warning(msg)
                    return False, msg

            if any(w in body_lower for w in ["logout", "deconnexion", "mon compte", "my account", "bienvenue", "welcome", "sign out"]):
                msg = "OK [" + name + "] Connexion reussie apres 2FA"
                log.info(msg)
                return True, msg
            success_kw = site.get("success_url_contains", "")
            if success_kw and success_kw.lower() in r3.url.lower():
                msg = "OK [" + name + "] Connexion reussie apres 2FA -> " + r3.url
                log.info(msg)
                return True, msg
            msg = "ECHEC [" + name + "] Echec apres 2FA -- URL : " + r3.url
            log.warning(msg)
            return False, msg

        # GET de vérification optionnel (ex: login AJAX qui retourne body vide)
        verify_url = site.get("verify_url")
        if verify_url:
            r2 = session.get(verify_url, timeout=20)

        body_lower = r2.text.lower()

        # Alertes MP
        alert_keywords = site.get("alert_keywords", [])
        if alert_keywords:
            for kw in alert_keywords:
                if kw.lower() in body_lower:
                    log.info("[" + name + "] ALERTE : mot-cle detecte : " + kw)
                    return True, ("ALERTE", name, kw, True)

        custom_keywords = site.get("success_keywords", [])
        if custom_keywords:
            matched = next((kw for kw in custom_keywords if kw.lower() in body_lower), None)
            if matched:
                msg = "OK [" + name + "] Connexion reussie (mot-cle : " + matched + ")"
                log.info(msg)
                return True, msg
            else:
                msg = "ECHEC [" + name + "] Mot-cle introuvable dans la page -- URL : " + r2.url
                log.warning(msg)
                return False, msg

        success_kw = site.get("success_url_contains", "")
        if success_kw and success_kw.lower() in r2.url.lower():
            msg = "OK [" + name + "] Connexion reussie -> " + r2.url
            log.info(msg)
            return True, msg

        if any(w in body_lower for w in ["logout", "deconnexion", "mon compte", "my account", "bienvenue", "welcome", "sign out"]):
            msg = "OK [" + name + "] Connexion reussie (detectee dans la page)"
            log.info(msg)
            return True, msg

        if any(w in body_lower for w in ["invalid", "incorrect", "wrong", "error", "invalide"]):
            msg = "ECHEC [" + name + "] Identifiants refuses"
            log.warning(msg)
            return False, msg

        msg = "ECHEC [" + name + "] Connexion douteuse -- URL : " + r2.url + " HTTP " + str(r2.status_code)
        log.warning(msg)
        return False, msg

    except requests.exceptions.Timeout:
        msg = "ECHEC [" + name + "] Timeout"
        log.error(msg)
        return False, msg
    except Exception as e:
        msg = "ECHEC [" + name + "] Erreur : " + str(e)
        log.error(msg)
        return False, msg

def main():
    args  = parse_args()
    cfg   = load_config()
    sites = [s for s in cfg.get("sites", []) if s.get("enabled", True)]
    if args.site:
        def matches(s):
            return any(
                s["name"].lower() == needle or any(a.lower() == needle for a in s.get("aliases", []))
                for needle in [n.lower() for n in args.site]
            )
        sites = [s for s in sites if matches(s)]
        if not sites:
            log.error("Sites introuvables : " + ", ".join(args.site))
            sys.exit(1)
    if not sites:
        log.warning("Aucun site actif trouve dans la config.")
        return
    log.info("=== Demarrage -- " + str(len(sites)) + " site(s) a visiter ===")
    results_ok  = []
    results_err = []
    for site in sites:
        ok, msg = visit_site(site)
        if ok and isinstance(msg, tuple) and msg[0] == "ALERTE":
            _, site_name, kw, _ = msg
            alerte_msg = "MP non lu sur " + site_name
            log.info("[" + site_name + "] " + alerte_msg)
            if args.verbose or args.mp:
                send_pushover(cfg, "Autovisit - MP", alerte_msg)
            results_ok.append("OK [" + site_name + "] " + alerte_msg)
        else:
            (results_ok if ok else results_err).append(msg)
        if site != sites[-1]:
            delay = random.uniform(5, 15)
            log.info("Pause de " + str(int(delay)) + "s avant le prochain site...")
            time.sleep(delay)
    log.info("=== Resume ===")
    for m in results_ok + results_err:
        log.info(m)
    if results_err:
        body = "Echecs :\n" + "\n".join(results_err)
        subject = "Autovisit : " + str(len(results_err)) + " echec(s)"
        log.info(subject)
        if not args.silent and (args.verbose or args.error):
            send_pushover(cfg, subject, body)
    else:
        log.info("Tous les sites ont ete visites avec succes")
        if args.verbose:
            send_pushover(cfg, "Autovisit", "Tous les sites OK")

if __name__ == "__main__":
    main()
