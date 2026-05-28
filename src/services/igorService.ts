const PDM_API = 'https://pdm-api.azurewebsites.net/api';

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000); // cap context length
}

export async function askIgor(opts: {
  question: string;
  emailBody?: string;
  emailSubject?: string;
  context?: string; // explicit context override (takes precedence over emailSubject)
}): Promise<string> {
  const context = opts.context
    ?? (opts.emailSubject ? `Betreff: ${opts.emailSubject}` : undefined);
  const input = opts.emailBody ? stripHtml(opts.emailBody) : undefined;

  const res = await fetch(`${PDM_API}/igor-ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: opts.question,
      ...(context ? { context } : {}),
      ...(input   ? { input }   : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Igor ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.answer || '').trim();
}

export interface EntitySuggestion {
  type: string;   // PROJECT | ORDER | TASK
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

  const question = `Analysiere die folgende Email und finde heraus, welche PDM-Entitäten aus der bereitgestellten Liste inhaltlich relevant sind.

Relevanzkriterien — mindestens eines muss zutreffen:
• Eine Projektnummer, Projektcode oder Projektname wird direkt erwähnt oder klar impliziert
• Eine Bestellnummer (z.B. PO-...) oder ein Auftragsname kommt vor
• Der Inhalt passt thematisch eindeutig zu einem konkreten Projekt oder Auftrag
• Eine Aufgabe wird erwähnt, die einem offenen Task aus der Liste entspricht

Antwortformat: AUSSCHLIESSLICH ein gültiges JSON-Array, kein Text davor oder danach.
Beispiel: [{"type":"PROJECT","id":42,"label":"H26001"},{"type":"ORDER","id":101,"label":"PO-26000079"}]
Regeln:
• Nur Entitäten verwenden die exakt in der bereitgestellten Liste vorkommen (gleiche id)
• Maximal 5 Vorschläge, nur bei echter Relevanz
• Leeres Array [] wenn keine eindeutige Übereinstimmung erkennbar ist`;

  const context = `Betreff: ${opts.emailSubject}\n\n${buildEntityContext(opts.entities)}`;

  const raw = await askIgor({
    question,
    emailBody: opts.emailBody,
    context,
  });

  // Igor sometimes wraps the array in text — extract the first JSON array found
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as Array<{ type: string; id: number; label: string }>;
    if (!Array.isArray(parsed)) return [];
    const known = new Map(opts.entities.map(e => [`${e.type}:${e.id}`, e]));
    return parsed
      .filter(s => s && known.has(`${s.type}:${s.id}`))
      .map(s => known.get(`${s.type}:${s.id}`)!);
  } catch {
    return [];
  }
}

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
