// Vercel serverless twin of contact.php: validates and emails the lead via Resend.
// Env vars (Vercel > Project > Settings > Environment Variables):
//   RESEND_API_KEY  - from resend.com
//   CONTACT_TO      - inbox that receives leads
//   CONTACT_FROM    - optional verified sender, defaults to Resend's test sender
const json = (body, status = 200) => Response.json(body, { status });
const oneLine = s => s.replace(/[\r\n]+/g, ' ');

export async function POST(request) {
  let f;
  try { f = await request.formData(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  if (f.get('website')) return json({ ok: true }); // honeypot

  const get = k => String(f.get(k) ?? '').trim();
  const name = get('name'), email = get('email'), service = get('service'), message = get('message');
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150
      || !service || service.length > 60 || !message || message.length > 3000) {
    return json({ ok: false, error: 'Invalid input' }, 422);
  }

  const { RESEND_API_KEY: key, CONTACT_TO: to, CONTACT_FROM: from = 'Zombie Colabs <onboarding@resend.dev>' } = process.env;
  if (!key || !to) return json({ ok: false, error: 'Mail not configured' }, 503);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], reply_to: oneLine(email),
      subject: oneLine(`New lead: ${service} — ${name}`),
      text: `Name: ${name}\nEmail: ${email}\nService: ${service}\n\n${message}`,
    }),
  });
  return res.ok ? json({ ok: true }) : json({ ok: false, error: 'Mail failed' }, 502);
}
