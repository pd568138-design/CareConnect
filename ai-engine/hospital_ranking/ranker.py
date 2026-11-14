def rank_hospitals(hospitals: list[dict], specialty: str) -> list[dict]:
    target = (specialty or "").lower()
    results=[]
    for h in hospitals:
        specs=[str(x).lower() for x in h.get("specialties", [])]
        score=(0.7 if target in specs else 0.0)+(0.3 if h.get("available_slots") else 0.0)
        results.append({**h,"ranking_score":round(score,2)})
    return sorted(results,key=lambda x:x["ranking_score"],reverse=True)
