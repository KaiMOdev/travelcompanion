# Travel Story Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform VoxLingo from a generic translator into a travel companion by adding: destination selector, essential phrases, cultural tips, smart camera (menu/sign intelligence), emergency info card, and taxi location card.

**Architecture:** New travel data types + constants layer. Two new backend endpoints for destination content (phrases, tips). Enhanced `/vision` endpoint with content-type detection and structured response. Three new frontend components (DestinationPicker, PhraseCard, TipCard, EmergencyCard, TaxiCard). Travel tab home screen restructured with phrase row + tips above the translator. Camera result screen conditionally renders menu/sign/general layouts.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Express, Gemini 2.5 Flash, expo-location, expo-sqlite, AsyncStorage

**Spec:** `docs/superpowers/specs/2026-04-05-travel-story-design.md`

---

## File Structure

### New Files
```
voxlingo/
├── constants/
│   ├── destinations.ts         # Hero destinations, country→language mapping
│   └── emergency.ts            # Static emergency info per country (verified data)
├── components/
│   ├── DestinationPicker.tsx   # Country selector modal (onboarding + settings)
│   ├── PhraseCard.tsx          # Single phrase card (English + translated + TTS)
│   ├── PhraseRow.tsx           # Horizontal scrollable row of PhraseCards
│   ├── TipCard.tsx             # Cultural tip card with swipe
│   ├── EmergencyCard.tsx       # SOS modal with emergency numbers + phrases
│   ├── TaxiCard.tsx            # Full-screen location card for taxi drivers
│   └── MenuResult.tsx          # Smart camera menu result with allergens
│   └── SignResult.tsx          # Smart camera sign result with context
├── services/
│   ├── destination.ts          # API client for phrases + tips endpoints
│   └── location.ts             # expo-location wrapper (reverse geocode)
├── hooks/
│   └── useDestination.ts       # Destination state + phrase/tip loading
├── types/
│   └── travel.ts               # New travel-specific types
```

### Modified Files
```
voxlingo/
├── app/(tabs)/index.tsx        # Travel tab — add phrase row, tips, SOS icon, taxi button
├── app/(tabs)/camera.tsx       # Camera tab — conditional menu/sign/general result rendering
├── app/(tabs)/_layout.tsx      # Tab layout — add Explore tab (3 tabs total)
├── server/index.ts             # Add /destination/:code/phrases, /destination/:code/tips, enhance /vision
├── services/vision.ts          # Update to handle structured response types
├── types/index.ts              # Re-export travel types
```

---

## Task 1: Travel Types

**Files:**
- Create: `voxlingo/types/travel.ts`
- Modify: `voxlingo/types/index.ts`

- [ ] **Step 1: Create travel types file**

```typescript
// voxlingo/types/travel.ts

export type Destination = {
  countryCode: string;
  countryName: string;
  primaryLanguage: string;
  isHero: boolean;
};

export type Phrase = {
  id: string;
  english: string;
  translated: string;
  romanized?: string;
  category: 'greeting' | 'food' | 'directions' | 'emergency' | 'polite' | 'shopping';
  isEditorial: boolean;
};

export type CulturalTip = {
  id: string;
  category: 'etiquette' | 'money' | 'food' | 'safety' | 'social' | 'language';
  title: string;
  body: string;
  countryCode: string;
  sourceType: 'editorial' | 'ai-generated';
};

export type MenuItem = {
  original: string;
  translated: string;
  description: string;
  possibleAllergens: string[];
  allergenConfidence: 'high' | 'medium' | 'low';
  dietary: ('vegetarian' | 'vegan' | 'halal' | 'kosher')[];
  popular: boolean;
};

export type MenuTranslation = {
  contentType: 'menu';
  detectedLanguage: string;
  items: MenuItem[];
  disclaimer: string;
};

export type SignTranslation = {
  contentType: 'sign';
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
  context: string;
};

export type GeneralTranslation = {
  contentType: 'general';
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
};

export type SmartVisionResponse = MenuTranslation | SignTranslation | GeneralTranslation;

export type EmergencyInfo = {
  countryCode: string;
  police: string;
  ambulance: string;
  fire: string;
  advisoryUrl: string;
  phrases: {
    help: string;
    callAmbulance: string;
    dontSpeak: string;
  };
};
```

- [ ] **Step 2: Re-export from types/index.ts**

Add to the bottom of `voxlingo/types/index.ts`:

```typescript
export type {
  Destination,
  Phrase,
  CulturalTip,
  MenuItem,
  MenuTranslation,
  SignTranslation,
  GeneralTranslation,
  SmartVisionResponse,
  EmergencyInfo,
} from './travel';
```

- [ ] **Step 3: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add voxlingo/types/travel.ts voxlingo/types/index.ts
git commit -m "feat: add travel-specific types for destinations, phrases, tips, smart camera"
```

---

## Task 2: Destinations & Emergency Constants

**Files:**
- Create: `voxlingo/constants/destinations.ts`
- Create: `voxlingo/constants/emergency.ts`

- [ ] **Step 1: Create destinations constant**

```typescript
// voxlingo/constants/destinations.ts
import { Destination } from '../types';

