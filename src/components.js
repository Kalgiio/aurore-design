// =============================================================================
// AURORE DESIGN (design system du CES) — composants React
//
// Inspires de l'UI/UX d'Aura (PrimeVue), sans dependance : du React et les
// classes de ds.css, elles-memes construites sur les jetons de tokens.css.
// A utiliser a l'interieur d'un conteneur `.ds` (voir <DsRoot>).
//
// 🔴 Aucun import MUI ici : le design system doit pouvoir remplacer MUI
// ecran par ecran sans en dependre.
// =============================================================================
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  RiFlagLine, RiCalendar2Line, RiBookLine, RiRobot2Line, RiHome4Line, RiQrCodeLine, RiFingerprintLine, RiMenuLine, RiMegaphoneLine,
  RiDiscussLine, RiSendPlane2Line, RiPushpinLine, RiReplyLine,
  RiAddLine, RiAlertLine, RiArrowDownSLine, RiArrowGoBackLine, RiArrowGoForwardLine, RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpSLine, RiBarChart2Line, RiBold, RiCalendarLine, RiChat3Line, RiCheckLine, RiCheckboxCircleLine, RiCloseCircleLine, RiCloseLine, RiCodeLine, RiCommandLine, RiComputerLine, RiDeleteBinLine, RiDiscordLine, RiDoubleQuotesL, RiDraggable, RiErrorWarningLine, RiExpandUpDownLine, RiEyeLine, RiEyeOffLine, RiFileCopyLine, RiFileTextLine, RiFilter3Line, RiFolderLine, RiFormatClear, RiH2, RiH3, RiHome5Line, RiInformationLine, RiItalic, RiKanbanView, RiLinkM, RiListOrdered, RiListUnordered, RiLockLine, RiMapPinLine, RiMedicineBottleLine, RiMoonLine, RiMore2Line, RiMoreLine, RiNotification3Line, RiPencilLine, RiQuestionLine, RiRocketLine, RiSearchLine, RiSettings3Line, RiShieldLine, RiSpaceShipLine, RiSparklingLine, RiStarFill, RiStarLine, RiStrikethrough, RiSubtractLine, RiSunLine, RiSwordLine, RiTeamLine, RiTimeLine, RiTruckLine, RiTwitchLine, RiUnderline, RiDownloadCloud2Line, RiUploadCloud2Line, RiUser3Line,
} from '@remixicon/react';
import './tokens.css';
import './ds.css';

const cx = (...c) => c.filter(Boolean).join(' ');

