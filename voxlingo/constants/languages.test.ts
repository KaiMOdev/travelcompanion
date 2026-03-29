import {
  SUPPORTED_LANGUAGES,
  getLanguageName,
  getLanguageNativeName,
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "./languages";

describe("languages", () => {
  it("has 17 supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(17);
  });

  it("has unique language codes", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("returns language name by code", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("ja")).toBe("Japanese");
    expect(getLanguageName("nl")).toBe("Dutch");
  });

  it("returns native name by code", () => {
    expect(getLanguageNativeName("ja")).toBe("日本語");
    expect(getLanguageNativeName("nl")).toBe("Nederlands");
  });

  it("has valid defaults", () => {
    expect(DEFAULT_SOURCE_LANG).toBe("en");
    expect(DEFAULT_TARGET_LANG).toBe("es");
  });
});
