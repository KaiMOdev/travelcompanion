import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

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
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  // --- Culture cache (in-memory + file-based) ---
  const cultureCache = new Map<string, { data: unknown[]; timestamp: number }>();

  const CACHE_DIR = path.join(__dirname, 'cache');
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  function readCacheFile(cacheKey: string): { data: unknown[]; timestamp: number } | null {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeCacheFile(cacheKey: string, data: unknown[]): void {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
    } catch {
      // Non-critical — in-memory cache still works
    }
  }

  // Load existing cache files on startup
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const cacheKey = file.replace('.json', '');
      const cached = readCacheFile(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        cultureCache.set(cacheKey, cached);
      }
    }
    if (files.length > 0) console.log(`Loaded ${files.length} culture cache files`);
  } catch {
    // Cache dir may not exist yet
  }

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
    const prompt = `You are a travel translator. First determine whether the audio contains clear human speech in ${sourceName}.

Rules:
- If there is NO clear speech — only silence, background noise, static, breathing, tapping, or unintelligible audio — return:
  { "originalText": "", "translatedText": "", "noSpeechDetected": true }
- Do NOT guess or infer words from noise
- Only transcribe words that are actually clearly audible
- If speech is present, transcribe it and translate to natural, conversational ${targetName}
- The translatedText MUST be in ${targetName}, not English
- Preserve the speaker's tone (casual, polite, urgent, etc.)
- Handle slang, idioms, and colloquialisms naturally — translate the meaning, not word-for-word

Return JSON only: { "originalText": "...", "translatedText": "...", "noSpeechDetected": false }`;

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

      // Allow empty results when no speech detected
      if (parsed.noSpeechDetected) {
        res.json({ originalText: '', translatedText: '', noSpeechDetected: true });
        return;
      }

      if (!parsed.originalText || !parsed.translatedText) {
        res.status(500).json({ error: 'Incomplete response from Gemini' });
        return;
      }
      res.json({
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
        noSpeechDetected: false,
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

  // --- Text translation endpoint (for addresses, UI text) ---

  app.post('/translate/text', async (req: Request, res: Response) => {
    const { texts, targetLang } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: texts (array), targetLang' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const prompt = `Translate the following texts to ${targetName}. Return a JSON object with a "translations" array containing each translated text in order. Use native script (e.g. Cyrillic for Croatian/Russian, Kanji for Japanese, etc.).

Texts to translate:
${texts.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Return JSON only: { "translations": ["...", "..."] }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse translation response' });
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json({ translations: parsed.translations || [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Text translation failed';
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

  // --- Culture content endpoint ---

  const CULTURE_CATEGORIES: Record<string, { count: number; prompt: (lang: string, country: string) => string }> = {
    'dos-donts': {
      count: 30,
      prompt: (lang, country) => `Generate 30 do's and don'ts for tourists visiting ${country} (${lang}-speaking).

For each item, provide:
- id: unique string (e.g. "1", "2")
- category: "dos-donts"
- title: starts with "Do:" or "Don't:" (3-8 words)
- body: 1-2 sentences explaining why
- countryCode: will be set server-side
- speakable: null

Focus on practical, non-obvious advice. Avoid stereotypes.

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'gestures': {
      count: 30,
      prompt: (lang, country) => `Generate 30 body language and gesture tips for tourists visiting ${country} (${lang}-speaking).

Cover greetings, hand signals, eye contact, personal space, pointing, beckoning, head movements, facial expressions, sitting posture, and more.

For each item:
- id: unique string
- category: "gestures"
- title: 3-6 words
- body: 1-2 sentences explaining the gesture and when to use/avoid it
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'food': {
      count: 30,
      prompt: (lang, country) => `Generate 30 food guide entries for tourists visiting ${country} (${lang}-speaking).

Include must-try dishes, eating etiquette tips, dietary vocabulary, street food, regional specialties, breakfast items, desserts, and drinks.

For each item:
- id: unique string
- category: "food"
- title: dish name or tip title (3-8 words)
- body: 1-2 sentences describing the dish or explaining the etiquette
- speakable: the dish/phrase name in ${lang} native script (null for etiquette tips)
- romanized: pronunciation in Latin characters (null if ${lang} uses Latin script, null for etiquette tips)

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": "...", "romanized": "..." }]`,
    },
    'tipping': {
      count: 30,
      prompt: (lang, country) => `Generate 30 tipping and payment custom entries for tourists visiting ${country}.

Cover all tipping scenarios: restaurants, cafes, bars, taxis, hotels, spas, tours, deliveries, hairdressers, and more.

For each item:
- id: unique string
- category: "tipping"
- title: 3-6 words
- body: 1-2 sentences with specific amounts/percentages when relevant
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'sacred-sites': {
      count: 30,
      prompt: (lang, country) => `Generate 30 religious and sacred site etiquette entries for tourists visiting ${country}.

Cover temples, churches, mosques, shrines, cemeteries, monuments, and other sacred or culturally significant sites.

For each item:
- id: unique string
- category: "sacred-sites"
- title: 3-6 words
- body: 1-2 sentences of actionable advice
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'numbers': {
      count: 10,
      prompt: (lang, country) => `Generate entries for numbers 1 through 10 in ${lang} as spoken in ${country}.

For each number:
- id: the number as string ("1", "2", etc.)
- category: "numbers"
- title: "1 — One", "2 — Two", etc. (number + English word)
- body: brief usage note (e.g., "Used when counting items at a market")
- speakable: the number word in ${lang} native script
- romanized: pronunciation in Latin characters (null if ${lang} uses Latin script)

Return JSON array ONLY: [{ "id": "1", "title": "1 — One", "body": "...", "speakable": "...", "romanized": "..." }]`,
    },
  };

  app.get('/destination/:code/culture/:category', async (req: Request, res: Response) => {
    const code = (req.params.code as string).toUpperCase();
    const category = req.params.category as string;
    const langName = COUNTRY_LANGS[code];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const categoryDef = CULTURE_CATEGORIES[category];
    if (!categoryDef) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }

    const cacheKey = `${code}-${category}`;
    // Check in-memory cache first
    const memoryCached = cultureCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    // Check file cache
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      cultureCache.set(cacheKey, fileCached);
      res.json(fileCached.data);
      return;
    }

    const prompt = categoryDef.prompt(langName, `a ${langName}-speaking country (${code})`);

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse culture response' });
        return;
      }

      const entries = JSON.parse(jsonMatch[0]);

      // Validate entries have required fields
      const valid = entries.filter(
        (e: Record<string, unknown>) =>
          typeof e.id === 'string' && typeof e.title === 'string' && typeof e.body === 'string'
      );

      if (valid.length === 0) {
        res.status(500).json({ error: 'No valid entries in Gemini response' });
        return;
      }

      // Set countryCode, category, and unique IDs on each entry
      const enriched = valid.map((e: Record<string, unknown>, i: number) => ({
        ...e,
        id: `${code}-${category}-${i + 1}`,
        countryCode: code,
        category,
      }));

      const cacheEntry = { data: enriched, timestamp: Date.now() };
      cultureCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, enriched);
      res.json(enriched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate culture content';
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
