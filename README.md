# autovisit

Script Python pour visiter automatiquement des sites privés et éviter les désactivations de compte pour inactivité. Permet également de recevoir des alertes en cas de message privé reçu et de collecter des statistiques (ratio, upload, download, bonus...).

Supporte les connexions classiques (form POST), Laravel/UNIT3D, ASP.NET, XenForo, les API JSON, le TOTP (2FA en ligne ou page dédiée), et les sites protégés par Cloudflare ou captcha invisible (via Playwright). Notifications via Pushover.

---

## Prérequis

Python 3.8+

```bash
pip install requests pyotp curl_cffi --break-system-packages
```

> `curl_cffi` est nécessaire pour les sites sous Cloudflare ou avec protection anti-bot avancée. Le script fonctionne sans si tu n'en as pas besoin.

Pour les sites avec captcha invisible (hCaptcha, Cloudflare Turnstile...) :

```bash
pip install playwright --break-system-packages && playwright install firefox
```

> `playwright` est nécessaire uniquement pour les sites qui bloquent les connexions automatiques via captcha invisible. Le script fonctionne sans si tu n'en as pas besoin.

---

## Installation

```bash
git clone https://github.com/Gusdezup/Autovisit.git
cd autovisit
sudo bash install.sh
```

Le script `install.sh` s'occupe de tout :
- Vérification de Python3
- Installation de pip et des dépendances (`requests`, `pyotp`, `curl_cffi`)
- Installation optionnelle de `playwright` et du navigateur Firefox headless
- Copie de `sites.example.json` vers `sites.json`
- Installation de la commande courte `autovisit`

Il ne reste plus qu'à éditer `sites.json` avec tes identifiants.

### Installation manuelle (sans install.sh)

```bash
pip install requests pyotp curl_cffi --break-system-packages
pip install playwright --break-system-packages && playwright install firefox
cp sites.example.json sites.json
```

### Commande courte (si install.sh non utilisé)

```bash
printf '#!/bin/sh\nexec sudo python3 /chemin/vers/autovisit.py "$@"\n' > /usr/local/bin/autovisit
chmod 755 /usr/local/bin/autovisit
```

---

## Configuration

Toute la configuration se fait dans `sites.json`.

### Structure générale

```json
{
  "pushover": {
    "api_token": "TON_APP_TOKEN",
    "user_key": "TON_USER_KEY"
  },
  "sites": [
    { ... }
  ]
}
```

> Pour tes configurations personnelles de sites, crée un fichier `SITES.md` local (il est dans le `.gitignore`). Tu peux y noter tes patterns, champs et observations site par site sans les commiter.

### Champs disponibles par site

| Champ | Obligatoire | Description |
|---|---|---|
| `name` | ✅ | Nom du site (logs et notifications) |
| `url` | ✅ | URL de la page de login (GET initial) |
| `post_url` | ✅ | URL cible du formulaire POST |
| `username_field` | ✅ | Nom du champ username dans le formulaire |
| `password_field` | ✅ | Nom du champ password dans le formulaire |
| `username` | ✅ | Ton identifiant |
| `password` | ✅ | Ton mot de passe |
| `enabled` | | `true` par défaut. `false` pour désactiver |
| `aliases` | | Noms alternatifs pour `--site` |
| `csrf_field` | | Nom du champ CSRF si non standard (ex: `__RequestVerificationToken`, `_csrf_token`) |
| `extract_hidden_fields` | | `true` pour extraire automatiquement les champs hidden anti-bot (Laravel/UNIT3D) |
| `extra_fields` | | Champs supplémentaires à inclure dans le POST (ex: honeypot `{"_username": ""}`) |
| `extra_headers` | | Headers HTTP supplémentaires |
| `pre_visit_urls` | | URLs à charger avant le login (initialisation de session) |
| `verify_url` | | URL à charger après login pour vérifier la connexion et extraire les stats |
| `success_url_contains` | | Texte attendu dans l'URL après connexion |
| `success_keywords` | | Mots-clés attendus dans le HTML après connexion |
| `success_json_field` | | Champ JSON attendu dans la réponse API (ex: `"success"`) |
| `alert_keywords` | | Mots-clés déclenchant une alerte MP (substring exact du HTML) |
| `stats` | | Dict de patterns regex pour extraire les statistiques depuis le HTML |
| `stats_json` | | Dict de chemins de clés pour extraire les statistiques depuis une réponse JSON |
| `mp_url` | | URL d'une API JSON pour vérifier les MP non lus |
| `mp_json_field` | | Champ JSON à vérifier dans la réponse `mp_url` (défaut: `total`) |
| `totp_secret` | | Secret TOTP base32 pour le 2FA |
| `totp_field` | | Nom du champ TOTP (défaut: `mfa`) |
| `totp_url` | | URL de la page 2FA dédiée (si étape séparée) |
| `api_json` | | `true` si le login se fait via API JSON |
| `use_curl_cffi` | | `true` pour les sites Cloudflare / anti-bot (impersonne Firefox) |
| `use_playwright` | | `true` pour les sites avec captcha invisible (Firefox headless) |
| `playwright_submit` | | Sélecteur CSS du bouton de soumission (défaut: `button[type=submit]`) |
| `playwright_intercept` | | Liste d'URLs d'API à intercepter pendant la navigation Playwright |
| `playwright_stats_url` | | URL parmi `playwright_intercept` contenant les données de stats (`stats_json` appliqué dessus) |

