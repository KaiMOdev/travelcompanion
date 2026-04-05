import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
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

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Trust proxy for Fly.io / reverse proxies (needed for rate limiting + req.ip)
  if (isProd) {
    app.set('trust proxy', 1);
  }

  // Security headers
  app.use(helmet());

  // CORS — restrict to known origins, fail closed in production
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  if (isProd && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be configured in production');
  }
  app.use(cors({
    origin: allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) callback(null, true);
          else callback(null, false);
        }
      : (() => { console.warn('⚠ CORS: allowing all origins (ALLOWED_ORIGINS not set)'); return true; })(),
  }));

  app.use(express.json({ limit: '10mb' }));

  // Rate limiting — stricter on expensive AI endpoints
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
  const cacheLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });

  // Health check — intentionally before auth so load balancers can reach it.
  // Only returns status; never expose secrets or internal state here.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // API key authentication middleware
  const serverApiKey = process.env.SERVER_API_KEY;
  if (isProd && !serverApiKey) {
    throw new Error('SERVER_API_KEY must be configured in production');
  }

  function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  }

  const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!serverApiKey) { next(); return; } // skip auth if not configured (dev mode)
    const clientKey = req.headers['x-api-key'];
    if (typeof clientKey !== 'string' || !safeEqual(clientKey, serverApiKey)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  app.use(apiKeyAuth);

  // Validate required env vars
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  // Request timeout helper for Gemini calls
  async function callGemini(params: Parameters<typeof ai.models.generateContent>[0], timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const p = params as unknown as Record<string, unknown>;
      return await ai.models.generateContent({
        ...params,
        config: { ...(p.config as Record<string, unknown> | undefined), abortSignal: controller.signal },
      } as Parameters<typeof ai.models.generateContent>[0]);
    } finally {
      clearTimeout(timer);
    }
  }

  // Input validation helpers
  const ALLOWED_AUDIO_MIMES = new Set(['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/ogg']);
  const MAX_AUDIO_BASE64_LENGTH = 5 * 1024 * 1024; // ~3.7MB decoded
  const MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB decoded

  // Error classification for Gemini/upstream failures
  function classifyError(err: unknown): { status: number; message: string } {
    if (err instanceof Error) {
      const msg = err.message;
      if (err.name === 'AbortError' || msg.includes('aborted')) {
        return { status: 504, message: 'Translation timed out. Please try again.' };
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return { status: 429, message: 'Service is busy. Please try again in a moment.' };
      }
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        return { status: 503, message: 'Translation service unavailable.' };
      }
    }
    return { status: 500, message: 'Translation failed' };
  }

  // Express-level response timeout fallback
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(60000, () => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });
    next();
  });

  // --- Culture cache (in-memory + file-based) ---
  const cultureCache = new Map<string, { data: unknown[]; timestamp: number }>();
  const phraseCache = new Map<string, { data: unknown[]; timestamp: number }>();
  const tipCache = new Map<string, { data: unknown[]; timestamp: number }>();
  const exploreCache = new Map<string, { data: unknown[]; timestamp: number }>();

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
        if (cacheKey.startsWith('cities-')) {
          // city cache loaded on-demand via cityCache map
        } else if (cacheKey.startsWith('explore-')) {
          exploreCache.set(cacheKey, cached);
        } else if (cacheKey.endsWith('-phrases')) {
          phraseCache.set(cacheKey, cached);
        } else if (cacheKey.endsWith('-tips')) {
          tipCache.set(cacheKey, cached);
        } else {
          cultureCache.set(cacheKey, cached);
        }
      }
    }
    if (files.length > 0) console.log(`Loaded ${files.length} cache files`);
  } catch {
    // Cache dir may not exist yet
  }

  app.post('/translate', aiLimiter, async (req: Request, res: Response) => {
    const { audio, sourceLang, targetLang, mimeType } = req.body;
    const audioMime = mimeType || 'audio/mp4';

    if (!audio || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: audio, sourceLang, targetLang' });
      return;
    }

    if (typeof audio !== 'string' || audio.length > MAX_AUDIO_BASE64_LENGTH) {
      res.status(400).json({ error: 'Audio payload too large or invalid' });
      return;
    }

    if (!ALLOWED_AUDIO_MIMES.has(audioMime)) {
      res.status(400).json({ error: 'Unsupported audio format' });
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
      const result = await callGemini({
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
      console.error('Translation error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/translate/stream', aiLimiter, async (req: Request, res: Response) => {
    const { audio, sourceLang, targetLang, mimeType } = req.body;
    const audioMime = mimeType || 'audio/mp4';

    if (!audio || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: audio, sourceLang, targetLang' });
      return;
    }

    if (typeof audio !== 'string' || audio.length > MAX_AUDIO_BASE64_LENGTH) {
      res.status(400).json({ error: 'Audio payload too large or invalid' });
      return;
    }

    if (!ALLOWED_AUDIO_MIMES.has(audioMime)) {
      res.status(400).json({ error: 'Unsupported audio format' });
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

    // Abort Gemini calls if client disconnects
    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    function safeSend(data: string): boolean {
      if (clientDisconnected) return false;
      res.write(data);
      return true;
    }

    try {
      // Phase 1: Transcribe
      const transcribeResult = await callGemini({
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

      if (clientDisconnected) return;

      const transcribeText = transcribeResult.text ?? '';
      const transcribeMatch = transcribeText.match(/\{[\s\S]*\}/);
      if (!transcribeMatch) {
        safeSend(`data: ${JSON.stringify({ error: 'Failed to transcribe audio' })}\n\n`);
        safeSend('data: [DONE]\n\n');
        res.end();
        return;
      }

      const transcribed = JSON.parse(transcribeMatch[0]);
      const originalText = transcribed.originalText || '';

      // Send original text immediately
      safeSend(`data: ${JSON.stringify({ originalText })}\n\n`);

      if (clientDisconnected) return;

      // Phase 2: Translate
      const translateResult = await callGemini({
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

      if (clientDisconnected) return;

      const translateText = translateResult.text ?? '';
      const translateMatch = translateText.match(/\{[\s\S]*\}/);
      if (!translateMatch) {
        safeSend(`data: ${JSON.stringify({ error: 'Failed to translate' })}\n\n`);
        safeSend('data: [DONE]\n\n');
        res.end();
        return;
      }

      const translated = JSON.parse(translateMatch[0]);

      // Send translation
      safeSend(`data: ${JSON.stringify({ originalText, translatedText: translated.translatedText })}\n\n`);
      safeSend('data: [DONE]\n\n');
      res.end();
    } catch (err: unknown) {
      if (clientDisconnected) return;
      console.error('Stream translation error:', err);
      const { message } = classifyError(err);
      safeSend(`data: ${JSON.stringify({ error: message })}\n\n`);
      safeSend('data: [DONE]\n\n');
      res.end();
    }
  });

  app.post('/vision', aiLimiter, async (req: Request, res: Response) => {
    const { image, targetLang, dietaryPreferences } = req.body;

    if (!image || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: image, targetLang' });
      return;
    }

    if (typeof image !== 'string' || image.length > MAX_IMAGE_BASE64_LENGTH) {
      res.status(400).json({ error: 'Image payload too large or invalid' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const sanitizedPreferences = Array.isArray(dietaryPreferences)
      ? dietaryPreferences.map((p: string) => String(p).replace(/["\n\\]/g, '')).slice(0, 10)
      : [];
    const dietaryNote = sanitizedPreferences.length
      ? `The user has these dietary restrictions: ${sanitizedPreferences.join(', ')}. Flag any items that may conflict.`
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
      const result = await callGemini({
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
      console.error('Vision error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  // --- Text translation endpoint (for addresses, UI text) ---

  app.post('/translate/text', aiLimiter, async (req: Request, res: Response) => {
    const { texts, targetLang } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: texts (array), targetLang' });
      return;
    }

    if (texts.length > 50) {
      res.status(400).json({ error: 'Too many texts (max 50)' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const sanitizedTexts = texts.map((t: string) => String(t).slice(0, 500));
    const prompt = `Translate the following texts to ${targetName}. Return a JSON object with a "translations" array containing each translated text in order. Use native script (e.g. Cyrillic for Croatian/Russian, Kanji for Japanese, etc.).

Texts to translate:
${sanitizedTexts.map((t: string, i: number) => `${i + 1}. ${JSON.stringify(t)}`).join('\n')}

Return JSON only: { "translations": ["...", "..."] }`;

    try {
      const result = await callGemini({
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
      console.error('Text translation error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  // --- Destination endpoints ---

  app.get('/destination/:code/phrases', cacheLimiter, async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const langName = COUNTRY_LANGS[code.toUpperCase()];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const cacheKey = `${code.toUpperCase()}-phrases`;
    // Check in-memory cache
    const memoryCached = phraseCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    // Check file cache
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      phraseCache.set(cacheKey, fileCached);
      res.json(fileCached.data);
      return;
    }

    const prompt = `Generate 30 essential travel phrases for a visitor to a ${langName}-speaking country.

For each phrase, provide:
- id: unique string (e.g. "1", "2")
- english: the phrase in English
- translated: the phrase in ${langName} (native script)
- romanized: pronunciation guide in Latin characters (omit if ${langName} already uses Latin script)
- category: one of "greeting", "food", "directions", "emergency", "polite", "shopping"
- isEditorial: false

Include greetings, thanks, apologies, directions, food ordering, shopping, emergencies, polite expressions, transport, accommodation, time, weather, numbers, and social phrases.

Return JSON array only: [{ "id": "1", "english": "...", "translated": "...", "romanized": "...", "category": "...", "isEditorial": false }]`;

    try {
      const result = await callGemini({
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
      const cacheEntry = { data: phrases, timestamp: Date.now() };
      phraseCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, phrases);
      res.json(phrases);
    } catch (err: unknown) {
      console.error('Phrases error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  app.get('/destination/:code/tips', cacheLimiter, async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const langName = COUNTRY_LANGS[code.toUpperCase()];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const cacheKey = `${code.toUpperCase()}-tips`;
    // Check in-memory cache
    const memoryCached = tipCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    // Check file cache
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      tipCache.set(cacheKey, fileCached);
      res.json(fileCached.data);
      return;
    }

    const prompt = `Generate 30 practical cultural tips for a traveler visiting a ${langName}-speaking country.

For each tip, provide:
- id: unique string
- category: one of "etiquette", "money", "food", "safety", "social", "language"
- title: short title (3-6 words)
- body: actionable advice in 1-2 sentences. Focus on what to DO or AVOID, not generalizations.
- countryCode: "${code.toUpperCase()}"
- sourceType: "ai-generated"

Cover etiquette, money, food, safety, social norms, language, transport, shopping, nightlife, health, weather, and local customs. Tips should be practical and actionable — things a tourist might not know. Avoid stereotypes.

Return JSON array only: [{ "id": "1", "category": "...", "title": "...", "body": "...", "countryCode": "...", "sourceType": "ai-generated" }]`;

    try {
      const result = await callGemini({
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
      const cacheEntry = { data: tips, timestamp: Date.now() };
      tipCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, tips);
      res.json(tips);
    } catch (err: unknown) {
      console.error('Tips error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
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

  app.get('/destination/:code/culture/:category', cacheLimiter, async (req: Request, res: Response) => {
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
      const result = await callGemini({
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
      console.error('Culture content error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  // --- Cities (for Explore autocomplete) ---
  const cityCache = new Map<string, { data: string[]; timestamp: number }>();

  app.get('/destination/:code/cities', cacheLimiter, async (req: Request, res: Response) => {
    const code = (req.params.code as string).toUpperCase();
    const langName = COUNTRY_LANGS[code];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const cacheKey = `cities-${code}`;
    const memoryCached = cityCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      cityCache.set(cacheKey, { data: fileCached.data as string[], timestamp: fileCached.timestamp });
      res.json(fileCached.data);
      return;
    }

    try {
      const result = await callGemini({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: `List 30 major cities and popular tourist destinations in the country with code ${code}. Include capital, major cities, and well-known tourist towns/areas. Return ONLY a JSON array of city name strings in English, sorted by popularity for travelers. Example: ["Tokyo", "Osaka", "Kyoto"]` }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse cities response' });
        return;
      }

      const cities: string[] = JSON.parse(jsonMatch[0]).filter((c: unknown) => typeof c === 'string');

      if (cities.length === 0) {
        res.status(500).json({ error: 'No cities returned' });
        return;
      }

      const cacheEntry = { data: cities, timestamp: Date.now() };
      cityCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, cities);
      res.json(cities);
    } catch (err: unknown) {
      console.error('Cities fetch error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  // --- Explore (AI Local Guide) ---
  const EXPLORE_CATEGORIES: Record<string, { prompt: (lang: string, country: string, code: string) => string }> = {
    'street-food': {
      prompt: (lang, country, code) => `Generate 20 street food and local food recommendations for travelers visiting ${country} (${code}).
Focus on authentic, local-perspective spots — places locals actually eat, not tourist-heavy restaurants.
Include food stalls, night markets, hole-in-the-wall eateries, and regional specialties.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique or worth visiting
- vibeTags: 2-4 tags like "casual", "budget-friendly", "late-night", "family"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context" (when to use it)

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'hidden-history': {
      prompt: (lang, country, code) => `Generate 20 lesser-known historical and cultural site recommendations for travelers visiting ${country} (${code}).
Focus on hidden gems — lesser-known temples, ruins, historical buildings, and monuments that most tourists miss.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "quiet", "photogenic", "free", "ancient"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'chill-spots': {
      prompt: (lang, country, code) => `Generate 20 relaxing and chill spot recommendations for travelers visiting ${country} (${code}).
Focus on quiet cafes, parks, rooftop views, peaceful gardens, and places to unwind that locals love.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "quiet", "scenic", "wifi", "cozy"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'after-dark': {
      prompt: (lang, country, code) => `Generate 20 nightlife and evening activity recommendations for travelers visiting ${country} (${code}).
Focus on night markets, bars, live music venues, evening food stalls, and after-dark experiences locals enjoy.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "lively", "romantic", "live-music", "late-night"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'hidden-gems': {
      prompt: (lang, country, code) => `Generate 20 hidden gem recommendations for travelers visiting ${country} (${code}).
Focus on places only locals know — secret viewpoints, unmarked restaurants, neighborhood favorites, unusual attractions off the beaten path.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "secret", "local-favorite", "unique", "off-beat"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'creative-scene': {
      prompt: (lang, country, code) => `Generate 20 creative and art scene recommendations for travelers visiting ${country} (${code}).
Focus on galleries, street art neighborhoods, live music venues, independent theaters, artisan workshops, and creative spaces.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "artistic", "indie", "interactive", "free"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'nature-escapes': {
      prompt: (lang, country, code) => `Generate 20 nature and outdoor recommendations for travelers visiting ${country} (${code}).
Focus on nearby nature spots, hiking trails, gardens, parks, beaches, and scenic areas accessible from major cities.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "scenic", "easy-hike", "sunrise", "swimming"
- area: region or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
    'local-markets': {
      prompt: (lang, country, code) => `Generate 20 local market and shopping recommendations for travelers visiting ${country} (${code}).
Focus on traditional markets, craft markets, flea markets, artisan shops, and places to buy authentic souvenirs and local goods.

For each place provide:
- name: English name
- localName: name in ${lang} native script
- description: 1 sentence describing the place
- whySpecial: 1 sentence about what makes it unique
- vibeTags: 2-4 tags like "bargaining", "crafts", "souvenirs", "weekend-only"
- area: neighborhood or area name
- phrases: 5-8 contextual phrases useful at this type of place, each with "english", "local" (in ${lang}), and "context"

Return JSON array ONLY: [{ "name": "...", "localName": "...", "description": "...", "whySpecial": "...", "vibeTags": [...], "area": "...", "phrases": [{ "english": "...", "local": "...", "context": "..." }] }]`,
    },
  };

  app.get('/destination/:code/explore/:category', cacheLimiter, async (req: Request, res: Response) => {
    const code = (req.params.code as string).toUpperCase();
    const category = req.params.category as string;
    const langName = COUNTRY_LANGS[code];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const categoryDef = EXPLORE_CATEGORIES[category];
    if (!categoryDef) {
      res.status(400).json({ error: 'Invalid explore category' });
      return;
    }

    // Location-aware: optional lat, lng, radius (km), city
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusRaw = req.query.radius !== undefined ? parseInt(req.query.radius as string, 10) : 10;
    const radius = isNaN(radiusRaw) ? 10 : radiusRaw;
    const city = (req.query.city as string) || '';
    const hasLocation = !isNaN(lat) && !isNaN(lng);

    // Cache key includes location context when provided
    const locationKey = hasLocation ? `-${lat.toFixed(2)}_${lng.toFixed(2)}_${radius}km` : city ? `-${city}` : '';
    const cacheKey = `explore-${code}-${category}${locationKey}`;

    // Check in-memory cache first
    const memoryCached = exploreCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    // Check file cache
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      exploreCache.set(cacheKey, fileCached);
      res.json(fileCached.data);
      return;
    }

    let basePrompt = categoryDef.prompt(langName, `a ${langName}-speaking country (${code})`, code);

    // Inject location context into prompt
    const radiusClause = radius > 0 ? ` Focus on places within ${radius}km of this location.` : '';
    if (hasLocation && city) {
      basePrompt = `The user is currently near ${city} (${lat.toFixed(4)}, ${lng.toFixed(4)}).${radiusClause}\n\n${basePrompt}`;
    } else if (hasLocation) {
      basePrompt = `The user is at coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).${radiusClause}\n\n${basePrompt}`;
    } else if (city) {
      basePrompt = `Focus on places in or near ${city}.\n\n${basePrompt}`;
    }

    const prompt = basePrompt;

    try {
      // 45s timeout — explore prompts generate 20 places with phrases
      const result = await callGemini({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }, 45000);

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse explore response' });
        return;
      }

      const places = JSON.parse(jsonMatch[0]);

      // Validate entries have required fields
      const valid = places.filter(
        (p: Record<string, unknown>) =>
          typeof p.name === 'string' && typeof p.localName === 'string' && typeof p.description === 'string'
      );

      if (valid.length === 0) {
        res.status(500).json({ error: 'No valid places in Gemini response' });
        return;
      }

      // Enrich with stable IDs and ensure phrases is always an array
      const enriched = valid.map((p: Record<string, unknown>, i: number) => ({
        ...p,
        id: `${code}-explore-${category}-${i + 1}`,
        phrases: Array.isArray(p.phrases) ? p.phrases : [],
        vibeTags: Array.isArray(p.vibeTags) ? p.vibeTags : [],
      }));

      const cacheEntry = { data: enriched, timestamp: Date.now() };
      exploreCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, enriched);
      res.json(enriched);
    } catch (err: unknown) {
      console.error('Explore content error:', err);
      const { status, message } = classifyError(err);
      res.status(status).json({ error: message });
    }
  });

  // Centralized error handler — catches unhandled route errors
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

// Process-level crash handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

if (require.main === module) {
  const port = process.env.PORT || 3001;
  const app = createApp();
  const server = app.listen(Number(port), '0.0.0.0', () => {
    console.log(`WanderVox server running on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
