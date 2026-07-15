import os
import re
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Ensure env is loaded
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GENRE_MAP = {
    "action": 28, "adventure": 12, "animation": 16, "comedy": 35,
    "crime": 80, "documentary": 99, "drama": 18, "family": 10751,
    "fantasy": 14, "history": 36, "horror": 27, "music": 10402,
    "mystery": 96, "romance": 10749, "science fiction": 878, "sci-fi": 878,
    "tv movie": 10770, "thriller": 53, "war": 10752, "western": 37
}

LANG_MAP = {
    "english": "en", "french": "fr", "spanish": "es", "german": "de",
    "japanese": "ja", "korean": "ko", "italian": "it", "chinese": "zh",
    "cantonese": "cn", "hindi": "hi"
}

def parse_free_text_regex(text: str) -> Dict[str, Any]:
    """Parse text using regex and word matching to extract basic preferences."""
    text_lower = text.lower()
    profile = {
        "include_adult": True,
        "with_genres": [],
        "without_genres": [],
        "with_keywords": [],
        "without_keywords": [],
        "with_companies": [],
        "without_companies": [],
        "with_runtime_gte": None,
        "with_runtime_lte": None,
        "release_year_gte": None,
        "release_year_lte": None,
        "with_original_language": None,
        "confidence": 0.0
    }
    
    matches_count = 0

    # 1. Exclude genres (e.g., "no horror", "except comedy", "avoid romance")
    exc_genre_patterns = [
        r'(?:no|without|avoid|except|excluding|no more)\s+([a-zA-Z\s\-]+)',
        r'([a-zA-Z\s\-]+)\s+(?:is a no|is excluded|should be avoided)'
    ]
    for pattern in exc_genre_patterns:
        for match in re.finditer(pattern, text_lower):
            words = match.group(1).strip()
            for genre_name, genre_id in GENRE_MAP.items():
                if genre_name in words:
                    if genre_id not in profile["without_genres"]:
                        profile["without_genres"].append(genre_id)
                        matches_count += 1

    # 2. Include genres (e.g., "love sci-fi", "prefer comedy", "want drama")
    inc_genre_patterns = [
        r'(?:love|like|prefer|want|include|focus on)\s+([a-zA-Z\s\-]+)',
        r'([a-zA-Z\s\-]+)\s+(?:preferred|wanted|match)'
    ]
    for pattern in inc_genre_patterns:
        for match in re.finditer(pattern, text_lower):
            words = match.group(1).strip()
            for genre_name, genre_id in GENRE_MAP.items():
                if genre_name in words:
                    if genre_id not in profile["with_genres"] and genre_id not in profile["without_genres"]:
                        profile["with_genres"].append(genre_id)
                        matches_count += 1

    # Simple mention of genre (if not already handled)
    for genre_name, genre_id in GENRE_MAP.items():
        if genre_name in text_lower:
            # Check it's not next to negative indicators
            negatives = ["no ", "without ", "avoid ", "except ", "don't like "]
            has_neg = any(neg + genre_name in text_lower for neg in negatives)
            if not has_neg:
                if genre_id not in profile["with_genres"] and genre_id not in profile["without_genres"]:
                    profile["with_genres"].append(genre_id)
                    matches_count += 0.5

    # 3. Runtimes
    # e.g., "under 90 mins", "less than 2 hours"
    under_match = re.search(r'(?:under|less than|max|maximum|below|within)\s+(\d+)\s*(?:min|minute)', text_lower)
    if under_match:
        profile["with_runtime_lte"] = int(under_match.group(1))
        matches_count += 1
    else:
        under_hr_match = re.search(r'(?:under|less than|max|maximum|below|within)\s+(\d+)\s*h', text_lower)
        if under_hr_match:
            profile["with_runtime_lte"] = int(under_hr_match.group(1)) * 60
            matches_count += 1

    over_match = re.search(r'(?:over|more than|longer than|above|at least)\s+(\d+)\s*(?:min|minute)', text_lower)
    if over_match:
        profile["with_runtime_gte"] = int(over_match.group(1))
        matches_count += 1
    else:
        over_hr_match = re.search(r'(?:over|more than|longer than|above|at least)\s+(\d+)\s*h', text_lower)
        if over_hr_match:
            profile["with_runtime_gte"] = int(over_hr_match.group(1)) * 60
            matches_count += 1

    # 4. Years
    # e.g., "after 2015"
    after_year = re.search(r'(?:after|newer than|post)\s+(\d{4})', text_lower)
    if after_year:
        profile["release_year_gte"] = int(after_year.group(1))
        matches_count += 1
    
    before_year = re.search(r'(?:before|older than|pre)\s+(\d{4})', text_lower)
    if before_year:
        profile["release_year_lte"] = int(before_year.group(1))
        matches_count += 1

    # e.g. "90s"
    decade = re.search(r'(\d{2})0s', text_lower)
    if decade:
        dec = int(decade.group(1))
        year_prefix = 1900 if dec > 30 else 2000
        profile["release_year_gte"] = year_prefix + dec
        profile["release_year_lte"] = year_prefix + dec + 9
        matches_count += 1

    # 5. Languages
    for lang_name, lang_code in LANG_MAP.items():
        if lang_name in text_lower:
            profile["with_original_language"] = lang_code
            matches_count += 1
            break

    # Determine confidence score
    # If we extracted multiple specific details, we are confident.
    profile["confidence"] = min(1.0, matches_count / 3.0)
    return profile

