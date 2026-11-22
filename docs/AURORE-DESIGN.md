# Aurore Design — design system du CES (V1.5)

**Vitrine (référence vivante) :** https://experimental-systems.ces-sc.fr/design-system
**Version :** 1.4 — 2026-11-14 (V1.3 et V1.2 le même jour, V1.1 le 2026-11-12, V1.0 figée le 2026-11-11) · constante `AURORE` dans `frontend/src/design-system/aurore.js`

Aurore Design est la base de la **nouvelle version du portail**. Les écrans actuels (MUI) seront migrés
écran par écran vers ces composants ; les nouveaux assets s'ajoutent au fil du développement.

## Le système d'identifiants

- Chaque asset porte un identifiant **`DS-<FAMILLE>-<NN>`** (ex. `DS-BTN-01`). C'est le nom à citer pour
  demander une retouche (« modifie DS-BTN-01 ») **et** pour désigner le composant à utiliser dans un écran
  de la nouvelle version (« la liste des missions utilise DS-CES-01 + DS-CRD-01 »).
- 🔴 **Jamais renuméroté.** Un asset retiré laisse son numéro vacant ; un nouvel asset prend le numéro libre
  suivant de sa famille. Chaque identifiant est une ancre : `/design-system#DS-BTN-01`.
- **Version d'apparition** : champ `since` d'un exemple du registre `SPECIMENS`
  (`frontend/src/pages/design-system/index.js`), `'1.0'` par défaut. Affiché dans la colonne « Depuis » de l'index.
- **Familles** : FND (fondations), BTN, INP, SEL, CMB, TAG, AVA, TML, KBD, CRD, ACC, TAB, DIV, MSG, TST, DLG, TIP,
  PRG, SKL, NAV, TBL, OVL, DAT, CHT, KBN, EDT, CES (modèles propres à l'organisation). Une famille nouvelle
  prend trois lettres et s'ajoute ici.

## Ajouter un asset (V1.1, V1.2…)

1. Proposition : composant dans `design-system/next.js`, styles sous `.ds-next` dans `next.css`, déclaré dans
   la table `APRES` de la vitrine (comparaison Avant / Après), ou nouvel exemple avec le prochain ID.
2. Validation par le commandement → adoption : composant dans `components.js` / `advanced.js`, styles dans `ds.css` /
   `advanced.css`, sans la portée `.ds-next`.
3. Poser `since: '1.x'` sur l'exemple, déclarer ses contrôles dans `ops/ds-regress.mjs` (et mettre à jour
   `EXPECTED_COMPARES`), lancer `ops/check-design-system.sh`.
4. Une nouvelle version = monter `AURORE.version`, compléter le journal ci-dessous et ce catalogue.

## Utiliser Aurore Design dans un écran

```js
import { DsRoot, Button, Card, Tabs } from '../design-system/components';     // composants de base
import { ModuleHero, ModuleBar, Chat, EventCalendar } from '../design-system/advanced'; // avancés + modèles CES
import CesEditor from '../design-system/editor/CesEditor';                     // éditeur (TipTap)
```

- Tout se rend sous un conteneur **`.ds`** (`<DsRoot>`) : aucune règle ne déborde sur le portail MUI.
- Couleurs : **uniquement** les jetons sémantiques (`--ds-primary`, `--ds-surface-*`, `--ds-text*`), redéfinis
  par mode clair / sombre dans `tokens.css`. Jamais de valeur brute dans un composant.
- Polices : **DM Sans** (texte, chiffres des statistiques), **Ubuntu Mono** (identifiants, données),
  **Orbitron** pour les titres d’affichage et le logotype — jamais dans les cercles de statistiques (anneaux, centre des graphiques en anneau : DM Sans). Icônes : **Remix Icon** via `<Icon name>`.
- Performance : animer `transform` / `opacity` seulement, pas de `backdrop-filter` sur un élément collant ou fixe.

## Écrans migrés (refonte du site)

