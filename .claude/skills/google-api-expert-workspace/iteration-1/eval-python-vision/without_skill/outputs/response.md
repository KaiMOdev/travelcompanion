# Converting Image Translation Endpoint to Python (FastAPI)

## Analysis

The existing implementation is in `voxlingo/server/services/geminiVision.ts` using `@google/genai`. I'll convert this to Python using the Google Generative AI SDK.

## Solution

### Install dependencies

```bash
pip install fastapi uvicorn google-generativeai python-dotenv
```

### `vision_service.py`

```python
import re
import os
import json
import google.generativeai as genai

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

async def translate_image(image_base64: str, target_lang: str) -> dict:
    # Remove data URI prefix
    clean = re.sub(r"^data:image/\w+;base64,", "", image_base64)

    response = model.generate_content([
        {
            "mime_type": "image/jpeg",
            "data": clean,
        },
        f"Detect all text in this image. Translate to {target_lang}. Return JSON with detectedLanguage, originalText, translatedText."
    ])

    text = response.text
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except json.JSONDecodeError:
        pass

    return {"detectedLanguage": "unknown", "originalText": "", "translatedText": text}
```

### `main.py`

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from vision_service import translate_image

load_dotenv()

app = FastAPI()

class TranslateRequest(BaseModel):
    image: str
    targetLang: str

@app.post("/api/translate/image")
async def translate(req: TranslateRequest):
    try:
        result = await translate_image(req.image, req.targetLang)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Run

```bash
uvicorn main:app --port 3001
```
