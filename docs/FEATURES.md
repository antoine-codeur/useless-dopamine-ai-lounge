# Référentiel features & finition — Useless Dopamine AI

> **Philosophie** : une feature classique « finie » ne crée plus de frustration — mais elle ne crée
> pas de satisfaction. Notre barre est plus haute : **une feature n'est finie que quand
> l'interaction elle-même procure une sensation.** On ne vend pas des fonctions, on vend de la
> sensation. Chaque micro-interaction (touch, clavier, hover, clic) doit être sensationnelle.

## L'échelle de finition (la frise)

Chaque feature monte les 5 marches. La frise `■■□□□` note la marche atteinte.

| Étape | Nom | Critère de passage | Émotion produite |
|---|---|---|---|
| **S1** | Fonctionne | Le happy path marche. | ⚠️ Peut frustrer (pièges, actions sans filet) |
| **S2** | Fiable | Edge cases, erreurs, états vides gérés. Zéro bug connu. | 😐 Zéro frustration = le « fini » classique |
| **S3** | Standardisée | Tokens + composants réutilisables, cohérence totale, a11y + clavier complets. | 🙂 Propre, digne de confiance |
| **S4** | Satisfaisante | Tous les états soignés (hover/press/focus/loading/empty/error), feedback < 100 ms, transitions tokenisées. | 😊 Satisfaction |
| **S5** | Sensationnelle | L'interaction est une récompense : ressort signature, glow, célébration, chiffres qui comptent, undo élégant, prêt son/haptique. | 🤩 Sensation — **seule marche où une feature est FINIE** |

### Checklist S4 (satisfaisante) — testable
- [ ] Hover, press, focus, disabled, loading : chacun a un état visuel distinct et tokenisé
- [ ] Feedback visible < 100 ms après chaque input (optimiste si réseau)
- [ ] États vide / erreur / succès dessinés (pas de texte brut par défaut)
- [ ] Transitions via `--duration-*` / `--ease-*`, jamais de valeurs inline
- [ ] Aucun clic mort, aucun changement d'état sans feedback

### Checklist S5 (sensationnelle) — testable
- [ ] Le press a un ressort signature (spring) + réaction lumineuse (glow bloom)
- [ ] Les nombres importants comptent (count-up), ne sautent pas
- [ ] Les récompenses ont une mise en scène (reveal, particules, pause dramatique)
- [ ] Destructif = undo élégant (toast), jamais de « êtes-vous sûr ? » frustrant
- [ ] Hooks prêts pour son + haptique (même désactivés par défaut)
- [ ] `prefers-reduced-motion` respecté partout (y compris framer-motion)

---

## Inventaire (132 features) — état au 2026-07-02

Légende frise : `■` = marche atteinte (S1→S5). **Fini = ■■■■■ uniquement.**

### A. Shell & navigation — 13 features · pire frustration : Clear chat sans filet

| # | Feature | Détail | Frise |
|---|---|---|---|
| A1 | Grille app responsive | 3 colonnes → 2 (≤1160, inspector masqué) → rail 56px + stage (≤760) ; largeur sidebar en CSS var (les breakpoints gagnent) | ■■■□□ S3 |
| A2 | Sidebar repliable | **rail d'icônes utilisable** : nav complète + New session + avatar, tooltips au survol, toggle dans le header, **Ctrl+B** | ■■■□□ S3 |
| A3 | Sidebar redimensionnable | drag 220–420px, auto-repli < 96px | ■■□□□ S2 |
| A4 | Persistance sidebar | largeur + état repli (localStorage) | ■■□□□ S2 |
| A5 | Nav principale 8 sections | Chat/Profile/Plans/Usage/Activity/Earn/Gallery/Settings, actif dégradé | ■■■□□ S3 |
| A6 | Brand block | logo dégradé + headline + eyebrow | ■■■□□ S3 |
| A7 | ~~Window dots décoratifs~~ | supprimés (déco sans fonction) | — retirée |
| A8 | Titre conversation cliquable | clic = renommer, chevron | ■■□□□ S2 |
| A9 | Pill statut API | visible **seulement** si offline/checking — silence quand tout va bien | ■■■□□ S3 |
| A10 | Bouton Upgrade topbar | raccourci vers Plans | ■■□□□ S2 |
| A11 | Clear chat | vide le thread, toast **Undo** restaure tout | ■■■□□ S3 |
| A12 | Tooltips flottants globaux | composant `FloatingTooltip` mesuré : clamp horizontal à sa largeur + **flip au-dessus** près du bas — jamais coupé | ■■■□□ S3 |
| A13 | Landing invité | intro centrée, chrome masqué | ■■□□□ S2 |

### B. Conversations (threads) — 10 features · pire frustration : Delete sans undo

| # | Feature | Détail | Frise |
|---|---|---|---|
| B1 | Nouvelle session | réutilise le thread vide courant (anti-doublon) | ■■□□□ S2 |
| B2 | Changement de thread | purge les threads vides au passage | ■■□□□ S2 |
| B3 | Renommage inline | Enter/Escape/blur, trim, max 80 car. | ■■□□□ S2 |
| B4 | Épingler / désépingler | tri pinned > récent | ■■□□□ S2 |
| B5 | Archiver / restaurer | + toggle « voir archivés » | ■■□□□ S2 |
| B6 | Supprimer un thread | toast **Undo** réinsère la conversation entière | ■■■□□ S3 |
| B7 | Menu contextuel ⋯ | rename/pin/archive/delete, fermeture clic-extérieur + Escape | ■■□□□ S2 |
| B8 | ~~Badge nb messages~~ | supprimé — bruit visuel ; les références (ChatGPT/Claude) listent des titres nus | — retirée |
| B9 | Titre auto | 1er prompt nettoyé (@mentions, 6 mots, capitalisé) | ■■□□□ S2 |
| B10 | Persistance threads | zustand persist + migration v2 robuste | ■■■□□ S3 |

### C. Chat & messages — 9 features · pire frustration : auto-scroll forcé

