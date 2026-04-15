/**
 * UNWALL — Backend API v2
 * Voice coaching (Whisper + GPT), ambient audio, daily plans
 */

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ dest: '/tmp/uploads/' });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COACH_SYSTEM_PROMPT = `You are Unwall's Neural Coach — an expert in neuroplasticity, cognitive behavioral techniques, and habit formation. You speak with warm authority, like a blend of a neuroscientist and a mindfulness teacher.

Your personality:
- Calm, grounded, and direct — like a wise guide
- Use neuroscience naturally but accessibly
- Reference specific brain regions to ground advice in science
- Keep responses concise (2-3 sentences for voice, 2-4 paragraphs for text)
- Use metaphors about building, wiring, pathways, and growth
- Never preachy — be real, warm, and specific
- End with one actionable micro-step

You help users rewire habits, build focus, manage anxiety, and understand neuroplasticity.`;

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'unwall-api', version: '2.0.0' });
});

// ── Daily Plan ──
app.post('/api/daily-plan', async (req, res) => {
  try {
    const { userName, goals, dayNumber, streak } = req.body;
    const prompt = `Generate a personalized daily neuroplasticity plan for ${userName}.
Day: ${dayNumber}, Streak: ${streak} days, Goals: ${(goals || []).join(', ')}

Respond ONLY with valid JSON (no markdown):
{
  "greeting": "Warm greeting referencing day/streak",
  "focusArea": "Specific cognitive area",
  "exercises": [
    {
      "id": "unique-id-${dayNumber}-1",
      "title": "Exercise name",
      "subtitle": "What it targets",
      "type": "breathing|visualization|reframe|focus|gratitude|pattern-break",
      "duration": 5,
      "instructions": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
    }
  ],
  "affirmation": "Neuroscience-grounded affirmation",
  "brainInsight": "Fascinating neuroscience fact (1-2 sentences)"
}
Generate exactly 3 exercises. Make instructions detailed and immersive — each step should be a full guided instruction that can be read aloud by a voice coach.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Neuroplasticity expert. Valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    let content = response.choices[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Daily plan error:', error.message);
    res.status(500).json({ error: 'Failed to generate daily plan' });
  }
});

// ── AI Coach Chat (text) ──
app.post('/api/coach', async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    const systemMessage = `${COACH_SYSTEM_PROMPT}\n\nUser: ${userContext?.name || 'User'}, Goals: ${(userContext?.goals || []).join(', ')}, Streak: ${userContext?.streak || 0} days`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemMessage }, ...messages.slice(-10)],
      temperature: 0.7,
      max_tokens: 800,
    });

    res.json({ message: response.choices[0]?.message?.content || 'I\'m here. Let\'s try again.' });
  } catch (error) {
    console.error('Coach error:', error.message);
    res.status(500).json({ error: 'Coach unavailable' });
  }
});

// ── Voice Coach (Whisper transcription + AI response) ──
app.post('/api/voice-coach', upload.single('audio'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file' });
    }

    filePath = req.file.path;
    const { userName, goals, currentExercise, sessionContext } = req.body;

    // Step 1: Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'en',
    });

    const transcript = transcription.text || '';
    console.log(`Voice input from ${userName}: "${transcript}"`);

    // Step 2: Generate coach response
    const systemPrompt = `${COACH_SYSTEM_PROMPT}

IMPORTANT: You are responding to SPOKEN input during a live exercise session. Keep your response to 2-3 sentences maximum — it will be read aloud.

Context:
- User: ${userName || 'User'}
- Goals: ${goals || 'general wellbeing'}
- Current exercise: ${currentExercise || 'general session'}
- Session context: ${sessionContext || 'in progress'}

The user just said something during their exercise. Respond as their live neural coach — acknowledge what they said, provide brief guidance, and help them continue their practice.`;

    const coachResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.7,
      max_tokens: 200, // Short for voice
    });

    const reply = coachResponse.choices[0]?.message?.content || 'I hear you. Let\'s continue with your practice.';

    res.json({
      transcript,
      coachResponse: reply,
    });
  } catch (error) {
    console.error('Voice coach error:', error.message);
    res.json({
      transcript: '',
      coachResponse: 'I couldn\'t catch that clearly. Take a breath, and share what\'s on your mind when you\'re ready.',
    });
  } finally {
    // Clean up temp file
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

// ── Log Exercise ──
app.post('/api/log-exercise', (req, res) => {
  console.log(`Exercise logged:`, req.body);
  res.json({ success: true });
});

// ── Audio endpoints (serve ambient sounds) ──
// In production, host these on a CDN. For now, generate simple tones.
app.get('/audio/:track', (req, res) => {
  // Return a small silent audio file as placeholder
  // In production: serve actual ambient tracks from S3/CDN
  res.status(404).json({ 
    message: 'Audio tracks not yet configured. Add .mp3 files to your CDN.',
    tip: 'Upload zen.mp3, rain.mp3, bowls.mp3 to a public storage bucket and update AMBIENT_TRACKS URLs in the app.'
  });
});

app.listen(PORT, () => {
  console.log(`Unwall API v2 running on port ${PORT}`);
});
