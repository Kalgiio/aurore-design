// =============================================================================
// AURORE DESIGN — « COMMANDEMENT DE L'AURORE » (V1.6, 22/11, demande du commandement : « il manque des assets à lui, prends ce
// qu'on a fait pour Aurore et crée Commandement de l'Aurore dans le design system »). Famille DS-CMD-NN.
// Esthétique : console d'état-major, documents officiels, signalétique réglementaire — dessins ORIGINAUX.
// Accent : var(--cmd-a) (ambre par défaut, ou la couleur d'accent du membre) ; repli ambre hors du thème.
// Rien d'animé en boucle sauf le voyant (DS-CMD-05), coupé si « réduire les animations ».
// =============================================================================
import React, { useEffect, useState } from 'react';
import './commandement.css';

/** Lit html[data-ui] (thème complet du portail) et suit ses changements. */
export function useUiTheme() {
  const get = () => (typeof document !== 'undefined' ? document.documentElement.dataset.ui || 'standard' : 'standard');
  const [ui, setUi] = useState(get);
  useEffect(() => {
    const mo = new MutationObserver(() => setUi(get()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ui'] });
    return () => mo.disconnect();
  }, []);
  return ui;
}

/** DS-CMD-01 · Insigne : écu à chevrons, étoile d'aurore au centre, anneau hachuré. */
export function CmdInsignia({ size = 40, className = '', title }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg className={`dsc-insignia ${className}`} width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <pattern id={`h${id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" fill="currentColor" /></pattern>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--cmd-a3, #fde68a)" /><stop offset="1" stopColor="var(--cmd-a2, #f59e0b)" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="none" stroke={`url(#h${id})`} strokeWidth="4" opacity=".55" />
      <path d="M32 7 52 15v16c0 13-8.4 22.4-20 26C20.4 53.4 12 44 12 31V15Z" fill="#0a0d17" stroke="var(--cmd-a, #facc15)" strokeWidth="2.2" />
      <path d="M20 38 32 31l12 7M20 45l12-7 12 7" fill="none" stroke="var(--cmd-a, #facc15)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 13.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L32 27.8l-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5Z" fill={`url(#g${id})`} />
    </svg>
  );
}

/** DS-CMD-02 · Tampon de classification (« Diffusion restreinte », « Confidentiel CES », « Opérationnel »…). */
export function CmdStamp({ children = 'Diffusion restreinte', tone = 'accent', tilt = -4, className = '' }) {
  return <span className={`dsc-stamp dsc-stamp--${tone} ${className}`} style={{ '--tilt': `${tilt}deg` }}>{children}</span>;
}

/** DS-CMD-03 · Bande réglementaire (hachures) avec libellé facultatif — séparateur de section. */
export function CmdHazard({ label, className = '' }) {
  return <div className={`dsc-hazard ${className}`} role="separator">{label && <span>{label}</span>}</div>;
}

/** DS-CMD-04 · Panneau de console : barre d'en-tête (code de référence, statut), coins d'encadrement, corps. */
export function CmdPanel({ title, code, status, children, className = '' }) {
  return (
    <section className={`dsc-panel ${className}`}>
      <header className="dsc-panel__bar"><span className="dsc-panel__title">{title}</span>{code && <code>{code}</code>}{status && <span className="dsc-panel__status">{status}</span>}</header>
      <div className="dsc-panel__body">{children}</div>
      <i className="dsc-corner tl" /><i className="dsc-corner tr" /><i className="dsc-corner bl" /><i className="dsc-corner br" />
    </section>
  );
}

/** DS-CMD-05 · Afficheur de données : libellé, chiffres de console, unité, voyant d'état. */
export function CmdReadout({ label, value, unit, state = 'ok', hint }) {
  return (
    <div className={`dsc-readout is-${state}`}>
      <span className="dsc-readout__label"><i className="dsc-lamp" />{label}</span>
      <strong className="dsc-readout__value">{value}{unit && <small>{unit}</small>}</strong>
      {hint && <span className="dsc-readout__hint">{hint}</span>}
    </div>
  );
}

/** DS-CMD-06 · Plaque de grade / matricule (gravée, rivets). */
export function CmdPlate({ rank, name, matricule }) {
  return (
    <div className="dsc-plate"><i /><i /><span className="dsc-plate__rank">{rank}</span><strong>{name}</strong>{matricule && <code>{matricule}</code>}<i /><i /></div>
  );
}

/** DS-CMD-07 · Avis officiel (bandeau d'information réglementaire, comme la bannière du site de test). */
export function CmdNotice({ tag = 'Avis officiel', children }) {
  return <div className="dsc-notice"><span className="dsc-notice__tag">{tag}</span><span className="dsc-notice__txt">{children}</span></div>;
}

/** DS-CMD-08 · Bouton de commandement : coins coupés, libellé en capitales (variant de DS-BTN). */
export function CmdButton({ children, variant = 'solid', ...rest }) {
  return <button type="button" className={`dsc-btn dsc-btn--${variant}`} {...rest}>{children}</button>;
}
