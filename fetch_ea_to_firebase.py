import os, json, time
from curl_cffi import requests as curl_requests
import requests as py_requests

CLUB_ID = "41026"
TYPES = {"leagueMatch":"聯賽","friendlyMatch":"友誼賽","playoffMatch":"季後賽"}
HEADERS = {
    "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept":"application/json","Referer":"https://www.ea.com/","Origin":"https://www.ea.com"
}

def fetch(url):
    try:
        r = curl_requests.get(url, headers=HEADERS, impersonate="chrome124", timeout=30)
        print(url, r.status_code)
        if r.status_code==200:
            return r.json()
    except Exception as e:
        print("ERR", e)
    return None

# 1. 比賽
all_m=[]
for mt in TYPES:
    u=f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={mt}&maxResultCount=20"
    j=fetch(u)
    if j:
        for m in j:
            m["_matchType"]=mt
            all_m.append(m)
    time.sleep(1)

dedup={str(m['matchId']):m for m in all_m}
merged=sorted(dedup.values(), key=lambda x:int(x.get('timestamp',0)), reverse=True)[:30]

# 2. 逐場球員 (解決睇唔到個別表現)
for m in merged:
    mid=str(m['matchId'])
    # 試幾個逐場 endpoint
    for tmpl in [
        f"https://proclubs.ea.com/api/fc/matches/{mid}?platform=common-gen5",
        f"https://proclubs.ea.com/api/fc/clubs/{CLUB_ID}/matches/{mid}?platform=common-gen5",
    ]:
        d=fetch(tmpl)
        if d and d.get('clubs'):
            for cid,cdata in d['clubs'].items():
                if cid in m.get('clubs',{}) and cdata.get('players'):
                    m['clubs'][cid]['players']=cdata['players']
            print(f"  {mid} 逐場球員 OK")
            break
        time.sleep(0.5)

# 3. 賽季球員總計
plist=fetch(f"https://proclubs.ea.com/api/fc/clubs/{CLUB_ID}/members?platform=common-gen5")
pstat=fetch(f"https://proclubs.ea.com/api/fc/clubs/{CLUB_ID}/members/stats?platform=common-gen5")

pmap={}
if isinstance(plist, dict): plist=plist.get('members',[])
if isinstance(plist, list):
    for p in plist:
        pid=str(p.get('playerId') or p.get('id'))
        pmap[pid]={"playerId":pid,"name":p.get('name') or "球員","pos":p.get('favoritePosition') or ""}

if isinstance(pstat, dict): pstat=pstat.get('members',[])
if isinstance(pstat, list):
    for s in pstat:
        pid=str(s.get('playerId') or s.get('id'))
        if pid not in pmap: pmap[pid]={"playerId":pid,"name":s.get('name') or "球員"}
        pmap[pid].update(s)

final=list(pmap.values())
final.sort(key=lambda x:int(x.get('goals',0) or 0), reverse=True)

os.makedirs("data", exist_ok=True)
with open("data/matches.json","w",encoding="utf-8") as f:
    json.dump({"matches":merged,"updated":int(time.time()),"count":len(merged)}, f, ensure_ascii=False, indent=2)
with open("data/players.json","w",encoding="utf-8") as f:
    json.dump({"players":final,"updated":int(time.time()),"count":len(final)}, f, ensure_ascii=False, indent=2)

print(f"完成: {len(merged)}場 + {len(final)}球員")

# 4. Firebase (可選)
API=os.getenv("FIREBASE_API_KEY"); PROJ=os.getenv("FIREBASE_PROJECT","football-signup-64bd9")
if API:
    for m in merged:
        mid=str(m['matchId']); ts=int(m.get('timestamp',0))
        opp=next((c.get('clubName') or c.get('name') or "" for cid,c in m.get('clubs',{}).items() if str(cid)!=str(CLUB_ID)), "對手")
        payload={"fields":{
            "matchId":{"stringValue":mid},
            "timestamp":{"integerValue":str(ts)},
            "opponentName":{"stringValue":opp},
            "raw":{"stringValue":json.dumps(m, ensure_ascii=False)[:900000]}
        }}
        url=f"https://firestore.googleapis.com/v1/projects/{PROJ}/databases/(default)/documents/matches/{mid}?key={API}"
        try: py_requests.patch(url, json=payload, timeout=15)
        except: pass
