import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getSeriesMetadata,
  getRecommendations,
  generateContent,
  generateContentStream,
  formatGeminiError,
  DEFAULT_MODEL,
} from './server/geminiApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Status check endpoint
app.get('/api/gemini/status', (_req, res) => {
  res.json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: DEFAULT_MODEL,
  });
});

// Auto-fill series metadata
app.post('/api/gemini/metadata', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Missing title query parameter.' });
      return;
    }
    const data = await getSeriesMetadata(query.trim());
    res.json(data);
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    console.error('Gemini metadata error:', formatted.message);
    res.status(500).json({ error: formatted.message });
  }
});

// Curated recommendations
app.post('/api/gemini/recommendations', async (req, res) => {
  try {
    const { favoriteTitles, topGenres } = req.body;
    const recommendations = await getRecommendations(
      Array.isArray(favoriteTitles) ? favoriteTitles : [],
      Array.isArray(topGenres) ? topGenres : [],
    );
    res.json(recommendations);
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    console.error('Gemini recommendations error:', formatted.message);
    res.status(500).json({ error: formatted.message });
  }
});

// General text generation
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt parameter.' });
      return;
    }
    const text = await generateContent(prompt, systemInstruction);
    res.json({ text });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    console.error('Gemini generate error:', formatted.message);
    res.status(500).json({ error: formatted.message });
  }
});

// Streaming text generation (SSE)
app.post('/api/gemini/generate-stream', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt parameter.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of generateContentStream(prompt, systemInstruction)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    console.error('Gemini streaming error:', formatted.message);
    if (!res.headersSent) {
      res.status(500).json({ error: formatted.message });
    } else {
      res.end();
    }
  }
});

// Serve frontend build in production
const staticDir = path.resolve(__dirname, 'app/dist');
app.use(express.static(staticDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
