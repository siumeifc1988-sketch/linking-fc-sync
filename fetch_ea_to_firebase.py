import os
import json
import time
from curl_cffi import requests as curl_requests
import requests as py_requests  # Firebase 用普通 requests 穩定啲

CLUB_ID = "41026"
TYPES = {
    "leagueMatch": "聯賽",
    "friendlyMatch": "友誼賽",
    "playoffMatch": "季後賽"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com"
}

all_matches = []

for match_type in TYPES:
    url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={match_type}&maxResultCount=20"
    try:
        r = curl_requests.get(url, headers=headers, impersonate="chrome124", timeout=30)
        print(f"{match_type}: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            for m in data:
                m["_matchType"] = match_type
                all_matches.append(m)
            print(f"{match_type} 捉到 {len(data)} 場")
        else:
            print(f"{match_type} 被擋 {r.status_code}")
    except Exception as e:
        print(f"{match_type} 錯誤 {e}")
    time.sleep(3)

dedup = {str(m['matchId']): m for m in all_matches}
merged = sorted(dedup.values(), key=lambda x: int(x.get('timestamp', 0)), reverse=True)

os.makedirs("data", exist_ok=True)
with open("data/matches.json", "w", encoding="utf-8") as f:
    json.dump({"matches": merged, "updated": int(time.time()), "count": len(merged)}, f, ensure_ascii=False, indent=2)

print(f"寫入 {len(merged)} 場 到 data/matches.json")

# ---------- 寫去 Firebase (DATE = timestamp) ----------
API_KEY = os.getenv("FIREBASE_API_KEY")
PROJECT = os.getenv("FIREBASE_PROJECT", "football-signup-64bd9")

if not API_KEY:
    print("無 FIREBASE_API_KEY，跳過 Firebase 上傳 (去 GitHub Settings > Secrets 加)")
else:
    for m in merged:
        match_id = str(m.get("matchId"))
        ts = int(m.get("timestamp", 0))
        # DATE 人睇
        date_str = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(ts)) if ts else ""
        
        clubs = m.get("clubs", {})
        our = clubs.get(CLUB_ID) or next(iter(clubs.values()), {})
        opp_id = next((k for k in clubs.keys() if k != CLUB_ID), "unknown")
        opp = clubs.get(opp_id, {})
        
        gf = int(our.get("goals", 0)) if isinstance(our, dict) else 0
        ga = int(opp.get("goals", 0)) if isinstance(opp, dict) else 0
        
        payload = {
            "fields": {
                "matchId": {"stringValue": match_id},
                "timestamp": {"integerValue": str(ts)},
                "dateStr": {"stringValue": date_str},
                "matchType": {"stringValue": m.get("_matchType", "")},
                "ourGoals": {"integerValue": str(gf)},
                "oppGoals": {"integerValue": str(ga)},
                "opponentId": {"stringValue": str(opp_id)},
                "raw": {"stringValue": json.dumps(m, ensure_ascii=False)[:900000]}
            }
        }
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/matches/{match_id}?key={API_KEY}"
        try:
            r = py_requests.patch(url, json=payload, timeout=20)
            print(f"Firebase {match_id} {date_str} -> {r.status_code}")
        except Exception as e:
            print(f"Firebase {match_id} 失敗 {e}")
        time.sleep(0.2)