export const DESTINATIONS: Destination[] = [
  // Hero destinations (editorially curated content)
  { countryCode: 'JP', countryName: 'Japan', primaryLanguage: 'ja', isHero: true },
  { countryCode: 'TH', countryName: 'Thailand', primaryLanguage: 'th', isHero: true },
  { countryCode: 'IT', countryName: 'Italy', primaryLanguage: 'it', isHero: true },
  // Standard destinations
  { countryCode: 'ES', countryName: 'Spain', primaryLanguage: 'es', isHero: false },
  { countryCode: 'FR', countryName: 'France', primaryLanguage: 'fr', isHero: false },
  { countryCode: 'DE', countryName: 'Germany', primaryLanguage: 'de', isHero: false },
  { countryCode: 'KR', countryName: 'South Korea', primaryLanguage: 'ko', isHero: false },
  { countryCode: 'CN', countryName: 'China', primaryLanguage: 'zh', isHero: false },
  { countryCode: 'VN', countryName: 'Vietnam', primaryLanguage: 'vi', isHero: false },
  { countryCode: 'ID', countryName: 'Indonesia', primaryLanguage: 'id', isHero: false },
  { countryCode: 'BR', countryName: 'Brazil', primaryLanguage: 'pt', isHero: false },
  { countryCode: 'MX', countryName: 'Mexico', primaryLanguage: 'es', isHero: false },
  { countryCode: 'TR', countryName: 'Turkey', primaryLanguage: 'tr', isHero: false },
  { countryCode: 'NL', countryName: 'Netherlands', primaryLanguage: 'nl', isHero: false },
  { countryCode: 'PL', countryName: 'Poland', primaryLanguage: 'pl', isHero: false },
  { countryCode: 'GR', countryName: 'Greece', primaryLanguage: 'el', isHero: false },
  { countryCode: 'PT', countryName: 'Portugal', primaryLanguage: 'pt', isHero: false },
  { countryCode: 'CZ', countryName: 'Czech Republic', primaryLanguage: 'cs', isHero: false },
  { countryCode: 'HU', countryName: 'Hungary', primaryLanguage: 'hu', isHero: false },
  { countryCode: 'HR', countryName: 'Croatia', primaryLanguage: 'hr', isHero: false },
  { countryCode: 'RO', countryName: 'Romania', primaryLanguage: 'ro', isHero: false },
  { countryCode: 'SE', countryName: 'Sweden', primaryLanguage: 'sv', isHero: false },
  { countryCode: 'NO', countryName: 'Norway', primaryLanguage: 'no', isHero: false },
  { countryCode: 'DK', countryName: 'Denmark', primaryLanguage: 'da', isHero: false },
  { countryCode: 'FI', countryName: 'Finland', primaryLanguage: 'fi', isHero: false },
  { countryCode: 'RU', countryName: 'Russia', primaryLanguage: 'ru', isHero: false },
  { countryCode: 'UA', countryName: 'Ukraine', primaryLanguage: 'uk', isHero: false },
  { countryCode: 'IN', countryName: 'India', primaryLanguage: 'hi', isHero: false },
  { countryCode: 'PH', countryName: 'Philippines', primaryLanguage: 'tl', isHero: false },
  { countryCode: 'SA', countryName: 'Saudi Arabia', primaryLanguage: 'ar', isHero: false },
];

export const getDestination = (countryCode: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.countryCode === countryCode);

export const HERO_DESTINATIONS = DESTINATIONS.filter((d) => d.isHero);
```

- [ ] **Step 2: Create emergency constants**

```typescript
// voxlingo/constants/emergency.ts
import { EmergencyInfo } from '../types';

// Static, manually verified emergency data. NOT AI-generated.
// Sources: official government travel advisory sites.
export const EMERGENCY_DATA: Record<string, EmergencyInfo> = {
  JP: {
    countryCode: 'JP',
    police: '110',
    ambulance: '119',
    fire: '119',
    advisoryUrl: 'https://www.us.emb-japan.go.jp',
    phrases: {
      help: '助けてください (Tasukete kudasai)',
      callAmbulance: '救急車を呼んでください (Kyuukyuusha wo yonde kudasai)',
      dontSpeak: '日本語が話せません (Nihongo ga hanasemasen)',
    },
  },
  TH: {
    countryCode: 'TH',
    police: '191',
    ambulance: '1669',
    fire: '199',
    advisoryUrl: 'https://www.thaiembassy.com',
    phrases: {
      help: 'ช่วยด้วย (Chuay duay)',
      callAmbulance: 'เรียกรถพยาบาลด้วย (Riak rot payaban duay)',
      dontSpeak: 'พูดไทยไม่ได้ (Phuut Thai mai dai)',
    },
  },
  IT: {
    countryCode: 'IT',
    police: '112',
    ambulance: '118',
    fire: '115',
    advisoryUrl: 'https://www.esteri.it',
    phrases: {
      help: 'Aiuto! (Ah-YOO-toh)',
      callAmbulance: 'Chiamate un\'ambulanza (Kee-ah-MAH-teh oon ahm-boo-LAHN-tsah)',
      dontSpeak: 'Non parlo italiano (Non PAR-loh ee-tah-lee-AH-noh)',
    },
  },
  ES: {
    countryCode: 'ES',
    police: '112',
    ambulance: '112',
    fire: '112',
    advisoryUrl: 'https://www.exteriores.gob.es',
    phrases: {
      help: '¡Ayuda! (Ah-YOO-dah)',
      callAmbulance: 'Llame a una ambulancia (YAH-meh ah OO-nah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'No hablo español (Noh AH-bloh es-pahn-YOL)',
    },
  },
  FR: {
    countryCode: 'FR',
    police: '17',
    ambulance: '15',
    fire: '18',
    advisoryUrl: 'https://www.diplomatie.gouv.fr',
    phrases: {
      help: 'Au secours ! (Oh suh-KOOR)',
      callAmbulance: 'Appelez une ambulance (Ah-puh-LAY oon ahm-boo-LAHNSS)',
      dontSpeak: 'Je ne parle pas français (Zhuh nuh parl pah frahn-SAY)',
    },
  },
  DE: {
    countryCode: 'DE',
    police: '110',
    ambulance: '112',
    fire: '112',
    advisoryUrl: 'https://www.auswaertiges-amt.de',
    phrases: {
      help: 'Hilfe! (HIL-fuh)',
      callAmbulance: 'Rufen Sie einen Krankenwagen (ROO-fen zee EYE-nen KRAN-ken-vah-gen)',
      dontSpeak: 'Ich spreche kein Deutsch (Ikh SPREH-khuh kyne Doytsh)',
    },
  },
  KR: {
    countryCode: 'KR',
    police: '112',
    ambulance: '119',
    fire: '119',
    advisoryUrl: 'https://www.mofa.go.kr',
    phrases: {
      help: '도와주세요 (Dowajuseyo)',
      callAmbulance: '구급차를 불러주세요 (Gugeupchareul bulleojuseyo)',
      dontSpeak: '한국어를 못해요 (Hangugeo-reul mothaeyo)',
    },
  },
  CN: {
    countryCode: 'CN',
    police: '110',
    ambulance: '120',
    fire: '119',
    advisoryUrl: 'https://www.fmprc.gov.cn',
    phrases: {
      help: '救命 (Jiùmìng)',
      callAmbulance: '请叫救护车 (Qǐng jiào jiùhùchē)',
      dontSpeak: '我不会说中文 (Wǒ bù huì shuō zhōngwén)',
    },
  },
  VN: {
    countryCode: 'VN',
    police: '113',
    ambulance: '115',
    fire: '114',
    advisoryUrl: 'https://www.mofa.gov.vn',
    phrases: {
      help: 'Cứu tôi! (Kuu toy)',
      callAmbulance: 'Gọi xe cấp cứu (Goy seh kup kuu)',
      dontSpeak: 'Tôi không nói được tiếng Việt (Toy khong noy duoc tieng Viet)',
    },
  },
  BR: {
    countryCode: 'BR',
    police: '190',
    ambulance: '192',
    fire: '193',
    advisoryUrl: 'https://www.gov.br/mre',
    phrases: {
      help: 'Socorro! (Soh-KOH-hoo)',
      callAmbulance: 'Chame uma ambulância (SHAH-mee OO-mah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'Eu não falo português (Eh-oo now FAH-loo por-too-GESH)',
    },
  },
  MX: {
    countryCode: 'MX',
    police: '911',
    ambulance: '911',
    fire: '911',
    advisoryUrl: 'https://www.gob.mx/sre',
    phrases: {
      help: '¡Ayuda! (Ah-YOO-dah)',
      callAmbulance: 'Llame a una ambulancia (YAH-meh ah OO-nah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'No hablo español (Noh AH-bloh es-pahn-YOL)',
    },
  },
  TR: {
    countryCode: 'TR',
    police: '155',
    ambulance: '112',
    fire: '110',
    advisoryUrl: 'https://www.mfa.gov.tr',
    phrases: {
      help: 'İmdat! (Im-DAHT)',
      callAmbulance: 'Ambulans çağırın (Ahm-boo-LAHNS chah-uh-RUHN)',
      dontSpeak: 'Türkçe bilmiyorum (Turk-CHEH bil-mee-YOR-um)',
    },
  },
  IN: {
    countryCode: 'IN',
    police: '100',
    ambulance: '108',
    fire: '101',
    advisoryUrl: 'https://www.mea.gov.in',
    phrases: {
      help: 'मदद करो! (Madad karo!)',
      callAmbulance: 'एम्बुलेंस बुलाओ (Ambulance bulao)',
      dontSpeak: 'मुझे हिंदी नहीं आती (Mujhe Hindi nahi aati)',
    },
  },
};

