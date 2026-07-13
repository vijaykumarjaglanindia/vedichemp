"use client";

/**
 * VEDIC HEMP — WYSIWYG EDITOR (self-contained, zero dependencies)
 *
 * A contentEditable surface with a formatting toolbar (bold, italic, heading,
 * bullet list). What you see is what publishes — but what is STORED is
 * markdown-lite text, serialized from the DOM on every keystroke into a
 * hidden field. The server re-renders that text through the escape-first
 * pipeline (src/lib/richtext.ts), so no HTML authored here — or crafted by
 * hand — ever reaches another visitor's browser unescaped, and the claims
 * copy-check keeps operating on plain text.
 */

import { useRef, type CSSProperties } from "react";
import { Bold, Heading2, Italic, List, RemoveFormatting } from "lucide-react";
import { mdToHtml } from "@/lib/richtext";

/** Serialize the contentEditable DOM back to markdown-lite. */
function htmlToMd(root: HTMLElement): string {
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";
    const inner = Array.from(node.childNodes).map(inline).join("");
    const tag = node.tagName;
    if (tag === "STRONG" || tag === "B") return inner.trim() ? `**${inner}**` : inner;
    if (tag === "EM" || tag === "I") return inner.trim() ? `*${inner}*` : inner;
    if (tag === "BR") return "\n";
    return inner;
  };

  const BLOCK_TAGS = ["H1", "H2", "H3", "UL", "OL", "P", "DIV", "BLOCKQUOTE"];
  const blocks: string[] = [];
  // Consecutive inline nodes (bare text, <b>, <em>, <br> — what execCommand
  // produces in an empty surface) accumulate into one paragraph run; only a
  // real block element flushes it. Without this, "text <b>bold</b> text"
  // would serialize as three separate paragraphs.
  let run = "";
  const flushRun = () => {
    const t = run.trim();
    if (t) blocks.push(t);
    run = "";
  };
  const walkBlocks = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      run += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (!BLOCK_TAGS.includes(tag)) {
      run += inline(node);
      return;
    }
    flushRun();
    if (tag === "H1" || tag === "H2" || tag === "H3") {
      const t = inline(node).trim();
      if (t) blocks.push(`## ${t}`);
    } else if (tag === "UL" || tag === "OL") {
      const items = Array.from(node.querySelectorAll("li"))
        .map((li) => `- ${inline(li).trim()}`)
        .filter((l) => l !== "- ");
      if (items.length) blocks.push(items.join("\n"));
    } else {
      // A div may itself contain nested blocks (browsers vary); if it has
      // block children, recurse, otherwise treat it as a paragraph.
      const hasBlockChild = Array.from(node.children).some((c) => BLOCK_TAGS.includes(c.tagName));
      if (hasBlockChild) {
        Array.from(node.childNodes).forEach(walkBlocks);
        flushRun();
      } else {
        const t = inline(node).trim();
        if (t) blocks.push(t);
      }
    }
  };
  Array.from(root.childNodes).forEach(walkBlocks);
  flushRun();
  return blocks.join("\n\n").trim();
}

export function RichTextEditor({
  name,
  id,
  defaultValue = "",
  placeholder,
  maxLength,
  minHeight = 120,
  compact = false,
  help,
}: {
  /** Form field name the serialized markdown-lite is submitted under. */
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
  /** Compact toolbar (bold/italic only) for short fields like replies. */
  compact?: boolean;
  help?: string;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  // Everything below is imperative on purpose: a state update would re-render
  // the contentEditable div, and React re-applies dangerouslySetInnerHTML on
  // re-render — wiping whatever the user has typed. No state → no re-render →
  // the editing surface is owned by the browser between mounts.
  const sync = () => {
    if (!surface.current || !hidden.current) return;
    const md = htmlToMd(surface.current);
    hidden.current.value = md;
    if (counter.current && maxLength !== undefined) {
      counter.current.textContent = `${md.length}/${maxLength}`;
      const over = md.length > maxLength;
      counter.current.style.color = over ? "var(--vh-danger)" : "var(--vh-muted)";
      surface.current.style.borderColor = over ? "var(--vh-danger)" : "";
    }
  };

  const exec = (command: string, value?: string) => {
    surface.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const btn: CSSProperties = {
    width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "1px solid var(--vh-line)", borderRadius: 7, background: "var(--vh-surface)",
    color: "var(--vh-ink)", cursor: "pointer",
  };

  return (
    <div>
      <div
        className="vh-row"
        role="toolbar"
        aria-label="Text formatting"
        style={{ gap: 6, padding: "6px 8px", border: "1px solid var(--vh-line-strong)", borderBottom: 0, borderRadius: "8px 8px 0 0", background: "var(--vh-bg-subtle)", flexWrap: "wrap" }}
      >
        <button type="button" style={btn} title="Bold" aria-label="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}>
          <Bold size={14} strokeWidth={2.4} aria-hidden />
        </button>
        <button type="button" style={btn} title="Italic" aria-label="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}>
          <Italic size={14} strokeWidth={2.4} aria-hidden />
        </button>
        {!compact && (
          <>
            <button type="button" style={btn} title="Heading" aria-label="Heading" onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "h2"); }}>
              <Heading2 size={14} strokeWidth={2.4} aria-hidden />
            </button>
            <button type="button" style={btn} title="Bulleted list" aria-label="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}>
              <List size={14} strokeWidth={2.4} aria-hidden />
            </button>
          </>
        )}
        <button type="button" style={btn} title="Clear formatting" aria-label="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); if (!compact) exec("formatBlock", "p"); }}>
          <RemoveFormatting size={14} strokeWidth={2.4} aria-hidden />
        </button>
        <span className="vh-spacer" />
        {maxLength !== undefined && (
          <span ref={counter} className="small tabular" style={{ color: defaultValue.length > maxLength ? "var(--vh-danger)" : "var(--vh-muted)" }}>
            {defaultValue.length}/{maxLength}
          </span>
        )}
      </div>

      <div
        ref={surface}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder ?? "Rich text"}
        data-placeholder={placeholder}
        className="vh-rte vh-prose"
        style={{ minHeight }}
        onInput={sync}
        onBlur={sync}
        // Paste as plain text — formatting comes from the toolbar, never from
        // pasted markup (keeps the serializer and the copy-check honest).
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          sync();
        }}
        dangerouslySetInnerHTML={{ __html: mdToHtml(defaultValue) }}
      />
      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue} />
      {help && <span className="vh-help" style={{ marginTop: 6, display: "block" }}>{help}</span>}
    </div>
  );
}
