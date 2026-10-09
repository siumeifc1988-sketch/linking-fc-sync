import os, requests, json, re, sys

CLUB_ID = os.getenv("CLUB_ID", "41026")
PROJECT = os.getenv("FIREBASE_PROJECT", "football-signup-64bd9")
API_KEY = os.getenv("FIREBASE_API_KEY") or os.getenv("FIREBASE_APIKEY") or "AIzaSyC3UOT0RyPs6ELCzZOEUXAWn9ysp_-Tw70"

if not API_KEY:
    print("Missing FIREBASE_API_KEY")
    sys.exit(1)

EA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com",
}

def sanitize(s):
    return re.sub(r'[^a-z0-9_-]', '_', str(s).lower())[:100]

def parse_interceptions(pl):
    agg = (pl.get("match_event_aggregate_0","")+","+pl.get("match_event_aggregate_1","")+","+pl.get("match_event_aggregate_2","")+","+pl.get("match_event_aggregate_3",""))
    cnt = 0
    for part in agg.split(","):
        if ":" not in part: continue
        eid, c = part.split(":",1)
        eid = eid.strip()
        try: cc = int(c)
        except: continue
        if eid in ["60","61","62","100","101","102","103","120","121","122","123","124","125"]:
            cnt += cc
    return cnt

# EA requires matchType now
urls = [
    f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType=leagueMatch&maxResultCount=10",
    f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType=leagueMatch",
]

matches = []
for url in urls:
    print(f"Fetching {url}")
    try:
        r = requests.get(url, headers=EA_HEADERS, timeout=20)
        print(f"  Status {r.status_code}")
        if r.ok:
            j = r.json()
            if isinstance(j, dict) and str(CLUB_ID) in j:
                matches = j[str(CLUB_ID)]
            elif isinstance(j, list):
                matches = j
            if matches:
                break
    except Exception as e:
        print(f"  Err {e}")

if not matches:
    print("Failed to fetch matches")
    sys.exit(0)

print(f"Got {len(matches)} matches")
open("ea_matches.json","w",encoding="utf-8").write(json.dumps(matches, ensure_ascii=False, indent=2))

saved = 0
player_saved = 0
for m in matches:
    clubs = m.get("clubs",{})
    our = clubs.get(str(CLUB_ID)) or clubs.get(int(CLUB_ID)) if isinstance(CLUB_ID, int) else clubs.get(str(CLUB_ID))
    if not our:
        our = clubs.get("41026")
    if not our:
        continue
    oppId = next((k for k in clubs.keys() if str(k)!=str(CLUB_ID)), None)
    opp = clubs.get(oppId) if oppId else None
    matchId_raw = str(m.get("matchId") or m.get("timestamp") or m.get("time") or "")
    matchId = sanitize(matchId_raw or f"{m.get('timestamp',0)}")
    gf = int(our.get("goals",0))
    ga = int(opp.get("goals",0)) if opp else 0
    oppName = (opp.get("clubInfo",{}).get("name") if opp else "對手") or (opp.get("details",{}).get("name") if opp else "對手") or "對手"
    result = "W" if gf>ga else "L" if gf<ga else "D"
    ts = m.get("timestamp") or m.get("time") or 0

    # matches collection
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/matches/{matchId}?key={API_KEY}&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=ourGoals&updateMask.fieldPaths=oppGoals&updateMask.fieldPaths=result&updateMask.fieldPaths=opponent&updateMask.fieldPaths=opponentId&updateMask.fieldPaths=raw"
    body = {
        "fields":{
            "timestamp":{"integerValue":str(int(ts))},
            "ourGoals":{"integerValue":str(gf)},
            "oppGoals":{"integerValue":str(ga)},
            "result":{"stringValue":result},
            "opponent":{"stringValue":oppName},
            "opponentId":{"stringValue":str(oppId or "")},
            "raw":{"stringValue":json.dumps(m)[:10000]}
        }
    }
    r = requests.patch(url, json=body, timeout=10)
    if r.ok: saved += 1
    print(f"  matches/{matchId} {gf}-{ga} vs {oppName} -> {r.status_code}")

    # player_match_stats
    players_block = m.get("players",{})
    ourPlayers = players_block.get(str(CLUB_ID)) or players_block.get(int(CLUB_ID)) if str(CLUB_ID).isdigit() else players_block.get(str(CLUB_ID)) or {}
    if not ourPlayers:
        ourPlayers = players_block.get("41026") or {}

    for pid, pl in ourPlayers.items():
        pName = (pl.get("playername") or "").strip()
        if not pName: continue
        docId = sanitize(f"{matchId_raw}_{pName}")
        interceptions = parse_interceptions(pl)
        body2 = {
            "fields":{
                "matchId":{"stringValue":str(m.get('matchId') or matchId_raw)},
                "timestamp":{"integerValue":str(int(ts))},
                "playerName":{"stringValue":pName},
                "goals":{"integerValue":str(int(pl.get('goals',0)))},
                "assists":{"integerValue":str(int(pl.get('assists',0)))},
                "rating":{"doubleValue":float(pl.get('rating',0) or 0)},
                "passesMade":{"integerValue":str(int(pl.get('passesmade',0) or pl.get('passesMade',0) or 0))},
                "tacklesMade":{"integerValue":str(int(pl.get('tacklesmade',0) or pl.get('tacklesMade',0) or 0))},
                "interceptions":{"integerValue":str(interceptions)},
                "pos":{"stringValue":str(pl.get('pos',''))},
                "opponent":{"stringValue":oppName},
                "ourGoals":{"integerValue":str(gf)},
                "oppGoals":{"integerValue":str(ga)},
                "result":{"stringValue":result}
            }
        }
        url2 = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/player_match_stats/{docId}?key={API_KEY}&updateMask.fieldPaths=matchId&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=playerName&updateMask.fieldPaths=goals&updateMask.fieldPaths=assists&updateMask.fieldPaths=rating&updateMask.fieldPaths=passesMade&updateMask.fieldPaths=tacklesMade&updateMask.fieldPaths=interceptions&updateMask.fieldPaths=pos&updateMask.fieldPaths=opponent&updateMask.fieldPaths=ourGoals&updateMask.fieldPaths=oppGoals&updateMask.fieldPaths=result"
        r2 = requests.patch(url2, json=body2, timeout=10)
        if r2.ok: player_saved += 1

