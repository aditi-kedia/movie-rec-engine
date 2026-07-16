import re
from typing import Dict, Any, List, Tuple
from app.config import settings

REVERSE_GENRE_MAP = {
    28: "action", 12: "adventure", 16: "animation", 35: "comedy",
    80: "crime", 99: "documentary", 18: "drama", 10751: "family",
    14: "fantasy", 36: "history", 27: "horror", 10402: "music",
    96: "mystery", 10749: "romance", 878: "science fiction",
    10770: "tv movie", 53: "thriller", 10752: "war", 37: "western"
}

STOPWORDS = {
    "i", "want", "to", "watch", "a", "an", "the", "movie", "movies", "film", "films",
    "show", "shows", "about", "with", "in", "set", "on", "of", "and", "or", "but",
    "like", "love", "prefer", "please", "recommend", "something", "that", "is", "are",
    "was", "were", "for", "from", "by", "some", "any", "no", "not", "only", "very", "really",
    "must", "required", "mandatory", "exclude", "avoid", "without", "should", "would",
    "could", "have", "has", "had", "do", "does", "did"
}

def format_matched_attributes(attrs: List[str]) -> str:
    """Format matching attributes naturally into a list."""
    if not attrs:
        return ""
    # Deduplicate while preserving order
    unique_attrs = []
    for a in attrs:
        a_clean = a.strip().lower()
        if a_clean not in unique_attrs:
            unique_attrs.append(a_clean)
            
    if len(unique_attrs) == 1:
        return unique_attrs[0]
    elif len(unique_attrs) == 2:
        return f"{unique_attrs[0]} and {unique_attrs[1]}"
    else:
        return f"{', '.join(unique_attrs[:-1])}, and {unique_attrs[-1]}"

def satisfies_hard_constraints(movie: Dict[str, Any], profile: Dict[str, Any], is_enriched: bool) -> bool:
    """Evaluate whether candidate movie satisfies all mandatory hard constraints."""
    extracted = profile.get("extracted_free_text", {})
    if not extracted:
        return True
        
    hc = extracted.get("hard_constraints", {})
    if not hc:
        return True

    # 1. Excluded Genres (without_genres)
    excluded_genres = profile.get("excluded_genres", []) or []
    if "without_genres" in hc:
        excluded_genres = excluded_genres + (hc.get("without_genres") or [])
        
    genres_list = movie.get("genres", [])
    genre_ids = [g["id"] for g in genres_list] if isinstance(genres_list, list) and len(genres_list) > 0 and "id" in genres_list[0] else [g for g in genres_list if isinstance(g, int)]
    if not genre_ids and "genre_ids" in movie:
        genre_ids = movie["genre_ids"]
        
    for eg in excluded_genres:
        if eg in genre_ids:
            return False

    # 2. Excluded Keywords (without_keywords)
    excluded_keywords = hc.get("without_keywords", [])
    if excluded_keywords:
        keywords_data = movie.get("keywords", {})
        kw_list = keywords_data.get("keywords", []) if isinstance(keywords_data, dict) else keywords_data
        if not isinstance(kw_list, list):
            kw_list = keywords_data.get("results", []) if isinstance(keywords_data, dict) else []
        movie_keywords = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]
        
        if is_enriched:
            for ek in excluded_keywords:
                ek_lower = ek.lower()
                if any(ek_lower in kw for kw in movie_keywords):
                    return False
        else:
            title_lower = (movie.get("title") or movie.get("name") or "").lower()
            overview_lower = movie.get("overview", "").lower()
            for ek in excluded_keywords:
                ek_lower = ek.lower()
                if ek_lower in title_lower or ek_lower in overview_lower:
                    return False

    # 3. Excluded Companies (without_companies)
    excluded_companies = hc.get("without_companies", [])
    if excluded_companies and is_enriched:
        movie_company_names = [c["name"].lower() for c in movie.get("production_companies", [])]
        for ec in excluded_companies:
            if ec.lower() in movie_company_names:
                return False

    # 4. Must Genres (must_genres)
    must_genres = hc.get("must_genres", [])
    if must_genres:
        for mg in must_genres:
            if mg not in genre_ids:
                return False

    # 5. Must Keywords (must_keywords)
    must_keywords = hc.get("must_keywords", [])
    if must_keywords:
        keywords_data = movie.get("keywords", {})
        kw_list = keywords_data.get("keywords", []) if isinstance(keywords_data, dict) else keywords_data
        if not isinstance(kw_list, list):
            kw_list = keywords_data.get("results", []) if isinstance(keywords_data, dict) else []
        movie_keywords = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]
        
        title_lower = (movie.get("title") or movie.get("name") or "").lower()
        overview_lower = movie.get("overview", "").lower()
        
        for mk in must_keywords:
            mk_lower = mk.lower()
            if is_enriched:
                if not (any(mk_lower in kw for kw in movie_keywords) or mk_lower in title_lower or mk_lower in overview_lower):
                    return False
            else:
                if not (mk_lower in title_lower or mk_lower in overview_lower):
                    return False

    # 6. Required Language (with_original_language)
    pref_lang = hc.get("with_original_language")
    if pref_lang:
        movie_lang = movie.get("original_language")
        if movie_lang and movie_lang != pref_lang:
            return False

    # 7. Runtime (with_runtime_gte, with_runtime_lte)
    rt_min = profile.get("runtime_min") or hc.get("with_runtime_gte")
    rt_max = profile.get("runtime_max") or hc.get("with_runtime_lte")
    if is_enriched and "runtime" in movie and movie.get("runtime"):
        runtime = movie["runtime"]
        if rt_min and runtime < rt_min:
            return False
        if rt_max and runtime > rt_max:
            return False

    # 8. Release Year (release_year_gte, release_year_lte)
    pref_year_gte = hc.get("release_year_gte")
    pref_year_lte = hc.get("release_year_lte")
    
    release_date = movie.get("release_date", "")
    release_year = int(release_date.split("-")[0]) if release_date and len(release_date) >= 4 and release_date.split("-")[0].isdigit() else None
    
    if release_year:
        if pref_year_gte and release_year < pref_year_gte:
            return False
        if pref_year_lte and release_year > pref_year_lte:
            return False

    # 9. Country (similar_movies_countries, if specified and enriched)
    pref_countries = profile.get("similar_movies_countries", [])
    if pref_countries and is_enriched:
        production_countries = [c["iso_3166_1"] for c in movie.get("production_countries", [])]
        if production_countries:
            if not any(c in pref_countries for c in production_countries):
                return False

    return True

