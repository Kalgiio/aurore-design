// =============================================================================
// Licence de CES Aurore Design (21/11/2026, décision du commandement : « un vrai, pas un créé ») —
// Creative Commons Attribution 4.0 International (CC BY 4.0) : utiliser, copier, modifier, redistribuer, y compris
// commercialement et par une IA, à condition de CRÉDITER l'auteur. La forme du crédit demandée (autorisée par la
// licence, § 3(a)(1)) : « Basé sur CES Aurore Design vX.Y ».
// Texte officiel complet : docs/licenses/CC-BY-4.0.txt (copié tel quel dans le dépôt autonome, fichier LICENSE).
// =============================================================================
import { AURORE } from './aurore';

export const LICENSE_NAME = 'Creative Commons Attribution 4.0 International (CC BY 4.0)';
export const LICENSE_SHORT = 'CC BY 4.0';
export const LICENSE_URLS = {
  deed: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
  legal: 'https://creativecommons.org/licenses/by/4.0/legalcode.fr',
};
export const ATTRIBUTION = (v = AURORE.version) => `Basé sur CES Aurore Design v${v} — Corps Expéditionnaire Spatial — CC BY 4.0`;

/** Les libertés et la condition, en clair (résumé non contractuel : seul le texte officiel fait foi). */
export const LICENSE_POINTS = {
  free: ['Utiliser', 'Copier et redistribuer', 'Modifier et adapter', 'Usage commercial', 'Utilisation par une IA (génération, analyse, apprentissage)'],
  must: [
    'Créditer : « Basé sur CES Aurore Design vX.Y » avec la version utilisée, de façon visible (pied de page, crédits, README ou en-tête de fichier).',
    'Indiquer un lien vers la licence CC BY 4.0.',
    'Signaler si des modifications ont été faites.',
  ],
  out: ['Le nom et les logos du CES', 'Les marques Star Citizen®, Squadron 42®, Roberts Space Industries®', 'Les captures d’écran', 'Les polices (SIL OFL) et les icônes Remix Icon, sous leur licence propre'],
};

export const LICENSE_NOTICE = `CES Aurore Design v${AURORE.version} — Corps Expéditionnaire Spatial (https://aurore-design.ces-sc.fr)
Licence : ${LICENSE_NAME}
https://creativecommons.org/licenses/by/4.0/

Crédit demandé : « Basé sur CES Aurore Design vX.Y » (version utilisée), visible
dans l'œuvre (pied de page, crédits, README ou en-tête de fichier), avec un lien
vers la licence et la mention des modifications éventuelles.

Exclus de la licence : nom et logos du CES ; marques Star Citizen®, Squadron 42®,
Roberts Space Industries® ; captures d'écran ; polices (SIL OFL) et icônes
Remix Icon, qui gardent leur licence propre.
`;
// Compatibilité avec les anciens appels.
export const LICENSE_TEXT = LICENSE_NOTICE;
