def score_priority(symptoms: str, self_reported: str = "routine") -> dict:
    """Administrative routing score only; never a diagnosis or clinical triage."""
    text = (symptoms or "").lower()
    emergency_terms = ["chest pain", "difficulty breathing", "cannot breathe", "unconscious", "severe bleeding", "stroke", "seizure"]
    urgent_terms = ["high fever", "severe pain", "worsening", "persistent vomiting"]
    if any(term in text for term in emergency_terms):
        return {"score": 100, "level": "emergency_notice", "message": "Possible emergency symptoms: seek emergency medical care now. Do not wait for an online appointment."}
    if self_reported == "urgent" or any(term in text for term in urgent_terms):
        return {"score": 75, "level": "urgent_review", "message": "Flagged for prompt human review. A clinician must determine urgency."}
    if self_reported == "soon":
        return {"score": 45, "level": "soon", "message": "Consider an earlier available appointment."}
    return {"score": 15, "level": "routine", "message": "Routine appointment request. Final priority is determined by clinical staff."}
