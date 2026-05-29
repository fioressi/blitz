const PDM_API = 'https://pdm-api.azurewebsites.net/api';

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000);
}

// ── /api/igor-translate — fast path, kein OpenClaw ───────────────────────────

type TranslateKind = 'translate' | 'summarize' | 'extract' | 'classify' | 'transform';

interface TranslateRequest {
  kind: TranslateKind;
  instruction: string;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  async?: false;
}

interface TranslateResponse {
  status: 'ok' | 'error';
  result: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

async function callIgorTranslate(body: TranslateRequest): Promise<TranslateResponse> {
  const res = await fetch(`${PDM_API}/igor-translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Igor Translate ${res.status}: ${text}`);
  }
  return res.json();
}

// Returns the plain text from result.text (for all prose-output operations)
async function igorFastText(
  kind: TranslateKind,
  instruction: string,
  inputText: string,
  contextData?: Record<string, unknown>,
): Promise<string> {
  const data = await callIgorTranslate({
    kind,
    instruction,
    input: { text: inputText },
    ...(contextData ? { context: contextData } : {}),
    responseSchema: { type: 'object', properties: { text: { type: 'string' } } },
  });
  return String(data.result?.text ?? '').trim();
}

// ── /api/igor-agent — agent path, OpenClaw, isolated session ─────────────────

interface AgentRequest {
  instruction: string;
  input?: Record<string, unknown>;
  context?: Record<string, unknown>;
  callback?: { url: string; method: string; headers: Record<string, string> };
}

