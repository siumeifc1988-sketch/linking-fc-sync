import json, os
from google.cloud import firestore

# 1. 讀 GitHub 備份
with open("data/matches.json","r",encoding="utf-8") as f:
    data=json.load(f)
    matches=data.get("matches",data) # 你個係 {"matches":[ ... ]} 結構

db=firestore.Client(project="football-signup-64bd9")
batch=db.batch()
count=0

for m in matches:
    raw = m.get("raw", m) if isinstance(m.get("raw"), dict) else json.loads(m.get("raw","{}")) if m.get("raw") else m
    if not raw: continue
    matchId = str(raw.get("matchId") or m.get("matchId"))
    players = raw.get("players",{}).get("41026",{}) or m.get("players",{}).get("41026",{})
    if isinstance(players, list):
        players = {p.get("playerId"): p for p in players}

    for pid, p in players.items():
        doc_id = f"{matchId}_{pid}"
        doc = {
            "matchId": matchId,
            "playerId": str(pid),
            "player_name": p.get("playername") or p.get("name"),
            "timestamp": raw.get("timestamp") or m.get("timestamp"),
            "goals": int(p.get("goals",0)),
            "assists": int(p.get("assists",0)),
            "rating": float(p.get("rating",0)),
            "raw": p,  # 成個球員當場數據
            "dateStr": m.get("dateStr","")
        }
        batch.set(db.collection("player_match_stats").document(doc_id), doc)
        count+=1
        if count%400==0:
            batch.commit()
            batch=db.batch()
            print(f"已寫 {count} 條")

batch.commit()
print(f"重建完成 共 {count} 條 player_match_stats")