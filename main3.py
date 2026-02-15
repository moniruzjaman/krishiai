import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(".env.local")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEN_AI_KEY = os.getenv("GEMINI_API_KEY")
if GEN_AI_KEY:
    genai.configure(api_key=GEN_AI_KEY)
else:
    print("Warning: GEMINI_API_KEY not found in environment")

class DiagnosticLog(BaseModel):
    user_id: str
    crop: str
    diagnosis: str
    category: str
    confidence: float
    advisory: str
    location: Optional[str] = None

@app.post("/api/v1/diagnostics/log")
async def log_diagnostic(log: DiagnosticLog):
    print(f"Received diagnostic log: {log}")
    return {"status": "success", "message": "Log received"}

@app.get("/api/v1/advisory/official")
async def get_official_advisory(crop: str, condition: str):
    if not GEN_AI_KEY:
        print("Gemini Config Missing - Attempting Fallback")
        return await get_hf_advisory(crop, condition)

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Act as a Senior Scientific Officer of Bangladesh Agriculture.
        Provide a concise official advisory for {crop} facing {condition}.
        Ground your response in BARI/BRRI standards.
        Format:
        [পরামর্শ]: ...
        [সতর্কতা]: ...
        Response Language: Bangla.
        """
        response = model.generate_content(prompt)
        advisory_text = response.text
        
        return {
            "crop": crop,
            "condition": condition,
            "advisory": advisory_text,
            "source": "Krishi AI Official (BARI/BRRI Grounded)"
        }
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback to Hugging Face
        return await get_hf_advisory(crop, condition)

async def get_hf_advisory(crop: str, condition: str):
    import requests
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        return {
            "crop": crop,
            "condition": condition,
            "advisory": "Error: Both Gemini and HF_TOKEN unavailable.",
            "source": "System Error"
        }
    
    try:
        # Use Qwen 2.5 7B Instruct (Reliable & Free)
        API_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-7B-Instruct"
        headers = {"Authorization": f"Bearer {hf_token}"}
        
        # ChatML Prompt Format
        prompt = f"""<|im_start|>system
You are a Senior Scientific Officer. Provide a concise official advisory for {crop} facing {condition}. Ground in BARI/BRRI standards. Format: [পরামর্শ]: ... [সতর্কতা]: ... Response Language: Bangla.<|im_end|>
<|im_start|>user
Advisorty for {crop} with {condition}.<|im_end|>
<|im_start|>assistant
"""
        
        payload = {
            "inputs": prompt,
            "parameters": {"max_new_tokens": 512, "temperature": 0.2, "return_full_text": False}
        }
        
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        advisory_text = result[0]['generated_text'] if isinstance(result, list) else result.get('generated_text', "No text generated")

        return {
            "crop": crop,
            "condition": condition,
            "advisory": advisory_text,
            "source": "Krishi AI Fallback (Hugging Face / Zephyr)"
        }
    except Exception as hf_e:
        print(f"HF Fallback Error: {hf_e}")
        return {
            "crop": crop,
            "condition": condition,
            "advisory": "Failed to generate advisory from both Gemini and Fallback.",
            "source": "System Error"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
