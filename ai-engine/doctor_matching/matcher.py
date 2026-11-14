def match_doctors(specialty: str, doctors: list[dict]) -> list[dict]:
    wanted = (specialty or "").strip().lower()
    ranked = []
    for doctor in doctors:
        actual = str(doctor.get("specialty", "")).lower()
        score = 1.0 if actual == wanted else (0.45 if wanted in actual or actual in wanted else 0.0)
        if score:
            ranked.append({**doctor, "match_score": round(score, 2)})
    return sorted(ranked, key=lambda x: (x["match_score"], int(x.get("experience", 0) or 0)), reverse=True)
