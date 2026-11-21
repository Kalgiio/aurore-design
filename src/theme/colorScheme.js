import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// =============================================================================
// Moteur clair / sombre MAISON (2026-11-13) — remplace CssVarsProvider + useColorScheme de MUI.
//
// Rôle, et rien d'autre :
//   1. retenir le CHOIX (`light` | `dark` | `system`) dans localStorage ;
//   2. suivre l'OS en direct quand le choix est `system` ;
//   3. poser le mode RÉSOLU sur <html data-mui-color-scheme="light|dark">.
//
// 🔴 Le nom de l'attribut reste `data-mui-color-scheme` : tokens.css, ds.css et index.css le visent partout. Le
// renommer serait un chantier de recherche-remplacement sans bénéfice, et un oubli = des jetons clairs sur fond sombre.
// 🔴 Clé de stockage `mui-mode`, celle qu'utilisait MUI : le choix déjà enregistré par chaque membre est conservé.
// 🔴 L'attribut porte toujours le mode RÉSOLU, jamais `system` (aucune règle ne vise [data-mui-color-scheme="system"] —
//    bug corrigé le 11/11).
// API compatible avec celle de MUI : `const { mode, systemMode, setMode } = useColorScheme()`.
// =============================================================================

export const STORAGE_KEY = 'mui-mode';
const DEFAULT_MODE = 'dark';
const MODES = ['light', 'dark', 'system'];
const mq = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);
const osMode = () => (mq()?.matches ? 'dark' : 'light');

export function readStoredMode() {
  try { const v = localStorage.getItem(STORAGE_KEY); return MODES.includes(v) ? v : DEFAULT_MODE; } catch { return DEFAULT_MODE; }
}
export const resolveMode = (mode, system = osMode()) => (mode === 'system' ? system : mode);

/** Pose l'attribut et la couleur des barres du navigateur (iPhone) — appelé AVANT le premier rendu pour éviter le flash. */
export function applyScheme(resolved) {
  const html = document.documentElement;
  html.setAttribute('data-mui-color-scheme', resolved);
  html.style.colorScheme = resolved;
  // Barres du navigateur à la couleur du fond du mode CHOISI (sinon une bande de l'autre couleur en haut et en bas).
  const color = (document.body && getComputedStyle(document.body).backgroundColor) || (resolved === 'light' ? '#E8ECFF' : '#050511');
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.setAttribute('content', color); m.removeAttribute('media'); });
}

const Ctx = createContext({ mode: DEFAULT_MODE, systemMode: 'dark', setMode: () => {} });

export function ColorSchemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);
  const [systemMode, setSystemMode] = useState(osMode);

  useEffect(() => {
    const m = mq(); if (!m) return undefined;
    const h = () => setSystemMode(m.matches ? 'dark' : 'light');
    m.addEventListener?.('change', h);
    return () => m.removeEventListener?.('change', h);
  }, []);

  // Un autre onglet change le mode : on suit.
  useEffect(() => {
    const h = e => { if (e.key === STORAGE_KEY) setModeState(readStoredMode()); };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  const resolved = resolveMode(mode, systemMode);
  useEffect(() => { applyScheme(resolved); }, [resolved]);

  const setMode = useCallback(next => {
    const v = MODES.includes(next) ? next : DEFAULT_MODE;
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* navigation privée : le choix vaut pour la session */ }
    setModeState(v);
  }, []);

  const value = useMemo(() => ({ mode, systemMode, setMode, resolvedMode: resolved }), [mode, systemMode, setMode, resolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useColorScheme = () => useContext(Ctx);
