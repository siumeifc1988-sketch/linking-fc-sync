
"""
scripts/build_player_10_agg_EVENT_CODE.py - FIX 0 問題
讀 data/matches.json，兼容 string/int key，EA API 有時係 "217" 字串
"""
import json, os, time
from pathlib import Path

CLUB_ID = "41026"

def gi(p, *keys):
    for k in keys:
        # 試 int, str, 和 "event_x" 格式
        for cand in [k, str(k), f"event_{k}"]:
            if cand in p and p[cand] is not None:
                try: return int(float(p[cand]))
                except: pass
            # 有時 stats 在 p["stats"] 入面
            if "stats" in p and isinstance(p["stats"], dict):
                if cand in p["stats"] and p["stats"][cand] is not None:
                    try: return int(float(p["stats"][cand]))
                    except: pass
    return 0

def gf(p, *keys):
    for k in keys:
        for cand in [k, str(k)]:
            if cand in p and p[cand] is not None:
                try: return float(p[cand])
                except: pass
            if "stats" in p and isinstance(p["stats"], dict):
                if cand in p["stats"]:
                    try: return float(p["stats"][cand])
                    except: pass
    return 0.0

EVENT_CODES = {
    "217_中龍": 217, "218_唔中龍": 218,
    "13_中龍_禁區內": 13, "14_唔中_禁區內": 14, "18_中龍_禁區外": 18, "19_唔中_禁區外": 19,
    "214_入球": 214, "11_助攻": 11, "202_被撲救": 202,
    "215_成功傳球": 215, "216_失敗傳球": 216,
    "24_成功短傳": 24, "25_失敗短傳": 25, "26_成功中傳": 26, "27_失敗中傳": 27,
    "28_成功長傳": 28, "29_失敗長傳": 29, "30_成功向前傳": 30, "31_失敗向前傳": 31,
    "32_成功向後傳": 32, "33_失敗向後傳": 33, "34_成功橫傳": 34, "35_失敗橫傳": 35,
    "36_成功傳中": 36, "37_失敗傳中": 37,
    "143_一腳傳球": 143, "144_轉邊": 144, "147_花式傳球": 147, "152_直塞成功": 152, "153_越位傳球": 153,
    "174_盤帶成功": 174, "97_持球推進": 97, "38_花式過人": 38, "112_過人相關": 112,
    "0_搶斷成功": 0, "1_搶斷失敗": 1, "229_站立搶斷成功": 229, "230_滑剷成功": 230,
    "163_危險搶斷": 163, "164_乾淨搶斷": 164, "6_截傳球": 6, "158_對手被斷": 158, "156_封堵傳中": 156,
    "265_爭頂成功_進攻": 265, "266_爭頂成功_防守": 266,
    "108_防守三區奪回": 108, "109_中場奪回": 109, "110_前場奪回": 110,
    "105_防守三區丟波": 105, "106_中場丟波": 106, "107_前場丟波": 107,
    "2_犯規": 2, "3_防守三區犯規": 3, "4_被犯規": 4, "95_即時黃牌": 95, "213_延遲黃牌": 213,
    "94_送十二碼": 94, "10_送角球": 10, "145_開角球": 145,
    "111_走位正確": 111, "219_走位失誤總數": 219,
    "99_失誤嚴重度1": 99, "100_失誤嚴重度2": 100, "101_失誤嚴重度3": 101, "102_失誤嚴重度4": 102, "103_失誤嚴重度5": 103,
    "212_回饋多用波": 212, "207_回饋揀啱傳球": 207, "175_回饋無好選擇": 175, "176_回饋好選擇": 176, "177_回饋最好選擇": 177,
    "182_回饋應該傳去第二度": 182, "183_回饋選擇傳球": 183,
}

Path("data").mkdir(exist_ok=True)

data = json.load(open("data/matches.json", encoding="utf-8"))
matches = data.get("matches", [])
print(f"[1] 讀 {len(matches)} 場")

# DEBUG: 印第一場第一個球員有咩 key
if matches:
    m0 = matches[0]
    clubs = m0.get("clubs", {})
    cd = clubs.get(CLUB_ID) or clubs.get(int(CLUB_ID)) or {}
    players = cd.get("players", {}) or m0.get("players", {})
    if players:
        pid0 = list(players.keys())[0]
        p0 = players[pid0]
        print(f"[DEBUG] 第一場 player {p0.get('playername')} keys sample: {list(p0.keys())[:50]}")
        if "stats" in p0:
            print(f"[DEBUG] stats keys: {list(p0['stats'].keys())[:50]}")

