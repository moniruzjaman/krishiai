import os
import requests
import json
import sys

def test_gemini_api():
    print("Testing Gemini API keys loaded from Environment...")
    # Get Key
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set.")
        sys.exit(1)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [{"parts":[{"text": "Return 'OK' if you can read this."}]}]
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data), timeout=10)
        if response.status_code == 200:
            print("SUCCESS: Gemini API is fully functional.")
            sys.exit(0)
        else:
            print(f"FAILED: Gemini returned HTTP {response.status_code}")
            print(f"Details: {response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: Exception occurred connecting to Gemini API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_gemini_api()
