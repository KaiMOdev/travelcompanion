import { renderHook, act } from "@testing-library/react-native";
import { useTranslation } from "./useTranslation";
import { Translation } from "../types";

describe("useTranslation", () => {
  const mockTranslation: Translation = {
    id: "1",
    sourceLang: "en",
    targetLang: "es",
    originalText: "Hello",
    translatedText: "Hola",
    mode: "travel",
    timestamp: Date.now(),
    cached: false,
  };

  it("starts with empty translations", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));
    expect(result.current.translations).toEqual([]);
    expect(result.current.isTranslating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("adds a translation", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.addTranslation(mockTranslation);
    });

    expect(result.current.translations).toHaveLength(1);
    expect(result.current.translations[0].translatedText).toBe("Hola");
  });

  it("clears all translations", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.addTranslation(mockTranslation);
    });

    act(() => {
      result.current.clearTranslations();
    });

    expect(result.current.translations).toEqual([]);
  });

  it("sets translating state", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.setTranslating(true);
    });

    expect(result.current.isTranslating).toBe(true);
  });
});
