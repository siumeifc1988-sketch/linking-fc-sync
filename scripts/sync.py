#!/usr/bin/env python3
"""LinKing FC EA Pro Clubs sync — club 41026, platform common-gen5."""
from __future__ import annotations

import datetime
import json
import math
import os
import time
from pathlib import Path

from curl_cffi import requests

CLUB_ID = "41026"
API_BASE = f"https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds={CLUB_ID}"
ROOT = Path(__file__).resolve().parent.parent
MATCHES_PATH = ROOT / "data" / "matches.json"
BOARD_PATH = ROOT / "data" / "aggregated" / "board.json"
META_PATH = ROOT / "data" / "meta.json"


def try_fetch(match_type: str, count: int = 10) -> list:
    url = f"{API_BASE}&matchType={match_type}&maxResultCount={count}"
    for imp in ["chrome124", "chrome120", "safari17_2_ios"]:
        try:
            s = requests.Session(impersonate=imp)
            try:
                s.get("https://www.ea.com/games/ea-sports-fc/fc-26/clubs", timeout=15)
                time.sleep(0.5)
            except Exception:
                pass
            r = s.get(
                url,
                timeout=20,
                headers={
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8",
                    "Origin": "https://www.ea.com",
                    "Referer": "https://www.ea.com/",
                },
            )
            print(f"[{imp}] {match_type} -> {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                lst = (
                    data
                    if isinstance(data, list)
                    else data.get(CLUB_ID)
                    or data.get(int(CLUB_ID))
                    or data.get("matches")
                    or next((v for v in data.values() if isinstance(v, list)), [])
                )
                print(f"[{imp}] {match_type} 成功 {len(lst)}場")
                for m in lst:
                    m["_matchType"] = match_type
                return lst
        except Exception as e:
            print(f"[{imp}] {match_type} 例外 {e}")
            continue
    return []


def try_proxy(match_type: str, count: int = 10) -> list:
    proxy_base = os.getenv("EA_PROXY_URL", "").strip().rstrip("/")
    if not proxy_base:
        return []
    url = f"{API_BASE}&matchType={match_type}&maxResultCount={count}"
    try:
        r = requests.get(proxy_base + "/" + url, timeout=20)
        if r.status_code == 200:
            data = r.json()
            lst = (
                data
                if isinstance(data, list)
                else data.get(CLUB_ID)
                or data.get(int(CLUB_ID))
                or data.get("matches")
                or next((v for v in data.values() if isinstance(v, list)), [])
            )
            print(f"[Proxy] {match_type} {len(lst)}場")
            for m in lst:
                m["_matchType"] = match_type
            return lst
    except Exception as e:
        print(f"[Proxy] {match_type} 失敗 {e}")
    return []


def fetch(match_type: str, count: int = 10) -> list:
    lst = try_fetch(match_type, count)
    if not lst:
        lst = try_proxy(match_type, count)
    return lst


def load_existing() -> list:
    if MATCHES_PATH.exists():
        try:
            arr = json.loads(MATCHES_PATH.read_text(encoding="utf-8"))
            return arr if isinstance(arr, list) else []
        except Exception:
            return []
    return []


def safe(n) -> float:
    try:
        v = float(n)
        return 0.0 if math.isnan(v) or math.isinf(v) else v
    except Exception:
        return 0.0


def decode(s: str) -> dict:
    m = {}
    if not s:
        return m
    for p in s.split(","):
        kv = p.split(":")
        if len(kv) != 2:
            continue
        try:
            m[int(kv[0])] = float(kv[1])
        except Exception:
            pass
    return m


def pos_cn(p) -> str:
    if not p:
        return "未知"
    p = str(p).lower()
    if "goal" in p:
        return "門將"
    if "def" in p:
        return "後衛"
    if "mid" in p:
        return "中場"
    if any(x in p for x in ["for", "striker", "wing", "forward"]):
        return "前鋒"
    return p


def parse_player(p: dict) -> dict:
    a = decode(p.get("match_event_aggregate_0") or p.get("aggregate") or "")
    succ = safe(a.get(215, 0))
    pm = succ or safe(p.get("passesmade") or p.get("passesMade") or 0)
    pa = safe(p.get("passattempts") or p.get("passAttempts") or 0) or (succ + safe(a.get(153, 0))) or pm
    shots = safe(p.get("shots") or a.get(100, 0))
    shot_on = safe(a.get(101, 0) or p.get("shotsOn", 0))
    inside = safe(a.get(106, 0))
    outside = safe(a.get(107, 0) or max(0, shots - inside))
    if inside > 0:
        xg = shot_on * 0.35 + max(0, inside - shot_on) * 0.12 + outside * 0.04
    else:
        xg = shot_on * 0.32 + max(0, shots - shot_on) * 0.06
    return {
        "name": p.get("playername") or p.get("name") or "Unknown",
        "posCN": pos_cn(p.get("pos") or p.get("position") or ""),
        "rating": safe(p.get("rating", 0)),
        "goals": int(safe(p.get("goals", 0))),
        "assists": int(safe(p.get("assists", 0))),
        "xg": round(max(0, xg), 2),
        "xa": round(safe(a.get(216, 0)) * 0.12 + safe(p.get("assists", 0)) * 0.15, 2),
        "pm": int(pm),
        "pa": int(pa),
        "keyPass": int(safe(a.get(216, 0) or 0)),
        "interceptions": int(safe(a.get(24, 0) or 0)),
        "clearances": int(safe(a.get(30, 0))),
        "blocks": int(safe(a.get(31, 0))),
        "tk": int(safe(p.get("tacklesmade") or p.get("tacklesMade") or a.get(22, 0))),
        "games": 1,
        "ratingSum": safe(p.get("rating", 0)),
        "ratingCnt": 1 if safe(p.get("rating", 0)) else 0,
    }


