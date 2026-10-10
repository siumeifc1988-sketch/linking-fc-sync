"""
Fix: curl_cffi 0.6.2 只支援 chrome99, chrome100, chrome101, chrome104, chrome107, chrome110, chrome120 唔支援 124
改用 chrome110 + 自動 fallback
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com",
}

def cffi_get(url):
    for imp in ["chrome110", "chrome120", "chrome", "safari"]:
        try:
            r = curl_requests.get(url, headers=HEADERS, impersonate=imp, timeout=30)
            print(f"GET {url} [{imp}] -> {r.status_code} len={len(r.text)}")
            if r.status_code == 200 and r.text and len(r.text) > 10:
                try:
                    return r.json()
                except:
                    print(f"非JSON: {r.text[:200]}")
            elif r.status_code == 403:
                print(f"403 Forbidden [{imp}] 試下一個")
                continue
        except Exception as e:
            err = str(e)
            if "Impersonating" in err and "not supported" in err:
                print(f"{imp} 不支援，試下一個")
                continue
            print(f"失敗 {url} [{imp}]: {e}")
    return None

Path("data/archive").mkdir(parents=True, exist_ok=True)

old_matches = []
if os.path.exists("data/matches.json"):
    try:
        old_matches = json.load(open("data/matches.json", encoding="utf-8")).get("matches", [])
    except:
        pass
print(f"[1] 舊檔 {len(old_matches)} 場")

all_new = []
for mt in TYPES:
    url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={mt}&maxResultCount=20"
    j = cffi_get(url)
    if j and isinstance(j, list):
        for m in j:
            m["_matchType"] = mt
            m["_matchTypeName"] = TYPES[mt]
        all_new.extend(j)
        print(f"  {mt}: {len(j)} 場")
    time.sleep(1.2)

merged_dict = {str(m.get("matchId") or m.get("id")): m for m in old_matches + all_new if m.get("matchId") or m.get("id")}
merged = sorted(merged_dict.values(), key=lambda x: int(x.get("timestamp",0) or 0), reverse=True)
print(f"[2] 合併後 {len(merged)} 場 (新增 {len(all_new)} 場)")

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

json.dump({
    "matches": recent,
    "count": len(recent),
    "updated": int(time.time()),
    "maxKeep": MAX_KEEP,
    "method": "curl_cffi chrome110 fallback"
}, open("data/matches.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[3] data/matches.json {len(recent)}場 {os.path.getsize('data/matches.json')//1024}KB")

players_raw = None
for url in [
    f"https://proclubs.ea.com/api/fc/members/stats?platform=common-gen5&clubId={CLUB_ID}",
    f"https://proclubs.ea.com/api/fc/clubs/info?platform=common-gen5&clubIds={CLUB_ID}",
]:
    j = cffi_get(url)
    if j and len(str(j)) > 50:
        players_raw = j
        print(f"[4] 球員命中 {url} -> {type(j)}")
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
        "interceptions": p.get("interceptions"),
        "redCards": p.get("redCards",0),
        "rating": p.get("rating") or 0,
        "position": p.get("position") or "",
    })

cleaned = sorted(cleaned, key=lambda x: (x["goals"], x["assists"]), reverse=True)
json.dump({"players": cleaned, "count": len(cleaned), "updated": int(time.time())},
          open("data/players.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[5] data/players.json {len(cleaned)}人")

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
            firebase_admin.initialize_app(cred, {'storageBucket': os.getenv("FIREBASE_BUCKET", "linking-fc.appspot.com")})
        db = firestore.client()
        db.collection("clubs").document(CLUB_ID).set({"matchesCount": len(recent), "playersCount": len(cleaned), "updated": firestore.SERVER_TIMESTAMP, "maxKeep": MAX_KEEP}, merge=True)
        batch = db.batch()
        for i, m in enumerate(recent[:100]):
            ref = db.collection("clubs").document(CLUB_ID).collection("matches").document(str(m.get("matchId")))
            batch.set(ref, {k: v for k,v in m.items() if k != "_raw"}, merge=True)
            if i % 400 == 0 and i>0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        bucket = storage.bucket()
        bucket.blob(f"clubs/{CLUB_ID}/matches.json").upload_from_filename("data/matches.json")
        bucket.blob(f"clubs/{CLUB_ID}/players.json").upload_from_filename("data/players.json")
        print("  Firebase OK")
    else:
        print("[6] 無 Firebase key，跳過上傳")
except Exception as e:
    print(f"Firebase 失敗: {e}")

print("=== 完成 ===")
