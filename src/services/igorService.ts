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
}): Promise<string> {
  const context = opts.emailSubject ? `Betreff: ${opts.emailSubject}` : undefined;
  const input = opts.emailBody
    ? stripHtml(opts.emailBody)
    : undefined;

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
