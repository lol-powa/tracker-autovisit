# tracker-autovisit

Petit script Python qui passe quotidiennement sur des sites privés histoire de ne pas se faire désactiver le compte pour cause d'inactivité — parce que constater au bout de trois mois qu'on n'a plus accès à son tracker préféré, c'est moyen.

En passant, il collecte, quand c'est possible, quelques statistiques (ratio, upload, download, bonus...) et peut prévenir par mail ou ntfy en cas de message privé reçu ou de site KO.

Il sait causer avec :

* les formulaires de login classiques (form POST)
* les sites Laravel / UNIT3D, ASP.NET, XenForo, Symfony
* les API JSON (avec ou sans Bearer)
* le TOTP (2FA en ligne ou page dédiée)
* les sites planqués derrière Cloudflare, via [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)
* les sites avec captcha invisible, via [Playwright](https://playwright.dev/) (Firefox headless)
* les sites dont le login est tout bonnement infranchissable, via
  cookies de session pré-exportés

Une interface web légère permet de visualiser l'état des sites, de consulter les dernières statistiques collectées, et de gérer la configuration des sites (ajout, modification, suppression, activation).
Sans avoir à éditer les fichiers JSON à la mano et - cerise - avec quelques modèles pré-définis.

## Crédits

Fork divergent de [Gusdezup/Autovisit](https://github.com/Gusdezup/Autovisit), le script d'origine.

L'API HTTP et l'interface web de gestion des sites ont été portées depuis le fork de The Worm's.

---

## Aperçu

Vue d'ensemble de l'interface web (dashboard) :

<p align="center">
  <img src="docs/img/web-preview.png" alt="Vue desktop" width="600">
  &nbsp;&nbsp;
  <img src="docs/img/web-preview_adaptatif.png" alt="Vue mobile" width="200">
</p>

---

## Installation

Sur Debian ou Debian-like, installer Python et pip, puis l'ensemble des dépendances Python en un coup :

```bash
apt install python3 python3-pip
pip install requests pyotp curl_cffi playwright --break-system-packages
playwright install firefox
```

Ajouter le conteneur FlareSolverr (une seule instance suffit pour tous les sites concernés) :

```bash
docker run -d --name flaresolverr --restart unless-stopped \
  -p 127.0.0.1:8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
```

Cloner le dépôt et préparer l'arborescence de données :

```bash
git clone https://github.com/lol-powa/tracker-autovisit.git /opt/tracker-autovisit
cd /opt/tracker-autovisit
mkdir -p /opt/tracker-autovisit/data/{sites.d,cookies,logs}
```

Installer le wrapper `autovisit` pour pouvoir lancer la commande depuis n'importe où :

```bash
install -m 755 contrib/bin/autovisit /usr/local/bin/autovisit
```

---

## Configuration

La configuration globale (mail, ntfy, rétention) est dans `data/config.json`. Chaque site a son propre fichier dans `data/sites.d/<slug>.json` (slug = nom du site en minuscules).

Au premier lancement, copier le template puis l'éditer :

```bash
cp data/config.example.json data/config.json
```

Le fichier `data/config.json` est requis pour lancer le script ; sans lui, le script s'arrête avec une erreur explicite.

### data/config.json (configuration globale)

```json
{
    "mail": {
        "enabled": false,
        "to": "autovisit@example.org"
    },
    "ntfy": {
        "enabled": false,
        "url": "https://ntfy.example.org",
        "topic": "autovisit",
        "auth_user": "autovisit",
        "auth_pass": "CHANGE_ME",
        "priority": 4,
        "tags": "warning"
    },
    "retention": {
        "history_days": 90,
        "logs_days": 90
    }
}
```

Mail via msmtp (à configurer côté système, root), ntfy via HTTP POST avec authentification basique. Les sections `mail` et `ntfy` peuvent être désactivées (`enabled: false`), auquel cas seul le journal local est écrit.

Le bloc `retention` est optionnel (mais fortement conseillé...). Si présent, le script purge silencieusement au démarrage les snapshots SQLite et les fichiers `visit_YYYY-MM.log` plus anciens que les durées indiquées. Mettre `0` (ou omettre la clé) désactive la purge correspondante.

### data/sites.d/<slug>.json (un fichier par site)

```json
{
    "name": "MonSite",
    "url": "https://monsite.example/login.php",
    "post_url": "https://monsite.example/login.php",
    "username_field": "username",
    "password_field": "password",
    "username": "...",
    "password": "...",
    "verify_url": "https://monsite.example/",
    "success_keywords": ["Déconnexion"],
    "stats": {
        "upload":   "Uploadé\\s*:\\s*([\\d.,]+\\s+\\w+)",
        "download": "Téléchargé\\s*:\\s*([\\d.,]+\\s+\\w+)",
        "ratio":    "Ratio\\s*:\\s*([\\d.,]+)"
    },
    "enabled": true
}
```

### Champs disponibles par site

| Champ | Obligatoire | Description |
|---|---|---|
| `name` | ✅ | Nom du site (logs et notifications) |
| `url` | ✅ | URL de la page de login (GET initial) |
| `post_url` | ✅ | URL cible du formulaire POST |
| `username_field` | ✅ | Nom du champ username dans le formulaire |
| `password_field` | ✅ | Nom du champ password dans le formulaire |
| `username` | ✅ | Identifiant |
| `password` | ✅ | Mot de passe |
| `enabled` | | `true` par défaut. `false` pour désactiver |
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
| `alert_stat` | | Nom d'une clé de `stats` à surveiller : si sa valeur numérique est > 0, déclenche une alerte MP. Le compteur est exclu de l'affichage des stats. |
| `alert_label` | | Libellé de l'alerte MP dans les logs et notifications (défaut : le mot-clé ou la clé surveillée) |
| `stats` | | Dict d'expressions régulières pour extraire les statistiques depuis le HTML. Valeur : chaîne (regex simple) ou objet `{"pattern": ..., "unit": "auto"}` pour forcer la conversion d'unité |
| `stats_json` | | Dict de chemins de clés pour extraire les statistiques depuis une réponse JSON |
| `extra_url` | | URL complémentaire interrogée après `verify_url` pour récupérer des stats absentes de la page principale (FL tokens, seeding count, bonus...). Ses résultats sont fusionnés dans l'unique ligne `Stats --` du journal avant historisation |
| `extra_stats` | | Dict d'expressions à appliquer sur `extra_url`. Format identique à `stats` (regex polymorphe) si `extra_format: "html"`, ou à `stats_json` (chemins pointés) si `extra_format: "json"` |
| `extra_format` | | `"json"` (défaut) ou `"html"`. Détermine comment `extra_stats` est interprété. Toute autre valeur déclenche un warning et fallback JSON |
| `mp_url` | | URL d'une API JSON pour vérifier les MP non lus |
| `mp_json_field` | | Champ JSON à vérifier dans la réponse `mp_url` (défaut: `total`) |
| `totp_secret` | | Secret TOTP base32 pour le 2FA |
| `totp_field` | | Nom du champ TOTP (défaut: `mfa`) |
| `totp_url` | | URL de la page 2FA dédiée (si étape séparée) |
| `api_json` | | `true` si le login se fait via API JSON |
| `use_curl_cffi` | | `true` pour les sites Cloudflare / anti-bot (impersonne Firefox) |
| `use_playwright` | | `true` pour les sites avec captcha invisible (Firefox headless) |
| `playwright_submit` | | Sélecteur CSS du bouton de soumission (défaut: `button[type=submit]`) |
| `playwright_password_selector` | | Sélecteur CSS du champ password (ex: `#private-key-input`). Si défini, le mode password-only est activé : `username_field` peut rester vide |
| `playwright_post_login_wait` | | Délai (secondes) à attendre après le clic submit. Utile pour les sites WebSocket / PoW JS qui ne déclenchent jamais `networkidle` |
| `playwright_wait_url_change` | | Délai max (secondes) à attendre que l'URL change après le submit. À combiner avec `playwright_post_login_wait` pour les sites lents au redirect (Phoenix LiveView par exemple) |
| `playwright_fetch_verify` | | `true` pour faire le GET `verify_url` directement via Playwright (au lieu de transférer les cookies vers `requests`). Nécessaire pour les sites à fingerprint navigateur strict |
| `playwright_post_verify_wait` | | Délai (secondes) à attendre après navigation vers `verify_url` en mode `playwright_fetch_verify` (défaut: `3`) |
| `playwright_intercept` | | Liste d'URLs d'API à intercepter pendant la navigation Playwright |
| `playwright_stats_url` | | URL parmi `playwright_intercept` contenant les données de stats (`stats_json` appliqué dessus) |
| `session_cookies_file` | | Chemin vers un fichier JSON contenant des cookies de session pré-existants. Si défini, le login est totalement contourné |
| `user_agent` | | User-Agent à utiliser. **Obligatoire** avec `session_cookies_file` (sauf si `cf_solver` est défini, auquel cas FlareSolverr impose le sien) |
| `cf_solver` | | URL d'une instance FlareSolverr (ex. `http://127.0.0.1:8191/v1`). Résout le challenge Cloudflare à la volée et rend `session_cookies_file` et `user_agent` optionnels |
| `cf_solver_timeout` | | Délai max (secondes) accordé à FlareSolverr pour résoudre le challenge (défaut : 60) |

`cf_solver` fait passer le site par la fonction `solve_cloudflare()` : une requête `request.get` est envoyée à FlareSolverr sur l'URL cible, qui retourne à la fois les cookies de la session résolue et l'User-Agent effectivement utilisé par son navigateur interne. Ce couple cookies/UA est injecté dans la session `requests` du site via `visit_site_session`. Réutiliser l'UA retourné n'est pas cosmétique : le cookie `cf_clearance` lui est lié côté Cloudflare, sans quoi la session résolue est immédiatement invalidée.

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

Pour un champ au nom non standard, le déclarer via `"csrf_field": "NOM_DU_CHAMP"`.

---

## Protection anti-bot (champs hidden)

Certains sites (Laravel, UNIT3D) injectent des champs `hidden` aléatoires dans le formulaire de login pour piéger les bots. L'option `"extract_hidden_fields": true` les inclut automatiquement dans le POST.

Si le site utilise en plus un champ honeypot de type `text` (non hidden), il faut l'ajouter manuellement via `extra_fields` :

```json
"extra_fields": {"_username": ""}
```

---

## Statistiques

Le champ `stats` accepte un dictionnaire d'expressions régulières appliquées sur le HTML après connexion. Le champ `stats_json` accepte un dictionnaire de chemins de clés appliqués sur une réponse JSON (via `verify_url` ou `mp_url`).

```json
"stats": {
  "upload": "EXPRESSION_REGEX",
  "ratio": "EXPRESSION_REGEX"
},
"stats_json": {
  "upload": "user.uploaded",
  "ratio": "user.ratio"
}
```

Les expressions `stats` utilisent `re.DOTALL | re.IGNORECASE`. Les clés `stats_json` supportent la notation pointée pour les objets imbriqués (`"user.stats.ratio"`). Les clés contenant `upload`, `download`, `bytes` ou `size` sont automatiquement converties en unités lisibles (Ko/Mo/Go/To).

### Stats complémentaires (`extra_url`)

Certaines stats vivent sur une page distincte du `verify_url` : FL tokens, compteur de seeding, bonus cumulé. C'est ce que `extra_url` permet d'aller chercher, avec `extra_stats` pour les expressions et `extra_format` pour piloter le format (`"json"` par défaut, ou `"html"`).

Exemple HTML — cumul de seeding sur une page séparée :

```json
"verify_url": "https://monsite.example/profile",
"stats": {
  "ratio": "Ratio:\\s*([\\d.]+)",
  "upload": {"pattern": "Upload:\\s*([\\d.]+)\\s*([KMGT]B)", "unit": "auto"}
},
"extra_url": "https://monsite.example/account/active-torrents",
"extra_format": "html",
"extra_stats": {
  "seeding": "(\\d+)\\s+en partage"
}
```

Exemple JSON — FL tokens via API :

```json
"extra_url": "https://monsite.example/api/user/bonus",
"extra_format": "json",
"extra_stats": {
  "tokens": "data.tokens.freeleech",
  "bonus": "data.points"
}
```

Stats principales et complémentaires sont fusionnées dans une seule ligne `Stats --` (et un seul snapshot BDD) à chaque exécution. `extra_url` est supporté sur les trois chemins de visite : auth classique (`visit_site`), cookies de session ou FlareSolverr (`visit_site_session`), et Playwright (`visit_site_playwright`).

Côté Playwright, l'appel `extra_url` est effectué via `page.request.get()` tant que le navigateur est ouvert, ce qui réutilise cookies et fingerprint navigateur — utile sur les sites à fingerprint TLS strict où une session `requests` externe se ferait bloquer. Pour les SPA dont les stats ne sont pas exposées sur un endpoint JSON tiers, passer par `playwright_intercept` + `playwright_stats_url` (interception XHR/fetch).

---

## Exemples de configuration

Pour créer un nouveau site, l'interface web propose 35 trackers préconfigurés et 7 modèles génériques (form POST classique, Gazelle, UNIT3D, ASP.NET, XenForo, Symfony, API JSON). Un site personnalisé s'ajoute en quelques clics, sans éditer le JSON à la main.

Pour les cas qui nécessitent une configuration plus poussée, douze exemples annotés sont fournis dans [`docs/examples/`](docs/examples/) :

| # | Cas | Fichier |
|---|---|---|
| 01 | Site form POST classique avec stats | [`01-form-classique.json`](docs/examples/01-form-classique.json) |
| 02 | Site Gazelle avec TOTP inline | [`02-gazelle-totp-inline.json`](docs/examples/02-gazelle-totp-inline.json) |
| 03 | Site Laravel/UNIT3D avec protection anti-bot | [`03-unit3d-anti-bot.json`](docs/examples/03-unit3d-anti-bot.json) |
| 04 | Site UNIT3D avec captcha invisible (Playwright) | [`04-playwright-captcha.json`](docs/examples/04-playwright-captcha.json) |
| 05 | Site SPA avec interception API (Playwright) | [`05-playwright-spa-intercept.json`](docs/examples/05-playwright-spa-intercept.json) |
| 06 | Site Phoenix LiveView / authentification par clé privée | [`06-playwright-phoenix-cle-privee.json`](docs/examples/06-playwright-phoenix-cle-privee.json) |
| 07 | Site avec login bloqué (cookies de session) | [`07-cookies-session.json`](docs/examples/07-cookies-session.json) |
| 08 | Contournement Cloudflare automatisé (FlareSolverr) | [`08-flaresolverr.json`](docs/examples/08-flaresolverr.json) |
| 09 | Site ASP.NET | [`09-aspnet.json`](docs/examples/09-aspnet.json) |
| 10 | Site XenForo avec TOTP page dédiée | [`10-xenforo-totp-dedie.json`](docs/examples/10-xenforo-totp-dedie.json) |
| 11 | Site API JSON avec stats JSON et MP via URL dédiée | [`11-api-json.json`](docs/examples/11-api-json.json) |
| 12 | Login AJAX (réponse vide, vérification sur autre page) | [`12-login-ajax.json`](docs/examples/12-login-ajax.json) |

Chaque exemple est décrit en détail dans [`docs/examples/README.md`](docs/examples/README.md) (cas d'usage, points clés, pièges à éviter).

---

## Utilisation

```bash
# Mode par défaut : aucune notification si tout va bien
autovisit

# Silencieux total (aucune notification, même en cas d'erreur)
autovisit --silent

# Affiche uniquement les lignes Stats de l'exécution en cours
autovisit --stats

# Notifie systématiquement (récap mail détaillé + ntfy s'il y a KO ou MP)
autovisit --verbose

# Exporte un status.json après l'exécution (utilisé par la page web)
autovisit --json-output

# Un seul site
autovisit --site MonSite

# Plusieurs sites
autovisit --site MonSite MonSite2

# Combinaisons
autovisit --site MonSite --verbose
autovisit --json-output --verbose
```

Les notifications mail et ntfy sont activées par défaut si `data/config.json` est présent. Sans `--silent` ni `--verbose`, c'est ntfy qui prévient seulement s'il y a un échec ou un MP non lu — pas de bruit quand tout va bien.

`autovisit` est un petit wrapper shell installé en `/usr/local/bin/` qui appelle `python3 /opt/tracker-autovisit/autovisit.py` ; la commande peut donc être lancée depuis n'importe où, sans `cd` préalable.

---

## Planification Crontab

Une fois par jour suffit largement (Ne faites pas les bourrins s'il vous plaît!). À heure creuse, idéalement.

```bash
0 6 * * * /usr/local/bin/autovisit --json-output >> /opt/tracker-autovisit/data/logs/cron.log 2>&1
```

`--json-output` génère le `status.json` qui alimente la page web, et la matrice de notifications fait le reste : ntfy prévient en cas d'échec ou de MP non lu, le mail reste silencieux sauf en mode `--verbose`.

---

## Interface web

Une interface web légère (`/var/www/autovisit/`) propose deux usages :

- **Tableau de bord** : visualisation en temps réel des stats de tous les sites, état (OK / KO / désactivé), date de dernière visite, MP non lus.
- **Gestion des sites** : ajout, modification, suppression, activation/désactivation, sans éditer les JSON à la main. 35 trackers préconfigurés et 7 modèles génériques sont disponibles depuis le bouton « Ajouter un site ».

L'interface comporte un frontend statique (`/var/www/autovisit/`) et un backend HTTP léger (`web-api.py`) qui écoute en local sur `127.0.0.1:8099`. Nginx fait le pont entre les deux et expose `autovisit.example.org` à l'extérieur, derrière `auth_basic` ou un autre filtrage d'accès.

### Déploiement du frontend

```bash
mkdir -p /var/www/autovisit/icones
cp web/index.html /var/www/autovisit/
cp web/addsite.js /var/www/autovisit/
cp web/icones/* /var/www/autovisit/icones/
chown -R www-data:www-data /var/www/autovisit
```

### Déploiement du backend

```bash
chmod 700 web-api.py
install -m 644 contrib/systemd/tracker-autovisit-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tracker-autovisit-web
systemctl status tracker-autovisit-web --no-pager
```

Le service est lancé en root (lecture/écriture sur `data/sites.d/`). Il écoute uniquement sur `127.0.0.1:8099`, jamais directement exposé : Nginx est le seul point d'entrée.

L'authentification interne du backend est désactivée par défaut (`AUTH_ENABLED = False` en tête de `web-api.py`). La sécurité repose sur `auth_basic` Nginx et le filtrage CIDR. Pour réactiver l'authentification interne (PBKDF2 + TOTP optionnel), passer le flag à `True`, redémarrer le service, et créer le mot de passe initial via la route `/auth/password` du backend.

### Configuration Nginx

Le vhost doit proxifier `/status.json`, les routes d'authentification et les routes CRUD vers le backend. À ajouter dans le `server { listen 443 ssl; ... }` :

```nginx
# /status.json : regenere a la volee par le backend
location = /status.json {
    proxy_pass http://127.0.0.1:8099/status;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}

# Routes d'authentification du backend (inertes si AUTH_ENABLED=False)
location ~ ^/auth/ {
    proxy_pass http://127.0.0.1:8099;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
}

# Routes CRUD du dashboard
location ~ ^/(test|confirm|cancel|delete|toggle|sites|site|settings|favicon|logosync|inspect|logs|favsync|refreshall|refreshstate|revisit|revisitstate|sitestats|siterestore)$ {
    proxy_pass http://127.0.0.1:8099;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    client_max_body_size 4m;
    proxy_connect_timeout 20s;
    proxy_send_timeout 200s;
    proxy_read_timeout 200s;
}
```

Combiné à un `auth_basic` au niveau `server {}` (avec bypass `satisfy any` + `allow x.x.x.0/24` pour le LAN si souhaité), l'interface est accessible depuis le LAN sans authentification et depuis l'extérieur avec authentification HTTP. Adapter le CIDR au réseau local.

### Permissions

Les fichiers statiques de `/var/www/autovisit/` doivent appartenir à `www-data:www-data` (le `chown -R` ci-dessus s'en charge). Le backend tourne en root et n'a aucune contrainte de permissions sur `data/`.

---

## Alertes MP

Trois mécanismes complémentaires, à choisir selon ce que le site expose.

**`alert_keywords`** repère une chaîne exacte dans le HTML après connexion. La valeur doit être unique sur la page et n'apparaître que lorsqu'il y a un message non lu (typiquement une classe CSS « highlighted », un badge spécifique ou un libellé du genre « 3 nouveaux messages »).

**`alert_stat`** surveille une statistique déjà extraite (une clé de `stats`) : si sa valeur numérique dépasse 0, l'alerte se déclenche. Pratique quand le site expose un compteur de messages non lus qu'on récupère par ailleurs comme stat. Le compteur disparaît de la ligne `Stats --` pour ne pas polluer.

**`mp_url`** interroge une URL d'API JSON dédiée. La valeur du champ `mp_json_field` (défaut : `total`) est comparée à `0` — si elle est strictement supérieure, l'alerte se déclenche. La notation pointée est supportée (`meta.unreadCount`, par exemple).

Côté notification, ntfy reçoit une ligne compacte du genre `MP: NomDuSite1, NomDuSite2` et le mail (mode `--verbose`) liste chaque MP dans la section qui va bien.

---

## Sécurité

- Les fichiers `data/config.json` et `data/sites.d/*.json` contiennent les mots de passe et secrets TOTP en clair. À protéger d'urgence : `chmod 600 data/config.json data/sites.d/*.json`
- Ne jamais partager le contenu de `data/` (au cas où ce ne soit pas évident)
- Les fichiers de cookies de session (`session_cookies_file`) méritent le même traitement : `chmod 600 data/cookies/*.json`

---

## Liste des sites configurés

```bash
autovisit --list
```

Affiche un récapitulatif de tous les sites présents dans `data/sites.d/` :

| Colonne | Valeurs | Description |
|---|---|---|
| Nom | — | Nom du site (clé `name`) |
| Actif | `✓` / `✗` | Site activé ou non |
| URL | — | Domaine du site, tronqué à 30 caractères |
| Chemin | `visit` / `session` / `playwright` | Fonction de visite utilisée : auth classique, cookies de session ou FlareSolverr, Firefox headless |
| TOTP | `✓` / `-` | Secret TOTP configuré |
| 2FA | `inline` / `page` / `api_json` / `-` | Mode de second facteur : posté avec le login, sur page dédiée, ou via API JSON |
| Stats | `✓` / `-` | Expressions `stats` ou `stats_json` configurées |
| MP | `api` / `stat` / `kw` / `-` | Mécanisme de détection des MP non lus : `mp_url`, `alert_stat`, `alert_keywords` |
| CF | `✓` / `-` | FlareSolverr configuré (`cf_solver`) |
| Dernier OK | `MM-DD HH:MM` | Date de la dernière connexion réussie d'après `history.db` |
