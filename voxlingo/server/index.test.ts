import { createApp } from './index';
import request from 'supertest';

// Mock @google/genai
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    __mockGenerateContent: mockGenerateContent,
  };
});

const { __mockGenerateContent: mockGenerateContent } = jest.requireMock('@google/genai');

describe('POST /translate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns translated text from Gemini', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"originalText": "hello", "translatedText": "hola"}',
    });

    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({
        audio: 'dGVzdA==',
        sourceLang: 'en',
        targetLang: 'es',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      originalText: 'hello',
      translatedText: 'hola',
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({ audio: 'dGVzdA==' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 when Gemini call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({
        audio: 'dGVzdA==',
        sourceLang: 'en',
        targetLang: 'es',
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /vision (smart camera)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(menuResponse),
    });

    const app = createApp();
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
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(signResponse),
    });

    const app = createApp();
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
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(generalResponse),
    });

    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64data', targetLang: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.contentType).toBe('general');
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid language code', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img', targetLang: 'xx' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid language code');
  });

  it('returns 500 when Gemini call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img', targetLang: 'en' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /destination/:code/phrases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns phrases for a valid country code', async () => {
    const mockPhrases = [
      { id: '1', english: 'Hello', translated: 'こんにちは', romanized: 'Konnichiwa', category: 'greeting', isEditorial: false },
    ];
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockPhrases),
    });

    const app = createApp();
    const res = await request(app).get('/destination/JP/phrases');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('english');
    expect(res.body[0]).toHaveProperty('translated');
    expect(res.body[0]).toHaveProperty('category');
  });

  it('returns 400 for invalid country code', async () => {
    const app = createApp();
    const res = await request(app).get('/destination/XX/phrases');
    expect(res.status).toBe(400);
  });
});

describe('GET /destination/:code/tips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tips for a valid country code', async () => {
    const mockTips = [
      { id: '1', category: 'etiquette', title: 'Bowing', body: 'Bow when greeting.', countryCode: 'JP', sourceType: 'ai-generated' },
    ];
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockTips),
    });

    const app = createApp();
    const res = await request(app).get('/destination/JP/tips');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('body');
    expect(res.body[0]).toHaveProperty('category');
  });

  it('returns 400 for invalid country code', async () => {
    const app = createApp();
    const res = await request(app).get('/destination/XX/tips');
    expect(res.status).toBe(400);
  });
});