| # | Feature | Détail | Frise |
|---|---|---|---|
| C1 | Auto-scroll du feed | smart-stick : ne colle en bas que si le lecteur y est déjà | ■■□□□ S2 |
| C2 | Bulles animées | entrée fade + lift + scale (framer) | ■■■□□ S3 |
| C3 | Méta de bulle | auteur (You/AI/System) + coût « -5 credits » | ■■□□□ S2 |
| C4 | Statuts de message | queued → processing → done | ■■□□□ S2 |
| C5 | Plan de traitement simulé | étapes aléatoires, variantes @fast / @deep | ■■□□□ S2 |
| C6 | Skip génération | stoppe la simulation, aucun crédit en plus | ■■□□□ S2 |
| C7 | PJ dans les bulles | miniatures images / icône fichier, download | ■■□□□ S2 |
| C8 | Réponses simulées contextuelles | selon mots-clés (code/design/@wiki/@lorem) | ■■□□□ S2 |
| C10 | Render markdown (GFM) | composant `Markdown` sûr (pas de HTML brut), liens _blank, code/tables/citations/images stylés tokens | ■■■□□ S3 |
| C11 | Wikis aléatoires | chaque réponse IA fetch un article Wikipédia aléatoire parsé en markdown (titre, image, extrait, lien) ; fallback offline | ■■■□□ S3 |
| C12 | Repli des longs prompts | message utilisateur > 420 car. replié avec fondu + « Show full message » | ■■■□□ S3 |
| C13 | Actions sur réponse IA | hover : copy markdown, 👍/👎 **par bourgeon** (liker le résultat 1 ≠ liker le 2), retry, branch | ■■■□□ S3 |
| C14 | Retry = bourgeons | chaque retry ajoute un résultat au même message ; pager ‹ 2/3 › pour naviguer les bourgeons ; coûte 1 prompt | ■■■□□ S3 |
| C15 | Bourgeon → branche | depuis le bourgeon affiché, fork du fil en nouveau thread (« Titre · branch ») dont il devient la pointe | ■■■□□ S3 |
| C16 | Édition du dernier prompt | crayon au hover → édition inline (Enter/Escape) → tronque et régénère la branche | ■■■□□ S3 |
| D11 | Historique ↑/↓ | ↑ sur composer vide rappelle le dernier prompt, ↑↑ remonte, ↓ redescend jusqu'à vide ; renvoyable ou éditable | ■■■□□ S3 |
| C9 | ~~Message d'accueil système~~ | supprimé — copy invité incohérente ; l'intro centrée fait le travail (migration v3 purge l'historique) | — retirée |

### D. Composer — 10 features · pire frustration : cap PJ silencieux

| # | Feature | Détail | Frise |
|---|---|---|---|
| D1 | Textarea auto-resize | jusqu'à 160px | ■■□□□ S2 |
| D2 | Envoi au clavier | **Enter envoie** (standard chat), Shift+Enter = retour ligne, IME-safe | ■■■□□ S3 |
| D3 | Autocomplete | dictionnaire 18 mots, Tab accepte, ↑↓ navigue, clic | ■■□□□ S2 |
| D4 | Quick prompts | 4 chips (conversation vide uniquement), wrap sans scrollbar, hover lift | ■■■□□ S3 |
| D5 | Sélecteur de fichiers | multiple, filtre > 2,5 Mo avec message | ■■□□□ S2 |
| D6 | Pills de PJ | miniature, nom, bouton retrait | ■■□□□ S2 |
| D7 | Limite 8 PJ | toast d'alerte quand la limite est atteinte | ■■□□□ S2 |
| D8 | Quick select variante | light/dark direct depuis le composer | ■■□□□ S2 |
| D9 | Bouton Send | disabled logique, spinner, dégradé + glow | ■■■□□ S3 |
| D10 | Bannière limite crédits | apparition animée, message compte/invité | ■■□□□ S2 |

### E. Auth & session — 8 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| E1 | Session invité auto | credits réels, guestId persistant | ■■□□□ S2 |
| E2 | Modal auth | tabs signup/login, backdrop, Escape, role=dialog | ■■■□□ S3 |
| E3 | Validation email live | hint ↔ erreur, aria-invalid | ■■■□□ S3 |
| E4 | Checklist mot de passe | 5 règles live, aria-live | ■■■□□ S3 |
| E5 | Erreurs contextuelles | email pris, credentials invalides | ■■□□□ S2 |
| E6 | Message d'intention | la modal explique pourquoi créer un compte | ■■□□□ S2 |
| E7 | Persistance session | accountId stocké, fallback invité si perdu | ■■□□□ S2 |
| E8 | Déconnexion propre | retour invité + rechargement plans | ■■□□□ S2 |

### F. Onboarding — 6 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| F1 | Frise de progression | 3 étapes, dots actif/fait | ■■□□□ S2 |
| F2 | Étape profil | nom + handle, validation live, hints | ■■■□□ S3 |
| F3 | Étape avatar | upload ou skip | ■■□□□ S2 |
| F4 | Éditeur d'avatar | zoom slider, crop 256px JPEG 0.86 | ■■□□□ S2 |
| F5 | Clavier éditeur | Enter = save, Escape = close | ■■□□□ S2 |
| F6 | Étape anniversaire | optionnelle, refuse les dates futures | ■■□□□ S2 |

### G. Profil — 9 features · pire frustration : feedback texte statique

| # | Feature | Détail | Frise |
|---|---|---|---|
| G1 | Hero profil | avatar, nom, @handle, plan | ■■□□□ S2 |
| G2 | Avatar au clic | overlay crayon → éditeur | ■■□□□ S2 |
| G3 | Drag & drop d'image | overlay « Drop to resize », filtre type image | ■■□□□ S2 |
| G4 | Stat-tiles profil | 5 tuiles : crédits used/left, boosters, streak courant, meilleur streak + plan en pill | ■■■□□ S3 |
| G5 | Formulaires validés | nom/handle/date, hints + aria-invalid | ■■■□□ S3 |
| G6 | Email verrouillé | affiché, non éditable | ■■□□□ S2 |
| G7 | Changement de mot de passe | current + new + checklist | ■■□□□ S2 |
| G8 | Feedback de sauvegarde | toasts animés pour les succès, erreurs inline | ■■■□□ S3 |
| G9 | Guest panel | CTA créer un compte / se connecter | ■■□□□ S2 |

### H. Plans & monétisation (simulée) — 8 features · pire frustration : gating muet

| # | Feature | Détail | Frise |
|---|---|---|---|
| H1 | 4 plans à icônes | Free 🛡 / Pro ⭐ / Max 🚀 / Max+ 👑, badge **Recommended** sur Max | ■■■□□ S3 |
| H2 | Toggle mensuel/annuel | annuel = coût ×10, centré façon ChatGPT | ■■□□□ S2 |
| H3 | Cartes plan | style ChatGPT : prix héro (⚡ + gros chiffre), tagline, CTA par carte, « Everything in X and: », features iconées | ■■■□□ S3 |
| H4 | Plan actuel | surbrillance data-active | ■■□□□ S2 |
| H5 | Gating par crédits | « Missing X credits » affiché sur les plans verrouillés | ■■□□□ S2 |
| H6 | Upgrade par crédits | dépense le solde pour débloquer | ■■□□□ S2 |
| H7 | Flow « limite atteinte » | titre bannière + redirection auto vers Plans | ■■□□□ S2 |
| H8 | Renouvellement daté | même jour mois/année suivant | ■■□□□ S2 |

### I. Économie de crédits — 6 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| I1 | Solde | compte ou invité, source unique | ■■□□□ S2 |
| I2 | Coût par prompt | 5 crédits, affiché partout | ■■□□□ S2 |
| I3 | Usage hebdo | décompte cumulé | ■■□□□ S2 |
| I4 | Régénération | +20 / 5h, plafond 250 (invité) | ■■□□□ S2 |
| I5 | Limite invité | bascule vers CTA compte | ■■□□□ S2 |
| I6 | Refus d'envoi | solde insuffisant → vue Plans | ■■□□□ S2 |

### J. Earn & gamification — 7 features · **le cœur dopamine est le moins fini**

| # | Feature | Détail | Frise |
|---|---|---|---|
| J1 | 3 quêtes | daily check-in, 1er booster, 3 prompts | ■■□□□ S2 |
| J2 | Quête quotidienne | re-claimable chaque jour | ■■□□□ S2 |
| J3 | Claim de quête | célébration plein écran (orb, burst, count-up) | ■■■■□ S4 |
| J4 | Inventaire boosters | compteur disponible | ■■□□□ S2 |
| J5 | Ouverture de booster | reveal gacha : charge → burst de particules → count-up | ■■■■□ S4 |
| J6 | Cadeau d'anniversaire | 1×/an le jour J, nécessite la date | ■■□□□ S2 |
| J7 | Cartes guide | comment gagner des crédits | ■■□□□ S2 |

### K. Activity — 5 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| K1 | Heatmap 12 mois | GitHub-style (53 semaines × 7 j), niveaux relatifs au max, mois en légende, composant réutilisable | ■■■□□ S3 |
| K2 | Tooltip par cellule | flottant stylé, « X pts · Jun 2 » | ■■■□□ S3 |
| K3 | Toggles d'échelle | Daily / Weekly / Cumulative (colonnes-barres de cellules) | ■■■□□ S3 |
| K4 | Insights | Total, jours actifs, streak courant, meilleur streak, meilleur jour (lib `activity.stats`) | ■■■□□ S3 |
| K5 | Mini-calendrier inspector | grille compacte 35 j | ■■□□□ S2 |

### L. Usage — 4 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| L1 | Métriques | coût, utilisé, restant, boosters | ■■□□□ S2 |
| L2 | Détails | plan, cycle, renouvellement, messages du thread | ■■□□□ S2 |
| L3 | Liens rapides | Earn credits, Open gallery | ■■□□□ S2 |
| L4 | Carte usage inspector | 4 stat-rows + raccourci | ■■□□□ S2 |

### M. Gallery — 5 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| M1 | Grille globale | toutes les PJ de toutes les conversations | ■■□□□ S2 |
| M2 | Aperçus | image ou icône fichier | ■■□□□ S2 |
| M3 | Téléchargement | clic = download nommé | ■■□□□ S2 |
| M4 | Contexte | titre du thread d'origine | ■■□□□ S2 |
| M5 | Empty state | invitation à attacher depuis le composer | ■■□□□ S2 |

### N. Thèmes & apparence — 9 features · le plus avancé

| # | Feature | Détail | Frise |
|---|---|---|---|
| N1 | 6 thèmes d'identité | Default AI, Neon, Cosmic, Candy, Brawl, Corporate — revibrés | ■■■□□ S3 |
| N2 | 4 modes | dark / dark-polarized / light / light-polarized | ■■■□□ S3 |
| N3 | Injection runtime | ThemeProvider → variables --color-* | ■■■□□ S3 |
| N4 | Défaut light-polarized | + migration v2 des sessions existantes | ■■■□□ S3 |
| N5 | Selects Settings | thème + variante, **libellés humains** (« Light · high contrast », plus de jargon token) | ■■■□□ S3 |
| N6 | Chips thème inspector | actif en dégradé | ■■■□□ S3 |
| N7 | Menu d'apparence (composer) | palette → popover ancré : 4 variantes iconées (☀/🌙 × classique/contraste), état actif, lien « More themes… », clic-extérieur + Escape | ■■■□□ S3 |
| N8 | Fondation tokens | spacing, radius, typo, elevation, gradients, motion, layout | ■■■□□ S3 |
| N9 | Couche sucre | gradients de marque, glows, sheen (slice 1 posée) | ■■■□□ S3 |

### O. Inspector — 4 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| O1 | Hero Crédits | carte dégradé + **count-up animé** à chaque variation | ■■■■□ S4 |
| O2 | InfoBubble crédits | aide au hover/focus + liens Earn/Plans | ■■□□□ S2 |
| O3 | Carte stats usage | 4 lignes + raccourci | ■■□□□ S2 |
| O4 | Carte activité | mini-grille + InfoBubble + raccourci | ■■□□□ S2 |

### P. Menu compte — 4 features · pire frustration : popover sans fermeture

| # | Feature | Détail | Frise |
|---|---|---|---|
| P1 | Bouton compte | avatar, nom, plan, chevron | ■■□□□ S2 |
| P2 | Popover menu | Profile/Settings/Usage/Copy ID/Logout, fermeture clic-extérieur + Escape | ■■□□□ S2 |
| P3 | Variante invité | Create / Sign in / Usage | ■■□□□ S2 |
| P4 | Copier l'ID | clipboard + message | ■■□□□ S2 |

### Q. Transverse : interactions & a11y — 8 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| Q1 | Focus ring global | --ring-focus sur tout élément focusable | ■■■□□ S3 |
| Q2 | Rôles ARIA | dialog, menu, tablist, listbox, alert, live | ■■□□□ S2 |
| Q3 | Clavier modales | Escape ferme, Enter valide (avatar) | ■■□□□ S2 |
| Q4 | prefers-reduced-motion | tokens CSS oui — **framer-motion pas encore gaté** | ■■□□□ S2 |
| Q5 | Spring des boutons | hover 1.02 / tap 0.96 sur tous les Button | ■■■□□ S3 |
| Q6 | Tooltips focusables | pointer + focus, jamais orphelins | ■■□□□ S2 |
| Q7 | ::selection stylée | teinte translucide de marque, lisible sur tous les thèmes | ■■□□□ S2 |
| Q8 | États disabled | opacité + cursor cohérents | ■■□□□ S2 |

### R. Plateforme & infra — 7 features

| # | Feature | Détail | Frise |
|---|---|---|---|
| R1 | Backend Node | 11 endpoints REST (session, comptes, quêtes, boosters, agent) | ■■□□□ S2 |
| R2 | Persistance backend | JSON sur volume Docker | ■■□□□ S2 |
| R3 | Healthchecks | back + front, wget interne | ■■■□□ S3 |
| R4 | Deploy compose | nginx + proxy /api + make deploy (port 8094) | ■■■□□ S3 |
| R5 | Shell desktop Tauri | présent, **non vérifié récemment** | ■□□□□ S1 |
| R6 | Build strict | TS strict + noUnusedLocals + vite 7 | ■■■□□ S3 |
| R7 | Scripts verify_*.sh | auth/rewards/upgrade, ad-hoc | ■□□□□ S1 |

### S. Système de sensation — 4 features (ajouté le 2026-07-02)

| # | Feature | Détail | Frise |
|---|---|---|---|
| S1 | Toaster | notifications animées (spring), variantes, action **Undo**, auto-dismiss, pile de 3 | ■■■□□ S3 |
| S2 | RewardReveal | célébration plein écran : charge → burst 14 particules → count-up, Escape/Enter/clic, reduced-motion | ■■■■□ S4 |
| S3 | CountUp | nombres qui comptent (ease-out cubic), reduced-motion respecté | ■■■■□ S4 |
| S4 | useDismiss | fermeture clic-extérieur + Escape, réutilisable pour tout popover | ■■■□□ S3 |

---

## Synthèse

| État | Nb | % | Lecture |
|---|---|---|---|
| S1 — frustre encore | **2** | 1,5 % | R5 Tauri, R7 scripts — infra uniquement |
| S2 — fiable (« fini » classique) | **95** | 71 % | fonctionne, n'émeut pas encore |
| S3 — standardisée | **31** | 23 % | refactor + tokens + système de sensation |
| S4 — satisfaisante | **5** | 4 % | J3 claim, J5 booster, O1 count-up, RewardReveal, CountUp |
| S5 — sensationnelle = FINIE | **0** | 0 % | prochaine cible : composer/send et booster → S5 |

**133 features (−3 supprimées, +4 système de sensation). 0 finies à S5** — mais les
**13 frustrations UX sont purgées**, le circuit de récompense est en place, et la passe
anti-patterns du 2026-07-02 (soir) a nettoyé le chrome (détail au Journal).

## Frise de progression par groupe

```
A Shell & nav      ■■□□□ 2.3   J Earn/gamif      ■■■□□ 2.6  ← circuit de récompense posé
B Threads          ■■□□□ 2.2   K Activity        ■■□□□ 2.0
C Chat & messages  ■■□□□ 2.1   L Usage           ■■□□□ 2.0
D Composer         ■■□□□ 2.2   M Gallery         ■■□□□ 2.0
E Auth             ■■□□□ 2.4   N Thèmes          ■■■□□ 2.8
F Onboarding       ■■□□□ 2.2   O Inspector       ■■■□□ 2.5
G Profil           ■■□□□ 2.2   P Menu compte     ■■□□□ 2.0
H Plans            ■■□□□ 2.0   Q Interactions    ■■□□□ 2.3
I Crédits          ■■□□□ 2.0   R Infra           ■■□□□ 2.1
                               S Sensation       ■■■■□ 3.5  ← nouveau socle
```

## Plan de montée (3 fronts, dans l'ordre)

### Front 1 — Purger les 13 frustrations (S1 → S2) — ✅ FAIT le 2026-07-02
Undo toasts (clear/delete), fermetures clic-extérieur + Escape (menus/popovers), smart-scroll,
alertes PJ, « missing credits », célébrations quêtes/boosters/anniversaire, tooltip calendrier
flottant, ::selection thème-aware, dots supprimés. Restent R5/R7 (infra, hors UX).
→ Règle appliquée : le destructif gagne un **undo**, jamais un « êtes-vous sûr ».

### Front 2 — Standardiser (S2 → S3)
Continuer : extraction Sidebar/Composer/Profile/Onboarding, découpe de ChatPage.css,
migration des 110 px restants vers les tokens, propagation du sucre (bulles, cards, modales).

### Front 3 — La montée en sensation (S3 → S4 → S5), par fréquence de contact
1. **Composer + Send** — l'interaction la plus répétée : press ressort, glow d'envoi, décollage du message
2. **Nav + threads** — transitions de vue, hover lift, undo toast
3. **Bulles de chat** — arrivée orchestrée, statuts vivants
4. **Hero Crédits** — count-up, pulse à la dépense/gain
5. **Booster opening** — LE moment gacha : mise en scène complète (pause, reveal, particules)
6. **Claim de quête** — célébration proportionnelle à la récompense
7. **Changement de thème** — morphing des couleurs senti
8. **Onboarding** — la première impression, en dernier pour capitaliser le système acquis

---

## Journal

- **2026-07-04 (stamp dynamique + refund au cancel)** — Le stamp du prompt démarre à **1⚡ et
  s'incrémente en direct** à chaque step qui apparaît (intro, plan, rendering) jusqu'au total.
  **Cancel à 3/5 = 3⚡** : les steps non exécutés sont remboursés pour de vrai (`POST /steps-refund`,
  comptes ET invités, clamp 0–11, `creditsUsed`/`activityByDate` réajustés), stamp figé au consommé,
  ledger "+N Cancelled at step 3/5", compteur credits-spent corrigé. **Le remboursement est
  invisible côté user** : message "Generation cancelled — no additional credit consumed." et toast
  sobre — le stamp s'arrête simplement à ce qui a tourné.
- **2026-07-04 (steps visibles = crédits)** — La facturation comptait le plan seul mais la card
  affiche aussi l'intro persona + "Rendering…" ("7 steps" facturés 5). Le prix suit désormais le
  compte VISIBLE (`visibleStepsFor = plan + 2`) partout (envoi, queue, generateContent) ; plan
  resserré à 2–3 steps → 4–5 steps visibles = 4–5⚡, retry toujours 1 step = 1⚡.
- **2026-07-04 (topbar conditionnelle)** — Le toggle du side panel (inspector) est masqué sous
  1160px — là où l'inspector n'existe plus, le bouton était mort. "Clear current conversation"
  n'apparaît que dans le chat ET quand la conversation a du contenu.
- **2026-07-04 (composer power-tools + contraste)** — **Coller = attacher** : coller des fichiers/
  images dans le composer les attache ; un texte collé > 1 500 caractères devient une pièce jointe
  `.txt` nommée par ses premiers mots (jamais volé aux invités : sans plan payant le paste reste
  normal). **Dictée vocale** : bouton micro dans le composer (Web Speech API native, zéro dépendance,
  langue du navigateur), pulse rouge pendant l'écoute, transcriptions finales ajoutées au prompt.
  **Drag & drop depuis l'OS** : déposer des fichiers sur la page chat affiche l'overlay "Drop to
  attach" (pointillés brand, blur) et attache au prompt (compteur dragenter/leave anti-flicker).
  **Contraste** : le toast de quête était un `<button>` sans `color` → texte noir en dark mode ;
  `color: var(--color-text)` + audit des autres boutons custom (tous OK). — **Corrections précédentes
  du jour** : coût **1⚡ par step** (plan 3–6 steps ≈ 4-5⚡, retry = 1 step = 1⚡, serveur clamp 1–12),
  inspector recentré (`scrollbar-gutter: stable both-edges`). **Ranking** (nav) : gains journaliers/
  hebdo/mensuels/annuels/total par compte (backend `gainsByDate` + `/leaderboard` sanitisé), podium
  médaillé, ligne "you" surlignée, usage en secondaire. **Season pass** (nav "Pass") : saisons
  mensuelles, XP (prompts +5, quêtes +10/15, boosters +10, **check-in quotidien** 60+streak×10, cap
  ×7), 30 paliers × 2 pistes (free 15+5t / premium 30+10t), **upgrade premium 750⚡** (non
  remboursable, tracé), boost de plan appliqué aux claims. **+9 séries de quêtes** : mythic/legendary
  pulls, refunds, check-ins, streaks, season levels/claims, ranking views.
- **2026-07-03 (nuit, audit mobile + économie v3)** — **Audit tactile** : tiroir mobile (la thumb bar
  gagne "Chats" → la sidebar complète glisse en drawer : sélection de conversations, nav, compte ;
  backdrop, fermeture auto à la navigation) ; l'onglet compte de la thumb bar **ouvre enfin le menu**
  (le popover vivait dans la sidebar cachée → drawer + ancrage) ; la thumb bar ne réapparaît plus
  quand on tape apparence/persona/attach (pointerdown + relatedTarget dans `.prompt-dock`) ; les
  contrôles révélés au hover (actions de bulle, ⋯ des threads, overlay avatar) sont toujours
  visibles en `hover: none`. **Mythic = jackpot** : en frénésie chaque tap n'est plus +1 garanti
  mais une CHANCE dégressive [55/40/28/16/4 %], mythic paie 2 000⚡ (legendary 300), roll ×10 à
  0,5 % de mythic. **Bonus de gains par plan** : Pro +5 %, Max +10 %, Max+ +20 % sur boosters,
  quêtes (backend + achievements) et combos (bonus & jackpot) — miroir client `lib/planPerks.ts` /
  backend. **Usage ≠ dépense** : `creditsUsed` ne compte plus que le chat (achats boutique exclus,
  backend + client), labels "Chat usage". **Stats++** : carte Shop (possédés/achetés/ouverts, pity,
  achats, dépensé en boutique, refunds, bonus de plan) + labels pour tous les compteurs récents.
- **2026-07-03 (soir, notif quêtes + ledger + refunds + delete + coût variable)** — **Toast de
  quête** : l'anneau du combo réutilisé en jauge de progression (gris → vert, check qui pop à
  100 %), coalescé, seuils 25/50/75 % + complétion ; cliquer navigue vers Quests, scroll + pulse sur
  la quête exacte. **Ledger de crédits** (`uda:ledger`, scopé) : chaque mouvement tracé (prompts,
  quêtes, boosters, combos, achats, refunds, plans, cadeaux) → carte "Credit sources" dans Stats
  (totaux par source + 60 dernières lignes). **Historique d'achats + 3 refunds à vie** (LoL) :
  thèmes/personas/high-contrast re-verrouillés au refund (fallback default-ai/Librarian si actif),
  boosters refundables uniquement NON ouverts (endpoint backend) ; pilule "N/3 refunds left".
  **Suppression de compte** : DELETE backend — anonymisation façon Discord ("Deleted User", email
  scellé, hash aléatoire) si le compte a interagi, hard delete sinon ; modale de confirmation,
  bucket local purgé, retour invité. **Coût variable des prompts** : plan de steps aléatoire (2–6)
  tiré AVANT l'envoi, prix = 2 + steps (clamp 3–12, serveur autoritaire, `cost` renvoyé) — @fast
  moins cher que @deep. **Emojis → icônes** : ⚡→Zap, 🧩/✨/⏱️/★ remplacés (lucide) partout.
