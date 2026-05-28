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
  summarize:   'Fasse diese Email in 3–5 Sätzen zusammen.',
  translate:   'Übersetze diese Email vollständig ins Deutsche.',
  tasks:       'Extrahiere alle Aufgaben und To-dos als nummerierte Liste.',
  draftReply:  'Schreibe eine professionelle, kurze Antwort auf diese Email.',
  improve:     'Verbessere den folgenden Text stilistisch, behalte den Inhalt bei.',
};
