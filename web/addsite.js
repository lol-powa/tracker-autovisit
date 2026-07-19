/* addsite.js v5 — tracker-autovisit dashboard.
   Toolbar : Actualiser / Thème clair-sombre / Paramètres. FAB + (ajouter).
   Paramètres : nom, URL, favicon (upload->auto), couleur d'accent, thème, cron 24/48/72h.
   Modale d'ajout : auto-complétion intuitive depuis la base de 32 trackers ; sinon saisie manuelle.
   Actions par ligne (activer/désactiver, éditer, supprimer) + flux Tester -> Ajouter/Échec. */
(function () {
  "use strict";

  var TRACKERS = /*TRACKERS_DB*/[{"id": "abnormal", "n": "ABNormal", "d": "abn.lol", "p": "aspnet", "lp": "/Home/Login", "vp": "/", "to": false, "uf": "Username", "pf": "Password", "csrf": "__RequestVerificationToken", "hid": 1, "ef": {"RememberMe": "false"}, "lg": 1, "s": {"upload": "Seeds\\\">Up\\s*:\\s*<span[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": "Seeds\\\">Down\\s*:\\s*<span[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": ">Ratio\\s*:\\s*<span[^>]*>\\s*([\\d.,]+)", "bonus": "ChocosShop[\\s\\S]{0,80}?<span[^>]*>\\s*([\\d\\s.,]+)", "invitations": "Invitations[\\s\\S]{0,80}?(\\d[\\d\\s.,]*\\d|\\d)", "class": "class=\\\"userclass_([A-Za-z0-9]+)"}}, {"id": "bitporn", "n": "BitPorn", "d": "bitporn.eu", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "au": "cookie", "lg": 1, "s": {"upload": "ratio-bar__uploaded[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)", "download": "ratio-bar__downloaded[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)", "bufferBytes": "ratio-bar__buffer[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)"}}, {"id": "brokenstones", "n": "BrokenStones", "d": "brokenstones.is", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": false, "hid": 1, "ef": {"keeplogged": "1"}, "s": {"upload": "stats_seeding[\\s\\S]{0,200}?<span[^>]*>\\s*([\\d.]+ (?:TB|GB|MB|KB))\\s*</span>", "download": "stats_leeching[\\s\\S]{0,200}?<span[^>]*>\\s*([\\d.]+ (?:TB|GB|MB|KB))\\s*</span>", "ratio": "stats_ratio[\\s\\S]{0,200}?<span[^>]*>\\s*([\\d.]+)\\s*</span>", "tokens": "fl_tokens[\\s\\S]{0,200}?<a[^>]*>\\s*(\\d+)\\s*</a>"}, "lg": 1}, {"id": "c411", "n": "C411", "d": "c411.org", "p": "apijson", "lp": "/login", "vp": "/api/auth/me", "to": true, "pp": "/api/auth/login", "pv": ["/api/settings/public"], "mu": "/api/auth/mfa/totp", "tf": "code", "sf": "authenticated", "mp": {"u": "/api/messages/unread-count", "f": "total"}, "lg": 1, "sj": {"download": "user.downloaded", "upload": "user.uploaded", "ratio": "user.ratio", "class": "user.badge.label"}}, {"id": "crazyspirits", "n": "CrazySpirits", "d": "crazyspirits.com", "p": "form", "lp": "/account-login.php", "vp": "/", "to": false, "br": 1, "au": "cookie", "lg": 1, "s": {"download": "/dl\\.png\"[\\s\\S]{0,160}?<font[^>]*>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "upload": "/up\\.png\"[\\s\\S]{0,160}?<font[^>]*>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "bonus": "Crazy Bonus\\s*<a[^>]*>\\s*([\\d\\s.,]+)"}}, {"id": "empornium", "n": "Empornium", "d": "www.empornium.sx", "p": "gazelle", "lp": "/login", "vp": "/", "to": false, "hid": 1, "ef": {"keeploggedin": "1"}, "lg": 1, "s": {"bonus": ">Credits</a>:\\s*</td>[\\s\\S]{0,140}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+)", "upload": ">Up</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": ">Down</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": ">Ratio</a>:\\s*</td>[\\s\\S]{0,220}?<span[^>]*class=['\"]r\\d+['\"][^>]*>\\s*(\\d[\\d\\s.,]*)"}}, {"id": "exoticaz", "n": "ExoticaZ", "d": "exoticaz.to", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "ef": {"remember": "on"}, "br": 1, "au": "cookie", "s": {"upload": "fa-arrow-up[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "download": "fa-arrow-down[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "ratio": "fa-signal[\\s\\S]{0,40}?</i>\\s*([\\d.,]+)", "bufferBytes": "fa-database[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "seeding": "Seeding:</a>\\s*(\\d+)", "bonus": "Bonus:</a>\\s*([\\d.,]+)"}, "lg": 1}, {"id": "g3mini", "n": "G3MINI", "d": "gemini-tracker.org", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "csrf": "_token", "hid": 1, "lg": 1, "s": {"upload": "ratio-bar__uploaded[\\s\\S]{0,400}?(\\d[\\d.,]*(?:&nbsp;|[\\s\\u00a0])*[KMGTPE]i?B)", "download": "ratio-bar__downloaded[\\s\\S]{0,400}?(\\d[\\d.,]*(?:&nbsp;|[\\s\\u00a0])*[KMGTPE]i?B)", "ratio": "ratio-bar__ratio[\\s\\S]{0,400}?</i>\\s*([\\d.,]+)", "seeding": "ratio-bar__seeding[\\s\\S]{0,400}?</i>\\s*(\\d+)", "bonus": "ratio-bar__points[\\s\\S]{0,400}?</i>\\s*([\\d\\s.,\\u00a0]+?)\\s*</a>", "bufferBytes": "ratio-bar__buffer[\\s\\S]{0,400}?(\\d[\\d.,]*(?:&nbsp;|[\\s\\u00a0])*[KMGTPE]i?B)"}, "au": "cookie", "pp": "/api/auth/login"}, {"id": "generationfree", "n": "Generation-Free", "d": "generation-free.org", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "csrf": "_token", "hid": 1, "lg": 1}, {"id": "happyfappy", "n": "HappyFappy", "d": "www.happyfappy.net", "p": "gazelle", "lp": "/login", "vp": "/", "to": false, "hid": 1, "ef": {"keeploggedin": "1"}, "lg": 1, "s": {"bonus": ">Credits</a>:\\s*</td>[\\s\\S]{0,140}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+)", "upload": ">Up</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": ">Down</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": ">Ratio</a>:\\s*</td>[\\s\\S]{0,220}?<span[^>]*class=['\"]r\\d+['\"][^>]*>\\s*(\\d[\\d\\s.,]*)"}}, {"id": "hdforever", "n": "HD-Forever", "d": "hdf.world", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": true, "hid": 1, "ef": {"login": "Se connecter", "keeplogged": "1"}, "mu": "/login.php?act=otp", "tf": "otp_code", "lg": 1, "s": {"upload": "class=\\\"stat tooltip up\\\" title=\\\"([^\\\"]+)\\\"", "download": "class=\\\"stat tooltip dl\\\" title=\\\"([^\\\"]+)\\\"", "ratio": "stats_ratio[^>]*>Ratio[^<]*<[^>]*><span class=\\\"tooltip r\\d+\\\" title=\\\"([^\\\"]+)\\\"", "bonus": "action=rate[^>]+>([\\d,]+)<", "jetons FL": ">Jetons FL</a>[\\s\\S]{0,200}?>\\s*(\\d[\\d\\s.,]*\\d|\\d)\\s*</a>", "unreadMessages": "data-notification-type=['\\\"]Inbox['\\\"][^>]*>[^<]*?(\\d+|\\bun) nouveau", "class": "class=\\\"userclass\\\">\\(?([^)<]+)"}}, {"id": "hdonly", "n": "HD-Only", "d": "hd-only.org", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": false, "hid": 1, "ef": {"keeplogged": "1", "login": "Se connecter"}, "lg": 1, "s": {"upload": "Envoy[\\s\\S]{0,160}?([\\d\\s.,]+\\s*[KMGTPE]?i?B)", "download": "Re[\\s\\S]{0,160}?([\\d\\s.,]+\\s*[KMGTPE]?i?B)", "unreadMessages": "data-notification-type=['\"]Inbox['\"][^>]*>[^<]*?(\\d+|\\bun) nouveau", "class": "id=\"pseudo\"[\\s\\S]*?\\(?:([^)]+)\\)"}}, {"id": "iptorrents", "n": "IPTorrents", "d": "www.iptorrents.com", "p": "form", "lp": "/do-login.php", "vp": "/", "to": false, "br": 1, "s": {"upload": ">Uploaded</div>\\s*<i[^>]*></i>\\s*([\\d.,]+\\s*(?:[KMGTPE]i?B|B))", "download": ">Downloaded</div>\\s*<i[^>]*></i>\\s*([\\d.,]+\\s*(?:[KMGTPE]i?B|B))", "ratio": "c_ratio[\\s\\S]{0,120}?</i>\\s*([\\d.,]+)", "bonus": ">Bonus Points</div>\\s*<i[^>]*></i>\\s*([\\d.,]+)"}, "lg": 1}, {"id": "kufirc", "n": "KuFirc", "d": "kufirc.com", "p": "gazelle", "lp": "/login", "vp": "/", "to": false, "hid": 1, "ef": {"keeploggedin": "1"}, "lg": 1, "s": {"bonus": ">Credits</a>:\\s*</td>[\\s\\S]{0,140}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+)", "upload": ">Up</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": ">Down</a>:\\s*</td>[\\s\\S]{0,160}?<span[^>]*class=['\"]stat['\"][^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": ">Ratio</a>:\\s*</td>[\\s\\S]{0,220}?<span[^>]*class=['\"]r\\d+['\"][^>]*>\\s*(\\d[\\d\\s.,]*)"}}, {"id": "lacale", "n": "La Cale", "d": "la-cale.space", "p": "form", "lp": "/login", "vp": "/profile", "to": false, "uf": "email", "br": 1, "lg": 1, "s": {"upload": "\\\\?\"uploaded\\\\?\"\\s*:\\s*(\\d+)", "download": "\\\\?\"downloaded\\\\?\"\\s*:\\s*(\\d+)", "bonus": "\\\\?\"bonusPoints\\\\?\"\\s*:\\s*(\\d+)"}}, {"id": "mam", "n": "MAM", "d": "www.myanonamouse.net", "p": "form", "lp": "/login.php?returnto=%2Fu%2F", "vp": "/u/", "to": false, "ef": {"rememberMe": "yes", "returnto": "/u/"}, "br": 1, "au": "cookie", "lg": 1, "s": {"upload": "Uploaded[\\s\\S]{0,160}?([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": "Downloaded[\\s\\S]{0,160}?([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": "Share ratio[\\s\\S]{0,160}?(\\d[\\d\\s.,]*)", "bonus": "Bonus[\\s\\S]{0,160}?([\\d\\s.,]+)"}}, {"id": "milkie", "n": "Milkie", "d": "milkie.cc", "p": "form", "lp": "/auth/signin", "vp": "/browse", "to": false, "uf": "email", "br": 1, "lg": 1, "s": {"upload": "keyboard_arrow_up[\\s\\S]{0,140}?([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": "keyboard_arrow_down[\\s\\S]{0,140}?([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))"}}, {"id": "nexum", "n": "Nexum", "d": "nexum-core.com", "p": "unit3d", "lp": "/login", "vp": "/activity", "uf": "email", "csrf": "_token", "hid": 1, "mu": "/login/2fa", "tf": "code", "xf": {"u": "https://nexum-core.com/user/{{username}}", "fmt": "html", "s": {"upload": "<span class=\"val[^\"]*\"[^>]*>\\s*([\\d.,]+\\s*(?:[KMGTPE]i?o|[KMGTPE]i?B|o|B))\\s*</span>\\s*<span class=\"lbl\">\\s*Uploadé", "bonus": "<span class=\"val[^\"]*\"[^>]*>\\s*([\\d\\s.,]+)\\s*</span>\\s*<span class=\"lbl\">\\s*Points bonus", "downloads": "<span class=\"val[^\"]*\"[^>]*>\\s*(\\d+)\\s*</span>\\s*<span class=\"lbl\">\\s*Téléchargements", "ratio": "title=\"Ratio de ([\\d.,]+)", "class": "title=\"Grade\\s*:\\s*([A-Za-zÀ-ÿ][\\wÀ-ÿ ]*?)\\s*(?:—|<)"}}, "lg": 1, "s": {"unreadMessages": "id=['\\\"]pm-badge['\\\"][^>]*>(\\d+)"}, "cf": 1, "au": "cookie"}, {"id": "nostradamus", "n": "Nostradamus", "d": "nostradamus.foo", "p": "form", "lp": "/sign-in", "vp": "/activity", "to": false, "br": 1, "au": "key", "pks": "#private-key-input", "s": {"upload": ">\\s*Upload total\\s*</div>\\s*<div class=\\\"mt-1[^\\\"]*\\\">\\s*([\\d.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": ">\\s*Download total\\s*</div>\\s*<div class=\\\"mt-1[^\\\"]*\\\">\\s*([\\d.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "snatches": ">\\s*Snatches uniques\\s*</div>\\s*<div class=\\\"mt-1[^\\\"]*\\\">\\s*(\\d+)", "anciennete": ">\\s*Anciennet[^<]*</div>\\s*<div class=\\\"mt-1[^\\\"]*\\\">\\s*([^<]+?)\\s*</div>"}, "lg": 1}, {"id": "orpheus", "n": "Orpheus", "d": "orpheus.network", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": false, "hid": 1, "lg": 1, "s": {"download": "id=\"stats_leeching\"[\\s\\S]*?title=\"([^\"]+)\"", "upload": "id=\"stats_seeding\"[\\s\\S]*?title=\"([^\"]+)\"", "ratio": "id=\"stats_ratio\"[\\s\\S]*?title=\"([^\"]+)\"", "bonus": "Bonus \\(?:([^)]+)\\)", "unreadMessages": "data-noty-type=['\"]Inbox['\"][^>]*>[^<]*?(\\d+|\\ba) new message"}}, {"id": "phoenixproject", "n": "Phoenix Project", "d": "phoenixproject.app", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": true, "hid": 1, "ef": {"login": "Log in", "keeplogged": "1"}, "s": {"upload": "id=\"stats_seeding\"[\\s\\S]{0,200}?title=\"([^\"]+)\"", "download": "id=\"stats_leeching\"[\\s\\S]{0,200}?title=\"([^\"]+)\"", "ratio": "id=\"stats_ratio\"[\\s\\S]{0,200}?title=\"([^\"]+)\"", "bonus": "Bonus \\(([\\d.,]+)\\)", "unreadMessages": "data-noty-type=['\"]Inbox['\"][^>]*>[^<]*?(\\d+|\\ba) new message", "class": "userclass\">([^<]+)"}, "tf": "twofa", "lg": 1}, {"id": "redacted", "n": "Redacted", "d": "redacted.sh", "p": "gazelle", "lp": "/login.php", "vp": "/", "to": false, "hid": 1, "lg": 1, "s": {"requiredRatio": "id=\"stats_required\"[^>]*title=\"Required Ratio: ([^\"]+)\"", "unreadMessages": "data-noty-type=['\"]Inbox['\"][^>]*>[^<]*?(\\d+)"}}, {"id": "seedpool", "n": "Seedpool", "d": "seedpool.org", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "br": 1, "au": "cookie", "lg": 1}, {"id": "sextorrent", "n": "SexTorrent", "d": "sextorrent.myds.me", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "csrf": "_token", "hid": 1, "lg": 1}, {"id": "speedapp", "n": "SpeedApp", "d": "speedapp.io", "p": "form", "lp": "/fr/connexion?locale=fr", "vp": "/profile", "to": false, "ef": {"_remember_me": "on"}, "lg": 1, "s": {"upload": "Uploaded[\\s\\S]{0,120}?<dd[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</dd>", "download": "Downloaded[\\s\\S]{0,120}?<dd[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</dd>", "seedTimeDays": "Seed time[\\s\\S]{0,120}?<dd[^>]*>\\s*(\\d[\\d\\s.,]*)\\s*days"}}, {"id": "teamflix", "n": "TeamFlix", "d": "tracker.teamflix.cc", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "csrf": "_token", "hid": 1, "lg": 1}, {"id": "theoldschool", "n": "The Old School", "d": "theoldschool.cc", "p": "unit3d", "lp": "/login", "vp": "/", "to": false, "csrf": "_token", "hid": 1, "lg": 1, "s": {"upload": "ratio-bar__uploaded[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)", "download": "ratio-bar__downloaded[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)", "ratio": "ratio-bar__ratio[\\s\\S]{0,200}?</i>\\s*([\\d.,]+)", "seeding": "ratio-bar__seeding[\\s\\S]{0,200}?</i>\\s*(\\d+)", "bonus": "ratio-bar__(?:points|seedbonus|bonus)[\\s\\S]{0,200}?</i>\\s*(\\d[\\d\\s.,]*?)\\s*</a>", "bufferBytes": "ratio-bar__buffer[\\s\\S]{0,260}?(\\d[\\d.,]*(?:&nbsp;|&#160;|&#xa0;|[\\s\\u00a0])*[KMGTPE]i?B)"}, "au": "cookie", "pp": "/api/auth/login"}, {"id": "tigersdl", "n": "Tigers-DL", "d": "www.tigers-dl.net", "p": "form", "lp": "/account-login.php", "vp": "/mybonus.php", "to": false, "br": 1, "lg": 1, "s": {"upload": "title=['\"]Partager['\"][\\s\\S]{0,180}?<font[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</font>", "download": "title=['\"][^'\"]*charg[^'\"]*['\"][\\s\\S]{0,180}?<font[^>]*>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</font>", "bonus": "Votre solde[\\s\\S]{0,180}?score-points[^>]*>\\s*([\\d\\s.,]+)", "seeding": "(?:Nombres de Torrents que vous avez en seed\\s*:\\s*|title=['\"]Seeding['\"][\\s\\S]{0,120}?<b>\\s*)(\\d+)"}}, {"id": "torr9", "n": "Torr9", "d": "torr9.net", "p": "apijson", "lp": "https://torr9.net/login", "vp": "https://api.torr9.net/api/v1/users/me", "to": false, "pp": "https://api.torr9.net/api/v1/auth/login", "sf": "token", "mp": {"u": "https://api.torr9.net/api/v1/chat/unread-counts", "f": "total_dms"}, "lg": 1, "sj": {"download": "total_downloaded_bytes", "upload": "total_uploaded_bytes", "bonus": "jeton_balance", "class": "role"}}, {"id": "torrentleech", "n": "TorrentLeech", "d": "www.torrentleech.org", "p": "form", "lp": "/user/account/login/", "vp": "/", "to": false, "s": {"upload": "title=\"Uploaded \\(?:Seeding\\)\"[\\s\\S]*?<span[^>]*>([\\d\\s.,]+\\s*(?:[KMGTPE](?:B|io|o)|B))</span>", "download": "title=\"Downloaded \\(?:Leeching\\)\"[\\s\\S]*?<span[^>]*>([\\d\\s.,]+\\s*(?:[KMGTPE](?:B|io|o)|B))</span>", "ratio": "title=\"Ratio\"[\\s\\S]*?<i[^>]*></i>\\s*([\\d\\s.,]+)", "bonus": "TL Points:[^<]*<span class=\"total-TL-points\">([^<]+)</span>"}, "lg": 1}, {"id": "tr4ker", "n": "TR4KER", "d": "tr4ker.net", "p": "apijson", "lp": "/login", "vp": "/api/me", "to": false, "au": "cookie", "lg": 1, "pp": "/api/auth/login", "sf": "id", "sj": {"upload": "uploaded", "download": "downloaded", "bonus": "money"}}, {"id": "yggreborn", "n": "YGGReborn", "d": "www.yggreborn.org", "p": "form", "lp": "/login?next=/account/", "vp": "/account/", "to": false, "br": 1, "au": "cookie", "s": {"upload": "(\\d[\\d\\s.,]*\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</div>[\\s\\S]{0,180}?>Upload<", "download": "(\\d[\\d\\s.,]*\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))\\s*</div>[\\s\\S]{0,180}?>Download<", "class": ">R[oô]le</span>[\\s\\S]*?uppercase\"[\\s\\S]*?>([^<]+)</span>"}, "lg": 1}, {"id": "karagarga", "n": "KaraGarga", "d": "karagarga.in", "p": "form", "lp": "/login.php", "pp": "/takelogin.php", "vp": "/", "to": false, "uf": "username", "pf": "password", "hid": 1, "lg": 1, "s": {"upload": "Ratio:[\\s\\S]{0,120}?&#8593;<font[^>]*>\\s*([\\d.,]+\\s*[KMGTPE]i?B)\\s*</font>", "download": "Ratio:[\\s\\S]{0,160}?w/\\s*([\\d.,]+\\s*[KMGTPE]i?B)", "ratio": "Ratio:\\s*<font[^>]*>\\s*([\\d.,]+)\\s*</font>", "class": "<font color=blue>\\s*([^<]+?)\\s*</font>"}}, {"id": "privatehd", "n": "PrivateHD", "d": "privatehd.to", "p": "unit3d", "lp": "/auth/login", "vp": "/", "to": false, "ef": {"remember": "on"}, "au": "cookie", "s": {"upload": "fa-arrow-up[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "download": "fa-arrow-down[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "ratio": "fa-signal[\\s\\S]{0,40}?</i>\\s*([\\d.,]+)", "bufferBytes": "fa-database[\\s\\S]{0,40}?</i>\\s*([\\d.,]+\\s*[KMGTPE]?i?B)", "seeding": "Seeding:</a>\\s*(\\d+)", "bonus": "Bonus:</a>\\s*([\\d.,]+)"}, "lg": 1}, {"id": "wihd", "n": "WiHD", "d": "world-in-hd.net", "p": "form", "lp": "/login", "pp": "/login_check", "vp": "/", "to": false, "uf": "_username", "pf": "_password", "csrf": "_csrf_token", "hid": 1, "ef": {"_remember_me": "on", "_submit": "Connexion"}, "lg": 1, "s": {"upload": "upload-stats\"[\\s\\S]{0,80}?</strong>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "download": "download-stats\"[\\s\\S]{0,80}?</strong>\\s*([\\d\\s.,]+\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))", "ratio": "class=\"ratio\"[\\s\\S]{0,80}?Ratio</strong>\\s*([\\d.,]+)", "theias": "class=\"theias\"[\\s\\S]{0,80}?Theias</strong>\\s*([\\d.,]+\\s*[KMGT]?)", "seeding": "upload-stats\"[\\s\\S]{0,40}?<strong>(\\d+)</strong>", "class": "<span class=\"class\"[^>]*>\\s*([^<]+?)\\s*</span>"}}, {"id": "teamos", "n": "TeamOS", "d": "www.teamos.xyz", "p": "xenforo", "lp": "/login/", "vp": "/account/", "to": false, "au": "cookie", "xf": {"u": "https://www.teamos.xyz/members/{{username}}/", "fmt": "html", "s": {"download": "torrentUserDownloaded[\\s\\S]{0,40}?([\\d.,]+\\s*(?:[KMGTPE]i?B|B))", "upload": "torrentUserUploaded[\\s\\S]{0,40}?([\\d.,]+\\s*(?:[KMGTPE]i?B|B))", "ratio": "torrentUserRatio[\\s\\S]{0,40}?([\\d.,]+)", "bonus": "torrentUserSeedbonus[\\s\\S]{0,40}?([\\d.,]+)", "class": "userBanner[\\s\\S]{0,120}?<strong>\\s*([^<]+?)\\s*</strong>"}}, "lg": 1}];

  var ICON = {
    power: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v8"/><path d="M7.5 7a7 7 0 1 0 9 0"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l1 13h9l1-13"/></svg>',
    inspect: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2 5.3"/><path d="M20 4v5h-5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5l1.4 2.6 2.9-.6.6 2.9 2.6 1.4-1.4 2.6 1.4 2.6-2.6 1.4-.6 2.9-2.9-.6L12 21.5l-1.4-2.6-2.9.6-.6-2.9L4.5 15l1.4-2.6L4.5 9.8l2.6-1.4.6-2.9 2.9.6z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h12"/></svg>'
  };

  var PRESET = {
    form:    {path:"/login",         vmode:"auto", verify:"",         curl:false},
    unit3d:  {path:"/login",         vmode:"auto", verify:"",         curl:true},
    gazelle: {path:"/login.php",     vmode:"auto", verify:"",         curl:false},
    aspnet:  {path:"/login",         vmode:"auto", verify:"",         curl:false},
    xenforo: {path:"/login",         vmode:"auto", verify:"",         curl:false},
    symfony: {path:"/login",         vmode:"auto", verify:"",         curl:false},
    apijson: {path:"/api/auth/login",vmode:"url",  verify:"",         curl:false}
  };

  var css = `
  .av-topbar{position:fixed;left:0;right:0;top:0;height:48px;z-index:9997;display:flex;align-items:center;
    justify-content:space-between;padding:0 16px;pointer-events:none}
  .av-tools{display:flex;gap:8px;pointer-events:auto}
  .av-tbtn{width:38px;height:38px;border-radius:10px;border:1px solid rgba(127,127,127,.35);
    background:rgba(127,127,127,.12);color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.13s}
  html.av-dark .av-tbtn{color:#c2c8d2;border-color:#39414e;background:#1c222e}
  .av-tbtn:hover{color:#111;border-color:#999}
  html.av-dark .av-tbtn:hover{color:#fff;border-color:#5a6472}
  .av-tbtn:focus-visible{outline:2px solid #74d0d6;outline-offset:2px}
  .av-asst-grid{display:grid;grid-template-columns:auto minmax(70px,auto) 1fr auto;gap:8px 10px;align-items:center}
  .av-asst-grid label{font-size:13px;color:var(--text);font-weight:600;white-space:nowrap}
  .av-asst-val{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;padding:2px 7px;border-radius:6px;background:rgba(127,127,127,.12);color:var(--dim)}
  .av-asst-val.has{background:color-mix(in srgb,var(--ok,#2d7a4f) 18%,transparent);color:var(--ok,#2d7a4f);font-weight:600}
  .av-asst-grid input{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--border);border-radius:7px;background:rgba(130,130,130,.08);color:inherit;font-size:13px}
  .av-asst-grid .av-btn{padding:6px 12px;font-size:12.5px}
  .av-tbtn.accent{background:var(--ok,#2d7a4f);color:#fff;border-color:transparent}
  html:not(.av-dark) .av-tbtn.accent,html.av-dark .av-tbtn.accent{background:var(--ok,#2d7a4f);color:#fff;border-color:transparent}
  html:not(.av-dark) .av-tbtn.accent:hover,html.av-dark .av-tbtn.accent:hover{color:#fff;border-color:transparent;filter:brightness(1.08)}
  .av-spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(127,127,127,.3);border-top-color:currentColor;border-radius:50%;animation:av-spin .6s linear infinite;vertical-align:-2px;margin-right:4px}
  @keyframes av-spin{to{transform:rotate(360deg)}}
  /* schémas de couleurs des logs */
  #lg-out.lt-amber{background:#1a1206;color:#e8c98a}
  #lg-out.lt-amber .lg-ts{color:#8a6a38} #lg-out.lt-amber .lg-info{color:#d8a24a} #lg-out.lt-amber .lg-ok{color:#cBd14a} #lg-out.lt-amber .lg-site{color:#f0c060}
  #lg-out.lt-green{background:#03140a;color:#7fe0a0}
  #lg-out.lt-green .lg-ts{color:#3a7a52} #lg-out.lt-green .lg-info{color:#5fd0b0} #lg-out.lt-green .lg-ok{color:#74e08a} #lg-out.lt-green .lg-site{color:#9ef0b8}
  #lg-out.lt-blue{background:#070d1a;color:#a8c4e6}
  #lg-out.lt-blue .lg-ts{color:#4a5e84} #lg-out.lt-blue .lg-info{color:#6aa8e0} #lg-out.lt-blue .lg-ok{color:#74c98a} #lg-out.lt-blue .lg-site{color:#7fb0f0}
  #lg-out.lt-light{background:#f6f4ee;color:#33312c;border-color:#e0dacd}
  #lg-out.lt-light .lg-ts{color:#9a948a} #lg-out.lt-light .lg-info{color:#2a6fb0} #lg-out.lt-light .lg-ok{color:#2d7a4f} #lg-out.lt-light .lg-err{color:#c0392b} #lg-out.lt-light .lg-warn{color:#b07d2a} #lg-out.lt-light .lg-site{color:#9a5a16} #lg-out.lt-light .lg-dim{color:#8b857a}
  .av-siteicon{pointer-events:auto;display:none;align-items:center;justify-content:center}
  .av-siteicon img{width:44px;height:44px;border-radius:11px;object-fit:cover;cursor:pointer;
    border:1px solid rgba(127,127,127,.3);background:rgba(127,127,127,.08)}
  .av-fab{display:none}
  .av-overlay{position:fixed;inset:0;z-index:9999;background:rgba(8,10,14,.66);backdrop-filter:blur(3px);
    display:none;align-items:flex-start;justify-content:center;padding:42px 16px;overflow:auto}
  .av-overlay.open{display:flex}
  .av-modal{width:100%;max-width:720px;background:#171c26;color:#d8dde6;border:1px solid #2a3140;
    border-radius:16px;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 60px -20px #000}
  .av-modal.small{max-width:460px}
  .av-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #232a36}
  .av-head h2{margin:0;font:600 18px/1.2 'Space Grotesk',system-ui,sans-serif;color:#f0c485}
  .av-x{background:none;border:0;color:#8b93a3;font-size:22px;cursor:pointer;line-height:1}
  .av-x:hover{color:#d8dde6}
  .av-body{padding:18px 20px}
  .av-field{margin:0 0 13px;position:relative}
  .av-field label{display:block;font-size:12.5px;color:#8b93a3;margin:0 0 5px;font-weight:500}
  .av-field input,.av-field select,.av-field textarea{width:100%;background:#1c222e;border:1px solid #2a3140;
    border-radius:9px;color:#e6eaf1;font:14px/1.4 'JetBrains Mono',monospace;padding:9px 11px}
  .av-field input[type=color]{height:42px;padding:4px;cursor:pointer}
  .av-field textarea{min-height:74px;resize:vertical}
  .av-field input:focus,.av-field select:focus,.av-field textarea:focus{outline:none;border-color:#e3a857}
  .av-hint{font-size:11px;color:#6b7383;margin:4px 0 0}
  .av-row{display:flex;gap:11px}.av-row .av-field{flex:1}
  .av-ac{position:absolute;left:0;right:0;top:100%;z-index:5;background:#1c222e;border:1px solid #2a3140;
    border-radius:0 0 10px 10px;max-height:230px;overflow:auto;display:none;box-shadow:0 14px 30px -12px #000}
  .av-ac.show{display:block}
  .av-ac-item{padding:9px 12px;cursor:pointer;font-size:13.5px;display:flex;justify-content:space-between;gap:10px}
  .av-ac-item:hover,.av-ac-item.hl{background:#243040}
  .av-ac-item b{color:#e6eaf1;font-weight:600}
  .av-ac-item span{color:#6b7383;font-size:12px;font-family:'JetBrains Mono',monospace}
  .av-ac-tag{color:#74d0d6;font-size:11px;align-self:center}
  .av-summary{display:flex;align-items:center;gap:11px;background:rgba(127,207,159,.08);border:1px solid #2d7a4f;
    border-radius:10px;padding:10px 13px;margin:0 0 13px}
  .av-summary img{width:30px;height:30px;border-radius:7px;object-fit:cover;background:#1c222e}
  .av-summary b{color:#bfe6cd;font-size:14px}.av-summary span{color:#7fae8f;font-size:12px}
  .av-summary .av-chg{margin-left:auto;color:#74d0d6;font-size:12px;cursor:pointer;text-decoration:underline}
  .av-adv{margin:6px 0 2px;border-top:1px solid #232a36;padding-top:12px}
  .av-adv>summary{cursor:pointer;color:#74d0d6;font-size:13px;list-style:none;user-select:none}
  .av-adv>summary::-webkit-details-marker{display:none}
  .av-adv>summary::before{content:"▸ ";color:#6b7383}.av-adv[open]>summary::before{content:"▾ "}
  .av-checks{display:flex;flex-direction:column;gap:8px;margin:10px 0 2px}
  .av-check{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:#d8dde6;cursor:pointer}
  .av-check input{margin-top:2px;accent-color:#e3a857;width:auto}
  .av-check small{display:block;color:#6b7383;font-size:11.5px}
  .av-foot{display:flex;gap:10px;justify-content:flex-end;padding:16px 20px;border-top:1px solid #232a36}
  .av-btn{font:500 14px/1 Inter,system-ui,sans-serif;border-radius:9px;padding:10px 18px;cursor:pointer;border:1px solid transparent}
  .av-btn.ghost{background:none;border-color:#2a3140;color:#8b93a3}.av-btn.ghost:hover{color:#d8dde6;border-color:#3a4252}
  .av-btn.test{background:#74d0d6;color:#0f1218;font-weight:600}
  .av-btn.go{background:var(--ok,#2d7a4f);color:#fff;font-weight:600}
  .av-btn.fail{background:#e0796f;color:#0f1218;font-weight:600}
  .av-btn.danger{background:#e0796f;color:#0f1218;font-weight:600}
  .av-btn.save{background:var(--ok,#2d7a4f);color:#fff;font-weight:600}
  .av-btn:hover{filter:brightness(1.07)}.av-btn:disabled{opacity:.55;cursor:wait;filter:none}
  .av-msg{margin:0 20px;font-size:13.5px;color:#cfd5df}
  .av-result{margin:14px 20px 0;border-radius:10px;padding:12px 14px;font-size:13px;display:none}
  .av-result.show{display:block}
  .av-result.ok{background:rgba(127,207,159,.1);border:1px solid #7fcf9f;color:#bfe6cd}
  .av-result.ko{background:rgba(224,121,111,.1);border:1px solid #e0796f;color:#f0c3bd}
  .av-result pre{margin:8px 0 0;font:12px/1.5 'JetBrains Mono',monospace;color:#cfd5df;white-space:pre-wrap;max-height:240px;overflow:auto}
  .av-fav{display:flex;align-items:center;gap:12px}
  .av-fav img{width:40px;height:40px;border-radius:9px;border:1px solid #2a3140;object-fit:cover;background:#1c222e}
  .av-actions{display:inline-flex;gap:6px;vertical-align:middle;white-space:nowrap}
  .av-act{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;
    border:1px solid #2a3140;background:#1c222e;color:#8b93a3;cursor:pointer;padding:0;transition:.12s}
  .av-act:hover{color:var(--ok,#e0892b);border-color:var(--ok,#e0892b)}.av-act.on{color:var(--ok,#e0892b)}.av-act.off{color:#6b7383}
  .av-act.ed{color:#74d0d6}.av-act.de{color:#e0796f}
  @media(max-width:520px){.av-row{flex-direction:column;gap:0}}
  `;
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // thème sombre : surcharge des variables CSS du dashboard + correctifs hover
  var ds = document.createElement("style");
  ds.textContent = `
  html.av-dark{--bg:#14171c;--border:#2a2f37;--text:#e6eaf1;--dim:#8b93a3;--ko:#e0796f;--alert:#d6a86a;--row-ko-bg:#2a1d1d;}
  html.av-dark tbody tr:hover td{background:var(--row-hover,#283142) !important;}
  html.av-dark tr.row-ko:hover td{background:#321f1f !important;}
  html.av-dark tr.row-disabled:hover td{background:var(--row-hover,#283142) !important;}
  html.av-dark td.na{color:#555 !important;}`;
  document.head.appendChild(ds);

  // lignes d'échec / désactivées en gris (au lieu de rouge)
  var ng = document.createElement("style");
  ng.textContent = `
  tr.row-ko td{ background:rgba(130,130,130,.06) !important; color:var(--dim) !important; }
  tr.row-ko td a{ color:var(--dim) !important; }
  tr.row-ko:hover td{ background:rgba(130,130,130,.11) !important; }
  .dot-ko{ background:#9aa0a6 !important; }
  html.av-dark tr.row-ko:hover td{ background:rgba(170,170,170,.10) !important; }
  tr.row-maintenance td{ background:rgba(214,168,106,.08) !important; color:var(--dim) !important; }
  tr.row-maintenance td a{ color:var(--dim) !important; }
  tr.row-maintenance:hover td{ background:rgba(214,168,106,.14) !important; }
  tr.row-maintenance td.maint-info{ color:var(--alert,#b07d2a) !important; font-style:italic; }
  .dot-maintenance{ background:var(--alert,#d6a86a) !important; }
  html.av-dark tr.row-maintenance:hover td{ background:rgba(214,168,106,.16) !important; }`;
  document.head.appendChild(ng);

  // pastille « en ligne » verte pulsante, triangle d'alerte clignotant, en-têtes triables
  var stylInd = document.createElement("style");
  stylInd.textContent = `
  .dot-live{ background:#19b562 !important; animation:av-ok-ping 1.7s ease-out infinite; }
  @keyframes av-ok-ping{
    0%{ box-shadow:0 0 0 0 rgba(25,181,98,.55); }
    70%{ box-shadow:0 0 0 5px rgba(25,181,98,0); }
    100%{ box-shadow:0 0 0 0 rgba(25,181,98,0); } }
  .dot-pulse{ animation:av-soft-blink 1.6s ease-in-out infinite; }
  @keyframes av-soft-blink{ 0%,100%{opacity:1;} 50%{opacity:.42;} }
  .dot-wait{ background:#c9c3bb !important; animation:av-soft-blink 2s ease-in-out infinite; }
  .warn-tri{ display:inline-flex; width:14px; height:14px; flex-shrink:0; line-height:0; animation:av-warn-blink 1.05s ease-in-out infinite; }
  @keyframes av-warn-blink{ 0%,100%{opacity:1;} 50%{opacity:.22;} }
  thead th.av-sortable{ cursor:pointer; user-select:none; transition:color .12s; }
  thead th.av-sortable:hover{ color:var(--text); }
  thead th.sorted{ color:var(--text); }
  thead th .sort-arrow{ font-size:10px; }`;
  document.head.appendChild(stylInd);

  // modale & contrôles en thème CLAIR quand le dashboard est clair
  var lm = document.createElement("style");
  lm.textContent = `
  html:not(.av-dark) .av-modal{background:#fdfcfa;color:#1a1a1a;border-color:#e2ddd6;box-shadow:0 24px 60px -20px rgba(0,0,0,.22)}
  html:not(.av-dark) .av-head{border-bottom-color:#ece7df}
  html:not(.av-dark) .av-head h2{color:#b07d2a}
  html:not(.av-dark) .av-foot,html:not(.av-dark) .av-adv,html:not(.av-dark) .av-adv>summary{border-color:#ece7df}
  html:not(.av-dark) .av-field label,html:not(.av-dark) .av-hint,html:not(.av-dark) .av-check small,html:not(.av-dark) .av-x{color:#6b6560}
  html:not(.av-dark) .av-field input,html:not(.av-dark) .av-field select,html:not(.av-dark) .av-field textarea{background:#f4f1ea;border-color:#e2ddd6;color:#1a1a1a}
  html:not(.av-dark) .av-check span,html:not(.av-dark) .av-ac-item b{color:#1a1a1a}
  html:not(.av-dark) .av-btn.ghost{border-color:#ddd6cb;color:#6b6560}
  html:not(.av-dark) .av-ac{background:#fff;border-color:#e2ddd6}
  html:not(.av-dark) .av-ac-item:hover,html:not(.av-dark) .av-ac-item.hl{background:#f0ece4}
  html:not(.av-dark) .av-act{background:#f4f1ea;border-color:#e2ddd6}
  html:not(.av-dark) .av-tbtn{color:#6b6560;border-color:#d8d2c8;background:#efece6}
  html:not(.av-dark) .av-tbtn:hover{color:#1a1a1a;border-color:#b9b2a6}
  html:not(.av-dark) .av-summary{background:rgba(45,122,79,.08)}
  html:not(.av-dark) .av-result.ok{background:rgba(45,122,79,.08);color:#2d7a4f}
  html:not(.av-dark) .av-result pre{color:#3a3a3a}`;
  document.head.appendChild(lm);

  var cfgStyle = document.createElement("style");
  cfgStyle.textContent = `
  .av-switch{display:inline-flex;align-items:center;cursor:pointer;height:38px}
  .av-switch input{position:absolute;opacity:0;width:0;height:0}
  .av-sw-track{position:relative;width:50px;height:28px;border-radius:16px;background:#cdc8bb;transition:background .2s;display:inline-flex;align-items:center;border:1px solid rgba(0,0,0,.10)}
  html.av-dark .av-sw-track{background:#39414e;border-color:#2a3140}
  .av-sw-thumb{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .2s;z-index:1}
  .av-switch input:checked + .av-sw-track .av-sw-thumb{transform:translateX(22px)}
  .av-switch input:checked + .av-sw-track{background:var(--ok,#2d7a4f)}
  .av-sw-ic{position:absolute;top:0;bottom:0;display:flex;align-items:center;color:#fff;opacity:.8}
  .av-sw-ic svg{width:13px;height:13px}
  .av-sw-ic.sun{left:6px}.av-sw-ic.moon{right:6px}
  html:not(.av-dark) .av-sw-ic.sun{color:#8a6d2f}
  html:not(.av-dark) .av-sw-ic.moon{color:#a59f93}

  .cfg-page{position:fixed;inset:0;z-index:9990;display:none;overflow:auto;background:#14171d;color:#e6e9ef;font-family:inherit}
  html:not(.av-dark) .cfg-page{background:#f3f0e9;color:#23211d}
  .cfg-page.open{display:block}
  .cfg-shell{display:flex;min-height:100vh;width:100%;align-items:stretch}
  .cfg-side{width:248px;flex:0 0 248px;display:flex;flex-direction:column;gap:4px;padding:26px 18px;border-right:1px solid #262d38}
  html:not(.av-dark) .cfg-side{border-right-color:#e0dacd}
  .cfg-brand{display:flex;align-items:center;gap:12px;font-weight:700;letter-spacing:.16em;font-size:13px;color:#f0c485;margin-bottom:18px;text-transform:uppercase}
  html:not(.av-dark) .cfg-brand{color:#b07d2a}
  .cfg-brand img{width:52px;height:52px;object-fit:contain;background:transparent;border:0}
  .cfg-nav{display:flex;flex-direction:column;gap:3px;flex:1}
  .cfg-tab{text-align:left;padding:10px 13px;border-radius:9px;border:0;background:transparent;color:#aeb6c2;cursor:pointer;font-size:14px;font-family:inherit}
  .cfg-tab:hover{background:#1d2430;color:#fff}
  .cfg-tab.active{background:var(--ok,#2d7a4f);color:#fff;font-weight:600}
  html:not(.av-dark) .cfg-tab{color:#6b6560}
  html:not(.av-dark) .cfg-tab:hover{background:#eae5db;color:#1a1a1a}
  .cfg-back{margin-top:10px;width:100%}
  .cfg-main{flex:1;min-width:0;padding:28px 34px 60px}
  .cfg-sec{display:none}.cfg-sec.active{display:block}
  .cfg-sec h2{margin:0 0 18px;font-size:19px}
  .cfg-pre{background:#0e1014;color:#cdd3dc;border:1px solid #2a3140;border-radius:10px;padding:12px 14px;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:62vh;overflow:auto;margin:0}
  html:not(.av-dark) .cfg-pre{background:#fbfaf6;color:#33312c;border-color:#e0dacd}
  #lg-out{background:#0a0d12;color:#c6ccd6;border:1px solid #1b2230;max-height:none;height:calc(100vh - 248px);min-height:340px;border-radius:10px;font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;user-select:text;-webkit-user-select:text}
  html:not(.av-dark) #lg-out{background:#0a0d12;color:#c6ccd6;border-color:#1b2230}
  #lg-out .lg-ts{color:#5b6472}
  #lg-out .lg-info{color:#56b6d6}
  #lg-out .lg-ok{color:#74c98a}
  #lg-out .lg-err{color:#e0796f}
  #lg-out .lg-warn{color:#e3b341}
  #lg-out .lg-site{color:#e0a253;font-weight:600}
  #lg-out .lg-dim{color:#7d8694}
  .cfg-toolrow{display:flex;gap:8px;margin-bottom:10px;align-items:center}
  .cfg-toolrow select{padding:7px 10px;border-radius:8px;background:#1a202b;color:#e6e9ef;border:1px solid #2a3140}
  html:not(.av-dark) .cfg-toolrow select{background:#fff;color:#23211d;border-color:#d8d2c8}
  .cfg-actions{margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  .cfg-list{display:flex;flex-direction:column;gap:8px;margin-top:16px}
  .cfg-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #262d38;border-radius:10px;background:#1a202b}
  html:not(.av-dark) .cfg-row{background:#fbfaf6;border-color:#e6e0d3}
  .cfg-row .nm{flex:1;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #se-css{width:100%;box-sizing:border-box;background:#0e1014;color:#cdd3dc;border:1px solid #2a3140;border-radius:9px;padding:10px 12px;font:12.5px/1.5 ui-monospace,monospace;resize:vertical}
  html:not(.av-dark) #se-css{background:#fbfaf6;color:#33312c;border-color:#e0dacd}
  .av-switch-row{display:flex;align-items:center;gap:10px;cursor:pointer}
  .av-colgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:12px;transition:opacity .15s}
  .av-colgrid.off{opacity:.4;pointer-events:none;filter:grayscale(.5)}
  .av-colgrid input[type=color]{width:100%;height:38px;padding:2px;cursor:pointer}
  @media (max-width:640px){ .av-colgrid{grid-template-columns:repeat(2,1fr)} }
  .cfg-main .av-result{position:static;margin:0 0 16px}
  @media(max-width:720px){.cfg-shell{flex-direction:column}.cfg-side{width:auto;flex:none;border-right:0;border-bottom:1px solid #262d38;flex-direction:row;flex-wrap:wrap}.cfg-nav{flex-direction:row;flex-wrap:wrap}.cfg-back{width:auto}.cfg-main{padding:22px 18px 50px}}`;
  document.head.appendChild(cfgStyle);

  var AUTOVISIT_VER="80";
  try{ console.log("Autovisit addsite v"+AUTOVISIT_VER); }catch(e){}
  function el(html){var d=document.createElement("div");d.innerHTML=html.trim();return d.firstChild;}
  function post(url,obj,timeoutMs){
    var ctrl = (typeof AbortController!=="undefined") ? new AbortController() : null;
    var to = (ctrl && timeoutMs) ? setTimeout(function(){ try{ctrl.abort();}catch(e){} }, timeoutMs) : null;
    return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj||{}),signal:ctrl?ctrl.signal:undefined}).then(function(r){ if(to) clearTimeout(to); return r.text().then(function(t){try{return JSON.parse(t);}catch(e){return {ok:false,error:"Réponse invalide du service (HTTP "+r.status+", "+(t?"non-JSON":"vide")+")."};}}); }).catch(function(e){ if(to) clearTimeout(to); if(e&&e.name==="AbortError"){ return {ok:false,error:"Délai dépassé — le serveur n'a pas répondu (recharge la page : Ctrl+Maj+R)."}; } throw e; });
  }
  function esc(t){return (t||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  // /inspect peut renvoyer un 502/réponse non-JSON transitoire quand le service
  // vient d'être redémarré (déploiement) ou est surchargé. On réessaie alors
  // automatiquement quelques fois. `alive()` permet d'abandonner si la modale a
  // été fermée / un autre site ouvert entre-temps.
  function inspectPost(payload, tries, alive){
    tries = (tries==null) ? 3 : tries;
    function transient(j){ return j && j.ok===false && /HTTP\s*50\d|non-?JSON|\bvide\b|injoignable|Délai/i.test(j.error||""); }
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    return post("/inspect", payload).then(function(j){
      if(alive && !alive()) return j;
      if(transient(j) && tries>1){ return wait(1800).then(function(){ return (alive&&!alive())?j:inspectPost(payload, tries-1, alive); }); }
      return j;
    }).catch(function(e){
      if(tries>1 && (!alive || alive())){ return wait(1800).then(function(){ return inspectPost(payload, tries-1, alive); }); }
      throw e;
    });
  }

  /* ---------- TOOLBAR (boutons dans l'en-tête) ---------- */
  var tools = document.getElementById("tools-slot") || el('<div class="av-tools"></div>');
  if(!tools.parentNode) document.body.appendChild(tools);
  var themeSwitch = el('<label class="av-switch" title="Thème clair / sombre"><input type="checkbox" id="av-theme-cb"><span class="av-sw-track"><span class="av-sw-ic sun">'+ICON.sun+'</span><span class="av-sw-ic moon">'+ICON.moon+'</span><span class="av-sw-thumb"></span></span></label>');
  var bAdd = el('<button class="av-tbtn accent" type="button" title="Ajouter un site"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>');
  var bSettings = el('<button class="av-tbtn" type="button" title="Configuration">'+ICON.gear+'</button>');
  tools.appendChild(themeSwitch); tools.appendChild(bAdd); tools.appendChild(bSettings);
  var bLogout = el('<button class="av-tbtn" type="button" title="Se déconnecter" style="display:none">'+ICON.logout+'</button>');
  tools.appendChild(bLogout);
  bLogout.addEventListener("click", function(){ post("/auth/logout",{}).then(function(){ location.reload(); }); });

  var dashLogo = document.getElementById("dash-logo");
  var dashTitle = document.getElementById("dash-title");
  var brand = document.getElementById("brand");
  if(brand) brand.addEventListener("click", function(){ refresh(); });

  var settings = {name:"",url:"",accent:"#e0892b",dark:false,cron_hours:24,favicon:false};

  function applySettings(s){
    settings = s || settings;
    if (dashTitle && settings.name){ dashTitle.textContent = settings.name; document.title = settings.name; }
    if (settings.accent) document.documentElement.style.setProperty("--ok", settings.accent);
    document.documentElement.classList.toggle("av-dark", !!settings.dark);
    var _cb=document.getElementById("av-theme-cb"); if(_cb) _cb.checked = !!settings.dark;
    var _uc=document.getElementById("av-usercss");
    if(!_uc){ _uc=document.createElement("style"); _uc.id="av-usercss"; document.head.appendChild(_uc); }
    _uc.textContent = settings.css || "";
    if (settings.favicon) {
      var link = document.querySelector("link[rel~='icon']") || document.createElement("link");
      link.rel = "icon"; link.href = "/favicon.png?v=" + Date.now();
      if (!link.parentNode) document.head.appendChild(link);
      if (dashLogo){
        dashLogo.src = "/favicon.png?v=" + Date.now();
        dashLogo.style.display = "block";
        dashLogo.onerror = function(){ dashLogo.style.display = "none"; };
      }
    } else if (dashLogo){ dashLogo.style.display = "none"; }
  }
  function loadSettings(){
    return fetch("/settings").then(function(r){return r.json();}).then(function(j){
      if (j && j.ok) applySettings(j.settings);
    }).catch(function(){});
  }

  themeSwitch.querySelector("#av-theme-cb").addEventListener("change", function(){
    settings.dark = this.checked; applySettings(settings);
    post("/settings", {dark: settings.dark});
  });

  /* ---------- AUTHENTIFICATION ---------- */
  var authState = {configured:false, twofa:false, authed:false};
  var lgStyle = document.createElement("style");
  lgStyle.textContent = `
  #lg-page{position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:20px;
    background:radial-gradient(1100px 560px at 50% -12%, rgba(176,125,42,.20), transparent), #14171d;font-family:inherit}
  #lg-page.open{display:flex}
  .lg-card{width:100%;max-width:380px;background:#1b2029;border:1px solid #2a3140;border-radius:18px;
    padding:34px 30px 30px;box-shadow:0 30px 80px -24px rgba(0,0,0,.6)}
  .lg-brand{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:24px}
  .lg-logo{width:56px;height:56px;border-radius:14px;object-fit:contain;background:transparent}
  .lg-name{font-size:21px;font-weight:700;letter-spacing:.22em;color:#f0c485}
  .lg-sub{font-size:12.5px;color:#8b93a3}
  .lg-field{margin-bottom:14px}
  .lg-field label{display:block;font-size:12px;color:#8b93a3;margin-bottom:6px}
  .lg-field input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;border:1px solid #2a3140;background:#11151c;color:#e6eaf1;font-size:15px;outline:none}
  .lg-field input:focus{border-color:var(--ok,#e0892b)}
  .lg-remember{display:flex;align-items:center;gap:8px;font-size:13px;color:#cdd3dd;margin:2px 0 18px;cursor:pointer;user-select:none}
  .lg-remember input{width:15px;height:15px;accent-color:var(--ok,#e0892b)}
  .lg-btn{width:100%;padding:12px;border:none;border-radius:10px;background:var(--ok,#e0892b);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
  .lg-btn:disabled{opacity:.6;cursor:default}
  .lg-msg{margin-top:12px;font-size:13px;text-align:center;min-height:16px;color:#8b93a3}
  .lg-msg.ko{color:#e0796f}
  html:not(.av-dark) #lg-page{background:radial-gradient(1100px 560px at 50% -12%, rgba(176,125,42,.14), transparent), #f3f1ec}
  html:not(.av-dark) .lg-card{background:#fff;border-color:#e6e0d7;box-shadow:0 30px 80px -28px rgba(0,0,0,.25)}
  html:not(.av-dark) .lg-name{color:#b07d2a}
  html:not(.av-dark) .lg-sub,html:not(.av-dark) .lg-field label{color:#6b6560}
  html:not(.av-dark) .lg-field input{background:#f6f4ef;border-color:#e2ddd6;color:#1a1a1a}
  html:not(.av-dark) .lg-remember{color:#3a3a3a}`;
  document.head.appendChild(lgStyle);
  var loginOv = el(`
  <div id="lg-page">
    <div class="lg-card" role="dialog" aria-modal="true" aria-label="Connexion">
      <div class="lg-brand">
        <img class="lg-logo" id="lg-logo" alt="" style="display:none">
        <div class="lg-name" id="lg-name">Autovisit</div>
        <div class="lg-sub">Accès au tableau de bord</div>
      </div>
      <div class="lg-field"><label>Mot de passe</label><input id="lg-pass" type="password" autocomplete="current-password"></div>
      <div class="lg-field" id="lg-codefield" style="display:none"><label>Code 2FA</label><input id="lg-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456"></div>
      <label class="lg-remember"><input type="checkbox" id="lg-remember" checked> Se souvenir de moi</label>
      <button class="lg-btn" id="lg-go" type="button">Se connecter</button>
      <div class="lg-msg" id="lg-result"></div>
    </div>
  </div>`);
  document.body.appendChild(loginOv);
  function LQ(s){ return loginOv.querySelector(s); }
  var setupMode=false;   // true = premier lancement : on DÉFINIT le mot de passe au lieu de se connecter
  function showLogin(setup){
    setupMode=!!setup;
    var ic=document.querySelector('link[rel*="icon"]'); var lo=LQ("#lg-logo");
    if(ic&&ic.href){ lo.src=ic.href; lo.style.display="block"; }
    var t=(document.title||"").split("—")[0].trim(); if(t) LQ("#lg-name").textContent=t;
    LQ("#lg-pass").setAttribute("autocomplete", setupMode?"new-password":"current-password");
    LQ("#lg-go").textContent = setupMode?"Définir le mot de passe":"Se connecter";
    LQ("#lg-codefield").style.display="none";
    var rem=LQ("#lg-remember").parentNode; if(rem) rem.style.display=setupMode?"none":"";
    LQ("#lg-result").className="lg-msg";
    LQ("#lg-result").textContent=setupMode?"Aucun mot de passe défini : protège l'instance avant d'aller plus loin (8 caractères min).":"";
    loginOv.classList.add("open"); setTimeout(function(){ LQ("#lg-pass").focus(); }, 50);
  }
  function updateAuthBtn(){ bLogout.style.display = (authState.configured && authState.authed) ? "flex" : "none"; }
  function doLogin(){
    var btn=LQ("#lg-go");
    if(setupMode){
      btn.disabled=true; btn.textContent="…";
      post("/auth/password",{new:LQ("#lg-pass").value}).then(function(j){
        btn.disabled=false; btn.textContent="Définir le mot de passe";
        if(j.ok){ loginOv.classList.remove("open"); authState.configured=true; authState.authed=true; setupMode=false; updateAuthBtn(); init2(); }
        else { LQ("#lg-result").className="lg-msg ko"; LQ("#lg-result").textContent=j.error||"Échec."; }
      }).catch(function(){ btn.disabled=false; btn.textContent="Définir le mot de passe"; LQ("#lg-result").className="lg-msg ko"; LQ("#lg-result").textContent="Service injoignable."; });
      return;
    }
    btn.disabled=true; btn.textContent="…";
    post("/auth/login",{password:LQ("#lg-pass").value, code:LQ("#lg-code").value, remember:LQ("#lg-remember").checked}).then(function(j){
      btn.disabled=false; btn.textContent="Se connecter";
      if(j.ok){ loginOv.classList.remove("open"); authState.authed=true; updateAuthBtn(); init2(); }
      else if(j.need_2fa){ LQ("#lg-codefield").style.display="block"; LQ("#lg-code").focus();
        LQ("#lg-result").className="lg-msg"+(j.error?" ko":""); LQ("#lg-result").textContent=j.error||"Entre le code de ton application 2FA."; }
      else { LQ("#lg-result").className="lg-msg ko"; LQ("#lg-result").textContent=j.error||"Échec de connexion."; }
    }).catch(function(){ btn.disabled=false; btn.textContent="Se connecter"; LQ("#lg-result").className="lg-msg ko"; LQ("#lg-result").textContent="Service injoignable."; });
  }
  LQ("#lg-go").addEventListener("click", doLogin);
  loginOv.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); doLogin(); } });

  /* ---------- MODALE PARAMÈTRES ---------- */
  var sov = el(`
  <div class="cfg-page" role="dialog" aria-modal="true">
    <div class="cfg-shell">
      <aside class="cfg-side">
        <div class="cfg-brand"><img id="cfg-logo" alt="" src="/favicon.png?v=0" onerror="this.style.display='none'"><span>Configuration</span></div>
        <nav class="cfg-nav">
          <button class="cfg-tab active" type="button" data-tab="apparence">Apparence</button>
          <button class="cfg-tab" type="button" data-tab="logs">Logs</button>
          <button class="cfg-tab" type="button" data-tab="icones">Icônes</button>
          <button class="cfg-tab" type="button" data-tab="stats">Statistiques</button>
          <button class="cfg-tab" type="button" data-tab="securite">Sécurité</button>
        </nav>
        <button class="av-btn ghost cfg-back" type="button" id="cfg-back">← Retour au dashboard</button>
      </aside>
      <main class="cfg-main">
        <div class="av-result" id="se-result"></div>

        <section class="cfg-sec active" data-sec="apparence">
          <h2>Apparence & général</h2>
          <div class="av-field"><label>Nom du dashboard</label><input id="se-name" type="text" placeholder="Autovisit"></div>
          <div class="av-field"><label>URL du site (lien du titre, optionnel)</label><input id="se-url" type="text" placeholder="https://…"></div>
          <div class="av-field"><label>Logo / favicon (favicon généré automatiquement)</label>
            <div class="av-fav"><img id="se-favimg" alt="" src="/favicon.png?v=0" onerror="this.style.visibility='hidden'"><input id="se-favfile" type="file" accept="image/*"></div></div>
          <div class="av-row">
            <div class="av-field"><label>Couleur d'accent</label><input id="se-accent" type="color" value="#2d7a4f"></div>
            <div class="av-field"><label>Fréquence (cron)</label>
              <select id="se-cron"><option value="24">Toutes les 24 h</option><option value="48">Toutes les 48 h</option><option value="72">Toutes les 72 h</option></select></div>
          </div>
          <label class="av-check"><input type="checkbox" id="se-dark"><span>Thème sombre par défaut</span></label>
          <div class="av-field" style="margin-top:16px"><label>CSS personnalisé (avancé)</label>
            <textarea id="se-css" rows="7" spellcheck="false" placeholder=":root{ --ok:#2d7a4f; }"></textarea>
            <p class="av-hint">Injecté en direct dans la page. Laisse vide pour le style par défaut.</p></div>
          <div class="cfg-actions"><button class="av-btn save" type="button" id="se-save">Enregistrer</button></div>
        </section>

        <section class="cfg-sec" data-sec="logs">
          <h2>Logs</h2>
          <div class="cfg-toolrow"><select id="lg-file"></select><button class="av-btn ghost" type="button" id="lg-reload">Recharger</button><select id="lg-theme" title="Couleur du terminal"><option value="">Sombre (défaut)</option><option value="lt-green">Vert terminal</option><option value="lt-amber">Ambre</option><option value="lt-blue">Bleu nuit</option><option value="lt-light">Clair</option></select><label class="av-switch-row" style="margin:0 0 0 6px"><span class="av-switch"><input type="checkbox" id="lg-live"><span class="av-sw-track"><span class="av-sw-thumb"></span></span></span><span>Live</span></label></div>
          <pre class="cfg-pre" id="lg-out">…</pre>
        </section>

        <section class="cfg-sec" data-sec="icones">
          <h2>Icônes des trackers</h2>
          <p class="av-hint">Récupère le favicon manquant de chaque site depuis son domaine (le bot a accès à Internet). Les icônes déjà présentes sont conservées, sauf si tu forces la mise à jour.</p>
          <label class="av-check"><input type="checkbox" id="ic-force"><span>Forcer (re-télécharger même celles déjà présentes)</span></label>
          <div class="cfg-actions"><button class="av-btn save" type="button" id="ic-run">Mettre à jour les icônes</button></div>
          <pre class="cfg-pre" id="ic-out" style="display:none"></pre>
        </section>

        <section class="cfg-sec" data-sec="stats">
          <h2>Statistiques</h2>
          <p class="av-hint">Réactualise les stats en cas d'échec (N/A). « Réactualiser » revisite le site ; « Inspecter » montre ce que le bot reçoit réellement.</p>
          <div class="cfg-actions"><button class="av-btn save" type="button" id="st-all">Tout réactualiser</button><span class="av-hint" id="st-allnote"></span></div>
          <div class="cfg-list" id="st-list"></div>
        </section>

        <section class="cfg-sec" data-sec="securite">
          <h2>Sécurité (connexion + 2FA)</h2>
          <div id="se-pwblock">
            <div class="av-field" id="se-curblock" style="display:none"><label>Mot de passe actuel</label><input id="se-cur" type="password" autocomplete="current-password"></div>
            <div class="av-field"><label id="se-newlabel">Définir un mot de passe</label><input id="se-new" type="password" autocomplete="new-password" placeholder="min. 4 caractères"></div>
            <button class="av-btn save" type="button" id="se-pwbtn">Enregistrer le mot de passe</button>
          </div>
          <div id="se-2fablock" style="margin-top:18px;display:none">
            <p class="av-hint" id="se-2fastate" style="margin:0 0 8px"></p>
            <div id="se-2fasetup" style="display:none">
              <p class="av-hint" style="margin:0 0 6px">Scanne ce code dans ton app (ou saisis le secret), puis entre le code à 6 chiffres :</p>
              <div class="av-field"><label>Secret</label><input id="se-2fasecret" type="text" readonly></div>
              <div class="av-field"><label>Code de vérification</label><input id="se-2facode" inputmode="numeric" placeholder="123456"></div>
            </div>
            <button class="av-btn test" type="button" id="se-2fabtn">Activer le 2FA</button>
          </div>
        </section>
      </main>
    </div>
  </div>`);
  document.body.appendChild(sov);
  function SQ(s){return sov.querySelector(s);}

  function setTab(tab){
    sov.querySelectorAll(".cfg-tab").forEach(function(x){ x.classList.toggle("active", x.getAttribute("data-tab")===tab); });
    sov.querySelectorAll(".cfg-sec").forEach(function(s){ s.classList.toggle("active", s.getAttribute("data-sec")===tab); });
    if(tab!=="logs"){ stopLive(); var lv=SQ("#lg-live"); if(lv) lv.checked=false; }
    if(tab==="logs") loadLogs();
    if(tab==="stats") buildStatsList();
  }
  function openSettings(){
    fetch("/settings").then(function(r){return r.json();}).then(function(j){
      var s = (j&&j.ok)?j.settings:settings;
      SQ("#se-name").value = s.name||""; SQ("#se-url").value = s.url||"";
      SQ("#se-accent").value = s.accent||"#e0892b"; SQ("#se-cron").value = String(s.cron_hours||24);
      SQ("#se-dark").checked = !!s.dark; SQ("#se-css").value = s.css||"";
      var img=SQ("#se-favimg"); img.style.visibility = s.favicon?"visible":"hidden";
      var clogo=SQ("#cfg-logo"); if(s.favicon){ clogo.style.display="block"; clogo.src="/favicon.png?v="+Date.now(); } else clogo.style.display="none";
      if (s.favicon) img.src = "/favicon.png?v="+Date.now();
      SQ("#se-result").className="av-result"; SQ("#se-favfile").value="";
      refreshSecurityUI();
      setTab("apparence");
      sov.classList.add("open"); document.body.style.overflow="hidden";
    }).catch(function(){ sov.classList.add("open"); });
  }
  function closeSettings(){ sov.classList.remove("open"); document.body.style.overflow=""; stopLive(); var lv=SQ("#lg-live"); if(lv) lv.checked=false; applySettings(settings); }
  function readFile(file){ return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=rej;r.readAsDataURL(file);}); }

  SQ("#se-favfile").addEventListener("change", function(){
    var f=this.files&&this.files[0]; if(!f) return;
    readFile(f).then(function(d){ var img=SQ("#se-favimg"); img.src=d; img.style.visibility="visible"; });
  });
  bSettings.addEventListener("click", openSettings);
  SQ("#cfg-back").addEventListener("click", closeSettings);
  SQ("#se-accent").addEventListener("input", function(){ document.documentElement.style.setProperty("--ok", this.value); });
  sov.querySelectorAll(".cfg-tab").forEach(function(b){
    b.addEventListener("click", function(){ setTab(b.getAttribute("data-tab")); });
  });
  SQ("#se-save").addEventListener("click", function(){
    var btn=this; btn.disabled=true; btn.textContent="…";
    var payload={name:SQ("#se-name").value.trim(),url:SQ("#se-url").value.trim(),
      accent:SQ("#se-accent").value,dark:SQ("#se-dark").checked,cron_hours:parseInt(SQ("#se-cron").value,10),
      css:SQ("#se-css").value};
    var f=SQ("#se-favfile").files&&SQ("#se-favfile").files[0];
    var chain = f ? readFile(f).then(function(d){return post("/favicon",{data:d});}) : Promise.resolve({ok:true});
    chain.then(function(){ return post("/settings", payload); }).then(function(j){
      btn.disabled=false; btn.textContent="Enregistrer";
      if (j&&j.ok){ applySettings(j.settings); if(f){ settings.favicon=true; var cl=SQ("#cfg-logo"); cl.style.display="block"; cl.src="/favicon.png?v="+Date.now(); }
        SQ("#se-result").className="av-result show ok"; SQ("#se-result").textContent="Enregistré."; }
      else { SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Erreur : "+((j&&j.error)||"inconnue"); }
    }).catch(function(){ btn.disabled=false; btn.textContent="Enregistrer";
      SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Service injoignable."; });
  });

  /* ---------- SECTIONS DE CONFIG (logs / icônes / stats) ---------- */
  function colorizeLog(text){
    return (text||"").split("\n").map(function(ln){
      var m=ln.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\S+)\s+([\s\S]*)$/);
      if(!m){ return '<span class="lg-dim">'+esc(ln)+'</span>'; }
      var ts=m[1], lvl=m[2], msg=m[3];
      var lvlCls="lg-info";
      if(/ECHEC|ERROR|ERREUR|KO|FAIL/i.test(lvl)) lvlCls="lg-err";
      else if(/WARN|ATTEN/i.test(lvl)) lvlCls="lg-warn";
      else if(/^OK$/i.test(lvl)) lvlCls="lg-ok";
      var msgCls="";
      if(/(echec|échec|erreur|error|invalide|introuvable|fail|refus|\bKO\b|N\/A)/i.test(msg)) msgCls="lg-err";
      else if(/(\bOK\b|reussie|réussie|succes|succès)/i.test(msg)) msgCls="lg-ok";
      var emsg=esc(msg).replace(/\[([^\]]+)\]/g,'<span class="lg-site">[$1]</span>');
      if(msgCls) emsg='<span class="'+msgCls+'">'+emsg+'</span>';
      return '<span class="lg-ts">'+esc(ts)+'</span> <span class="'+lvlCls+'">'+esc(lvl)+'</span> '+emsg;
    }).join("\n");
  }
  var lgBusy=false;
  function loadLogs(file){
    var out=SQ("#lg-out"); if(!out.innerHTML) out.textContent="Chargement…";
    // Ne pas réécrire le contenu pendant que l'utilisateur sélectionne du texte :
    // sinon le rafraîchissement (live) efface la sélection en cours.
    try{ var sel=window.getSelection(); if(sel && !sel.isCollapsed && sel.rangeCount && out.contains(sel.getRangeAt(0).commonAncestorContainer)){ return; } }catch(e){}
    if(lgBusy) return;   // évite d'empiler des requêtes /logs (sature les connexions)
    lgBusy=true;
    fetch("/logs"+(file?("?file="+encodeURIComponent(file)):"")).then(function(r){return r.json();}).then(function(j){
      lgBusy=false;
      if(!j||!j.ok){ out.textContent="(indisponible)"; return; }
      var sel=SQ("#lg-file");
      if(sel && !sel.dataset.filled && j.files && j.files.length){
        sel.innerHTML=j.files.map(function(f){return '<option'+(f===j.file?' selected':'')+'>'+esc(f)+'</option>';}).join("");
        sel.dataset.filled="1";
      }
      var atBottom = (out.scrollHeight - out.scrollTop - out.clientHeight) < 40;
      out.innerHTML = (j.log && j.log.trim()) ? colorizeLog(j.log) : '<span class="lg-dim">(journal vide)</span>';
      if(atBottom) out.scrollTop = out.scrollHeight;
    }).catch(function(){ lgBusy=false; out.textContent="(service injoignable)"; });
  }
  SQ("#lg-reload").addEventListener("click", function(){ loadLogs(SQ("#lg-file").value); });
  SQ("#lg-file").addEventListener("change", function(){ loadLogs(this.value); });
  var lgTimer=null;
  function stopLive(){ if(lgTimer){ clearInterval(lgTimer); lgTimer=null; } }
  function startLive(){ stopLive(); loadLogs(SQ("#lg-file").value); lgTimer=setInterval(function(){ loadLogs(SQ("#lg-file").value); }, 3000); }
  SQ("#lg-live").addEventListener("change", function(){ if(this.checked) startLive(); else stopLive(); });
  (function(){ var sel=SQ("#lg-theme"), out=SQ("#lg-out"); if(!sel||!out) return;
    function applyLogTheme(v){ out.className=out.className.replace(/\blt-\S+/g,"").replace(/\s+/g," ").trim(); if(v) out.classList.add(v); }
    var saved=""; try{ saved=localStorage.getItem("autovisit_log_theme")||""; }catch(e){}
    sel.value=saved; applyLogTheme(saved);
    sel.addEventListener("change", function(){ try{ localStorage.setItem("autovisit_log_theme", this.value); }catch(e){} applyLogTheme(this.value); });
  })();

  function siteDomain(s){
    var url=(s.url||"").toLowerCase(), best=null;
    TRACKERS.forEach(function(t){ if(t.d&&url.indexOf(t.d.toLowerCase())>=0){ if(!best||t.d.length>best.d.length) best=t; }});
    if(best) return best.d;
    try{ return new URL(/^https?:/.test(s.url)?s.url:("https://"+s.url)).hostname; }catch(e){ return ""; }
  }
  SQ("#ic-run").addEventListener("click", function(){
    var btn=this, out=SQ("#ic-out"); btn.disabled=true; var old=btn.textContent; btn.textContent="Récupération…";
    var targets=[];
    (lastSites||[]).forEach(function(s){ var d=siteDomain(s); if(d) targets.push({slug:(s.name||"").toLowerCase(), domain:d}); });
    post("/favsync",{targets:targets, force:SQ("#ic-force").checked}).then(function(j){
      btn.disabled=false; btn.textContent=old; out.style.display="block";
      if(!j||!j.ok){ out.textContent="Erreur : "+((j&&j.error)||"inconnue"); return; }
      var got=j.results.filter(function(r){return r.ok&&!r.skipped;}).length;
      var sk=j.results.filter(function(r){return r.skipped;}).length;
      var ko=j.results.filter(function(r){return !r.ok;});
      out.textContent="Récupérées : "+got+"   ·   déjà présentes : "+sk+(ko.length?("   ·   échecs : "+ko.map(function(r){return r.slug;}).join(", ")):"");
      iconBust=Date.now(); refresh();
    }).catch(function(){ btn.disabled=false; btn.textContent=old; out.style.display="block"; out.textContent="Service injoignable."; });
  });

  function buildStatsList(){
    var box=SQ("#st-list"); box.innerHTML="";
    (lastSites||[]).slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}).forEach(function(s){
      var nm=(s.name||""), slug=nm.toLowerCase();
      var row=el('<div class="cfg-row"><span class="nm">'+esc(nm)+'</span></div>');
      var bR=el('<button class="av-btn ghost" type="button">Réactualiser</button>');
      var bI=el('<button class="av-btn ghost" type="button">Inspecter</button>');
      var bRes=el('<button class="av-btn ghost" type="button" title="Restaurer la config de stats d\'avant ta dernière modification">↩ Restaurer</button>');
      var note=el('<span class="av-hint" style="margin-left:8px"></span>');
      bR.addEventListener("click", function(){
        bR.disabled=true; var o=bR.textContent; bR.innerHTML='<span class="av-spin"></span>Réactualisation…';
        post("/revisit",{slug:slug}).then(function(){ bR.disabled=false; bR.textContent=o; refresh(); })
          .catch(function(){ bR.disabled=false; bR.textContent=o; });
      });
      bI.addEventListener("click", function(){ openInspect(slug, nm); });
      bRes.addEventListener("click", function(){
        if(!window.confirm("Restaurer la sauvegarde (config d'avant ta dernière modification) de « "+nm+" » ?")) return;
        bRes.disabled=true; var o=bRes.textContent; bRes.innerHTML='<span class="av-spin"></span>'; note.style.color=""; note.textContent="";
        post("/siterestore",{slug:slug},12000).then(function(j){
          bRes.disabled=false; bRes.textContent=o;
          if(!j||!j.ok){ note.style.color="var(--bad,#e0796f)"; note.textContent=(j&&j.error)||"Erreur"; return; }
          note.style.color="var(--ok,#2d7a4f)"; note.textContent="✓ restauré ["+((j.keys&&j.keys.length)?j.keys.join(", "):"")+"]";
          post("/revisit",{slug:slug}).catch(function(){});
          refresh(); setTimeout(refresh,6000); setTimeout(refresh,15000);
        }).catch(function(){ bRes.disabled=false; bRes.textContent=o; note.style.color="var(--bad,#e0796f)"; note.textContent="Service injoignable."; });
      });
      row.appendChild(bR); row.appendChild(bI); row.appendChild(bRes); row.appendChild(note); box.appendChild(row);
    });
    if(!(lastSites||[]).length) box.innerHTML='<p class="av-hint">Aucun site pour l\'instant.</p>';
  }
  SQ("#st-all").addEventListener("click", function(){
    var btn=this; btn.disabled=true; var o=btn.textContent; btn.innerHTML='<span class="av-spin"></span>En cours…';
    SQ("#st-allnote").textContent="Réactualisation de tous les sites… (peut prendre plusieurs minutes)";
    post("/refreshall",{}).then(function(){
      var poll=setInterval(function(){
        fetch("/refreshstate").then(function(r){return r.json();}).then(function(st){
          if(st && !st.running){ clearInterval(poll); btn.disabled=false; btn.textContent=o; SQ("#st-allnote").textContent="Terminé."; refresh(); }
        }).catch(function(){});
      }, 4000);
    }).catch(function(){ btn.disabled=false; btn.textContent=o; SQ("#st-allnote").textContent="Service injoignable."; });
  });

  function refreshSecurityUI(){
    var configured=authState.configured, twofa=authState.twofa;
    SQ("#se-curblock").style.display = configured ? "block" : "none";
    SQ("#se-newlabel").textContent = configured ? "Nouveau mot de passe" : "Définir un mot de passe";
    SQ("#se-cur").value=""; SQ("#se-new").value="";
    SQ("#se-2fablock").style.display = configured ? "block" : "none";
    SQ("#se-2fasetup").style.display="none"; SQ("#se-2facode").value="";
    SQ("#se-2fastate").textContent = twofa ? "2FA activé." : "2FA désactivé.";
    SQ("#se-2fabtn").textContent = twofa ? "Désactiver le 2FA" : "Activer le 2FA";
    SQ("#se-2fabtn").className = "av-btn "+(twofa?"ghost":"test"); SQ("#se-2fabtn").style.padding="8px 14px";
  }
  SQ("#se-pwbtn").addEventListener("click", function(){
    var btn=this; btn.disabled=true;
    post("/auth/password",{current:SQ("#se-cur").value,new:SQ("#se-new").value}).then(function(j){
      btn.disabled=false;
      if(j.ok){ authState.configured=true; updateAuthBtn(); refreshSecurityUI();
        SQ("#se-result").className="av-result show ok"; SQ("#se-result").textContent="Mot de passe enregistré."; }
      else { SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Erreur : "+(j.error||""); }
    }).catch(function(){ btn.disabled=false; SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Service injoignable."; });
  });
  SQ("#se-2fabtn").addEventListener("click", function(){
    var btn=this;
    if(authState.twofa){ // désactiver
      btn.disabled=true;
      post("/auth/2fa/disable",{}).then(function(j){ btn.disabled=false; if(j.ok){ authState.twofa=false; refreshSecurityUI(); } });
      return;
    }
    if(SQ("#se-2fasetup").style.display==="none"){ // lancer la config
      btn.disabled=true;
      post("/auth/2fa/init",{}).then(function(j){ btn.disabled=false;
        if(j.ok){ SQ("#se-2fasecret").value=j.secret; SQ("#se-2fasetup").style.display="block"; btn.textContent="Confirmer le code"; SQ("#se-2facode").focus(); }
        else { SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Erreur : "+(j.error||""); }
      }).catch(function(){ btn.disabled=false; });
    } else { // confirmer le code
      btn.disabled=true;
      post("/auth/2fa/enable",{code:SQ("#se-2facode").value}).then(function(j){ btn.disabled=false;
        if(j.ok){ authState.twofa=true; refreshSecurityUI(); SQ("#se-result").className="av-result show ok"; SQ("#se-result").textContent="2FA activé."; }
        else { SQ("#se-result").className="av-result show ko"; SQ("#se-result").textContent="Erreur : "+(j.error||""); }
      }).catch(function(){ btn.disabled=false; });
    }
  });

  /* ---------- MODALE AJOUT / ÉDITION ---------- */
  var ov = el(`
  <div class="av-overlay"><div class="av-modal" role="dialog" aria-modal="true">
    <div class="av-head"><h2 id="av-title">Ajouter un site</h2><button class="av-x" type="button" aria-label="Fermer">×</button></div>
    <div class="av-body">
      <div class="av-field"><label id="av-namelabel">Tracker <span style="color:#6b7383">— tape le nom (ex. The Old School)</span></label>
        <input id="av-name" type="text" placeholder="The Old School…" autocomplete="off">
        <div class="av-ac" id="av-ac"></div></div>
      <p class="av-hint" id="av-manualrow" style="margin:-6px 0 4px">Pas dans la liste ? <a id="av-manual" href="#" style="color:#74d0d6">Configuration manuelle →</a></p>

      <div id="av-config" style="display:none">
        <div id="av-summary" class="av-summary" style="display:none"></div>
        <div class="av-row">
          <div class="av-field" id="av-userfield"><label id="av-userlabel">Identifiant</label><input id="av-user" type="text" autocomplete="off"></div>
          <div class="av-field"><label id="av-passlabel">Mot de passe</label><input id="av-pass" type="password" autocomplete="new-password"></div>
        </div>
        <p class="av-hint" id="av-authswitch" style="margin:-4px 0 10px"><a href="#" id="av-tocookie" style="color:#74d0d6">🍪 Le tracker bloque (captcha, Cloudflare…) ? Se connecter par cookies de session →</a></p>
        <div id="av-cookieblock" style="display:none">
          <div class="av-field"><label>Cookies de session</label><textarea id="av-cookies" rows="4" placeholder='Colle le JSON exporté ([{"name":"…","value":"…"}]) OU la chaîne brute « nom=valeur; nom2=valeur2 »'></textarea></div>
          <div class="av-field"><label>User-Agent (celui du navigateur d'où viennent les cookies)</label><input id="av-ua" type="text" autocomplete="off" placeholder="Mozilla/5.0 ..."></div>
        </div>
        <div class="av-field" id="av-2farow" style="display:none"><label>Secret 2FA (base32)</label><input id="av-totp" type="text" placeholder="SECRET_BASE32 de ton app d'authentification" autocomplete="off"><p class="av-hint">Ce tracker demande un code 2FA. Colle ici le <b>secret</b> (la clé base32 affichée à l'activation du 2FA, ex. <code>JBSWY3DP…</code>) — pas un code à 6 chiffres : le bot tournant en continu, il génère lui-même le code à chaque visite.</p></div>
        <details class="av-adv" id="av-adv"><summary id="av-advsum">Configuration du tracker (modifier)</summary>
          <div class="av-field"><label>Domaine (sans https://)</label><input id="av-domain" type="text" placeholder="theoldschool.cc" autocomplete="off"></div>
          <div class="av-row">
            <div class="av-field"><label>Plateforme</label>
              <select id="av-platform">
                <option value="form">Form classique (POST)</option>
                <option value="unit3d">UNIT3D / Laravel</option>
                <option value="gazelle">Gazelle</option>
                <option value="aspnet">ASP.NET</option>
                <option value="xenforo">XenForo</option>
                <option value="symfony">Symfony</option>
                <option value="apijson">API JSON</option>
              </select></div>
            <div class="av-field"><label>Vérifier la connexion via</label>
              <select id="av-vmode"><option value="auto">Détection automatique</option><option value="kw">Mot-clé dans la page (HTML)</option><option value="url">Texte dans l'URL après login</option></select></div>
          </div>
          <div class="av-field"><label id="av-verifylabel">Mot-clé de succès</label><input id="av-verify" type="text" placeholder="(défaut : ton pseudo)" autocomplete="off"><p class="av-hint" id="av-verifyhint"></p></div>
          <div class="av-field"><label>Chemin de login</label><input id="av-path" type="text" placeholder="/login"></div>
          <div class="av-field"><label>Stats (JSON de regex appliquées au HTML connecté)</label><textarea id="av-stats" placeholder='{ "ratio": "Ratio:\\\\s*([\\\\d.]+)" }'></textarea><p class="av-hint" id="av-statshint">Laisse vide si tu ne veux pas de stats. Pré-rempli pour un tracker connu.</p></div>
          <div class="av-checks">
            <label class="av-check"><input type="checkbox" id="av-curl"><span>Cloudflare léger (curl_cffi)<small>empreinte TLS Firefox</small></span></label>
            <label class="av-check"><input type="checkbox" id="av-pw"><span>Captcha invisible (Playwright)<small>Firefox headless</small></span></label>
            <label class="av-check"><input type="checkbox" id="av-cf"><span>Challenge Cloudflare (Byparr)<small>conteneur Byparr requis</small></span></label>
          </div>
        </details>
      </div>
    </div>
    <div class="av-result" id="av-result"></div>
    <div class="av-foot"><button class="av-btn ghost" type="button" id="av-cancel">Annuler</button><button class="av-btn test" type="button" id="av-primary">Tester</button></div>
  </div></div>`);
  document.body.appendChild(ov);

  var cf = el(`
  <div class="av-overlay"><div class="av-modal small" role="dialog" aria-modal="true">
    <div class="av-head"><h2 id="av-cf-title">Confirmer</h2><button class="av-x" type="button" aria-label="Fermer">×</button></div>
    <div class="av-body"><p class="av-msg" id="av-cf-msg" style="margin:4px 0"></p></div>
    <div class="av-foot"><button class="av-btn ghost" type="button" id="av-cf-no">Annuler</button><button class="av-btn danger" type="button" id="av-cf-yes">Confirmer</button></div>
  </div></div>`);
  document.body.appendChild(cf);

  // modale d'inspection : montre le contenu brut (HTML/JSON) que le bot reçoit
  var iov = el(`
  <div class="av-overlay"><div class="av-modal" role="dialog" aria-modal="true" style="max-width:900px;width:92%">
    <div class="av-head"><h2 id="av-iov-title">Inspecter</h2><button class="av-x" type="button" aria-label="Fermer">×</button></div>
    <div class="av-body">
      <p class="av-hint" id="av-iov-info" style="margin:0 0 8px">Ceci est exactement ce que le bot reçoit de la page de stats.</p>
      <pre id="av-iov-pre" style="max-height:42vh;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(130,130,130,.08);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:12px;margin:0">…</pre>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <label class="av-hint" style="display:block;margin-bottom:4px">Inspecter une autre page <span style="opacity:.7">(aide aux regex — les stats sont toujours lues sur l'accueil)</span></label>
          <input id="av-iov-extra" type="text" spellcheck="false" placeholder="/mystats.php  ou  https://site.tld/stats" style="width:100%;box-sizing:border-box;background:rgba(130,130,130,.08);border:1px solid var(--border);border-radius:8px;padding:9px 10px;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:inherit">
        </div>
        <button class="av-btn ghost" type="button" id="av-iov-reinspect">Inspecter cette page</button>
      </div>
      <div style="margin-top:14px">
        <button class="av-btn ghost" type="button" id="av-iov-asst-toggle">🧩 Assistant regex — générer depuis la page</button>
        <div id="av-iov-asst" style="display:none;margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:12px">
          <p class="av-hint" style="margin:0 0 10px">Pour chaque info, indique le <b>texte qui précède la valeur</b> dans le HTML ci-dessus (ex. « Ratio », « Up : », « Bonus », « Class »). Clique <b>Générer</b> : la regex est créée et ajoutée au JSON. Tu peux ensuite Enregistrer &amp; réactualiser pour tester.</p>
          <div class="av-asst-grid"></div>
        </div>
      </div>
      <div style="margin-top:16px">
        <label class="av-hint" style="display:block;margin-bottom:6px">Regex de stats (modifiable) — édite, enregistre, et le site est revisité avec tes nouvelles regex :</label>
        <textarea id="av-iov-json" spellcheck="false" style="width:100%;box-sizing:border-box;min-height:150px;background:rgba(130,130,130,.08);border:1px solid var(--border);border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:inherit;resize:vertical"></textarea>
        <div id="av-iov-msg" class="av-hint" style="margin-top:6px"></div>
      </div>
    </div>
    <div class="av-foot"><button class="av-btn ghost" type="button" id="av-iov-default">↩ Regex par défaut</button><button class="av-btn ghost" type="button" id="av-iov-restore">↩ Restaurer la sauvegarde</button><button class="av-btn ghost" type="button" id="av-iov-copy">Copier le HTML</button><button class="av-btn ghost" type="button" id="av-iov-cancel">Annuler</button><button class="av-btn save" type="button" id="av-iov-save">Enregistrer &amp; fermer</button><button class="av-btn go" type="button" id="av-iov-close">Fermer</button></div>
  </div></div>`);
  document.body.appendChild(iov);
  // Helpers de l'inspecteur — au NIVEAU MODULE pour être accessibles à la fois par
  // l'assistant (dans l'IIFE) et par le bouton « Enregistrer » (hors IIFE).
  function iovExtra(){ return (iov.querySelector("#av-iov-extra").value||"").trim(); }
  function iovStatsPayload(slug, obj){
    // L'« URL de la page des stats » ne sert qu'à INSPECTER (dumper une page pour
    // bâtir les regex). À l'enregistrement, on lit TOUJOURS les stats sur l'accueil
    // et on purge toute config de page séparée (extra_url) : évite les 404 en visite.
    var k=iov.dataset.statskind||"stats"; if(k==="extra_stats") k="stats";
    var p={slug:slug, extra_url:""}; p[k]=obj; return p;
  }
  var asstFill=null, asstRetest=null;
  (function(){
    var FIELDS=[["upload","Upload","size"],["download","Download","size"],["ratio","Ratio","ratio"],
                ["bonus","Bonus / Points","num"],["rang","Rang / Classe","text"],["seeding","En seed","num"],
                ["autres","Autres","text"]];
    var grid=iov.querySelector(".av-asst-grid"); var valEls={};
    FIELDS.forEach(function(f){
      var lab=document.createElement("label"); lab.textContent=f[1];
      var val=document.createElement("span"); val.className="av-asst-val"; val.textContent="—"; valEls[f[0]]=val;
      var inp=document.createElement("input"); inp.type="text"; inp.placeholder="texte avant la valeur"; inp.dataset.fld=f[0]; inp.dataset.kind=f[2];
      var b=document.createElement("button"); b.type="button"; b.className="av-btn go"; b.textContent="Générer";
      b.addEventListener("click", function(){ genInto(f[0], f[2], inp.value.trim(), b); });
      grid.appendChild(lab); grid.appendChild(val); grid.appendChild(inp); grid.appendChild(b);
    });
    function setBadge(k, v, tested){
      var el=valEls[k]; if(!el) return;
      if(v===undefined){ el.textContent="…"; el.classList.remove("has"); el.title="Inspecte d'abord la page (le HTML doit être affiché ci-dessus)"; return; }
      if(v!=null && (""+v).trim()!=="" && v!=="N/A"){ el.textContent=(""+v).trim(); el.classList.add("has"); el.title=tested?"Valeur extraite par cette regex sur la page inspectée":"Valeur déjà extraite par le bot"; }
      else { el.textContent=tested?"N/A":"—"; el.classList.remove("has"); el.title=tested?"Cette regex n'a rien trouvé sur la page inspectée":"Aucune valeur — utilise l'assistant"; }
    }
    asstFill=function(vals){
      Object.keys(valEls).forEach(function(k){ setBadge(k, vals?vals[k]:null, false); });
    };
    function dumpReady(){ var t=(iov.querySelector("#av-iov-pre").textContent||""); return t.length>50 && !/^Visite en cours/.test(t) && !/^Erreur/.test(t); }
    function testRx(rxStr){
      if(!dumpReady()) return undefined;                 // dump pas encore chargé
      var html=iov.querySelector("#av-iov-pre").textContent||"";
      try{ var m=new RegExp(rxStr).exec(html); if(!m) return null; var v=(m[1]!=null?m[1]:m[0]); return (""+v).replace(/\s+/g," ").trim(); }
      catch(e){ return null; }
    }
    // Recalcule les badges en appliquant les regex du JSON à la page dumpée.
    asstRetest=function(){
      if(!dumpReady()) return;
      var cur; try{ cur=JSON.parse(iov.querySelector("#av-iov-json").value||"{}"); }catch(e){ return; }
      if(typeof cur!=="object"||Array.isArray(cur)) return;
      ["upload","download","ratio","bonus","seeding"].forEach(function(k){ if(cur[k]!=null) setBadge(k, testRx(cur[k]), true); });
      var rk=(cur.rang!=null)?cur.rang:cur["class"]; if(rk!=null) setBadge("rang", testRx(rk), true);
    };
    iov.querySelector("#av-iov-asst-toggle").addEventListener("click", function(){
      var p=iov.querySelector("#av-iov-asst"); p.style.display = p.style.display==="none" ? "block" : "none";
    });
    // Bouton « Inspecter cette page » : recapture le dump sur l'URL saisie.
    iov.querySelector("#av-iov-reinspect").addEventListener("click", function(){
      var b=this, slug=iov.dataset.slug||"", myGen=++iovGen;
      b.disabled=true; var o=b.textContent; b.innerHTML='<span class="av-spin"></span>';
      iov.querySelector("#av-iov-pre").textContent = "Visite en cours… (connexion + page de stats, ~10-30 s)";
      inspectPost({slug:slug, extra_url:iovExtra()}, 3, function(){ return myGen===iovGen; }).then(function(j){
        b.disabled=false; b.textContent=o;
        if(myGen!==iovGen) return;   // modale fermée ou relancée -> réponse périmée
        if(j && j.ok){ iov.querySelector("#av-iov-pre").textContent = j.content + (j.truncated?"\n\n… (tronqué à 200 000 caractères)":""); if(asstRetest) asstRetest(); }
        else { iov.querySelector("#av-iov-pre").textContent = (j && j.error) ? j.error : "Aucun contenu capturé."; }
      }).catch(function(){ b.disabled=false; b.textContent=o; if(myGen!==iovGen) return; iov.querySelector("#av-iov-pre").textContent="Erreur réseau pendant l'inspection."; });
    });
    function genRegex(kind, anchor){
      var a=anchor.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s*");
      if(kind==="size")  return a+"[\\s\\S]{0,80}?(\\d[\\d\\s.,]*\\s*(?:[KMGTPE](?:i?B|io|o)|B|o))";
      if(kind==="ratio") return a+"[\\s\\S]{0,80}?(\\d[\\d.,]*)";
      if(kind==="num")   return a+"[\\s\\S]{0,80}?(\\d[\\d\\s.,]*\\d|\\d)";
      if(kind==="text")  return a+"[\\s\\S]{0,80}?>\\s*([^<]+?)\\s*<";
      return a+"[\\s\\S]{0,80}?(\\S+)";
    }
    function genInto(fld, kind, anchor, btn){
      if(iov.dataset.ready!=="1"){ btn.textContent="⏳ patiente"; setTimeout(function(){btn.textContent="Générer";},1300); return; }
      if(!anchor){ btn.textContent="↑ texte ?"; setTimeout(function(){btn.textContent="Générer";},1200); return; }
      var ta=iov.querySelector("#av-iov-json"), cur={};
      try{ cur=JSON.parse(ta.value||"{}"); if(typeof cur!=="object"||Array.isArray(cur)) cur={}; }catch(e){ cur={}; }
      cur[fld]=genRegex(kind, anchor);
      ta.value=JSON.stringify(cur,null,2);
      // Teste la regex sur le HTML dumpé et affiche la valeur (ou N/A) dans le badge.
      var res=testRx(cur[fld]); setBadge(fld, res, true);
      // L'insertion est LOCALE ; clique « Enregistrer & fermer » pour l'appliquer au bot.
      var msg=iov.querySelector("#av-iov-msg");
      if(msg){
        if(res===undefined){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="⚠ Inspecte d'abord la page (le HTML doit s'afficher ci-dessus) pour vérifier la regex."; }
        else if(res===null){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="Regex « "+fld+" » ajoutée, mais elle ne trouve RIEN sur la page (N/A). Ajuste le texte avant la valeur."; }
        else { msg.style.color="var(--ok,#2d7a4f)"; msg.textContent="✓ « "+fld+" » = "+res+" — clique « Enregistrer & fermer » pour l'appliquer."; }
      }
      btn.textContent="✓"; setTimeout(function(){ btn.textContent="Générer"; },1200);
    }
  })();
  var iovGen=0;
  function closeInspect(){ iovGen++; iov.classList.remove("open"); }
  iov.querySelector(".av-x").addEventListener("click", closeInspect);
  iov.querySelector("#av-iov-close").addEventListener("click", closeInspect);
  iov.querySelector("#av-iov-cancel").addEventListener("click", closeInspect);
  iov.addEventListener("click", function(e){ if(e.target===iov) closeInspect(); });
  function copyText(txt, btn, okLabel, baseLabel){
    function done(ok){ btn.textContent = ok?okLabel:"Échec copie"; setTimeout(function(){ btn.textContent=baseLabel; }, 1500); }
    if(navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(txt).then(function(){done(true);},function(){fallback();});
    } else { fallback(); }
    function fallback(){
      try{ var ta=document.createElement("textarea"); ta.value=txt;
        ta.style.position="fixed"; ta.style.top="-1000px"; ta.setAttribute("readonly","");
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
        var ok=document.execCommand("copy"); document.body.removeChild(ta); done(ok);
      }catch(e){ done(false); }
    }
  }
  iov.querySelector("#av-iov-copy").addEventListener("click", function(){
    copyText(iov.querySelector("#av-iov-pre").textContent||"", this, "Copié ✓", "Copier le HTML");
  });
  // « Regex par défaut » : recharge les regex d'usine du tracker (base intégrée),
  // pour revenir à une config par défaut si on a cassé les regex. À enregistrer ensuite.
  iov.querySelector("#av-iov-default").addEventListener("click", function(){
    var msg=iov.querySelector("#av-iov-msg");
    if(iov.dataset.ready!=="1"){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="Patiente : la config du site n'est pas encore chargée."; return; }
    var hay=iov.dataset.dom||"", t=null, best=-1;
    for(var i=0;i<TRACKERS.length;i++){ var d=(TRACKERS[i].d||"").toLowerCase(); if(d && hay.indexOf(d)>=0 && d.length>best){ t=TRACKERS[i]; best=d.length; } }
    if(!t){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="Aucun tracker par défaut reconnu pour ce site (ajouté manuellement ?)."; return; }
    var def=null, kind="stats";
    if(t.s && Object.keys(t.s).length){ def=t.s; kind="stats"; }
    else if(t.sj && Object.keys(t.sj).length){ def=t.sj; kind="stats_json"; }
    else if(t.xf && t.xf.s && Object.keys(t.xf.s).length){ def=t.xf.s; kind="stats"; }
    if(!def){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="« "+(t.n||t.d)+" » n'a pas de regex par défaut intégrées."; return; }
    if(!window.confirm("Remplacer les regex actuelles par celles par défaut de « "+(t.n||t.d)+" » ?\n(rien n'est appliqué tant que tu n'as pas cliqué « Enregistrer & fermer »)")) return;
    iov.querySelector("#av-iov-json").value = JSON.stringify(def, null, 2);
    iov.dataset.statskind=kind;
    if(asstRetest) asstRetest();
    msg.style.color="var(--ok,#2d7a4f)"; msg.textContent="↩ Regex par défaut de « "+(t.n||t.d)+" » chargées — clique « Enregistrer & fermer » pour appliquer.";
  });
  // « Restaurer la sauvegarde » : remet la config de stats d'avant le dernier
  // enregistrement (data/.statsbak), via le backend, puis revisite.
  iov.querySelector("#av-iov-restore").addEventListener("click", function(){
    var btn=this, slug=iov.dataset.slug||"", msg=iov.querySelector("#av-iov-msg");
    if(!slug) return;
    if(!window.confirm("Restaurer la sauvegarde (config d'avant ta dernière modification) pour ce site ?")) return;
    var o=btn.textContent; btn.disabled=true; btn.innerHTML='<span class="av-spin"></span>';
    function restore(){ btn.disabled=false; btn.textContent=o; }
    post("/siterestore",{slug:slug},12000).then(function(j){
      restore();
      if(!j||!j.ok){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="Erreur : "+((j&&j.error)||"inconnue"); return; }
      // recharge le JSON restauré dans la zone d'édition + badges
      fetch("/site?slug="+encodeURIComponent(slug)).then(function(r){return r.json();}).then(function(s){
        if(s&&s.ok){ var st=s.site||{}; var cur=(st.stats&&Object.keys(st.stats).length)?st.stats:(st.stats_json||st.extra_stats||{}); iov.querySelector("#av-iov-json").value=JSON.stringify(cur,null,2); iov.dataset.ready="1"; if(asstRetest) asstRetest(); }
      }).catch(function(){});
      msg.style.color="var(--ok,#2d7a4f)"; msg.textContent="↩ Sauvegarde restaurée ["+((j.keys&&j.keys.length)?j.keys.join(", "):"")+"] — réactualisation en cours…";
      refresh();
      post("/revisit",{slug:slug},12000).catch(function(){});
      setTimeout(refresh,6000); setTimeout(refresh,15000); setTimeout(refresh,30000);
    }).catch(function(){ restore(); msg.style.color="var(--bad,#e0796f)"; msg.textContent="Service injoignable."; });
  });
  iov.querySelector("#av-iov-save").addEventListener("click", function(){
    var btn=this, slug=iov.dataset.slug||"", kind=iov.dataset.statskind||"stats";
    var msg=iov.querySelector("#av-iov-msg"); var raw=iov.querySelector("#av-iov-json").value.trim();
    if(iov.dataset.ready!=="1"){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="Patiente : les regex du site ne sont pas encore chargées."; return; }
    var obj;
    try { obj = raw ? JSON.parse(raw) : {}; if(typeof obj!=="object"||Array.isArray(obj)) throw new Error("objet attendu"); }
    catch(e){ msg.style.color="var(--bad,#e0796f)"; msg.textContent="JSON invalide : "+e.message; return; }
    btn.disabled=true; var o=btn.dataset.label||btn.textContent; btn.dataset.label=o;
    btn.innerHTML='<span class="av-spin"></span> Enregistrement…'; msg.style.color=""; msg.textContent="Enregistrement…";
    function restore(){ btn.disabled=false; btn.textContent=o; }
    var payload=iovStatsPayload(slug, obj);
    post("/sitestats", payload, 12000).then(function(j){
      if(!j||!j.ok){ restore(); msg.style.color="var(--bad,#e0796f)"; msg.textContent="Erreur : "+((j&&j.error)||"inconnue"); return; }
      // Modif ENREGISTRÉE : on affiche la confirmation un court instant, puis on ferme
      // (la revisite tourne en arrière-plan et le tableau se met à jour ensuite).
      restore(); msg.style.color="var(--ok,#2d7a4f)";
      msg.textContent="✓ Enregistré ["+((j.keys&&j.keys.length)?j.keys.join(", "):"aucune clé")+"] — réactualisation en cours…";
      refresh();
      post("/revisit",{slug:slug}, 12000).catch(function(){});
      setTimeout(refresh, 6000); setTimeout(refresh, 15000); setTimeout(refresh, 30000);
      setTimeout(closeInspect, 1100);
    }).catch(function(){ restore(); msg.style.color="var(--bad,#e0796f)"; msg.textContent="Service injoignable."; });
  });
  function openInspect(slug, name){
    var myGen=++iovGen;
    iov.dataset.slug=slug; iov.dataset.statskind="stats"; iov.dataset.name=name||"";
    iov.querySelector("#av-iov-title").textContent = "Inspecter — "+name+"  (v"+AUTOVISIT_VER+")";
    iov.querySelector("#av-iov-pre").textContent = "Visite en cours… (connexion au tracker, ~10-30 s)";
    iov.querySelector("#av-iov-info").textContent = "Ceci est exactement ce que le bot reçoit de la page de stats.";
    iov.querySelector("#av-iov-msg").textContent = "";
    iov.querySelector("#av-iov-json").value = "Chargement des regex…";
    iov.querySelector("#av-iov-extra").value = "";
    iov.dataset.ready="0";
    // Réinitialise l'assistant pour CE site : sinon les saisies « texte avant la
    // valeur » du site précédent persistent (le DOM de l'inspecteur est réutilisé).
    var _ai=iov.querySelectorAll(".av-asst-grid input"); for(var _k=0;_k<_ai.length;_k++){ _ai[_k].value=""; }
    var _ap=iov.querySelector("#av-iov-asst"); if(_ap) _ap.style.display="none";
    if(asstFill){
      var stx=((lastStatus&&lastStatus.sites)||[]).filter(function(x){return (x.name||"").toLowerCase()===(name||"").toLowerCase();})[0];
      var rs=(stx&&stx.ok)?rowStats(stx):null;
      asstFill(rs?{upload:rs.up,download:rs.dl,ratio:rs.ra,bonus:rs.bo,rang:rs.rang,seeding:rs.se,autres:(rs.oth&&rs.oth.length?rs.oth.join(" | "):"")}:{});
    }
    iov.classList.add("open");
    fetch("/site?slug="+encodeURIComponent(slug)).then(function(r){return r.json();}).then(function(j){
      if(myGen!==iovGen) return;
      var s=(j&&j.ok)?j.site:{};
      var cur, kind="stats";
      // Le champ « Inspecter une autre page » reste VIDE par défaut : il ne sert qu'à
      // inspecter ponctuellement une autre page. Les stats se lisent sur l'accueil.
      if(s.stats && Object.keys(s.stats).length){ cur=s.stats; kind="stats"; }
      else if(s.stats_json && Object.keys(s.stats_json).length){ cur=s.stats_json; kind="stats_json"; }
      else if(s.extra_stats && Object.keys(s.extra_stats).length){ cur=s.extra_stats; kind="stats"; }
      else { cur={}; }
      iov.dataset.statskind=kind;
      iov.dataset.dom = ((s.url||"")+" "+(s.login_url||"")+" "+(s.verify_url||"")+" "+(s.post_url||"")).toLowerCase();
      iov.querySelector("#av-iov-json").value = JSON.stringify(cur, null, 2);
      iov.dataset.ready="1";
      if(asstRetest) asstRetest();
    }).catch(function(){ iov.querySelector("#av-iov-json").value = "{}"; iov.dataset.ready="1"; });
    inspectPost({slug:slug}, 3, function(){ return myGen===iovGen; }).then(function(j){
      if(myGen!==iovGen) return;   // l'utilisateur a fermé ou ouvert un autre site
      if(j && j.ok){
        iov.querySelector("#av-iov-pre").textContent = j.content + (j.truncated?"\n\n… (tronqué à 200 000 caractères)":"");
        if(asstRetest) asstRetest();
      } else {
        iov.querySelector("#av-iov-pre").textContent = (j && j.error) ? j.error : "Aucun contenu capturé.";
      }
    }).catch(function(){ if(myGen!==iovGen) return; iov.querySelector("#av-iov-pre").textContent = "Erreur réseau pendant l'inspection."; });
  }

  var Q = function (s) { return ov.querySelector(s); };
  var result = Q("#av-result"), primary = Q("#av-primary"), acBox = Q("#av-ac");
  var editOrig = null, staged = null, mode = "test", buildErr = "", picked = null, origSite = null, cookieMode = false;

  function cleanDomain(d){return d.trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"");}

  function updateVerifyLabel(){
    var m = Q("#av-vmode").value, url = m==="url", auto = m==="auto";
    Q("#av-verify").disabled = auto;
    Q("#av-verify").style.opacity = auto ? ".5" : "1";
    Q("#av-verifylabel").textContent = url ? "Texte attendu dans l'URL" : "Mot-clé de succès";
    Q("#av-verify").placeholder = auto ? "(non requis en détection auto)" : (url ? "ex. index.php" : "(défaut : ton pseudo)");
    Q("#av-verifyhint").textContent = auto ? "autovisit détecte la connexion via les marqueurs de la page (déconnexion / logout / mon compte…). Choisis « mot-clé » ou « URL » seulement si l'auto échoue."
      : url ? "Login validé si l'URL après connexion contient ce texte."
      : "Texte présent uniquement une fois connecté (souvent : logout, /logout, ton pseudo).";
  }
  function applyPreset(p){
    var pr = PRESET[p] || PRESET.form;
    Q("#av-path").value = pr.path; Q("#av-vmode").value = pr.vmode;
    Q("#av-verify").value = pr.verify; Q("#av-curl").checked = pr.curl; updateVerifyLabel();
  }
  function detectPlatform(s){
    if(s.api_json) return "apijson";
    if(s.csrf_field==="_xfToken") return "xenforo";
    if(s.csrf_field==="__RequestVerificationToken") return "aspnet";
    if(s.csrf_field==="_csrf_token") return "symfony";
    if(s.csrf_field==="_token"||s.extract_hidden_fields) return "unit3d";
    if((s.url||"").indexOf("login.php")>=0) return "gazelle";
    return "form";
  }
  function setMode(m){
    mode = m;
    primary.className = "av-btn " + (m==="add"?"go":m==="fail"?"fail":"test");
    primary.textContent = m==="add" ? (editOrig?"Enregistrer":"Ajouter") : m==="fail" ? "Échec — retester" : "Tester";
    primary.disabled = false;
  }
  function updateAuthSwitch(){
    var link=Q("#av-authswitch");
    if((picked && (picked.au==="cookie"||picked.au==="key"))){ link.style.display="none"; return; }
    link.style.display="block";
    Q("#av-tocookie").textContent = cookieMode ? "← Revenir à la connexion par identifiants" : "🍪 Le tracker bloque (captcha, Cloudflare…) ? Se connecter par cookies de session →";
  }
  function setAuthMode(mode){ // "key" -> clé privée ; "cookie" -> cookies de session ; sinon identifiant/mot de passe
    var isKey=mode==="key", isCookie=mode==="cookie";
    // needPseudo : un site en mode cookie peut quand même demander le pseudo (URL de stats paramétrée par {{username}})
    var needPseudo = isCookie && picked && picked.xf && /\{\{username\}\}/.test(picked.xf.u||"");
    Q("#av-userfield").style.display=((isKey||isCookie) && !needPseudo)?"none":"";
    Q("#av-pass").parentNode.style.display=isCookie?"none":"";
    Q("#av-cookieblock").style.display=isCookie?"block":"none";
    if(needPseudo){
      Q("#av-userlabel").textContent="Pseudo sur le tracker (pour l'URL de stats)";
      Q("#av-user").placeholder="ton pseudo exact (ex. MonPseudo)";
    } else {
      Q("#av-userlabel").textContent="Identifiant";
      Q("#av-user").placeholder="";
    }
    if(isKey){
      Q("#av-passlabel").textContent="Clé privée";
      Q("#av-pass").type="password"; Q("#av-pass").placeholder="ta clé privée";
    } else if(!isCookie){
      Q("#av-passlabel").textContent=editOrig?"Mot de passe (vide = inchangé)":"Mot de passe";
      Q("#av-pass").type="password"; Q("#av-pass").placeholder="";
    }
    if((isKey||isCookie) && !needPseudo) Q("#av-user").value="";
    updateAuthSwitch();
  }
  function showConfig(open){
    Q("#av-config").style.display = "block";
    Q("#av-adv").open = !!open;
  }
  function setSummary(t){
    var sum = Q("#av-summary");
    if(!t){ sum.style.display="none"; sum.innerHTML=""; return; }
    var logo = t.lg ? '<img src="/.logos/'+t.id+'.png" onerror="this.style.display=\'none\'">' : '';
    sum.innerHTML = logo + '<span style="display:flex;flex-direction:column"><b>'+esc(t.n)+'</b><span>'+esc(t.d)+' · '+esc(t.p)+(t.s||t.sj?' · stats incluses':'')+'</span></span><span class="av-chg">changer</span>';
    sum.style.display="flex";
    var chg = sum.querySelector(".av-chg");
    if(chg) chg.addEventListener("click", function(){ goManual(true); });
  }
  function show2FA(on){ Q("#av-2farow").style.display = on ? "block" : "none"; }
  function knownByDomain(dom){
    dom=(dom||"").replace(/^www\./,"");
    if(!dom) return null;
    return TRACKERS.filter(function(t){ var d=(t.d||"").replace(/^www\./,""); return d && (dom===d || dom.indexOf(d)>=0 || d.indexOf(dom)>=0); })[0] || null;
  }
  function reset(){
    ["av-name","av-domain","av-user","av-pass","av-verify","av-path","av-totp","av-stats","av-cookies","av-ua"].forEach(function(id){Q("#"+id).value="";});
    ["av-curl","av-pw","av-cf"].forEach(function(id){Q("#"+id).checked=false;});
    Q("#av-platform").value="form"; applyPreset("form"); picked=null; origSite=null; cookieMode=false; hideAc(); show2FA(false);
    Q("#av-config").style.display="none"; Q("#av-adv").open=false; setSummary(null);
    Q("#av-manualrow").style.display="block"; setAuthMode("user");
    Q("#av-namelabel").innerHTML='Tracker <span style="color:#6b7383">— tape le nom (ex. The Old School)</span>';
    Q("#av-name").placeholder="The Old School…";
    Q("#av-totp").placeholder="SECRET_BASE32";
    result.className="av-result"; result.innerHTML=""; staged=null; setMode("test");
  }
  function goManual(keepName){
    picked=null; cookieMode=false; setSummary(null); setAuthMode("user");
    Q("#av-namelabel").innerHTML='Nom du site';
    Q("#av-manualrow").style.display="none";
    show2FA(true); // config manuelle : on ne peut pas deviner, on laisse le champ 2FA disponible
    if(!keepName){ /* garde ce qui est tapé */ }
    showConfig(true); hideAc();
    setTimeout(function(){ Q("#av-domain").focus(); }, 0);
  }

  /* ----- auto-complétion trackers ----- */
  var acItems = [], acIdx = -1;
  function hideAc(){ acBox.classList.remove("show"); acBox.innerHTML=""; acItems=[]; acIdx=-1; }
  function fillFromTracker(t){
    picked = t; cookieMode=false;
    Q("#av-name").value = t.n; Q("#av-domain").value = t.d;
    Q("#av-platform").value = t.p; applyPreset(t.p);
    Q("#av-path").value = (t.lp && t.lp.charAt(0)==="/") ? t.lp : "/login";
    if (t.s) { try { Q("#av-stats").value = JSON.stringify(t.s, null, 2); } catch(e){} }
    else { Q("#av-stats").value = ""; }
    Q("#av-statshint").textContent = (t.au==="cookie")
      ? ((t.xf && /\{\{username\}\}/.test(t.xf.u||""))
         ? "Auth par cookies de session : colle les cookies exportés + le User-Agent, et renseigne ton pseudo (pour l'URL de stats)."
         : "Auth par cookies de session : colle les cookies exportés de ton navigateur + le User-Agent correspondant.")
      : (t.p==="apijson")
      ? "Tracker API JSON : login et stats via l'API, repris automatiquement du dashboard."
      : (t.br ? "Stats via rendu Playwright (Firefox) : elles fonctionnent, mais le test et la visite sont plus lents (~20-30 s)."
      : (t.sj ? "Stats JSON récupérées automatiquement."
      : (t.s ? "Regex pré-remplies depuis « "+t.n+" »." : "Pas de stats définies pour ce tracker dans le dashboard.")));
    if(t.br && t.au!=="cookie") Q("#av-pw").checked = true;
    if(t.cf){ Q("#av-cf").checked = true;
      Q("#av-statshint").textContent = "Tracker derrière Cloudflare : challenge résolu automatiquement via Byparr (conteneur requis sur 127.0.0.1:8191)."; }
    show2FA(!!t.to);
    Q("#av-totp").placeholder = t.to ? "SECRET_BASE32 (2FA requis pour ce tracker)" : "SECRET_BASE32";
    Q("#av-manualrow").style.display="none";
    setAuthMode(t.au||"user");
    setSummary(t); showConfig(false); hideAc();
    setTimeout(function(){ (t.au==="cookie"?Q("#av-cookies"):t.au==="key"?Q("#av-pass"):Q("#av-user")).focus(); }, 0);
    if (mode!=="test") setMode("test");
  }
  function renderAc(q){
    var ql = q.trim().toLowerCase();
    if (ql.length < 1) { hideAc(); return; }
    var m = TRACKERS.filter(function(t){ return t.n.toLowerCase().indexOf(ql)>=0 || (t.d||"").toLowerCase().indexOf(ql)>=0; }).slice(0,8);
    if (!m.length) { hideAc(); return; }
    acItems = m; acIdx = -1;
    acBox.innerHTML = m.map(function(t,i){
      return '<div class="av-ac-item" data-i="'+i+'"><span style="display:flex;flex-direction:column"><b>'+esc(t.n)+'</b><span>'+esc(t.d)+'</span></span><span class="av-ac-tag">'+esc(t.p)+'</span></div>';
    }).join("");
    Array.prototype.forEach.call(acBox.querySelectorAll(".av-ac-item"), function(it){
      it.addEventListener("mousedown", function(e){ e.preventDefault(); fillFromTracker(acItems[+it.dataset.i]); });
    });
    acBox.classList.add("show");
  }
  Q("#av-name").addEventListener("input", function(){ picked=null; renderAc(this.value); });
  Q("#av-name").addEventListener("keydown", function(e){
    if (!acBox.classList.contains("show")) return;
    if (e.key==="ArrowDown"){ e.preventDefault(); acIdx=Math.min(acIdx+1,acItems.length-1); hl(); }
    else if (e.key==="ArrowUp"){ e.preventDefault(); acIdx=Math.max(acIdx-1,0); hl(); }
    else if (e.key==="Enter" && acIdx>=0){ e.preventDefault(); fillFromTracker(acItems[acIdx]); }
    else if (e.key==="Escape"){ hideAc(); }
  });
  function hl(){ Array.prototype.forEach.call(acBox.children, function(c,i){ c.classList.toggle("hl", i===acIdx); }); }
  Q("#av-name").addEventListener("blur", function(){ setTimeout(hideAc, 150); });
  Q("#av-manual").addEventListener("click", function(e){ e.preventDefault(); goManual(false); });
  Q("#av-tocookie").addEventListener("click", function(e){ e.preventDefault();
    if(picked && (picked.au==="cookie"||picked.au==="key")) return;
    cookieMode=!cookieMode; setAuthMode(cookieMode?"cookie":"user");
    if(cookieMode) Q("#av-cookies").focus();
  });

  function openAdd(){ editOrig=null; reset(); Q("#av-title").textContent="Ajouter un site"; Q("#av-passlabel").textContent="Mot de passe"; ov.classList.add("open"); Q("#av-name").focus(); }
  function openEdit(slug){
    fetch("/site?slug="+encodeURIComponent(slug)).then(function(r){return r.json();}).then(function(j){
      if(!j.ok){alert("Site introuvable");return;}
      var s=j.site; editOrig=slug; reset(); origSite=s;
      Q("#av-title").textContent="Modifier « "+(s.name||slug)+" »";
      Q("#av-namelabel").innerHTML="Nom du site"; Q("#av-manualrow").style.display="none";
      Q("#av-passlabel").textContent="Mot de passe (vide = inchangé)";
      var u=(s.url||"").replace(/^https?:\/\//i,""), sl=u.indexOf("/");
      var dom = sl>=0?u.slice(0,sl):u;
      Q("#av-name").value=s.name||""; Q("#av-domain").value=dom;
      Q("#av-path").value=sl>=0?u.slice(sl):"/login"; Q("#av-user").value=s.username||"";
      Q("#av-platform").value=detectPlatform(s);
      Q("#av-curl").checked=!!s.use_curl_cffi; Q("#av-pw").checked=!!s.use_playwright; Q("#av-cf").checked=!!s.cf_solver;
      Q("#av-totp").value=s.totp_secret||"";
      // reconnaissance du tracker -> base picked (réinjecte totp_url, csrf, api, etc. à l'enregistrement)
      var known=knownByDomain(dom);
      if(known) picked=Object.assign({}, known);
      if(s.success_url_contains){ Q("#av-vmode").value="url"; Q("#av-verify").value=s.success_url_contains; }
      else if(s.success_keywords && s.success_keywords.length){ Q("#av-vmode").value="kw"; var kw=s.success_keywords[0]||""; Q("#av-verify").value=(kw===s.username)?"":kw; }
      else { Q("#av-vmode").value="auto"; Q("#av-verify").value=""; }
      updateVerifyLabel();
      if(s.stats){ try{ Q("#av-stats").value=JSON.stringify(s.stats,null,2); }catch(e){} }
      else if(s.stats_json){ picked=Object.assign(picked||{},{sj:s.stats_json}); }
      if(s.username_field && s.username_field!=="username") picked=Object.assign(picked||{},{uf:s.username_field});
      if(s.password_field && s.password_field!=="password") picked=Object.assign(picked||{},{pf:s.password_field});
      if(s.session_cookies_file){ picked=Object.assign(picked||{},{au:"cookie"}); setAuthMode("cookie"); if(s.user_agent) Q("#av-ua").value=s.user_agent; }
      else if(s.playwright_password_selector){ picked=Object.assign(picked||{},{au:"key",pks:s.playwright_password_selector}); setAuthMode("key"); }
      else setAuthMode("user");
      show2FA(!!(s.totp_url || s.totp_secret || (known && known.to)));
      showConfig(true);
      ov.classList.add("open");
    }).catch(function(){alert("Service injoignable.");});
  }

  function absURL(u, base){ if(!u) return null; return (/^https?:/i).test(u) ? u : (base + (u.charAt(0)==="/"?u:"/"+u)); }

  function buildSite(){
    buildErr="";
    var name=Q("#av-name").value.trim(), domain=cleanDomain(Q("#av-domain").value);
    var user=Q("#av-user").value.trim(), pass=Q("#av-pass").value;
    var keyauth = picked && picked.au==="key";
    var cookieauth = (picked && picked.au==="cookie") || cookieMode;
    if(!name||!domain) return null;
    if(!editOrig){
      if(cookieauth){ if(!Q("#av-cookies").value.trim()) return null; }
      else { if(!keyauth && !user) return null; if(!pass) return null; }
    }
    var platform=Q("#av-platform").value;
    var pathRaw=Q("#av-path").value.trim()||(PRESET[platform]||PRESET.form).path;
    if(!/^https?:/i.test(pathRaw) && pathRaw[0]!=="/") pathRaw="/"+pathRaw;
    var base="https://"+domain;
    var urlFromPath = /^https?:/i.test(pathRaw)?pathRaw:(base+pathRaw);

    // helper cookies : accepte le JSON exporté OU une chaîne brute « nom=valeur; … »
    function parseCookies(){
      var t=Q("#av-cookies").value.trim(); if(!t) return null;
      var dom=cleanDomain(Q("#av-domain").value);
      if(t.charAt(0)==="[" || t.charAt(0)==="{"){
        try{ var c=JSON.parse(t);
          if(Array.isArray(c)) return c;
          if(c && Array.isArray(c.cookies)) return c.cookies;
          buildErr="Cookies : tableau JSON attendu."; return false;
        }catch(e){ buildErr="Cookies : JSON invalide ("+e.message+")."; return false; }
      }
      // format brut copié depuis le navigateur : nom=valeur; nom2=valeur2
      var arr=[];
      t.split(/;\s*/).forEach(function(p){
        var i=p.indexOf("="); if(i<1) return;
        var n=p.slice(0,i).trim(), v=p.slice(i+1).trim();
        if(n) arr.push({name:n, value:v, domain:"."+dom, path:"/"});
      });
      if(!arr.length){ buildErr="Cookies : format non reconnu (colle le JSON exporté, ou « nom=valeur; … »)."; return false; }
      return arr;
    }

    // ===== ÉDITION : repartir de la config réelle, n'écraser que ce qui change =====
    if(editOrig && origSite){
      var s=JSON.parse(JSON.stringify(origSite));
      s.name=name;
      s.url=urlFromPath;
      if(!origSite.post_url || origSite.post_url===origSite.url) s.post_url=urlFromPath;
      if(!keyauth) s.username=user;
      if(pass) s.password=pass;
      var vmodeE=Q("#av-vmode").value, vv=Q("#av-verify").value.trim();
      if(vmodeE==="auto"){ delete s.success_keywords; delete s.success_url_contains; }
      else if(vv){ if(vmodeE==="url"){ s.success_url_contains=vv; delete s.success_keywords; }
              else { s.success_keywords=[vv]; delete s.success_url_contains; } }
      var rawE=Q("#av-stats").value.trim();
      if(rawE){ try{ var st2=JSON.parse(rawE); if(st2&&typeof st2==="object"){ s.stats=st2; delete s.stats_json; } else {buildErr="Stats : objet JSON attendu.";return null;} }catch(e){ buildErr="Stats : JSON invalide ("+e.message+")."; return null; } }
      var totpE=Q("#av-totp").value.trim().replace(/\s+/g,"").toUpperCase();
      if(totpE){ if(/^\d{6,8}$/.test(totpE)){ buildErr="Champ 2FA : entre le SECRET (clé base32), pas un code à 6 chiffres."; return null; } s.totp_secret=totpE; }
      // tracker reconnu : on (ré)injecte la config fidèle manquante (répare les anciens enregistrements)
      if(picked){
        if(picked.mu) s.totp_url=absURL(picked.mu,base);
        if(picked.tf) s.totp_field=picked.tf;
        if(picked.pp && !origSite.post_url) s.post_url=absURL(picked.pp,base);
        if(picked.csrf && !s.csrf_field && s.api_json!==true) s.csrf_field=picked.csrf;
        if(picked.pv && !s.pre_visit_urls) s.pre_visit_urls=picked.pv.map(function(x){return absURL(x,base);});
        if(picked.mp && !s.mp_url){ s.mp_url=absURL(picked.mp.u,base); s.mp_json_field=picked.mp.f; }
        if(s.api_json && picked.sf && !s.success_json_field) s.success_json_field=picked.sf;
      }
      if(Q("#av-curl").checked) s.use_curl_cffi=true; else delete s.use_curl_cffi;
      if(Q("#av-pw").checked) s.use_playwright=true; else if(!s.playwright_password_selector) delete s.use_playwright;
      if(Q("#av-cf").checked) s.cf_solver="http://127.0.0.1:8191/v1"; else delete s.cf_solver;
      // mise à jour éventuelle des cookies de session
      if(origSite.session_cookies_file){
        var ck=parseCookies(); if(ck===false) return null;
        if(ck) s.session_cookies=ck;                                  // nouveaux cookies collés
        else s.session_cookies_file=origSite.session_cookies_file;    // sinon : on conserve l'existant (auth cookies préservée)
        var uae=Q("#av-ua").value.trim(); if(uae) s.user_agent=uae;
      }
      return s;
    }

    // ===== AJOUT par cookies de session (tracker cookieOnly ou bascule manuelle) =====
    if(cookieauth){
      var ck2=parseCookies(); if(!ck2){ if(buildErr) return null; buildErr="Colle les cookies de session."; return null; }
      var vpath = (picked&&picked.vp) ? absURL(picked.vp,base) : urlFromPath;
      var cs={name:name, url:base+"/", verify_url:vpath,
              enabled:true, alert_keywords:["new_message"], session_cookies:ck2};
      var ua2=Q("#av-ua").value.trim(); if(ua2) cs.user_agent=ua2;
      var rawC=Q("#av-stats").value.trim();
      if(rawC){ try{ var stc=JSON.parse(rawC); if(stc&&typeof stc==="object") cs.stats=stc; }catch(e){} }
      else if(picked&&picked.s) cs.stats=picked.s;
      if(picked&&picked.sj) cs.stats_json=picked.sj;
      if(picked&&picked.mp){ cs.mp_url=absURL(picked.mp.u,base); cs.mp_json_field=picked.mp.f; }
      if(picked&&picked.xf){
        // Si l'URL de stats est parametree par le pseudo, on EXIGE le pseudo (sinon extra_url cassee)
        if(/\{\{username\}\}/.test(picked.xf.u||"") && !user){ buildErr="Renseigne ton pseudo sur le tracker (necessaire pour l'URL de stats)."; return null; }
        cs.extra_url=absURL(picked.xf.u.replace(/\{\{username\}\}/g,encodeURIComponent(user||"")),base);
        cs.extra_format=picked.xf.fmt||"html";
        if(picked.xf.s && typeof picked.xf.s==="object"){ cs.extra_stats=Object.assign({},picked.xf.s); }
        else { cs.extra_stats={}; cs.extra_stats[picked.xf.f]=picked.xf.fmt==="json"?picked.xf.pa:picked.xf.rx; } }
      if(Q("#av-cf").checked) cs.cf_solver="http://127.0.0.1:8191/v1";
      return cs;
    }

    // ===== AJOUT : formulaire + config exacte du tracker =====
    var s={name:name,url:urlFromPath,post_url:urlFromPath,
      username_field:(picked&&picked.uf)||"username",password_field:(picked&&picked.pf)||"password",
      username:user,password:pass,alert_keywords:["new_message"],verify_url:base+"/",enabled:true};
    var vmode=Q("#av-vmode").value, vval=Q("#av-verify").value.trim();
    if(vmode==="auto"){ /* autovisit détecte via les marqueurs de page (logout/déconnexion…) */ }
    else if(vmode==="url"){ s.success_url_contains = vval || (PRESET[platform]||{}).verify || "index.php"; }
    else { s.success_keywords = [vval || user]; }
    if(platform==="unit3d"){ s.csrf_field="_token"; s.extract_hidden_fields=true; }
    else if(platform==="aspnet"){ s.csrf_field="__RequestVerificationToken"; s.extract_hidden_fields=true; }
    else if(platform==="xenforo"){ s.csrf_field="_xfToken"; s.extract_hidden_fields=true; }
    else if(platform==="symfony"){ s.csrf_field="_csrf_token"; }
    else if(platform==="apijson"){ s.api_json=true; s.success_json_field="success"; }
    if(Q("#av-curl").checked) s.use_curl_cffi=true;
    if(Q("#av-pw").checked) s.use_playwright=true;
    if(Q("#av-cf").checked) s.cf_solver="http://127.0.0.1:8191/v1";
    if(picked && picked.mu){ s.totp_url=absURL(picked.mu,base); }
    if(picked && picked.tf){ s.totp_field=picked.tf; }
    var totp=Q("#av-totp").value.trim().replace(/\s+/g,"").toUpperCase();
    if(totp){
      if(/^\d{6,8}$/.test(totp)){ buildErr="Champ 2FA : entre le SECRET (clé base32, ex. JBSWY3DP…), pas un code à 6 chiffres."; return null; }
      s.totp_secret=totp; if(!s.totp_field) s.totp_field=(platform==="xenforo")?"code":"mfa";
      if(!s.totp_url && platform==="xenforo") s.totp_url=base+"/login/two-step"; }
    var raw=Q("#av-stats").value.trim();
    if(raw){ try{ var stt=JSON.parse(raw); if(stt&&typeof stt==="object") s.stats=stt; else {buildErr="Stats : objet JSON attendu.";return null;} }catch(e){ buildErr="Stats : JSON invalide ("+e.message+")."; return null; } }
    if(picked && picked.sj && !raw){ s.stats_json = picked.sj; }
    // surcharges fidèles au tracker connu (config exacte du dashboard git)
    if(picked){
      if(picked.lp) s.url = absURL(picked.lp, base);
      s.post_url = picked.pp ? absURL(picked.pp, base) : s.url;
      if(picked.vp) s.verify_url = absURL(picked.vp, base);
      if(picked.csrf) s.csrf_field = picked.csrf;
      if(picked.hid) s.extract_hidden_fields = true;
      if(picked.ef) s.extra_fields = picked.ef;
      if(picked.pv && picked.pv.length) s.pre_visit_urls = picked.pv.map(function(u){return absURL(u,base);});
      if(picked.mp){ s.mp_url=absURL(picked.mp.u,base); s.mp_json_field=picked.mp.f; }
      if(picked.xf){
        s.extra_url=absURL(picked.xf.u.replace(/\{\{username\}\}/g,encodeURIComponent(user||"")),base);
        s.extra_format=picked.xf.fmt||"html";
        s.extra_stats={}; s.extra_stats[picked.xf.f]= picked.xf.fmt==="json" ? picked.xf.pa : picked.xf.rx;
      }
      if(picked.br && picked.au!=="key"){
        s.use_playwright=true; s.playwright_fetch_verify=true;
        if(picked.vp) s.verify_url=absURL(picked.vp,base);
        s.playwright_post_verify_wait=4;
        delete s.success_keywords; delete s.success_url_contains; // succès = page rendue
      }
      if(platform==="apijson"){ s.api_json=true; delete s.success_keywords; delete s.success_url_contains; s.success_json_field=picked.sf||"success"; }
      if(picked.au==="key"){
        s.username=""; delete s.username_field;
        s.use_playwright=true; s.playwright_password_selector=picked.pks||"#private-key-input";
        s.playwright_wait_url_change=30; s.playwright_post_login_wait=5; s.playwright_fetch_verify=true;
        if(picked.vp) s.verify_url=absURL(picked.vp,base);
        delete s.success_keywords; delete s.success_url_contains;
        s.success_url_contains=(picked.vp||"/activity").replace(/^https?:\/\/[^/]+/,"").replace(/^\//,"")||"activity";
      }
    }
    return s;
  }
  function showResult(ok,html){result.className="av-result show "+(ok?"ok":"ko");result.innerHTML=html;}

  function runTest(){
    if(Q("#av-config").style.display==="none"){ goManual(false); return; }
    var site=buildSite();
    if(!site){ showResult(false, buildErr || ("Remplis le nom, le domaine, l'identifiant"+(editOrig?"":" et le mot de passe")+".")); return; }
    primary.disabled=true; primary.textContent="Test en cours…"; result.className="av-result";
    var prev=staged;
    post("/test",{site:site,original_slug:editOrig}).then(function(j){
      if(!j.ok){setMode("fail");showResult(false,"<b>Erreur :</b> "+(j.error||"")); return;}
      if(prev && prev.created && prev.slug!==j.slug){ post("/cancel",{slug:prev.slug,created:true}); }
      staged={slug:j.slug,created:j.created};
      if(j.login_ok){ setMode("add"); showResult(true,"<b>✓ Connexion réussie.</b> Clique sur « "+(editOrig?"Enregistrer":"Ajouter")+" » pour valider.<pre>"+esc(j.log)+"</pre>"); }
      else { setMode("fail"); showResult(false,"<b>Login en échec.</b> Ajuste plateforme / vérification / options puis reteste. Rien n'est enregistré tant que ce n'est pas validé.<pre>"+esc(j.log)+"</pre>"); }
    }).catch(function(e){setMode("fail");showResult(false,"<b>Service injoignable.</b> ("+e+")");});
  }
  function doConfirm(){
    if(!staged) return; primary.disabled=true; primary.textContent="…";
    var payload={slug:staged.slug,original_slug:editOrig};
    if(picked && picked.lg && picked.id){ payload.logo=picked.id; payload.icon_key=(Q("#av-name").value||"").trim().toLowerCase(); }
    post("/confirm",payload).then(function(j){
      if(j.ok){ staged=null; ov.classList.remove("open"); refresh(); }
      else { setMode("add"); showResult(false,"<b>Erreur :</b> "+(j.error||"")); }
    }).catch(function(){setMode("add");showResult(false,"Service injoignable.");});
  }
  function closeAdd(doCleanup){
    if(doCleanup && staged){ post("/cancel",{slug:staged.slug,original_slug:editOrig,created:staged.created}); }
    staged=null; ov.classList.remove("open");
  }

  primary.addEventListener("click", function(){ if(mode==="add") doConfirm(); else runTest(); });
  Q("#av-cancel").addEventListener("click", function(){ closeAdd(true); });
  Q(".av-x").addEventListener("click", function(){ closeAdd(true); });
  ov.addEventListener("click", function(e){ if(e.target===ov) closeAdd(true); });
  Q("#av-platform").addEventListener("change", function(){ applyPreset(this.value); if(mode!=="test") setMode("test"); });
  Q("#av-vmode").addEventListener("change", function(){ updateVerifyLabel(); if(mode!=="test") setMode("test"); });
  ov.querySelectorAll("input,textarea").forEach(function(inp){ if(inp.id==="av-name") return; inp.addEventListener("input", function(){ if(mode!=="test") setMode("test"); }); });

  /* ---------- CONFIRM générique ---------- */
  var cfYes=null;
  function askConfirm(msg, danger, onYes){
    cf.querySelector("#av-cf-msg").textContent=msg;
    var yes=cf.querySelector("#av-cf-yes"); yes.className="av-btn "+(danger?"danger":"go"); yes.textContent=danger?"Confirmer":"Oui";
    cfYes=onYes; cf.classList.add("open");
  }
  function closeConfirm(){cf.classList.remove("open");cfYes=null;}
  cf.querySelector("#av-cf-yes").addEventListener("click", function(){ var f=cfYes; closeConfirm(); if(f) f(); });
  cf.querySelector("#av-cf-no").addEventListener("click", closeConfirm);
  cf.querySelector(".av-x").addEventListener("click", closeConfirm);
  cf.addEventListener("click", function(e){ if(e.target===cf) closeConfirm(); });

  /* ---------- RENDU DU TABLEAU (liste réelle + stats fusionnées) ---------- */
  var tbody = document.getElementById("tbody");
  var updatedEl = document.getElementById("updated");

  var COL_UPLOAD=["upload"], COL_DOWN=["download"], COL_RATIO=["ratio"],
      COL_BONUS=["bonus","points","theias","credits","bonus_upload","gift_lvl","chocos","gold"],
      COL_SEED=["seed","seeds","seeding"],
      COL_RANG=["class","classe","rang","rank","role"];
  function deEnt(v){ return typeof v==="string" ? v.replace(/&nbsp;|&#160;|&#xa0;/gi," ").replace(/\u00a0/g," ").replace(/\s+/g," ").trim() : v; }
  function parseStats(str){ if(!str) return {};
    if(typeof str==="object"){ var o={}; Object.keys(str).forEach(function(k){o[k]=deEnt(str[k]);}); return o; }
    var r={};
    String(str).split("|").forEach(function(p){var i=p.indexOf(":"); if(i<0) return; r[p.slice(0,i).trim().toLowerCase()]=deEnt(p.slice(i+1).trim());}); return r; }
  function matchCol(k,cols){ return cols.some(function(c){ return k===c||k.indexOf(c)>=0; }); }

  function toNum(raw){ if(raw==null) return null;
    var s=String(raw).replace(/[\s\u00a0]/g,"").trim();
    if(!s||s==="—"||s==="-"||/^n\/?a$/i.test(s)) return null;
    if(s==="∞") return Infinity;
    if(s.indexOf(".")>=0 && s.indexOf(",")>=0){ s=s.replace(/,/g,""); }
    else if(s.indexOf(",")>=0){ var pa=s.split(","); s=(pa.length===2&&pa[1].length<=2)?(pa[0]+"."+pa[1]):s.replace(/,/g,""); }
    s=s.replace(/[^0-9.\-]/g,""); var n=parseFloat(s); return isNaN(n)?null:n; }
  function toBytes(raw){ if(raw==null) return null;
    var s=String(raw).replace(/\u00a0/g," ").trim();
    if(!s||s==="—"||s==="-"||/^n\/?a$/i.test(s)) return null;
    if(s==="∞") return Infinity;
    var m=s.match(/([\d.,\s]+)\s*([kmgtpe])?\s*i?\s*(?:b|o)\b/i);
    if(!m) return toNum(s);
    var num=toNum(m[1]); if(num==null) return null;
    var mult={"":1,k:1e3,m:1e6,g:1e9,t:1e12,p:1e15,e:1e18}[(m[2]||"").toLowerCase()]||1;
    return num*mult; }

  function rowStats(st){
    var stats=parseStats(st.stats); var up=null,dl=null,ra=null,bo=null,se=null,rang=null,oth=[];
    Object.keys(stats).forEach(function(k){ var v=stats[k];
      if(matchCol(k,COL_UPLOAD)&&!up) up=v;
      else if(matchCol(k,COL_DOWN)&&!dl) dl=v;
      else if(matchCol(k,COL_RATIO)&&!ra) ra=v;
      else if(matchCol(k,COL_BONUS)&&!bo) bo=v;
      else if(matchCol(k,COL_SEED)&&!se) se=v;
      else if(matchCol(k,COL_RANG)&&!rang){ if(v&&v!=="N/A") rang=v; }
      else if(v&&v!=="N/A") oth.push(k+": "+v);
    });
    return {up:up,dl:dl,ra:ra,bo:bo,se:se,rang:rang,oth:oth};
  }

  var WARN_TRI = '<span class="warn-tri" title="Hors ligne / échec de connexion">'+
    '<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'+
    '<path d="M12 3 L22.5 21 H1.5 Z" fill="#e8543a" stroke="#b23a23" stroke-width="1.4" stroke-linejoin="round"/>'+
    '<rect x="11" y="9" width="2" height="6" rx="1" fill="#fff"/>'+
    '<circle cx="12" cy="17.7" r="1.15" fill="#fff"/></svg></span>';
  function statusIndicator(kind){
    if(kind==="ko") return WARN_TRI;
    if(kind==="maintenance") return '<span class="dot dot-maintenance" title="Maintenance detectee automatiquement"></span>';
    var c = kind==="ok" ? "dot dot-live"
          : kind==="alert" ? "dot dot-alert dot-pulse"
          : kind==="wait" ? "dot dot-wait"
          : "dot dot-off";
    return '<span class="'+c+'"></span>';
  }

  // ---- tri des colonnes ----
  var sortState = { col:null, dir:1 };
  function colVal(site, byName, col){
    if(col==="name") return {t:"s", v:(site.name||"").toLowerCase(), empty:false};
    var st=byName[(site.name||"").toLowerCase()];
    if(col==="date"){ var iso=st&&st.last_ok; var d=iso?Date.parse(iso):NaN; return {t:"n", v:isNaN(d)?null:d, empty:isNaN(d)}; }
    var strCol=(col==="rang"||col==="autres");
    if(site.enabled===false) return {t:(strCol?"s":"n"), v:(strCol?"":null), empty:true};
    if(!st || !st.ok) return {t:(strCol?"s":"n"), v:(strCol?"":null), empty:true};
    var rs=rowStats(st);
    if(col==="rang"){ var r=rs.rang; return {t:"s", v:(r||"").toLowerCase(), empty:!r}; }
    if(col==="autres"){ var o=(rs.oth&&rs.oth.length)?rs.oth.join(" | "):""; return {t:"s", v:o.toLowerCase(), empty:!o}; }
    var raw = col==="upload"?rs.up : col==="download"?rs.dl : col==="ratio"?rs.ra : col==="bonus"?rs.bo : col==="seed"?rs.se : null;
    var n=(col==="upload"||col==="download")?toBytes(raw):toNum(raw);
    return {t:"n", v:n, empty:(n==null)};
  }
  function applySort(sites, byName){
    if(!sortState.col) return sites;
    var arr=sites.slice(), col=sortState.col, dir=sortState.dir;
    arr.sort(function(a,b){
      var va=colVal(a,byName,col), vb=colVal(b,byName,col);
      if(va.empty&&vb.empty) return 0;     // valeurs absentes toujours en bas
      if(va.empty) return 1;
      if(vb.empty) return -1;
      if(va.t==="s"){ var c=va.v.localeCompare(vb.v); return c<0?-dir : c>0?dir : 0; }
      var na=va.v, nb=vb.v;
      return na<nb?-dir : na>nb?dir : 0;
    });
    return arr;
  }
  function normNum(raw){ if(raw==null) return raw; var s=String(raw).trim();
    if(s===""||s==="—"||s==="-"||s==="N/A"||s==="∞") return s; return s; }
  function fmtDate(iso){ if(!iso) return null; var m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m?(m[3]+"/"+m[2]+"/"+m[1]+" "+m[4]+":"+m[5]):iso; }
  function placeholder(name){ var l=(name||"?").charAt(0).toUpperCase();
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#6b6560"/><text x="8" y="12" font-family="sans-serif" font-size="10" font-weight="700" fill="white" text-anchor="middle">'+l+'</text></svg>';
    return "data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg))); }
  function cell(val,sec){ var cls=sec?"col-secondary ":""; return val?'<td class="'+cls+'">'+esc(normNum(val))+'</td>':'<td class="'+cls+'na">—</td>'; }

  function actionsCell(info){
    var td=document.createElement("td"); td.style.textAlign="right"; td.style.whiteSpace="nowrap";
    var wrap=document.createElement("span"); wrap.className="av-actions";
    var t=document.createElement("button"); t.type="button"; t.className="av-act "+(info.enabled?"on":"off");
    t.innerHTML=ICON.power; t.title=info.enabled?"Désactiver":"Activer";
    t.addEventListener("click",function(ev){ev.stopPropagation();
      askConfirm((info.enabled?"Désactiver":"Activer")+" « "+info.name+" » ?", false, function(){ post("/toggle",{slug:info.slug}).then(refresh); });});
    var e=document.createElement("button"); e.type="button"; e.className="av-act ed"; e.innerHTML=ICON.edit; e.title="Éditer";
    e.addEventListener("click",function(ev){ev.stopPropagation(); openEdit(info.slug);});
    var ins=document.createElement("button"); ins.type="button"; ins.className="av-act"; ins.innerHTML=ICON.inspect; ins.title="Inspecter (voir ce que le bot reçoit)";
    ins.addEventListener("click",function(ev){ev.stopPropagation(); openInspect(info.slug, info.name);});
    var d=document.createElement("button"); d.type="button"; d.className="av-act de"; d.innerHTML=ICON.trash; d.title="Supprimer";
    d.addEventListener("click",function(ev){ev.stopPropagation();
      askConfirm("Supprimer « "+info.name+" » ? Cette action est définitive.", true, function(){ post("/delete",{slug:info.slug}).then(refresh); });});
    wrap.appendChild(t); wrap.appendChild(e); wrap.appendChild(ins); wrap.appendChild(d); td.appendChild(wrap); return td;
  }
  function nameCell(name, url, kind, alert){
    var slug=(name||"").toLowerCase();
    var bust=iconBust?("?v="+iconBust):"";
    var proto=/^https?:/.test(url||"")?url:("https://"+(url||""));
    var mp=alert?'<span class="mp-flag" title="'+esc(alert)+'">MP</span>':'';
    return '<td class="left"><div class="site-name">'+statusIndicator(kind)+
      '<img class="favicon" src="icones/'+encodeURIComponent(slug)+'.png'+bust+'" '+
      'onerror="this.onerror=null;this.src=\'icones/'+encodeURIComponent(slug)+'.ico'+bust+'\';this.onerror=function(){this.src=\''+placeholder(name)+'\';};">'+
      '<a href="'+esc(proto)+'" target="_blank" rel="noopener">'+esc(name)+'</a>'+mp+'</div></td>';
  }

  function renderRows(sites, status){
    var byName={}; ((status&&status.sites)||[]).forEach(function(s){ byName[(s.name||"").toLowerCase()]=s; });
    sites = applySort(sites, byName);
    tbody.innerHTML="";
    if(!sites.length){ tbody.innerHTML='<tr><td class="left" colspan="10" style="color:var(--dim);font-style:italic">Aucun site. Clique sur + pour en ajouter un.</td></tr>'; return; }
    sites.forEach(function(site){
      var st=byName[(site.name||"").toLowerCase()] || null;
      var info={slug:site.slug,name:site.name,enabled:site.enabled!==false};
      var tr=document.createElement("tr");
      var disabled = site.enabled===false;
      var kind = disabled?"off":(!st?"wait":(st.maintenance?"maintenance":(!st.ok?"ko":(st.alert?"alert":"ok"))));
      var html = nameCell(site.name, (st&&st.url)||site.url, kind, (st&&!disabled)?st.alert:null);
      if(disabled){ tr.className="row-disabled"; html+='<td class="left off-info" colspan="8">Désactivé</td>'; }
      else if(!st){ tr.className="row-ko"; html+='<td class="left off-info" colspan="8" style="font-style:italic">En attente de la première visite…</td>'; }
      else if(st.maintenance){ tr.className="row-maintenance"; var last=fmtDate(st.last_ok);
        html+='<td class="left maint-info" colspan="7">Maintenance détectée'+(last?(" — dernière connexion le "+last):"")+'</td>'
            + cell(fmtDate(st.last_ok),true); }
      else if(!st.ok){ tr.className="row-ko"; var last=fmtDate(st.last_ok);
        html+='<td class="left ko-info" colspan="7">'+(last?("Échec — dernière connexion le "+last):"Échec — aucune connexion réussie")+'</td>'
            + cell(fmtDate(st.last_ok),true); }
      else {
        var rs=rowStats(st);
        html+=cell(rs.up,false)+cell(rs.dl,true)+cell(rs.ra,false)+cell(rs.bo,true)+cell(rs.se,true)
            + cell(rs.rang,false)+cell(rs.oth.length?rs.oth.join(" | "):null,true)+cell(fmtDate(st.last_ok),true);
      }
      tr.innerHTML=html;
      tr.appendChild(actionsCell(info));
      tbody.appendChild(tr);
    });
  }

  // câblage du tri sur les en-têtes
  var lastSites=[], lastStatus={};
  var iconBust=0;
  function rerender(){ renderRows(lastSites, lastStatus); }
  function updateSortArrows(){
    document.querySelectorAll("thead th[data-col]").forEach(function(th){
      var a=th.querySelector(".sort-arrow"); th.classList.remove("sorted");
      if(th.getAttribute("data-col")===sortState.col){ th.classList.add("sorted"); if(a) a.textContent=sortState.dir>0?" ▲":" ▼"; }
      else if(a){ a.textContent=""; }
    });
  }
  function wireSort(){
    document.querySelectorAll("thead th[data-col]").forEach(function(th){
      th.classList.add("av-sortable");
      if(!th.querySelector(".sort-arrow")){ var a=document.createElement("span"); a.className="sort-arrow"; th.appendChild(a); }
      th.addEventListener("click", function(){
        var col=th.getAttribute("data-col");
        if(sortState.col===col){ sortState.dir=-sortState.dir; }
        else { sortState.col=col; sortState.dir=(col==="name")?1:-1; }
        updateSortArrows(); rerender();
      });
    });
  }

  function syncLogos(sites){
    var pairs=[];
    (sites||[]).forEach(function(s){
      var url=(s.url||"").toLowerCase(), best=null;
      TRACKERS.forEach(function(t){ if(t.lg&&t.d&&url.indexOf(t.d.toLowerCase())>=0){ if(!best||t.d.length>best.d.length) best=t; }});
      if(best) pairs.push({key:(s.name||"").toLowerCase(), logo:best.id});
    });
    if(pairs.length) post("/logosync",{pairs:pairs}).catch(function(){});
  }

  var refreshing=false;
  function refresh(){
    if(refreshing) return; refreshing=true;
    Promise.all([
      fetch("/sites").then(function(r){return r.json();}).catch(function(){return null;}),
      fetch("status.json?_="+Date.now()).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})
    ]).then(function(res){
      var sites=((res[0]&&res[0].sites)||[]);
      var status=res[1]||{};
      lastSites=sites; lastStatus=status;
      if(updatedEl) updatedEl.textContent = status.updated ? ("Mis à jour : "+status.updated) : "—";
      renderRows(sites, status);
      syncLogos(sites);
    }).catch(function(){}).then(function(){ refreshing=false; });
  }

  bAdd.addEventListener("click", openAdd);
  wireSort();
  document.addEventListener("keydown", function(e){ if(e.key==="Escape"){
    if(iov.classList.contains("open")) closeInspect();
    else if(cf.classList.contains("open")) closeConfirm();
    else if(sov.classList.contains("open")) closeSettings();
    else if(ov.classList.contains("open")) closeAdd(true); }});

  function init2(){ loadSettings(); refresh(); }
  function init(){
    fetch("/auth/status").then(function(r){return r.json();}).then(function(j){
      if(j&&j.ok){ authState={configured:j.configured,twofa:j.twofa,authed:j.authed}; }
      updateAuthBtn();
      if(!authState.configured){ showLogin(true); return; }
      if(authState.configured && !authState.authed){ showLogin(); return; }
      init2();
    }).catch(function(){ init2(); });
  }
  if(document.readyState!=="loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
