// Vue d'un bloc schema : apercu Mermaid + code editable + modeles.
// 🔴 Mermaid (gros) est charge A LA DEMANDE, au premier schema affiche : il ne pese
// rien pour qui n'en insere pas. securityLevel 'strict' : le SVG est assaini.
import React, { useEffect, useId, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Icon } from '../components';

let mermaidPromise = null;
let lastTheme = null;
let seq = 0;

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
async function getMermaid(scheme) {
  if (!mermaidPromise) mermaidPromise = import('mermaid').then(m => m.default);
  const mermaid = await mermaidPromise;
  if (lastTheme !== scheme) {
    // Couleurs lues dans les jetons (valeurs hexadecimales uniquement : Mermaid
    // derive ses teintes et ne comprend ni var() ni color-mix()).
    const text = css('--ds-text') || '#e2e2e9';
    const primary = css('--ces-blue-500') || '#2f69d6';
    const dark = scheme === 'dark';
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', theme: 'base',
      fontFamily: '"DM Sans Variable", "DM Sans", sans-serif',
      themeVariables: {
        darkMode: dark, fontSize: '14px', textColor: text, primaryTextColor: text, titleColor: text,
        background: dark ? '#0b0c2a' : '#f2f4ff', mainBkg: dark ? '#0f1035' : '#ffffff',
        primaryColor: dark ? '#0f1035' : '#ffffff', primaryBorderColor: primary, nodeBorder: primary,
        secondaryColor: dark ? '#1c1e4a' : '#e8ecff', tertiaryColor: dark ? '#0b0c2a' : '#f2f4ff',
        lineColor: dark ? '#888ec6' : '#5a5f9a', edgeLabelBackground: dark ? '#0b0c2a' : '#f2f4ff',
        clusterBkg: dark ? '#08091f' : '#e8ecff', clusterBorder: dark ? '#3a4080' : '#c8d0f0',
        actorBkg: dark ? '#0f1035' : '#ffffff', actorBorder: primary, actorTextColor: text, signalColor: text, signalTextColor: text,
        noteBkgColor: dark ? '#2a2259' : '#ede9fe', noteTextColor: text, noteBorderColor: '#7c3aed',
        cScale0: '#7c3aed', cScale1: '#1d4ed8', cScale2: '#0891b2', cScale3: '#15803d', cScale4: '#b45309',
      },
    });
    lastTheme = scheme;
  }
  return mermaid;
}

function useScheme() {
  const read = () => document.documentElement.getAttribute('data-mui-color-scheme') || 'dark';
  const [s, setS] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setS(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mui-color-scheme'] });
    return () => mo.disconnect();
  }, []);
  return s;
}

export const DIAGRAM_TEMPLATES = [
  { key: 'flow', label: 'Plan d’opération', icon: 'rocket', code: 'flowchart LR\n  A([Briefing]) --> B{Effectif complet ?}\n  B -- Oui --> C[Décollage]\n  B -- Non --> D[Réserve appelée]\n  D --> C\n  C --> E[Saut quantique]\n  E --> F((Objectif))' },
  { key: 'org', label: 'Organigramme', icon: 'users', code: 'flowchart TD\n  CMD[Commandement] --> OFF1[Officier — Exploration]\n  CMD --> OFF2[Officier — Logistique]\n  CMD --> OFF3[Officier — Médical]\n  OFF1 --> P1[Capitaine]\n  OFF2 --> P2[Capitaine]' },
  { key: 'seq', label: 'Séquence', icon: 'chat', code: 'sequenceDiagram\n  participant Chef as Chef d’op\n  participant Pil as Pilotes\n  participant Med as Médics\n  Chef->>Pil: Départ dans 5 min\n  Pil-->>Chef: Prêts\n  Chef->>Med: En attente au point Delta\n  Note over Pil,Med: Silence radio' },
  { key: 'mind', label: 'Carte mentale', icon: 'sparkle', code: 'mindmap\n  root((CES))\n    Exploration\n      Cartographie\n      Récupération\n    Logistique\n      Fret\n      Ravitaillement\n    Médical\n    Protection' },
  { key: 'gantt', label: 'Planning', icon: 'calendar', code: 'gantt\n  dateFormat YYYY-MM-DD\n  title Préparation de l’opération\n  section Logistique\n  Recenser les vaisseaux :a1, 2026-11-12, 3d\n  Ravitaillement :after a1, 2d\n  section Équipage\n  Briefing :2026-11-15, 1d' },
];

export default function DiagramView({ node, updateAttributes, selected, deleteNode, editor }) {
  const scheme = useScheme();
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const [code, setCode] = useState(node.attrs.code);
  const [mode, setMode] = useState('preview');
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const editable = editor?.isEditable;

  useEffect(() => { setCode(node.attrs.code); }, [node.attrs.code]);
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const mermaid = await getMermaid(scheme);
        seq += 1;
        const { svg: out } = await mermaid.render(`ds-mmd-${uid}-${seq}`, code);
        if (!cancel) { setSvg(out); setErr(null); }
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e).split('\n').slice(0, 3).join(' '));
      } finally { if (!cancel) setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [code, scheme, uid]);
  useEffect(() => {
    if (code === node.attrs.code) return undefined;
    const t = setTimeout(() => updateAttributes({ code }), 400);
    return () => clearTimeout(t);
  }, [code, node.attrs.code, updateAttributes]);

  return (
    <NodeViewWrapper className={`ds-ed-diagram${selected ? ' is-selected' : ''}`}>
      {editable && (
        <div className="ds-ed-diagram__bar" contentEditable={false}>
          <Icon name="chart" size={15} /><span>Schéma</span>
          <span style={{ flex: 1 }} />
          <div className="ds-segmented" role="group" aria-label="Vue du schéma">
            <button type="button" aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Aperçu</button>
            <button type="button" aria-pressed={mode === 'split'} onClick={() => setMode('split')}>Code + aperçu</button>
          </div>
          <select className="ds-select ds-ed-diagram__tpl" aria-label="Modèle de schéma" value="" onChange={e => { const t = DIAGRAM_TEMPLATES.find(x => x.key === e.target.value); if (t) setCode(t.code); }}>
            <option value="" disabled>Modèle…</option>
            {DIAGRAM_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button type="button" className="ds-ed-iconbtn" aria-label="Supprimer le schéma" title="Supprimer" onClick={deleteNode}><Icon name="trash" size={15} /></button>
        </div>
      )}
      <div className={`ds-ed-diagram__body${mode === 'split' ? ' is-split' : ''}`} contentEditable={false}>
        {mode === 'split' && editable && (
          <textarea className="ds-ed-diagram__code" value={code} spellCheck={false} aria-label="Code Mermaid du schéma"
            onChange={e => setCode(e.target.value)} onKeyDown={e => e.stopPropagation()} />
        )}
        <div className="ds-ed-diagram__preview" onDoubleClick={() => editable && setMode('split')}>
          {loading && !svg ? <span className="ds-ed-diagram__hint">Chargement du moteur de schémas…</span>
            // SVG produit par Mermaid en securityLevel 'strict' (assaini par DOMPurify).
            : <div dangerouslySetInnerHTML={{ __html: svg }} />}
        </div>
      </div>
      {err && <div className="ds-ed-diagram__err" contentEditable={false}><Icon name="alert" size={14} /> Syntaxe : {err}</div>}
      {editable && mode === 'preview' && <div className="ds-ed-diagram__hint" contentEditable={false}>Double-cliquez pour modifier · syntaxe Mermaid</div>}
    </NodeViewWrapper>
  );
}