// Fallback for countries without specific data
export const DEFAULT_EMERGENCY: EmergencyInfo = {
  countryCode: '',
  police: '112',
  ambulance: '112',
  fire: '112',
  advisoryUrl: 'https://travel.state.gov',
  phrases: {
    help: 'Help!',
    callAmbulance: 'Call an ambulance!',
    dontSpeak: 'I don\'t speak the local language.',
  },
};

export const getEmergencyInfo = (countryCode: string): EmergencyInfo =>
  EMERGENCY_DATA[countryCode] || { ...DEFAULT_EMERGENCY, countryCode };
```

- [ ] **Step 3: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add voxlingo/constants/destinations.ts voxlingo/constants/emergency.ts
git commit -m "feat: add destination list and verified emergency data for 13 countries"
```

---

## Task 3: Destination API Endpoints (Backend)

**Files:**
- Modify: `voxlingo/server/index.ts`
- Test: `voxlingo/server/index.test.ts`

- [ ] **Step 1: Write failing tests for /destination/:code/phrases**

Add to `voxlingo/server/index.test.ts`:

```typescript
describe('GET /destination/:code/phrases', () => {
  it('returns phrases for a valid country code', async () => {
    const mockPhrases = [
      { id: '1', english: 'Hello', translated: 'こんにちは', romanized: 'Konnichiwa', category: 'greeting', isEditorial: false },
    ];
    mockGenerateContent(`\`\`\`json\n${JSON.stringify(mockPhrases)}\n\`\`\``);

    const res = await request(app).get('/destination/JP/phrases');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('english');
    expect(res.body[0]).toHaveProperty('translated');
    expect(res.body[0]).toHaveProperty('category');
  });

  it('returns 400 for invalid country code', async () => {
    const res = await request(app).get('/destination/XX/phrases');
    expect(res.status).toBe(400);
  });
});

describe('GET /destination/:code/tips', () => {
  it('returns tips for a valid country code', async () => {
    const mockTips = [
      { id: '1', category: 'etiquette', title: 'Bowing', body: 'Bow when greeting.', countryCode: 'JP', sourceType: 'ai-generated' },
    ];
    mockGenerateContent(`\`\`\`json\n${JSON.stringify(mockTips)}\n\`\`\``);

    const res = await request(app).get('/destination/JP/tips');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('body');
    expect(res.body[0]).toHaveProperty('category');
  });

  it('returns 400 for invalid country code', async () => {
    const res = await request(app).get('/destination/XX/tips');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd voxlingo/server && npx jest --testPathPattern=index.test -v`
Expected: FAIL — routes not defined

- [ ] **Step 3: Add destination constants + phrase/tip endpoints to server**

Add to `voxlingo/server/index.ts` after the LANG_NAMES constant (line 18):

```typescript
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
```

Add before `return app;` at the end of the `createApp()` function:

```typescript
  app.get('/destination/:code/phrases', async (req: Request, res: Response) => {
    const { code } = req.params;
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
    const { code } = req.params;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd voxlingo/server && npx jest --testPathPattern=index.test -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add voxlingo/server/index.ts voxlingo/server/index.test.ts
git commit -m "feat: add /destination/:code/phrases and /tips endpoints with caching"
```

---

## Task 4: Enhanced /vision Endpoint (Smart Camera Backend)

**Files:**
- Modify: `voxlingo/server/index.ts` (the `/vision` route, lines 193-245)
- Test: `voxlingo/server/index.test.ts`

- [ ] **Step 1: Write failing tests for smart vision**

Add to `voxlingo/server/index.test.ts`:

```typescript
describe('POST /vision (smart camera)', () => {
  it('returns menu translation with items when menu detected', async () => {
    const menuResponse = {
      contentType: 'menu',
      detectedLanguage: 'ja',
      items: [
        {
          original: 'カツカレー',
          translated: 'Katsu Curry',
          description: 'Breaded deep-fried pork cutlet on curry rice',
          possibleAllergens: ['wheat', 'egg'],
          allergenConfidence: 'medium',
          dietary: [],
          popular: true,
        },
      ],
      disclaimer: 'AI-detected from menu text. Always confirm with staff for serious allergies.',
    };
    mockGenerateContent(`\`\`\`json\n${JSON.stringify(menuResponse)}\n\`\`\``);

    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64data', targetLang: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.contentType).toBe('menu');
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.disclaimer).toBeDefined();
  });

  it('returns sign translation with context when sign detected', async () => {
    const signResponse = {
      contentType: 'sign',
      detectedLanguage: 'ja',
      originalText: '出口3',
      translatedText: 'Exit 3',
      context: 'This is exit 3 of the station.',
    };
    mockGenerateContent(`\`\`\`json\n${JSON.stringify(signResponse)}\n\`\`\``);

    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64data', targetLang: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.contentType).toBe('sign');
    expect(res.body.context).toBeDefined();
  });

  it('returns general translation for non-menu/sign content', async () => {
    const generalResponse = {
      contentType: 'general',
      detectedLanguage: 'ja',
      originalText: 'Some text',
      translatedText: 'Some translated text',
    };
    mockGenerateContent(`\`\`\`json\n${JSON.stringify(generalResponse)}\n\`\`\``);

    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64data', targetLang: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.contentType).toBe('general');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd voxlingo/server && npx jest --testPathPattern=index.test -v`
Expected: FAIL — current /vision returns flat format without contentType

- [ ] **Step 3: Replace the /vision endpoint with smart camera version**

Replace the entire `app.post('/vision', ...)` handler in `voxlingo/server/index.ts` (lines 193-245) with:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd voxlingo/server && npx jest --testPathPattern=index.test -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add voxlingo/server/index.ts voxlingo/server/index.test.ts
git commit -m "feat: smart camera — /vision detects menu/sign/general, returns structured response"
```

---

## Task 5: Destination Service (Frontend API Client)

**Files:**
- Create: `voxlingo/services/destination.ts`
- Create: `voxlingo/services/destination.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// voxlingo/services/destination.test.ts
import { fetchPhrases, fetchTips } from './destination';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('./api', () => ({ API_URL: 'http://test:3001' }));

describe('fetchPhrases', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns phrases for a valid country code', async () => {
    const mockPhrases = [
      { id: '1', english: 'Hello', translated: 'こんにちは', category: 'greeting', isEditorial: false },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPhrases,
    });

    const result = await fetchPhrases('JP');
    expect(result).toEqual(mockPhrases);
    expect(mockFetch).toHaveBeenCalledWith('http://test:3001/destination/JP/phrases');
  });

  it('throws on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid country code' }),
    });

    await expect(fetchPhrases('XX')).rejects.toThrow('Invalid country code');
  });
});

