from curl_cffi import requests
import json
import os
import time

# ========== CONFIG 可改參數 ==========
CLUB_ID = "41026"
PLATFORM = "common-gen5"
BASE_URL = "https://proclubs.ea.com/api/fc/clubs/matches"
MATCH_TYPES = ["leagueMatch", "friendlyMatch", "playoffMatch"]
MAX_RESULT_COUNT = 10

# Firebase REST API 設定
FIREBASE_PROJECT_ID = "football-signup-64bd9"
FIREBASE_COLLECTION = "matches"
FIREBASE_API_KEY = os.environ["FIREBASE_API_KEY"]
FIREBASE_REST_BASE = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/{FIREBASE_COLLECTION}"

# curl_cffi 模擬瀏覽器指紋，chrome120 穩定
IMPERSONATE = "chrome120"
REQUEST_TIMEOUT = 30
# ====================================

def fetch_ea_matches(match_type: str):
    params = {
        "platform": PLATFORM,
        "clubIds": CLUB_ID,
        "matchType": match_type,
        "maxResultCount": MAX_RESULT_COUNT
    }
    headers = {
        "accept": "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "referer": "https://www.ea.com/"
    }
    session = requests.Session()
    resp = session.get(
        BASE_URL,
        params=params,
        headers=headers,
        impersonate=IMPERSONATE,
        timeout=REQUEST_TIMEOUT
    )
    resp.raise_for_status()
    return resp.json()

def firestore_check_doc_exists(doc_id: str) -> bool:
    url = f"{FIREBASE_REST_BASE}/{doc_id}?key={FIREBASE_API_KEY}"
    r = requests.get(url, impersonate=IMPERSONATE, timeout=20)
    return r.status_code == 200

def firestore_write_match(match: dict):
    """
    Firestore REST API 寫入，document id = match["matchId"]，自動去重
    Firestore REST 格式要轉成 fields map
    """
    match_id = match["matchId"]
    if firestore_check_doc_exists(match_id):
        print(f"✅ Match {match_id} already exists, skip")
        return True

    # 轉 python dict → firestore REST fields 結構
    def to_fs_value(val):
        if isinstance(val, str):
            return {"stringValue": val}
        elif isinstance(val, bool):
            return {"booleanValue": val}
        elif isinstance(val, int):
            return {"integerValue": str(val)}
        elif isinstance(val, float):
            return {"doubleValue": val}
        elif isinstance(val, list):
            return {"arrayValue": {"values": [to_fs_value(i) for i in val]}}
        elif isinstance(val, dict):
            return {"mapValue": {"fields": {k: to_fs_value(v) for k, v in val.items()}}}
        elif val is None:
            return {"nullValue": None}
        else:
            return {"stringValue": str(val)}

    fs_fields = {}
    for k, v in match.items():
        fs_fields[k] = to_fs_value(v)

    payload = {
        "fields": fs_fields
    }
    url = f"{FIREBASE_REST_BASE}/{match_id}?key={FIREBASE_API_KEY}"
    res = requests.patch(
        url,
        json=payload,
        impersonate=IMPERSONATE,
        timeout=30
    )
    res.raise_for_status()
    print(f"📥 Wrote new match: {match_id}")
    return True

def main():
    all_matches = []
    for mt in MATCH_TYPES:
        print(f"\n🔍 Fetch matchType: {mt}")
        data = fetch_ea_matches(mt)
        matches = data.get("matches", [])
        print(f"Got {len(matches)} matches for {mt}")
        all_matches.extend(matches)
        time.sleep(2) # 簡單限流，唔好狂炸EA API

    # 去重（防止同一場賽事同時出現多個matchType返回）
    unique_matches = {m["matchId"]: m for m in all_matches}.values()
    print(f"\n📊 Total unique matches: {len(unique_matches)}")

    for match in unique_matches:
        firestore_write_match(match)
        time.sleep(0.8)

if __name__ == "__main__":
    main()
