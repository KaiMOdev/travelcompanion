# Converting Image Translation Endpoint to Python (FastAPI)

## Analysis

The existing TypeScript endpoint is in two files:
- **Route**: `voxlingo/server/routes/translate.ts` — Express POST `/api/translate/image`
- **Service**: `voxlingo/server/services/geminiVision.ts` — `translateImageWithGemini()` using `@google/genai`

Per the skill's guidance, the Python equivalent SDK is `google-genai` (same API surface as `@google/genai`). Key patterns to preserve:
- Strip base64 data URI prefix before sending
- Request JSON-only response from Gemini
- Parse with regex fallback for non-JSON responses
- Rate limiting (15 RPM free tier)
- API key stays server-side only

## Solution

### 1. Install dependencies

```bash
pip install fastapi uvicorn google-genai python-dotenv
```

### 2. `services/gemini_vision.py` — Vision service

```python
import re
import os
from dataclasses import dataclass
from google import genai

@dataclass
class VisionResult:
    detected_language: str
    original_text: str
    translated_text: str

# Language code to name mapping (mirrors languageNames.ts)
LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "ja": "Japanese",
    "ko": "Korean", "zh": "Chinese", "ar": "Arabic", "hi": "Hindi",
    "ru": "Russian", "th": "Thai", "vi": "Vietnamese", "tr": "Turkish",
}

def get_language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, code)

async def translate_image_with_gemini(image_base64: str, target_lang: str) -> VisionResult:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")

    client = genai.Client(api_key=api_key)
    target_name = get_language_name(target_lang)

    # Strip data URI prefix if present (e.g., "data:image/png;base64,...")
    clean_base64 = re.sub(r"^data:image/\w+;base64,", "", image_base64)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": clean_base64,
                        }
                    },
                    {
                        "text": (
                            f"Detect all text in this image. Identify the language. "
                            f"Translate all detected text to {target_name}. "
                            f'Return as JSON: {{ "detectedLanguage": string, "originalText": string, "translatedText": string }}. '
                            f"Return ONLY the JSON, no other text."
                        )
                    },
                ],
            }
        ],
    )

    return _parse_vision_response(response.text or "")


def _parse_vision_response(response_text: str) -> VisionResult:
    """Parse Gemini response, extracting JSON with regex fallback."""
    try:
        match = re.search(r"\{[\s\S]*\}", response_text)
        if match:
            import json
            parsed = json.loads(match.group(0))
            return VisionResult(
                detected_language=parsed.get("detectedLanguage", "unknown"),
                original_text=parsed.get("originalText", ""),
                translated_text=parsed.get("translatedText", ""),
            )
    except (json.JSONDecodeError, KeyError):
        pass

    # Fallback: return raw response as translated text
    return VisionResult(
        detected_language="unknown",
        original_text="",
        translated_text=response_text,
    )
```

### 3. `main.py` — FastAPI application

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from services.gemini_vision import translate_image_with_gemini

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate API key at startup
    if not os.environ.get("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY environment variable is required")
    yield

app = FastAPI(title="VoxLingo API", lifespan=lifespan)


class ImageTranslateRequest(BaseModel):
    image: str  # base64-encoded image
    targetLang: str


class ImageTranslateResponse(BaseModel):
    detectedLanguage: str
    originalText: str
    translatedText: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/translate/image", response_model=ImageTranslateResponse)
async def translate_image(req: ImageTranslateRequest):
    if not req.image:
        raise HTTPException(status_code=400, detail="Missing or invalid 'image' field (base64 string)")

    try:
        result = await translate_image_with_gemini(req.image, req.targetLang)
        return ImageTranslateResponse(
            detectedLanguage=result.detected_language,
            originalText=result.original_text,
            translatedText=result.translated_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to translate image: {e}")
```

### 4. Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

### 5. Optional: Add rate limiting

```bash
pip install slowapi
```

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/translate/image")
@limiter.limit("15/minute")  # Match Gemini free tier
async def translate_image(request: Request, req: ImageTranslateRequest):
    ...
```

## Key Patterns Preserved

| Pattern | TypeScript | Python |
|---------|-----------|--------|
| SDK | `@google/genai` | `google-genai` |
| Base64 stripping | `replace(/^data:image\/\w+;base64,/, "")` | `re.sub(r"^data:image/\w+;base64,", "", ...)` |
| JSON parsing | `responseText.match(/\{[\s\S]*\}/)` | `re.search(r"\{[\s\S]*\}", ...)` |
| Error handling | try/catch → 500 response | try/except → HTTPException |
| API key | `process.env.GEMINI_API_KEY` | `os.environ.get("GEMINI_API_KEY")` |
| Rate limiting | Custom middleware (15 RPM) | slowapi (15/minute) |
