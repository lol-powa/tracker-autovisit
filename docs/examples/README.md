# Exemples de configuration

Cette page documente les 12 exemples de fichiers `sites.d/*.json` fournis avec le projet. Chaque cas illustre une combinaison de champs typique pour un type de site donné. Les exemples sont classés du plus simple au plus complexe.

Pour la liste complète et la sémantique de chaque champ, voir le tableau « Champs disponibles par site » du [README principal](../../README.md).

Tous les exemples utilisent le TLD `.example` (réservé par l'IANA), `VOTRE_USERNAME` et `VOTRE_MOT_DE_PASSE` comme placeholders, et sont à adapter avant utilisation.

---

## 01 — Site classique (form POST)

**Fichier** : [`01-form-classique.json`](01-form-classique.json)

Pattern de base : login par formulaire HTML, extraction de stats par regex sur la page de profil. C'est le cas couvert par la majorité des trackers Gazelle de base, des sites custom PHP, et tout ce qui n'a pas de protection anti-bot particulière.

**Points clés** :
- `success_keywords` vérifie la présence d'un mot après connexion (typiquement « Déconnexion », « Logout », ou un nom d'utilisateur).
- `stats` extrait par regex sur le HTML de `verify_url`.
- `alert_keywords` déclenche une alerte MP si le mot-clé est présent dans le HTML.
- Aucune dépendance optionnelle (curl_cffi, Playwright, FlareSolverr) n'est requise.

---

## 02 — Site Gazelle avec TOTP inline

**Fichier** : [`02-gazelle-totp-inline.json`](02-gazelle-totp-inline.json)

Variante du cas précédent avec **TOTP soumis sur la même page que le login** (et non sur une étape dédiée). Pattern typique des forks récents de Gazelle.

