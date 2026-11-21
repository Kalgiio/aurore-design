// =============================================================================
// AURORE DESIGN (design system du CES) — composants avances
//
// Inspiration : PrimeVue (calendrier, graphiques, tableau de taches, editeur) et
// shadcn/ui (combobox, fil d'Ariane repliable, menu, palette de commandes, panneau).
// Memes regles que components.js : jetons uniquement, aucun import MUI.
// Dependances deja presentes dans le portail : @dnd-kit (tableau de taches),
// FullCalendar (calendrier d'evenements), @remixicon/react (via <Icon>).
// =============================================================================
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Icon, Avatar, AvatarGroup, Tag, Button, InputText, Dialog, Field, Tooltip, ToggleSwitch, SegmentedControl, Status } from './components';
import { useColorScheme } from './theme/colorScheme';
// Sceau « Made by the community » : OBLIGATOIRE sur un site de fans (regles du Fankit CIG).
import communitySeal from './assets/logo-small.webp';
import cesLogo from './assets/logo.png';
import { createPortal } from 'react-dom';
import './advanced.css';

const cx = (...c) => c.filter(Boolean).join(' ');

/** Ferme au clic exterieur et sur Echap. */
function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [ref, open, onClose]);
}

// --- Popover -----------------------------------------------------------------
export function Popover({ trigger, children, align = 'start', width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  return (
    <span className="ds-pop" ref={ref}>
      {trigger({ open, toggle: () => setOpen(o => !o), close })}
      {open && <div className={cx('ds-pop__panel', `ds-pop__panel--${align}`)} style={width ? { width } : undefined}>{typeof children === 'function' ? children({ close }) : children}</div>}
    </span>
  );
}

// --- Menu deroulant (role=menu, fleches, Echap) ------------------------------
export function DropdownMenu({ label, icon = 'more', items, iconOnly, variant = 'outlined' }) {
  const refs = useRef([]);
  const focusable = items.map((it, i) => (it.separator || it.heading ? null : i)).filter(i => i !== null);
  const onKey = (e, close) => {
    const cur = focusable.indexOf(refs.current.findIndex(el => el === document.activeElement));
    if (e.key === 'ArrowDown') { e.preventDefault(); refs.current[focusable[(cur + 1) % focusable.length]]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); refs.current[focusable[(cur - 1 + focusable.length) % focusable.length]]?.focus(); }
    if (e.key === 'Tab') close();
  };
  return (
    <Popover trigger={({ open, toggle }) => (
      <Button variant={variant} severity="secondary" icon={iconOnly ? icon : undefined} iconRight={iconOnly ? undefined : 'down'} iconOnly={iconOnly}
        aria-haspopup="menu" aria-expanded={open} aria-label={iconOnly ? label : undefined} onClick={toggle}
        onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); toggle(); setTimeout(() => refs.current[focusable[0]]?.focus(), 0); } }}>{label}</Button>
    )}>
      {({ close }) => (
        <div role="menu" className="ds-menu" onKeyDown={e => onKey(e, close)}>
          {items.map((it, i) => it.separator ? <div key={`s${i}`} className="ds-menu__sep" role="separator" />
            : it.heading ? <div key={`h${i}`} className="ds-menu__heading">{it.heading}</div>
            : (
              <button key={it.label} ref={el => { refs.current[i] = el; }} role="menuitem" type="button" className={cx('ds-menu__item', it.danger && 'ds-menu__item--danger')}
                onClick={() => { it.onSelect?.(); close(); }}>
                {it.icon && <Icon name={it.icon} size={16} />}<span>{it.label}</span>{it.shortcut && <Kbd>{it.shortcut}</Kbd>}
              </button>
            ))}
        </div>
      )}
    </Popover>
  );
}

export function Kbd({ children }) { return <kbd className="ds-kbd">{children}</kbd>; }

// --- Combobox (motif shadcn : bouton + recherche + liste) --------------------
export function Combobox({ options, value, onChange, placeholder = 'Choisir…', searchPlaceholder = 'Rechercher…', multiple, emptyText = 'Aucun résultat.', width = 280 }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const selected = multiple ? (value || []) : value;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter(o => `${o.label} ${o.desc || ''}`.toLowerCase().includes(t)) : options;
  }, [q, options]);
  useEffect(() => { setActive(0); }, [q]);
  const isSel = v => (multiple ? selected.includes(v) : selected === v);
  const pick = (o, close) => {
    if (multiple) onChange(isSel(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value]);
    else { onChange(o.value === selected ? null : o.value); close(); setQ(''); }
  };
  const label = multiple
    ? (selected.length ? null : placeholder)
    : (options.find(o => o.value === selected)?.label || placeholder);
  return (
    <Popover width={width} trigger={({ open, toggle }) => (
      <button type="button" className={cx('ds-combo', multiple && selected.length && 'ds-combo--chips')} style={{ width }} aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
        {multiple && selected.length
          ? <span className="ds-combo__chips">{selected.map(v => <span key={v} className="ds-tag ds-tag--rounded">{options.find(o => o.value === v)?.label}</span>)}</span>
          : <span className={cx('ds-combo__value', (multiple ? !selected.length : !selected) && 'ds-combo__value--ph')}>{label}</span>}
        <Icon name="sort" size={16} />
      </button>
    )}>
      {({ close }) => (
        <div className="ds-cmd">
          <div className="ds-cmd__search">
            <Icon name="search" size={16} />
            <input autoFocus role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); pick(filtered[active], close); }
              }} />
          </div>
          <ul className="ds-cmd__list" role="listbox" id={listId} aria-multiselectable={multiple || undefined}>
            {!filtered.length && <li className="ds-cmd__empty">{emptyText}</li>}
            {filtered.map((o, i) => (
              <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={isSel(o.value)} data-active={i === active}
                className="ds-cmd__item" onMouseEnter={() => setActive(i)} onClick={() => pick(o, close)}>
                {o.icon && <Icon name={o.icon} size={16} />}
                <span className="ds-cmd__label">{o.label}{o.desc && <small>{o.desc}</small>}</span>
                <Icon name="check" size={16} className="ds-cmd__check" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}

// --- Fil d'Ariane repliable (motif shadcn) -----------------------------------
export function BreadcrumbPro({ items, maxItems = 4 }) {
  const collapse = items.length > maxItems;
  const hidden = collapse ? items.slice(1, items.length - (maxItems - 2)) : [];
  const shown = collapse ? [items[0], { ellipsis: true }, ...items.slice(items.length - (maxItems - 2))] : items;
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="ds-crumbs">
        {shown.map((it, i) => (
          <li key={it.ellipsis ? '…' : it.label}>
            {i > 0 && <Icon name="right" size={14} className="ds-crumbs__sep" />}
            {it.ellipsis
              ? <DropdownMenu iconOnly icon="more" variant="text" label="Afficher le chemin complet" items={hidden.map(h => ({ label: h.label, icon: h.icon }))} />
              : i === shown.length - 1
                ? <span aria-current="page" className="ds-crumbs__current">{it.icon && <Icon name={it.icon} size={15} />}{it.label}</span>
                : <a href={it.href || '#'} onClick={e => e.preventDefault()} className="ds-crumbs__link">{it.icon && <Icon name={it.icon} size={15} />}{it.label}</a>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// --- Palette de commandes (shadcn Command, Ctrl+K) ---------------------------
export function CommandPalette({ open, onClose, groups }) {
  const ref = useRef(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); setQ(''); setActive(0); }
    if (!open && d.open) d.close();
  }, [open]);
  const flat = useMemo(() => {
    const t = q.trim().toLowerCase();
    return groups.flatMap(g => g.items.filter(it => !t || it.label.toLowerCase().includes(t)).map(it => ({ ...it, group: g.heading })));
  }, [groups, q]);
  useEffect(() => { setActive(0); }, [q]);
  const run = it => { it.onSelect?.(); onClose(); };
  let lastGroup = null;
  return (
    <dialog ref={ref} className="ds-dialog ds-palette" onClose={onClose} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label="Palette de commandes">
      <div className="ds-cmd">
        <div className="ds-cmd__search">
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tapez une commande ou cherchez…"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]); }
            }} />
          <Kbd>Échap</Kbd>
        </div>
        <ul className="ds-cmd__list ds-cmd__list--tall" role="listbox">
          {!flat.length && <li className="ds-cmd__empty">Aucune commande.</li>}
          {flat.map((it, i) => {
            const head = it.group !== lastGroup ? <li key={`g-${it.group}`} className="ds-menu__heading" role="presentation">{it.group}</li> : null;
            lastGroup = it.group;
            return (
              <React.Fragment key={`${it.group}-${it.label}`}>
                {head}
                <li role="option" aria-selected={i === active} data-active={i === active} className="ds-cmd__item" onMouseEnter={() => setActive(i)} onClick={() => run(it)}>
                  {it.icon && <Icon name={it.icon} size={16} />}<span className="ds-cmd__label">{it.label}</span>{it.shortcut && <Kbd>{it.shortcut}</Kbd>}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}

// --- Panneau lateral (Sheet / Drawer) ----------------------------------------
export function Drawer({ open, onClose, title, subtitle, icon, children, footer, side = 'right' }) {
  const ref = useRef(null);
  const tid = useId();
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={cx('ds-drawer', `ds-drawer--${side}`)} onClose={onClose} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-labelledby={tid}>
      <div className="ds-drawer__head">
        <h3 className="ds-dialog__title dsn-drawer-title" id={tid}>
          {icon && <span className="dsn-drawer-title__icon"><Icon name={icon} size={20} /></span>}
          <span>{title}{subtitle && <span className="dsn-drawer-title__sub" style={{ display: 'block' }}>{subtitle}</span>}</span>
        </h3>
        <Button iconOnly icon="close" variant="text" severity="secondary" size="sm" aria-label="Fermer" onClick={onClose} /></div>
      <div className="ds-drawer__body">{children}</div>
      {footer && <div className="ds-drawer__foot">{footer}</div>}
    </dialog>
  );
}

// --- Saisies complementaires -------------------------------------------------
export function InputOTP({ length = 6, value = '', onChange }) {
  const refs = useRef([]);
  const set = (i, ch) => {
    const arr = value.padEnd(length, ' ').split('');
    arr[i] = ch || ' ';
    onChange(arr.join('').trimEnd());
  };
  return (
    <div className="ds-otp" role="group" aria-label="Code de vérification">
      {Array.from({ length }, (_, i) => (
        <React.Fragment key={i}>
          {i === length / 2 && <span className="ds-otp__sep" aria-hidden="true">–</span>}
          <input ref={el => { refs.current[i] = el; }} className="ds-otp__cell" inputMode="numeric" maxLength={1} aria-label={`Chiffre ${i + 1}`}
            value={(value[i] || '').trim()}
            onChange={e => { const ch = e.target.value.replace(/\D/g, '').slice(-1); set(i, ch); if (ch) refs.current[i + 1]?.focus(); }}
            onKeyDown={e => { if (e.key === 'Backspace' && !(value[i] || '').trim()) refs.current[i - 1]?.focus(); if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus(); if (e.key === 'ArrowRight') refs.current[i + 1]?.focus(); }}
            onPaste={e => { const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length); if (d) { e.preventDefault(); onChange(d); refs.current[Math.min(d.length, length - 1)]?.focus(); } }} />
        </React.Fragment>
      ))}
    </div>
  );
}

export function InputNumber({ value, onChange, min = -Infinity, max = Infinity, step = 1, suffix, label }) {
  const clamp = v => Math.min(max, Math.max(min, v));
  return (
    <div className="ds-number">
      <button type="button" aria-label="Diminuer" disabled={value <= min} onClick={() => onChange(clamp(value - step))}><Icon name="minus" size={16} /></button>
      <input type="text" inputMode="numeric" role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={Number.isFinite(min) ? min : undefined} aria-valuemax={Number.isFinite(max) ? max : undefined}
        value={`${value}${suffix ? ` ${suffix}` : ''}`}
        onChange={e => { const n = parseInt(e.target.value.replace(/[^\d-]/g, ''), 10); if (!Number.isNaN(n)) onChange(clamp(n)); }}
        onKeyDown={e => { if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + step)); } if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - step)); } }} />
      <button type="button" aria-label="Augmenter" disabled={value >= max} onClick={() => onChange(clamp(value + step))}><Icon name="plus" size={16} /></button>
    </div>
  );
}

