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

const COUNTRY_LANGS: Record<string, string> = {
  JP: 'Japanese', TH: 'Thai', IT: 'Italian', ES: 'Spanish',
  FR: 'French', DE: 'German', KR: 'Korean', CN: 'Mandarin Chinese',
  VN: 'Vietnamese', ID: 'Indonesian', BR: 'Portuguese', MX: 'Spanish',
  TR: 'Turkish', NL: 'Dutch', PL: 'Polish', GR: 'Greek',
  PT: 'Portuguese', CZ: 'Czech', HU: 'Hungarian', HR: 'Croatian',
  RO: 'Romanian', SE: 'Swedish', NO: 'Norwegian', DK: 'Danish',
  FI: 'Finnish', RU: 'Russian', UA: 'Ukrainian', IN: 'Hindi',
  PH: 'Tagalog', SA: 'Arabic',
};

// Simple in-memory cache for destination content
const phraseCache = new Map<string, { data: unknown[]; timestamp: number }>();
const tipCache = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

  app.post('/translate/stream', async (req: Request, res: Response) => {
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

    // Two-phase streaming: first transcribe, then translate
    // This lets the client show the original text while translation is in progress
    const transcribePrompt = `Transcribe the following audio spoken in ${sourceName}. Return JSON only: { "originalText": "..." }`;
    const translatePrompt = `Translate the following text from ${sourceName} to ${targetName}.

Rules:
- The translation MUST be in ${targetName}
- Use natural, conversational ${targetName} (not overly formal or robotic)
- Preserve the speaker's tone (casual, polite, urgent, etc.)
- Handle slang, idioms, and colloquialisms naturally

Return JSON only: { "translatedText": "..." }`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      // Phase 1: Transcribe
      const transcribeResult = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: audioMime, data: audio } },
              { text: transcribePrompt },
            ],
          },
        ],
      });

      const transcribeText = transcribeResult.text ?? '';
      const transcribeMatch = transcribeText.match(/\{[\s\S]*\}/);
      if (!transcribeMatch) {
        res.write(`data: ${JSON.stringify({ error: 'Failed to transcribe audio' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const transcribed = JSON.parse(transcribeMatch[0]);
      const originalText = transcribed.originalText || '';

      // Send original text immediately
      res.write(`data: ${JSON.stringify({ originalText })}\n\n`);

      // Phase 2: Translate
      const translateResult = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `Text to translate: "${originalText}"\n\n${translatePrompt}` },
            ],
          },
        ],
      });

      const translateText = translateResult.text ?? '';
      const translateMatch = translateText.match(/\{[\s\S]*\}/);
      if (!translateMatch) {
        res.write(`data: ${JSON.stringify({ error: 'Failed to translate' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const translated = JSON.parse(translateMatch[0]);

      // Send translation
      res.write(`data: ${JSON.stringify({ originalText, translatedText: translated.translatedText })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

  app.post('/vision', async (req: Request, res: Response) => {
    const { image, targetLang, dietaryPreferences } = req.body;

    if (!image || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: image, targetLang' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const dietaryNote = dietaryPreferences?.length
      ? `The user has these dietary restrictions: ${dietaryPreferences.join(', ')}. Flag any items that may conflict.`
      : '';

    const prompt = `Analyze this image and determine what type of content it shows.

**Step 1: Classify** — Is this a restaurant menu, a sign/notice, or general text?

**Step 2: Respond based on type:**

If MENU (food/drink list with items and prices):
Return a JSON object with contentType "menu". For each menu item:
- original: text as written
- translated: translated to ${targetName}
- description: 1-sentence explanation of what this dish/drink is
- possibleAllergens: array of common allergens that this dish LIKELY contains based on its name and typical ingredients. Use these categories: wheat, egg, dairy, nuts, peanuts, soy, shellfish, fish, sesame, pork, beef. Only include allergens you are reasonably confident about.
- allergenConfidence: "high" if ingredients are explicitly listed, "medium" if inferred from dish name and cuisine, "low" if uncertain
- dietary: array of applicable tags from: "vegetarian", "vegan", "halal", "kosher" — only include if confident
- popular: true if this is a well-known or commonly recommended dish
${dietaryNote}

Format: { "contentType": "menu", "detectedLanguage": "...", "items": [...], "disclaimer": "AI-detected from menu text. Always confirm with staff for serious allergies." }

If SIGN (directional, informational, warning, transit, store hours, etc.):
Translate the text and add practical context for a traveler.

Format: { "contentType": "sign", "detectedLanguage": "...", "originalText": "...", "translatedText": "...", "context": "Practical explanation of what this means and what the traveler should do." }

If GENERAL TEXT (anything else):
Translate the text.

Format: { "contentType": "general", "detectedLanguage": "...", "originalText": "...", "translatedText": "..." }

Return JSON only. No markdown wrapping.`;

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

      // Validate detectedLanguage for all content types
      if (!parsed.detectedLanguage) {
        res.status(500).json({ error: 'Missing detectedLanguage in vision response' });
        return;
      }

      // Validate based on content type
      if (parsed.contentType === 'menu') {
        if (!parsed.items || !Array.isArray(parsed.items)) {
          res.status(500).json({ error: 'Invalid menu response from Gemini' });
          return;
        }
        parsed.disclaimer = parsed.disclaimer || 'AI-detected from menu text. Always confirm with staff for serious allergies.';
      } else if (parsed.contentType === 'sign') {
        if (!parsed.originalText || !parsed.translatedText) {
          res.status(500).json({ error: 'Invalid sign response from Gemini' });
          return;
        }
      } else {
        // Default to general
        parsed.contentType = 'general';
        if (!parsed.originalText || !parsed.translatedText) {
          res.status(500).json({ error: 'Incomplete response from Gemini' });
          return;
        }
      }

      res.json(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vision translation failed';
      res.status(500).json({ error: message });
    }
  });

  // --- Destination endpoints ---

  app.get('/destination/:code/phrases', async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const langName = COUNTRY_LANGS[code.toUpperCase()];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    // Check cache
    const cached = phraseCache.get(code.toUpperCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    const prompt = `Generate 10 essential travel phrases for a visitor to a ${langName}-speaking country.

For each phrase, provide:
- id: unique string (e.g. "1", "2")
- english: the phrase in English
- translated: the phrase in ${langName} (native script)
- romanized: pronunciation guide in Latin characters (omit if ${langName} already uses Latin script)
- category: one of "greeting", "food", "directions", "emergency", "polite", "shopping"
- isEditorial: false

Include phrases for: hello, thank you, excuse me, how much, where is, I'd like, the bill please, help, yes/no, goodbye.

Return JSON array only: [{ "id": "1", "english": "...", "translated": "...", "romanized": "...", "category": "...", "isEditorial": false }]`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse phrase response' });
        return;
      }

      const phrases = JSON.parse(jsonMatch[0]);
      phraseCache.set(code.toUpperCase(), { data: phrases, timestamp: Date.now() });
      res.json(phrases);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate phrases';
      res.status(500).json({ error: message });
    }
  });

  app.get('/destination/:code/tips', async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const langName = COUNTRY_LANGS[code.toUpperCase()];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    // Check cache
    const cached = tipCache.get(code.toUpperCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    const prompt = `Generate 5 practical cultural tips for a traveler visiting a ${langName}-speaking country.

For each tip, provide:
- id: unique string
- category: one of "etiquette", "money", "food", "safety", "social", "language"
- title: short title (3-6 words)
- body: actionable advice in 1-2 sentences. Focus on what to DO or AVOID, not generalizations.
- countryCode: "${code.toUpperCase()}"
- sourceType: "ai-generated"

Tips should be practical and actionable — things a tourist might not know. Avoid stereotypes.

Return JSON array only: [{ "id": "1", "category": "...", "title": "...", "body": "...", "countryCode": "...", "sourceType": "ai-generated" }]`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse tips response' });
        return;
      }

      const tips = JSON.parse(jsonMatch[0]);
      tipCache.set(code.toUpperCase(), { data: tips, timestamp: Date.now() });
      res.json(tips);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate tips';
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