- **2026-07-03 (soir, boutique v2 + boosters persistés)** — **Les boosters passent par le backend** :
  `POST /boosters/buy` (prix serveur 1→120⚡, 10→1 000⚡, refus 402 propre) et `POST /boosters/daily`
  (verrou `dailyBoosterDay` par compte) — fini le bug "j'achète, ça s'ouvre pas, et au refresh je
  repasse à 0" (l'achat était optimiste côté client, le serveur n'en savait rien). Le claim quotidien
  des Quests utilise le même endpoint. **Boutique par catégories** : Personas (les 7 listés, prix ou
  badge Included/Owned, **Buy all**), Themes (les 6 + variantes high-contrast, swatch dégradé, badge
  Active + bouton **Use**, **Buy all**), Plan perks (attachments/queue/plans avec badge "In your
  plan"), Free & missions (daily booster **claimable dans la boutique** avec badge "Claimed today",
  achievements). Rangées en liste sémantique (ul/li) : plus aucun bouton qui chevauche le texte.
  Pity du shop (`uda:shop`) désormais scopé par compte.
- **2026-07-03 (soir, combo→bonus + boutique v1 + toolbar tableaux v3)** — **Fin de combo valorisée** :
  à la fin de l'anneau, une 2ᵉ notification transforme le combo en crédits — (combo−1)×10 (combo 9
  = +80, combo 2 = +10 ; un claim isolé ne paie pas double), créditée pour de vrai, avec son propre
  anneau 2.6 s. **Boutique** (rail) : hero boosters avec pity affiché (1ᵉʳ booster ≥ Rare garanti,
  puis 1 Rare+ garanti par tranche de 10 ouvertures), achat ×1/×10, ouverture ×1/×10 avec reveal en
  grille des 10 raretés + total base/bonus. Quête "Shopper" (achats de boosters). **Tableaux** : la
  toolbar redevient une rangée en flux collée au tableau (zone de hover d'un seul tenant — plus de
  disparition quand la souris arrive sur le bouton), nowrap pour les petits tableaux, 4 boutons
  uniformes (Copy/Download × CSV/JSON) toujours visibles en discret (opacité 50 %→100 %). **Rail
  réduit v3 (vraie cause)** : les marges négatives de `.sidebar__account` (−0.65rem) + sa colonne
  `1fr` décentraient tout — en réduit il devient un cercle flex 2.6rem et la sidebar passe en
  `justify-items: center`.
