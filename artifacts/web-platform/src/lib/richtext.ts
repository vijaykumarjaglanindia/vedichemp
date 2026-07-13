/**
 * VEDIC HEMP — RICH TEXT CORE (shared by server renderers + the WYSIWYG editor)
 *
 * The platform never stores HTML. Every rich-text surface stores markdown-lite
 * (paragraphs, ## headings, **bold**, *italic*, "- " bullet lists) and renders
 * it through mdToHtml, which escapes ALL HTML before formatting — so stored
 * content can never inject markup, no matter which editor produced it.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    // Links: [text](href) — internal paths and https only; the input is
    // already HTML-escaped, so quotes cannot break out of the attribute.
    .replace(/\[([^\]\n]+)\]\(((?:\/|https:\/\/)[^)\s"']+)\)/g, '<a href="$2">$1</a>');
}

/** markdown-lite → safe HTML (escape first, format second). */
export function mdToHtml(body: string): string {
  // Form submission normalizes textarea/hidden-field newlines to CRLF —
  // without this, "\r\n\r\n" never matches the paragraph split below.
  return escapeHtml(body.replace(/\r\n?/g, "\n"))
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b.startsWith("## ")) return `<h2>${inlineMd(b.slice(3))}</h2>`;
      // Bullet list: every line starts with "- "
      const lines = b.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) {
        const items = lines.map((l) => `<li>${inlineMd(l.trim().slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMd(b).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
