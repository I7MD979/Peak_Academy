import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Fragment } from "react";

const CONTENT_DIR = join(process.cwd(), "content", "legal");

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function loadLegalMarkdown(slug) {
  const file = slug === "privacy" ? "privacy.md" : "terms.md";
  return readFileSync(join(CONTENT_DIR, file), "utf8");
}

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-bold text-white/90">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const segments = [];
    let last = 0;
    let match;
    const local = part;

    EMAIL_RE.lastIndex = 0;
    while ((match = EMAIL_RE.exec(local)) !== null) {
      if (match.index > last) {
        segments.push(local.slice(last, match.index));
      }
      const email = match[0];
      segments.push(
        <a key={`${key}-mail-${match.index}`} href={`mailto:${email}`} className="text-landing-orange hover:underline">
          {email}
        </a>
      );
      last = match.index + email.length;
    }

    if (last < local.length) segments.push(local.slice(last));
    if (!segments.length) return <Fragment key={key}>{part}</Fragment>;
    return <Fragment key={key}>{segments}</Fragment>;
  });
}

function isMetaLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("# ") ||
    trimmed.startsWith("**إصدار:") ||
    trimmed.startsWith("**آخر تحديث:")
  );
}

export function parseLegalMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || isMetaLine(trimmed)) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = [];
      while (i < lines.length) {
        const current = lines[i];
        const itemTrimmed = current.trim();
        if (!itemTrimmed.startsWith("- ") && !itemTrimmed.startsWith("* ")) break;
        const indent = current.startsWith("  ") ? "nested" : "top";
        items.push({ text: itemTrimmed.replace(/^[-*]\s+/, ""), indent });
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraph = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || next.startsWith("## ") || next.startsWith("- ") || next.startsWith("* ")) break;
      paragraph.push(next);
      i += 1;
    }
    blocks.push({ type: "p", text: paragraph.join(" ") });
  }

  return blocks;
}

export function LegalMarkdownBody({ markdown }) {
  const blocks = parseLegalMarkdown(markdown);

  return (
    <article className="legal-doc space-y-6 text-sm leading-8 text-white/75 md:text-base">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2 key={`h2-${index}`} className="pt-2 text-lg font-black text-white md:text-xl">
              {block.text}
            </h2>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={`ul-${index}`} className="space-y-2 pr-1">
              {block.items.map((item, itemIndex) => (
                <li
                  key={`li-${index}-${itemIndex}`}
                  className={`flex gap-2 ${item.indent === "nested" ? "mr-5" : ""}`}
                >
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-landing-orange" aria-hidden />
                  <span>{renderInline(item.text, `ul-${index}-${itemIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${index}`}>{renderInline(block.text, `p-${index}`)}</p>
        );
      })}
    </article>
  );
}
