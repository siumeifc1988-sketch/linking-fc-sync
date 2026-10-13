
import json, os, base64, sys
from pathlib import Path

# 用同一個 FIREBASE_SERVICE_ACCOUNT 清舊 0 數據
cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT") or open("firebase-key.json").read() if os.path.exists("firebase-key.json") else None
if not cred_json:
    print("需要 FIREBASE_SERVICE_ACCOUNT env")
    sys.exit(1)

try:
    cred_dict = json.loads(base64.b64decode(cred_json).decode())
except:
    cred_dict = json.loads(cred_json)

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
for d in docs:
    doc_id = d.id
    data = d.to_dict() or {}
    # 舊垃圾：doc ID 係純數字 1010374, 1055364 等
    is_numeric_id = doc_id.isdigit()
    # 檢查有冇 Event Code
    has_event = (data.get("215_成功傳球") or data.get("event_215") or data.get("217_中龍") or data.get("event_217") or 0) > 0
    # 如果係數字 ID 且全部 0，就刪
    if is_numeric_id and not has_event:
        print(f"DELETE 舊垃圾 {doc_id} 全部 0")
        d.reference.delete()
        deleted+=1
    elif is_numeric_id and has_event:
        print(f"KEEP 數字但有數 {doc_id} 保留")
        kept+=1
    else:
        # 名稱 ID 係新數據
        ev215 = data.get("215_成功傳球") or data.get("event_215") or 0
        print(f"KEEP 新 {doc_id} 215={ev215} matches={data.get('matches')}")
        kept+=1

print(f"完成：刪 {deleted} 個舊 0 數據，保留 {kept} 個")

# 順便列出而家正確數據
print("\n=== 而家正確數據 ===")
for d in db.collection("player_10_agg").stream():
    data = d.to_dict()
    print(f"{d.id}: {data.get('matches')}場 217={data.get('217_中龍')} 215={data.get('215_成功傳球')} 6={data.get('6_截傳球')} 105={data.get('105_防守三區丟波')}")
