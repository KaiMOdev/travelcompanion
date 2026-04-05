import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash';

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', zh: 'Mandarin Chinese', hi: 'Hindi',
  ja: 'Japanese', ko: 'Korean', th: 'Thai', vi: 'Vietnamese',
  id: 'Indonesian', tl: 'Tagalog', pt: 'Portuguese', it: 'Italian',
  ru: 'Russian', tr: 'Turkish', pl: 'Polish', nl: 'Dutch', ar: 'Arabic',
  fr: 'French', de: 'German', sv: 'Swedish', no: 'Norwegian',
  da: 'Danish', fi: 'Finnish', el: 'Greek', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', hr: 'Croatian',
};

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  app.post('/translate', async (req: Request, res: Response) => {
    const { audio, sourceLang, targetLang, mimeType } = req.body;
    const audioMime = mimeType || 'audio/mp4';

    if (!audio || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: audio, sourceLang, targetLang' });
      return;
    }

    if (!LANG_NAMES[sourceLang] || !LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const sourceName = LANG_NAMES[sourceLang];
    const targetName = LANG_NAMES[targetLang];
    const prompt = `You are a travel translator. Transcribe the following audio spoken in ${sourceName}. Then translate the transcription to ${targetName}.

Rules:
- The translatedText MUST be in ${targetName}, not English
- Use natural, conversational ${targetName} (not overly formal or robotic)
- Preserve the speaker's tone (casual, polite, urgent, etc.)
- Handle slang, idioms, and colloquialisms naturally — translate the meaning, not word-for-word
- If the audio is unclear, provide your best interpretation

Return JSON only: { "originalText": "...", "translatedText": "..." }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: audioMime, data: audio } },
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
      if (!parsed.originalText || !parsed.translatedText) {
        res.status(500).json({ error: 'Incomplete response from Gemini' });
        return;
      }
      res.json({
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/vision', async (req: Request, res: Response) => {
    const { image, targetLang } = req.body;

    if (!image || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: image, targetLang' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const prompt = `Detect all text in this image. Identify the language. Translate all detected text to ${targetName}. The translatedText MUST be in ${targetName}, not English. Return JSON only: { "detectedLanguage": "...", "originalText": "...", "translatedText": "..." }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: image } },
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
      if (!parsed.detectedLanguage || !parsed.originalText || !parsed.translatedText) {
        res.status(500).json({ error: 'Incomplete response from Gemini' });
        return;
      }

      res.json({
        detectedLanguage: parsed.detectedLanguage,
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vision translation failed';
      res.status(500).json({ error: message });
    }
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  const app = createApp();
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`VoxLingo server running on 0.0.0.0:${port}`);
  });
}