def fingerprint(m: dict) -> str:
    ts = int((m.get("timestamp", 0) or 0) // 60 * 60)
    clubs = m.get("clubs", {})
    my = clubs.get(CLUB_ID) or next(iter(clubs.values()), {})
    other = next((k for k in clubs.keys() if k != CLUB_ID), "")
    return f"{ts}_{other}_{my.get('goals', 0)}-{my.get('goalsAgainst', 0)}"


def main() -> None:
    league = fetch("leagueMatch", 10)
    friendly = fetch("friendlyMatch", 10)
    playoff = fetch("playoffMatch", 10)
    all_latest = league + friendly + playoff

    now_hk = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
    now_str = now_hk.strftime("%Y-%m-%d %H:%M HKT")
    existing = load_existing()

    if not all_latest:
        print(f"⚠ 今次 EA 0場 (Runner 被封)，保留舊檔 {len(existing)}場 @ {now_str}")
        deduped = existing
        status = "保留舊檔"
    else:
        by = {}
        for m in all_latest:
            f = fingerprint(m)
            if f not in by or m.get("timestamp", 0) > by[f].get("timestamp", 0):
                by[f] = m
        deduped = sorted(by.values(), key=lambda x: x.get("timestamp", 0), reverse=True)
        status = "已更新"
        print(f"去重後 {len(deduped)}場")

    agg: dict = {}
    for d in deduped:
        players = d.get("players", {})
        my_raw = players.get(CLUB_ID) or {}
        if isinstance(my_raw, list):
            my_raw = {p.get("playerId", i): p for i, p in enumerate(my_raw)}
        for p_raw in my_raw.values():
            pp = parse_player(p_raw)
            if pp["name"] == "Unknown":
                continue
            name = pp["name"]
            if name not in agg:
                agg[name] = {
                    "xg": 0,
                    "xa": 0,
                    "goals": 0,
                    "assists": 0,
                    "pm": 0,
                    "pa": 0,
                    "keyPass": 0,
                    "interceptions": 0,
                    "clearances": 0,
                    "blocks": 0,
                    "tk": 0,
                    "games": 0,
                    "ratingSum": 0,
                    "ratingCnt": 0,
                    "posCN": pp["posCN"],
                }
            o = agg[name]
            o["xg"] += pp["xg"]
            o["xa"] += pp["xa"]
            o["goals"] += pp["goals"]
            o["assists"] += pp["assists"]
            o["pm"] += pp["pm"]
            o["pa"] += pp["pa"]
            o["keyPass"] += pp["keyPass"]
            o["interceptions"] += pp["interceptions"]
            o["clearances"] += pp["clearances"]
            o["blocks"] += pp["blocks"]
            o["tk"] += pp["tk"]
            o["games"] += 1
            o["ratingSum"] += pp["ratingSum"]
            o["ratingCnt"] += pp["ratingCnt"]

    players = []
    for name, a in agg.items():
        avg = a["ratingSum"] / a["ratingCnt"] if a["ratingCnt"] else 0
        players.append(
            {
                "name": name,
                "posCN": a["posCN"],
                "games": a["games"],
                "goals": a["goals"],
                "assists": a["assists"],
                "xg": round(a["xg"], 2),
                "xa": round(a["xa"], 2),
                "pm": a["pm"],
                "pa": a["pa"],
                "passPct": round(a["pm"] / a["pa"] * 100) if a["pa"] else 0,
                "keyPass": a["keyPass"],
                "interceptions": a["interceptions"],
                "clearances": a["clearances"],
                "blocks": a["blocks"],
                "tk": a["tk"],
                "totalDef": a["interceptions"] + a["clearances"] + a["blocks"] + a["tk"],
                "avgRating": round(avg, 2),
            }
        )
    players.sort(key=lambda x: (x["goals"] + x["assists"]), reverse=True)

    BOARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    if all_latest:
        MATCHES_PATH.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")

    board = {
        "players": players,
        "totalMatches": len(deduped),
        "lastUpdated": now_hk.isoformat(),
        "lastUpdatedDisplay": now_str,
        "lastStatus": status,
        "lastFetchCounts": {"league": len(league), "friendly": len(friendly), "playoff": len(playoff)},
        "version": "curl_cffi-實用版",
        "source": f"{status} {len(deduped)}場 ({now_str}) league{len(league)}+friendly{len(friendly)}+playoff{len(playoff)}",
    }
    meta = {
        "totalMatches": len(deduped),
        "lastUpdated": board["lastUpdated"],
        "lastUpdatedDisplay": now_str,
        "lastStatus": status,
        "lastFetchCounts": board["lastFetchCounts"],
        "version": "curl_cffi-實用版",
        "note": f"{status} - 最新{len(deduped)}場 抓取時間 {now_str}",
    }
    BOARD_PATH.write_text(json.dumps(board, ensure_ascii=False, indent=2), encoding="utf-8")
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ {status}: 最新{len(deduped)}場 @ {now_str}, {len(players)}人")


if __name__ == "__main__":
    main()