export async function callIgorAgent(body: AgentRequest): Promise<{ status: string; result?: unknown }> {
  const res = await fetch(`${PDM_API}/igor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Igor Agent ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Public: email/compose operations (fast path) ─────────────────────────────

export async function askIgor(opts: {
  question: string;
  emailBody?: string;
  emailSubject?: string;
  context?: string;
  input?: string;
}): Promise<string> {
  const inputText = opts.input ?? (opts.emailBody ? stripHtml(opts.emailBody) : '');
  const contextData = opts.context
    ? { instructions: opts.context }
    : opts.emailSubject
    ? { subject: `Betreff: ${opts.emailSubject}` }
    : undefined;
  return igorFastText('transform', opts.question, inputText, contextData);
}

// ── Public: BlitzBrett board analysis ────────────────────────────────────────

export async function askIgorBoard(opts: {
  question: string;
  systemContext: string;
  boardData: string;
}): Promise<string> {
  return igorFastText('summarize', opts.question, opts.boardData, {
    system: opts.systemContext,
  });
}

// ── Public: structured translation (tasks, multi-language fields) ─────────────

export async function igorTranslate(opts: {
  instruction: string;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const data = await callIgorTranslate({ kind: 'translate', ...opts });
  return data.result;
}

// ── Public: entity suggestion ─────────────────────────────────────────────────

export interface EntitySuggestion {
  type: string;
  id: number;
  label: string;
  subLabel?: string;
}

function buildEntityContext(entities: EntitySuggestion[]): string {
  const byType: Record<string, EntitySuggestion[]> = {};
  for (const e of entities) {
    (byType[e.type] ??= []).push(e);
  }
  const lines: string[] = ['Verfügbare PDM-Entitäten (aus der Datenbank):'];
  const labels: Record<string, string> = { PROJECT: 'PROJEKTE', ORDER: 'PURCHASE ORDERS', TASK: 'TASKS' };
  for (const [type, items] of Object.entries(byType)) {
    lines.push(`\n${labels[type] ?? type}:`);
    for (const e of items) {
      lines.push(`  - id:${e.id} "${e.label}"${e.subLabel ? ` [${e.subLabel}]` : ''}`);
    }
  }
  return lines.join('\n');
}

export async function suggestEntityLinks(opts: {
  emailBody: string;
  emailSubject: string;
  entities: EntitySuggestion[];
}): Promise<EntitySuggestion[]> {
  if (opts.entities.length === 0) return [];

  const instruction = `Analysiere die Email und finde PDM-Entitäten aus der bereitgestellten Liste die inhaltlich relevant sind.
Relevanzkriterien: Projektnummer/Name erwähnt, Bestellnummer (PO-...) vorkommt, Inhalt passt thematisch zu einem Projekt/Auftrag, Task aus der Liste wird erwähnt.
Antwortformat: AUSSCHLIESSLICH ein gültiges JSON-Array.
Beispiel: [{"type":"PROJECT","id":42,"label":"H26001"},{"type":"ORDER","id":101,"label":"PO-26000079"}]
Regeln: Nur Entitäten aus der Liste (gleiche id). Maximal 5. Leeres Array [] wenn keine Übereinstimmung.`;

  const data = await callIgorTranslate({
    kind: 'extract',
    instruction,
    input: { text: stripHtml(opts.emailBody) },
    context: { subject: opts.emailSubject, entities: buildEntityContext(opts.entities) },
    responseSchema: { type: 'array' },
  });

  // result may be an array directly, or a string we need to parse
  let parsed: Array<{ type: string; id: number; label: string }> = [];
  if (Array.isArray(data.result)) {
    parsed = data.result as typeof parsed;
  } else {
    const raw = String(data.result ?? '');
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    try { parsed = JSON.parse(match[0]); } catch { return []; }
  }

  const known = new Map(opts.entities.map(e => [`${e.type}:${e.id}`, e]));
  return parsed
    .filter(s => s && known.has(`${s.type}:${s.id}`))
    .map(s => known.get(`${s.type}:${s.id}`)!);
}

// Convenience wrapper used by ComposeModal / EmailDetail
export async function translateTextToGerman(opts: {
  text: string;
  subject?: string;
}): Promise<string> {
  return igorFastText(
    'translate',
    'Übersetze den folgenden Text vollständig und sauber ins Deutsche. Behalte Sinn, Ton und Struktur bei. Liefere nur die Übersetzung.',
    opts.text,
    opts.subject ? { subject: opts.subject } : undefined,
  );
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export const IGOR_PROMPTS = {
  summarize: `Fasse die folgende Email prägnant zusammen.
Struktur:
• Worum geht es? (1 Satz)
• Wichtigste Punkte (2–3 Bullets)
• Handlungsbedarf (falls vorhanden, sonst weglassen)
Antworte auf Deutsch.`,

  translate: `Übersetze die folgende Email vollständig ins Deutsche.
Behalte Ton, Anrede und Formatierung des Originals bei.
Gib nur die Übersetzung aus — keine Erklärungen, kein Präambel.`,

  tasks: `Extrahiere alle Aufgaben, To-dos und Handlungspunkte aus der folgenden Email.
Format: nummerierte Liste, ein Punkt pro Zeile.
Für jeden Punkt: Was ist zu tun? Verantwortlicher und Deadline angeben, falls in der Email erwähnt.
Falls keine konkreten Aufgaben vorhanden: Schreibe nur "Keine Aufgaben gefunden."
Antworte auf Deutsch.`,

  draftReply: `Schreibe eine professionelle Antwort auf die folgende Email.
Regeln:
• Ton: freundlich, klar, auf den Punkt
• Sprache: dieselbe wie die Ursprungsemail
• Adressiere alle gestellten Fragen und Punkte
• Kein Betreff, keine Signatur — nur den Fließtext der Antwort
• Maximal 150 Wörter`,

  improve: `Verbessere den folgenden Text sprachlich und stilistisch.
Regeln:
• Inhalt und Kernaussagen bleiben unverändert
• Verbessere Grammatik, Satzbau und Professionalität
• Behalte die Sprache des Originals bei (Deutsch bleibt Deutsch, Englisch bleibt Englisch)
• Gib nur den verbesserten Text aus — keine Erklärungen, kein Kommentar`,
};
