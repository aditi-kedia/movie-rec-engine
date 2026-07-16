import os
import re
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, List, Optional
from app.config import settings

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
        "hard_constraints": {
            "without_genres": [],
            "without_keywords": [],
            "without_companies": [],
            "must_genres": [],
            "must_keywords": [],
            "with_runtime_gte": None,
            "with_runtime_lte": None,
            "release_year_gte": None,
            "release_year_lte": None,
            "with_original_language": None
        },
        "soft_preferences": {
            "with_genres": [],
            "with_keywords": [],
            "with_companies": [],
            "prefer_runtime_gte": None,
            "prefer_runtime_lte": None,
            "prefer_year_gte": None,
            "prefer_year_lte": None,
            "prefer_original_language": None
        },
        "confidence": 0.0
    }
    
    matches_count = 0

    # Helper to check if a match is hard context
    def is_hard(start_idx: int) -> bool:
        lookback = text_lower[max(0, start_idx - 15):start_idx]
        return any(word in lookback for word in ["must", "only", "required", "has to", "mandatory"])

    # 1. Exclude genres (e.g., "no horror", "except comedy", "avoid romance")
    exc_genre_patterns = [
        r'(?:no|without|avoid|except|excluding|no more|don\'t want|do not want|exclude)\s+([a-zA-Z\s\-]+)',
        r'([a-zA-Z\s\-]+)\s+(?:is a no|is excluded|should be avoided)'
    ]
    for pattern in exc_genre_patterns:
        for match in re.finditer(pattern, text_lower):
            words = match.group(1).strip()
            for genre_name, genre_id in GENRE_MAP.items():
                if genre_name in words:
                    if genre_id not in profile["hard_constraints"]["without_genres"]:
                        profile["hard_constraints"]["without_genres"].append(genre_id)
                        matches_count += 1

    # 2. Include genres (e.g., "love sci-fi", "prefer comedy", "want drama")
    inc_genre_patterns = [
        r'(?:love|like|prefer|want|include|focus on|must|only|required|has to)\s+([a-zA-Z\s\-]+)',
        r'([a-zA-Z\s\-]+)\s+(?:preferred|wanted|match|is required|is mandatory)'
    ]
    for pattern in inc_genre_patterns:
        for match in re.finditer(pattern, text_lower):
            words = match.group(1).strip()
            for genre_name, genre_id in GENRE_MAP.items():
                if genre_name in words:
                    if is_hard(match.start()):
                        if genre_id not in profile["hard_constraints"]["must_genres"] and genre_id not in profile["hard_constraints"]["without_genres"]:
                            profile["hard_constraints"]["must_genres"].append(genre_id)
                            matches_count += 1
                    else:
                        if genre_id not in profile["soft_preferences"]["with_genres"] and genre_id not in profile["hard_constraints"]["without_genres"]:
                            profile["soft_preferences"]["with_genres"].append(genre_id)
                            matches_count += 1

    # Simple mention of genre (if not already handled)
    for genre_name, genre_id in GENRE_MAP.items():
        if genre_name in text_lower:
            negatives = ["no ", "without ", "avoid ", "except ", "don't like ", "exclude "]
            has_neg = any(neg + genre_name in text_lower for neg in negatives)
            if not has_neg:
                pos = text_lower.find(genre_name)
                is_hard_genre = is_hard(pos)
                
                if is_hard_genre:
                    if genre_id not in profile["hard_constraints"]["must_genres"] and genre_id not in profile["hard_constraints"]["without_genres"]:
                        profile["hard_constraints"]["must_genres"].append(genre_id)
                        matches_count += 0.5
                else:
                    if genre_id not in profile["soft_preferences"]["with_genres"] and genre_id not in profile["hard_constraints"]["without_genres"]:
                        profile["soft_preferences"]["with_genres"].append(genre_id)
                        matches_count += 0.5

    # 3. Runtimes
    under_match = re.search(r'(?:under|less than|max|maximum|below|within)\s+(\d+)\s*(?:min|minute)', text_lower)
    if under_match:
        val = int(under_match.group(1))
        if is_hard(under_match.start()):
            profile["hard_constraints"]["with_runtime_lte"] = val
        else:
            profile["soft_preferences"]["prefer_runtime_lte"] = val
        matches_count += 1
    else:
        under_hr_match = re.search(r'(?:under|less than|max|maximum|below|within)\s+(\d+)\s*h', text_lower)
        if under_hr_match:
            val = int(under_hr_match.group(1)) * 60
            if is_hard(under_hr_match.start()):
                profile["hard_constraints"]["with_runtime_lte"] = val
            else:
                profile["soft_preferences"]["prefer_runtime_lte"] = val
            matches_count += 1

    over_match = re.search(r'(?:over|more than|longer than|above|at least)\s+(\d+)\s*(?:min|minute)', text_lower)
    if over_match:
        val = int(over_match.group(1))
        if is_hard(over_match.start()):
            profile["hard_constraints"]["with_runtime_gte"] = val
        else:
            profile["soft_preferences"]["prefer_runtime_gte"] = val
        matches_count += 1
    else:
        over_hr_match = re.search(r'(?:over|more than|longer than|above|at least)\s+(\d+)\s*h', text_lower)
        if over_hr_match:
            val = int(over_hr_match.group(1)) * 60
            if is_hard(over_hr_match.start()):
                profile["hard_constraints"]["with_runtime_gte"] = val
            else:
                profile["soft_preferences"]["prefer_runtime_gte"] = val
            matches_count += 1

    # 4. Years
    after_year = re.search(r'(?:after|newer than|post)\s+(\d{4})', text_lower)
    if after_year:
        val = int(after_year.group(1))
        if is_hard(after_year.start()):
            profile["hard_constraints"]["release_year_gte"] = val
        else:
            profile["soft_preferences"]["prefer_year_gte"] = val
        matches_count += 1
    
    before_year = re.search(r'(?:before|older than|pre)\s+(\d{4})', text_lower)
    if before_year:
        val = int(before_year.group(1))
        if is_hard(before_year.start()):
            profile["hard_constraints"]["release_year_lte"] = val
        else:
            profile["soft_preferences"]["prefer_year_lte"] = val
        matches_count += 1

    decade = re.search(r'(\d{2})0s', text_lower)
    if decade:
        dec = int(decade.group(1))
        year_prefix = 1900 if dec > 30 else 2000
        val_gte = year_prefix + dec
        val_lte = year_prefix + dec + 9
        if is_hard(decade.start()):
            profile["hard_constraints"]["release_year_gte"] = val_gte
            profile["hard_constraints"]["release_year_lte"] = val_lte
        else:
            profile["soft_preferences"]["prefer_year_gte"] = val_gte
            profile["soft_preferences"]["prefer_year_lte"] = val_lte
        matches_count += 1

    # 5. Languages
    for lang_name, lang_code in LANG_MAP.items():
        if lang_name in text_lower:
            pos = text_lower.find(lang_name)
            if is_hard(pos):
                profile["hard_constraints"]["with_original_language"] = lang_code
            else:
                profile["soft_preferences"]["prefer_original_language"] = lang_code
            matches_count += 1
            break

    profile["confidence"] = min(1.0, matches_count / 3.0)
    return profile

