import os
import json
import time
from curl_cffi import requests

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
        r = requests.get(url, headers=headers, impersonate="chrome124", timeout=30)
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