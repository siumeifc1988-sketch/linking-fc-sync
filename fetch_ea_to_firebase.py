import requests, json, os, time

CLUB_ID = "41026"
TYPES = {
    "leagueMatch": "聯賽",
    "friendlyMatch": "友誼賽", 
    "playoffMatch": "季後賽"
}

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Referer": "https://www.ea.com/"
}

all_data = []
for t in TYPES:
    url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={t}&maxResultCount=10"
    try:
        r = requests.get(url, headers=headers, timeout=30)
        print(f"{t}: {r.status_code}")
        if r.status_code == 200:
            for m in r.json():
                m["_matchType"] = t
                all_data.append(m)
        else:
            print(f"{t} 被擋 {r.status_code}，今次跳過，下次再試")
    except Exception as e:
        print(f"{t} 錯誤 {e}")
    time.sleep(5)  # 你講嘅低頻率，每次中間停5秒

# 去重 + 排序
dedup = {m['matchId']: m for m in all_data}
merged = sorted(dedup.values(), key=lambda x: int(x['timestamp']), reverse=True)

os.makedirs("data", exist_ok=True)
with open("data/matches.json", "w", encoding="utf-8") as f:
    json.dump({"matches": merged, "updated": int(time.time())}, f, ensure_ascii=False, indent=2)

print(f"寫入 {len(merged)} 場")