def check_soft_match(movie: Dict[str, Any], profile: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Determine whether the movie matches soft preferences and list the matched attributes."""
    extracted = profile.get("extracted_free_text", {})
    if not extracted:
        return False, []
        
    sp = extracted.get("soft_preferences", {})
    if not sp:
        return False, []
        
    matched_attributes = []
    
    # 1. Genres (with_genres)
    genres_list = movie.get("genres", [])
    genre_ids = [g["id"] for g in genres_list] if isinstance(genres_list, list) and len(genres_list) > 0 and "id" in genres_list[0] else [g for g in genres_list if isinstance(g, int)]
    if not genre_ids and "genre_ids" in movie:
        genre_ids = movie["genre_ids"]
        
    soft_genres = sp.get("with_genres", [])
    for sg in soft_genres:
        if sg in genre_ids:
            genre_name = REVERSE_GENRE_MAP.get(sg)
            if genre_name:
                matched_attributes.append(genre_name)

    # Keywords for lookup
    keywords_data = movie.get("keywords", {})
    kw_list = keywords_data.get("keywords", []) if isinstance(keywords_data, dict) else keywords_data
    if not isinstance(kw_list, list):
        kw_list = keywords_data.get("results", []) if isinstance(keywords_data, dict) else []
    movie_keywords = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]
    
    # 2. Keywords (with_keywords)
    soft_keywords = sp.get("with_keywords", [])
    title_lower = (movie.get("title") or movie.get("name") or "").lower()
    overview_lower = movie.get("overview", "").lower()
    
    for sk in soft_keywords:
        sk_lower = sk.lower()
        if any(sk_lower in kw for kw in movie_keywords) or sk_lower in title_lower or sk_lower in overview_lower:
            matched_attributes.append(sk)

    # 3. Companies (with_companies)
    soft_companies = sp.get("with_companies", [])
    movie_company_names = [c["name"].lower() for c in movie.get("production_companies", [])]
    production_companies = [c["id"] for c in movie.get("production_companies", [])]
    for sc in soft_companies:
        if isinstance(sc, int) and sc in production_companies:
            matched_attributes.append(str(sc))
        elif isinstance(sc, str) and sc.lower() in movie_company_names:
            matched_attributes.append(sc)

    # 4. Token overlap with raw free_text (ignoring stop words)
    free_text = profile.get("free_text", "").strip()
    if free_text:
        words = re.findall(r'[a-zA-Z0-9\-]+', free_text.lower())
        content_words = [w for w in words if w not in STOPWORDS and len(w) > 2]
        
        for w in content_words:
            if any(w in attr.lower() for attr in matched_attributes):
                continue
                
            if w in title_lower or w in overview_lower or any(w in kw for kw in movie_keywords):
                matched_attributes.append(w)

    return len(matched_attributes) > 0, matched_attributes

def score_movie(movie: Dict[str, Any], profile: Dict[str, Any]) -> Tuple[float, List[str]]:
    """
    Calculate the compatibility score (0-100) of a candidate movie against a preference profile.
    Returns: (score, reasons)
    
    Weights:
    - Runtime: 10%
    - Genre Match: 25%
    - Cast/Crew Match: 20% (10% cast, 10% crew)
    - Keyword Match: 25%
    - Language/Country/Release Date/Company: 20% (5% each)
    """
    # 1. Enforce strict hard constraints
    if not satisfies_hard_constraints(movie, profile, is_enriched=True):
        return 0.0, []

    score = 0.0
    reasons = []

    # Get movie details from candidate object
    genres_list = movie.get("genres", [])
    genre_ids = [g["id"] for g in genres_list] if isinstance(genres_list, list) and len(genres_list) > 0 and "id" in genres_list[0] else [g for g in genres_list if isinstance(g, int)]
    if not genre_ids and "genre_ids" in movie:
        genre_ids = movie["genre_ids"]
        
    runtime = movie.get("runtime")
    
    # Credits (cast/crew)
    credits = movie.get("credits", {})
    cast_ids = [c["id"] for c in credits.get("cast", [])]
    crew_ids = [c["id"] for c in credits.get("crew", [])]
    
    # Keywords
    keywords_data = movie.get("keywords", {})
    kw_list = keywords_data.get("keywords", []) if isinstance(keywords_data, dict) else keywords_data
    if not isinstance(kw_list, list):
        kw_list = keywords_data.get("results", []) if isinstance(keywords_data, dict) else []
    movie_keywords = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]

    original_language = movie.get("original_language", "")
    production_companies = [c["id"] for c in movie.get("production_companies", [])]
    production_countries = [c["iso_3166_1"] for c in movie.get("production_countries", [])]
    
    release_date = movie.get("release_date", "")
    release_year = int(release_date.split("-")[0]) if release_date and len(release_date) >= 4 and release_date.split("-")[0].isdigit() else None

    extracted = profile.get("extracted_free_text", {})

    # 1. Runtime Match (10 points)
    rt_min = profile.get("runtime_min")
    rt_max = profile.get("runtime_max")
    
    if runtime:
        if rt_min and rt_max:
            if rt_min <= runtime <= rt_max:
                score += 10.0
            else:
                diff = min(abs(runtime - rt_min), abs(runtime - rt_max))
                score += max(0.0, 10.0 - (diff / 10.0))
        elif rt_min:
            if runtime >= rt_min:
                score += 10.0
            else:
                score += max(0.0, 10.0 - ((rt_min - runtime) / 10.0))
        elif rt_max:
            if runtime <= rt_max:
                score += 10.0
            else:
                score += max(0.0, 10.0 - ((runtime - rt_max) / 10.0))
        else:
            score += 10.0
            
        if runtime < 120:
            reasons.append("Under 2 hours")
        elif runtime >= 150:
            reasons.append("Epic runtime")
    else:
        score += 10.0

    # 2. Genre Match (25 points)
    preferred_genre_ids = profile.get("preferred_genres", [])
    if preferred_genre_ids:
        matches = sum(1 for g in genre_ids if g in preferred_genre_ids)
        if matches > 0:
            match_ratio = matches / len(preferred_genre_ids)
            score += min(25.0, match_ratio * 25.0)
            reasons.append("Genre Match")
    else:
        score += 25.0

    # 3. Cast & Crew Match (20 points: 10 cast, 10 crew)
    preferred_cast_ids = profile.get("preferred_cast", [])
    if preferred_cast_ids:
        cast_match = False
        for c_id in preferred_cast_ids:
            if c_id in cast_ids:
                score += 10.0
                cast_match = True
                for actor in credits.get("cast", []):
                    if actor["id"] == c_id:
                        reasons.append(actor["name"])
                        break
                break
    else:
        score += 10.0

    preferred_crew_ids = profile.get("preferred_crew", [])
    if preferred_crew_ids:
        crew_match = False
        for c_id in preferred_crew_ids:
            if c_id in crew_ids:
                score += 10.0
                crew_match = True
                for member in credits.get("crew", []):
                    if member["id"] == c_id:
                        reasons.append(member["name"])
                        break
                break
    else:
        score += 10.0

    # 4. Keyword Match (25 points)
    preferred_keywords = profile.get("similar_movies_keywords", [])
    if preferred_keywords:
        matching_kws = [kw for kw in movie_keywords if kw in preferred_keywords]
        if matching_kws:
            score += min(25.0, len(matching_kws) * 6.0)
            reasons.append("Keyword Match")
    else:
        score += 25.0

    # 5. Language/Country/Release Date/Company Match (20 points, 5 each)
    # Language Match (5 points)
    pref_lang = profile.get("preferred_language")
    if pref_lang:
        if original_language == pref_lang:
            score += 5.0
            reasons.append("Language Match")
    else:
        score += 5.0

    # Country Match (5 points)
    pref_countries = profile.get("similar_movies_countries", [])
    if pref_countries:
        if any(c in pref_countries for c in production_countries):
            score += 5.0
    else:
        score += 5.0

    # Release Date / Year (5 points)
    # Note: release date match in basic profile
    score += 5.0

    # Production Company (5 points)
    pref_companies = profile.get("similar_movies_companies", [])
    if pref_companies:
        company_match = False
        movie_company_names = [c["name"].lower() for c in movie.get("production_companies", [])]
        for pc in pref_companies:
            if isinstance(pc, int) and pc in production_companies:
                company_match = True
                break
            elif isinstance(pc, str) and pc.lower() in movie_company_names:
                company_match = True
                break
        if company_match:
            score += 5.0
    else:
        score += 5.0

    # Similar Movie Match reasons
    similar_movies_list = profile.get("similar_movies_titles", [])
    for title in similar_movies_list:
        if "similar_movies_keywords_by_movie" in profile:
            movie_keywords_ref = profile["similar_movies_keywords_by_movie"].get(title, [])
            overlap = sum(1 for kw in movie_keywords if kw in movie_keywords_ref)
            if overlap >= 3:
                reasons.append(f"Similar to {title}")
                break

    # 6. Free-text soft preferences bonus
    free_text = profile.get("free_text", "").strip()
    if free_text:
        is_soft_matched, matched_attrs = check_soft_match(movie, profile)
        if is_soft_matched:
            # Scale the bonus proportionally based on how many soft preferences are matched:
            # 1 matched -> ~1/3, 2 matched -> ~2/3, 3 or more matched -> full weight
            num_matched = len(matched_attrs)
            scale = min(1.0, num_matched / 3.0)
            bonus = settings.FREE_TEXT_WEIGHT * scale
            score += bonus
            
            # Format matched attributes and append natural explanation
            formatted_attrs = format_matched_attributes(matched_attrs)
            if formatted_attrs:
                reasons.append(f"Matches your request for {formatted_attrs}")

        # Add free-text genre specific bonus
        sp = extracted.get("soft_preferences", {})
        extracted_genres = sp.get("with_genres", [])
        free_text_genre_match = any(g in genre_ids for g in extracted_genres)
        if free_text_genre_match:
            score += 10.0

        # Add free text keyword specific bonus
        extracted_kws = sp.get("with_keywords", [])
        free_text_kw_match = any(kw in movie_keywords for kw in [k.lower() for k in extracted_kws])
        if free_text_kw_match:
            score += 10.0

    # Cap score at 100
    final_score = min(100.0, score)
    
    unique_reasons = []
    for r in reasons:
        if r not in unique_reasons:
            unique_reasons.append(r)

    return final_score, unique_reasons
