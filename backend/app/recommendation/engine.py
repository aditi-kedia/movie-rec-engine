import concurrent.futures
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional

from app.models.preference import Preference
from app.models.room import GroupRoom, GroupMember
from app.models.user import User
from app.services import tmdb_service
from app.recommendation.parser import parse_free_text
from app.recommendation.scorer import score_movie

def get_ids(items) -> List[int]:
    if not items:
        return []
    ids = []
    for item in items:
        if isinstance(item, dict):
            # Check TMDbSelection schema key 'id'
            val = item.get("id")
            if val is not None:
                ids.append(int(val))
        elif isinstance(item, (int, str)):
            if str(item).isdigit():
                ids.append(int(item))
    return [i for i in ids if i is not None]

def get_titles(items) -> List[str]:
    if not items:
        return []
    titles = []
    for item in items:
        if isinstance(item, dict):
            val = item.get("name") or item.get("title")
            if val:
                titles.append(str(val))
        elif isinstance(item, str):
            titles.append(item)
    return [t for t in titles if t is not None]

def build_preference_profile(preference: Preference) -> Dict[str, Any]:
    """Extract and enrich preference fields into a structured match profile."""
    if not preference:
        return {}

    similar_movies_ids = get_ids(preference.similar_movies)
    similar_movies_titles = get_titles(preference.similar_movies)
    preferred_genres = get_ids(preference.preferred_genres)
    preferred_cast = get_ids(preference.preferred_cast)
    preferred_crew = get_ids(preference.preferred_crew)
    
    # Fetch details and keywords for similar movies in parallel
    similar_movies_keywords = []
    similar_movies_companies = []
    similar_movies_countries = []
    similar_movies_languages = []
    similar_movies_keywords_by_movie = {}

    if similar_movies_ids:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(similar_movies_ids))) as executor:
            future_to_id = {
                executor.submit(tmdb_service.get_enriched_movie_details, m_id): m_id 
                for m_id in similar_movies_ids
            }
            for future in concurrent.futures.as_completed(future_to_id):
                m_id = future_to_id[future]
                try:
                    movie_details = future.result()
                    title = movie_details.get("title") or movie_details.get("name")
                    
                    # Keywords extraction
                    kw_data = movie_details.get("keywords", {})
                    kw_list = kw_data.get("keywords", []) if isinstance(kw_data, dict) else kw_data
                    if not isinstance(kw_list, list):
                        kw_list = kw_data.get("results", []) if isinstance(kw_data, dict) else []
                    
                    kws = [k["name"].lower() for k in kw_list if isinstance(k, dict) and "name" in k]
                    similar_movies_keywords.extend(kws)
                    if title:
                        similar_movies_keywords_by_movie[title] = kws
                        
                    # Companies
                    companies = [c["id"] for c in movie_details.get("production_companies", [])]
                    similar_movies_companies.extend(companies)
                    
                    # Countries
                    countries = [c["iso_3166_1"] for c in movie_details.get("production_countries", [])]
                    similar_movies_countries.extend(countries)
                    
                    # Language
                    lang = movie_details.get("original_language")
                    if lang:
                        similar_movies_languages.append(lang)
                except Exception as e:
                    print(f"Error enriching similar movie {m_id}: {e}")

    similar_movies_keywords = list(set(similar_movies_keywords))
    similar_movies_companies = list(set(similar_movies_companies))
    similar_movies_countries = list(set(similar_movies_countries))
    similar_movies_languages = list(set(similar_movies_languages))

    free_text = preference.free_text or ""
    extracted = parse_free_text(free_text)

    # Use first language of similar movies as fallback preferred language
    preferred_language = similar_movies_languages[0] if similar_movies_languages else "en"

    return {
        "similar_movies_ids": similar_movies_ids,
        "similar_movies_titles": similar_movies_titles,
        "similar_movies_keywords": similar_movies_keywords,
        "similar_movies_companies": similar_movies_companies,
        "similar_movies_countries": similar_movies_countries,
        "similar_movies_languages": similar_movies_languages,
        "similar_movies_keywords_by_movie": similar_movies_keywords_by_movie,
        "preferred_genres": preferred_genres,
        "preferred_cast": preferred_cast,
        "preferred_crew": preferred_crew,
        "runtime_min": preference.runtime_min,
        "runtime_max": preference.runtime_max,
        "preferred_language": preferred_language,
        "free_text": free_text,
        "extracted_free_text": extracted,
        "excluded_genres": []
    }

