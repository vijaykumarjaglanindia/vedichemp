/**
 * VEDIC HEMP — PRODUCT QUESTIONS & ANSWERS (a real Q&A system)
 *
 * A shopper asks a question on a product; it's public immediately (the text is
 * claims-checked at ask time, like every buyer-facing field). The seller — and
 * only the seller who owns the product — answers, also copy-checked. Admins can
 * hide an abusive question. Answers are the useful signal, so answered questions
 * sort to the top.
 *
 * Server-side store = the DB seam (a `Question` table keyed by product).
 */

export interface Question {
  id: string;
  productId: string;
  productSlug: string;
  asker: string;
  body: string;
  createdAt: string; // YYYY-MM-DD
  answer?: string;
  answeredBy?: string; // seller store name
  answeredAt?: string;
  helpful: number;
  hidden?: boolean; // admin-removed
}

interface QaStore {
  items: Question[];
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhQuestions: QaStore | undefined;
}

function seed(): Question[] {
  const q: Omit<Question, "id">[] = [
    { productId: "p4", productSlug: "cbd-balm-30g", asker: "Kavya R.", body: "Is this balm greasy, or does it absorb quickly?", createdAt: "2026-06-26", answer: "It absorbs quickly and isn't greasy — a little goes a long way.", answeredBy: "Vedic Botanicals", answeredAt: "2026-06-27", helpful: 9 },
    { productId: "p4", productSlug: "cbd-balm-30g", asker: "Arjun V.", body: "What is the shelf life once opened?", createdAt: "2026-06-19", answer: "Best used within 12 months of opening; store away from direct sunlight.", answeredBy: "Vedic Botanicals", answeredAt: "2026-06-20", helpful: 4 },
    { productId: "p1", productSlug: "hemp-seed-oil-250ml", asker: "Divya M.", body: "Can this be used for cooking on high heat?", createdAt: "2026-06-21", answer: "It's a finishing oil — drizzle it after cooking rather than frying with it.", answeredBy: "Himalayan Hemp Co.", answeredAt: "2026-06-22", helpful: 6 },
  ];
  return q.map((x, i) => ({ ...x, id: `qa-seed-${i + 1}` }));
}

function store(): QaStore {
  globalThis.__vhQuestions ??= { items: seed(), seq: 100 };
  return globalThis.__vhQuestions;
}

const now = () => new Date().toISOString().slice(0, 10);

export async function askQuestion(input: { productId: string; productSlug: string; asker: string; body: string }): Promise<Question> {
  const s = store();
  const q: Question = {
    id: `qa${s.seq++}`,
    productId: input.productId,
    productSlug: input.productSlug,
    asker: input.asker,
    body: input.body,
    createdAt: now(),
    helpful: 0,
  };
  s.items.unshift(q);
  return q;
}

/** Public Q&A for a product: answered first, then newest. Hidden ones omitted. */
export async function questionsFor(productId: string): Promise<Question[]> {
  return store().items
    .filter((q) => q.productId === productId && !q.hidden)
    .sort((a, b) => {
      const aa = a.answer ? 1 : 0, ab = b.answer ? 1 : 0;
      if (aa !== ab) return ab - aa;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
}

export async function questionsForSlugs(slugs: string[], opts?: { answered?: boolean }): Promise<Question[]> {
  const set = new Set(slugs);
  return store().items
    .filter((q) => set.has(q.productSlug) && !q.hidden && (opts?.answered === undefined || Boolean(q.answer) === opts.answered))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findQuestion(id: string): Question | undefined {
  return store().items.find((q) => q.id === id);
}

/** Recent questions across the marketplace (admin moderation view). */
export async function recentQuestions(limit = 30): Promise<Question[]> {
  return [...store().items].filter((q) => !q.hidden).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export type QaResult = { ok: true; question: Question } | { ok: false; reason: string };

/** The owning seller answers a question (copy-checked by the caller). */
export async function answerQuestion(id: string, answer: string, by: string): Promise<QaResult> {
  const q = findQuestion(id);
  if (!q || q.hidden) return { ok: false, reason: "missing" };
  q.answer = answer;
  q.answeredBy = by;
  q.answeredAt = now();
  return { ok: true, question: q };
}

export async function hideQuestion(id: string): Promise<QaResult> {
  const q = findQuestion(id);
  if (!q) return { ok: false, reason: "missing" };
  q.hidden = true;
  return { ok: true, question: q };
}

export async function markQuestionHelpful(id: string): Promise<boolean> {
  const q = findQuestion(id);
  if (!q || q.hidden || !q.answer) return false;
  q.helpful += 1;
  return true;
}
