/**
 * UNWALL — Backend API
 * Node.js + Express + OpenAI
 * Deployed on Render at https://unwall-backend.onrender.com
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// OpenAI client — uses OPENAI_API_KEY env var on Render
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the neural coach
const COACH_SYSTEM_PROMPT = `You are Unwall's Neural Coach — an expert in neuroplasticity, cognitive behavioral techniques, and habit formation. You speak with warm authority, like a blend of a neuroscientist and a mindfulness teacher.

Your personality:
- Calm, grounded, and direct
- Use neuroscience terminology naturally but explain it accessibly
- Occasionally reference specific brain regions (prefrontal cortex, amygdala, hippocampus) to ground advice in science
- Keep responses concise but meaningful (2-4 paragraphs max)
- Use metaphors that relate to building, wiring, and pathways
- Never be preachy or overly motivational — be real and warm
- End responses with a specific, actionable micro-step the user can take right now

You help users:
- Understand how their brain creates and breaks habits
- Develop personalized neuroplasticity exercises
- Reframe negative thought patterns
- Build focus and attention
- Navigate emotional regulation
- Create sustainable behavior change`;

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'unwall-api', version: '1.0.0' });
});

// ── Daily Plan ──
app.post('/api/daily-plan', async (req, res) => {
  try {
    const { userName, goals, dayNumber, streak } = req.body;

    const prompt = `Generate a personalized daily neuroplasticity plan for ${userName}.

Day: ${dayNumber}
Current streak: ${streak} days
Goals: ${goals.join(', ')}

Respond ONLY with a valid JSON object (no markdown, no code fences) in this exact format:
{
  "greeting": "A brief, warm greeting for the user addressing them by name. Reference their day number or streak if impressive.",
  "focusArea": "One specific cognitive area to focus on today (e.g., 'Cognitive Flexibility', 'Emotional Regulation', 'Sustained Attention')",
  "exercises": [
    {
      "id": "unique-id-${dayNumber}-1",
      "title": "Exercise name",
      "subtitle": "Brief description of what it targets",
      "type": "one of: breathing, visualization, reframe, focus, gratitude, pattern-break",
      "duration": 5,
      "instructions": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
    }
  ],
  "affirmation": "A neuroscience-grounded affirmation (not generic motivational — reference neural pathways, brain plasticity, etc.)",
  "brainInsight": "A fascinating, specific neuroscience fact relevant to today's focus area (1-2 sentences)"
}

Generate exactly 3 exercises. Make each one unique and progressively challenging. Tailor to their goals.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a neuroplasticity expert. Respond only with valid JSON. No markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    let content = response.choices[0]?.message?.content || '';
    // Clean potential markdown fences
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const plan = JSON.parse(content);
    res.json(plan);
  } catch (error) {
    console.error('Daily plan error:', error.message);
    res.status(500).json({ error: 'Failed to generate daily plan' });
  }
});

// ── AI Coach Chat ──
app.post('/api/coach', async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    
    const systemMessage = `${COACH_SYSTEM_PROMPT}

User context:
- Name: ${userContext?.name || 'User'}
- Goals: ${userContext?.goals?.join(', ') || 'general wellbeing'}
- Current streak: ${userContext?.streak || 0} days`;

    const chatMessages = [
      { role: 'system', content: systemMessage },
      ...messages.slice(-10), // Keep last 10 messages for context
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const reply = response.choices[0]?.message?.content || 'I\'m here. Let\'s try that again.';
    res.json({ message: reply });
  } catch (error) {
    console.error('Coach error:', error.message);
    res.status(500).json({ error: 'Coach unavailable' });
  }
});

// ── Log Exercise ──
app.post('/api/log-exercise', (req, res) => {
  const { exerciseId, duration, rating, completedAt } = req.body;
  // In production, save to database — for now, acknowledge
  console.log(`Exercise logged: ${exerciseId}, ${duration}min, rating: ${rating}`);
  res.json({ success: true });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`Unwall API running on port ${PORT}`);
});
