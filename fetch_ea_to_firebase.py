import os, json, time, requests
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

CLUB_ID = os.getenv("CLUB_ID","41026")
PROJECT = os.getenv("FIREBASE_PROJECT","football-signup-64bd9")
API_KEY = os.getenv("FIREBASE_API_KEY")
TYPES = ["leagueMatch","friendlyMatch","playoffMatch"]

def fetch_with_browser():
    all_m = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
        page = context.new_page()
        print("去 EA 攞 Akamai 餅...")
        page.goto("https://www.ea.com/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        page.goto("https://proclubs.ea.com/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        for t in TYPES:
            url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}&matchType={t}&maxResultCount=10"
            print(f"捉 {t}...")
            try:
                data = page.evaluate(f"""async () => {{
                    const r = await fetch("{url}", {{credentials:"include"}});
                    return await r.json();
                }}""")
                if isinstance(data, list):
                    print(f"{t} 成功 {len(data)} 場")
                    all_m.extend(data)
                else:
                    print(f"{t} 回傳 {data}")
            except Exception as e:
                print(f"{t} 失敗 {e}")
        browser.close()
    return all_m

matches = fetch_with_browser()
dedup = {m['matchId']: m for m in matches}
merged = sorted(dedup.values(), key=lambda x: int(x.get('timestamp',0)), reverse=True)
print(f"總共 {len(merged)} 場")

os.makedirs("data", exist_ok=True)
with open("data/matches.json","w",encoding="utf-8") as f:
    json.dump({"fetchedAt": datetime.now(timezone.utc).isoformat(), "matches": merged}, f, ensure_ascii=False, indent=2)

# 推去 Firebase (用你而家個 API_KEY REST)
if not merged or not API_KEY:
    print("無數據或無 API_KEY，跳過 Firebase")
    exit(0)

for m in merged:
    clubs = m.get("clubs",{})
    our = clubs.get(CLUB_ID) or list(clubs.values())[0]
    opp_id = next((k for k in clubs if k!=CLUB_ID), "0")
    opp = clubs.get(opp_id,{})
    ourG = int(our.get("goals",0))
    oppG = int(our.get("goalsAgainst", opp.get("goals",0)))
    result = "W" if ourG>oppG else "L" if ourG<oppG else "D"

    # Firestore REST 格式
    doc_id = str(m['matchId'])
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/matches/{doc_id}?key={API_KEY}"
    body = {
        "fields": {
            "matchId": {"stringValue": doc_id},
            "timestamp": {"integerValue": str(m.get('timestamp',0))},
            "ourGoals": {"integerValue": str(ourG)},
            "oppGoals": {"integerValue": str(oppG)},
            "result": {"stringValue": result},
            "opponent": {"stringValue": opp.get('details',{}).get('name', opp_id)},
            "opponentId": {"stringValue": opp_id},
            "raw": {"stringValue": json.dumps(m)[:900000]}
        }
    }
    r = requests.patch(url, json=body)
    print(f"推 {doc_id} {r.status_code}")