describe('fetchTips', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns tips for a valid country code', async () => {
    const mockTips = [
      { id: '1', category: 'etiquette', title: 'Bowing', body: 'Bow when greeting.', countryCode: 'JP', sourceType: 'ai-generated' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTips,
    });

    const result = await fetchTips('JP');
    expect(result).toEqual(mockTips);
    expect(mockFetch).toHaveBeenCalledWith('http://test:3001/destination/JP/tips');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd voxlingo && npx jest --testPathPattern=destination.test -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement destination service**

```typescript
// voxlingo/services/destination.ts
import { API_URL } from './api';
import { Phrase, CulturalTip } from '../types';

export async function fetchPhrases(countryCode: string): Promise<Phrase[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/phrases`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch phrases');
  }
  return response.json();
}

export async function fetchTips(countryCode: string): Promise<CulturalTip[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/tips`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch tips');
  }
  return response.json();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd voxlingo && npx jest --testPathPattern=destination.test -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add voxlingo/services/destination.ts voxlingo/services/destination.test.ts
git commit -m "feat: add destination API client for phrases and tips"
```

---

## Task 6: Update Vision Service (Frontend)

**Files:**
- Modify: `voxlingo/services/vision.ts`
- Modify: `voxlingo/services/vision.test.ts`

- [ ] **Step 1: Write failing test for smart vision response**

Add to `voxlingo/services/vision.test.ts`:

```typescript
import { translateImageSmart } from './vision';

describe('translateImageSmart', () => {
  it('returns menu translation with items', async () => {
    const menuResponse = {
      contentType: 'menu',
      detectedLanguage: 'ja',
      items: [{ original: 'テスト', translated: 'Test', description: 'A test dish', possibleAllergens: [], allergenConfidence: 'low', dietary: [], popular: false }],
      disclaimer: 'AI disclaimer',
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => menuResponse });

    const result = await translateImageSmart('base64data', 'en');
    expect(result.contentType).toBe('menu');
    if (result.contentType === 'menu') {
      expect(result.items).toHaveLength(1);
    }
  });

  it('passes dietary preferences to backend', async () => {
    const generalResponse = { contentType: 'general', detectedLanguage: 'ja', originalText: 'Test', translatedText: 'Test' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => generalResponse });

    await translateImageSmart('base64data', 'en', ['vegetarian', 'gluten-free']);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('vegetarian'),
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd voxlingo && npx jest --testPathPattern=vision.test -v`
Expected: FAIL — translateImageSmart not found

- [ ] **Step 3: Add translateImageSmart to vision service**

Add to the bottom of `voxlingo/services/vision.ts`:

```typescript
import { SmartVisionResponse } from '../types';

export async function translateImageSmart(
  image: string,
  targetLang: string,
  dietaryPreferences?: string[],
): Promise<SmartVisionResponse> {
  const response = await fetch(`${API_URL}/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, targetLang, dietaryPreferences }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Vision request failed' }));
    throw new Error(err.error || 'Failed to translate image');
  }

  return response.json();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd voxlingo && npx jest --testPathPattern=vision.test -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add voxlingo/services/vision.ts voxlingo/services/vision.test.ts
git commit -m "feat: add translateImageSmart service for menu/sign/general detection"
```

---

## Task 7: useDestination Hook

**Files:**
- Create: `voxlingo/hooks/useDestination.ts`
- Create: `voxlingo/hooks/useDestination.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// voxlingo/hooks/useDestination.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useDestination } from './useDestination';

jest.mock('../services/destination', () => ({
  fetchPhrases: jest.fn().mockResolvedValue([
    { id: '1', english: 'Hello', translated: 'こんにちは', category: 'greeting', isEditorial: false },
  ]),
  fetchTips: jest.fn().mockResolvedValue([
    { id: '1', category: 'etiquette', title: 'Bowing', body: 'Bow when greeting.', countryCode: 'JP', sourceType: 'ai-generated' },
  ]),
}));

