import sys
import os

# Adjust import path to include backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.recommendation.parser import parse_free_text, parse_free_text_regex, parse_free_text_llm
from app.recommendation.scorer import score_movie, check_soft_match, satisfies_hard_constraints
from app.config import settings

def test_parser():
    print("=== Testing Regex Parser ===")
    prompts = [
        "must watch english comedy, prefer time travel, no horror",
        "prefer space adventure and sci-fi, must be under 120 mins",
        "I don't want action, ideally french"
    ]
    for prompt in prompts:
        print(f"\nPrompt: '{prompt}'")
        res = parse_free_text_regex(prompt)
        print(f"Confidence: {res['confidence']}")
        print("Hard Constraints:", res["hard_constraints"])
        print("Soft Preferences:", res["soft_preferences"])

    print("\n=== Testing Groq LLM Parser ===")
    for prompt in prompts:
        print(f"\nPrompt: '{prompt}'")
        res = parse_free_text_llm(prompt)
        if res:
            print(f"Confidence: {res['confidence']}")
            print("Hard Constraints:", res["hard_constraints"])
            print("Soft Preferences:", res["soft_preferences"])
        else:
            print("LLM parsing skipped (no API key or call failed)")

def test_scorer():
    print("\n=== Testing Scorer ===")
    # Setup profile
    prompt = "must watch english comedy, prefer time travel, no horror"
    parsed = parse_free_text(prompt)
    profile = {
        "preferred_genres": [],
        "preferred_cast": [],
        "preferred_crew": [],
        "similar_movies_keywords": [],
        "similar_movies_countries": [],
        "preferred_language": "en",
        "free_text": prompt,
        "extracted_free_text": parsed
    }

    # Movie 1: Horror comedy, English, time travel
    movie_horror_comedy = {
        "id": 1,
        "title": "Zombie Time Loop",
        "genres": [{"id": 35, "name": "Comedy"}, {"id": 27, "name": "Horror"}],
        "original_language": "en",
        "keywords": {"keywords": [{"id": 100, "name": "time travel"}]},
        "runtime": 90,
        "release_date": "2020-01-01"
    }

    # Movie 2: Sci-fi comedy, French, time travel
    movie_french_scifi = {
        "id": 2,
        "title": "Voyage dans le Temps",
        "genres": [{"id": 35, "name": "Comedy"}, {"id": 878, "name": "Science Fiction"}],
        "original_language": "fr",
        "keywords": {"keywords": [{"id": 100, "name": "time travel"}]},
        "runtime": 90,
        "release_date": "2020-01-01"
    }

    # Movie 3: Sci-fi comedy, English, time travel
    movie_perfect = {
        "id": 3,
        "title": "Back to the Future Loop",
        "genres": [{"id": 35, "name": "Comedy"}, {"id": 878, "name": "Science Fiction"}],
        "original_language": "en",
        "keywords": {"keywords": [{"id": 100, "name": "time travel"}]},
        "runtime": 95,
        "release_date": "2021-01-01"
    }

    # Movie 4: Comedy, English, no time travel (basic match)
    movie_basic = {
        "id": 4,
        "title": "Just a Comedy",
        "genres": [{"id": 35, "name": "Comedy"}],
        "original_language": "en",
        "keywords": {"keywords": []},
        "runtime": 100,
        "release_date": "2021-01-01"
    }

    print(f"Configured FREE_TEXT_WEIGHT: {settings.FREE_TEXT_WEIGHT}")

    for movie in [movie_horror_comedy, movie_french_scifi, movie_perfect, movie_basic]:
        print(f"\nMovie: '{movie['title']}'")
        hard_match = satisfies_hard_constraints(movie, profile, is_enriched=True)
        print(f"  Satisfies Hard Constraints: {hard_match}")
        score, reasons = score_movie(movie, profile)
        print(f"  Final Score: {score}")
        print(f"  Reasons: {reasons}")

    print("\n=== Testing Constraint Relaxation ===")
    relax_prompt = "must watch comedy, must be under 90 mins"
    relax_parsed = parse_free_text(relax_prompt)
    
    normal_profile = {
        "preferred_genres": [],
        "preferred_cast": [],
        "preferred_crew": [],
        "similar_movies_keywords": [],
        "similar_movies_countries": [],
        "preferred_language": "en",
        "free_text": relax_prompt,
        "extracted_free_text": relax_parsed
    }
    
    from app.recommendation.engine import relax_profile_constraints
    relaxed_profile = relax_profile_constraints(normal_profile)
    
    movie_borderline = {
        "id": 5,
        "title": "Borderline Length Comedy",
        "genres": [{"id": 35, "name": "Comedy"}],
        "original_language": "en",
        "keywords": {"keywords": []},
        "runtime": 105, # Fails 90 mins, passes relaxed 120 mins
        "release_date": "2021-01-01"
    }
    
    print("Normal profile max runtime constraint:", normal_profile["extracted_free_text"]["hard_constraints"]["with_runtime_lte"])
    print("Relaxed profile max runtime constraint:", relaxed_profile["extracted_free_text"]["hard_constraints"]["with_runtime_lte"])
    
    print("\nEvaluating 'Borderline Length Comedy' (105 mins):")
    print("  With Normal Profile:")
    print("    Satisfies Hard Constraints:", satisfies_hard_constraints(movie_borderline, normal_profile, is_enriched=True))
    print("  With Relaxed Profile:")
    print("    Satisfies Hard Constraints:", satisfies_hard_constraints(movie_borderline, relaxed_profile, is_enriched=True))

if __name__ == "__main__":
    test_parser()
    test_scorer()
