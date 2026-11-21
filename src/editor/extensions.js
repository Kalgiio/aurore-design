// Extensions TipTap propres au CES : encadre, schema (Mermaid), image dimensionnable,
// et menu « / » (blocs facon Notion).
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import DiagramView from './DiagramView';

/** Encadre (callout) : bloc de texte colore par ton — info, success, warn, danger, help. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return { tone: { default: 'info', parseHTML: el => el.getAttribute('data-tone') || 'info', renderHTML: a => ({ 'data-tone': a.tone }) } };
  },
  parseHTML() { return [{ tag: 'div[data-callout]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'ds-ed-callout' }), 0]; },
  addCommands() {
    return { setCallout: (tone = 'info') => ({ commands }) => commands.setNode(this.name, { tone }) };
  },
});

/** Schema : code Mermaid stocke en attribut, rendu (et edite) par une vue React. */
export const Diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { code: { default: 'flowchart LR\n  A[Départ] --> B[Arrivée]', parseHTML: el => el.getAttribute('data-code') || '', renderHTML: a => ({ 'data-code': a.code }) } };
  },
  parseHTML() { return [{ tag: 'div[data-diagram]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-diagram': '' })]; },
  addNodeView() { return ReactNodeViewRenderer(DiagramView); },
  addCommands() {
    return { insertDiagram: code => ({ commands }) => commands.insertContent({ type: this.name, attrs: { code } }) };
  },
});

/** Image : largeur (33/50/100 %) et alignement. Base64 autorise : pas de backend d'envoi pour l'instant. */
export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', parseHTML: el => el.style.width || el.getAttribute('data-width') || '100%', renderHTML: a => ({ 'data-width': a.width, style: `width:${a.width}` }) },
      align: { default: 'center', parseHTML: el => el.getAttribute('data-align') || 'center', renderHTML: a => ({ 'data-align': a.align }) },
    };
  },
}).configure({ allowBase64: true, inline: false });

/**
 * Menu « / » : s'appuie sur @tiptap/suggestion. L'affichage est delegue au composant
 * React via `onState` ; `onKey` lui transmet les touches (↑ ↓ Entree Echap).
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() { return { items: () => [], onState: () => {}, onKey: () => false }; },
  addProseMirrorPlugins() {
    const o = this.options;
    return [Suggestion({
      editor: this.editor,
      char: '/',
      pluginKey: new PluginKey('ces-slash'),
      allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== 'codeBlock',
      items: ({ query }) => o.items(query),
      command: ({ editor, range, props }) => {
        const r = props.run(editor.chain().focus().deleteRange(range), editor);
        if (r && typeof r.run === 'function') r.run();
      },
      render: () => ({
        onStart: p => o.onState({ open: true, items: p.items, rect: p.clientRect?.(), command: p.command }),
        onUpdate: p => o.onState({ open: true, items: p.items, rect: p.clientRect?.(), command: p.command }),
        onKeyDown: ({ event }) => o.onKey(event),
        onExit: () => o.onState({ open: false }),
      }),
    })];
  },
});
