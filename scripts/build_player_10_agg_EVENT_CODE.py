
"""
scripts/build_player_10_agg_EVENT_CODE.py - FINAL FIX
根據 fc27-clubs-api 官方文件：
- matches[].players["41026"][playerId] 係球員
- Event Code 喺 match_event_aggregate_0/1/2/3 入面，格式 "215:21,216:5,217:3"
參考：https://github.com/1erkandogan/fc27-clubs-api/blob/main/docs/match-events.md
"""
import json, os, time
from pathlib import Path

CLUB_ID_STR = "41026"
CLUB_ID_INT = 41026

def parse_event_aggregates(player):
    """parse 0:1,215:21,217:3 -> {215:21, 217:3} """
    result = {}
    for i in range(4):
        key = f"match_event_aggregate_{i}"
        raw = player.get(key, "") or ""
        if not raw:
            continue
        # raw 係 string "0:2,1:1,215:21"
        for pair in raw.split(","):
            pair=pair.strip()
            if not pair or ":" not in pair:
                continue
            try:
                eid_str, cnt_str = pair.split(":", 1)
                eid = int(eid_str.strip())
                cnt = int(cnt_str.strip())
                result[eid] = result.get(eid, 0) + cnt
            except:
                continue
    return result

def gi_event(ev_dict, code):
    return ev_dict.get(code, 0) or ev_dict.get(str(code), 0)

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
print(f"[1] 讀 {len(matches)} 場 from data/matches.json")

# DEBUG 第一場結構
if matches:
    m0 = matches[0]
    print(f"[DEBUG] m0 keys: {list(m0.keys())[:20]}")
    print(f"[DEBUG] m0 has players: {'players' in m0}, clubs: {'clubs' in m0}")
    if "players" in m0:
        print(f"[DEBUG] m0.players keys (clubIds): {list(m0['players'].keys())[:10]}")
        cp = m0["players"].get(CLUB_ID_STR) or m0["players"].get(CLUB_ID_INT) or {}
        if cp:
            pid0 = next(iter(cp.keys()), None)
            if pid0:
                p0 = cp[pid0]
                print(f"[DEBUG] 第一球員 ID {pid0} name={p0.get('playername')} keys sample: {list(p0.keys())[:20]}")
                print(f"[DEBUG] match_event_aggregate_0 sample: {str(p0.get('match_event_aggregate_0','')[:150])}")
                ev = parse_event_aggregates(p0)
                print(f"[DEBUG] parsed events sample: {dict(list(ev.items())[:20])}")

unique = {}
for m in matches:
    mid = str(m.get("matchId") or m.get("id") or "")
    if not mid: continue
    unique[mid]=m
print(f"[2] 去重後 {len(unique)} 場 unique")

agg_map={}
for mid, m in unique.items():
    # 新結構：players[clubId][playerId]
    players_by_club = m.get("players", {})
    club_players = None
    if isinstance(players_by_club, dict):
        club_players = players_by_club.get(CLUB_ID_STR) or players_by_club.get(CLUB_ID_INT)
        # 有時 clubId 係 int key 轉 string，試晒
        if not club_players:
            for k,v in players_by_club.items():
                if str(k)==CLUB_ID_STR:
                    club_players=v
                    break
    # 舊結構兼容：clubs[clubId].players
    if not club_players:
        clubs = m.get("clubs", {})
        if isinstance(clubs, dict):
            cd = clubs.get(CLUB_ID_STR) or clubs.get(CLUB_ID_INT)
            if cd and isinstance(cd, dict):
                club_players = cd.get("players", {})

    if not club_players or not isinstance(club_players, dict):
        continue

    for pid, p in club_players.items():
        if not isinstance(p, dict):
            continue
        name = p.get("playername") or p.get("name") or str(pid)
        # 過濾 clubId 誤當 player
        if str(name)==CLUB_ID_STR or str(pid)==CLUB_ID_STR:
            continue

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
            agg_map[name]["goals"]=0
            agg_map[name]["assists"]=0

        ev = parse_event_aggregates(p)

        g=agg_map[name]
        g["matches"]+=1
        for k, code in EVENT_CODES.items():
            v = gi_event(ev, code)
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

        try:
            rating = float(p.get("rating") or p.get("overallRating") or 0)
        except:
            rating=0
        g["rating_sum"]= g.get("rating_sum",0) + rating
        g["avg_rating"]= g["rating_sum"]/g["matches"] if g["matches"] else 0

out = sorted(agg_map.values(), key=lambda x: x["matches"], reverse=True)
Path("data/players_agg.json").write_text(json.dumps({"players": out, "count": len(out), "matches": len(unique), "updated": int(time.time()), "type": "event_code_final_parse_aggregate"}, ensure_ascii=False, indent=2), encoding="utf-8")
Path("data/player_10_agg.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"[3] data/players_agg.json {len(out)}人 {len(unique)}場")
for p in out[:10]:
    print(f"  {p['player_name']}: {p['matches']}場 G{p['goals']} A{p['assists']} 217={p['217_中龍']} 215={p['215_成功傳球']} 6={p['6_截傳球']} 105={p['105_防守三區丟波']} 219={p['219_走位失誤總數']} 177={p['177_回饋最好選擇']} rating={p['avg_rating']:.2f}")

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
            db.collection("clubs").document(CLUB_ID_STR).collection("members_agg").document(doc_id).set(player, merge=True)
        print(f"[5] clubs/41026/members_agg OK")
except Exception as e:
    import traceback
    print(f"Firebase 跳過: {e}")
    traceback.print_exc()

print("=== FINAL FIX 完成 - 而家應該唔係 0 ===")
