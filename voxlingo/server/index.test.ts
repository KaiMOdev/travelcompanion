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