**Points clés** :
- `totp_secret` est le secret base32 enregistré dans l'application TOTP (Aegis, Google Authenticator, etc.).
- `totp_field` désigne le nom du champ formulaire pour le code à 6 chiffres (souvent `twofa`, `otp_code`, ou `mfa`).
- Absence de `totp_url` : le TOTP est posté avec username/password dans le même formulaire.
- `extra_fields` inclut souvent `keeplogged: 1` (cookie persistant) et `login: Login` (déclenche la soumission côté serveur).
- `extra_url` est utilisé pour récupérer les stats avancées (compteur de seeding via l'API AJAX standard Gazelle).

---

## 03 — Site Laravel/UNIT3D avec protection anti-bot

**Fichier** : [`03-unit3d-anti-bot.json`](03-unit3d-anti-bot.json)

Pattern Laravel classique : token CSRF + champs `hidden` aléatoires injectés à chaque page pour piéger les bots qui se contentent de poster les champs visibles.

**Points clés** :
- `csrf_field: _token` est la convention Laravel (UNIT3D, Voten, Pterodactyl).
- `extract_hidden_fields: true` détecte et inclut automatiquement tous les `<input type=hidden>` du formulaire dans le POST.
- `extra_fields` ajoute un honeypot non-hidden (ici `_username` à vide). UNIT3D rejette le login si ce champ est rempli — un bot naïf le remplit, l'utilisateur légitime non.
- Le `verify_url` est la racine du site, qui renvoie soit la page d'accueil membre, soit la page de login selon l'état de la session.

---

## 04 — Site UNIT3D avec captcha invisible (Playwright)

**Fichier** : [`04-playwright-captcha.json`](04-playwright-captcha.json)

Quand un site ajoute un captcha invisible (Cloudflare Turnstile, hCaptcha, Google reCAPTCHA v3) au-dessus du formulaire UNIT3D, le POST direct via `requests` est rejeté. Playwright résout cela en pilotant un vrai Firefox headless qui exécute le JavaScript du captcha.

**Points clés** :
- `use_playwright: true` bascule sur le chemin Playwright (`visit_site_playwright`).
- `playwright_submit` désigne le sélecteur CSS du bouton de soumission (défaut : `button[type=submit]`).
- Le captcha invisible se résout automatiquement à l'ouverture de la page : aucun champ supplémentaire n'est requis dans le JSON.
- Après le login, les cookies sont transférés à `requests` pour la phase de vérification et l'extraction de stats (sauf si `playwright_fetch_verify: true` est défini, voir exemple 06).

---

## 05 — Site SPA avec interception API (Playwright)

**Fichier** : [`05-playwright-spa-intercept.json`](05-playwright-spa-intercept.json)

Single Page Application moderne : la page HTML est quasi vide, toutes les données (stats utilisateur, ratio, seeding) sont chargées dynamiquement via XHR/fetch après l'authentification. Impossible d'extraire les stats par regex sur le HTML. Solution : intercepter les réponses des appels API au passage.

**Points clés** :
- `playwright_intercept` liste les URLs d'API à intercepter pendant la navigation Playwright.
- `playwright_stats_url` désigne celle qui contient les stats (parmi les URLs interceptées).
- `stats_json` extrait les valeurs depuis le JSON intercepté, en notation pointée (`data.uploaded`, `data.stats.ratio`).
- Pas de `stats` regex : tout passe par `stats_json`.

---

## 06 — Site Phoenix LiveView / authentification par clé privée

**Fichier** : [`06-playwright-phoenix-cle-privee.json`](06-playwright-phoenix-cle-privee.json)

Sites construits sur Phoenix LiveView (Elixir) avec authentification non-conventionnelle : pas de username/password classiques, mais une **clé privée Ed25519** collée dans un champ unique. WebSocket pour la communication, pas de redirect HTTP standard après le login.

**Points clés** :
- `playwright_password_selector` identifie le champ par sélecteur CSS (ici `#private-key-input`). Active le mode « password-only » : `username_field` et `username` peuvent rester vides.
- `playwright_post_login_wait: 8` attend 8 secondes après le clic submit, le temps que le WebSocket termine son handshake (les sites Phoenix ne déclenchent jamais `networkidle`).
- `playwright_wait_url_change: 15` attend jusqu'à 15 secondes que l'URL change, pour les sites qui redirigent lentement après authentification.
- `playwright_fetch_verify: true` impose que le GET du `verify_url` se fasse aussi via Playwright (et non via `requests`), nécessaire quand le site valide le fingerprint navigateur.
- `playwright_post_verify_wait: 4` laisse à la page le temps de se rendre après navigation.

---

## 07 — Site avec login bloqué (cookies de session)

**Fichier** : [`07-cookies-session.json`](07-cookies-session.json)

Quand le login est totalement infranchissable (PoW JavaScript exotique, captcha vidéo, geo-blocking par IP, restriction par fingerprint TLS), l'option de dernier recours est d'extraire les cookies de session depuis un vrai navigateur (extension Cookie Editor, EditThisCookie) et de les fournir au script.

**Points clés** :
- `session_cookies_file` pointe vers un fichier JSON contenant les cookies, exporté depuis le navigateur.
- `user_agent` est **obligatoire** : il doit correspondre à celui du navigateur qui a généré les cookies, sinon le serveur invalide la session.
- Aucun `post_url`, `username_field`, `password_field`, `username`, `password` n'est requis : tous les champs de login sont absents puisque le login est totalement contourné.
- Les cookies doivent être rafraîchis périodiquement (typiquement tous les mois pour les sites avec session « se souvenir de moi »).

---

## 08 — Contournement Cloudflare automatisé (FlareSolverr)

**Fichier** : [`08-flaresolverr.json`](08-flaresolverr.json)

Pour les vrais challenges Cloudflare (page de vérification 5 secondes, Cloudflare Turnstile non invisible) qui résistent à Playwright seul. FlareSolverr résout le challenge dans son propre navigateur, puis renvoie les cookies + le User-Agent à utiliser pour les requêtes suivantes.

**Points clés** :
- `cf_solver` pointe vers une instance FlareSolverr (typiquement en local sur `http://127.0.0.1:8191/v1`).
- `cf_solver_timeout: 60` accorde 60 secondes à FlareSolverr pour résoudre le challenge (généralement 5-15 suffisent, mais on garde de la marge).
- `session_cookies_file` et `user_agent` deviennent **optionnels** quand `cf_solver` est défini : FlareSolverr impose ses propres cookies et son User-Agent.
- Une seule instance FlareSolverr suffit pour tous les sites concernés. Voir la section [Installation](../../README.md#installation) du README principal pour le déploiement Docker.

---

## 09 — Site ASP.NET

**Fichier** : [`09-aspnet.json`](09-aspnet.json)

Sites construits sur ASP.NET (généralement legacy mais encore en service). Token CSRF nommé différemment, champs `Username`/`Password` en CamelCase, et nécessité d'extraire les champs `hidden` de la page (ViewState, EventValidation).

**Points clés** :
- `csrf_field: __RequestVerificationToken` est la convention ASP.NET MVC.
- `username_field: Username` et `password_field: Password` en CamelCase (et non en minuscules).
- `extract_hidden_fields: true` est essentiel pour récupérer les champs `__VIEWSTATE` et `__EVENTVALIDATION` que ASP.NET WebForms vérifie côté serveur.

---

## 10 — Site XenForo avec TOTP page dédiée

**Fichier** : [`10-xenforo-totp-dedie.json`](10-xenforo-totp-dedie.json)

XenForo (forums) sépare le second facteur sur **une page dédiée** : on poste d'abord username/password, le serveur répond avec une redirection vers `/login/two-step`, puis on poste le code TOTP sur cette seconde page. C'est la différence essentielle avec l'exemple 02 (TOTP inline).

**Points clés** :
- `totp_url` désigne l'URL de la page de second facteur. Sa présence active le mode « TOTP en deux étapes ».
- `totp_field` est le nom du champ sur cette seconde page (souvent `code` ou `totp_code`).
- `csrf_field: _xfToken` est la convention XenForo.
- `extra_fields` peut inclure des paramètres XenForo spécifiques (`_xfRedirect` contrôle la page d'arrivée après login).

---

## 11 — Site API JSON avec stats JSON et MP via URL dédiée

**Fichier** : [`11-api-json.json`](11-api-json.json)

Sites avec un backend purement REST/JSON, sans HTML rendu côté serveur. Login via POST JSON, vérification par champ JSON, stats extraites d'un endpoint distinct, MP comptés sur un autre endpoint.

**Points clés** :
- `api_json: true` indique que le POST de login envoie un body JSON (et non du `application/x-www-form-urlencoded`).
- `extra_headers` ajoute `Content-Type: application/json`, `Accept: application/json`, et les `Origin`/`Referer` typiques d'un appel CORS.
- `success_json_field` remplace `success_keywords` : on vérifie la présence d'une clé dans la réponse JSON, pas un mot dans du HTML.
- `stats_json` extrait les stats depuis le JSON du `verify_url` (notation pointée).
- `mp_url` + `mp_json_field` : le compteur de MP non lus est sur un endpoint dédié (souvent `/api/messages/unread-count`), distinct du `verify_url`.

---

## 12 — Login AJAX (réponse vide, vérification sur autre page)

**Fichier** : [`12-login-ajax.json`](12-login-ajax.json)

Variante hybride : le POST de login est traité comme un appel AJAX (la réponse est un JSON vide ou un simple `{ok: true}`), mais le reste du site est du HTML classique. Sans certains headers, le serveur retourne un 419 (Page Expired) ou redirige vers une page d'erreur.

**Points clés** :
- `X-Requested-With: XMLHttpRequest` est le header qui signale au serveur qu'on est en mode AJAX. Sans lui, Laravel et beaucoup de frameworks PHP rejettent le POST.
- `Accept: application/json` indique que le client attend du JSON en retour.
- Pas de `success_json_field` ni de `success_keywords` appliqué au POST : la réponse est vide.
- `success_keywords` est appliqué au `verify_url` (une page de tableau de bord), qui se charge en HTML classique après que la session est établie.
- `extract_hidden_fields: true` reste nécessaire pour récupérer le token CSRF Laravel posté en AJAX.

---

## Tests rapides

Pour valider qu'un fichier respecte la syntaxe JSON avant de le mettre en production :

```bash
jq empty docs/examples/01-form-classique.json && echo OK
```

Pour valider tous les exemples d'un coup :

```bash
for f in docs/examples/*.json; do
  echo -n "$f : "
  jq empty "$f" 2>&1 && echo OK
done
```

Pour utiliser un exemple comme point de départ d'une vraie configuration :

```bash
cp docs/examples/01-form-classique.json data/sites.d/monsite.json
$EDITOR data/sites.d/monsite.json
python3 autovisit.py --site MonSite
```

---

## Voir aussi

- [README principal](../../README.md) — installation, configuration globale, interface web
- Tableau « Champs disponibles par site » — référence complète de chaque champ
- Section « Statistiques » — détail du format `stats` et `extra_stats`
- Section « Détection CSRF automatique » — frameworks supportés sans configuration
