"""
LinKing FC - 完整電腦流程版 (curl_cffi + Firebase + 3650)
路徑: scripts/fetch_ea_PLUS.py
MAX_KEEP=3650，每日10場夠一年

電腦本地測試:
pip install -r requirements.txt
python scripts/fetch_ea_PLUS.py
"""
import os, json, time
from pathlib import Path
from curl_cffi import requests as curl_requests

CLUB_ID = "41026"
MAX_KEEP = 3650
TYPES = {
    "leagueMatch": "聯賽",
    "friendlyMatch": "友誼賽",
    "playoffMatch": "季後賽"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com",
}

def cffi_get(url):
    try:
        r = curl_requests.get(url, headers=HEADERS, impersonate="chrome124", timeout=30)
        print(f"GET {url} -> {r.status_code} len={len(r.text)}")
        if r.status_code == 200 and r.text:
            return r.json()
    except Exception as e:
        print(f"失敗 {url}: {e}")
    return None

Path("data/archive").mkdir(parents=True, exist_ok=True)

# 1. 讀舊檔
old_matches = []
if os.path.exists("data/matches.json"):
    try:
        old_matches = json.load(open("data/matches.json", encoding="utf-8")).get("matches", [])
    except:
        pass
print(f"[1] 舊檔 {len(old_matches)} 場")

# 2. curl_cffi 抓新場次
all_new = []
for mt in TYPES:
    url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={mt}&maxResultCount=20"
    j = cffi_get(url)
    if j and isinstance(j, list):
        for m in j:
            m["_matchType"] = mt
            m["_matchTypeName"] = TYPES[mt]
        all_new.extend(j)
    time.sleep(1.2)

# 3. 去重
merged_dict = {str(m.get("matchId") or m.get("id")): m for m in old_matches + all_new if m.get("matchId") or m.get("id")}
merged = sorted(merged_dict.values(), key=lambda x: int(x.get("timestamp",0) or 0), reverse=True)
print(f"[2] 合併後 {len(merged)} 場")

