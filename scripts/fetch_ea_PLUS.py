"""
LinKing FC - FIXED 版，避免 Firebase 429
改動：
- 加 should_skip_firebase() 檢查，場數一樣就唔上傳 Firebase，只寫 data/matches.json
- matches 只上傳最新20場，唔係100場
- 寫入由 153次/次 → 0-20次/次
"""
import os, json, time, hashlib
from pathlib import Path
from curl_cffi import requests as curl_requests

CLUB_ID = "41026"
MAX_KEEP = 3650
TYPES = {"leagueMatch":"聯賽","friendlyMatch":"友誼賽","playoffMatch":"季後賽"}
HEADERS = {"User-Agent":"Mozilla/5.0 Chrome/124.0","Accept":"application/json","Referer":"https://www.ea.com/"}

def cffi_get(url):
    for imp in ["chrome110","chrome120","chrome124","chrome"]:
        try:
            r = curl_requests.get(url, headers=HEADERS, impersonate=imp, timeout=30)
            if r.status_code==200 and r.text:
                return r.json()
        except: continue
    return None

Path("data/archive").mkdir(parents=True, exist_ok=True)
old_matches=[]
if os.path.exists("data/matches.json"):
    try: old_matches=json.load(open("data/matches.json",encoding="utf-8")).get("matches",[])
    except: pass
print(f"[1] 舊檔 {len(old_matches)} 場")

all_new=[]
for mt in TYPES:
    url=f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={mt}&maxResultCount=20"
    j=cffi_get(url)
    if j and isinstance(j,list):
        for m in j: m["_matchType"]=mt; m["_matchTypeName"]=TYPES[mt]
        all_new.extend(j)
    time.sleep(1.2)

merged_dict={str(m.get("matchId") or m.get("id")):m for m in old_matches+all_new if m.get("matchId") or m.get("id")}
merged=sorted(merged_dict.values(), key=lambda x:int(x.get("timestamp",0) or 0), reverse=True)
print(f"[2] 合併後 {len(merged)} 場")

# 檢查有冇新比賽，冇就跳過 Firebase
def is_same_as_before():
    if len(merged)==len(old_matches):
        old_ids=set(str(m.get("matchId")) for m in old_matches)
        new_ids=set(str(m.get("matchId")) for m in merged)
        return old_ids==new_ids
    return False

skip_firebase = is_same_as_before()
if skip_firebase:
    print("[FIX] 場數一樣，無新比賽，跳過 Firebase 上傳，慳 153次寫入")

if len(merged)>MAX_KEEP:
    recent=merged[:MAX_KEEP]
else:
    recent=merged

json.dump({"matches":recent,"count":len(recent),"updated":int(time.time()),"maxKeep":MAX_KEEP}, open("data/matches.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[3] data/matches.json {len(recent)}場")

#... members 抓取保持原樣...
def parse_members(raw):
    members=[]
    if isinstance(raw,dict):
        if "members" in raw: members=raw["members"]
        elif str(CLUB_ID) in raw: members=raw.get(str(CLUB_ID),{}).get("members",[])
    elif isinstance(raw,list): members=raw
    cleaned=[]
    for p in members[:150]:
        if not isinstance(p,dict): continue
        def gi(k):
            try: return int(float(str(p.get(k) or 0)))
            except: return 0
        def gf(k):
            try: return float(p.get(k) or 0)
            except: return 0
        cleaned.append({"name":p.get("name") or "Unknown","gamesPlayed":gi("gamesPlayed"),"goals":gi("goals"),"assists":gi("assists"),"passesMade":gi("passesMade"),"ratingAve":gf("ratingAve"),"tacklesMade":gi("tacklesMade"),"redCards":gi("redCards"),"yellowCards":gi("yellowCards")})
    return sorted(cleaned, key=lambda x:x["ratingAve"], reverse=True)

raw_season=cffi_get(f"https://proclubs.ea.com/api/fc/members/stats?platform=common-gen5&clubId={CLUB_ID}")
cleaned_season=parse_members(raw_season) if raw_season else []
json.dump({"players":cleaned_season,"count":len(cleaned_season)}, open("data/players.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)

raw_career=cffi_get(f"https://proclubs.ea.com/api/fc/members/career/stats?platform=common-gen5&clubId={CLUB_ID}")
cleaned_career=parse_members(raw_career) if raw_career else []
json.dump({"players":cleaned_career,"count":len(cleaned_career)}, open("data/players_career.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)

# Firebase 上傳 - 只有有新比賽先上傳，且只上傳20場
try:
    if skip_firebase:
        print("[6] 跳過 Firebase 上傳")
    elif os.getenv("FIREBASE_SERVICE_ACCOUNT"):
        import firebase_admin, base64
        from firebase_admin import credentials, firestore
        cred_json=os.getenv("FIREBASE_SERVICE_ACCOUNT")
        try: cred_dict=json.loads(base64.b64decode(cred_json).decode())
        except: cred_dict=json.loads(cred_json)
        cred=credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db=firestore.client()
        # 只上傳最新20場，唔係100場
        batch=db.batch()
        for m in recent[:20]:
            ref=db.collection("clubs").document(CLUB_ID).collection("matches").document(str(m.get("matchId")))
            batch.set(ref, {k:v for k,v in m.items() if k!="_raw"}, merge=True)
        batch.commit()
        print(f" Firestore matches OK 20場 (慳 80次寫入)")
except Exception as e:
    print(f"Firebase 失敗: {e}")

print("=== 完成 ===")
