// Rate limit: max requests per IP per hour
const RATE_LIMIT = 30 // 30 chamadas por hora por usuário
const WINDOW_MS = 60 * 60 * 1000 // 1 hora
const requests = new Map() // IP -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now()
  const record = requests.get(ip)
  if (!record || now > record.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }
  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count }
}

// Limpar IPs antigos periodicamente (evita memory leak)
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of requests) {
    if (now > record.resetAt) requests.delete(ip)
  }
}, 10 * 60 * 1000) // limpa a cada 10 min

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  const limit = checkRateLimit(ip)
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT)
  res.setHeader('X-RateLimit-Remaining', limit.remaining)
  if (!limit.allowed) {
    return res.status(429).json({
      error: { message: `Limite de ${RATE_LIMIT} consultas por hora atingido. Tente novamente em ${limit.retryAfter} segundos.` }
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "API key não configurada" } });

  try {
    const body = req.body;
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 4_000_000) {
      return res.status(413).json({ error: { message: "PDF muito grande. Tente um arquivo menor ou use Excel/CSV." } });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25"
      },
      body: bodyStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: { message: "Tempo esgotado. O PDF é muito grande — tente um menor ou use Excel/CSV." } });
    }
    return res.status(500).json({ error: { message: "Erro interno: " + err.message } });
  }
}
