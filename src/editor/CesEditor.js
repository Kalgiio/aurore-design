// =============================================================================
// Editeur CES — TipTap (ProseMirror), WYSIWYG pilote par barre d'outils + blocs
// facon Notion : menu « / », poignee de bloc (+ / ⋮⋮), menu flottant sur la
// selection, menu contextuel (clic droit), couleurs et surlignage par mode,
// listes de taches, encadres, tableaux, images (locales, sans serveur) et schemas
// Mermaid. Licences : TipTap MIT, Mermaid MIT.
//
// Images : `uploadImage(file) => Promise<url>` (portail : envoi à /api/upload, l'URL est stockée). Sans lui (vitrine),
// repli en base64 dans le document — pratique, mais lourd.
// `onChange(html)` à chaque modification ('' si vide). `initialHTML` n'est lu qu'à la création : changer de document
// = changer la `key` du composant.
// =============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Placeholder, CharacterCount } from '@tiptap/extensions';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Callout, Diagram, ImageBlock, SlashCommand } from './extensions';
import { DIAGRAM_TEMPLATES } from './DiagramView';
import { Icon, useToast } from '../components';
import { Kbd } from '../advanced';
import './editor.css';

const cx = (...c) => c.filter(Boolean).join(' ');
const COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
const COLOR_FR = { gray: 'Gris', red: 'Rouge', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', pink: 'Rose' };
const MAX_IMAGE = 5 * 1024 * 1024;

// --- Types de bloc (barre, « Transformer en », menu /) ------------------------
const BLOCKS = [
  { key: 'p', label: 'Texte', icon: 'file', desc: 'Paragraphe simple', run: c => c.setParagraph(), is: e => e.isActive('paragraph') },
  { key: 'h1', label: 'Titre 1', icon: 'h2', desc: 'Grand titre', kw: 'titre heading h1', run: c => c.setHeading({ level: 1 }), is: e => e.isActive('heading', { level: 1 }) },
  { key: 'h2', label: 'Titre 2', icon: 'h2', desc: 'Titre de section', kw: 'titre heading h2', run: c => c.setHeading({ level: 2 }), is: e => e.isActive('heading', { level: 2 }) },
  { key: 'h3', label: 'Titre 3', icon: 'h3', desc: 'Sous-titre', kw: 'titre heading h3', run: c => c.setHeading({ level: 3 }), is: e => e.isActive('heading', { level: 3 }) },
  { key: 'ul', label: 'Liste à puces', icon: 'ul', desc: 'Liste simple', kw: 'liste puces bullet', run: c => c.toggleBulletList(), is: e => e.isActive('bulletList') },
  { key: 'ol', label: 'Liste numérotée', icon: 'ol', desc: '1, 2, 3…', kw: 'liste numero ordered', run: c => c.toggleOrderedList(), is: e => e.isActive('orderedList') },
  { key: 'task', label: 'Cases à cocher', icon: 'check', desc: 'Liste de tâches', kw: 'tache todo case checklist', run: c => c.toggleTaskList(), is: e => e.isActive('taskList') },
  { key: 'quote', label: 'Citation', icon: 'quote', desc: 'Bloc cité', kw: 'citation quote', run: c => c.toggleBlockquote(), is: e => e.isActive('blockquote') },
  { key: 'code', label: 'Code', icon: 'code', desc: 'Bloc de code', kw: 'code', run: c => c.toggleCodeBlock(), is: e => e.isActive('codeBlock') },
  { key: 'callout', label: 'Encadré', icon: 'info', desc: 'Information mise en avant', kw: 'encadre callout note info', run: c => c.setCallout('info'), is: e => e.isActive('callout') },
];
// Encadres : un ton = une couleur + un pictogramme (editor.css, [data-tone]).
export const CALLOUTS = [
  { tone: 'info', label: 'Info', icon: 'info', desc: 'Information utile' },
  { tone: 'note', label: 'Note', icon: 'edit', desc: 'Remarque neutre' },
  { tone: 'help', label: 'Astuce', icon: 'sparkle', desc: 'Conseil, bonne pratique' },
  { tone: 'success', label: 'Succès', icon: 'success', desc: 'Objectif atteint, validé' },
  { tone: 'warn', label: 'Attention', icon: 'alert', desc: 'Point de vigilance' },
  { tone: 'danger', label: 'Danger', icon: 'error', desc: 'Risque, interdiction' },
  { tone: 'mission', label: 'Mission', icon: 'rocket', desc: 'Objectif d’opération (aurore)' },
];
function CalloutPicker({ editor, pos, onDone }) {
  const node = pos != null ? editor.state.doc.nodeAt(pos) : null;
  const current = node?.type.name === 'callout' ? node.attrs.tone : (editor.isActive('callout') ? editor.getAttributes('callout').tone : null);
  const apply = tone => {
    const c = editor.chain().focus();
    if (pos != null) c.setTextSelection(pos + 1);
    if (current) c.updateAttributes('callout', { tone }).run(); else c.setCallout(tone).run();
    onDone?.();
  };
  return (
    <div className="ds-ed-tones">
      {CALLOUTS.map(c => (
        <button key={c.tone} type="button" className={cx('ds-ed-tone', current === c.tone && 'is-on')} data-tone={c.tone} onClick={() => apply(c.tone)} title={c.desc}>
          <i aria-hidden="true" /><span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
const blockLabel = e => (BLOCKS.find(b => b.key !== 'p' && b.is(e)) || BLOCKS[0]).label;

function lireImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Ce fichier n’est pas une image.'));
    if (file.size > MAX_IMAGE) return reject(new Error('Image trop lourde (5 Mo maximum).'));
    const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Lecture impossible.')); r.readAsDataURL(file);
  });
}

// --- Petits elements d'interface ---------------------------------------------
function TB({ icon, label, active, onClick, disabled, children }) {
  return (
    <button type="button" className={cx('ds-ed-tb', active && 'is-active')} title={label} aria-label={label} aria-pressed={active ?? undefined}
      disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick}>
      {icon && <Icon name={icon} size={17} />}{children}
    </button>
  );
}
function Flyout({ trigger, children, label, wide }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const d = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const k = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', d); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('pointerdown', d); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <span className="ds-ed-fly" ref={ref}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open && <div className={cx('ds-ed-pop', wide && 'ds-ed-pop--wide')} role="dialog" aria-label={label} onMouseDown={e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); }}>{children(() => setOpen(false))}</div>}
    </span>
  );
}
function ColorGrid({ editor, onDone }) {
  const txt = editor.getAttributes('textStyle').color;
  const hl = editor.getAttributes('highlight').color;
  return (
    <div className="ds-ed-colors">
      <div className="ds-ed-colors__title">Couleur du texte</div>
      <div className="ds-ed-colors__row">
        <button type="button" className={cx('ds-ed-swatch ds-ed-swatch--text', !txt && 'is-on')} aria-label="Couleur par défaut" title="Par défaut"
          onClick={() => { editor.chain().focus().unsetColor().run(); onDone?.(); }}><span>A</span></button>
        {COLORS.map(c => (
          <button key={c} type="button" className={cx('ds-ed-swatch ds-ed-swatch--text', txt === `var(--ds-tc-${c})` && 'is-on')} aria-label={`Texte ${COLOR_FR[c]}`} title={COLOR_FR[c]}
            onClick={() => { editor.chain().focus().setColor(`var(--ds-tc-${c})`).run(); onDone?.(); }}><span style={{ color: `var(--ds-tc-${c})` }}>A</span></button>
        ))}
      </div>
      <div className="ds-ed-colors__title">Surlignage</div>
      <div className="ds-ed-colors__row">
        <button type="button" className={cx('ds-ed-swatch', !hl && 'is-on')} aria-label="Sans surlignage" title="Aucun"
          onClick={() => { editor.chain().focus().unsetHighlight().run(); onDone?.(); }}><Icon name="close" size={14} /></button>
        {COLORS.map(c => (
          <button key={c} type="button" className={cx('ds-ed-swatch', hl === `var(--ds-hl-${c})` && 'is-on')} aria-label={`Surligner ${COLOR_FR[c]}`} title={COLOR_FR[c]}
            style={{ background: `var(--ds-hl-${c})` }} onClick={() => { editor.chain().focus().setHighlight({ color: `var(--ds-hl-${c})` }).run(); onDone?.(); }} />
        ))}
      </div>
      <div className="ds-ed-colors__note">Teintes définies pour le mode clair et le mode sombre.</div>
    </div>
  );
}
function LinkForm({ editor, onDone }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');
  const apply = () => {
    const u = url.trim();
    if (!u) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else if (/^(https?:\/\/|mailto:|\/)/.test(u)) editor.chain().focus().extendMarkRange('link').setLink({ href: u }).run();
    onDone?.();
  };
  return (
    <div className="ds-ed-link">
      <Icon name="link" size={16} />
      <input autoFocus className="ds-input ds-input--sm" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" aria-label="Adresse du lien"
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} />
      <button type="button" className="ds-btn ds-btn--sm" onClick={apply}>OK</button>
    </div>
  );
}

