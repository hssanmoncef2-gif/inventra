/**
 * Chatbot Route — Ollama (free, open-source, self-hosted)
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Inventory = require('../models/Inventory');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/** Ensure Ollama is reachable and model exists, pull if needed */
async function ensureModel() {
  const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!tagsRes.ok) throw new Error('Ollama server not reachable');
  const body = await tagsRes.json();
  const models = Array.isArray(body.models) ? body.models : [];
  const exists = models.some(
    (m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL + ':')
  );
  if (!exists) {
    console.log(`[chatbot] Pulling model "${OLLAMA_MODEL}"...`);
    const pullRes = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: OLLAMA_MODEL, stream: false }),
    });
    if (!pullRes.ok) throw new Error(`Pull failed: ${await pullRes.text()}`);
    console.log(`[chatbot] Model "${OLLAMA_MODEL}" ready.`);
  }
}

// ── Health check (GET /api/chatbot/health) ─────────────────────────────────
router.get('/health', authenticate, async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    const body = await r.json();
    const models = Array.isArray(body.models) ? body.models : [];
    const modelReady = models.some(
      (m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL + ':')
    );

    return res.json({
      success: true,
      data: {
        ollamaReachable: true,
        modelReady,
        activeModel: OLLAMA_MODEL,
        availableModels: models.map((m) => m.name),
      },
    });
  } catch (err) {
    return res.json({
      success: false,
      data: { ollamaReachable: false, modelReady: false, activeModel: OLLAMA_MODEL },
    });
  }
});

// ── Chat (POST /api/chatbot/chat) ──────────────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  const { message } = req.body;

  // Defensively ensure history is always a plain array
  const rawHistory = req.body.history;
  const history = Array.isArray(rawHistory) ? rawHistory : [];

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    // Inventory context
    const [stats] = await Inventory.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          lowStock: { $sum: { $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0] } },
        },
      },
    ]);

    const systemPrompt = `You are an intelligent inventory management assistant.
Current inventory snapshot:
- Total distinct items: ${stats?.totalItems || 0}
- Total units in stock: ${stats?.totalUnits || 0}
- Total inventory value: ${(stats?.totalValue || 0).toFixed(2)} TND
- Low stock alerts: ${stats?.lowStock || 0} items
User: ${req.user.name} (${req.user.role})
Be concise and helpful. Always reply in the same language as the user.`;

    await ensureModel();

    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
        options: { temperature: 0.7, num_predict: 512 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat error: ${await response.text()}`);
    }

    const data = await response.json();
    const reply = data.message?.content || 'No response generated.';
    return res.json({ success: true, data: { reply } });

  } catch (err) {
    console.error('[chatbot] Error:', err.message);
    const isDown =
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('fetch failed') ||
      err.message.includes('not reachable');

    return res.status(500).json({
      success: false,
      message: 'Chatbot error',
      data: {
        reply: isDown
          ? '⏳ The AI model is still loading. Please wait a minute and try again.'
          : `⚠️ ${err.message}`,
      },
    });
  }
});

module.exports = router;