const STRENGTH = [['Trop court', 'var(--ds-danger)'], ['Faible', 'var(--ds-danger)'], ['Moyen', 'var(--ds-warn)'], ['Bon', 'var(--ds-info)'], ['Excellent', 'var(--ds-success)']];
export function PasswordInput({ value, onChange, id }) {
  const [show, setShow] = useState(false);
  const score = value.length < 8 ? (value ? 1 : 0) : [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/].filter(r => r.test(value)).length;
  const [label, color] = STRENGTH[value ? Math.max(score, 1) : 0];
  return (
    <div className="ds-field">
      <span className="ds-pw">
        <input id={id} className="ds-input" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
        <button type="button" aria-label={show ? 'Masquer' : 'Afficher'} onClick={() => setShow(s => !s)}><Icon name={show ? 'eyeOff' : 'eye'} size={17} /></button>
      </span>
      <div className="ds-pw__meter" aria-hidden="true">{[1, 2, 3, 4].map(i => <i key={i} style={{ background: value && score >= i ? color : undefined }} />)}</div>
      <span className="ds-help" aria-live="polite">{value ? <>Robustesse : <strong style={{ color }}>{label}</strong></> : '8 caractères minimum, mélangez majuscules, chiffres et symboles.'}</span>
    </div>
  );
}

export function FileUpload({ accept = 'image/*', multiple = true }) {
  const [files, setFiles] = useState([]);
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const add = list => setFiles(f => [...f, ...Array.from(list).map(x => ({ name: x.name, size: x.size, id: Math.random() }))]);
  const fmt = n => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className={cx('ds-drop', over && 'ds-drop--over')} role="button" tabIndex={0}
        onClick={() => input.current?.click()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        <Icon name="upload" size={30} />
        <strong>Glissez vos fichiers ici</strong><span>ou cliquez pour parcourir · PNG, JPG, WebP · 5 Mo max</span>
        <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={e => add(e.target.files)} />
      </div>
      {files.map(f => (
        <div key={f.id} className="ds-file"><Icon name="file" size={18} /><span>{f.name}</span><small>{fmt(f.size)}</small>
          <Button iconOnly icon="close" size="sm" variant="text" severity="secondary" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(l => l.filter(x => x.id !== f.id))} /></div>
      ))}
    </div>
  );
}

export function Rating({ value, onChange, max = 5, label = 'Note' }) {
  return (
    <div className="ds-rating" role="radiogroup" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i + 1} aria-label={`${i + 1} sur ${max}`} data-on={i < value} onClick={() => onChange(i + 1 === value ? 0 : i + 1)}>
          <Icon name={i < value ? 'starFill' : 'star'} size={22} />
        </button>
      ))}
    </div>
  );
}

