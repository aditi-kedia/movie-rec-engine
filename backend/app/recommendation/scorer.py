from typing import Dict, Any, List, Tuple

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
    # Depending on TMDb structure keywords could be keywords['keywords'] or keywords['results']
    kw_list = keywords_data.get("keywords", []) if isinstance(keywords_data, dict) else keywords_data
    if not isinstance(kw_list, list):
        kw_list = keywords_data.get("results", []) if isinstance(keywords_data, dict) else []
    movie_keywords = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]

    original_language = movie.get("original_language", "")
    production_companies = [c["id"] for c in movie.get("production_companies", [])]
    production_countries = [c["iso_3166_1"] for c in movie.get("production_countries", [])]
    
    release_date = movie.get("release_date", "")
    release_year = int(release_date.split("-")[0]) if release_date and len(release_date) >= 4 and release_date.split("-")[0].isdigit() else None

    # Exclusions (Strict penalties or immediate 0 score)
    # Check if this movie is adult but user didn't ask for it
    extracted = profile.get("extracted_free_text", {})
    
    # Strict exclusion check (returns 0 if matched)
    excluded_genres = profile.get("excluded_genres", []) + extracted.get("without_genres", [])
    for eg in excluded_genres:
        if eg in genre_ids:
            return 0.0, []  # Violated genre exclusion
            
    excluded_keywords = extracted.get("without_keywords", [])
    for ek in excluded_keywords:
        ek_lower = ek.lower()
        if any(ek_lower in kw for kw in movie_keywords):
            return 0.0, []  # Violated keyword exclusion

    # 1. Runtime Match (10 points)
    rt_min = profile.get("runtime_min") or extracted.get("with_runtime_gte")
    rt_max = profile.get("runtime_max") or extracted.get("with_runtime_lte")
    
    if runtime:
        if rt_min and rt_max:
            if rt_min <= runtime <= rt_max:
                score += 10.0
            else:
                # Penalty based on deviation
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
            # Neutral case
            score += 10.0
            
        if runtime < 120:
            reasons.append("Under 2 hours")
        elif runtime >= 150:
            reasons.append("Epic runtime")
    else:
        # Default neutral score
        score += 10.0

    # 2. Genre Match (25 points)
    preferred_genre_ids = profile.get("preferred_genres", []) + extracted.get("with_genres", [])
    if preferred_genre_ids:
        # Count matches
        matches = sum(1 for g in genre_ids if g in preferred_genre_ids)
        if matches > 0:
            match_ratio = matches / len(preferred_genre_ids)
            score += min(25.0, match_ratio * 25.0)
            reasons.append("Genre Match")
            
            # Add free-text genre bonus
            extracted_genres = extracted.get("with_genres", [])
            free_text_genre_match = any(g in genre_ids for g in extracted_genres)
            if free_text_genre_match:
                score += 3.0  # Free-text match bonus
        else:
            # No matching genres
            pass
    else:
        # Neutral case
        score += 25.0

    # 3. Cast & Crew Match (20 points: 10 cast, 10 crew)
    preferred_cast_ids = profile.get("preferred_cast", [])
    if preferred_cast_ids:
        # Check if cast matches
        cast_match = False
        for c_id in preferred_cast_ids:
            if c_id in cast_ids:
                score += 10.0
                cast_match = True
                # Find the actor's name
                for actor in credits.get("cast", []):
                    if actor["id"] == c_id:
                        reasons.append(actor["name"])
                        break
                break
        if not cast_match:
            pass
    else:
        score += 10.0

    preferred_crew_ids = profile.get("preferred_crew", [])
    if preferred_crew_ids:
        # Check if crew matches
        crew_match = False
        for c_id in preferred_crew_ids:
            if c_id in crew_ids:
                score += 10.0
                crew_match = True
                # Find the director/crew name
                for member in credits.get("crew", []):
                    if member["id"] == c_id:
                        reasons.append(member["name"])
                        break
                break
        if not crew_match:
            pass
    else:
        score += 10.0

    # 4. Keyword Match (25 points)
    preferred_keywords = profile.get("similar_movies_keywords", []) + [kw.lower() for kw in extracted.get("with_keywords", [])]
    if preferred_keywords:
        matching_kws = [kw for kw in movie_keywords if kw in preferred_keywords]
        if matching_kws:
            # Give 6 points per matching keyword, up to 25
            score += min(25.0, len(matching_kws) * 6.0)
            reasons.append("Keyword Match")
            
            # Add free text keyword bonus
            free_text_kw_match = any(kw in movie_keywords for kw in [k.lower() for k in extracted.get("with_keywords", [])])
            if free_text_kw_match:
                score += 3.0  # Free-text match bonus
    else:
        score += 25.0

    # 5. Language/Country/Release Date/Company Match (20 points, 5 each)
    # Language Match (5 points)
    pref_lang = extracted.get("with_original_language") or profile.get("preferred_language")
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
    pref_year_gte = extracted.get("release_year_gte")
    pref_year_lte = extracted.get("release_year_lte")
    
    if release_year:
        if pref_year_gte and pref_year_lte:
            if pref_year_gte <= release_year <= pref_year_lte:
                score += 5.0
                reasons.append(f"Released in {release_year}")
            else:
                diff = min(abs(release_year - pref_year_gte), abs(release_year - pref_year_lte))
                score += max(0.0, 5.0 - (diff * 0.5))
        elif pref_year_gte:
            if release_year >= pref_year_gte:
                score += 5.0
            else:
                score += max(0.0, 5.0 - ((pref_year_gte - release_year) * 0.5))
        elif pref_year_lte:
            if release_year <= pref_year_lte:
                score += 5.0
            else:
                score += max(0.0, 5.0 - ((release_year - pref_year_lte) * 0.5))
        else:
            score += 5.0
    else:
        score += 5.0

    # Production Company (5 points)
    pref_companies = profile.get("similar_movies_companies", []) + extracted.get("with_companies", [])
    if pref_companies:
        # Check if movie shares production companies (either by ID or name)
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

        # Exclusions for companies
        excluded_companies = extracted.get("without_companies", [])
        for ec in excluded_companies:
            if ec.lower() in movie_company_names:
                return 0.0, []  # Violated company exclusion
    else:
        score += 5.0

    # Similar Movie Match reasons
    similar_movies_list = profile.get("similar_movies_titles", [])
    for title in similar_movies_list:
        # E.g. if the keywords overlap significantly with this movie
        if "similar_movies_keywords_by_movie" in profile:
            movie_keywords_ref = profile["similar_movies_keywords_by_movie"].get(title, [])
            overlap = sum(1 for kw in movie_keywords if kw in movie_keywords_ref)
            if overlap >= 3:
                reasons.append(f"Similar to {title}")
                break

    # Cap score at 100
    final_score = min(100.0, score)
    
    # Filter duplicate match reasons (e.g. if multiple actors match we can show them, but keep reasons unique)
    unique_reasons = []
    for r in reasons:
        if r not in unique_reasons:
            unique_reasons.append(r)

    return final_score, unique_reasons