// =============================================================================
export default function CesEditor({ initialHTML, placeholder = 'Tapez « / » pour insérer un bloc…', minHeight = 320, onChange, uploadImage }) {
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const uploadRef = useRef(uploadImage); uploadRef.current = uploadImage;
  // Contrôles de lireImage (type, 5 Mo) puis envoi si le portail en fournit un.
  const getImage = useCallback(f => (uploadRef.current ? lireImage(f).then(() => uploadRef.current(f)) : lireImage(f)), []);
  const toast = useToast();
  const fileInput = useRef(null);
  const wrap = useRef(null);
  const [slash, setSlash] = useState({ open: false });
  const [slashIdx, setSlashIdx] = useState(0);
  const slashRef = useRef({ state: { open: false }, idx: 0 });
  const [handle, setHandle] = useState(null);
  const [blockMenu, setBlockMenu] = useState(null);
  const [ctx, setCtx] = useState(null);

  const notify = useCallback((severity, title, text) => { if (toast) toast.show({ severity, title, text }); }, [toast]);
  const pickImage = useCallback(() => fileInput.current?.click(), []);

  // Elements du menu « / »
  const slashItems = useMemo(() => [
    ...BLOCKS.map(b => ({ ...b, group: 'Blocs de base' })),
    ...CALLOUTS.map(c => ({ key: `co-${c.tone}`, label: `Encadré ${c.label.toLowerCase()}`, icon: c.icon, group: 'Encadrés', desc: c.desc, kw: `encadre callout ${c.label} ${c.tone}`, run: ch => ch.setCallout(c.tone) })),
    { key: 'img', label: 'Image', icon: 'upload', group: 'Médias', desc: 'Importer depuis l’ordinateur', kw: 'image photo', run: c => { c.run(); pickImage(); return true; } },
    { key: 'table', label: 'Tableau', icon: 'kanban', group: 'Médias', desc: '3 × 3 avec en-tête', kw: 'tableau table', run: c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
    { key: 'hr', label: 'Séparateur', icon: 'minus', group: 'Médias', desc: 'Ligne horizontale', kw: 'separateur ligne hr', run: c => c.setHorizontalRule() },
    ...DIAGRAM_TEMPLATES.map(t => ({ key: `d-${t.key}`, label: `Schéma — ${t.label}`, icon: t.icon, group: 'Schémas', desc: 'Mermaid, modifiable', kw: 'schema diagramme mermaid', run: c => c.insertDiagram(t.code) })),
  ], [pickImage]);
  const filterSlash = useCallback(q => {
    const t = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return slashItems.filter(i => !t || `${i.label} ${i.kw || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t)).slice(0, 14);
  }, [slashItems]);

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === 'heading' ? 'Titre' : placeholder) }),
      CharacterCount,
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Callout, Diagram, ImageBlock,
      SlashCommand.configure({
        items: q => filterSlash(q),
        onState: st => { slashRef.current.state = st; slashRef.current.idx = 0; setSlash(st); setSlashIdx(0); },
        onKey: event => {
          const { state, idx } = slashRef.current;
          if (!state.open || !state.items?.length) return false;
          if (event.key === 'ArrowDown') { const n = (idx + 1) % state.items.length; slashRef.current.idx = n; setSlashIdx(n); return true; }
          if (event.key === 'ArrowUp') { const n = (idx - 1 + state.items.length) % state.items.length; slashRef.current.idx = n; setSlashIdx(n); return true; }
          if (event.key === 'Enter' || event.key === 'Tab') { state.command(state.items[idx]); return true; }
          if (event.key === 'Escape') { setSlash({ open: false }); return true; }
          return false;
        },
      }),
    ],
    content: initialHTML,
    onUpdate: ({ editor: ed }) => onChangeRef.current?.(ed.isEmpty ? '' : ed.getHTML()),
    editorProps: {
      attributes: { class: 'ds-ed__content', 'aria-label': 'Contenu de l’éditeur', spellcheck: 'true' },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
        if (!files.length) return false;
        files.forEach(f => getImage(f).then(src => editorRef.current?.chain().focus().setImage({ src, alt: f.name }).run(), e => notify('warn', 'Image refusée', e.message)));
        return true;
      },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        files.forEach(f => getImage(f).then(src => editorRef.current?.chain().focus().insertContentAt(pos ?? view.state.selection.to, { type: 'image', attrs: { src, alt: f.name } }).run(), e => notify('warn', 'Image refusée', e.message)));
        return true;
      },
      handleKeyDown: (view, event) => {
        if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
          const $f = view.state.selection.$from; if ($f.depth < 1) return false;
          moveBlock($f.before(1), event.key === 'ArrowUp' ? -1 : 1); return true;
        }
        return false;
      },
    },
  });
  const editorRef = useRef(null); editorRef.current = editor;

  // --- Operations sur un bloc de premier niveau (poignee, menus, Alt+↑↓) -----
  const moveBlock = useCallback((pos, dir) => {
    const ed = editorRef.current; if (!ed) return;
    const { state } = ed.view; const node = state.doc.nodeAt(pos); if (!node) return;
    const index = state.doc.resolve(pos).index(0);
    if ((dir < 0 && index === 0) || (dir > 0 && index >= state.doc.childCount - 1)) return;
    let tr = state.tr;
    if (dir < 0) { const prev = state.doc.child(index - 1); tr = tr.delete(pos, pos + node.nodeSize).insert(pos - prev.nodeSize, node); }
    else { const next = state.doc.child(index + 1); tr = tr.delete(pos, pos + node.nodeSize).insert(pos + next.nodeSize, node); }
    ed.view.dispatch(tr.scrollIntoView()); ed.view.focus();
  }, []);
  const blockAction = useCallback((pos, action) => {
    const ed = editorRef.current; const { state } = ed.view; const node = state.doc.nodeAt(pos); if (!node) return;
    if (action === 'dup') ed.view.dispatch(state.tr.insert(pos + node.nodeSize, node.copy(node.content)));
    if (action === 'del') ed.view.dispatch(state.tr.delete(pos, pos + node.nodeSize));
    if (action === 'up') moveBlock(pos, -1);
    if (action === 'down') moveBlock(pos, 1);
    ed.view.focus();
  }, [moveBlock]);
  const transformAt = useCallback((pos, b) => {
    const ed = editorRef.current;
    const node = ed.state.doc.nodeAt(pos);
    const inner = node && !node.isAtom ? pos + 1 : pos;
    b.run(ed.chain().focus().setTextSelection(inner)).run?.();
  }, []);

  // Poignee : suit le bloc survole
  const onMove = useCallback(e => {
    const ed = editorRef.current; if (!ed || !wrap.current || blockMenu) return;
    const view = ed.view; const r = view.dom.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    const at = view.posAtCoords({ left: r.left + 40, top: e.clientY }); if (!at) return;
    const $p = view.state.doc.resolve(at.pos);
    const start = $p.depth >= 1 ? $p.before(1) : (at.inside >= 0 ? at.inside : at.pos);
    const dom = view.nodeDOM(start);
    if (!(dom instanceof HTMLElement)) return;
    const b = dom.getBoundingClientRect(); const w = wrap.current.getBoundingClientRect();
    const lh = Math.min(b.height, 30);
    setHandle({ top: b.top - w.top + lh / 2 - 13, pos: start });
  }, [blockMenu]);
  const insertBelow = useCallback(pos => {
    const ed = editorRef.current; const node = ed.state.doc.nodeAt(pos); if (!node) return;
    const after = pos + node.nodeSize;
    ed.chain().insertContentAt(after, { type: 'paragraph', content: [{ type: 'text', text: '/' }] }).setTextSelection(after + 2).focus().run();
  }, []);

  // Menu contextuel : fermeture
  useEffect(() => {
    if (!ctx && !blockMenu) return undefined;
    const d = e => { if (!e.target.closest?.('.ds-ed-menu')) { setCtx(null); setBlockMenu(null); } };
    const k = e => { if (e.key === 'Escape') { setCtx(null); setBlockMenu(null); } };
    // Defilement de la PAGE = fermeture ; defilement DANS un menu (trop long) = rien.
    const s = e => { if (e.target?.closest?.('.ds-ed-menu')) return; setCtx(null); setBlockMenu(null); };
    document.addEventListener('pointerdown', d); document.addEventListener('keydown', k); window.addEventListener('scroll', s, true);
    return () => { document.removeEventListener('pointerdown', d); document.removeEventListener('keydown', k); window.removeEventListener('scroll', s, true); };
  }, [ctx, blockMenu]);

  // 🔴 MEMORISES : BubbleMenu se reinscrit des que `options` ou `shouldShow` changent
  // d'identite. Recrees a chaque rendu (avec shouldRerenderOnTransaction), ils
  // provoquaient une boucle de rendu infinie (React #185) au premier clic.
  const bubbleOptions = useMemo(() => ({ placement: 'top', offset: 8 }), []);
  const bubbleShouldShow = useCallback(({ editor: ed, state }) => ed.isActive('image')
    || (!state.selection.empty && !ed.isActive('diagram') && !ed.isActive('codeBlock')), []);

  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const onFile = async e => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    for (const f of files) {
      try { const src = await getImage(f); chain().setImage({ src, alt: f.name }).run(); }
      catch (err) { notify('warn', 'Image refusée', err.message); }
    }
  };
  const clip = async action => {
    editor.view.focus();
    if (action === 'paste') {
      try { const t = await navigator.clipboard.readText(); chain().insertContent(t).run(); }
      catch { notify('info', 'Coller', 'Le navigateur bloque la lecture du presse-papiers : utilisez Ctrl + V.'); }
    } else {
      const ok = document.execCommand(action);
      if (!ok) notify('info', action === 'cut' ? 'Couper' : 'Copier', `Utilisez Ctrl + ${action === 'cut' ? 'X' : 'C'}.`);
    }
    setCtx(null);
  };
  // Position bornee a l'ecran ; --top sert a limiter la hauteur (le menu defile au-dela).
  const ctxPos = ($, h = 520, w = 290) => { const x = Math.max(8, Math.min($.x, window.innerWidth - w)); const y = Math.max(8, Math.min($.y, window.innerHeight - h)); return { left: x, top: y, '--top': `${y}px` }; };
  const inTable = editor.isActive('table');
  const words = editor.storage.characterCount?.words?.() ?? 0;
  const chars = editor.storage.characterCount?.characters?.() ?? 0;
  const groupsOf = items => items.reduce((acc, it, i) => { (acc[it.group] = acc[it.group] || []).push({ ...it, i }); return acc; }, {});

  return (
    <div className="ds-ed">
      {/* ---------- Barre d'outils ---------- */}
      <div className="ds-ed__toolbar" role="toolbar" aria-label="Mise en forme">
        <TB icon="undo" label="Annuler (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!editor.can().undo()} />
        <TB icon="redo" label="Rétablir (Ctrl+Maj+Z)" onClick={() => chain().redo().run()} disabled={!editor.can().redo()} />
        <span className="ds-ed__sep" />
        <Flyout label="Type de bloc" trigger={({ open, toggle }) => (
          <button type="button" className="ds-ed-blocksel" aria-haspopup="dialog" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={toggle}>
            {blockLabel(editor)}<Icon name="down" size={15} /></button>)}>
          {close => <div className="ds-ed-list">{BLOCKS.map(b => (
            <button key={b.key} type="button" className={cx('ds-ed-item', b.is(editor) && 'is-on')} onClick={() => { b.run(chain()).run(); close(); }}>
              <Icon name={b.icon} size={16} /><span>{b.label}</span>{b.is(editor) && <Icon name="check" size={15} />}</button>))}</div>}
        </Flyout>
        <span className="ds-ed__sep" />
        <TB icon="bold" label="Gras (Ctrl+B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
        <TB icon="italic" label="Italique (Ctrl+I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
        <TB icon="underline" label="Souligné (Ctrl+U)" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
        <TB icon="strike" label="Barré" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
        <TB icon="code" label="Code en ligne" active={editor.isActive('code')} onClick={() => chain().toggleCode().run()} />
        <Flyout label="Couleurs" wide trigger={({ open, toggle }) => (
          <button type="button" className={cx('ds-ed-tb', open && 'is-active')} title="Couleur et surlignage" aria-label="Couleur et surlignage" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={toggle}>
            <span className="ds-ed-colorbtn" style={{ color: editor.getAttributes('textStyle').color || 'inherit', background: editor.getAttributes('highlight').color || 'transparent' }}>A</span></button>)}>
          {close => <ColorGrid editor={editor} onDone={close} />}
        </Flyout>
        <span className="ds-ed__sep" />
        <TB icon="ul" label="Liste à puces" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
        <TB icon="ol" label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
        <TB icon="check" label="Cases à cocher" active={editor.isActive('taskList')} onClick={() => chain().toggleTaskList().run()} />
        <span className="ds-ed__sep" />
        {[['left', 'Aligner à gauche'], ['center', 'Centrer'], ['right', 'Aligner à droite']].map(([a, l]) => (
          <TB key={a} label={l} active={editor.isActive({ textAlign: a })} onClick={() => chain().setTextAlign(a).run()}><span className={`ds-ed-align ds-ed-align--${a}`} aria-hidden="true"><i /><i /><i /></span></TB>
        ))}
        <span className="ds-ed__sep" />
        <Flyout label="Lien" trigger={({ open, toggle }) => <TB icon="link" label="Lien" active={editor.isActive('link') || open} onClick={toggle} />}>
          {close => <LinkForm editor={editor} onDone={close} />}
        </Flyout>
        <TB icon="upload" label="Importer une image" onClick={pickImage} />
        <Flyout label="Insérer" trigger={({ open, toggle }) => (
          <button type="button" className={cx('ds-ed-blocksel', open && 'is-active')} aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={toggle}><Icon name="plus" size={15} />Insérer</button>)}>
          {close => <div className="ds-ed-list">
            {slashItems.filter(i => ['img', 'table', 'hr'].includes(i.key) || i.group === 'Schémas' || i.group === 'Encadrés').map(i => (
              <button key={i.key} type="button" className="ds-ed-item" onClick={() => { const r = i.run(chain()); if (r && r.run) r.run(); close(); }}><Icon name={i.icon} size={16} /><span>{i.label}</span></button>))}
          </div>}
        </Flyout>
        <TB icon="clear" label="Effacer la mise en forme" onClick={() => chain().unsetAllMarks().clearNodes().run()} />
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onFile} />
      </div>

      {/* ---------- Zone d'edition ---------- */}
      <div className="ds-ed__wrap" ref={wrap} onMouseMove={onMove} onMouseLeave={() => !blockMenu && setHandle(null)}
        onContextMenu={e => { if (e.shiftKey) return; e.preventDefault(); setBlockMenu(null); setCtx({ x: e.clientX, y: e.clientY }); }}
        style={{ '--ed-min': `${minHeight}px` }}>
        {handle && (
          <div className="ds-ed-handle" style={{ top: handle.top }} contentEditable={false}>
            <button type="button" aria-label="Insérer un bloc en dessous" title="Insérer un bloc" onClick={() => insertBelow(handle.pos)}><Icon name="plus" size={16} /></button>
            <button type="button" aria-label="Options du bloc" title="Options du bloc (glisser bientôt)" aria-haspopup="menu"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setCtx(null); setBlockMenu({ x: r.right + 6, y: r.top, pos: handle.pos }); }}><Icon name="drag" size={16} /></button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* ---------- Menu flottant sur selection ---------- */}
      <BubbleMenu editor={editor} options={bubbleOptions} shouldShow={bubbleShouldShow}>
        <div className="ds-ed-bubble" onMouseDown={e => e.preventDefault()}>
          {editor.isActive('image') ? (
            <>
              {[['33%', 'Petite'], ['50%', 'Moyenne'], ['100%', 'Pleine largeur']].map(([w, l]) => (
                <button key={w} type="button" className={cx('ds-ed-tb ds-ed-tb--text', editor.getAttributes('image').width === w && 'is-active')} onClick={() => chain().updateAttributes('image', { width: w }).run()}>{l}</button>))}
              <span className="ds-ed__sep" />
              {[['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']].map(([a, l]) => (
                <TB key={a} label={`Aligner : ${l}`} active={editor.getAttributes('image').align === a} onClick={() => chain().updateAttributes('image', { align: a }).run()}><span className={`ds-ed-align ds-ed-align--${a}`} aria-hidden="true"><i /><i /><i /></span></TB>))}
              <span className="ds-ed__sep" />
              <TB icon="trash" label="Supprimer l'image" onClick={() => chain().deleteSelection().run()} />
            </>
          ) : (
            <>
              <TB icon="bold" label="Gras" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
              <TB icon="italic" label="Italique" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
              <TB icon="underline" label="Souligné" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
              <TB icon="strike" label="Barré" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
              <TB icon="code" label="Code" active={editor.isActive('code')} onClick={() => chain().toggleCode().run()} />
              <span className="ds-ed__sep" />
              <Flyout label="Couleurs" wide trigger={({ toggle }) => <TB label="Couleur" onClick={toggle}><span className="ds-ed-colorbtn" style={{ color: editor.getAttributes('textStyle').color || 'inherit', background: editor.getAttributes('highlight').color || 'transparent' }}>A</span></TB>}>
                {close => <ColorGrid editor={editor} onDone={close} />}
              </Flyout>
              <Flyout label="Lien" trigger={({ toggle }) => <TB icon="link" label="Lien" active={editor.isActive('link')} onClick={toggle} />}>
                {close => <LinkForm editor={editor} onDone={close} />}
              </Flyout>
            </>
          )}
        </div>
      </BubbleMenu>

      {/* ---------- Menu « / » ---------- */}
      {slash.open && slash.rect && (
        <div className="ds-ed-menu ds-ed-slash" style={{ left: Math.min(slash.rect.left, window.innerWidth - 300), top: Math.min(slash.rect.bottom + 6, window.innerHeight - 340) }}
          role="listbox" aria-label="Insérer un bloc" onMouseDown={e => e.preventDefault()}>
          {!slash.items.length && <div className="ds-ed-menu__empty">Aucun bloc ne correspond.</div>}
          {Object.entries(groupsOf(slash.items)).map(([g, items]) => (
            <div key={g}><div className="ds-ed-menu__group">{g}</div>
              {items.map(it => (
                <button key={it.key} type="button" role="option" aria-selected={it.i === slashIdx} className={cx('ds-ed-item ds-ed-item--rich', it.i === slashIdx && 'is-active')}
                  onMouseEnter={() => { slashRef.current.idx = it.i; setSlashIdx(it.i); }} onClick={() => slash.command(it)}>
                  <span className="ds-ed-item__icon"><Icon name={it.icon} size={16} /></span><span><strong>{it.label}</strong><small>{it.desc}</small></span>
                </button>))}
            </div>))}
        </div>
      )}

      {/* ---------- Menu du bloc (⋮⋮) ---------- */}
      {blockMenu && (
        <div className="ds-ed-menu" style={ctxPos(blockMenu, 560, 280)} role="menu" aria-label="Options du bloc" onMouseDown={e => e.preventDefault()}>
          <div className="ds-ed-menu__group">Transformer en</div>
          <div className="ds-ed-menu__grid">{BLOCKS.map(b => (
            <button key={b.key} type="button" role="menuitem" className="ds-ed-item ds-ed-item--tile" title={b.label} onClick={() => { transformAt(blockMenu.pos, b); setBlockMenu(null); }}><Icon name={b.icon} size={16} /><span>{b.label}</span></button>))}</div>
          {editor.state.doc.nodeAt(blockMenu.pos)?.type.name === 'callout' && (<>
            <div className="ds-ed-menu__group">Type d’encadré</div>
            <CalloutPicker editor={editor} pos={blockMenu.pos} onDone={() => setBlockMenu(null)} />
          </>)}
          <div className="ds-ed-menu__sep" />
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => { blockAction(blockMenu.pos, 'up'); setBlockMenu(null); }}><Icon name="up" size={16} /><span>Monter</span><Kbd>Alt ↑</Kbd></button>
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => { blockAction(blockMenu.pos, 'down'); setBlockMenu(null); }}><Icon name="down" size={16} /><span>Descendre</span><Kbd>Alt ↓</Kbd></button>
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => { blockAction(blockMenu.pos, 'dup'); setBlockMenu(null); }}><Icon name="copy" size={16} /><span>Dupliquer</span></button>
          <div className="ds-ed-menu__sep" />
          <button type="button" role="menuitem" className="ds-ed-item ds-ed-item--danger" onClick={() => { blockAction(blockMenu.pos, 'del'); setBlockMenu(null); setHandle(null); }}><Icon name="trash" size={16} /><span>Supprimer le bloc</span></button>
        </div>
      )}

      {/* ---------- Menu contextuel (clic droit) ---------- */}
      {ctx && (
        <div className="ds-ed-menu ds-ed-ctx" style={ctxPos(ctx)} role="menu" aria-label="Édition du texte" onMouseDown={e => e.preventDefault()}>
          <div className="ds-ed-ctx__row">
            <TB icon="bold" label="Gras" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
            <TB icon="italic" label="Italique" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
            <TB icon="underline" label="Souligné" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
            <TB icon="strike" label="Barré" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
            <TB icon="code" label="Code" active={editor.isActive('code')} onClick={() => chain().toggleCode().run()} />
          </div>
          <div className="ds-ed-menu__sep" />
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => clip('cut')} disabled={editor.state.selection.empty}><Icon name="close" size={16} /><span>Couper</span><Kbd>Ctrl X</Kbd></button>
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => clip('copy')} disabled={editor.state.selection.empty}><Icon name="copy" size={16} /><span>Copier</span><Kbd>Ctrl C</Kbd></button>
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => clip('paste')}><Icon name="file" size={16} /><span>Coller</span><Kbd>Ctrl V</Kbd></button>
          <div className="ds-ed-menu__sep" />
          <div className="ds-ed-sub">
            <button type="button" role="menuitem" aria-haspopup="menu" className="ds-ed-item"><Icon name="sparkle" size={16} /><span>Couleur et surlignage</span><Icon name="right" size={15} /></button>
            <div className="ds-ed-menu ds-ed-sub__panel"><ColorGrid editor={editor} onDone={() => setCtx(null)} /></div>
          </div>
          <div className="ds-ed-sub">
            <button type="button" role="menuitem" aria-haspopup="menu" className="ds-ed-item"><Icon name="edit" size={16} /><span>Transformer en</span><Icon name="right" size={15} /></button>
            <div className="ds-ed-menu ds-ed-sub__panel">{BLOCKS.map(b => (
              <button key={b.key} type="button" role="menuitem" className={cx('ds-ed-item', b.is(editor) && 'is-on')} onClick={() => { b.run(chain()).run(); setCtx(null); }}><Icon name={b.icon} size={16} /><span>{b.label}</span></button>))}</div>
          </div>
          <div className="ds-ed-sub">
            <button type="button" role="menuitem" aria-haspopup="menu" className="ds-ed-item"><Icon name="info" size={16} /><span>{editor.isActive('callout') ? 'Type d’encadré' : 'Mettre en encadré'}</span><Icon name="right" size={15} /></button>
            <div className="ds-ed-menu ds-ed-sub__panel"><CalloutPicker editor={editor} onDone={() => setCtx(null)} /></div>
          </div>
          <div className="ds-ed-sub">
            <button type="button" role="menuitem" aria-haspopup="menu" className="ds-ed-item"><Icon name="plus" size={16} /><span>Insérer</span><Icon name="right" size={15} /></button>
            <div className="ds-ed-menu ds-ed-sub__panel">
              {slashItems.filter(i => ['img', 'table', 'hr', 'callout'].includes(i.key) || i.group === 'Schémas').map(i => (
                <button key={i.key} type="button" role="menuitem" className="ds-ed-item" onClick={() => { const r = i.run(chain()); if (r && r.run) r.run(); setCtx(null); }}><Icon name={i.icon} size={16} /><span>{i.label}</span></button>))}
            </div>
          </div>
          {inTable && (
            <div className="ds-ed-sub">
              <button type="button" role="menuitem" aria-haspopup="menu" className="ds-ed-item"><Icon name="kanban" size={16} /><span>Tableau</span><Icon name="right" size={15} /></button>
              <div className="ds-ed-menu ds-ed-sub__panel">
                {[['Ligne au-dessus', c => c.addRowBefore()], ['Ligne en dessous', c => c.addRowAfter()], ['Colonne à gauche', c => c.addColumnBefore()], ['Colonne à droite', c => c.addColumnAfter()],
                  ['Supprimer la ligne', c => c.deleteRow()], ['Supprimer la colonne', c => c.deleteColumn()], ['Supprimer le tableau', c => c.deleteTable()]].map(([l, f]) => (
                  <button key={l} type="button" role="menuitem" className={cx('ds-ed-item', l.startsWith('Supprimer') && 'ds-ed-item--danger')} onClick={() => { f(chain()).run(); setCtx(null); }}><span>{l}</span></button>))}
              </div>
            </div>
          )}
          <Flyout label="Lien" trigger={({ toggle }) => <button type="button" role="menuitem" className="ds-ed-item" onClick={toggle}><Icon name="link" size={16} /><span>Lien…</span></button>}>
            {close => <LinkForm editor={editor} onDone={() => { close(); setCtx(null); }} />}
          </Flyout>
          <div className="ds-ed-menu__sep" />
          <button type="button" role="menuitem" className="ds-ed-item" onClick={() => { chain().unsetAllMarks().clearNodes().run(); setCtx(null); }}><Icon name="clear" size={16} /><span>Effacer la mise en forme</span></button>
          <div className="ds-ed-menu__hint">Maj + clic droit : menu du navigateur</div>
        </div>
      )}

      <div className="ds-ed__foot">
        <span>{words} mot{words > 1 ? 's' : ''} · {chars} caractère{chars > 1 ? 's' : ''}</span>
        <span className="ds-ed__tips"><Kbd>/</Kbd> blocs · <Kbd>Alt</Kbd>+<Kbd>↑</Kbd><Kbd>↓</Kbd> déplacer · clic droit : édition · glissez une image</span>
      </div>
    </div>
  );
}