def gather_candidates(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetch movie candidates from discover queries and similar movie recommendations."""
    candidates = {}
    similar_movies_ids = profile.get("similar_movies_ids", [])
    
    # 1. Gather similar movies recommendations
    if similar_movies_ids:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(similar_movies_ids))) as executor:
            future_to_id = {
                executor.submit(tmdb_service.get_movie_recommendations, m_id): m_id
                for m_id in similar_movies_ids
            }
            for future in concurrent.futures.as_completed(future_to_id):
                m_id = future_to_id[future]
                try:
                    recs = future.result()
                    for rec in recs:
                        c_id = rec["id"]
                        if c_id not in similar_movies_ids:
                            candidates[c_id] = rec
                except Exception as e:
                    print(f"Error fetching recommendations for movie {m_id}: {e}")

    # 2. Gather from TMDb Discover using preference filters
    discover_params_list = []
    
    base_filter = {
        "include_adult": False,
        "language": "en-US",
        "sort_by": "popularity.desc"
    }
    
    extracted = profile.get("extracted_free_text", {})
    genres = profile.get("preferred_genres", []) + extracted.get("with_genres", [])
    cast = profile.get("preferred_cast", [])
    crew = profile.get("preferred_crew", [])
    
    rt_min = profile.get("runtime_min") or extracted.get("with_runtime_gte")
    rt_max = profile.get("runtime_max") or extracted.get("with_runtime_lte")
    
    if rt_min:
        base_filter["with_runtime.gte"] = rt_min
    if rt_max:
        base_filter["with_runtime.lte"] = rt_max
        
    lang = extracted.get("with_original_language")
    if lang:
        base_filter["with_original_language"] = lang
        
    year_gte = extracted.get("release_year_gte")
    year_lte = extracted.get("release_year_lte")
    if year_gte:
        base_filter["primary_release_date.gte"] = f"{year_gte}-01-01"
    if year_lte:
        base_filter["primary_release_date.lte"] = f"{year_lte}-12-31"

    without_genres = extracted.get("without_genres", [])
    if without_genres:
        base_filter["without_genres"] = ",".join(str(g) for g in without_genres)

    # Genre combinations discover
    if genres:
        f = base_filter.copy()
        f["with_genres"] = "|".join(str(g) for g in genres)
        discover_params_list.append(f)
        
    # Cast combinations discover
    if cast:
        f = base_filter.copy()
        f["with_cast"] = "|".join(str(c) for c in cast)
        discover_params_list.append(f)
        
    # Crew combinations discover
    if crew:
        f = base_filter.copy()
        f["with_crew"] = "|".join(str(c) for c in crew)
        discover_params_list.append(f)
        
    if not genres and not cast and not crew:
        discover_params_list.append(base_filter.copy())
    else:
        # Combined backup discover
        f = base_filter.copy()
        if genres:
            f["with_genres"] = "|".join(str(g) for g in genres)
        discover_params_list.append(f)

    # Fetch multiple pages in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(discover_params_list) * 2)) as executor:
        futures = []
        for params in discover_params_list:
            for page in [1, 2]:
                p = params.copy()
                p["page"] = page
                futures.append(executor.submit(tmdb_service.discover_movies, p))
                
        for future in concurrent.futures.as_completed(futures):
            try:
                res = future.result()
                results = res.get("results", [])
                for movie in results:
                    c_id = movie["id"]
                    if c_id not in similar_movies_ids:
                        candidates[c_id] = movie
            except Exception as e:
                print(f"Error fetching discover candidates: {e}")

    return list(candidates.values())

def pre_score_candidate(movie: Dict[str, Any], profile: Dict[str, Any]) -> float:
    """Quickly score candidates using only search result fields to filter the top candidates."""
    score = 0.0
    
    # 1. Genre Match (up to 25 points)
    genres = profile.get("preferred_genres", []) + profile.get("extracted_free_text", {}).get("with_genres", [])
    movie_genres = movie.get("genre_ids", [])
    if genres and movie_genres:
        matches = sum(1 for g in movie_genres if g in genres)
        score += (matches / len(genres)) * 25.0
    else:
        score += 25.0
        
    # 2. Language Match (up to 5 points)
    pref_lang = profile.get("extracted_free_text", {}).get("with_original_language") or profile.get("preferred_language")
    if pref_lang and movie.get("original_language") == pref_lang:
        score += 5.0
        
    # 3. Year Match (up to 5 points)
    release_date = movie.get("release_date", "")
    release_year = int(release_date.split("-")[0]) if release_date and len(release_date) >= 4 and release_date.split("-")[0].isdigit() else None
    pref_year_gte = profile.get("extracted_free_text", {}).get("release_year_gte")
    pref_year_lte = profile.get("extracted_free_text", {}).get("release_year_lte")
    
    if release_year:
        if pref_year_gte and pref_year_lte:
            if pref_year_gte <= release_year <= pref_year_lte:
                score += 5.0
        elif pref_year_gte:
            if release_year >= pref_year_gte:
                score += 5.0
        elif pref_year_lte:
            if release_year <= pref_year_lte:
                score += 5.0
        else:
            score += 5.0
    else:
        score += 5.0
        
    # 4. Popularity bonus (up to 5 points)
    popularity = movie.get("popularity", 0.0)
    score += min(5.0, popularity / 40.0)
    
    return score

def enrich_and_score_candidates(candidates_list: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Filter to top 30 candidates using pre-scoring, enrich them in parallel, and run full scoring."""
    # Pre-score and keep the top 30 candidates to speed up details fetch
    sorted_candidates = sorted(
        candidates_list, 
        key=lambda m: pre_score_candidate(m, profile), 
        reverse=True
    )[:30]
    
    enriched_movies = []
    # Fetch details in parallel (max workers 20)
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(20, len(sorted_candidates))) as executor:
        future_to_c = {
            executor.submit(tmdb_service.get_enriched_movie_details, c["id"]): c
            for c in sorted_candidates
        }
        for future in concurrent.futures.as_completed(future_to_c):
            c = future_to_c[future]
            try:
                enriched = future.result()
                if enriched:
                    if not enriched.get("poster_path") and c.get("poster_path"):
                        enriched["poster_path"] = c["poster_path"]
                    if not enriched.get("overview") and c.get("overview"):
                        enriched["overview"] = c["overview"]
                    enriched_movies.append(enriched)
            except Exception as e:
                print(f"Failed to fetch details for movie {c.get('id')}: {e}")

    recommendations = []
    for movie in enriched_movies:
        score, reasons = score_movie(movie, profile)
        if score > 0.0:
            recommendations.append({
                "id": movie["id"],
                "title": movie.get("title") or movie.get("name"),
                "overview": movie.get("overview", ""),
                "poster_path": movie.get("poster_path", ""),
                "release_date": movie.get("release_date", ""),
                "score": round(score, 1),
                "reasons": reasons
            })
            
    # Sort by score descending
    recommendations.sort(key=lambda r: r["score"], reverse=True)
    return recommendations[:10]