// --- Icones : Remix Icon (deja utilise dans tout le portail) ----------------
// `<Icon name="rocket" />` : le nom court reste l'API, la table le relie au
// composant Remix. Imports nommes => seules les icones listees sont embarquees.
// Licence Remix Icon v1.0 : usage libre en application et design system.
const ICONS = {
  check: RiCheckLine, close: RiCloseLine, info: RiInformationLine, warn: RiAlertLine, error: RiCloseCircleLine,
  success: RiCheckboxCircleLine, search: RiSearchLine, user: RiUser3Line, users: RiTeamLine, rocket: RiRocketLine,
  calendar: RiCalendarLine, plus: RiAddLine, minus: RiSubtractLine, trash: RiDeleteBinLine, star: RiStarLine, starFill: RiStarFill,
  shield: RiShieldLine, sort: RiExpandUpDownLine, sortUp: RiArrowUpSLine, sortDown: RiArrowDownSLine, up: RiArrowUpSLine,
  down: RiArrowDownSLine, left: RiArrowLeftSLine, right: RiArrowRightSLine, ship: RiSpaceShipLine, link: RiLinkM,
  copy: RiFileCopyLine, sun: RiSunLine, moon: RiMoonLine, monitor: RiComputerLine, more: RiMoreLine, moreV: RiMore2Line,
  home: RiHome5Line, drag: RiDraggable, filter: RiFilter3Line, settings: RiSettings3Line, bell: RiNotification3Line,
  upload: RiUploadCloud2Line, download: RiDownloadCloud2Line, eye: RiEyeLine, eyeOff: RiEyeOffLine, edit: RiPencilLine, time: RiTimeLine, pin: RiMapPinLine,
  medic: RiMedicineBottleLine, truck: RiTruckLine, sword: RiSwordLine, command: RiCommandLine, sparkle: RiSparklingLine,
  undo: RiArrowGoBackLine, redo: RiArrowGoForwardLine, clear: RiFormatClear, folder: RiFolderLine, file: RiFileTextLine,
  chart: RiBarChart2Line, kanban: RiKanbanView, lock: RiLockLine, discord: RiDiscordLine, twitch: RiTwitchLine, chat: RiChat3Line,
  bold: RiBold, italic: RiItalic, underline: RiUnderline, strike: RiStrikethrough, ul: RiListUnordered, ol: RiListOrdered,
  quote: RiDoubleQuotesL, code: RiCodeLine, h2: RiH2, h3: RiH3, alert: RiErrorWarningLine,
  // icones de la barre laterale du portail (memes que SharedSidebar)
  flag: RiFlagLine, calendar2: RiCalendar2Line, book: RiBookLine, robot: RiRobot2Line, home4: RiHome4Line, qr: RiQrCodeLine, passkey: RiFingerprintLine, menu: RiMenuLine, megaphone: RiMegaphoneLine, forum: RiDiscussLine, send: RiSendPlane2Line, pin2: RiPushpinLine, reply: RiReplyLine,
};
export const ICON_NAMES = Object.keys(ICONS);
export function Icon({ name, size = 18, stroke, ...rest }) { // `stroke` ignore : conserve pour compatibilite
  const C = ICONS[name] || RiQuestionLine;
  return <C size={size} aria-hidden="true" focusable="false" {...rest} />;
}

/** Conteneur racine : active les styles du design system sous lui. */
export function DsRoot({ className, children, ...rest }) {
  return <div className={cx('ds', className)} {...rest}>{children}</div>;
}

// --- Bouton ------------------------------------------------------------------
// Bouton Aurore : le degrade defile en boucle tant que la souris est dessus ; un clic
// l'accelere un instant et fait jaillir de petites etoiles jaunes depuis le point de clic.
const STAR_COUNT = 9;
function useAuroraBurst(on) {
  const [bursts, setBursts] = useState([]);
  const [boost, setBoost] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const fire = useCallback(e => {
    if (!on) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ? e.clientX - r.left : r.width / 2; const y = e.clientY ? e.clientY - r.top : r.height / 2;
    const id = Date.now() + Math.random();
    const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
      const ang = (i / STAR_COUNT) * Math.PI * 2 + Math.random() * 0.6; const dist = 26 + Math.random() * 34;
      return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 8, s: 0.55 + Math.random() * 0.6, r: Math.round(Math.random() * 180), d: Math.random() * 0.08 };
    });
    setBursts(l => [...l, { id, x, y, stars }]); setBoost(true);
    timers.current.push(setTimeout(() => setBursts(l => l.filter(b => b.id !== id)), 900));
    timers.current.push(setTimeout(() => setBoost(false), 650));
  }, [on]);
  return { bursts, boost, fire };
}

export function Button({ label, children, icon, iconRight, severity, variant, size, rounded, raised, block,
  loading, iconOnly, className, disabled, type = 'button', onClick, ...rest }) {
  const content = children ?? label;
  const aurora = variant === 'aurora';
  const { bursts, boost, fire } = useAuroraBurst(aurora);
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx('ds-btn', severity && `ds-btn--${severity}`, variant && `ds-btn--${variant}`, size && `ds-btn--${size}`,
        rounded && 'ds-btn--rounded', raised && 'ds-btn--raised', block && 'ds-btn--block', iconOnly && 'ds-btn--icon', boost && 'is-boost', className)}
      onClick={aurora ? e => { fire(e); onClick?.(e); } : onClick}
      {...rest}>
      {aurora && <span className="ds-btn__bg" aria-hidden="true" />}
      {aurora && bursts.map(b => (
        <span key={b.id} className="ds-btn__burst" aria-hidden="true" style={{ left: b.x, top: b.y }}>
          {b.stars.map((st, i) => <i key={i} style={{ '--dx': `${st.dx}px`, '--dy': `${st.dy}px`, '--s': st.s, '--r': `${st.r}deg`, '--d': `${st.d}s` }} />)}
        </span>
      ))}
      {loading ? <span className="ds-btn__spin" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'lg' ? 20 : 16} />}
      {!iconOnly && content}
      {iconRight && !loading && <Icon name={iconRight} size={16} />}
    </button>
  );
}