def parse_free_text_llm(text: str) -> Optional[Dict[str, Any]]:
    """Query Groq API to parse text into structured JSON movie preferences."""
    if not GROQ_API_KEY:
        return None

    prompt = f"""You are an expert film recommendation preference parser. Your job is to extract structured movie preferences from a user's free-text request.
Always output a valid JSON object matching this schema:
{{
  "include_adult": boolean or null,
  "with_genres": [integer TMDb genre IDs],
  "without_genres": [integer TMDb genre IDs],
  "with_keywords": [string keywords to search],
  "without_keywords": [string keywords to exclude],
  "with_companies": [string production company names to search],
  "without_companies": [string production company names to exclude],
  "with_runtime_gte": integer or null,
  "with_runtime_lte": integer or null,
  "release_year_gte": integer or null,
  "release_year_lte": integer or null,
  "with_original_language": string language code (e.g. 'en', 'fr', 'ja', 'es') or null
}}

Available Genre IDs (mapping):
Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36, Horror: 27, Music: 10402, Mystery: 96, Romance: 10749, Science Fiction: 878, TV Movie: 10770, Thriller: 53, War: 10752, Western: 37

Only extract parameters if they are explicitly mentioned or strongly implied.
If the text cannot be parsed or lacks preference parameters, output an empty schema (all nulls or empty lists).

User Request: "{text}"
"""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            resp_data = json.loads(res.read().decode("utf-8"))
            content = resp_data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            # Normalize structure
            return {
                "include_adult": parsed.get("include_adult"),
                "with_genres": [int(x) for x in parsed.get("with_genres", []) if str(x).isdigit()],
                "without_genres": [int(x) for x in parsed.get("without_genres", []) if str(x).isdigit()],
                "with_keywords": parsed.get("with_keywords", []),
                "without_keywords": parsed.get("without_keywords", []),
                "with_companies": parsed.get("with_companies", []),
                "without_companies": parsed.get("without_companies", []),
                "with_runtime_gte": parsed.get("with_runtime_gte"),
                "with_runtime_lte": parsed.get("with_runtime_lte"),
                "release_year_gte": parsed.get("release_year_gte"),
                "release_year_lte": parsed.get("release_year_lte"),
                "with_original_language": parsed.get("with_original_language"),
                "confidence": 1.0
            }
    except Exception as e:
        print(f"Groq API call failed: {e}")
        return None

def parse_free_text(text: str) -> Dict[str, Any]:
    """Parse free text, using regex first and falling back to Groq if needed."""
    if not text or not text.strip():
        return {
            "include_adult": None, "with_genres": [], "without_genres": [],
            "with_keywords": [], "without_keywords": [], "with_companies": [], "without_companies": [],
            "with_runtime_gte": None, "with_runtime_lte": None,
            "release_year_gte": None, "release_year_lte": None, "with_original_language": None,
            "confidence": 0.0
        }
        
    regex_profile = parse_free_text_regex(text)
    
    # If regex confidence is high (>= 0.6) or we don't have a Groq key, use regex results
    if regex_profile["confidence"] >= 0.6 or not GROQ_API_KEY:
        return regex_profile
        
    # Attempt LLM parse
    llm_profile = parse_free_text_llm(text)
    if llm_profile:
        return llm_profile
        
    return regex_profile
