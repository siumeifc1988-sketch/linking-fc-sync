
import json, os, base64, sys
from pathlib import Path

cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if not cred_json and os.path.exists("firebase-key.json"):
    cred_json = open("firebase-key.json", "r", encoding="utf-8").read()
if not cred_json:
    print("需要 FIREBASE_SERVICE_ACCOUNT env")
    sys.exit(1)

try:
    # 先試 base64
    cred_dict = json.loads(base64.b64decode(cred_json).decode())
    print("Secret 為 base64 格式，已 decode")
except Exception as e1:
    try:
        cred_dict = json.loads(cred_json)
        print("Secret 為 JSON 格式")
    except Exception as e2:
        print(f"Secret 解析失敗: {e1} / {e2}")
        print(cred_json[:200])
        sys.exit(1)

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(cred_dict)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

col = db.collection("player_10_agg")
docs = list(col.stream())
print(f"現有 {len(docs)} 個 docs in player_10_agg")

deleted=0
kept=0
seen={}
for d in docs:
    doc_id = d.id
    data = d.to_dict() or {}
    name = (data.get("player_name") or data.get("name") or doc_id).strip()
    key = name.lower()
    # 去重：同一人名小寫重複
    if key in seen:
        # 保留 matches 大者
        cur_score = (data.get("matches") or 0)*1000 + (data.get("215_成功傳球") or data.get("passes") or 0)
        prev_doc_id, prev_score = seen[key]
        if cur_score > prev_score:
            print(f"DUPLICATE {name} ({key}): 刪舊 {prev_doc_id} score={prev_score}, 保留新 {doc_id} score={cur_score}")
            try:
                db.collection("player_10_agg").document(prev_doc_id).delete()
                deleted+=1
            except: pass
            seen[key]=(doc_id, cur_score)
        else:
            print(f"DUPLICATE {name} ({key}): 刪新 {doc_id} score={cur_score}, 保留舊 {prev_doc_id} score={prev_score}")
            try:
                d.reference.delete()
                deleted+=1
            except: pass
        continue

    is_numeric_id = doc_id.isdigit()
    has_event = (data.get("215_成功傳球") or data.get("event_215") or data.get("217_中龍") or data.get("event_217") or data.get("matches") or 0) > 0
    if is_numeric_id and not has_event:
        print(f"DELETE 舊垃圾數字ID {doc_id} 全部 0")
        try:
            d.reference.delete()
            deleted+=1
        except: pass
        continue
    # 記錄 seen
    score = (data.get("matches") or 0)*1000 + (data.get("215_成功傳球") or 0)
    seen[key]=(doc_id, score)
    ev215 = data.get("215_成功傳球") or data.get("event_215") or 0
    print(f"KEEP 新 {doc_id} name={name} 215={ev215} matches={data.get('matches')}")
    kept+=1

print(f"\n完成：刪 {deleted} 個，保留 {kept} 個 unique {len(seen)}")
print("\n=== 而家正確數據 ===")
for d in db.collection("player_10_agg").stream():
    data = d.to_dict()
    print(f"{d.id}: {data.get('player_name')} {data.get('matches')}場 217={data.get('217_中龍')} 215={data.get('215_成功傳球')} 6={data.get('6_截傳球')} 105={data.get('105_防守三區丟波')}")
