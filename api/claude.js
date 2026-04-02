export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
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