# 4. 封存
if len(merged) > MAX_KEEP:
    recent = merged[:MAX_KEEP]
    archive = merged[MAX_KEEP:]
    by_year = {}
    for m in archive:
        yr = time.strftime("%Y", time.gmtime(int(m.get("timestamp",0) or 0))) if m.get("timestamp") else "unknown"
        by_year.setdefault(yr, []).append(m)
    for yr, lst in by_year.items():
        p = f"data/archive/matches-{yr}.json"
        old_arc = json.load(open(p, encoding="utf-8")).get("matches", []) if os.path.exists(p) else []
        arc_dict = {str(x.get("matchId")): x for x in old_arc + lst}
        final_arc = sorted(arc_dict.values(), key=lambda x: int(x.get("timestamp",0) or 0), reverse=True)
        json.dump({"matches": final_arc, "count": len(final_arc)}, open(p,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
else:
    recent = merged

# 5. 主檔
json.dump({
    "matches": recent,
    "count": len(recent),
    "updated": int(time.time()),
    "maxKeep": MAX_KEEP,
    "method": "curl_cffi chrome124"
}, open("data/matches.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[3] data/matches.json {len(recent)}場 {os.path.getsize('data/matches.json')//1024}KB")

# 6. 球員 (正確路徑)
players_raw = None
for url in [
    f"https://proclubs.ea.com/api/fc/members/stats?platform=common-gen5&clubId={CLUB_ID}",
    f"https://proclubs.ea.com/api/fc/clubs/info?platform=common-gen5&clubIds={CLUB_ID}",
]:
    j = cffi_get(url)
    if j and len(str(j)) > 50:
        players_raw = j
        print(f"[4] 球員命中 {url}")
        if isinstance(j, list) or "goals" in str(j):
            break
    time.sleep(1)

final_players = []
if isinstance(players_raw, dict):
    if "members" in players_raw:
        final_players = players_raw["members"]
    elif str(CLUB_ID) in players_raw:
        final_players = players_raw.get(str(CLUB_ID), {}).get("members", []) or list(players_raw.values())
    else:
        vals = list(players_raw.values())
        if vals and isinstance(vals[0], dict):
            final_players = vals
elif isinstance(players_raw, list):
    final_players = players_raw

cleaned = []
for p in final_players[:150]:
    if not isinstance(p, dict):
        continue
    cleaned.append({
        "name": p.get("name") or p.get("playerName") or p.get("personaName") or "Unknown",
        "gamesPlayed": p.get("gamesPlayed") or p.get("matches") or 0,
        "goals": p.get("goals",0),
        "assists": p.get("assists",0),
        "shots": p.get("shots",0),
        "shotSuccessRate": p.get("shotSuccessRate") or 0,
        "passesMade": p.get("passesMade") or 0,
        "passAttempts": p.get("passAttempts") or 0,
        "passSuccessRate": p.get("passSuccessRate") or 0,
        "tacklesMade": p.get("tacklesMade") or 0,
        "tackleAttempts": p.get("tackleAttempts") or 0,
        "tackleSuccessRate": p.get("tackleSuccessRate") or 0,
        "interceptions": p.get("interceptions"), # 分開欄
        "redCards": p.get("redCards",0),
        "rating": p.get("rating") or 0,
        "position": p.get("position") or "",
    })

cleaned = sorted(cleaned, key=lambda x: (x["goals"], x["assists"]), reverse=True)
json.dump({"players": cleaned, "count": len(cleaned), "updated": int(time.time())},
          open("data/players.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[5] data/players.json {len(cleaned)}人")

# 7. Firebase 上傳 (如果有 secrets)
try:
    if os.getenv("FIREBASE_SERVICE_ACCOUNT") or os.path.exists("firebase-key.json"):
        import firebase_admin
        from firebase_admin import credentials, firestore, storage
        print("[6] 上傳 Firebase...")
        # 支援兩種: 環境變數 JSON 或 檔案
        if os.getenv("FIREBASE_SERVICE_ACCOUNT"):
            import base64, tempfile
            # GitHub Secrets 通常 base64
            cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            try:
                # 試 base64 decode
                cred_str = base64.b64decode(cred_json).decode()
                cred_dict = json.loads(cred_str)
            except:
                cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
        else:
            cred = credentials.Certificate("firebase-key.json")

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': os.getenv("FIREBASE_BUCKET", "linking-fc.appspot.com")
            })

        # Firestore
        db = firestore.client()
        db.collection("clubs").document(CLUB_ID).set({
            "matchesCount": len(recent),
            "playersCount": len(cleaned),
            "updated": firestore.SERVER_TIMESTAMP,
            "maxKeep": MAX_KEEP
        }, merge=True)
        # 分批寫 matches (最多500 batch)
        batch = db.batch()
        for i, m in enumerate(recent[:100]):  # 只上傳最近100場到 Firestore，全部放 Storage
            ref = db.collection("clubs").document(CLUB_ID).collection("matches").document(str(m.get("matchId")))
            batch.set(ref, {k: v for k,v in m.items() if k != "_raw"}, merge=True)
            if i % 400 == 0 and i>0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print("  Firestore OK")

        # Storage 上傳完整 JSON (大數據放呢度，唔爆 Firestore)
        bucket = storage.bucket()
        bucket.blob(f"clubs/{CLUB_ID}/matches.json").upload_from_filename("data/matches.json")
        bucket.blob(f"clubs/{CLUB_ID}/players.json").upload_from_filename("data/players.json")
        print("  Storage OK -> clubs/41026/matches.json")
    else:
        print("[6] 無 Firebase key，跳過上傳 (本地測試正常)")
except Exception as e:
    print(f"Firebase 失敗 (唔影響主流程): {e}")

print("=== 完成 ===")
