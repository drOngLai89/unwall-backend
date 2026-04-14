import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-5.4',
  });
});

app.post('/v1/test', async (req, res) => {
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4',
      input: req.body?.input || 'Say hello from Unwall.',
    });

    res.json({ ok: true, output: response.output_text });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error?.message || 'OpenAI request failed',
    });
  }
});

app.listen(port, () => {
  console.log(`Unwall API running on port ${port}`);
});
