"""
LinKing FC - 完整電腦流程版 (curl_cffi + Firebase + 3650)
路徑: scripts/fetch_ea_PLUS.py
MAX_KEEP=3650，每日10場夠一年
新增: members/stats 今季 + members/career/stats 生涯 都用 curl_cffi 抓，分開存 Firestore
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

# 6. 球員今季 + 生涯 都用 curl_cffi 抓
def parse_members(raw):
    members=[]
    if isinstance(raw, dict):
        if "members" in raw:
            members=raw["members"]
        elif str(CLUB_ID) in raw:
            members=raw.get(str(CLUB_ID), {}).get("members", [])
    elif isinstance(raw, list):
        members=raw
    cleaned=[]
    for p in members[:150]:
        if not isinstance(p, dict):
            continue
        cleaned.append({
            "name": p.get("name") or p.get("proName") or "Unknown",
            "proName": p.get("proName") or "",
            "gamesPlayed": int(p.get("gamesPlayed") or 0),
            "winRate": int(p.get("winRate") or 0),
            "goals": int(p.get("goals") or 0),
            "assists": int(p.get("assists") or 0),
            "cleanSheetsDef": int(p.get("cleanSheetsDef") or 0),
            "cleanSheetsGK": int(p.get("cleanSheetsGK") or 0),
            "shotSuccessRate": float(p.get("shotSuccessRate") or 0),
            "passesMade": int(p.get("passesMade") or 0),
            "passSuccessRate": float(p.get("passSuccessRate") or 0),
            "ratingAve": float(p.get("ratingAve") or p.get("rating") or 0),
            "tacklesMade": int(p.get("tacklesMade") or 0),
            "tackleSuccessRate": float(p.get("tackleSuccessRate") or 0),
            "manOfTheMatch": int(p.get("manOfTheMatch") or 0),
            "redCards": int(p.get("redCards") or 0),
            "favoritePosition": p.get("favoritePosition") or p.get("position") or "",
            "proPos": p.get("proPos") or "",
            "proOverall": str(p.get("proOverall") or p.get("proOverallStr") or ""),
            "proNationality": str(p.get("proNationality") or ""),
            "prevGoals": p.get("prevGoals") or 0,
        })
    return sorted(cleaned, key=lambda x: (x["ratingAve"], x["goals"]), reverse=True)

# 6a. 今季
url_season = f"https://proclubs.ea.com/api/fc/members/stats?platform=common-gen5&clubId={CLUB_ID}"
raw_season = cffi_get(url_season)
time.sleep(1)
cleaned_season = parse_members(raw_season) if raw_season else []
json.dump({"players": cleaned_season, "count": len(cleaned_season), "updated": int(time.time()), "type": "season"},
          open("data/players.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[5a] data/players.json 今季 {len(cleaned_season)}人")

# 6b. 生涯
url_career = f"https://proclubs.ea.com/api/fc/members/career/stats?platform=common-gen5&clubId={CLUB_ID}"
raw_career = cffi_get(url_career)
time.sleep(1)
cleaned_career = parse_members(raw_career) if raw_career else []
json.dump({"players": cleaned_career, "count": len(cleaned_career), "updated": int(time.time()), "type": "career"},
          open("data/players_career.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[5b] data/players_career.json 生涯 {len(cleaned_career)}人")

# 7. Firebase 上傳 (如果有 secrets)
try:
    if os.getenv("FIREBASE_SERVICE_ACCOUNT") or os.path.exists("firebase-key.json"):
        import firebase_admin
        from firebase_admin import credentials, firestore, storage
        print("[6] 上傳 Firebase...")
        if os.getenv("FIREBASE_SERVICE_ACCOUNT"):
            import base64
            cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            try:
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

        db = firestore.client()
        db.collection("clubs").document(CLUB_ID).set({
            "matchesCount": len(recent),
            "playersCount": len(cleaned_season),
            "playersCareerCount": len(cleaned_career),
            "updated": firestore.SERVER_TIMESTAMP,
            "maxKeep": MAX_KEEP
        }, merge=True)

        # matches
        batch = db.batch()
        for i, m in enumerate(recent[:100]):
            ref = db.collection("clubs").document(CLUB_ID).collection("matches").document(str(m.get("matchId")))
            batch.set(ref, {k: v for k,v in m.items() if k != "_raw"}, merge=True)
            if i % 400 == 0 and i>0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print("  Firestore matches OK")

        # members 今季
        batch = db.batch()
        for p in cleaned_season:
            pid = p["name"].replace("/","_").replace(" ","_")[:100]
            ref = db.collection("clubs").document(CLUB_ID).collection("members").document(pid)
            batch.set(ref, {**p, "type": "season", "updated": firestore.SERVER_TIMESTAMP}, merge=True)
        batch.commit()
        print(f"  Firestore members/season OK {len(cleaned_season)}人")

        # members 生涯
        batch = db.batch()
        for p in cleaned_career:
            pid = p["name"].replace("/","_").replace(" ","_")[:100]
            ref = db.collection("clubs").document(CLUB_ID).collection("members_career").document(pid)
            batch.set(ref, {**p, "type": "career", "updated": firestore.SERVER_TIMESTAMP}, merge=True)
        batch.commit()
        print(f"  Firestore members/career OK {len(cleaned_career)}人")

        # 頂層 members 集合 (方便前端直接讀)
        for col_name, lst in [("members", cleaned_season), ("members_career", cleaned_career)]:
            batch = db.batch()
            for p in lst:
                pid = p["name"].replace("/","_").replace(" ","_")[:100]
                ref = db.collection(col_name).document(pid)
                batch.set(ref, {**p, "clubId": CLUB_ID, "type": col_name, "updated": firestore.SERVER_TIMESTAMP}, merge=True)
            batch.commit()

        # Storage
        try:
            bucket = storage.bucket()
            bucket.blob(f"clubs/{CLUB_ID}/matches.json").upload_from_filename("data/matches.json")
            bucket.blob(f"clubs/{CLUB_ID}/players.json").upload_from_filename("data/players.json")
            bucket.blob(f"clubs/{CLUB_ID}/players_career.json").upload_from_filename("data/players_career.json")
            print("  Storage OK")
        except Exception as se:
            print(f"  Storage 跳過 (bucket 不存在): {se}")

    else:
        print("[6] 無 Firebase key，跳過上傳 (本地測試正常)")
except Exception as e:
    print(f"Firebase 失敗 (唔影響主流程): {e}")

print("=== 完成 ===")
