#!/usr/bin/env python3
"""LinKing FC EA Pro Clubs sync — club 41026, platform common-gen5.

Event ID 對照以社群研究為準（非 EA 官方）：
https://github.com/1erkandogan/fc27-clubs-api/blob/main/docs/match-events.md
"""
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

# --- Event IDs (high confidence, research doc) ---
EV_PASS_OK = 215
EV_PASS_FAIL = 216
EV_PASS_FWD = 30
EV_PASS_BACK = 32
EV_PASS_SIDE = 34
EV_PASS_SHORT = 24
EV_PASS_MED = 26
EV_PASS_LONG = 28
EV_PASS_CROSS = 36
EV_THROUGH = 152
EV_OFFSIDE_PASS = 153
EV_SHOT_ON = 217
EV_SHOT_OFF = 218
EV_SHOT_ON_IN = 13
EV_SHOT_ON_OUT = 18
EV_SHOT_OFF_IN = 14
EV_SHOT_OFF_OUT = 19
EV_GOAL = 214
EV_ASSIST = 11
EV_DRIBBLE_OK = 174
EV_TACKLE_WON = 0
EV_TACKLE_LOST = 1
EV_INTERCEPT = 6
EV_CROSS_BLOCK = 156
EV_AERIAL_ATK = 265
EV_AERIAL_DEF = 266


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


def decode_events(p: dict) -> dict:
    """Parse match_event_aggregate_0..3 → {event_id: count}."""
    out = {}
    for i in range(4):
        s = p.get(f"match_event_aggregate_{i}") or ""
        if not s:
            continue
        for part in str(s).split(","):
            kv = part.split(":")
            if len(kv) != 2:
                continue
            try:
                out[int(kv[0])] = float(kv[1])
            except Exception:
                pass
    return out


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
    """Per-match player row. EA named fields win for totals; events for breakdown."""
    e = decode_events(p)

    goals = int(safe(p.get("goals", 0)))
    assists = int(safe(p.get("assists", 0)))
    rating = safe(p.get("rating", 0))

    pm_ea = safe(p.get("passesmade") or p.get("passesMade") or 0)
    pa_ea = safe(p.get("passattempts") or p.get("passAttempts") or 0)
    pm_ev = e.get(EV_PASS_OK, 0)
    pf_ev = e.get(EV_PASS_FAIL, 0)
    pm = int(pm_ea or pm_ev)
    pa = int(pa_ea or (pm_ev + pf_ev) or pm)

    through = int(e.get(EV_THROUGH, 0))

    shots_ea = safe(p.get("shots") or 0)
    shot_on = e.get(EV_SHOT_ON, 0)
    shot_off = e.get(EV_SHOT_OFF, 0)
    shots = shots_ea or (shot_on + shot_off)
    on_in = e.get(EV_SHOT_ON_IN, 0)
    on_out = e.get(EV_SHOT_ON_OUT, 0)
    off_in = e.get(EV_SHOT_OFF_IN, 0)
    off_out = e.get(EV_SHOT_OFF_OUT, 0)
    if on_in or on_out or off_in or off_out:
        xg = on_in * 0.35 + on_out * 0.12 + off_in * 0.10 + off_out * 0.04
    elif shots:
        xg = shot_on * 0.32 + max(0.0, shots - shot_on) * 0.06
    else:
        xg = 0.0
    xa = assists * 0.15 + e.get(118, 0) * 0.10

    interceptions = int(e.get(EV_INTERCEPT, 0))
    tackles_won = int(e.get(EV_TACKLE_WON, 0) or safe(p.get("tacklesmade") or p.get("tacklesMade") or 0))
    tackles_lost = int(e.get(EV_TACKLE_LOST, 0))
    clearances = 0
    blocks = int(e.get(EV_CROSS_BLOCK, 0))
    aerial_def = int(e.get(EV_AERIAL_DEF, 0))
    dribbles = int(e.get(EV_DRIBBLE_OK, 0))

    return {
        "name": p.get("playername") or p.get("name") or "Unknown",
        "posCN": pos_cn(p.get("pos") or p.get("position") or ""),
        "rating": rating,
        "goals": goals,
        "assists": assists,
        "xg": round(max(0.0, xg), 2),
        "xa": round(max(0.0, xa), 2),
        "pm": pm,
        "pa": pa,
        "keyPass": through,
        "interceptions": interceptions,
        "clearances": clearances,
        "blocks": blocks,
        "tk": tackles_won,
        "tacklesLost": tackles_lost,
        "dribbles": dribbles,
        "aerialDef": aerial_def,
        "shots": int(shots),
        "shotsOn": int(shot_on),
        "passFwd": int(e.get(EV_PASS_FWD, 0)),
        "passBack": int(e.get(EV_PASS_BACK, 0)),
        "passSide": int(e.get(EV_PASS_SIDE, 0)),
        "games": 1,
        "ratingSum": rating,
        "ratingCnt": 1 if rating else 0,
    }


