import {
  saveTranslationToHistory,
  getTranslationHistory,
  saveWordToList,
  getWordList,
} from "./firebase";

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn().mockReturnValue({}),
  getApps: jest.fn().mockReturnValue([]),
}));

const mockDoc = jest.fn().mockReturnValue("doc-ref");
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDocs = jest.fn().mockResolvedValue({
  docs: [
    {
      id: "1",
      data: () => ({
        sourceLang: "en",
        targetLang: "es",
        originalText: "Hello",
        translatedText: "Hola",
        mode: "travel",
        timestamp: 1000,
        cached: false,
      }),
    },
  ],
});
const mockCollection = jest.fn().mockReturnValue("collection-ref");
const mockQuery = jest.fn().mockReturnValue("query-ref");
const mockOrderBy = jest.fn().mockReturnValue("order-ref");
const mockLimit = jest.fn().mockReturnValue("limit-ref");
const mockAddDoc = jest.fn().mockResolvedValue({ id: "new-id" });

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue({}),
  enableIndexedDbPersistence: jest.fn().mockResolvedValue(undefined),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn().mockReturnValue({ currentUser: null }),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

describe("firebase service", () => {
  it("saves translation to history", async () => {
    await saveTranslationToHistory("user1", {
      sourceLang: "en",
      targetLang: "es",
      originalText: "Hello",
      translatedText: "Hola",
      mode: "travel",
    });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("retrieves translation history", async () => {
    const history = await getTranslationHistory("user1");
    expect(history).toHaveLength(1);
    expect(history[0].translatedText).toBe("Hola");
  });

  it("saves word to list", async () => {
    await saveWordToList("user1", {
      word: "Hello",
      translation: "Hola",
      sourceLang: "en",
      targetLang: "es",
    });
    expect(mockAddDoc).toHaveBeenCalled();
  });

  it("retrieves word list", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "w1",
          data: () => ({
            word: "Hello",
            translation: "Hola",
            sourceLang: "en",
            targetLang: "es",
            savedAt: 1000,
          }),
        },
      ],
    });
    const words = await getWordList("user1");
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe("Hello");
  });
});
