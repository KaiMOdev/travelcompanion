import * as Speech from 'expo-speech';
import { speak, stop, toBcp47 } from './speech';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

describe('speech service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Speech.speak with text and language', () => {
    speak('hola', 'es', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('hola', {
      language: 'es',
      rate: expect.any(Number),
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('maps zh to zh-CN', () => {
    speak('你好', 'zh', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('你好', {
      language: 'zh-CN',
      rate: expect.any(Number),
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('maps tl to fil', () => {
    speak('kumusta', 'tl', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('kumusta', {
      language: 'fil',
      rate: expect.any(Number),
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('calls Speech.stop', () => {
    stop();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