// --- Champs ------------------------------------------------------------------
export function Field({ label, help, error, htmlFor, children }) {
  return (
    <div className="ds-field">
      {label && <label className="ds-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {(error || help) && <span className={cx('ds-help', error && 'ds-help--error')}>{error || help}</span>}
    </div>
  );
}

// forwardRef : une page peut viser le champ (raccourci « / » pour la recherche, focus après une action).
export const InputText = React.forwardRef(function InputText({ size, invalid, className, icon, ...rest }, ref) {
  const input = <input ref={ref} className={cx('ds-input', size && `ds-input--${size}`, invalid && 'ds-input--invalid', className)}
                       aria-invalid={invalid || undefined} {...rest} />;
  if (!icon) return input;
  return <span className="ds-iconfield"><Icon name={icon} size={16} />{input}</span>;
});

export function Textarea({ className, ...rest }) { return <textarea className={cx('ds-textarea', className)} {...rest} />; }

export function Select({ options = [], placeholder, className, ...rest }) {
  return (
    <select className={cx('ds-select', className)} {...rest}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FloatLabel({ label, id, ...rest }) {
  const auto = useId(); const fid = id || auto;
  return <span className="ds-float"><input id={fid} className="ds-input" placeholder=" " {...rest} /><label htmlFor={fid}>{label}</label></span>;
}

export function Checkbox({ label, ...rest }) {
  return <label className="ds-check"><input type="checkbox" {...rest} />{label}</label>;
}
export function RadioButton({ label, ...rest }) {
  return <label className="ds-check"><input type="radio" {...rest} />{label}</label>;
}

export function Slider({ value, onChange, min = 0, max = 100, ...rest }) {
  const pct = ((value - min) / (max - min)) * 100;
  return <input type="range" className="ds-slider" min={min} max={max} value={value} style={{ '--v': `${pct}%` }}
                onChange={e => onChange?.(Number(e.target.value))} {...rest} />;
}

export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div className="ds-segmented" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange?.(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// --- Affichage ---------------------------------------------------------------
export function Tag({ value, children, severity, rounded, solid, icon }) {
  return (
    <span className={cx('ds-tag', severity && `ds-tag--${severity}`, rounded && 'ds-tag--rounded', solid && 'ds-tag--solid')}>
      {icon && <Icon name={icon} size={12} stroke={2.4} />}{children ?? value}
    </span>
  );
}
export function Badge({ value, severity, dot }) {
  return <span className={cx('ds-badge', severity && `ds-badge--${severity}`, dot && 'ds-badge--dot')}>{dot ? null : value}</span>;
}
export function OverlayBadge({ value, severity, children }) {
  return <span className="ds-overlaybadge">{children}<Badge value={value} severity={severity} /></span>;
}
export function Chip({ label, image, onRemove }) {
  return (
    <span className="ds-chip">
      {image && <img src={image} alt="" />}{label}
      {onRemove && <button type="button" aria-label={`Retirer ${label}`} onClick={onRemove}>×</button>}
    </span>
  );
}
// Avatar : image, sinon INITIALES sur fond opaque. La teinte est derivee du nom
// (meme membre = meme couleur partout), jamais un fond transparent qui laisserait
// voir la surface derriere et rendrait les initiales illisibles sur une image.
const AVATAR_TONES = [
  ['#7c3aed', '#4f46e5'], ['#1d4ed8', '#0891b2'], ['#0e7490', '#059669'], ['#b45309', '#dc2626'],
  ['#be185d', '#7c3aed'], ['#15803d', '#0d9488'], ['#1e40af', '#7c3aed'], ['#c2410c', '#b45309'],
];
export const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
};
const toneOf = (name = '') => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_TONES[h % AVATAR_TONES.length]; };

export const PRESENCE = {
  online:  { label: 'En ligne' },
  idle:    { label: 'Absent' },
  dnd:     { label: 'Ne pas déranger' },
  offline: { label: 'Hors ligne' },
};

/**
 * <Avatar name="Kalgiio" image={url} status="online" size="lg" shape="circle" />
 * `label` force les initiales ; `status` = online | idle | dnd | offline (pastille Discord).
 */
export function Avatar({ label, name, image, size, shape, alt = '', status }) {
  const [broken, setBroken] = useState(false);
  const text = label || initialsOf(name);
  const [a, b] = toneOf(name || label || '');
  const av = (
    <span className={cx('ds-avatar', size && `ds-avatar--${size}`, shape === 'circle' && 'ds-avatar--circle', !(image && !broken) && 'ds-avatar--initials')}
      style={image && !broken ? undefined : { background: `linear-gradient(135deg, ${a}, ${b})` }}
      title={name || undefined} aria-label={!image && name ? name : undefined} role={!image && name ? 'img' : undefined}>
      {image && !broken ? <img src={image} alt={alt || name || ''} onError={() => setBroken(true)} /> : <span aria-hidden="true">{text}</span>}
    </span>
  );
  if (!status) return av;
  const p = PRESENCE[status] || PRESENCE.offline;
  return (
    <span className={cx('ds-avatar-wrap', shape === 'circle' && 'ds-avatar-wrap--circle', size && `ds-avatar-wrap--${size}`)}>
      {av}
      <span className={cx('ds-presence', `ds-presence--${status}`)} role="img" aria-label={p.label} title={p.label} />
    </span>
  );
}
export function AvatarGroup({ children, max }) {
  const list = React.Children.toArray(children);
  const shown = max ? list.slice(0, max) : list;
  return <span className="ds-avatargroup">{shown}{max && list.length > max && <span className="ds-avatar ds-avatar--circle ds-avatar--more">+{list.length - max}</span>}</span>;
}

// --- Surfaces ----------------------------------------------------------------
export function Panel({ header, actions, children }) {
  return (
    <section className="ds-panel">
      <div className="ds-panel__head"><span>{header}</span>{actions}</div>
      <div className="ds-panel__body">{children}</div>
    </section>
  );
}
export function Divider({ label }) { return <div className="ds-divider" role="separator">{label}</div>; }

/** Onglets accessibles : fleches gauche/droite, Debut/Fin (motif WAI-ARIA). */
export function Tabs({ tabs, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);
  const base = useId();
  const refs = useRef([]);
  const onKey = (e) => {
    const n = tabs.length; let next = null;
    if (e.key === 'ArrowRight') next = (active + 1) % n;
    if (e.key === 'ArrowLeft') next = (active - 1 + n) % n;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = n - 1;
    if (next !== null) { e.preventDefault(); setActive(next); refs.current[next]?.focus(); }
  };
  return (
    <div className="ds-tabs">
      <div className="ds-tabs__list" role="tablist" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button key={t.label} ref={el => { refs.current[i] = el; }} role="tab" type="button" className="ds-tabs__tab"
            id={`${base}-t${i}`} aria-controls={`${base}-p${i}`} aria-selected={i === active} tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}>{t.label}</button>
        ))}
      </div>
      <div className="ds-tabs__panel" role="tabpanel" id={`${base}-p${active}`} aria-labelledby={`${base}-t${active}`}>{tabs[active]?.content}</div>
    </div>
  );
}

