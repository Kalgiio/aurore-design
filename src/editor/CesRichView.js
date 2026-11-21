// =============================================================================
// DS-EDT-02 · Lecteur de contenu riche (Aurore Design V1.2, 2026-11-14) — affiche un document de l'éditeur
// DS-EDT-01 (CesEditor) avec EXACTEMENT les mêmes blocs (encadrés, tableaux, cases, images, schémas), sans édition.
//
// 🔴 C'est aussi la protection : le HTML stocké n'est jamais injecté tel quel (pas de dangerouslySetInnerHTML).
// TipTap le relit à travers son schéma : seuls les nœuds et attributs connus survivent — balises <script>,
// attributs on*, styles arbitraires disparaissent. Liens : protocoles http(s)/mailto seulement (Link de TipTap).
// Un contenu ancien en TEXTE BRUT (sans balise) est converti en paragraphes, échappé.
// =============================================================================
import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Callout, Diagram, ImageBlock } from './extensions';
import './editor.css';

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const isRichHTML = s => /^\s*</.test(String(s || ''));
// Texte ancien : liens http(s) rendus cliquables (le schéma de Link revalide l'adresse à la lecture).
const linkify = t => t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)»]/g, u => `<a href="${u}">${u}</a>`);
export const toRichHTML = s => (isRichHTML(s) ? s : String(s || '').split(/\n{2,}/).map(p => `<p>${linkify(esc(p)).replace(/\n/g, '<br>')}</p>`).join(''));
/** Texte brut d'un contenu (aperçus, recherche) — sans passer par le DOM. */
export const richToText = s => (isRichHTML(s)
  ? String(s).replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
  : String(s || '').trim());

export default function CesRichView({ html, className }) {
  const content = useMemo(() => toRichHTML(html), [html]);
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: true, autolink: false, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      TaskList, TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Callout, Diagram, ImageBlock,
    ],
    content,
    editorProps: { attributes: { class: 'ds-ed__content ds-ed-view__content' } },
  });
  // Contenu changé (annonce modifiée en direct) : relu sans recréer l'éditeur.
  useEffect(() => { if (editor && !editor.isDestroyed && editor.getHTML() !== content) editor.commands.setContent(content, { emitUpdate: false }); }, [editor, content]);
  return <div className={`ds-ed-view${className ? ` ${className}` : ''}`}><EditorContent editor={editor} /></div>;
}