---

## Détection CSRF automatique

Le script détecte automatiquement le token CSRF selon le framework :

| Framework | Méthode de détection |
|---|---|
| Laravel | `<meta name="csrf-token">` ou `<input name="_token">` |
| Flask | `<input name="csrf_token">` |
| Symfony | `<input name="_csrf_token">` |
| ASP.NET | `<input name="__RequestVerificationToken">` |
| XenForo | `<input name="_xfToken">` |

Si le champ a un nom non standard, utilise `"csrf_field": "NOM_DU_CHAMP"`.

---

## Protection anti-bot (champs hidden)

Certains sites (Laravel, UNIT3D) injectent des champs hidden aléatoires dans le formulaire pour détecter les bots. Active `"extract_hidden_fields": true` pour les inclure automatiquement dans le POST.

Si le site utilise aussi un champ honeypot de type `text` (non hidden), ajoute-le manuellement :
```json
"extra_fields": {"_username": ""}
```

---

## Statistiques

Le champ `stats` accepte un dictionnaire de patterns regex appliqués sur le HTML après connexion. Le champ `stats_json` accepte un dictionnaire de chemins de clés appliqués sur une réponse JSON (via `verify_url` ou `mp_url`).

```json
"stats": {
  "upload": "PATTERN_REGEX",
  "ratio": "PATTERN_REGEX"
},
"stats_json": {
  "upload": "user.uploaded",
  "ratio": "user.ratio"
}
```

Les patterns `stats` utilisent `re.DOTALL | re.IGNORECASE`. Les clés `stats_json` supportent la notation pointée pour les objets imbriqués (`"user.stats.ratio"`). Les clés contenant `upload`, `download`, `bytes` ou `size` sont automatiquement converties en unités lisibles (Ko/Mo/Go/To).

---

## Exemples de configuration

### Site classique (form POST)

