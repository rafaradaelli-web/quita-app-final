// api/decrypt-xlsx.js
// Recebe Excel criptografado + senha via POST JSON (base64) e devolve Excel limpo (base64).
// Protege CPU/rede com limite de 10MB no body.

import officeCrypto from 'officecrypto-tool';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { fileBase64, password } = req.body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'missing_file' });
    }
    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'missing_password' });
    }

    // Decodifica base64 -> Buffer
    const buffer = Buffer.from(fileBase64, 'base64');

    // Limite de 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'file_too_large' });
    }

    // Verifica se está criptografado
    let isEncrypted = false;
    try {
      isEncrypted = officeCrypto.isEncrypted(buffer);
    } catch (e) {
      return res.status(400).json({ error: 'invalid_xlsx' });
    }

    if (!isEncrypted) {
      // Não está criptografado - devolve o arquivo do jeito que veio
      return res.status(200).json({
        ok: true,
        wasEncrypted: false,
        fileBase64: fileBase64,
      });
    }

    // Descriptografa
    let decrypted;
    try {
      decrypted = await officeCrypto.decrypt(buffer, { password });
    } catch (err) {
      const msg = String(err && err.message || err).toLowerCase();
      if (msg.includes('password') || msg.includes('incorrect')) {
        return res.status(401).json({ error: 'wrong_password' });
      }
      return res.status(500).json({ error: 'decrypt_failed', detail: String(err.message || err) });
    }

    return res.status(200).json({
      ok: true,
      wasEncrypted: true,
      fileBase64: decrypted.toString('base64'),
    });
  } catch (err) {
    console.error('[decrypt-xlsx] error:', err);
    return res.status(500).json({ error: 'internal', detail: String(err.message || err) });
  }
}

// Aumenta o limite de body do Vercel (default é ~1MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
