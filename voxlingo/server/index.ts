import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  app.post('/translate', async (req: Request, res: Response) => {
    const { audio, sourceLang, targetLang } = req.body;

    if (!audio || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: audio, sourceLang, targetLang' });
      return;
    }

    const prompt = `Transcribe the following audio spoken in ${sourceLang}. Then translate the transcription to ${targetLang}. Return JSON only: { "originalText": "...", "translatedText": "..." }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'audio/wav', data: audio } },
              { text: prompt },
            ],
          },
        ],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse Gemini response' });
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json({
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      res.status(500).json({ error: message });
    }
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`VoxLingo server running on port ${port}`);
  });
}