def parse_free_text_llm(text: str) -> Optional[Dict[str, Any]]:
    """Query Groq API to parse text into structured JSON movie preferences."""
    if not settings.GROQ_API_KEY:
        return None

    prompt = f"""You are an expert film recommendation preference parser. Your job is to extract structured movie preferences from a user's free-text request.
You must distinguish between:
1. Hard constraints (rules that MUST be followed, indicated by words like "must", "only", "no", "exclude", "don't want", "avoid", "without", "except").
2. Soft preferences (desires that the user likes/prefers but aren't strict filters, indicated by words like "prefer", "ideally", "would like", "similar to", "love", "like", "want").

Always output a valid JSON object matching this schema:
{{
  "hard_constraints": {{
    "without_genres": [integer TMDb genre IDs of genres to exclude],
    "without_keywords": [string keywords to exclude],
    "without_companies": [string production company names to exclude],
    "must_genres": [integer TMDb genre IDs of genres that MUST be present],
    "must_keywords": [string keywords that MUST be present],
    "with_runtime_gte": integer or null (minimum runtime in minutes),
    "with_runtime_lte": integer or null (maximum runtime in minutes),
    "release_year_gte": integer or null (earliest release year),
    "release_year_lte": integer or null (latest release year),
    "with_original_language": string language code (e.g. 'en', 'fr', 'ja', 'es') or null
  }},
  "soft_preferences": {{
    "with_genres": [integer TMDb genre IDs of preferred genres],
    "with_keywords": [string keywords to search / soft preference keywords],
    "with_companies": [string production company names to search / soft preference companies],
    "prefer_runtime_gte": integer or null,
    "prefer_runtime_lte": integer or null,
    "prefer_year_gte": integer or null,
    "prefer_year_lte": integer or null,
    "prefer_original_language": string language code or null
  }},
  "confidence": number (between 0.0 and 1.0 representing how confident you are in this parsing)
}}

Available Genre IDs (mapping):
Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36, Horror: 27, Music: 10402, Mystery: 96, Romance: 10749, Science Fiction: 878, TV Movie: 10770, Thriller: 53, War: 10752, Western: 37

Only extract parameters if they are explicitly mentioned or strongly implied.
If the text cannot be parsed or lacks preference parameters, output an empty schema (all nulls or empty lists) with confidence 0.0.

User Request: "{text}"
"""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
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
            
            hc = parsed.get("hard_constraints", {})
            sp = parsed.get("soft_preferences", {})
            
            return {
                "hard_constraints": {
                    "without_genres": [int(x) for x in hc.get("without_genres", []) if str(x).isdigit()],
                    "without_keywords": hc.get("without_keywords", []),
                    "without_companies": hc.get("without_companies", []),
                    "must_genres": [int(x) for x in hc.get("must_genres", []) if str(x).isdigit()],
                    "must_keywords": hc.get("must_keywords", []),
                    "with_runtime_gte": hc.get("with_runtime_gte"),
                    "with_runtime_lte": hc.get("with_runtime_lte"),
                    "release_year_gte": hc.get("release_year_gte"),
                    "release_year_lte": hc.get("release_year_lte"),
                    "with_original_language": hc.get("with_original_language")
                },
                "soft_preferences": {
                    "with_genres": [int(x) for x in sp.get("with_genres", []) if str(x).isdigit()],
                    "with_keywords": sp.get("with_keywords", []),
                    "with_companies": sp.get("with_companies", []),
                    "prefer_runtime_gte": sp.get("prefer_runtime_gte"),
                    "prefer_runtime_lte": sp.get("prefer_runtime_lte"),
                    "prefer_year_gte": sp.get("prefer_year_gte"),
                    "prefer_year_lte": sp.get("prefer_year_lte"),
                    "prefer_original_language": sp.get("prefer_original_language")
                },
                "confidence": parsed.get("confidence", 1.0)
            }
    except Exception as e:
        print(f"Groq API call failed: {e}")
        return None

def parse_free_text(text: str) -> Dict[str, Any]:
    """Parse free text, using regex first and falling back to Groq if needed."""
    if not text or not text.strip():
        return {
            "hard_constraints": {
                "without_genres": [], "without_keywords": [], "without_companies": [],
                "must_genres": [], "must_keywords": [],
                "with_runtime_gte": None, "with_runtime_lte": None,
                "release_year_gte": None, "release_year_lte": None,
                "with_original_language": None
            },
            "soft_preferences": {
                "with_genres": [], "with_keywords": [], "with_companies": [],
                "prefer_runtime_gte": None, "prefer_runtime_lte": None,
                "prefer_year_gte": None, "prefer_year_lte": None,
                "prefer_original_language": None
            },
            "confidence": 0.0
        }
        
    regex_profile = parse_free_text_regex(text)
    
    if regex_profile["confidence"] >= 0.6 or not settings.GROQ_API_KEY:
        return regex_profile
        
    llm_profile = parse_free_text_llm(text)
    if llm_profile:
        return llm_profile
        
    return regex_profile