// --- Retours -----------------------------------------------------------------
const SEV_ICON = { info: 'info', success: 'success', warn: 'warn', danger: 'error', help: 'star' };
export function Message({ severity = 'info', title, children, onClose, className, ...rest }) {
  return (
    <div className={cx('ds-message', `ds-message--${severity}`, className)} role={severity === 'danger' ? 'alert' : 'status'} {...rest}>
      <Icon name={SEV_ICON[severity]} className="ds-message__icon" size={20} />
      <div>{title && <div className="ds-message__title">{title}</div>}{children}</div>
      {onClose && <button type="button" className="ds-message__close" aria-label="Fermer" onClick={onClose}>×</button>}
    </div>
  );
}

const ToastCtx = createContext(null);
/** Fournit `useToast()` : toast.show({ severity, title, text, life }). */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback(id => setItems(l => l.filter(t => t.id !== id)), []);
  const show = useCallback(({ life = 3800, ...t }) => {
    const id = Math.random().toString(36).slice(2);
    setItems(l => [...l, { id, ...t }]);
    if (life) setTimeout(() => remove(id), life);
  }, [remove]);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="ds-toasts" aria-live="polite">
        {items.map(t => (
          <Message key={t.id} severity={t.severity} title={t.title} className="ds-toast" onClose={() => remove(t.id)}>{t.text}</Message>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function ProgressBar({ value, aurora, indeterminate, label }) {
  return (
    <div className={cx('ds-progress', aurora && 'ds-progress--aurora', indeterminate && 'ds-progress--indeterminate')}
         role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : value}>
      <div className="ds-progress__bar" style={indeterminate ? undefined : { width: `${value}%` }} />
    </div>
  );
}
export function Spinner({ label = 'Chargement' }) { return <div className="ds-spinner" role="status" aria-label={label} />; }
export function Skeleton({ width = '100%', height = 14, radius, circle }) {
  return <div className="ds-skeleton" aria-hidden="true" style={{ width, height, borderRadius: circle ? '50%' : radius }} />;
}
export function Tooltip({ text, children }) {
  return <span className="ds-tooltip">{children}<span className="ds-tooltip__bubble" role="tooltip">{text}</span></span>;
}

/** Boite de dialogue sur <dialog> natif : Echap, focus et fond inerte fournis par le navigateur. */
export function Dialog({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="ds-dialog" onClose={onClose} onCancel={onClose}
            onClick={e => { if (e.target === ref.current) onClose?.(); }} aria-labelledby="ds-dialog-title">
      <div className="ds-dialog__head">
        <h3 className="ds-dialog__title" id="ds-dialog-title">{title}</h3>
        <Button iconOnly icon="close" variant="text" severity="secondary" size="sm" aria-label="Fermer" onClick={onClose} />
      </div>
      <div className="ds-dialog__body">{children}</div>
      {footer && <div className="ds-dialog__foot">{footer}</div>}
    </dialog>
  );
}

// --- Navigation et donnees ---------------------------------------------------
export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="ds-breadcrumb">
        {items.map((it, i) => (
          <li key={it.label}>{i === items.length - 1 ? <span aria-current="page">{it.label}</span> : <a href={it.href || '#'} onClick={e => e.preventDefault()}>{it.label}</a>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function Paginator({ page, pages, onChange }) {
  const list = Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav className="ds-paginator" aria-label="Pagination">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Page precedente"><Icon name="left" size={16} /></button>
      {list.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && p - list[i - 1] > 1 && <span style={{ padding: '0 4px', color: 'var(--ds-text-subtle)' }}>…</span>}
          <button type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>
        </React.Fragment>
      ))}
      <button type="button" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Page suivante"><Icon name="right" size={16} /></button>
    </nav>
  );
}

export function Steps({ steps, active }) {
  return (
    <ol className="ds-steps">
      {steps.map((s, i) => (
        <li key={s} data-done={i < active} data-active={i === active} aria-current={i === active ? 'step' : undefined}>
          <span className="ds-steps__dot">{i < active ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

/** Tableau triable avec selection de ligne. columns: [{ field, header, sortable, body(row) }] */
export function DataTable({ columns, rows, striped, selectable, rowKey = 'id' }) {
  const [sort, setSort] = useState({ field: null, dir: 1 });
  const [selected, setSelected] = useState(null);
  const sorted = useMemo(() => {
    if (!sort.field) return rows;
    return [...rows].sort((a, b) => (a[sort.field] > b[sort.field] ? 1 : a[sort.field] < b[sort.field] ? -1 : 0) * sort.dir);
  }, [rows, sort]);
  const toggle = f => setSort(s => ({ field: f, dir: s.field === f ? -s.dir : 1 }));
  return (
    <div className="ds-table-wrap">
      <table className={cx('ds-table', striped && 'ds-table--striped')}>
        <thead>
          <tr>{columns.map(c => (
            <th key={c.field} aria-sort={sort.field === c.field ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
              {c.sortable
                ? <button type="button" onClick={() => toggle(c.field)}>{c.header}<Icon name={sort.field !== c.field ? 'sort' : sort.dir === 1 ? 'sortUp' : 'sortDown'} size={14} /></button>
                : c.header}
            </th>))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r[rowKey]} aria-selected={selectable ? selected === r[rowKey] : undefined}
                onClick={selectable ? () => setSelected(s => (s === r[rowKey] ? null : r[rowKey])) : undefined}
                style={selectable ? { cursor: 'pointer' } : undefined}>
              {columns.map(c => <td key={c.field}>{c.body ? c.body(r) : r[c.field]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Modeles CES -------------------------------------------------------------
export const RANKS = ['Recrue', 'Aspirant', 'Caporal', 'Capitaine', 'Officier', 'Commandement'];
// `level` (facultatif, 0 à 5) : barrette à allumer pour un grade dont le nom n'est pas dans RANKS (grades réels du
// portail : « ASPIRANTS », « CAPITAINES »… — voir rankLevel dans pages/annuaire/constants.js).
export function RankBadge({ rank, animated = true, level: forced }) {
  const level = forced != null ? Math.max(0, Math.min(RANKS.length - 1, forced)) : Math.max(0, RANKS.indexOf(rank));
  return (
    <span className={cx('ds-rank', animated && 'ds-rank--anim', level >= 4 && 'ds-rank--high')}>
      <span className="ds-rank__pips" aria-hidden="true">{RANKS.map((r, i) => <i key={r} data-on={i <= level} data-top={i === level} style={{ '--i': i }} />)}</span>
      <span className="ds-rank__name">{rank}</span>
    </span>
  );
}
/** Echelle des grades : passes cochés, actuel qui pulse, la ligne se remplit jusqu'à lui. */
export function RankLadder({ current }) {
  const idx = Math.max(0, RANKS.indexOf(current));
  return (
    <ol className="ds-ladder" style={{ '--p': idx / (RANKS.length - 1) }} aria-label={`Grade actuel : ${current}`}>
      {RANKS.map((r, i) => (
        <li key={r} data-state={i < idx ? 'done' : i === idx ? 'now' : 'todo'} style={{ '--i': i }} aria-current={i === idx ? 'step' : undefined}>
          <span className="ds-ladder__dot">{i < idx ? <Icon name="check" size={12} /> : i + 1}</span><span>{r}</span>
        </li>
      ))}
    </ol>
  );
}
const LEVELS = {
  novice: 'Novice', cadet: 'Cadet', junior: 'Junior', senior: 'Senior', elite: 'Élite', master: 'Maître', legend: 'Légende',
  instructor: 'Instructeur', progress: 'En cours', expired: 'Expirée',
};
/** Niveau de certification. Statuts : instructor (forme), progress (pointillé), expired (barré). */
export function CertLevel({ level }) {
  return <span className={cx('ds-level', `ds-level--${level}`)}>{level === 'instructor' && <Icon name="shield" size={12} />}{LEVELS[level] || level}</span>;
}
export function StatTile({ value, label, delta }) {
  return <div className="ds-stat"><div className="ds-stat__value">{value}</div><div className="ds-stat__label">{label}</div>{delta && <div className="ds-stat__delta">{delta}</div>}</div>;
}
export function EmptyState({ icon = 'rocket', title, text, action }) {
  return (
    <div className="ds-empty">
      <span className="ds-empty__icon"><Icon name={icon} size={26} /></span>
      <h3 className="ds-empty__title">{title}</h3>
      <p className="ds-empty__text">{text}</p>
      {action}
    </div>
  );
}
/** Statut. state = online | idle | busy | offline | live : couleur ET animation propres a l'etat. */
export function Status({ label, color, state }) {
  return <span className={cx('ds-status', state && `ds-status--${state}`)} style={color ? { '--s': color } : undefined}>{label}</span>;
}

// =============================================================================
// Revision 2 (adoptee le 2026-11-11) — inspiree de shadcn/ui et PrimeVue
// =============================================================================
/**
 * Selecteur en liste (shadcn Select / Prime Select) : bouton + liste d'options.
 * Clavier : Entree/Espace/↓ ouvre, ↑↓ parcourt, Entree choisit, Echap ferme,
 * lettres = saut a l'option (type-ahead). options: [{ value, label, icon, desc, group, disabled }]
 */
export function SelectMenu({ options, value, onChange, placeholder = 'Choisir…', label, id }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null); const btn = useRef(null); const list = useRef(null);
  const typed = useRef({ s: '', t: 0 });
  const auto = useId(); const lid = `${id || auto}-list`;
  const sel = options.find(o => o.value === value);
  const enabled = i => !options[i]?.disabled;
  const close = useCallback((focus = true) => { setOpen(false); if (focus) btn.current?.focus(); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const down = e => { if (!root.current?.contains(e.target)) close(false); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [open, close]);
  useEffect(() => { if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  const openAt = () => { setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(true); };
  const step = d => { let i = active; do { i = (i + d + options.length) % options.length; } while (!enabled(i) && i !== active); setActive(i); };
  const onKey = e => {
    if (!open) { if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openAt(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (enabled(active)) { onChange(options[active].value); close(); } }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(e.key === 'Escape'); }
    else if (e.key.length === 1) {
      const now = Date.now(); typed.current = { s: (now - typed.current.t < 600 ? typed.current.s : '') + e.key.toLowerCase(), t: now };
      const i = options.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(typed.current.s));
      if (i >= 0) setActive(i);
    }
  };
  let lastGroup = null;
  return (
    <div className="ds-pop" ref={root} style={{ display: 'block' }}>
      <button ref={btn} id={id} type="button" className="dsn-select" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={lid}
        aria-activedescendant={open ? `${lid}-${active}` : undefined} aria-label={label} onClick={() => (open ? close() : openAt())} onKeyDown={onKey}>
        <span className={cx('dsn-select__value', !sel && 'dsn-select__value--ph')}>{sel?.icon && <Icon name={sel.icon} size={16} />}{sel ? sel.label : placeholder}</span>
        <Icon name="down" size={18} className="dsn-select__chev" />
      </button>
      {open && (
        <div className="ds-pop__panel ds-pop__panel--start" style={{ width: '100%', minWidth: 220 }}>
          <ul className="dsn-listbox" role="listbox" id={lid} ref={list} aria-label={label}>
            {options.map((o, i) => {
              const head = o.group && o.group !== lastGroup ? <li key={`g-${o.group}`} className="dsn-listbox__group" role="presentation">{o.group}</li> : null;
              lastGroup = o.group || lastGroup;
              return (
                <React.Fragment key={o.value}>
                  {head}
                  <li id={`${lid}-${i}`} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined} data-active={i === active}
                    className="dsn-option" onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()}
                    onClick={() => { if (!o.disabled) { onChange(o.value); close(); } }}>
                    {o.icon && <Icon name={o.icon} size={16} />}
                    <span className="dsn-option__label">{o.label}{o.desc && <small>{o.desc}</small>}</span>
                    <Icon name="check" size={16} className="dsn-option__check" />
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Cartes de choix (Prime RadioButton cards / shadcn RadioGroup cards). */
export function ChoiceCards({ name, options, value, onChange, label }) {
  return (
    <div className="dsn-choices" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <label key={o.value} className="dsn-choice">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="dsn-choice__icon"><Icon name={o.icon} size={18} /></span>
          <span><span className="dsn-choice__title">{o.label}</span><span className="dsn-choice__desc" style={{ display: 'block' }}>{o.desc}</span></span>
          <span className="dsn-choice__dot" aria-hidden="true" />
        </label>
      ))}
    </div>
  );
}

/** Interrupteur (révision 2) : pastille à ressort, variante aurore, `icons` = coche / croix dans la pastille (désactivé par défaut). */
export function ToggleSwitch({ checked, onChange, label, disabled, size, aurora, icons = false, id }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={typeof label === 'string' ? undefined : 'Interrupteur'} disabled={disabled}
      className={cx('dsn-switch', size === 'sm' && 'dsn-switch--sm', aurora && 'dsn-switch--aurora')} onClick={() => onChange?.(!checked)}>
      <span className="dsn-switch__track"><span className="dsn-switch__thumb">{icons && <Icon name={checked ? 'check' : 'close'} size={size === 'sm' ? 9 : 12} />}</span></span>
      {typeof label === 'string' && label}
    </button>
  );
}

/** Rangée de réglage (shadcn) : titre + description à gauche, contrôle à droite. */
export function SettingRow({ title, desc, children, htmlFor }) {
  return (
    <div className="dsn-setting">
      <div><label className="dsn-setting__title" htmlFor={htmlFor}>{title}</label>{desc && <div className="dsn-setting__desc">{desc}</div>}</div>
      {children}
    </div>
  );
}

/** Carte enrichie : média avec voile et badges, en-tête + menu, méta, pied scindé, liseré aurore au survol. */
export function Card({ media, badges, over, eyebrow, title, desc, meta, menu, footerStart, footerEnd }) {
  return (
    <article className="dsn-card" tabIndex={-1}>
      {media && (
        <div className="dsn-card__media" style={{ backgroundImage: `url("${media}")` }}>
          {badges && <div className="dsn-card__badges">{badges}</div>}
          {over && <div className="dsn-card__over">{over}</div>}
        </div>
      )}
      <div className="dsn-card__body">
        <div className="dsn-card__head">
          <div>{eyebrow && <div className="dsn-card__eyebrow">{eyebrow}</div>}<h3 className="dsn-card__title">{title}</h3></div>
          {menu}
        </div>
        {desc && <p className="dsn-card__desc">{desc}</p>}
        {meta && <div className="dsn-card__meta">{meta.map(m => <span key={m.label}><Icon name={m.icon} size={14} />{m.label}</span>)}</div>}
      </div>
      {(footerStart || footerEnd) && <div className="dsn-card__foot"><div>{footerStart}</div><div style={{ display: 'flex', gap: 8 }}>{footerEnd}</div></div>}
    </article>
  );
}

/** Accordéon en cartes séparées, hauteur animée (grid-rows), un ou plusieurs ouverts. */
export function Accordion({ items, multiple, defaultOpen = [0] }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  const base = useId();
  const toggle = i => setOpen(s => { const n = new Set(multiple ? s : []); if (s.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <div className="dsn-accordion">
      {items.map((it, i) => {
        const isOpen = open.has(i);
        return (
          <div key={it.title} className="dsn-acc" data-open={isOpen}>
            <button type="button" className="dsn-acc__trigger" id={`${base}-h${i}`} aria-expanded={isOpen} aria-controls={`${base}-p${i}`} onClick={() => toggle(i)}>
              {it.icon && <span className="dsn-acc__icon"><Icon name={it.icon} size={18} /></span>}
              <span className="dsn-acc__text"><span className="dsn-acc__title" style={{ display: 'block' }}>{it.title}</span>{it.sub && <span className="dsn-acc__sub" style={{ display: 'block' }}>{it.sub}</span>}</span>
              <span className="dsn-acc__chev" aria-hidden="true"><Icon name="down" size={16} /></span>
            </button>
            <div className="dsn-acc__panel" id={`${base}-p${i}`} role="region" aria-labelledby={`${base}-h${i}`} inert={isOpen ? undefined : ''}>
              <div className="dsn-acc__inner"><div className="dsn-acc__content">{it.content}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Section({ title, children }) {
  return <div className="dsn-section"><div className="dsn-section__title">{title}</div>{children}</div>;
}