| Écran | Fichier | Assets utilisés | Depuis |
|---|---|---|---|
| Pied de page (toutes les pages) | `components/SharedFooter.js` | `DS-CES-12` (`PortalFooter`, vrais liens via `columns` + `LinkComponent`), `DS-DLG-01` | 2026-11-11 |
| Page de connexion | `pages/AuthPage.js` + `AuthPage.css` | `DS-BTN-01` (Aurore), anneaux des modules, `AuroraHorizon` ; sans vidéo | 2026-11-11 |
| Accès non autorisé | `pages/NoAccessPage.js` + `NoAccessPage.css` | gabarit `.auth`, `AuroraHorizon`, `DS-AVA-01`, `DS-BTN-01` | 2026-11-11 |
| Hub | `pages/hub/` | `DS-CES-11` (barre), cartes, `ChartTile`, `DS-INP-03`, visite guidée | 2026-11-12 |
| Garage | `pages/garage/` | `DS-CES-01` (en-tête), `DS-CRD-01`, `DonutChart`, `MeterGroup`, `DS-DLG-01` | 2026-11-12 |
| Horizon d'aurore (partagé) | `components/AuroraHorizon.js` | rideau d'aurore animé, ligne d'horizon, reflet vers le pied | 2026-11-11 |
| Page vaisseau (équipement) | `pages/garage/ship/` (`/garage/vaisseau/:uuid`) | cartes denses en colonnes, `DS-SEL-01` natif, `DS-TAG-01` | 2026-11-12 |
| Missions — liste | `pages/mission/index.js` + `components/MissionTiles.js` | `DS-CES-01`, `DS-CRD-01`, `DS-INP-03`, `DS-TAG-01` | 2026-11-12 |
| Missions — détail | `pages/mission/detail.js` + `components/*` | bannière à voile, `DropdownMenu`, `DS-MSG-01`, `DS-AVA-01`, `EmptyState` | 2026-11-13 |
| Missions — création / édition | `pages/mission/create.js` | `ChoiceCards`, `ToggleSwitch` + `SettingRow`, `MarkdownToolbar` | 2026-11-13 |
| Barre Markdown (partagée) | `components/MarkdownToolbar.js` | outils, nuancier de contenu, `Popover`, `DS-DLG-01` (aide) | 2026-11-13 |
| Annuaire | `pages/annuaire/index.js` + `annuaire.css` | `DS-CES-01` (onglets `?vue=`), `Popover` (filtres), cartes membre | 2026-11-13 |
| Profil membre (complet) | `pages/annuaire/profile.js` + `components/*` | en-tête, onglets, panneaux, `DS-DLG-01` (édition, vaisseau, cadrage), visionneuse sur `<dialog>`, `Slider`, `ToggleSwitch`, `SettingRow` ; plus aucun MUI | 2026-11-13 |
| Académie — liste, leçon, examen | `pages/academy/` | `DS-CES-01`, `DS-CRD-01`, `CertLevel`, `ProgressBar` | 2026-11-13 |
| Académie — éditeurs | `lesson-create.js`, `create.js`, `components/QuestionEditor.js` | `ChoiceCards`, `Combobox`, `MarkdownToolbar` | 2026-11-13 |
| Planning — liste, tableau, Kanban, liste, calendrier | `pages/planning/` | `DS-CES-01`, `SegmentedControl`, `Popover`, `DropdownMenu`, `DS-DLG-01`, `.ds-fc` (DS-DAT-04), fiche de tâche (`DS-DLG-01`, onglets, `ProgressBar`) | 2026-11-13 |
| Messagerie (nouveau) | `pages/community/chat.js` | `DS-CES-13` (Chat, adopté), `Combobox`, `DropdownMenu`, `SignalLoader` (réservé à la messagerie) | 2026-11-13 |
| Forum (nouveau) | `pages/community/forum.js` | `DS-CES-01`, cartes de catégorie, `MarkdownToolbar`, `Paginator`, `DS-DLG-01` | 2026-11-13 |
| Gestion (complet) | `pages/management/` (`components/AdmUI.js`) | `DS-CES-01` « zone restreinte », `DS-DLG-01`, tableaux natifs `.adm-table`, `Tag`, `Chip`, `ToggleSwitch` ; plus aucun MUI | 2026-11-13 |
| Bot (complet) | `pages/bot/` (`components/BotUI.js`) | `DS-CES-01`, `DS-DLG-01` (images, émotes), `SegmentedControl`, `Field`, aperçu Discord en CSS fixe ; plus aucun MUI | 2026-11-13 |
| Gestion — Vue d'ensemble (nouveau) | `pages/management/tabs/OverviewTab.js` | `DS-CES-10` (niveaux DEFCON), `ChartTile`, `StatsKit`, `ChoiceCards` | 2026-11-13 |
| Bandeau DEFCON du portail | `components/DefconWatch.js` | `DS-CES-10` (`DefconBar`) ; jamais sur la connexion ni sans rôle | 2026-11-13 |
| Planning — workflow, chronologie | `WorkflowEditor.js`, `TimelineView.js` | cartes d'étape, `Combobox`, Gantt maison | 2026-11-13 |
| Tableau partagé public | `pages/public/PublicBoardPage.js` | `DS-CES-01` + quatre vues en lecture seule | 2026-11-13 |
| Onglets Statistiques (tous modules sauf Garage) | `components/StatsKit.js` + `*Stats.js` | `ChartTile`, `BarChart`, `DonutChart`, barres de classement | 2026-11-13 |
| Toasts et chargement (transverse) | `utils/toast.js`, `components/ToastHost.js`, `components/PageLoader.js` | `DS-TST-01`, `DS-PRG-01` (`OrbitLoader`) | 2026-11-13 |
| Cadre global (cloche, Ctrl+K, session, calendrier, chargement) | `components/NotificationBell.js`, `CommandPalette.js`, `SessionTimeout.js`, `CalendarSubscribeModal.js`, `LoadingScreen.js` | `Drawer`, `<dialog>` natif, `SegmentedControl`, `Message`, `ProgressBar` (DS-CES-14) | 2026-11-13 |
| Pages légales | `pages/legal/LegalLayout.js` + `legal.css` | sommaire collant, encadrés, tableaux natifs ; plus de MUI | 2026-11-13 |
| Site vitrine `ces-sc.fr` (projet séparé) | `vitrine/` (Astro) — jetons et classes **portés** dans `vitrine/src/styles/global.css` | `DS-FND-08`, `DS-BTN-01`, `DS-CRD-01`, `DS-TAG-01`, `DS-ACC-01`, `DS-INP-01`, `DS-SEL-04`, `DS-DLG-01`, `DS-CES-09`, pied d'après `DS-CES-12` | 2026-11-16 |