export function Timeline({ items }) {
  return (
    <ol className="ds-timeline">
      {items.map(it => (
        <li key={it.title} style={{ '--t': `var(--ds-${it.severity || 'primary'})` }}>
          <span className="ds-timeline__dot"><Icon name={it.icon || 'check'} size={14} /></span>
          <div><div className="ds-timeline__head"><strong>{it.title}</strong><time>{it.time}</time></div>{it.desc && <p>{it.desc}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

export function Tree({ nodes }) {
  const [open, setOpen] = useState(() => new Set(nodes.filter(n => n.children).map(n => n.label)));
  const render = (list, level = 1) => (
    <ul role={level === 1 ? 'tree' : 'group'} className="ds-tree">
      {list.map(n => {
        const has = !!n.children; const isOpen = open.has(n.label);
        return (
          <li key={n.label} role="treeitem" aria-expanded={has ? isOpen : undefined} aria-level={level}>
            <button type="button" className="ds-tree__row" style={{ paddingLeft: 8 + (level - 1) * 18 }}
              onClick={() => has && setOpen(s => { const x = new Set(s); if (x.has(n.label)) x.delete(n.label); else x.add(n.label); return x; })}>
              <span className="ds-tree__chev" data-open={isOpen}>{has && <Icon name="right" size={14} />}</span>
              <Icon name={n.icon || (has ? 'folder' : 'file')} size={16} /><span>{n.label}</span>{n.meta && <small>{n.meta}</small>}
            </button>
            {has && isOpen && render(n.children, level + 1)}
          </li>
        );
      })}
    </ul>
  );
  return render(nodes);
}

export function MeterGroup({ items, max = 100 }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="ds-meter" role="img" aria-label={items.map(i => `${i.label} ${i.value}`).join(', ')}>
        {items.map(i => <span key={i.label} style={{ width: `${(i.value / max) * 100}%`, background: i.color }} />)}
      </div>
      <div className="ds-legend">{items.map(i => <span key={i.label}><i style={{ background: i.color }} />{i.label} <strong>{i.value}%</strong></span>)}</div>
    </div>
  );
}

// --- Calendrier et selecteur de date ----------------------------------------
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtDate = d => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Calendrier mensuel. mode="single" (Date) ou "range" ({ from, to }). Fleches pour naviguer. */
export function Calendar({ value, onChange, mode = 'single', marks = [] }) {
  const init = (mode === 'range' ? value?.from : value) || new Date();
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1));
  const [focus, setFocus] = useState(init);
  const grid = useRef(null);
  const today = new Date();
  const start = (view.getDay() + 6) % 7; // lundi en premier
  const days = Array.from({ length: 42 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i - start + 1));
  const isSel = d => (mode === 'range' ? (sameDay(d, value?.from) || sameDay(d, value?.to)) : sameDay(d, value));
  const inRange = d => mode === 'range' && value?.from && value?.to && d > value.from && d < value.to;
  const pick = d => {
    if (mode !== 'range') return onChange(d);
    if (!value?.from || value.to) return onChange({ from: d, to: null });
    return onChange(d < value.from ? { from: d, to: value.from } : { from: value.from, to: d });
  };
  const move = n => {
    const d = new Date(focus); d.setDate(d.getDate() + n); setFocus(d);
    if (d.getMonth() !== view.getMonth()) setView(new Date(d.getFullYear(), d.getMonth(), 1));
    setTimeout(() => grid.current?.querySelector('[data-focus="true"]')?.focus(), 0);
  };
  return (
    <div className="ds-cal">
      <div className="ds-cal__head">
        <Button iconOnly icon="left" size="sm" variant="text" severity="secondary" aria-label="Mois précédent" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} />
        <span className="ds-cal__title" aria-live="polite">{MOIS[view.getMonth()]} {view.getFullYear()}</span>
        <Button iconOnly icon="right" size="sm" variant="text" severity="secondary" aria-label="Mois suivant" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} />
      </div>
      <div className="ds-cal__grid" role="grid" ref={grid}
        onKeyDown={e => { const k = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (k) { e.preventDefault(); move(k); } }}>
        {JOURS.map(j => <span key={j} className="ds-cal__dow" role="columnheader">{j}</span>)}
        {days.map(d => {
          const out = d.getMonth() !== view.getMonth();
          const f = sameDay(d, focus);
          return (
            <button key={d.toISOString()} type="button" role="gridcell" tabIndex={f ? 0 : -1} data-focus={f}
              aria-selected={isSel(d)} aria-label={fmtDate(d)}
              className={cx('ds-cal__day', out && 'ds-cal__day--out', sameDay(d, today) && 'ds-cal__day--today', isSel(d) && 'ds-cal__day--sel', inRange(d) && 'ds-cal__day--range')}
              onClick={() => { setFocus(d); pick(d); }}>
              {d.getDate()}{marks.some(m => sameDay(m, d)) && <i className="ds-cal__mark" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({ value, onChange, placeholder = 'Choisir une date', mode = 'single' }) {
  const text = mode === 'range'
    ? (value?.from ? `${fmtDate(value.from)} → ${value.to ? fmtDate(value.to) : '…'}` : '')
    : fmtDate(value);
  return (
    <Popover trigger={({ open, toggle }) => (
      <button type="button" className="ds-combo" style={{ width: mode === 'range' ? 340 : 260 }} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="calendar" size={16} /><span className={cx('ds-combo__value', !text && 'ds-combo__value--ph')}>{text || placeholder}</span>
      </button>
    )}>
      {({ close }) => <Calendar mode={mode} value={value} onChange={v => { onChange(v); if (mode !== 'range' || v.to) close(); }} />}
    </Popover>
  );
}

/** Calendrier d'evenements : FullCalendar habille par les jetons, MODIFIABLE.
 *  Clic droit sur un evenement : modifier, couleur, dupliquer, decaler, supprimer.
 *  Clic droit sur un jour : creer un evenement. Glisser-deposer : deplacer. */
const EV_COLORS = [['primary', 'Bleu'], ['success', 'Vert'], ['warn', 'Ambre'], ['danger', 'Rouge'], ['help', 'Violet'], ['info', 'Cyan']];
const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const shift = (s, n) => { if (!s) return s; const d = new Date(s); d.setDate(d.getDate() + n); return s.length > 10 ? `${iso(d)}${s.slice(10)}` : iso(d); };
export function EventCalendar({ events: initial }) {
  const [events, setEvents] = useState(() => initial.map((e, i) => ({ id: e.id || `ev${i}`, ...e })));
  const [menu, setMenu] = useState(null);
  const [edit, setEdit] = useState(null);
  const close = useCallback(() => setMenu(null), []);
  useEffect(() => {
    if (!menu && !edit) return undefined;
    const d = e => { if (!e.target.closest?.('.ds-cal-ctx')) { close(); setEdit(null); } };
    const k = e => { if (e.key === 'Escape') { close(); setEdit(null); } };
    document.addEventListener('pointerdown', d); document.addEventListener('keydown', k); window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', d); document.removeEventListener('keydown', k); window.removeEventListener('scroll', close, true); };
  }, [menu, edit, close]);
  const update = (id, patch) => setEvents(l => l.map(e => (e.id === id ? { ...e, ...patch } : e)));
  const ev = menu?.id ? events.find(e => e.id === menu.id) : null;
  const at = e => ({ left: Math.min(e.clientX, window.innerWidth - 250), top: Math.min(e.clientY, window.innerHeight - 330) });
  const save = () => {
    if (!edit.title.trim()) return;
    const data = { title: edit.title.trim(), start: edit.time ? `${edit.date}T${edit.time}` : edit.date, color: `var(--ds-${edit.color})`, tone: edit.color };
    if (edit.id) update(edit.id, { ...data, end: undefined }); else setEvents(l => [...l, { id: `ev${Date.now()}`, ...data }]);
    setEdit(null);
  };
  // Fenetre d'edition ANCREE a l'endroit du clic (comme le menu du clic droit), pas une modale plein ecran.
  const pos = (x, y) => ({ left: Math.max(8, Math.min(x, window.innerWidth - 316)), top: Math.max(8, Math.min(y, window.innerHeight - 360)) });
  const openEdit = (e, date, at) => setEdit({ ...(e
    ? { id: e.id, title: e.title, date: (e.start || '').slice(0, 10), time: (e.start || '').slice(11, 16), color: e.tone || 'primary' }
    : { title: 'Nouvelle opération', date: iso(date), time: '21:00', color: 'primary' }), ...pos(at?.left ?? 200, at?.top ?? 200) });
  return (
    <div className="ds-fc">
      <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" locale="fr" firstDay={1}
        height="auto" events={events} dayMaxEventRows={3} editable eventStartEditable buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine' }}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
        // Heure LOCALE : toISOString() donnait l'heure UTC, decalee d'une heure.
        eventChange={({ event }) => update(event.id, { start: event.allDay ? iso(event.start) : `${iso(event.start)}T${String(event.start.getHours()).padStart(2, '0')}:${String(event.start.getMinutes()).padStart(2, '0')}`, end: event.end ? iso(event.end) : undefined })}
        eventDidMount={info => info.el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); setMenu({ ...at(e), id: info.event.id }); })}
        dayCellDidMount={info => info.el.addEventListener('contextmenu', e => { e.preventDefault(); setMenu({ ...at(e), date: info.date }); })}
        eventClick={info => { info.jsEvent.preventDefault(); close(); openEdit(events.find(x => x.id === info.event.id), null, { left: info.jsEvent.clientX, top: info.jsEvent.clientY + 8 }); }} />
      <div className="ds-fc__hint"><Icon name="info" size={13} /> Clic droit sur un événement ou un jour pour modifier · glisser pour déplacer · clic pour éditer</div>
      {menu && createPortal(
        <div className="ds ds-cal-ctx" style={{ left: menu.left, top: menu.top }} role="menu" aria-label={ev ? `Événement ${ev.title}` : 'Jour'}>
          {ev ? (<>
            <div className="ds-menu__heading">{ev.title}</div>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { openEdit(ev, null, menu); close(); }}><Icon name="edit" size={16} /><span>Modifier…</span></button>
            <div className="ds-cal-ctx__colors" role="group" aria-label="Couleur">
              {EV_COLORS.map(([t, l]) => <button key={t} type="button" aria-label={l} title={l} className={ev.tone === t ? 'is-on' : ''} style={{ background: `var(--ds-${t})` }} onClick={() => { update(ev.id, { color: `var(--ds-${t})`, tone: t }); close(); }} />)}
            </div>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { setEvents(l => [...l, { ...ev, id: `ev${Date.now()}`, title: `${ev.title} (copie)` }]); close(); }}><Icon name="copy" size={16} /><span>Dupliquer</span></button>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { update(ev.id, { start: shift(ev.start, 1), end: shift(ev.end, 1) }); close(); }}><Icon name="right" size={16} /><span>Décaler au lendemain</span></button>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { update(ev.id, { start: shift(ev.start, -1), end: shift(ev.end, -1) }); close(); }}><Icon name="left" size={16} /><span>Décaler à la veille</span></button>
            <div className="ds-menu__sep" />
            <button type="button" role="menuitem" className="ds-menu__item ds-menu__item--danger" onClick={() => { setEvents(l => l.filter(x => x.id !== ev.id)); close(); }}><Icon name="trash" size={16} /><span>Supprimer</span></button>
          </>) : (<>
            <div className="ds-menu__heading">{menu.date?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { openEdit(null, menu.date, menu); close(); }}><Icon name="plus" size={16} /><span>Nouvel événement ici</span></button>
            <button type="button" role="menuitem" className="ds-menu__item" onClick={() => { setEvents(l => [...l, { id: `ev${Date.now()}`, title: 'Indisponible', start: iso(menu.date), color: 'var(--ds-text-subtle)', tone: 'secondary' }]); close(); }}><Icon name="lock" size={16} /><span>Marquer indisponible</span></button>
          </>)}
        </div>, document.body)}
      {edit && createPortal(
        <div className="ds ds-cal-ctx ds-cal-edit" style={{ left: edit.left, top: edit.top }} role="dialog" aria-label={edit.id ? 'Modifier l’événement' : 'Nouvel événement'}
          onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } }}>
          <div className="ds-cal-edit__head"><Icon name={edit.id ? 'edit' : 'plus'} size={15} /><span>{edit.id ? 'Modifier l’événement' : 'Nouvel événement'}</span>
            <button type="button" className="ds-cal-edit__x" aria-label="Fermer" onClick={() => setEdit(null)}><Icon name="close" size={15} /></button></div>
          <input className="ds-input ds-input--sm" aria-label="Titre" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} autoFocus />
          <div className="ds-cal-edit__row">
            <input className="ds-input ds-input--sm" type="date" aria-label="Date" value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} />
            <input className="ds-input ds-input--sm" type="time" aria-label="Heure (vide = toute la journée)" value={edit.time} onChange={e => setEdit({ ...edit, time: e.target.value })} />
          </div>
          <div className="ds-cal-ctx__colors" role="radiogroup" aria-label="Couleur">
            {EV_COLORS.map(([t, l]) => <button key={t} type="button" role="radio" aria-checked={edit.color === t} aria-label={l} title={l} className={edit.color === t ? 'is-on' : ''} style={{ background: `var(--ds-${t})` }} onClick={() => setEdit({ ...edit, color: t })} />)}
          </div>
          <div className="ds-cal-edit__foot">
            {edit.id && <Button label="Supprimer" size="sm" variant="text" severity="danger" icon="trash" onClick={() => { setEvents(l => l.filter(x => x.id !== edit.id)); setEdit(null); }} />}
            <span style={{ flex: 1 }} />
            <Button label="Annuler" size="sm" variant="text" severity="secondary" onClick={() => setEdit(null)} />
            <Button label="Enregistrer" size="sm" onClick={save} disabled={!edit.title.trim()} />
          </div>
        </div>, document.body)}
    </div>
  );
}