print(f"\nDone: {saved} matches, {player_saved} player_match_stats")

# rebuild player_season_stats from all player_match_stats (fetch all)
try:
    url_all = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/player_match_stats?pageSize=1000&key={API_KEY}"
    r_all = requests.get(url_all, timeout=15)
    if r_all.ok:
        docs = r_all.json().get("documents",[])
        agg = {}
        for doc in docs:
            f = doc.get("fields",{})
            pn = f.get("playerName",{}).get("stringValue","")
            if not pn: continue
            key = sanitize(pn)
            if key not in agg:
                agg[key] = {"playerName":pn,"gamesPlayed":0,"goals":0,"assists":0,"passesMade":0,"tacklesMade":0,"interceptions":0,"ratingSum":0}
            agg[key]["gamesPlayed"] += int(f.get("goals",{}).get("integerValue","0") or 0) + 0  # just count doc as 1 game, not goals
            # Actually gamesPlayed = number of docs
            # fix: we counted above wrong, recount
        # recount correctly
        agg = {}
        for doc in docs:
            f = doc.get("fields",{})
            pn = f.get("playerName",{}).get("stringValue","")
            if not pn: continue
            key = sanitize(pn)
            if key not in agg:
                agg[key] = {"playerName":pn,"gamesPlayed":0,"goals":0,"assists":0,"passesMade":0,"tacklesMade":0,"interceptions":0,"ratingSum":0}
            agg[key]["gamesPlayed"] += 1
            agg[key]["goals"] += int(f.get("goals",{}).get("integerValue","0") or 0)
            agg[key]["assists"] += int(f.get("assists",{}).get("integerValue","0") or 0)
            agg[key]["passesMade"] += int(f.get("passesMade",{}).get("integerValue","0") or 0)
            agg[key]["tacklesMade"] += int(f.get("tacklesMade",{}).get("integerValue","0") or 0)
            agg[key]["interceptions"] += int(f.get("interceptions",{}).get("integerValue","0") or 0)
            agg[key]["ratingSum"] += float(f.get("rating",{}).get("doubleValue",0) or f.get("rating",{}).get("integerValue",0) or 0)

        for k,v in agg.items():
            ratingAve = v["ratingSum"]/v["gamesPlayed"] if v["gamesPlayed"] else 0
            url3 = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/player_season_stats/{k}?key={API_KEY}&updateMask.fieldPaths=playerName&updateMask.fieldPaths=gamesPlayed&updateMask.fieldPaths=goals&updateMask.fieldPaths=assists&updateMask.fieldPaths=passesMade&updateMask.fieldPaths=tacklesMade&updateMask.fieldPaths=interceptions&updateMask.fieldPaths=ratingAve&updateMask.fieldPaths=lastUpdated"
            body3 = {
                "fields":{
                    "playerName":{"stringValue":v["playerName"]},
                    "gamesPlayed":{"integerValue":str(v["gamesPlayed"])},
                    "goals":{"integerValue":str(v["goals"])},
                    "assists":{"integerValue":str(v["assists"])},
                    "passesMade":{"integerValue":str(v["passesMade"])},
                    "tacklesMade":{"integerValue":str(v["tacklesMade"])},
                    "interceptions":{"integerValue":str(v["interceptions"])},
                    "ratingAve":{"doubleValue":ratingAve},
                    "lastUpdated":{"integerValue":str(int(__import__('time').time()))}
                }
            }
            requests.patch(url3, json=body3, timeout=10)
        print(f"Rebuilt {len(agg)} player_season_stats")
except Exception as e:
    print(f"Rebuild season stats failed: {e}")