- **2026-07-03 (après-midi, données par compte + fixes hover/rail)** — **Tout est lié au compte** :
  buckets localStorage par identité (`key::scope`) pour thèmes/unlocks, conversations & gallery,
  personas, quêtes, télémétrie ; bascule au boot/login/signup/signout avec reload (signup **migre
  la progression invitée** vers le compte ; login restaure le bucket du compte ; logout repart sur
  le bucket invité, les données du compte restent parquées). **Toolbar de tableau** : positionnée à
  cheval sur le bord haut du tableau (zone de hover continue, plus de disparition en l'atteignant)
  + délai de fermeture 150 ms. **Rail réduit enfin centré** : les carrés de 2.25rem débordaient des
  35px utiles (padding 0.65rem) → padding-inline réduit à 0.45rem en mode réduit.
- **2026-07-03 (midi, export à côté de la data)** — La toolbar CSV/JSON quitte la rangée d'actions
  de la bulle pour vivre **sur chaque tableau** (renderer `table` custom de react-markdown) :
  révélée au hover (fixe sur tactile), **copie presse-papier** (⧉ CSV / ⧉ JSON) **et export
  fichier** (⬇), données relues depuis le DOM du tableau (marche pour tout tableau markdown),
  nom de fichier toujours dérivé du titre du résultat via `exportName`.
- **2026-07-03 (midi, mobile care)** — **Activity responsive** : cartes en `min-width: 0`
  (la heatmap scrolle en interne au lieu de pousser la page), insights/metrics en 2 colonnes,
  heading et header de heatmap empilés en colonne ≤760px. **Thumb bar « You » invité** → ouvre
  directement la modale sign-up/login (libellé « Sign in »). **Clavier virtuel** : heuristique
  focusin/focusout sur les champs éditables → `data-keyboard` sur le shell → **la thumb bar glisse
  hors écran** (translateY + transition) et le chat récupère la hauteur tant que le clavier est
  ouvert.
- **2026-07-03 (midi, queue Pro + tableaux modernes + refocus)** — **File d'attente de messages
  (Pro+)** : bouton ListPlus à côté de Send, pills retirables au-dessus du champ, drain auto dès que
  l'agent est libre (stop propre si crédits épuisés) + série « Batch thinker ». **Fixes** : icônes
  de nav/threads en `flex-shrink: 0` (l'ellipsis protège déjà le texte) ; **thumb bar réparée** (le
  `display:none` de base, ajouté après le media query, l'écrasait — guard `min-width: 761px`).
  **Tableaux markdown modernisés** : carte arrondie, headers uppercase muted, hairlines, zebra
  léger, hover de ligne, chiffres tabulaires. **Export CSV/JSON** sur les réponses à tableaux
  (boutons dans la rangée d'actions), nom de fichier dérivé du titre du résultat
  (`toxtricity-849-data.csv`), parseur GFM + téléchargement Blob, série « Data exporter ».
  **Refocus composer** : tout clic sur un bouton de la zone rend le focus au textarea (rAF après
  les handlers ; retour après le dialogue fichier et la mise en queue).
- **2026-07-03 (matin, combo de crédits 💰)** — **Notification de gains de crédits** (top-center,
  z-tooltip) : chaque gain (quête, achievement, booster base + bonus de rareté, anniversaire)
  alimente `creditGain()` ; si la notif est ouverte, **le total se cumule** et le nombre re-pop —
  **contour sur la police** (`-webkit-text-stroke` + glow) qui **change de couleur à chaque
  itération** (palette frenzy 6 couleurs), badge **COMBO ×N** dès 2 ; à combo ≥ 2, **25 % de chance
  de ×2 JACKPOT** (tout le combo doublé, crédité pour de vrai) ; fin de vie pilotée par un **anneau
  SVG plein → vide** (rechargé à chaque gain, `onAnimationEnd` → disparition).
- **2026-07-03 (matin, fiabilité + sucre booster + scroll)** — **Timeout génération** : 120 s sans
  nouveau step → réponse « timed out » propre (Promise.race, main + retry, résultat tardif ignoré) ;
  **bouton Cancel** dans la carte de process (annule le run principal ou restaure le bourgeon lors
  d'un retry). **Durées en cascade** (`lib/duration`) : ms→s→m→h→j partout (timer live, durée
  d'arrivée, log de process, page Stats). **Booster ++** : sparks ✦ à chaque tap, jitter/scale du
  board (animation controls), **COMBO ×N**, flash radial couleur rareté à chaque palier, vibrations
  (12/22ms, pattern final), double anneau d'explosion au reveal. **Fix scroll au refresh** :
  useLayoutEffect à l'entrée d'un thread → snap instantané en bas + re-snap 250/900 ms (images
  tardives), même après Ctrl+Shift+R.
- **2026-07-03 (matin, booster-puzzle 🧩)** — **Ouverture de booster refaite en mini-jeu addictif** :
  overlay plein écran, board blanc 2×2 façon mockup (pièces pastel à knobs), 4 taps posent les
  pièces (spring + rotation), puis **FRENZY 2s** — barre qui se vide, chaque tap monte la rareté
  (Common→Uncommon→Rare→Epic→Legendary→MYTHIC, bord et glow du board teintés, label qui claque à
  chaque palier) — burst final avec particules couleur rareté + count-up (base backend + bonus de
  rareté 0/15/40/80/155/280 crédités en optimiste). **Booster quotidien** dans les dailies des
  quêtes (+1 booster/jour, persisté par date) + séries « Puzzle addict » (taps) et « Daily
  unboxer ».
- **2026-07-03 (matin, thumb bar + carte de process sucrée)** — **≤760px : la sidebar disparaît au
  profit d'une THUMB BAR** fixe en bas (blur, safe-area) : Chat/Quests/Library/Activity + New +
  avatar (ouvre le menu compte au-dessus), items actifs en pastille dégradée, press scale ; le
  chat-stage se réserve la hauteur de la barre. **Carte de process redessinée** : bordure en
  dégradé de marque (double background padding-box/border-box), glow doux, **shimmer** qui balaye
  la carte, steps qui glissent à l'apparition — fini le pulse de bordure fade.
- **2026-07-03 (matin, rail aligné + stats en tableaux)** — Rail réduit : **toutes les tuiles
  (toggle, nav, New session) unifiées en carrés 2.25rem centrés** comme l'avatar (margin-inline
  auto, padding 0) — plus de pilules qui débordent ni d'icônes décalées. Résultats des personas :
  **stats en tableaux markdown** — Pokémon (HP/Attack/Defense/Sp. Atk/Sp. Def/Speed + table
  Height/Weight), Yu-Gi-Oh! (Level/ATK/DEF) — au lieu des lignes « HP 58 · Attack 109 · … ».
- **2026-07-03 (matin, inspector rétractable + personas réparées)** — **Inspector rétractable** :
  bouton PanelRight dans le topbar (tooltip Show/Hide side panel), largeur en CSS var
  `--inspector-width` (0/19rem), état persisté — les widgets ne s'imposent plus. **Personas Fandom
  réparées** : `prop=extracts` n'existe pas sur la plupart des wikis Fandom (seul Minecraft l'a) et
  l'API v1 est derrière Cloudflare → fallback `action=parse&section=0` + nettoyage HTML client
  (aside/table/figure strippés, 6 phrases max) — One Piece, Beer, Wookieepedia fonctionnent
  désormais, Minecraft garde TextExtracts.
- **2026-07-03 (matin, personas premium + transparence)** — **Personas verrouillées** : picker =
  cadenas pour Free/invités (toast → View plans) ; en plan payant, Librarian inclus et les autres
  s'achètent aux crédits (200–250⚡, persistés). **Duelist réparé** (endpoint YGO migré vers
  `cardinfo.php?sort=random`). **Parseur Fandom générique** (MediaWiki origin=*) → 4 nouveaux
  personas : The Pirate (personnages One Piece via catégorie Pirates), The Brewmaster (Beer Wiki),
  The Holocron Keeper (Wookieepedia), The Miner (Minecraft Wiki) + séries de quêtes dédiées.
  **Timing des réponses** : cible aléatoire 2–15 s (fetch en parallèle ; s'il est plus lent on
  l'attend), **timer temps réel** sur la bulle pendant le process, **timestamp d'arrivée + durée**
  (tooltip date complète). **Transparence des process** : steps outillés accumulés sur le message —
  liste vivante pendant la génération (dot pulsante), puis **log repliable** « Persona · N steps ·
  Xs » façon Claude. **Bulle utilisateur refaite** : carte propre (fond sur la carte, coins
  asymétriques), actions + « -5 credits · 12:35 » **sous la carte à droite** au hover. **Ghost
  masqué** quand il n'est plus activable.
- **2026-07-03 (matin, méga-quêtes + personas + stats)** — **Moteur de quêtes façon LoL** :
  ~35 séries × paliers (1,5,10,15,20,25,30,40,50,75,100,150,250,500,750,1000,1500,2000) ≈ **540+
  achievements** générés (`quest.engine.ts`), compteurs persistés (`quest.store`), claim → crédits +
  célébration, page Quests v2 (héro score global, dailies backend, recherche, filtres par
  catégorie, tuiles capstone avec barre + tier x/18) ; quêtes de **sensibilisation** (« Fact
  checker » compte les clics sur les liens sources dans le Markdown). **Personas par parseur** :
  The Librarian (Wikipédia), Professor Poké (PokéAPI→Poképédia, carte random en markdown), The
  Duelist (YGOPRODeck→Yugipedia) — menu dans le composer, persona affichée dans la bulle, compteurs
  dédiés. **Flèche scroll-to-bottom** au-dessus du composer (smooth, apparaît hors du bas).
  **Page Statistics** (menu compte) : temps par page, clics par domaine (capture globale document,
  classés sidebar/topbar/composer/chat/menus/modals/pages), parcours de plans (changements + durée
  par plan, temps réel), boots, first seen, tous les compteurs d'usage — et 3 séries de quêtes
  branchées sur la télémétrie (Button masher, Time traveler, Plan hopper).
- **2026-07-02 (nuit, chats temporaires + billing dans profile)** — **Zone vide du chat corrigée**
  (le feed réservait 8,4rem d'espace mort → height 100%). **Plans retiré de la sidebar** → section
  **Billing** dans Profile (plan en pill, cycle, renouvellement, crédits + bouton Manage/Upgrade
  vers la vue plans plein écran). **Upgrade dynamique** : en Max+ le bouton topbar devient « Earn »
  (Gift → page earn). **Chats temporaires 👻** : toggle Ghost dans le topbar, suppression au départ
  (changement de thread ou de page, + purge au boot), icône fantôme dans la liste ; liker/bookmarker
  dedans ouvre une **modale « Keep this conversation? »** (ConfirmModal générique) qui rend le chat
  permanent avant d'exécuter l'action ; impossible de rendre temporaire un chat qui a déjà des
  éléments sauvegardés.
- **2026-07-02 (nuit, heatmap sensée + page harmonisée)** — **Weekly/Cumulative = un carré par
  semaine** (rangée unique, intensité relative ; fini la colonne de 5 cellules pour 1 jour
  d'activité) ; axe des mois corrigé (« JunJul » collé → les marques trop proches se remplacent) ;
  **page Activity & usage unifiée** : un seul heading avec Earn more + Upgrade, une seule rangée
  d'insights, un seul detail-card (plan/cycle/renews/prompt cost/credits left/boosters) — doublons
  supprimés, `UsagePanel` retiré du code.
- **2026-07-02 (nuit, menu branch + versions de prompts)** — **Menu Branch** sur les réponses
  (façon ChatGPT) : « In this conversation » (duplique le bourgeon courant en bourgeon frais, la
  continuation de l'ancien est préservée) / « In a new conversation » (duplication complète).
  **Édition de prompt = nouvelle version** : plus de troncature destructive — l'ancien prompt et
  toute sa branche restent navigables via un pager ‹ i/n › sur les messages utilisateur (mêmes
  mécaniques `tails` que les bourgeons) ; l'édition est du coup permise sur **tous** les prompts,
  pas seulement le dernier.
- **2026-07-02 (nuit, scrollbars + heatmap lisible)** — **Scrollbars thémées globalement**
  (globals.css : scrollbar-color/`::-webkit-scrollbar` sur tout, fini les barres natives sur le
  scroller principal ; règles scoped supprimées). Heatmap : tooltips hebdo = **« X pts/day · Jun
  29 – Jul 5 »** (range de dates + moyenne/jour comparable au daily, semaines partielles ramenées
  aux jours écoulés) ; cumulatif = « X pts total · by Jul 5 ».
- **2026-07-02 (nuit, arbre en place + crayon composer)** — **Les branches vivent dans la même
  conversation** : chaque bourgeon garde sa propre continuation (`Message.tails`), changer de
  bourgeon avec ‹ › échange toute la suite du fil ; retry gare la queue de l'ancien bourgeon.
  **Branch in new chat** conservé mais = **duplication complète** de la conversation (bourgeons,
  queues, réactions ; ids neufs, bookmarks exclus). **Crayon dans le composer** : quand le texte
  correspond à un prompt existant (↑ ou retape), un bouton ✏️ apparaît à côté de la palette —
  tooltip « Edit from last N message(s) », mode édition (hint teinté, Esc annule), Enter réécrit le
  prompt en place et régénère la branche.
- **2026-07-02 (nuit, scroll + Library + polish)** — **Scrollbar au bord** : le stage pleine largeur
  devient le scroller (plus de barre collée à la colonne 48rem) ; panneaux élargis (max 90rem,
  formulaires profil 56rem) ; cartes plans plafonnées 22rem et centrées. **Library** : bookmark 🔖
  par bourgeon → sections « Read later » (retirable) et « Liked » (tous les 👍), clic = réouvre le
  thread avec le bon bourgeon sélectionné ; entrée nav + rail. **Escape = ← Back** sur la vue plans
  (avec garde-fous overlays). Sidebar : **toggle en premier tout à gauche** (position stable
  collapsed/expanded), rail hard-centré.
- **2026-07-02 (nuit, sidebar v3 + quêtes)** — **Fix avatar rail** (la règle cachait le div avatar ;
  recents en `visibility:hidden` pour garder le bouton compte épinglé en bas) ; **menu compte au
  hover** (grâce 220ms, hover:hover uniquement) en popover **fixed** (fonctionne depuis le rail,
  plus de page profil au clic) ; **Settings retiré de la nav** (vit dans le menu compte) ; rail
  réduit épuré (Plans/Earn/Gallery = expanded seulement via data-rail-hidden) ; **nouvelle page
  Quests** façon challenges LoL : héro avec barre globale, tuiles à médaillon + barre de
  progression (prompts du jour comptés localement), récompenses ⚡, claim → célébration.
- **2026-07-02 (nuit, monétisation des thèmes + regroupements)** — **Thèmes verrouillés** : hors
  Default AI, cadenas + coût (250⚡) sur les chips ; variantes **polarized** = déblocage unique
  (150⚡) dans le menu d'apparence ; dépense optimiste sur les crédits du compte, invités invités à
  créer un compte. **Plans en plein écran** : chrome masqué (data-focus), bouton « ← Back », cartes
  compactes 4 colonnes sans scroll. **Pièces jointes = feature Pro** : cadenas sur le bouton
  (toast → View plans), retirée des features Free (remplacée par les wikis), ajoutée à Pro.
  **Activity + Usage fusionnées** (Activity d'abord, nav à 7 items). Heatmap : re-render animé au
  changement Daily/Weekly/Cumulative + padding de carte corrigé.
- **2026-07-02 (nuit, corrections)** — **Réactions par bourgeon** (`reactions[variantIndex]`) ;
  Profile dédupliqué (retiré de la nav ; en rail réduit l'avatar ouvre le profil directement) ;
  **anti-coupures** : FloatingTooltip et InfoBubble mesurés (clamp + flip), menu ⋯ des threads en
  `position: fixed` (échappe au clipping du panneau scrollable, flip vertical près du bas).
- **2026-07-02 (nuit, bourgeons & branches)** — Modèle de conversation arborescent : **retry = 
  bourgeon** (variantes navigables ‹ i/n ›, stockées sur le message), **bourgeon → branche** (fork
  du fil en nouveau thread depuis le résultat sélectionné), **édition inline du dernier prompt**
  (tronque + régénère), **actions au hover** (copy markdown, 👍/👎 persistés, retry, branch),
  **↑/↓ = historique des prompts** dans le composer. `generateContent`/`runGeneration` extraits.
- **2026-07-02 (soir, contenu utile + responsive)** — **Markdown** rendu dans toutes les bulles
  (react-markdown + GFM, composant `Markdown` tokenisé) ; **réponses IA = article Wikipédia
  aléatoire en markdown** (lib `wiki.ts`, fallback offline) ; longs prompts utilisateur repliés avec
  « Show full message » ; **Plans refaits façon ChatGPT** (prix héro, taglines, CTA, features,
  badge Recommended, contenu dans `plans.content.ts`) ; **responsive réparé** : la largeur sidebar
  passe en CSS var → les media queries reprennent la main ; ≤760px = rail d'icônes forcé (plus de
  sidebar disparue ni de colonne fantôme).
- **2026-07-02 (soir, activity v2)** — Page Activity refaite façon Claude Code : **heatmap 12 mois**
  (Daily/Weekly/Cumulative, tooltips, mois en légende, niveaux relatifs) + insights streaks
  (`activity.stats.ts` partagé) ; profil : 5 stat-tiles (dont streaks) + plan en pill.
- **2026-07-02 (soir, sidebar v2)** — Mode réduit = **rail d'icônes** (nav 8 items + New session +
  avatar, tooltips) au lieu d'un rail vide ; toggle intégré au header à côté du brand ; raccourci
  **Ctrl+B** ; compteurs de threads supprimés ; avatar réduit ré-étend la sidebar et ouvre le menu ;
  nav refactorée en `navItems` mappés.
- **2026-07-02 (soir, composer v2)** — Le wrapper devient le champ (focus-within, textarea
  chromeless 2 lignes min) ; footer unique outils/hint/envoi ; chips hors du champ ; le bouton
  palette devient un **menu d'apparence** (4 variantes + lien Settings).

- **2026-07-02 (après-midi)** — Audit initial : 132 features, 15×S1.
- **2026-07-02 (soir)** — Front 1 purgé (undo toasts, useDismiss, smart-scroll, missing credits,
  ::selection) + système de sensation (Toaster, RewardReveal, CountUp) + sucre visuel slice 1.
- **2026-07-02 (soir, passe anti-patterns)** — **Enter envoie** (Shift+Enter = retour ligne, IME-safe) ;
  intro affichée seulement sur conversation vide (centrée) ; quick-prompts wrap sans scrollbar et
  seulement sur conversation vide ; select de variante retiré du composer (jargon token) ; libellés
  humains des variantes dans Settings ; message système d'accueil supprimé (+ migration v3) ; pill
  API visible seulement hors-ligne ; ⋯ des threads révélé au hover/focus ; liste de thèmes sans
  scroll interne ; toggle archivés avec état pressé ; hint composer raccourci.

*Mise à jour : cocher la frise d'une feature à chaque marche franchie. Une feature passe S5
uniquement si les deux checklists (S4 + S5) sont vertes.*