## Journal

### V1.5 — 2026-11-21

- `DS-DLG-02` **Confirmation du site** (`utils/confirm.js` + `ConfirmHost`) : remplace tous les `window.confirm` du portail.
- `DS-NAV-08` **Navigation en pilule** (en-tête du site vitrine).
- `DS-CES-20` **Héros au ciel horaire** (vitrine : capture Squadron 42 choisie selon l'heure locale, avant la peinture).
- `DS-CES-21` **Bandeau défilant** (boucle sans saut, arrêt au survol et en « réduire les animations »).
- `DS-CES-22` **Logo RSI** (`RsiLogo`, lien de pied `{ rsi: true }`), à la place du mot « RSI ».
- ✅ **V1.6 (22/11) — « Commandement de l'Aurore »** : famille `DS-CMD-01…09` (`design-system/commandement.js` / `.css`) —
  insigne, tampon de classification, bande réglementaire, panneau de console, afficheur, plaque de grade, avis officiel,
  bouton de commandement, palette et couleurs d'accent (`--cmd-a`). C'est l'apparence complète « Commandement de
  l'Aurore » du portail (`theme/ui-commandement.css`).
- ✅ `DS-CES-23` **En-tête du portail** ADOPTÉ (22/11) : `PortalHeader` + `.dsx-hdr*` dans `advanced.js` / `advanced.css` —
  navigation « En-tête » du portail au choix du membre, version barre sur le site vitrine.
- Site vitrine entièrement refait en plusieurs pages (« Aurore cinématique », `vitrine/src/styles/x.css`).

### V1.4 — 2026-11-14

- `DS-CES-19` **Panneau des membres** (`ChatMembers`, advanced.js) : colonne de droite de la messagerie, groupes
  En ligne / Hors ligne, présence, clic = profil.
- `DS-CES-13` **Messagerie** révisée dans le portail : plein écran (sans pied de page), actions de survol en petite barre
  au bout du message, menu du clic droit opaque (`.ds-menu` n'a pas de fond propre), « Archives » repliées pour les
  salons d'opérations terminées.

### V1.3 — 2026-11-14

- `DS-FND-08` **Fond du portail « Ciel d'aurore » adopté** (d'après une maquette Gemini apportée au CES) :
  `components/AuroraSky.js` + `index.css`. Deux draperies inclinées qui ondulent, rayons verticaux diffus, intensité
  0,34 (0,30 en clair). Imposé, sans interrupteur. Remplace l'ancienne aurore (`html::before`, calque 150 % en rotation).
- `DS-CES-15` **Horizon** : le rideau d'aurore du bas est retiré (connexion, accès non autorisé) ; ligne et reflet restent.
- `#root` au-dessus des fonds animés (`position: relative; z-index: 1`).

### V1.2 — 2026-11-14

- `DS-CES-10` **Bandeau DEFCON refondu « salle de commandement »** : console sombre fixe dans les deux thèmes, bandes de
  danger animées (3 à 1), niveau, jauge 5→1, nom de code, consigne, horloge, bouton « Bulletin ».
- `DS-CES-17` **Fenêtre d'alerte DEFCON** (`DefconAlertDialog`) : au centre de l'écran pour les niveaux 3 à 1, bande de
  danger animée, accusé de réception obligatoire (armé après 2 s / 3 s), survol à la couleur du niveau.
- `DS-CES-18` **Bulletin d'alerte** (`DefconHubCard`) : consigne en cours et historique. Variante `plain` (jetons du
  thème, sans cadre ni en-tête) pour l'héberger dans une carte du portail, pastille `DefconChip`.