def fingerprint(m: dict) -> str:
    ts = int((m.get("timestamp", 0) or 0) // 60 * 60)
    clubs = m.get("clubs", {})
    my = clubs.get(CLUB_ID) or next(iter(clubs.values()), {})
    other = next((k for k in clubs.keys() if k != CLUB_ID), "")
    return f"{ts}_{other}_{my.get('goals', 0)}-{my.get('goalsAgainst', 0)}"


def build_board(deduped: list, status: str, now_hk: datetime.datetime, fetch_counts: dict):
    agg = {}
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
                    "xg": 0.0, "xa": 0.0, "goals": 0, "assists": 0,
                    "pm": 0, "pa": 0, "keyPass": 0, "interceptions": 0,
                    "clearances": 0, "blocks": 0, "tk": 0, "tacklesLost": 0,
                    "dribbles": 0, "aerialDef": 0, "shots": 0, "shotsOn": 0,
                    "passFwd": 0, "passBack": 0, "passSide": 0,
                    "games": 0, "ratingSum": 0.0, "ratingCnt": 0,
                    "posCN": pp["posCN"],
                }
            o = agg[name]
            for k in (
                "xg", "xa", "goals", "assists", "pm", "pa", "keyPass",
                "interceptions", "clearances", "blocks", "tk", "tacklesLost",
                "dribbles", "aerialDef", "shots", "shotsOn",
                "passFwd", "passBack", "passSide",
            ):
                o[k] += pp[k]
            o["games"] += 1
            o["ratingSum"] += pp["ratingSum"]
            o["ratingCnt"] += pp["ratingCnt"]
            if pp["posCN"] and pp["posCN"] != "未知":
                o["posCN"] = pp["posCN"]

    players = []
    for name, a in agg.items():
        avg = a["ratingSum"] / a["ratingCnt"] if a["ratingCnt"] else 0.0
        total_def = a["interceptions"] + a["tk"] + a["blocks"] + a["aerialDef"]
        players.append({
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
            "tacklesLost": a["tacklesLost"],
            "dribbles": a["dribbles"],
            "aerialDef": a["aerialDef"],
            "shots": a["shots"],
            "shotsOn": a["shotsOn"],
            "passFwd": a["passFwd"],
            "passBack": a["passBack"],
            "passSide": a["passSide"],
            "totalDef": total_def,
            "avgRating": round(avg, 2),
        })
    players.sort(key=lambda x: (x["goals"] + x["assists"]), reverse=True)

    now_str = now_hk.strftime("%Y-%m-%d %H:%M HKT")
    board = {
        "players": players,
        "totalMatches": len(deduped),
        "lastUpdated": now_hk.isoformat(),
        "lastUpdatedDisplay": now_str,
        "lastStatus": status,
        "lastFetchCounts": fetch_counts,
        "version": "curl_cffi-event-research",
        "eventMap": "1erkandogan/fc27-clubs-api match-events.md",
        "source": f"{status} {len(deduped)}場 ({now_str}) league{fetch_counts.get('league', 0)}+friendly{fetch_counts.get('friendly', 0)}+playoff{fetch_counts.get('playoff', 0)}",
    }
    meta = {
        "totalMatches": len(deduped),
        "lastUpdated": board["lastUpdated"],
        "lastUpdatedDisplay": now_str,
        "lastStatus": status,
        "lastFetchCounts": fetch_counts,
        "version": "curl_cffi-event-research",
        "note": f"{status} - 最新{len(deduped)}場 抓取時間 {now_str}；event 對照依研究文件",
    }
    return board, meta


def write_board(board: dict, meta: dict) -> None:
    BOARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    BOARD_PATH.write_text(json.dumps(board, ensure_ascii=False, indent=2), encoding="utf-8")
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    league = fetch("leagueMatch", 10)
    friendly = fetch("friendlyMatch", 10)
    playoff = fetch("playoffMatch", 10)
    all_latest = league + friendly + playoff
    fetch_counts = {"league": len(league), "friendly": len(friendly), "playoff": len(playoff)}

    now_hk = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
    existing = load_existing()

    if not all_latest:
        print(f"⚠ 今次 EA 0場 (Runner 被封)，保留舊檔 {len(existing)}場 @ {now_hk.strftime('%Y-%m-%d %H:%M HKT')}")
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

    if all_latest:
        MATCHES_PATH.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")

    board, meta = build_board(deduped, status, now_hk, fetch_counts)
    write_board(board, meta)
    print(f"✅ {status}: 最新{len(deduped)}場, {len(board['players'])}人 (event 研究文件對照)")


if __name__ == "__main__":
    main()