def recommend_movies_solo(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Generate top 10 recommendations for a single user."""
    # Fetch latest preference preset
    preference = db.query(Preference).filter(Preference.user_id == user_id).order_by(Preference.created_at.desc()).first()
    if not preference:
        return []
        
    profile = build_preference_profile(preference)
    candidates = gather_candidates(profile)
    return enrich_and_score_candidates(candidates, profile)

def recommend_movies_group(db: Session, room_id: int) -> List[Dict[str, Any]]:
    """Generate joint top 10 recommendations for a group room."""
    # 1. Fetch room members
    members = db.query(GroupMember).filter(GroupMember.room_id == room_id).all()
    if not members:
        return []
        
    # 2. Build preferences profiles for all members
    member_profiles = []
    combined_candidates = {}
    
    for member in members:
        user = db.query(User).filter(User.user_id == member.user_id).first()
        if not user:
            continue
            
        preference = None
        if member.pref_id:
            preference = db.query(Preference).filter(Preference.pref_id == member.pref_id).first()
        else:
            preference = db.query(Preference).filter(Preference.user_id == user.user_id).order_by(Preference.created_at.desc()).first()
            
        if not preference:
            continue
            
        profile = build_preference_profile(preference)
        member_profiles.append({
            "username": user.username,
            "profile": profile
        })
        
        user_candidates = gather_candidates(profile)
        for c in user_candidates:
            combined_candidates[c["id"]] = c

    if not member_profiles:
        return []

    # Filter combined candidates to top 30 using average pre-scores across all members
    candidates_list = list(combined_candidates.values())
    
    def group_pre_score(movie: Dict[str, Any]) -> float:
        return sum(pre_score_candidate(movie, mp["profile"]) for mp in member_profiles) / len(member_profiles)
        
    sorted_candidates = sorted(candidates_list, key=group_pre_score, reverse=True)[:30]

    # Enrich candidates details in parallel
    enriched_movies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(20, len(sorted_candidates))) as executor:
        future_to_c = {
            executor.submit(tmdb_service.get_enriched_movie_details, c["id"]): c
            for c in sorted_candidates
        }
        for future in concurrent.futures.as_completed(future_to_c):
            c = future_to_c[future]
            try:
                enriched = future.result()
                if enriched:
                    if not enriched.get("poster_path") and c.get("poster_path"):
                        enriched["poster_path"] = c["poster_path"]
                    if not enriched.get("overview") and c.get("overview"):
                        enriched["overview"] = c["overview"]
                    enriched_movies.append(enriched)
            except Exception as e:
                print(f"Failed to fetch details for group candidate movie {c.get('id')}: {e}")

    # Score each movie for all members
    group_recommendations = []
    
    for movie in enriched_movies:
        individual_scores = {}
        all_reasons = []
        is_vetoed = False
        
        for mp in member_profiles:
            uname = mp["username"]
            prof = mp["profile"]
            
            score, reasons = score_movie(movie, prof)
            if score == 0.0:
                is_vetoed = True
            
            individual_scores[uname] = round(score, 1)
            all_reasons.extend(reasons)
            
        avg_score = sum(individual_scores.values()) / len(individual_scores)
        
        if is_vetoed:
            avg_score = max(0.0, avg_score - 50.0)
            
        reason_counts = {}
        for r in all_reasons:
            reason_counts[r] = reason_counts.get(r, 0) + 1
            
        common_reasons = [r for r, count in reason_counts.items() if count > 1]
        if not common_reasons:
            common_reasons = sorted(reason_counts.keys(), key=lambda r: reason_counts[r], reverse=True)[:3]
            
        if avg_score > 0.0:
            group_recommendations.append({
                "id": movie["id"],
                "title": movie.get("title") or movie.get("name"),
                "overview": movie.get("overview", ""),
                "poster_path": movie.get("poster_path", ""),
                "release_date": movie.get("release_date", ""),
                "score": round(avg_score, 1),
                "individual_scores": individual_scores,
                "reasons": common_reasons[:4]
            })

    group_recommendations.sort(key=lambda r: r["score"], reverse=True)
    return group_recommendations[:10]