- `DS-FND-08` **Fond d'aurore du portail** (imposé, plus d'interrupteur) — proposition « Ciel d'aurore » en cours
  (Avant / Après, d'après une maquette Gemini adaptée pour la carte graphique), essayable sur tout le portail.
- `DS-EDT-02` **Lecteur de contenu riche** (`editor/CesRichView.js`) : documents de DS-EDT-01 sans édition (annonces).
  DS-EDT-01 gagne `onChange` et `uploadImage` (images envoyées à l'API au lieu du base64).

### V1.1 — 2026-11-12

- `DS-CES-15` **Horizon d'aurore** (`components/AuroraHorizon.js`) et `DS-CES-16` **Anneaux des modules** (`ModuleOrbits`).
  🔴 Réservés à la **page de connexion** et à **« Accès non autorisé »** — on ne les utilise pas dans le portail.
  Masqués sur mobile. Bouton Aurore (`DS-BTN-01`) : boucle sans saut (dégradé périodique).
- Portail : fond d'aurore éteint par défaut sur mobile.

### V1.0 — 2026-11-11

Première version figée : 82 assets (fondations, composants inspirés de PrimeVue Aura et shadcn/ui, modèles CES).
Derniers ajouts : écran de chargement du portail (`DS-CES-14`), chargeurs « saut quantique » et « transmission »
réservés à la messagerie (`DS-PRG-01`), édition d'événement ancrée (`DS-DAT-04`), bouton Aurore animé
(`DS-BTN-01`), anneaux de statistiques en DM Sans.

## Catalogue

### Fondations

| ID | Asset | Famille | Depuis |
|---|---|---|---|
| `DS-FND-01` | Palette de marque | — | V1.0 |
| `DS-FND-02` | Couleurs sémantiques | — | V1.0 |
| `DS-FND-03` | Typographie | — | V1.0 |
| `DS-FND-04` | Espacements | — | V1.0 |
| `DS-FND-05` | Arrondis | — | V1.0 |
| `DS-FND-06` | Ombres et lueurs | — | V1.0 |
| `DS-FND-07` | Icônes | — | V1.0 |

### Composants

| ID | Asset | Famille | Depuis |
|---|---|---|---|
| `DS-BTN-01` | Bouton — variantes | Boutons | V1.0 |
| `DS-BTN-02` | Bouton — sévérités | Boutons | V1.0 |
| `DS-BTN-03` | Bouton — tailles et formes | Boutons | V1.0 |
| `DS-BTN-04` | Bouton — états | Boutons | V1.0 |
| `DS-BTN-05` | Groupe de boutons | Boutons | V1.0 |
| `DS-INP-01` | Champ texte | Saisie | V1.0 |
| `DS-INP-02` | Libellé flottant | Saisie | V1.0 |
| `DS-INP-03` | Icône et groupe | Saisie | V1.0 |
| `DS-INP-04` | Liste déroulante | Saisie | V1.0 |
| `DS-INP-05` | Zone de texte | Saisie | V1.0 |
| `DS-SEL-01` | Cases et boutons radio | Saisie | V1.0 |
| `DS-SEL-02` | Interrupteur | Saisie | V1.0 |
| `DS-SEL-03` | Curseur | Saisie | V1.0 |
| `DS-SEL-04` | Sélection segmentée | Saisie | V1.0 |
| `DS-CMB-01` | Combobox | Saisie | V1.0 |
| `DS-CMB-02` | Combobox — sélection multiple | Saisie | V1.0 |
| `DS-INP-06` | Code de vérification | Saisie | V1.0 |
| `DS-INP-07` | Champ numérique | Saisie | V1.0 |
| `DS-INP-08` | Mot de passe | Saisie | V1.0 |
| `DS-INP-09` | Dépôt de fichiers | Saisie | V1.0 |
| `DS-SEL-05` | Note | Saisie | V1.0 |
| `DS-TAG-01` | Étiquettes | Affichage | V1.0 |
| `DS-TAG-02` | Badges | Affichage | V1.0 |
| `DS-TAG-03` | Puces | Affichage | V1.0 |
| `DS-AVA-01` | Avatars | Affichage | V1.0 |
| `DS-TML-01` | Frise chronologique | Affichage | V1.0 |
| `DS-KBD-01` | Touches clavier | Affichage | V1.0 |
| `DS-AVA-02` | Statuts de présence | Affichage | V1.0 |
| `DS-CRD-01` | Carte | Surfaces | V1.0 |
| `DS-CRD-02` | Panneau | Surfaces | V1.0 |
| `DS-ACC-01` | Accordéon | Surfaces | V1.0 |
| `DS-TAB-01` | Onglets | Surfaces | V1.0 |
| `DS-DIV-01` | Séparateur | Surfaces | V1.0 |
| `DS-MSG-01` | Messages | Retours | V1.0 |
| `DS-TST-01` | Notifications (toast) | Retours | V1.0 |
| `DS-DLG-01` | Boîte de dialogue | Retours | V1.0 |
| `DS-TIP-01` | Infobulle | Retours | V1.0 |
| `DS-PRG-01` | Progression | Retours | V1.0 |
| `DS-SKL-01` | Squelette de chargement | Retours | V1.0 |
| `DS-NAV-01` | Fil d'Ariane | Navigation & données | V1.0 |
| `DS-NAV-02` | Pagination | Navigation & données | V1.0 |
| `DS-NAV-03` | Étapes | Navigation & données | V1.0 |
| `DS-TBL-01` | Tableau de données | Navigation & données | V1.0 |
| `DS-NAV-04` | Fil d'Ariane repliable | Navigation & données | V1.0 |
| `DS-NAV-05` | Menu déroulant | Navigation & données | V1.0 |
| `DS-NAV-06` | Palette de commandes | Navigation & données | V1.0 |
| `DS-NAV-07` | Arborescence | Navigation & données | V1.0 |
| `DS-OVL-01` | Popover | Superpositions | V1.0 |
| `DS-OVL-02` | Panneau latéral | Superpositions | V1.0 |
| `DS-DAT-01` | Calendrier | Calendrier & dates | V1.0 |
| `DS-DAT-02` | Sélecteur de date | Calendrier & dates | V1.0 |
| `DS-DAT-03` | Plage de dates | Calendrier & dates | V1.0 |
| `DS-DAT-04` | Calendrier d'événements | Calendrier & dates | V1.0 |
| `DS-CHT-01` | Courbes et aires | Graphiques | V1.0 |
| `DS-CHT-02` | Barres groupées | Graphiques | V1.0 |
| `DS-CHT-03` | Barres empilées | Graphiques | V1.0 |
| `DS-CHT-04` | Anneau | Graphiques | V1.0 |
| `DS-CHT-05` | Tendance compacte | Graphiques | V1.0 |
| `DS-CHT-06` | Jauge segmentée | Graphiques | V1.0 |
| `DS-KBN-01` | Tableau de tâches | Productivité | V1.0 |
| `DS-EDT-01` | Éditeur de texte | Productivité | V1.0 |
| `DS-EDT-02` | Lecteur de contenu riche | Productivité | V1.2 |

### Modèles CES

| ID | Asset | Famille | Depuis |
|---|---|---|---|
| `DS-CES-01` | En-tête de module | — | V1.0 |
| `DS-CES-02` | Carte de mission | — | V1.0 |
| `DS-CES-03` | Carte de membre | — | V1.0 |
| `DS-CES-04` | Tuiles de statistiques | — | V1.0 |
| `DS-CES-05` | Grades | — | V1.0 |
| `DS-CES-06` | Niveaux de certification | — | V1.0 |
| `DS-CES-07` | État vide | — | V1.0 |
| `DS-CES-08` | Statut de présence | — | V1.0 |
| `DS-CES-09` | Appel à l’action aurore | — | V1.0 |
| `DS-CES-10` | Bandeau d’alerte DEFCON (refondu en V1.2) | — | V1.0 |
| `DS-CES-11` | Barre latérale du portail | — | V1.0 |
| `DS-CES-12` | Pied de page du portail | — | V1.0 |
| `DS-CES-13` | Messagerie instantanée | — | V1.0 |
| `DS-CES-14` | Écran de chargement du portail | — | V1.0 |
| `DS-CES-15` | Horizon (connexion / accès non autorisé ; rideau retiré en V1.3) | — | V1.1 |
| `DS-CES-16` | Anneaux des modules (connexion) | — | V1.1 |
| `DS-CES-17` | Fenêtre d'alerte DEFCON | — | V1.2 |
| `DS-FND-08` | Fond d'aurore du portail (« Ciel d'aurore », adopté en V1.3) | — | V1.2 |
| `DS-CES-18` | Bulletin d'alerte (hub) | — | V1.2 |
| `DS-CES-19` | Panneau des membres (messagerie) | — | V1.4 |
| `DS-CES-20` | Héros au ciel horaire (vitrine) | — | V1.5 |
| `DS-CES-21` | Bandeau défilant | — | V1.5 |
| `DS-CES-22` | Logo RSI | `RsiLogo` | V1.5 |
| `DS-DLG-02` | Confirmation du site | `confirmDialog` / `ConfirmHost` | V1.5 |
| `DS-NAV-08` | Navigation en pilule | — | V1.5 |
