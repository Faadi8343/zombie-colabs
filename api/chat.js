// Vercel serverless chatbot: streams a plain-text answer from NVIDIA's OpenAI-compatible API.
// Env var (Vercel > Project > Settings > Environment Variables):
//   NVIDIA_API_KEY  - from build.nvidia.com
// ponytail: no rate limit or response cache; add Vercel KV / firewall rule if the endpoint gets abused.
const json = (body, status = 200) => Response.json(body, { status });

// Models tried in order; the next one is used if a model is retired or errors before streaming.
const MODELS = ['meta/llama-3.2-11b-vision-instruct'];

// The whole site is one page, so its content lives here instead of a RAG index. Keep in sync with index.html.
const SYSTEM = `You are the chat assistant on the Zombie Colabs website. Zombie Colabs is an AI & software agency ("AI & software that never sleeps"). Answer using ONLY the SITE CONTEXT below.

SITE CONTEXT:
Services:
- AI Automation & n8n: workflows that connect apps, think with AI and never forget a follow-up (n8n, Make, OpenAI, CRMs).
- AI Scrapers & Sheets: crawl the web, clean the data with AI, drop it into Google Sheets or a database (Python, Playwright, Sheets API, LLMs).
- Trading Bots: strategy-driven bots with backtesting, risk rules, live dashboards and alerts (Binance, MT5, exchange APIs, Telegram alerts).
- AI Chatbots: support and sales assistants trained on the client's business (RAG, WhatsApp, web widget, Claude / GPT).
- Custom Software & Web: websites, portals, dashboards, APIs and SaaS.
Work shown on the site:
- Lead Generation Engine: an n8n workflow that finds prospects, enriches and scores them with AI, puts hot ones in the CRM and sends personalised outreach.
- Sheet Automation / AI Scraper: crawls target sites, AI cleans and categorises the data, writes rows into Google Sheets.
- Trading Bots: rule-based and AI-assisted bots that place orders via exchange APIs, manage stop-losses and report to a live dashboard.
Process: 1) Dig up: a free call to find the tasks eating your time. 2) Stitch: we map the solution, pick the stack and give a clear scope and price. 3) Zap: we build, test and show progress every week. 4) Unleash: it goes live, we train your team and provide ongoing support.
Pricing: every build is custom; there are no fixed prices on the site. A scope and price come after the free call.
Contact: WhatsApp +92 331 9100383 (https://wa.me/923319100383), email info@zombiecolabs.com, or the contact form on this page. Replies within 24 hours. Also on LinkedIn (zombiecolabs), Instagram (@zombiecolabs) and TikTok (@zombie.colabs5).

RULES:
1. Be concise: a short paragraph or a compact "- " list, under about 100 words. Plain text only, no markdown.
2. Tone: friendly with a light zombie wink, but clear. Never let the joke get in the way of the answer.
3. Never invent prices, timelines, clients, guarantees or services that are not in the context. For price or timeline questions say it depends on scope and point to the free call.
4. If the context does not contain the answer, say so and give the WhatsApp number and email.
5. Trading bots are software we build. Never give financial or investment advice or promise profits.
6. Politely decline topics unrelated to Zombie Colabs and its services.
7. When the visitor sounds ready to start or wants a quote, tell them to message on WhatsApp or use the contact form.`;

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  // Only user/assistant turns from the client, capped in count and length; the system prompt is never client-supplied.
  const messages = (Array.isArray(body?.messages) ? body.messages : []).slice(-8)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 500) }));
  if (!messages.length || messages.at(-1).role !== 'user') return json({ error: 'Message is required.' }, 422);

  const key = process.env.NVIDIA_API_KEY;
  if (!key) return json({ error: 'Chatbot is not configured yet. Message us on WhatsApp instead.' }, 503);

  let upstream;
  for (const model of MODELS) {
    upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: true, max_tokens: 380, temperature: 0.2, top_p: 0.9,
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
      }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);
    if (upstream?.ok) break;
  }
  if (!upstream?.ok) {
    const busy = upstream?.status === 429;
    return json({ error: busy ? 'Too many brains being eaten right now. Try again in a moment.' : 'The bot is down. Message us on WhatsApp instead.' }, busy ? 429 : 502);
  }

  // SSE ("data: {json}" lines) in, plain text out.
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = '';
  const text = new TransformStream({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const piece = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
          if (piece) ctrl.enqueue(enc.encode(piece));
        } catch { /* partial or non-JSON keep-alive line */ }
      }
    },
  });
  return new Response(upstream.body.pipeThrough(text), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
  });
}
