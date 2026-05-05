/**
 * Chatbot Route — Groq (free, cloud-hosted LLaMA)
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Inventory = require('../models/Inventory');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama3-8b-8192';

// ── Health check (GET /api/chatbot/health) ─────────────────────────────────
router.get('/health', authenticate, async (req, res) => {
  return res.json({
    success: true,
    data: {
      groqReachable: !!GROQ_API_KEY,
      modelReady: !!GROQ_API_KEY,
      activeModel: GROQ_MODEL,
    },
  });
});

// ── Chat (POST /api/chatbot/chat) ──────────────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  const { message } = req.body;
  const rawHistory = req.body.history;
  const history = Array.isArray(rawHistory) ? rawHistory : [];

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ success: false, message: 'Groq API key not configured' });
  }

  try {
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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq error: ${await response.text()}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';
    return res.json({ success: true, data: { reply } });

  } catch (err) {
    console.error('[chatbot] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Chatbot error',
      data: { reply: `⚠️ ${err.message}` },
    });
  }
});

module.exports = router;
