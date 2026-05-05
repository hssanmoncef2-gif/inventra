/**
 * Chatbot Route
 * Inventory-aware assistant powered by Claude API
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Inventory = require('../models/Inventory');

router.use(authenticate);

router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    // Fetch quick inventory stats to give context to the AI
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

    const systemPrompt = `You are an intelligent inventory management assistant for a business. 
You help users understand their inventory, answer questions, and provide actionable insights.

Current inventory snapshot:
- Total distinct items: ${stats?.totalItems || 0}
- Total units in stock: ${stats?.totalUnits || 0}
- Total inventory value: $${(stats?.totalValue || 0).toFixed(2)}
- Low stock alerts: ${stats?.lowStock || 0} items

User role: ${req.user.role}
User name: ${req.user.name}

Be concise, helpful, and business-focused. If asked about specific items you don't have data on, 
suggest the user check the inventory dashboard. Always respond in the same language as the user.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'AI service error');
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'I could not generate a response. Please try again.';

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Chatbot is temporarily unavailable',
      data: { reply: "I'm having trouble connecting right now. Please try again in a moment." },
    });
  }
});

module.exports = router;