unique = {}
for m in matches:
    mid = str(m.get("matchId") or m.get("id") or "")
    if not mid: continue
    unique[mid]=m
print(f"[2] 去重 {len(unique)} 場")

agg_map={}
for mid, m in unique.items():
    clubs = m.get("clubs", {})
    cd = clubs.get(CLUB_ID) or clubs.get(int(CLUB_ID)) or clubs.get(str(CLUB_ID)) or {}
    if not cd: cd=m
    players = cd.get("players", {}) or m.get("players", {})
    for pid, p in players.items():
        name = p.get("playername") or p.get("name") or str(pid)
        if name not in agg_map:
            agg_map[name]={
                "player_name": name,
                "player_id": str(pid),
                "matches": 0,
                "rating_sum": 0,
                "avg_rating": 0,
            }
            for k in EVENT_CODES:
                agg_map[name][k]=0
                agg_map[name][f"event_{EVENT_CODES[k]}"]=0
            agg_map[name]["總射門"]=0
            agg_map[name]["禁區內"]=0
            agg_map[name]["禁區外"]=0
            agg_map[name]["goals"]=0
            agg_map[name]["assists"]=0

        g=agg_map[name]
        g["matches"]+=1
        for k, code in EVENT_CODES.items():
            v = gi(p, code)
            g[k]=g.get(k,0)+v
            g[f"event_{code}"]=g.get(f"event_{code}",0)+v

        g["總射門"]= g.get("217_中龍",0) + g.get("218_唔中龍",0)
        g["禁區內"]= g.get("13_中龍_禁區內",0) + g.get("14_唔中_禁區內",0)
        g["禁區外"]= g.get("18_中龍_禁區外",0) + g.get("19_唔中_禁區外",0)
        g["goals"]= g.get("214_入球",0)
        g["assists"]= g.get("11_助攻",0)
        g["passes"]= g.get("215_成功傳球",0)
        g["shots"]= g.get("總射門",0)
        g["interceptions"]= g.get("6_截傳球",0)
        g["tacklesMade"]= g.get("0_搶斷成功",0)
        g["event_105"]= g.get("105_防守三區丟波",0)
        g["event_219"]= g.get("219_走位失誤總數",0)
        g["event_177"]= g.get("177_回饋最好選擇",0)

        g["rating_sum"]= g.get("rating_sum",0) + gf(p, "rating", "overallRating", "ratingAve", "mom")
        g["avg_rating"]= g["rating_sum"]/g["matches"] if g["matches"] else 0

out = sorted(agg_map.values(), key=lambda x: x["matches"], reverse=True)
Path("data/players_agg.json").write_text(json.dumps({"players": out, "count": len(out), "matches": len(unique), "updated": int(time.time()), "type": "event_code_full_fix0"}, ensure_ascii=False, indent=2), encoding="utf-8")
Path("data/player_10_agg.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[3] data/players_agg.json {len(out)}人 {len(unique)}場")
for p in out[:5]:
    print(f"  {p['player_name']}: {p['matches']}場 G{p['goals']} 217={p['217_中龍']} 215={p['215_成功傳球']} 105={p['105_防守三區丟波']} 219={p['219_走位失誤總數']} 177={p['177_回饋最好選擇']}")

try:
    if os.getenv("FIREBASE_SERVICE_ACCOUNT") or os.path.exists("firebase-key.json"):
        import firebase_admin
        from firebase_admin import credentials, firestore
        import base64
        if os.getenv("FIREBASE_SERVICE_ACCOUNT"):
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
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        for player in out:
            doc_id = player["player_name"].replace("/","_").replace(" ","_")[:100]
            db.collection("player_10_agg").document(doc_id).set(player, merge=True)
        print(f"[4] Firestore player_10_agg {len(out)}人 OK")
        for player in out:
            doc_id = player["player_name"].replace("/","_").replace(" ","_")[:100]
            db.collection("clubs").document(CLUB_ID).collection("members_agg").document(doc_id).set(player, merge=True)
        print(f"[5] clubs/41026/members_agg OK")
except Exception as e:
    print(f"Firebase 跳過: {e}")

print("=== FIX0 完成 ===")
