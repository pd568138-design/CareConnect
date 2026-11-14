from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any
from priority_scoring.scorer import score_priority
from doctor_matching.matcher import match_doctors
from hospital_ranking.ranker import rank_hospitals

app=FastAPI(title="Healthcare Intelligence AI Engine",version="1.0.0")
class PriorityInput(BaseModel):
    symptoms: str = Field(min_length=1,max_length=3000)
    self_reported: str = "routine"
class MatchInput(BaseModel):
    specialty: str
    doctors: list[dict[str,Any]] = []
class HospitalInput(BaseModel):
    specialty: str
    hospitals: list[dict[str,Any]] = []
@app.get("/")
def root(): return {"ok":True,"service":"Healthcare Intelligence AI Engine"}
@app.get("/health")
def health(): return {"ok":True}
@app.post("/priority")
def priority(data:PriorityInput): return score_priority(data.symptoms,data.self_reported)
@app.post("/match-doctors")
def match(data:MatchInput): return {"matches":match_doctors(data.specialty,data.doctors)}
@app.post("/rank-hospitals")
def rank(data:HospitalInput): return {"hospitals":rank_hospitals(data.hospitals,data.specialty)}