```json
{
  "name": "MonSite",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "username",
  "password_field": "password",
  "success_keywords": ["Déconnexion"],
  "alert_keywords": ["new_message"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site Gazelle avec TOTP inline

```json
{
  "name": "MonSiteGazelle",
  "url": "https://monsite.com/login.php",
  "post_url": "https://monsite.com/login.php",
  "username_field": "username",
  "password_field": "password",
  "totp_secret": "SECRET_BASE32",
  "totp_field": "mfa",
  "success_url_contains": "index.php",
  "success_keywords": ["Déconnexion"],
  "alert_keywords": ["new_message"],
  "stats": {
    "upload": "class=\"stat tooltip up\"[^>]*>([^<]+)</span>",
    "download": "class=\"stat tooltip dl\"[^>]*>([^<]+)</span>",
    "ratio": "class=\"tooltip r\\d+\"[^>]*>([^<]+)</span>"
  },
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site Laravel/UNIT3D avec protection anti-bot

```json
{
  "name": "MonSiteUNIT3D",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "username",
  "password_field": "password",
  "csrf_field": "_token",
  "extract_hidden_fields": true,
  "extra_fields": {"_username": ""},
  "verify_url": "https://monsite.com/",
  "success_keywords": ["Déconnexion"],
  "alert_keywords": ["viewBox=\"0 0 100 100\""],
  "use_curl_cffi": true,
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site UNIT3D avec captcha invisible (Playwright)

```json
{
  "name": "MonSiteUNIT3D",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "username",
  "password_field": "password",
  "use_playwright": true,
  "playwright_submit": "button.auth-form__primary-button",
  "totp_secret": "SECRET_BASE32",
  "totp_field": "code",
  "verify_url": "https://monsite.com/",
  "success_keywords": ["monpseudo"],
  "stats": {
    "upload": "ratio-bar__uploaded[^>]*>\\s*<a[^>]*>\\s*<i[^>]+></i>\\s*([^<]+)",
    "ratio": "ratio-bar__ratio[^>]*>\\s*<a[^>]*>\\s*<i[^>]+></i>\\s*([^<]+)"
  },
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site SPA avec interception API (Playwright)

Pour les sites dont les stats et MP sont chargés dynamiquement via des appels API (Vue.js, React, etc.), Playwright peut intercepter les réponses réseau pendant la navigation et en extraire les données directement, sans avoir à parser le HTML rendu.

```json
{
  "name": "MonTrackerSPA",
  "url": "https://monsite.com/login",
  "username_field": "identifier",
  "password_field": "password",
  "use_playwright": true,
  "playwright_intercept": [
    "https://monsite.com/api/me",
    "https://monsite.com/api/me/notifications/unread"
  ],
  "playwright_stats_url": "https://monsite.com/api/me",
  "stats_json": {
    "upload": "uploaded",
    "download": "downloaded",
    "ratio": "ratio"
  },
  "mp_url": "https://monsite.com/api/me/notifications/unread",
  "mp_json_field": "total",
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

> `playwright_intercept` liste les URLs à intercepter. `playwright_stats_url` indique laquelle contient les stats (`stats_json` lui est appliqué). `mp_url` + `mp_json_field` fonctionnent de la même façon que pour les sites non-Playwright.

### Site ASP.NET

```json
{
  "name": "MonSiteASP",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "Username",
  "password_field": "Password",
  "csrf_field": "__RequestVerificationToken",
  "success_keywords": ["Déconnexion"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site XenForo avec TOTP page dédiée

```json
{
  "name": "MonSiteXenForo",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "login",
  "password_field": "password",
  "csrf_field": "_xfToken",
  "extract_hidden_fields": true,
  "totp_secret": "SECRET_BASE32",
  "totp_field": "code",
  "totp_url": "https://monsite.com/login/two-step",
  "success_keywords": ["Déconnexion"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site API JSON avec stats JSON et MP via endpoint dédié

```json
{
  "name": "MonTrackerAPI",
  "url": "https://monsite.com/login",
  "pre_visit_urls": ["https://monsite.com/api/settings/public"],
  "post_url": "https://monsite.com/api/auth/login",
  "username_field": "username",
  "password_field": "password",
  "api_json": true,
  "success_json_field": "success",
  "verify_url": "https://monsite.com/api/auth/me",
  "stats_json": {
    "upload": "user.uploaded",
    "download": "user.downloaded",
    "ratio": "user.ratio"
  },
  "mp_url": "https://monsite.com/api/messages/unread-count",
  "mp_json_field": "total",
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Login AJAX (réponse vide, vérification sur une autre page)

```json
{
  "name": "MonForum",
  "url": "https://monforum.com/",
  "post_url": "https://monforum.com/includes/login.php?action=login",
  "username_field": "pseudo",
  "password_field": "password",
  "extra_headers": {"X-Requested-With": "XMLHttpRequest"},
  "verify_url": "https://monforum.com/",
  "success_keywords": ["Mon profil"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

---

## Utilisation

```bash
# Mode par défaut : notifie les erreurs et les alertes MP
autovisit

# Silencieux total
autovisit --silent

# Seulement les erreurs
autovisit --error

# Seulement les alertes MP
autovisit --mp

# Seulement les stats
autovisit --stats

# Toutes les notifications (erreurs + MP + succès)
autovisit --verbose

# Exporter un status.json après le run
autovisit --json-output

# Un seul site (par nom ou alias)
autovisit --site MonSite
autovisit --site s1

# Plusieurs sites
autovisit --site MonSite MonSite2

# Combinaison
autovisit --site MonSite --verbose
autovisit --json-output --mp --error
```

---

## Planification (cron / DSM Task Scheduler)

```bash
python3 /chemin/vers/autovisit.py --mp --error
```

Recommandé : 1 fois par jour, à heure fixe.

**Cron Linux :**
```bash
0 8 * * * python3 /chemin/vers/autovisit.py --mp --error >> /chemin/vers/logs/cron.log 2>&1
```

---

## Alertes MP

Le champ `alert_keywords` détecte une chaîne exacte dans le HTML de la page après connexion. La valeur doit être unique et n'apparaître que lorsqu'il y a un message non lu.

Le champ `mp_url` permet d'interroger un endpoint JSON dédié. La valeur du champ `mp_json_field` (défaut: `total`) est comparée à `0` — si supérieure, une alerte est déclenchée.

La notification Pushover reçue aura le titre **"Autovisit - MP"** et le corps **"MP non lu sur NomDuSite"**.

---

## Sécurité

- `sites.json` contient tes mots de passe et secrets TOTP en clair — protège-le : `chmod 600 sites.json`
- Ne partage jamais ton `sites.json`
- `SITES.md` (configs personnelles) est dans le `.gitignore` — ne le commite pas

---

## Liste des sites configurés

```bash
autovisit --list
```

Affiche un tableau récapitulatif de tous les sites configurés dans `sites.json` :

| Colonne | Description |
|---|---|
| Nom | Nom du site |
| Actif | Site activé ou non |
| URL | Domaine |
| TOTP | Secret TOTP configuré |
| 2FA | Type de 2FA (inline, page, api_json) |
| Stats | Patterns stats ou stats_json configurés |
| MP | alert_keywords ou mp_url configurés |
| Curl | use_curl_cffi activé |