// --- Bandeau d'alerte DEFCON ----------------------------------------------------
// Pousse TOUTE la page vers le bas (html.ds-alert-on + --ces-alert-h, voir advanced.css).
// 🔴 Les elements position:fixed (barre laterale du portail) doivent ajouter
// var(--ces-alert-h, 0px) a leur `top` pour ne pas passer sous le bandeau.
export const DEFCON = {
  5: { label: 'Situation normale', color: '#2563eb', icon: 'shield', role: 'status' },
  4: { label: 'Vigilance renforcée', color: '#16a34a', icon: 'eye', role: 'status' },
  3: { label: 'Alerte élevée', color: '#ca8a04', icon: 'alert', role: 'status' },
  2: { label: 'Alerte grave', color: '#ea580c', icon: 'alert', role: 'alert' },
  1: { label: 'Alerte maximale', color: '#dc2626', icon: 'error', role: 'alert' },
};
// Bandeau « salle de commandement » (adopté le 2026-11-14) : console sombre FIXE dans les deux thèmes — bandes de
// danger animées (3 à 1), niveau, jauge 5→1, nom de code, consigne, horloge. `onOpen` = bouton « Bulletin ».
const DEFCON_CODE = { 5: 'FADE OUT', 4: 'DOUBLE TAKE', 3: 'ROUND HOUSE', 2: 'FAST PACE', 1: 'COCKED PISTOL' };
const p2 = n => String(n).padStart(2, '0');
const hms = d => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const defconRef = (d, lvl) => `DC${lvl}-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
function useSecondClock(on) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (!on) return undefined; const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [on]);
  return now;
}
function DefconGauge({ level, className }) {
  return (
    <span className={className} aria-hidden="true">
      {[5, 4, 3, 2, 1].map(n => <i key={n} data-on={n >= level} data-cur={n === level} style={{ '--c': DEFCON[n].color }}>{n}</i>)}
    </span>
  );
}

export function DefconBar({ active, level = 3, message, onOpen, onClose, height = 48 }) {
  const [shown, setShown] = useState(active);
  const now = useSecondClock(shown);
  useEffect(() => {
    const root = document.documentElement;
    if (active) { setShown(true); root.style.setProperty('--ces-alert-h', `${height}px`); root.classList.add('ds-alert-on'); return undefined; }
    root.classList.remove('ds-alert-on'); root.style.removeProperty('--ces-alert-h');
    const t = setTimeout(() => setShown(false), 380);
    return () => clearTimeout(t);
  }, [active, height]);
  useEffect(() => () => { document.documentElement.classList.remove('ds-alert-on'); document.documentElement.style.removeProperty('--ces-alert-h'); }, []);
  if (!shown) return null;
  const d = DEFCON[level] || DEFCON[3];
  return createPortal(
    <div className={cx('ds dcc', `dcc--${level}`, !active && 'is-leaving')} role={d.role} aria-live={d.role === 'alert' ? 'assertive' : 'polite'} style={{ '--dc': d.color, height }}>
      <span className="dcc__hazard" aria-hidden="true"><i /></span>
      <span className="dcc__lvl"><small>DEFCON</small><b>{level}</b></span>
      <DefconGauge level={level} className="dcc__gauge" />
      <span className="dcc__state"><small>État d’alerte · {DEFCON_CODE[level]}</small><strong>{d.label}</strong></span>
      <span className="dcc__msg">{message ? <><Icon name="megaphone" size={14} /><span>{message}</span></> : <span className="dcc__none">Aucune consigne particulière</span>}</span>
      <span className="dcc__clock"><b>{hms(now)}</b><small>Heure locale</small></span>
      {onOpen && <button type="button" className="dcc__btn" onClick={onOpen}>Bulletin</button>}
      {onClose && <button type="button" className="dcc__close" aria-label="Masquer le bandeau" onClick={onClose}><Icon name="close" size={16} /></button>}
    </div>, document.body);
}

/** Fenêtre de déclenchement (DEFCON 3 à 1) au centre de l'écran : bande de danger animée, consigne, accusé de
 *  réception obligatoire (Échap neutralisé), armé après 2 s en DEFCON 2 et 3 s en DEFCON 1 pour que la consigne soit lue. */
export function DefconAlertDialog({ open, level = 3, message, issuedBy, issuedAt, onAck, ackLabel = 'Accusé de réception', hint = 'La consigne reste consultable sur le hub (Bulletin d’alerte).' }) {
  const ref = useRef(null);
  const delay = level === 1 ? 3 : level === 2 ? 2 : 0;
  const [left, setLeft] = useState(delay);
  useEffect(() => {
    const dlg = ref.current; if (!dlg) return;
    if (open && !dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); } }
    if (!open && dlg.open) dlg.close();
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    setLeft(delay);
    if (!delay) return undefined;
    const t = setInterval(() => setLeft(v => { if (v <= 1) { clearInterval(t); return 0; } return v - 1; }), 1000);
    return () => clearInterval(t);
  }, [open, delay, level]);
  const d = DEFCON[level] || DEFCON[3];
  const at = issuedAt ? new Date(issuedAt) : new Date();
  return createPortal(
    <dialog ref={ref} className={`ds dca dca--${level}`} style={{ '--dc': d.color }} aria-labelledby="dca-t" aria-describedby="dca-m" onCancel={e => e.preventDefault()}>
      <div className="dca__frame">
        <header className="dca__top"><span>CES · Commandement</span><span>Diffusion : tous les membres</span><span>Réf. {defconRef(at, level)}</span></header>
        <div className="dca__band" aria-hidden="true"><span className="dca__stripes" /><span className="dca__tag"><Icon name={d.icon} size={16} />Alerte en cours</span></div>
        <div className="dca__eyebrow">Changement d’état d’alerte</div>
        <h2 id="dca-t" className="dca__level">DEFCON <b>{level}</b></h2>
        <div className="dca__label">{d.label} <span>· {DEFCON_CODE[level]}</span></div>
        <DefconGauge level={level} className="dca__gauge" />
        {message
          ? <blockquote id="dca-m" className="dca__order"><small>Ordre du commandement</small><p>{message}</p></blockquote>
          : <p id="dca-m" className="dca__order dca__order--none">Aucune consigne particulière : restez joignables et suivez les annonces.</p>}
        <dl className="dca__meta">
          <div><dt>Émis par</dt><dd>{issuedBy || 'Commandement'}</dd></div>
          <div><dt>Heure</dt><dd>{at.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {hms(at)}</dd></div>
        </dl>
        <footer className="dca__foot">
          <span className="dca__hint">{hint}</span>
          <Button label={left ? `Lecture… ${left}` : ackLabel} icon={left ? undefined : 'check'} disabled={left > 0} onClick={onAck} />
        </footer>
      </div>
    </dialog>, document.body);
}

/** Pastille « DEFCON n · état » (en-tête du Bulletin d'alerte, ou d'une carte qui l'héberge). */
export function DefconChip({ level = 5, active }) {
  const d = DEFCON[level] || DEFCON[5];
  return <span className="ds dch__chip" style={{ '--dc': d.color }}><b>DEFCON {level}</b>{active === false ? 'Alerte levée' : d.label}</span>;
}

/** Carte « Bulletin d'alerte » : état courant, consigne, bulletins précédents ({ level, message, setBy, setAt }).
 *  `plain` (V1.2, hub) : sans cadre ni en-tête, aux couleurs du thème — la carte hôte fournit titre et pastille
 *  (DefconChip) ; seuls les repères de niveau gardent la couleur DEFCON. Sinon : console sombre fixe. */
export function DefconHubCard({ level = 5, active, message, issuedBy, issuedAt, history = [], onReopen, plain, historyLimit = 0 }) {
  const d = DEFCON[level] || DEFCON[5];
  // `historyLimit` > 0 : seuls les N plus récents, « Voir N autres bulletins » déroule le reste (comme les Annonces).
  const [allHist, setAllHist] = useState(false);
  const cut = historyLimit > 0 && history.length > historyLimit && !allHist;
  const hist = cut ? history.slice(0, historyLimit) : history;
  const more = history.length - historyLimit;
  const at = issuedAt ? new Date(issuedAt) : null;
  const short = x => `${x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${hms(x).slice(0, 5)}`;
  return (
    <section className={cx('ds dch', `dch--${level}`, plain && 'dch--plain', active === false && 'is-off')} style={{ '--dc': d.color }} aria-labelledby={plain ? undefined : 'dch-t'} aria-label={plain ? 'Bulletin d’alerte' : undefined}>
      {!plain && (
        <header className="dch__head">
          <h3 id="dch-t"><Icon name="shield" size={16} />Bulletin d’alerte</h3>
          <DefconChip level={level} active={active} />
        </header>
      )}
      <div className="dch__body">
        <div className="dch__now">
          <DefconGauge level={level} className="dch__gauge" />
          {message ? <p className="dch__msg">{message}</p> : <p className="dch__msg dch__msg--none">{active === false ? 'Aucune alerte en cours.' : 'Aucune consigne particulière.'}</p>}
          {at && <p className="dch__meta">{issuedBy || 'Commandement'} · {at.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {hms(at).slice(0, 5)} · réf. {defconRef(at, level)}</p>}
          {onReopen && active !== false && level <= 3 && <Button variant="text" size="sm" icon="megaphone" label="Revoir l’alerte" onClick={onReopen} />}
        </div>
        {history.length > 0 && (
          <div className="dch__past">
            <div className="dch__sub">Bulletins précédents</div>
            <ol className="dch__hist">
              {hist.map((h, i) => (
                <li key={`${h.setAt}-${i}`} style={{ '--c': (DEFCON[h.level] || DEFCON[5]).color }}>
                  <span className="dch__hl">{h.level}</span>
                  <span className="dch__ht"><strong>{h.message || (DEFCON[h.level] || DEFCON[5]).label}</strong><small>{h.setBy || 'Commandement'} · {short(new Date(h.setAt))}{h.endedAt ? ` → ${h.lifted ? 'levée' : 'remplacée'} ${short(new Date(h.endedAt))}` : ''}</small></span>
                </li>
              ))}
            </ol>
            {historyLimit > 0 && history.length > historyLimit && (
              <button type="button" className="dch__more" aria-expanded={allHist} onClick={() => setAllHist(v => !v)}>
                {allHist ? 'Réduire' : `Voir ${more} autre${more > 1 ? 's' : ''} bulletin${more > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// --- DS-CES-19 · Panneau des membres d'une messagerie (Aurore Design V1.4, 2026-11-14) ----------------------------------
// Colonne de droite façon Discord : groupes (« En ligne — 3 », « Hors ligne — 8 »), avatar avec pastille de présence,
// pseudo, sous-titre facultatif (grade, rôle). Hors ligne estompé. `onOpen(person)` facultatif (profil, message privé).
// groups: [{ label, people: [{ id, name, image, status: 'online'|'idle'|'dnd'|'offline', sub }] }]
export function ChatMembers({ groups, onOpen, onContext, title = 'Membres' }) {
  return (
    <aside className="ds-chatmem" aria-label={title}>
      {groups.filter(g => g.people.length).map(g => (
        <section key={g.label} className="ds-chatmem__group">
          <h4 className="ds-chatmem__label">{g.label} — {g.people.length}</h4>
          <ul>
            {g.people.map(p => {
              const Tag = onOpen ? 'button' : 'div';
              return (
                <li key={p.id}>
                  <Tag {...(onOpen ? { type: 'button', onClick: e => onOpen(p, e) } : {})} onContextMenu={onContext ? e => { e.preventDefault(); onContext(p, e); } : undefined} className={cx('ds-chatmem__item', p.status === 'offline' && 'is-off')}>
                    <Avatar image={p.image} name={p.name} size="sm" shape="circle" status={p.status} />
                    <span className="ds-chatmem__txt"><strong>{p.name}</strong>{p.sub && <small>{p.sub}</small>}</span>
                  </Tag>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}

// --- Graphiques SVG (sans dependance) ----------------------------------------
// Petites valeurs : un multiple de 4, pour que les graduations au quart restent des entiers distincts
// (avec un maximum de 2, l'axe affichait « 2, 2, 1, 1, 0 »).
const niceMax = v => { if (v < 20) return Math.max(4, Math.ceil(v / 4) * 4); const p = 10 ** Math.floor(Math.log10(v || 1)); return Math.ceil(v / p) * p; };

// 🔴 Les graphiques sont dessinés à la LARGEUR RÉELLE de leur conteneur (mesurée en direct), plus étirés depuis un
// dessin fixe de 640 px : sur un écran très large, l'ancien SVG proportionnel montait à 700 px de haut avec un texte
// énorme ; dans une carte étroite il rapetissait jusqu'à l'illisible (retour du commandement, 14/11). Hauteur = `height`.
function useChartWidth(fallback = 640) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => { const v = Math.round(e.contentRect.width); if (v > 0) setW(Math.max(240, v)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
const BAR_MAX = 48; // largeur maximale d'une barre (par série), centrée dans sa bande

/** Courbes ou aires. series: [{ name, color, data: number[] }], labels: string[] */
export function LineChart({ series, labels, area, height = 240 }) {
  const [hover, setHover] = useState(null);
  const [box, W] = useChartWidth(); const H = height; const pad = { l: 36, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(...series.flatMap(s => s.data)));
  const x = i => pad.l + (i * (W - pad.l - pad.r)) / (labels.length - 1);
  const y = v => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const path = d => d.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="ds-chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={series.map(s => s.name).join(', ')} onMouseLeave={() => setHover(null)}>
        <defs>{series.map((s, k) => (
          <linearGradient key={k} id={`ds-area-${k}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: s.color, stopOpacity: .35 }} /><stop offset="1" style={{ stopColor: s.color, stopOpacity: 0 }} /></linearGradient>))}</defs>
        {[0, .25, .5, .75, 1].map(f => (
          <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="ds-chart__grid" />
            <text x={pad.l - 8} y={y(max * f) + 4} textAnchor="end" className="ds-chart__axis">{Math.round(max * f)}</text></g>))}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="ds-chart__axis">{l}</text>)}
        {series.map((s, k) => (
          <g key={s.name}>
            {area && <path d={`${path(s.data)} L${x(s.data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ds-area-${k})`} />}
            <path d={path(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && <circle cx={x(hover)} cy={y(s.data[hover])} r="5" fill={s.color} stroke="var(--ds-surface-card)" strokeWidth="2" />}
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="ds-chart__cursor" />}
        {labels.map((l, i) => <rect key={l} x={x(i) - (W / labels.length) / 2} y={0} width={W / labels.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {hover !== null && (
        <div className="ds-chart__tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{labels[hover]}</strong>{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name} : {s.data[hover]}</span>)}
        </div>
      )}
      <figcaption className="ds-legend">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  );
}

/** Barres groupees ou empilees. */
export function BarChart({ series, labels, stacked, height = 240 }) {
  const [hover, setHover] = useState(null);
  const [box, W] = useChartWidth(); const H = height; const pad = { l: 36, r: 12, t: 12, b: 28 };
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.data[i], 0));
  const max = niceMax(stacked ? Math.max(...totals) : Math.max(...series.flatMap(s => s.data)));
  const band = (W - pad.l - pad.r) / labels.length;
  const y = v => H - pad.b - (v / max) * (H - pad.t - pad.b);
  return (
    <figure className="ds-chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Graphique en barres" onMouseLeave={() => setHover(null)}>
        {[0, .25, .5, .75, 1].map(f => (
          <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="ds-chart__grid" />
            <text x={pad.l - 8} y={y(max * f) + 4} textAnchor="end" className="ds-chart__axis">{Math.round(max * f)}</text></g>))}
        {labels.map((l, i) => {
          const x0 = pad.l + i * band; let acc = 0;
          const bw = stacked ? Math.min(band * 0.5, BAR_MAX) : Math.min((band * 0.7) / series.length, BAR_MAX);
          const groupW = stacked ? bw : bw * series.length;
          const gx = x0 + (band - groupW) / 2; // groupe de barres centré dans sa bande
          return (
            <g key={l} onMouseEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.55}>
              <rect x={x0} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" />
              {series.map((s, k) => {
                const v = s.data[i];
                const bx = stacked ? gx : gx + k * bw;
                const by = stacked ? y(acc + v) : y(v);
                const bh = stacked ? y(acc) - y(acc + v) : y(0) - y(v);
                acc += v;
                return <rect key={s.name} x={bx} y={by} width={bw - (stacked ? 0 : 3)} height={Math.max(bh, 0)} rx={stacked ? 0 : 4} fill={s.color} />;
              })}
              <text x={x0 + band / 2} y={H - 8} textAnchor="middle" className="ds-chart__axis">{l}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="ds-chart__tip" style={{ left: `${((pad.l + (hover + 0.5) * band) / W) * 100}%` }}>
          <strong>{labels[hover]}</strong>{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name} : {s.data[hover]}</span>)}
        </div>
      )}
      <figcaption className="ds-legend">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  );
}

/** Anneau. data: [{ label, value, color }] */
export function DonutChart({ data, size = 200, thickness = 26, center }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2; const C = 2 * Math.PI * r; let off = 0;
  const cur = hover !== null ? data[hover] : null;
  return (
    <figure className="ds-chart ds-chart--donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map(d => `${d.label} ${d.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ds-surface-sunken)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * C; const el = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={hover === i ? thickness + 6 : thickness}
              strokeDasharray={`${Math.max(len - 3, 0)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transition: 'stroke-width .15s' }} />);
          off += len; return el;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="ds-chart__big">{cur ? cur.value : (center?.value ?? total)}</text>
        <text x="50%" y="62%" textAnchor="middle" className="ds-chart__axis">{cur ? cur.label : (center?.label ?? 'Total')}</text>
      </svg>
      <figcaption className="ds-legend ds-legend--col">{data.map(d => <span key={d.label}><i style={{ background: d.color }} />{d.label} <strong>{Math.round((d.value / total) * 100)} %</strong></span>)}</figcaption>
    </figure>
  );
}

// 🔴 Couleurs SVG en STYLE (style={{ stopColor }}), jamais en attribut (stopColor="var(--…)") : une variable
// CSS dans un attribut de présentation de dégradé faisait PLANTER l'onglet sous WebKit mobile (iPhone),
// mesuré le 2026-11-12 sur le hub (3 plantages sur 3, aucun après correction).
export function Sparkline({ data, color = 'var(--ds-primary)', width = 120, height = 36, area }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / (max - min || 1)) * (height - 6)}`).join(' ');
  const gid = useId().replace(/:/g, '');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ overflow: 'visible' }}>
      {area && <><defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: color, stopOpacity: .35 }} /><stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} /></linearGradient></defs>
        <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${gid})`} /></>}
      <polyline points={pts} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
/** Tuile chiffrée avec graphique : chart = line | bars | ring ; delta signé (hausse verte, baisse rouge). */
export function ChartTile({ label, value, unit, delta, chart = 'line', data = [], tone = 'var(--ds-primary)', ring }) {
  const up = typeof delta === 'number' ? delta >= 0 : null;
  const max = Math.max(...data, 1);
  return (
    <div className="ds-ctile">
      <div className="ds-ctile__head"><span className="ds-ctile__label">{label}</span>
        {up !== null && <span className={cx('ds-ctile__delta', up ? 'is-up' : 'is-down')}><Icon name={up ? 'up' : 'down'} size={13} />{up ? '+' : ''}{delta} %</span>}</div>
      <div className="ds-ctile__body">
        <div className="ds-ctile__value">{value}{unit && <small>{unit}</small>}</div>
        {chart === 'line' && <Sparkline data={data} color={tone} width={110} height={42} area />}
        {chart === 'bars' && <div className="ds-ctile__bars" aria-hidden="true">{data.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%`, background: i === data.length - 1 ? tone : undefined, '--i': i }} />)}</div>}
        {chart === 'ring' && <ProgressRing value={ring} label={label} size={52} stroke={6} tone="primary" />}
      </div>
    </div>
  );
}

// --- Tableau de taches (Kanban, @dnd-kit : souris, doigt et clavier) ---------
const PRIO = { low: ['Basse', 'secondary'], medium: ['Moyenne', 'info'], high: ['Haute', 'warn'], urgent: ['Urgente', 'danger'] };
function TaskCard({ task, overlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !overlay ? 0.35 : 1 };
  return (
    <div ref={overlay ? undefined : setNodeRef} style={overlay ? undefined : style} className={cx('ds-task', overlay && 'ds-task--overlay')} {...(overlay ? {} : attributes)} {...(overlay ? {} : listeners)}>
      <div className="ds-task__top"><Tag value={PRIO[task.priority][0]} severity={PRIO[task.priority][1]} /><Icon name="drag" size={16} className="ds-task__grip" /></div>
      <div className="ds-task__title">{task.title}</div>
      <div className="ds-task__foot">
        <span className="ds-avatargroup">{task.assignees.map(a => <Avatar key={a} label={a} size="sm" shape="circle" />)}</span>
        {task.due && <span className="ds-task__due"><Icon name="time" size={13} />{task.due}</span>}
      </div>
    </div>
  );
}
function KanbanColumn({ col, tasks }) {
  // ⚠️ Zone de colonne active seulement quand la colonne est VIDE : sinon, au clavier,
  // la premiere fleche visait la colonne d'origine elle-meme (deux appuis pour changer).
  const { setNodeRef, isOver } = useDroppable({ id: col.id, disabled: tasks.length > 0 });
  return (
    <section className={cx('ds-kcol', isOver && 'ds-kcol--over')} aria-label={col.title}>
      <header className="ds-kcol__head"><i style={{ background: col.color }} />{col.title}<span className="ds-badge">{tasks.length}</span></header>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="ds-kcol__list">{tasks.map(t => <TaskCard key={t.id} task={t} />)}
          {!tasks.length && <div className="ds-kcol__empty">Déposez une tâche ici</div>}</div>
      </SortableContext>
    </section>
  );
}
export function KanbanBoard({ columns, initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState(null);
  const board = useRef(null);
  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  // 🔴 Clavier multi-colonnes. sortableKeyboardCoordinates ne connait qu'UNE liste :
  // ←/→ ne quittait jamais la colonne. On vise ici le haut de la colonne voisine ;
  // ↑/↓ restent le deplacement dans la colonne.
  const coordinateGetter = useCallback((event, args) => {
    if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return sortableKeyboardCoordinates(event, args);
    event.preventDefault();
    const col = tasksRef.current.find(t => t.id === args.active)?.col;
    const i = columns.findIndex(c => c.id === col) + (event.code === 'ArrowRight' ? 1 : -1);
    const target = board.current?.querySelectorAll('.ds-kcol__list')[i];
    if (!target) return args.currentCoordinates;
    const r = target.getBoundingClientRect();
    return { x: r.left + 4, y: r.top + 4 };
  }, [columns]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );
  const colOf = id => (columns.some(c => c.id === id) ? id : tasks.find(t => t.id === id)?.col);
  const onDragOver = ({ active, over }) => {
    if (!over) return;
    const to = colOf(over.id); const from = colOf(active.id);
    if (to && from !== to) setTasks(ts => ts.map(t => (t.id === active.id ? { ...t, col: to } : t)));
  };
  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setTasks(ts => { const a = ts.findIndex(t => t.id === active.id); const b = ts.findIndex(t => t.id === over.id); return b < 0 ? ts : arrayMove(ts, a, b); });
  };
  const active = tasks.find(t => t.id === activeId);
  const nom = id => tasks.find(t => t.id === id)?.title || id;
  const colNom = id => columns.find(c => c.id === colOf(id))?.title || '';
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={e => setActiveId(e.active.id)} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: { draggable: 'Espace pour saisir la tâche, flèches pour la déplacer, Espace pour la déposer, Échap pour annuler.' },
        announcements: {
          onDragStart: ({ active: a }) => `Tâche « ${nom(a.id)} » saisie.`,
          onDragOver: ({ active: a, over }) => (over ? `« ${nom(a.id)} » au-dessus de la colonne ${colNom(over.id)}.` : undefined),
          onDragEnd: ({ active: a, over }) => (over ? `« ${nom(a.id)} » déposée dans ${colNom(over.id)}.` : `« ${nom(a.id)} » relâchée.`),
          onDragCancel: ({ active: a }) => `Déplacement de « ${nom(a.id)} » annulé.`,
        },
      }}>
      <div className="ds-kanban" ref={board}>{columns.map(c => <KanbanColumn key={c.id} col={c} tasks={tasks.filter(t => t.col === c.id)} />)}</div>
      <DragOverlay>{active ? <TaskCard task={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

// =============================================================================
// Adoptes le 2026-11-11 : progression (DS-PRG-01) et en-tetes de module (DS-CES-01)
// =============================================================================
// --- DS-PRG-01 : progression -------------------------------------------------
/** Anneau de pourcentage. tone = primary | success | warn | danger ; aurora = dégradé. */
export function ProgressRing({ value, label, size = 84, stroke = 8, tone = 'primary', aurora }) {
  const r = (size - stroke) / 2; const C = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value));
  const gid = `dsn-ring-${label}-${size}`.replace(/\W/g, '');
  return (
    <div className="dsn-ring" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {aurora && <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--ces-aurora-violet)' }} /><stop offset=".5" style={{ stopColor: 'var(--ces-aurora-blue)' }} /><stop offset="1" style={{ stopColor: 'var(--ces-aurora-cyan)' }} /></linearGradient></defs>}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ds-surface-sunken)" strokeWidth={stroke} />
        <circle className="dsn-ring__val" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={aurora ? `url(#${gid})` : `var(--ds-${tone})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="dsn-ring__txt"><strong>{v}<small>%</small></strong>{size >= 76 && <em>{label}</em>}</span>
    </div>
  );
}
/** Barre libellée (shadcn) : libellé à gauche, valeur à droite ; variantes aurore et rayée animée. */
export function LabeledProgress({ label, value, max = 100, suffix, aurora, striped }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="dsn-lprog">
      <div className="dsn-lprog__head"><span>{label}</span><strong>{suffix === '%' ? `${pct} %` : `${value} / ${max}`}</strong></div>
      <div className={cx('dsn-lprog__track', aurora && 'is-aurora', striped && 'is-striped')} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="dsn-lprog__bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
/** Progression par étapes : segments + libellés, l'étape courante pulse doucement. */
export function StepsProgress({ steps, current }) {
  return (
    <div className="dsn-sprog" role="progressbar" aria-label="Avancement" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-valuetext={`Étape ${current + 1} sur ${steps.length} : ${steps[current]}`}>
      <div className="dsn-sprog__bars">{steps.map((s, i) => <span key={s} data-state={i < current ? 'done' : i === current ? 'now' : 'todo'} />)}</div>
      <div className="dsn-sprog__labels">{steps.map((s, i) => <span key={s} data-state={i < current ? 'done' : i === current ? 'now' : 'todo'}>{i < current && <Icon name="check" size={12} />}{s}</span>)}</div>
    </div>
  );
}
/** Chargeur « orbite » : une lune tourne autour de l'étoile CES. */
export function OrbitLoader({ label = 'Chargement' }) {
  return <span className="dsn-orbit" role="status" aria-label={label}><i className="dsn-orbit__star" /><i className="dsn-orbit__ring"><b /></i></span>;
}
export function DotsLoader({ label = 'Chargement' }) {
  return <span className="dsn-dots" role="status" aria-label={label}><i /><i /><i /></span>;
}
// Adoptes le 2026-11-11 — prevus pour le chargement de la messagerie (futur).
/** Saut quantique : des traits filent vers le centre, l'etoile CES grossit. */
export function WarpLoader({ label = 'Saut quantique' }) {
  return <span className="dsn-warp" role="status" aria-label={label}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--a': `${i * 30}deg`, '--d': `${(i % 4) * 0.18}s` }} />)}<b /></span>;
}
/** Transmission : barres de signal qui s'allument en vague. */
export function SignalLoader({ label = 'Connexion' }) {
  return <span className="dsn-signal" role="status" aria-label={label}>{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ '--i': i }} />)}</span>;
}

// --- DS-CES-01 : en-tête de module --------------------------------------------
/** En-tête « héros » : fil d'Ariane, surtitre, titre, description, actions, indicateurs avec tendance, onglets. */
export function ModuleHero({ crumbs = [], eyebrow, title, desc, actions, stats = [], tabs = [], tab: tabProp, onTab, icon }) {
  // Onglets contrôlés (tab + onTab, ex. synchronisés avec l'URL) ou libres (état interne).
  // Fil d'Ariane : chaînes, ou { label, onClick }. Onglets : chaînes, ou { label, icon, count }. Indicateurs : { label, value, trend, tone, icon }.
  const [own, setOwn] = useState(0);
  const tab = tabProp ?? own; const setTab = i => (onTab ? onTab(i) : setOwn(i));
  return (
    <header className="dsn-hero">
      {!!crumbs.length && (
        <div className="dsn-hero__top">
          <nav aria-label="Fil d'Ariane" className="dsn-hero__crumbs">{crumbs.map((c, i) => {
            const it = typeof c === 'string' ? { label: c } : c;
            return <span key={it.label}>{i > 0 && <Icon name="right" size={13} />}{it.onClick ? <button type="button" className="dsn-hero__crumb" onClick={it.onClick}>{it.label}</button> : it.label}</span>;
          })}</nav>
        </div>
      )}
      <div className="dsn-hero__main">
        <div className="dsn-hero__id">
          {icon && <span className="dsn-hero__icon"><Icon name={icon} size={22} /></span>}
          <div>
            {eyebrow && <div className="ds-eyebrow">{eyebrow}</div>}
            <h2 className="dsn-hero__title">{title}</h2>
            {desc && <p className="dsn-hero__desc">{desc}</p>}
          </div>
        </div>
        <div className="dsn-hero__actions">{actions}</div>
      </div>
      {!!stats.length && (
        <div className="dsn-hero__stats">{stats.map(st => (
          <div key={st.label} className="dsn-hero__stat">
            {st.icon && <span className="dsn-hero__sicon" style={st.tone ? { color: st.tone } : undefined}><Icon name={st.icon} size={18} /></span>}
            <div><div className="dsn-hero__value">{st.value}</div><div className="dsn-hero__label">{st.label}</div></div>
            {st.trend && <Sparkline data={st.trend} color={st.tone} width={84} height={30} />}
          </div>))}
        </div>
      )}
      {!!tabs.length && (
        <div className="dsn-hero__tabs" role="tablist">{tabs.map((t, i) => {
          const it = typeof t === 'string' ? { label: t } : t;
          return (
            <button key={it.label} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>
              {it.icon && <Icon name={it.icon} size={16} />}{it.label}{it.count != null && <span className="dsn-hero__count">{it.count}</span>}
            </button>
          );
        })}</div>
      )}
    </header>
  );
}
/** Barre compacte : tuile iconée, titre + compteur, recherche, équipage en ligne, actions. */
export function ModuleBar({ icon, title, count, search, online = [], actions }) {
  return (
    <header className="dsn-mbar">
      <span className="dsn-mbar__icon"><Icon name={icon} size={20} /></span>
      <div className="dsn-mbar__title"><strong>{title}</strong>{count != null && <span className="ds-badge">{count}</span>}</div>
      {search && <div className="dsn-mbar__search"><InputText icon="search" size="sm" placeholder={search} aria-label={search} /></div>}
      {!!online.length && <div className="dsn-mbar__online" title={`${online.length} en ligne`}><AvatarGroup max={3}>{online.map(n => <Avatar key={n} name={n} size="sm" shape="circle" status="online" />)}</AvatarGroup></div>}
      <div className="dsn-mbar__actions">{actions}</div>
    </header>
  );
}

// --- DS-CES-11 : barre laterale du portail (ADOPTEE le 2026-11-11) -----------
const SB_NAV = [
  { key: 'hub', label: 'Hub', icon: 'home' },
  // Memes icones que SharedSidebar (sauf Hub, a la demande du commandement).
  { key: 'garage', label: 'Garage', icon: 'rocket' },
  { key: 'missions', label: 'Missions', icon: 'flag', badge: 3, subs: ['En cours', 'Archives', 'Récurrentes'] },
  { key: 'planning', label: 'Planning', icon: 'calendar2' },
  { key: 'academie', label: 'Académie', icon: 'book', badge: 'Nouveau' },
  { key: 'annuaire', label: 'Annuaire', icon: 'users' },
];
const SB_FAV = [['Opération Aube', '#7c3aed'], ['Recrutement', '#0891b2'], ['Logistique', '#d97706']];

/** Barre laterale (proposition) : panneau flottant, mode reduit, recherche, compteurs, sous-onglets, favoris, admin, carte membre. */
export function PortalSidebar({ gameVersion = 'Alpha 4.1' }) {
  const [mini, setMini] = useState(false);
  const [active, setActive] = useState('missions');
  const [sub, setSub] = useState(0);
  const [dm, setDm] = useState(true);
  const item = (it) => {
    const on = active === it.key;
    const btn = (
      <button type="button" className={cx('dsn-sb__item', on && 'is-active')} aria-current={on ? 'page' : undefined} onClick={() => { setActive(it.key); setSub(0); }}>
        <Icon name={it.icon} size={19} /><span className="dsn-sb__label">{it.label}</span>
        {it.badge != null && <span className={cx('dsn-sb__badge', typeof it.badge === 'string' && 'is-text')}>{it.badge}</span>}
      </button>
    );
    return (
      <li key={it.key}>
        {mini ? <Tooltip text={it.label}>{btn}</Tooltip> : btn}
        {on && it.subs && !mini && (
          <ul className="dsn-sb__subs">{it.subs.map((s, i) => (
            <li key={s}><button type="button" className={cx('dsn-sb__sub', sub === i && 'is-active')} onClick={() => setSub(i)}>{s}</button></li>))}</ul>
        )}
      </li>
    );
  };
  return (
    <aside className={cx('dsn-sb', mini && 'is-mini')} aria-label="Navigation du portail">
      <div className="dsn-sb__head">
        <img src={cesLogo} alt="" className="dsn-sb__logo" />
        <div className="dsn-sb__brand"><strong className="ds-display">CES</strong><span>Portail des membres</span></div>
        <button type="button" className="dsn-sb__collapse" aria-label={mini ? 'Déplier la barre' : 'Réduire la barre'} aria-expanded={!mini} onClick={() => setMini(m => !m)}><Icon name={mini ? 'right' : 'left'} size={16} /></button>
      </div>
      <button type="button" className="dsn-sb__search"><Icon name="search" size={16} /><span className="dsn-sb__label">Rechercher…</span><span className="dsn-sb__kbd"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span></button>
      <nav className="dsn-sb__scroll">
        <div className="dsn-sb__section">Navigation</div>
        <ul className="dsn-sb__list">{SB_NAV.map(item)}</ul>
        <div className="dsn-sb__section">Mes tableaux</div>
        <ul className="dsn-sb__list">{SB_FAV.map(([n, c]) => (
          <li key={n}>{(() => { const b = <button type="button" className="dsn-sb__item dsn-sb__item--fav"><i className="dsn-sb__dot" style={{ background: c }} /><span className="dsn-sb__label">{n}</span></button>; return mini ? <Tooltip text={n}>{b}</Tooltip> : b; })()}</li>))}
        </ul>
        <div className="dsn-sb__section">Administration</div>
        <ul className="dsn-sb__list">
          {item({ key: 'admin', label: 'Gestion', icon: 'shield' })}
          <li><button type="button" className={cx('dsn-sb__item', active === 'bot' && 'is-active')} onClick={() => setActive('bot')}><Icon name="robot" size={19} /><span className="dsn-sb__label">Bot Discord</span><i className="dsn-sb__live" title="Bot connecté" /></button></li>
        </ul>
      </nav>
      <div className="dsn-sb__foot">
        {/* Version du jeu bien visible (demande du commandement) : badge a liseré aurore, point « en direct ». */}
        <div className="dsn-sb__version" title={`Star Citizen ${gameVersion}`}>
          <span className="dsn-sb__vdot" aria-hidden="true" />
          <span className="dsn-sb__vtxt"><small>Star Citizen</small><strong>{gameVersion}</strong></span>
          <span className="dsn-sb__vmini" aria-hidden="true">{gameVersion.replace(/[^\d.]/g, '')}</span>
        </div>
        <div className="dsn-sb__user">
          <Avatar name="Kalgiio" status="online" shape="circle" />
          <div className="dsn-sb__who"><strong>Kalgiio</strong><span>Officier · CES-0042</span></div>
          <DropdownMenu iconOnly icon="moreV" variant="text" label="Menu du compte" items={[
            { heading: 'Mon compte' }, { label: 'Mon profil', icon: 'user' }, { label: 'Préférences', icon: 'settings' },
            { label: dm ? 'Couper les rappels MP' : 'Activer les rappels MP', icon: 'bell', onSelect: () => setDm(v => !v) },
            { separator: true }, { label: 'Se déconnecter', icon: 'close', danger: true }]} />
        </div>
      </div>
    </aside>
  );
}

// --- DS-CES-12 : pied de page du portail (adopte le 2026-11-11) ------------------------
/** Pied de page (adopte le 2026-11-11) : marque, colonnes, etat des services, theme et aurore, mentions.
 *  Sans props : demonstration (liens inertes). Le portail (SharedFooter) passe les vrais liens :
 *  `columns` = [[titre, [{ label, to | href, external, onClick }]]], `LinkComponent` = Link de react-router. */
const DEMO_COLS = [
  ['Portail', ['Hub', 'Missions', 'Académie', 'Annuaire', 'Planning']],
  ['Organisation', ['Site officiel', 'Fiche RSI', 'Discord', 'Recrutement']],
  ['Légal', ['Mentions légales', 'CGU', 'Confidentialité', 'Bot : conditions']],
];
const inert = e => e.preventDefault();
// Logo RSI (Roberts Space Industries), SVG fourni au CES le 21/11/2026 — « Organisation SVG RSI ». currentColor.
const RSI_PATHS = `<g><g><path fill="currentColor" d="M66.44,109.91c-1.26,0-2.41-.94-2.71-2.08l-3.14-13.25,14.3-7.09c3.44-1.66,6.37-5.1,7.42-9.29l4.91-18.79c1.24-4.7-1.78-8.57-6.67-8.57H27.61L8,127.84h18.58l4.8-18.68,12.52-6.27,4.49,18.58c.84,3.44,4.38,6.37,8.03,6.37h14.81l4.59-17.95h-9.39v.02ZM37.11,86.74l.14-.56,4.45-17.48h21.51c1.66,0,2.81.63,2.41,1.99-.3,1.05-1.05,2.29-3.14,3.35l-25.37,12.71Z"></path><path fill="currentColor" d="M139.34,94.68l-29.84-19.73c-1.66-1.05-2.29-2.29-1.87-3.96s1.66-2.29,3.35-2.29l27.92.07h.02l.02-.07,4.59-17.83v-.05h-.02l-43.09.05c-3.65,0-7.3,2.93-8.14,6.37l-4.28,16.9c-.84,3.44.84,8.03,3.86,10.02l30.05,20.03c1.66,1.15,1.99,2.2,1.57,3.56-.3,1.05-1.57,2.2-3.23,2.2h-22.66l-4.59,17.95h37.56c3.74,0,7.51-2.93,8.36-6.37l4.28-16.8c.82-3.46-.84-8.05-3.86-10.04Z"></path><polygon fill="currentColor" points="165.42 50.82 165.42 50.84 165.35 50.84 145.5 127.86 164.27 127.86 184 50.84 165.42 50.82"></polygon></g><polygon fill="currentColor" points="88.04 109.91 85.05 109.91 84.98 109.91 80.37 127.86 80.39 127.86 83.43 127.86 83.46 127.86 88.09 109.91 88.04 109.91"></polygon><polygon fill="currentColor" points="81.82 109.91 78.82 109.91 78.8 109.94 74.12 127.86 74.16 127.86 77.21 127.86 77.32 127.86 81.96 109.91 81.82 109.91"></polygon><polygon fill="currentColor" points="91.3 109.91 91.09 109.91 86.5 127.86 86.66 127.86 89.73 127.86 94.31 109.91 91.3 109.91"></polygon><polygon fill="currentColor" points="157.55 68.7 162.12 50.84 159.1 50.84 154.51 68.7 157.55 68.7"></polygon><polygon fill="currentColor" points="151.42 68.7 155.99 50.84 152.99 50.84 148.38 68.7 151.42 68.7"></polygon><polygon fill="currentColor" points="149.83 50.84 149.76 50.84 149.76 50.82 146.74 50.82 146.55 50.82 146.53 50.84 141.97 68.7 141.94 68.77 142.11 68.77 145.15 68.77 145.17 68.77 145.2 68.7 149.83 50.84"></polygon></g>`;
export function RsiLogo({ className = 'ds-rsi', title }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="6 48 180 82" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false" dangerouslySetInnerHTML={{ __html: RSI_PATHS }} />;
}

function FooterLinkItem({ item, LinkComponent }) {
  const l = typeof item === 'string' ? { label: item } : item;
  if (l.to && LinkComponent) return <LinkComponent to={l.to}>{l.label}</LinkComponent>;
  if (l.onClick) return <button type="button" onClick={l.onClick}>{l.label}</button>;
  if (l.href) return <a href={l.href} aria-label={l.ariaLabel} {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{l.icon && <Icon name={l.icon} size={14} />}{l.label}{l.rsi && <RsiLogo />}</a>;
  return <a href="#ds-footer" onClick={inert}>{l.label}</a>;
}
export function PortalFooter({
  version = '1.0', columns = DEMO_COLS, LinkComponent,
  description = 'Corps Expéditionnaire Spatial — organisation francophone Star Citizen. Explorer ensemble, sans contraintes.',
  discordHref, statusHref, statusLabel = 'Tous les services sont opérationnels', statusMeta = 'Portail · Bot · Site officiel',
  copyright = '© 2026 CES', onSeal,
}) {
  const { mode, setMode } = useColorScheme();
  const ext = { target: '_blank', rel: 'noopener noreferrer' };
  return (
    <footer className="dsn-ft">
      <div className="dsn-ft__top">
        <div className="dsn-ft__brand">
          <div className="dsn-ft__logo"><img src={cesLogo} alt="" /><span className="ds-display">CES</span></div>
          <p>{description}</p>
          <a className="dsn-ft__discord" href={discordHref || '#ds-footer'} {...(discordHref ? ext : { onClick: inert })}><Icon name="discord" size={18} />Rejoindre le Discord</a>
        </div>
        {columns.map(([t, links]) => (
          <div key={t} className="dsn-ft__col"><div className="dsn-ft__title">{t}</div>
            <ul>{links.map(l => <li key={typeof l === 'string' ? l : l.label}><FooterLinkItem item={l} LinkComponent={LinkComponent} /></li>)}</ul></div>
        ))}
        <a className="dsn-ft__status" href={statusHref || '#ds-footer'} {...(statusHref ? ext : { onClick: inert })}>
          <Status label={statusLabel} state="online" />
          <span className="dsn-ft__statusmeta">{statusMeta} <Icon name="right" size={14} /></span>
        </a>
      </div>
      <div className="dsn-ft__bottom">
        <span>{copyright} · <span className="dsn-ft__ver" title="Version de l’application">v{version}</span></span>
        <span className="dsn-ft__prefs">
          <SegmentedControl ariaLabel="Thème" value={mode || 'system'} onChange={setMode} options={[{ value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }, { value: 'system', label: 'Système' }]} />
        </span>
        {onSeal
          ? <button type="button" className="dsn-ft__seal" onClick={onSeal} title="Made by the Community — site non officiel"><img src={communitySeal} alt="Made by the Community — Star Citizen" /></button>
          : <a className="dsn-ft__seal" href="https://robertsspaceindustries.com" target="_blank" rel="noopener noreferrer" title="Made by the Community"><img src={communitySeal} alt="Made by the Community — Star Citizen" /></a>}
        <span className="dsn-ft__legal">Site de fans, non affilié à Cloud Imperium Games. Star Citizen® est une marque de CIG.</span>
      </div>
    </footer>
  );
}

// --- DS-CES-13 : messagerie instantanee (adopte le 2026-11-11) -----------------------
const CONVS = [
  { id: 'general', kind: 'salon', name: 'général', unread: 0, last: 'Lyra : bien joué hier soir !', time: '18:02' },
  { id: 'ops', kind: 'salon', name: 'opérations', unread: 3, last: 'Kalgiio : briefing à 20 h 45', time: '17:48', live: true },
  { id: 'recrut', kind: 'salon', name: 'recrutement', unread: 0, last: 'Atlas : nouvelle candidature', time: 'hier' },
  { id: 'nyx', kind: 'mp', name: 'Nyx', status: 'online', unread: 1, last: 'Tu as le Cutlass prêt ?', time: '17:55' },
  { id: 'orion', kind: 'mp', name: 'Orion', status: 'idle', unread: 0, last: 'Merci pour l’aide !', time: 'lun.' },
  { id: 'vega', kind: 'mp', name: 'Vega', status: 'dnd', unread: 0, last: 'En opération, je reviens', time: 'dim.' },
];
const SEED = [
  { id: 1, who: 'Kalgiio', time: '17:40', text: 'Salut l’équipe ! Briefing de l’Opération Aube à 20 h 45 dans le vocal.' },
  { id: 2, who: 'Kalgiio', time: '17:41', text: 'Pensez à vous inscrire sur le site 👇', embed: true },
  { id: 3, who: 'Nyx', time: '17:44', text: 'Inscrite en médic. @Kalgiio on part de Port Tressler ?', reactions: [['👍', 3], ['🚀', 2]] },
  { id: 4, who: 'Orion', time: '17:46', reply: { who: 'Nyx', text: 'on part de Port Tressler ?' }, text: 'Oui, le Carrack est déjà là-bas, plein fait.', image: true },
  { id: 5, who: 'Kalgiio', time: '17:48', text: 'Parfait. Silence radio jusqu’au saut quantique.', reactions: [['✅', 4]] },
];
const ME = 'Kalgiio';
const withMentions = t => t.split(/(@\w+)/g).map((p, i) => (p.startsWith('@') ? <span key={i} className="dsn-chat__mention">{p}</span> : p));

/** Messagerie (adopte le 2026-11-11) : conversations, fil groupé par auteur, réponses, réactions, encart de mission, saisie. */
export function Chat({ missionImage }) {
  const [conv, setConv] = useState('ops');
  const [msgs, setMsgs] = useState(SEED);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(null);
  const [showList, setShowList] = useState(false);
  const log = useRef(null);
  const timer = useRef(null);
  const c = CONVS.find(x => x.id === conv);
  // 🔴 On fait defiler le FIL seulement. scrollIntoView faisait defiler tous les parents —
  // le cadre de la messagerie (en-tete et saisie masques) et la page entiere au chargement.
  useEffect(() => { const l = log.current; if (l) l.scrollTop = l.scrollHeight; }, [msgs, typing]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const send = () => {
    const t = draft.trim(); if (!t) return;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMsgs(m => [...m, { id: Date.now(), who: ME, time: now, text: t }]); setDraft('');
    setTimeout(() => setTyping('Nyx'), 600);
    timer.current = setTimeout(() => { setTyping(null); setMsgs(m => [...m, { id: Date.now() + 1, who: 'Nyx', time: now, text: 'Reçu, je préviens les médics 👍' }]); }, 2400);
  };
  const react = (id, emo) => setMsgs(m => m.map(x => {
    if (x.id !== id) return x;
    const r = x.reactions || []; const f = r.find(([e]) => e === emo);
    return { ...x, reactions: f ? r.map(([e, n, me]) => (e === emo ? [e, me ? n - 1 : n + 1, !me] : [e, n, me])).filter(([, n]) => n > 0) : [...r, [emo, 1, true]] };
  }));
  const groups = msgs.reduce((acc, m) => { const g = acc[acc.length - 1]; if (g && g.who === m.who && !m.reply) g.items.push(m); else acc.push({ who: m.who, time: m.time, items: [m] }); return acc; }, []);
  return (
    <div className={`dsn-chat${showList ? ' is-list' : ''}`}>
      <aside className="dsn-chat__side" aria-label="Conversations">
        <div className="dsn-chat__search"><Icon name="search" size={15} /><input placeholder="Rechercher…" aria-label="Rechercher une conversation" /></div>
        {[['salon', 'Salons'], ['mp', 'Messages privés']].map(([k, t]) => (
          <div key={k}><div className="dsn-chat__sec">{t}</div>
            {CONVS.filter(x => x.kind === k).map(x => (
              <button key={x.id} type="button" className={`dsn-chat__conv${conv === x.id ? ' is-active' : ''}`} onClick={() => { setConv(x.id); setShowList(false); }}>
                {k === 'salon' ? <span className="dsn-chat__hash">#</span> : <Avatar name={x.name} status={x.status} size="sm" shape="circle" />}
                <span className="dsn-chat__cinfo"><strong>{x.name}{x.live && <i className="dsn-chat__live" title="Vocal en cours" />}</strong><small>{x.last}</small></span>
                <span className="dsn-chat__cmeta"><time>{x.time}</time>{x.unread > 0 && <span className="ds-badge">{x.unread}</span>}</span>
              </button>))}
          </div>))}
      </aside>
      <section className="dsn-chat__main" aria-label={`Conversation ${c.name}`}>
        <header className="dsn-chat__head">
          <button type="button" className="dsn-chat__back" aria-label="Conversations" onClick={() => setShowList(true)}><Icon name="left" size={18} /></button>
          {c.kind === 'salon' ? <span className="dsn-chat__hash dsn-chat__hash--lg">#</span> : <Avatar name={c.name} status={c.status} shape="circle" />}
          <div className="dsn-chat__title"><strong>{c.name}</strong><small>{c.kind === 'salon' ? '12 membres · 5 en ligne' : 'Message privé'}</small></div>
          <div className="dsn-chat__tools">
            <button type="button" aria-label="Rechercher dans la conversation"><Icon name="search" size={17} /></button>
            <button type="button" aria-label="Messages épinglés"><Icon name="pin" size={17} /></button>
            <button type="button" aria-label="Membres"><Icon name="users" size={17} /></button>
          </div>
        </header>
        <div className="dsn-chat__log" role="log" aria-live="polite" ref={log}>
          <div className="dsn-chat__day"><span>Aujourd’hui</span></div>
          {groups.map((g, gi) => (
            <div key={gi} className={`dsn-chat__group${g.who === ME ? ' is-me' : ''}`}>
              <Avatar name={g.who} shape="circle" />
              <div className="dsn-chat__bubbles">
                <div className="dsn-chat__meta"><strong>{g.who}</strong><time>{g.time}</time></div>
                {g.items.map(m => (
                  <div key={m.id} className="dsn-chat__msg">
                    {m.reply && <div className="dsn-chat__reply"><Icon name="undo" size={12} /><strong>{m.reply.who}</strong> {m.reply.text}</div>}
                    <p>{withMentions(m.text)}</p>
                    {m.embed && (
                      <div className="dsn-chat__embed">
                        {missionImage && <div className="dsn-chat__embedimg" style={{ backgroundImage: `url("${missionImage}")` }} />}
                        <div><Tag value="Ouverte" severity="success" solid /> <strong>Opération Aube</strong><small>Demain · 21:00 · Port Tressler · 9 / 12</small></div>
                        <Button label="Je participe" size="sm" icon="rocket" />
                      </div>)}
                    {m.image && <div className="dsn-chat__img" style={missionImage ? { backgroundImage: `url("${missionImage}")` } : undefined} role="img" aria-label="Capture : le Carrack à Port Tressler" />}
                    {(
                      <div className="dsn-chat__reacts">
                        {(m.reactions || []).map(([e, n, me]) => <button key={e} type="button" className={me ? 'is-me' : ''} onClick={() => react(m.id, e)} aria-label={`${e} ${n}`}>{e} <span>{n}</span></button>)}
                        <button type="button" className="dsn-chat__addreact" aria-label="Réagir" onClick={() => react(m.id, '🔥')}>+</button>
                      </div>)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {typing && <div className="dsn-chat__typing" aria-live="polite"><span className="dsn-chat__dots"><i /><i /><i /></span>{typing} est en train d’écrire…</div>}
        </div>
        <form className="dsn-chat__composer" onSubmit={e => { e.preventDefault(); send(); }}>
          <button type="button" aria-label="Joindre un fichier"><Icon name="plus" size={18} /></button>
          <textarea rows={1} value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Écrire dans ${c.kind === 'salon' ? '#' : ''}${c.name}…`} aria-label="Message"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button type="button" aria-label="Émoji">🙂</button>
          <button type="submit" className="dsn-chat__send" aria-label="Envoyer" disabled={!draft.trim()}><Icon name="right" size={18} /></button>
        </form>
      </section>
    </div>
  );
}