describe('useDestination', () => {
  it('starts with no destination', () => {
    const { result } = renderHook(() => useDestination());
    expect(result.current.destination).toBeNull();
    expect(result.current.phrases).toEqual([]);
    expect(result.current.tips).toEqual([]);
  });

  it('loads phrases and tips when destination is set', async () => {
    const { result } = renderHook(() => useDestination());

    await act(async () => {
      await result.current.setDestination('JP');
    });

    expect(result.current.destination).toBe('JP');
    expect(result.current.phrases.length).toBeGreaterThan(0);
    expect(result.current.tips.length).toBeGreaterThan(0);
  });

  it('sets loading state while fetching', async () => {
    const { result } = renderHook(() => useDestination());

    // Start loading
    act(() => {
      result.current.setDestination('JP');
    });

    expect(result.current.isLoading).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd voxlingo && npx jest --testPathPattern=useDestination.test -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useDestination hook**

```typescript
// voxlingo/hooks/useDestination.ts
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPhrases, fetchTips } from '../services/destination';
import { Phrase, CulturalTip } from '../types';
import { getDestination } from '../constants/destinations';

const STORAGE_KEY = 'voxlingo_destination';

export function useDestination() {
  const [destination, setDestinationState] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDestination = useCallback(async (countryCode: string) => {
    setDestinationState(countryCode);
    setIsLoading(true);
    setError(null);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, countryCode);
      const [phrasesData, tipsData] = await Promise.all([
        fetchPhrases(countryCode),
        fetchTips(countryCode),
      ]);
      setPhrases(phrasesData);
      setTips(tipsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load destination data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSaved = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        await setDestination(saved);
      }
    } catch {
      // No saved destination — that's fine
    }
  }, [setDestination]);

  const getLanguageCode = useCallback((): string | undefined => {
    if (!destination) return undefined;
    return getDestination(destination)?.primaryLanguage;
  }, [destination]);

  return {
    destination,
    phrases,
    tips,
    isLoading,
    error,
    setDestination,
    loadSaved,
    getLanguageCode,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd voxlingo && npx jest --testPathPattern=useDestination.test -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add voxlingo/hooks/useDestination.ts voxlingo/hooks/useDestination.test.ts
git commit -m "feat: add useDestination hook for destination state + phrase/tip loading"
```

---

## Task 8: DestinationPicker Component

**Files:**
- Create: `voxlingo/components/DestinationPicker.tsx`

- [ ] **Step 1: Implement DestinationPicker**

```typescript
// voxlingo/components/DestinationPicker.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { DESTINATIONS, HERO_DESTINATIONS } from '../constants/destinations';
import { Destination } from '../types';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  selectedCode: string | null;
  onSelect: (countryCode: string) => void;
  onClose: () => void;
};

export function DestinationPicker({ visible, selectedCode, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? DESTINATIONS.filter((d) =>
        d.countryName.toLowerCase().includes(search.toLowerCase()),
      )
    : DESTINATIONS;

  // Sort: hero destinations first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.isHero && !b.isHero) return -1;
    if (!a.isHero && b.isHero) return 1;
    return a.countryName.localeCompare(b.countryName);
  });

  const renderItem = ({ item }: { item: Destination }) => {
    const isSelected = item.countryCode === selectedCode;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => {
          onSelect(item.countryCode);
          onClose();
        }}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
            {item.countryName}
          </Text>
          {item.isHero && <Text style={styles.heroBadge}>Featured</Text>}
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Where are you traveling?</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search countries..."
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.countryCode}
            renderItem={renderItem}
            style={styles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    padding: theme.spacing.sm,
  },
  searchInput: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs,
  },
  itemSelected: {
    backgroundColor: theme.colors.primaryGlow,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  itemNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  heroBadge: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/DestinationPicker.tsx
git commit -m "feat: add DestinationPicker component with search and hero badges"
```

---

## Task 9: PhraseCard + PhraseRow Components

**Files:**
- Create: `voxlingo/components/PhraseCard.tsx`
- Create: `voxlingo/components/PhraseRow.tsx`

- [ ] **Step 1: Implement PhraseCard**

```typescript
// voxlingo/components/PhraseCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Phrase } from '../types';
import { theme } from '../constants/theme';

type Props = {
  phrase: Phrase;
  onSpeak?: (text: string) => void;
};

export function PhraseCard({ phrase, onSpeak }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSpeak?.(phrase.translated)}
      activeOpacity={0.7}
    >
      <Text style={styles.category}>{phrase.category.toUpperCase()}</Text>
      <Text style={styles.english}>{phrase.english}</Text>
      <Text style={styles.translated}>{phrase.translated}</Text>
      {phrase.romanized && (
        <Text style={styles.romanized}>{phrase.romanized}</Text>
      )}
      {onSpeak && <Text style={styles.speakerIcon}>🔊</Text>}
      {!phrase.isEditorial && (
        <Text style={styles.aiLabel}>AI</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.md,
    width: 200,
    minHeight: 140,
    justifyContent: 'space-between',
    ...theme.shadow('sm'),
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  english: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  translated: {
    ...theme.typography.bodyLarge,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  romanized: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  speakerIcon: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    fontSize: 16,
  },
  aiLabel: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 9,
    opacity: 0.5,
  },
});
```

- [ ] **Step 2: Implement PhraseRow**

```typescript
// voxlingo/components/PhraseRow.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { PhraseCard } from './PhraseCard';
import { Phrase } from '../types';
import { theme } from '../constants/theme';

type Props = {
  phrases: Phrase[];
  isLoading: boolean;
  onSpeak?: (text: string) => void;
};

export function PhraseRow({ phrases, isLoading, onSpeak }: Props) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading phrases...</Text>
      </View>
    );
  }

  if (phrases.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Essential Phrases</Text>
      <FlatList
        data={phrases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PhraseCard phrase={item} onSpeak={onSpeak} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
```

- [ ] **Step 3: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add voxlingo/components/PhraseCard.tsx voxlingo/components/PhraseRow.tsx
git commit -m "feat: add PhraseCard and PhraseRow components for essential travel phrases"
```

---

## Task 10: TipCard Component

**Files:**
- Create: `voxlingo/components/TipCard.tsx`

- [ ] **Step 1: Implement TipCard**

```typescript
// voxlingo/components/TipCard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CulturalTip } from '../types';
import { theme } from '../constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  etiquette: 'Etiquette',
  money: 'Money & Tipping',
  food: 'Food & Dining',
  safety: 'Safety',
  social: 'Social Norms',
  language: 'Language Tips',
};

type Props = {
  tips: CulturalTip[];
  onFlag?: (tipId: string) => void;
};

export function TipCard({ tips, onFlag }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (tips.length === 0) return null;

  const tip = tips[currentIndex];
  const hasNext = currentIndex < tips.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Did you know?</Text>
      <View style={styles.card}>
        <Text style={styles.category}>{CATEGORY_LABELS[tip.category] || tip.category}</Text>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.body}>{tip.body}</Text>
        <View style={styles.footer}>
          <View style={styles.nav}>
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i - 1)}
              disabled={!hasPrev}
              style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
            >
              <Text style={styles.navText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.counter}>{currentIndex + 1}/{tips.length}</Text>
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i + 1)}
              disabled={!hasNext}
              style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
            >
              <Text style={styles.navText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          {tip.sourceType === 'ai-generated' && (
            <Text style={styles.aiLabel}>AI-generated tip</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    ...theme.shadow('sm'),
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  navButton: {
    padding: theme.spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  counter: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  aiLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/TipCard.tsx
git commit -m "feat: add TipCard component with navigation and AI attribution"
```

---

## Task 11: EmergencyCard Component

**Files:**
- Create: `voxlingo/components/EmergencyCard.tsx`

- [ ] **Step 1: Implement EmergencyCard**

```typescript
// voxlingo/components/EmergencyCard.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { EmergencyInfo } from '../types';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  info: EmergencyInfo;
  countryName: string;
  onClose: () => void;
};

export function EmergencyCard({ visible, info, countryName, onClose }: Props) {
  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency — {countryName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.numbersRow}>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.police)}>
              <Text style={styles.numberLabel}>Police</Text>
              <Text style={styles.number}>{info.police}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.ambulance)}>
              <Text style={styles.numberLabel}>Ambulance</Text>
              <Text style={styles.number}>{info.ambulance}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.fire)}>
              <Text style={styles.numberLabel}>Fire</Text>
              <Text style={styles.number}>{info.fire}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.phrasesSection}>
            <Text style={styles.phrasesTitle}>Show someone these phrases:</Text>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>I need help:</Text>
              <Text style={styles.phraseText}>{info.phrases.help}</Text>
            </View>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>Call an ambulance:</Text>
              <Text style={styles.phraseText}>{info.phrases.callAmbulance}</Text>
            </View>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>I don't speak the language:</Text>
              <Text style={styles.phraseText}>{info.phrases.dontSpeak}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.advisoryLink}
            onPress={() => Linking.openURL(info.advisoryUrl)}
          >
            <Text style={styles.advisoryText}>Official travel advisory →</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Emergency information is for reference. Always verify with local authorities.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.error,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    padding: theme.spacing.sm,
  },
  numbersRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  numberCard: {
    flex: 1,
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  numberLabel: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  number: {
    ...theme.typography.title,
    color: theme.colors.error,
    fontWeight: '800',
  },
  phrasesSection: {
    marginBottom: theme.spacing.xl,
  },
  phrasesTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  phraseItem: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  phraseLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  phraseText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  advisoryLink: {
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  advisoryText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  disclaimer: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/EmergencyCard.tsx
git commit -m "feat: add EmergencyCard component with call buttons and phrases"
```

---

## Task 12: TaxiCard Component

**Files:**
- Create: `voxlingo/services/location.ts`
- Create: `voxlingo/components/TaxiCard.tsx`

- [ ] **Step 1: Install expo-location**

Run: `cd voxlingo && npx expo install expo-location`
Expected: Package installed successfully

- [ ] **Step 2: Implement location service**

```typescript
// voxlingo/services/location.ts
import * as Location from 'expo-location';

export type LocationInfo = {
  address: string;
  latitude: number;
  longitude: number;
};

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationInfo | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const parts = [
      geocode?.streetNumber,
      geocode?.street,
      geocode?.district,
      geocode?.city,
      geocode?.region,
    ].filter(Boolean);

    return {
      address: parts.join(', ') || `${location.coords.latitude}, ${location.coords.longitude}`,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Implement TaxiCard**

```typescript
// voxlingo/components/TaxiCard.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getCurrentLocation, LocationInfo } from '../services/location';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  hotelAddress?: string;
  hotelAddressLocal?: string;
  onClose: () => void;
};

export function TaxiCard({ visible, hotelAddress, hotelAddressLocal, onClose }: Props) {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadLocation();
    }
  }, [visible]);

  const loadLocation = async () => {
    setIsLoading(true);
    setError(null);
    const loc = await getCurrentLocation();
    if (loc) {
      setLocation(loc);
    } else {
      setError('Could not get your location. Please enable location services.');
    }
    setIsLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadLocation}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {location && !isLoading && (
          <View style={styles.content}>
            <Text style={styles.heading}>Show this to your driver</Text>

            <View style={styles.addressCard}>
              <Text style={styles.addressLabel}>My current location:</Text>
              <Text style={styles.addressText}>{location.address}</Text>
            </View>

            {hotelAddress && (
              <View style={styles.addressCard}>
                <Text style={styles.addressLabel}>Take me to:</Text>
                <Text style={styles.addressText}>{hotelAddress}</Text>
                {hotelAddressLocal && (
                  <Text style={styles.addressLocal}>{hotelAddressLocal}</Text>
                )}
              </View>
            )}

            <Text style={styles.coordinates}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.header,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: theme.spacing.xl,
    zIndex: 1,
    padding: theme.spacing.md,
  },
  closeText: {
    ...theme.typography.body,
    color: 'white',
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  retryText: {
    ...theme.typography.body,
    color: 'white',
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    gap: theme.spacing.xxl,
  },
  heading: {
    ...theme.typography.title,
    color: 'white',
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  addressLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  addressText: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    lineHeight: 36,
  },
  addressLocal: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  coordinates: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.4)',
  },
});
```

- [ ] **Step 4: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add voxlingo/services/location.ts voxlingo/components/TaxiCard.tsx
git commit -m "feat: add TaxiCard component with location service for taxi drivers"
```

---

## Task 13: MenuResult + SignResult Components (Smart Camera UI)

**Files:**
- Create: `voxlingo/components/MenuResult.tsx`
- Create: `voxlingo/components/SignResult.tsx`

- [ ] **Step 1: Implement MenuResult**

```typescript
// voxlingo/components/MenuResult.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MenuTranslation, MenuItem } from '../types';
import { theme } from '../constants/theme';

const ALLERGEN_COLORS: Record<string, string> = {
  wheat: '#D2691E', egg: '#FFD700', dairy: '#87CEEB', nuts: '#8B4513',
  peanuts: '#CD853F', soy: '#556B2F', shellfish: '#FF6347', fish: '#4682B4',
  sesame: '#DEB887', pork: '#FF69B4', beef: '#8B0000',
};

type Props = {
  result: MenuTranslation;
  userDietary?: string[];
};

function MenuItemCard({ item, userDietary }: { item: MenuItem; userDietary?: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const hasConflict = userDietary?.some((pref) =>
    item.possibleAllergens.some((a) => a.toLowerCase().includes(pref.toLowerCase())),
  );

  return (
    <TouchableOpacity
      style={[styles.menuItem, hasConflict && styles.menuItemConflict]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemHeader}>
        <View style={styles.menuItemTitles}>
          <Text style={styles.menuItemOriginal}>{item.original}</Text>
          <Text style={styles.menuItemTranslated}>{item.translated}</Text>
        </View>
        {item.popular && <Text style={styles.popularBadge}>Popular</Text>}
      </View>

      {expanded && (
        <View style={styles.menuItemDetails}>
          <Text style={styles.description}>{item.description}</Text>

          {item.possibleAllergens.length > 0 && (
            <View style={styles.allergensRow}>
              <Text style={styles.allergensLabel}>
                Possibly contains ({item.allergenConfidence}):
              </Text>
              <View style={styles.allergenPills}>
                {item.possibleAllergens.map((allergen) => (
                  <View
                    key={allergen}
                    style={[
                      styles.allergenPill,
                      { backgroundColor: ALLERGEN_COLORS[allergen] || '#999' },
                    ]}
                  >
                    <Text style={styles.allergenText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.allergenConfidence === 'low' && (
            <Text style={styles.askStaff}>Ask staff about allergens</Text>
          )}

          {item.dietary.length > 0 && (
            <View style={styles.dietaryRow}>
              {item.dietary.map((d) => (
                <Text key={d} style={styles.dietaryBadge}>{d}</Text>
              ))}
            </View>
          )}

          {hasConflict && (
            <Text style={styles.conflictWarning}>
              May conflict with your dietary preferences — ask staff to confirm
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MenuResult({ result, userDietary }: Props) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.detectedLang}>
        Detected: {result.detectedLanguage.toUpperCase()}
      </Text>
      <Text style={styles.menuLabel}>Menu — tap items for details</Text>

      {result.items.map((item, index) => (
        <MenuItemCard key={index} item={item} userDietary={userDietary} />
      ))}

      <Text style={styles.disclaimer}>{result.disclaimer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detectedLang: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  menuLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  menuItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow('sm'),
  },
  menuItemConflict: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemTitles: {
    flex: 1,
  },
  menuItemOriginal: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  menuItemTranslated: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  popularBadge: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    fontWeight: '700',
    overflow: 'hidden',
  },
  menuItemDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  allergensLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  allergensRow: {
    marginBottom: theme.spacing.md,
  },
  allergenPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  allergenPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  allergenText: {
    ...theme.typography.caption,
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  askStaff: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  dietaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  dietaryBadge: {
    ...theme.typography.caption,
    color: theme.colors.success,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    fontWeight: '600',
    overflow: 'hidden',
  },
  conflictWarning: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  disclaimer: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
});
```

- [ ] **Step 2: Implement SignResult**

```typescript
// voxlingo/components/SignResult.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignTranslation } from '../types';
import { theme } from '../constants/theme';

type Props = {
  result: SignTranslation;
};

export function SignResult({ result }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.detectedLang}>
        Detected: {result.detectedLanguage.toUpperCase()}
      </Text>

      <View style={styles.textSection}>
        <Text style={styles.label}>Original</Text>
        <Text style={styles.originalText}>{result.originalText}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.textSection}>
        <Text style={styles.label}>Translation</Text>
        <Text style={styles.translatedText}>{result.translatedText}</Text>
      </View>

      {result.context && (
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>What this means for you:</Text>
          <Text style={styles.contextText}>{result.context}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detectedLang: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  textSection: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  originalText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  translatedText: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  contextCard: {
    backgroundColor: theme.colors.primaryGlow,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  contextLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  contextText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
});
```

- [ ] **Step 3: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add voxlingo/components/MenuResult.tsx voxlingo/components/SignResult.tsx
git commit -m "feat: add MenuResult and SignResult components for smart camera"
```

---

## Task 14: Integrate Travel Features into Travel Tab

**Files:**
- Modify: `voxlingo/app/(tabs)/index.tsx`

This is the big integration task. The Travel tab gets: destination picker trigger, phrase row, tip card, SOS button, and taxi card button.

- [ ] **Step 1: Update Travel tab imports and state**

At the top of `voxlingo/app/(tabs)/index.tsx`, add these imports:

```typescript
import { useDestination } from '../../hooks/useDestination';
import { PhraseRow } from '../../components/PhraseRow';
import { TipCard } from '../../components/TipCard';
import { DestinationPicker } from '../../components/DestinationPicker';
import { EmergencyCard } from '../../components/EmergencyCard';
import { TaxiCard } from '../../components/TaxiCard';
import { getEmergencyInfo } from '../../constants/emergency';
import { getDestination } from '../../constants/destinations';
import { speak } from '../../services/speech';
```

Add new state variables inside the component:

```typescript
const { destination, phrases, tips, isLoading: destLoading, setDestination, loadSaved, getLanguageCode } = useDestination();
const [showDestinationPicker, setShowDestinationPicker] = useState(false);
const [showEmergency, setShowEmergency] = useState(false);
const [showTaxi, setShowTaxi] = useState(false);
```

Add a useEffect to load saved destination on mount:

```typescript
useEffect(() => {
  loadSaved();
}, []);
```

When destination changes, auto-set target language:

```typescript
useEffect(() => {
  const langCode = getLanguageCode();
  if (langCode && langCode !== targetLang) {
    setTargetLang(langCode);
  }
}, [destination]);
```

- [ ] **Step 2: Update the header to include SOS and destination display**

Replace the header View in the JSX with:

```tsx
<View style={styles.header}>
  <View style={styles.headerLeft}>
    <Text style={styles.appTitle}>VoxLingo</Text>
    {destination && (
      <TouchableOpacity onPress={() => setShowDestinationPicker(true)}>
        <Text style={styles.destinationBadge}>
          {getDestination(destination)?.countryName || destination}
        </Text>
      </TouchableOpacity>
    )}
  </View>
  <View style={styles.headerRight}>
    {destination && (
      <TouchableOpacity onPress={() => setShowEmergency(true)} style={styles.sosButton}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity onPress={toggleSlowSpeech}>
      <Text style={styles.slowSpeechButton}>{slowSpeech ? '🐢' : '🐇'}</Text>
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 3: Add travel content above the translation list**

Below the language pickers and above the FlatList, add:

```tsx
{!destination && (
  <TouchableOpacity
    style={styles.setupDestination}
    onPress={() => setShowDestinationPicker(true)}
  >
    <Text style={styles.setupText}>Where are you traveling?</Text>
    <Text style={styles.setupSubtext}>Set your destination for phrases, tips, and more</Text>
  </TouchableOpacity>
)}

{destination && (
  <>
    <PhraseRow
      phrases={phrases}
      isLoading={destLoading}
      onSpeak={(text) => {
        const langCode = getLanguageCode();
        if (langCode) speak(text, langCode);
      }}
    />
    <TipCard tips={tips} />
    <TouchableOpacity style={styles.taxiButton} onPress={() => setShowTaxi(true)}>
      <Text style={styles.taxiButtonText}>Show location to taxi driver</Text>
    </TouchableOpacity>
  </>
)}
```

- [ ] **Step 4: Add modals at the bottom of the JSX (before the closing View)**

```tsx
<DestinationPicker
  visible={showDestinationPicker}
  selectedCode={destination}
  onSelect={(code) => setDestination(code)}
  onClose={() => setShowDestinationPicker(false)}
/>

{destination && (
  <EmergencyCard
    visible={showEmergency}
    info={getEmergencyInfo(destination)}
    countryName={getDestination(destination)?.countryName || destination}
    onClose={() => setShowEmergency(false)}
  />
)}

<TaxiCard
  visible={showTaxi}
  onClose={() => setShowTaxi(false)}
/>
```

- [ ] **Step 5: Add new styles**

Add to the StyleSheet.create:

```typescript
headerLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing.md,
},
headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing.md,
},
destinationBadge: {
  ...theme.typography.caption,
  color: theme.colors.primary,
  backgroundColor: theme.colors.primaryGlow,
  paddingHorizontal: theme.spacing.sm,
  paddingVertical: 2,
  borderRadius: theme.radius.sm,
  fontWeight: '600',
  overflow: 'hidden',
},
sosButton: {
  backgroundColor: theme.colors.error,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.xs,
  borderRadius: theme.radius.sm,
},
sosText: {
  ...theme.typography.caption,
  color: 'white',
  fontWeight: '800',
},
setupDestination: {
  backgroundColor: theme.colors.primaryGlow,
  margin: theme.spacing.lg,
  padding: theme.spacing.xl,
  borderRadius: theme.radius.lg,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: theme.colors.primary,
  borderStyle: 'dashed',
},
setupText: {
  ...theme.typography.subtitle,
  color: theme.colors.primary,
  fontWeight: '700',
},
setupSubtext: {
  ...theme.typography.caption,
  color: theme.colors.textSecondary,
  marginTop: theme.spacing.xs,
},
taxiButton: {
  backgroundColor: theme.colors.header,
  marginHorizontal: theme.spacing.lg,
  marginBottom: theme.spacing.lg,
  padding: theme.spacing.lg,
  borderRadius: theme.radius.md,
  alignItems: 'center',
},
taxiButtonText: {
  ...theme.typography.body,
  color: 'white',
  fontWeight: '600',
},
```

- [ ] **Step 6: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add voxlingo/app/\(tabs\)/index.tsx
git commit -m "feat: integrate destination picker, phrases, tips, SOS, taxi into Travel tab"
```

---

## Task 15: Integrate Smart Camera into Camera Tab

**Files:**
- Modify: `voxlingo/app/(tabs)/camera.tsx`

- [ ] **Step 1: Update camera tab imports**

Add to the top of `voxlingo/app/(tabs)/camera.tsx`:

```typescript
import { translateImageSmart } from '../../services/vision';
import { MenuResult } from '../../components/MenuResult';
import { SignResult } from '../../components/SignResult';
import { SmartVisionResponse } from '../../types';
```

- [ ] **Step 2: Replace VisionResponse state with SmartVisionResponse**

Change the state:

```typescript
// Replace:
const [result, setResult] = useState<VisionResponse | null>(null);
// With:
const [result, setResult] = useState<SmartVisionResponse | null>(null);
```

- [ ] **Step 3: Update the translate call to use translateImageSmart**

Replace the `translateImage` call in the photo handling logic with:

```typescript
const smartResult = await translateImageSmart(base64, targetLang);
if (currentCaptureId === captureIdRef.current) {
  setResult(smartResult);
}
```

- [ ] **Step 4: Update the result rendering**

Replace the current result display section (originalText/translatedText) with:

```tsx
{result && result.contentType === 'menu' && (
  <MenuResult result={result} />
)}

{result && result.contentType === 'sign' && (
  <SignResult result={result} />
)}

{result && result.contentType === 'general' && (
  <View>
    <Text style={styles.detectedLang}>
      Detected: {result.detectedLanguage.toUpperCase()}
    </Text>
    <View style={styles.textSection}>
      <Text style={styles.textLabel}>Original</Text>
      <Text style={styles.originalText}>{result.originalText}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.textSection}>
      <Text style={styles.textLabel}>Translation</Text>
      <Text style={styles.translatedText}>{result.translatedText}</Text>
    </View>
  </View>
)}
```

- [ ] **Step 5: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add voxlingo/app/\(tabs\)/camera.tsx
git commit -m "feat: integrate smart camera — conditional menu/sign/general rendering"
```

---

## Task 16: Run All Tests + Manual Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Run all server tests**

Run: `cd voxlingo/server && npx jest -v`
Expected: All tests PASS

- [ ] **Step 2: Run all client tests**

Run: `cd voxlingo && npx jest -v`
Expected: All tests PASS

- [ ] **Step 3: Run full typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Start dev server and smoke test**

Run: `cd voxlingo/server && npm run dev` (in one terminal)
Run: `cd voxlingo && npx expo start` (in another terminal)

Manual checks:
1. App opens — "Where are you traveling?" prompt shown
2. Tap prompt → DestinationPicker opens → select Japan
3. Phrase row appears with Japanese phrases
4. Cultural tips card appears with swipe navigation
5. SOS button appears in header → tap → EmergencyCard with Japan numbers
6. Taxi card button → tap → location card loads
7. Camera tab → take photo of text → result renders (menu/sign/general)
8. Voice translation still works as before

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat: Phase 1 complete — travel identity, smart camera, emergency, taxi card"
```
