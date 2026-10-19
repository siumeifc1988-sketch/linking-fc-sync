#!/usr/bin/env python3
"""LinKing FC EA Pro Clubs sync — club 41026.

- 每日抓取後合併進歷史 matches.json（不再只留約 20 場視窗）
- 產出全部累計榜 + 近 10 場榜
- Event 對照：https://github.com/1erkandogan/fc27-clubs-api/blob/main/docs/match-events.md
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
BOARD_L10_PATH = ROOT / "data" / "aggregated" / "board_last10.json"
META_PATH = ROOT / "data" / "meta.json"
MAX_STORED_MATCHES = 300

EV_PASS_OK = 215
EV_PASS_FAIL = 216
EV_PASS_FWD = 30
EV_PASS_BACK = 32
EV_PASS_SIDE = 34
EV_THROUGH = 152
EV_SHOT_ON = 217
EV_SHOT_OFF = 218
EV_SHOT_ON_IN = 13
EV_SHOT_ON_OUT = 18
EV_SHOT_OFF_IN = 14
EV_SHOT_OFF_OUT = 19
EV_DRIBBLE_OK = 174
EV_TACKLE_WON = 0
EV_TACKLE_LOST = 1
EV_INTERCEPT = 6
EV_CROSS_BLOCK = 156
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
            r = s.get(url, timeout=20, headers={
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8",
                "Origin": "https://www.ea.com",
                "Referer": "https://www.ea.com/",
            })
            print(f"[{imp}] {match_type} -> {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                lst = data if isinstance(data, list) else data.get(CLUB_ID) or data.get(int(CLUB_ID)) or data.get("matches") or next((v for v in data.values() if isinstance(v, list)), [])
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
            lst = data if isinstance(data, list) else data.get(CLUB_ID) or data.get(int(CLUB_ID)) or data.get("matches") or next((v for v in data.values() if isinstance(v, list)), [])
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


def fingerprint(m: dict) -> str:
    mid = m.get("matchId")
    if mid is not None and str(mid) not in ("", "0"):
        return f"id:{mid}"
    ts = int((m.get("timestamp", 0) or 0) // 60 * 60)
    clubs = m.get("clubs", {})
    my = clubs.get(CLUB_ID) or next(iter(clubs.values()), {})
    other = next((k for k in clubs.keys() if k != CLUB_ID), "")
    return f"fp:{ts}_{other}_{my.get('goals', 0)}-{my.get('goalsAgainst', 0)}"


def merge_matches(existing: list, incoming: list):
    by = {}
    for m in existing:
        by[fingerprint(m)] = m
    new_count = 0
    for m in incoming:
        fp = fingerprint(m)
        if fp not in by:
            new_count += 1
            by[fp] = m
        else:
            old = by[fp]
            if (m.get("timestamp") or 0) >= (old.get("timestamp") or 0):
                by[fp] = m
    merged = sorted(by.values(), key=lambda x: x.get("timestamp", 0) or 0, reverse=True)
    if len(merged) > MAX_STORED_MATCHES:
        merged = merged[:MAX_STORED_MATCHES]
    return merged, new_count


def parse_player(p: dict) -> dict:
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
    blocks = int(e.get(EV_CROSS_BLOCK, 0))
    aerial_def = int(e.get(EV_AERIAL_DEF, 0))
    dribbles = int(e.get(EV_DRIBBLE_OK, 0))
    return {
        "name": p.get("playername") or p.get("name") or "Unknown",
        "posCN": pos_cn(p.get("pos") or p.get("position") or ""),
        "rating": rating, "goals": goals, "assists": assists,
        "xg": round(max(0.0, xg), 2), "xa": round(max(0.0, xa), 2),
        "pm": pm, "pa": pa, "keyPass": through, "interceptions": interceptions,
        "clearances": 0, "blocks": blocks, "tk": tackles_won, "tacklesLost": tackles_lost,
        "dribbles": dribbles, "aerialDef": aerial_def, "shots": int(shots), "shotsOn": int(shot_on),
        "passFwd": int(e.get(EV_PASS_FWD, 0)), "passBack": int(e.get(EV_PASS_BACK, 0)),
        "passSide": int(e.get(EV_PASS_SIDE, 0)),
        "seconds": int(safe(p.get("secondsPlayed") or p.get("gameTime") or 0)),
        "games": 1, "ratingSum": rating, "ratingCnt": 1 if rating else 0,
    }


def match_outcome(m: dict) -> str:
    us = (m.get("clubs") or {}).get(CLUB_ID) or {}
    gf = int(safe(us.get("goals", 0)))
    ga = int(safe(us.get("goalsAgainst", 0)))
    if gf > ga:
        return "W"
    if gf < ga:
        return "L"
    return "D"


def build_players(matches: list) -> list:
    agg = {}
    keys = ("xg", "xa", "goals", "assists", "pm", "pa", "keyPass", "interceptions", "clearances", "blocks", "tk", "tacklesLost", "dribbles", "aerialDef", "shots", "shotsOn", "passFwd", "passBack", "passSide", "seconds")
    for d in matches:
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
                agg[name] = {k: 0 for k in keys}
                agg[name].update({"games": 0, "ratingSum": 0.0, "ratingCnt": 0, "posCN": pp["posCN"]})
            o = agg[name]
            for k in keys:
                o[k] += pp[k]
            o["games"] += 1
            o["ratingSum"] += pp["ratingSum"]
            o["ratingCnt"] += pp["ratingCnt"]
            if pp["posCN"] and pp["posCN"] != "未知":
                o["posCN"] = pp["posCN"]
    out = []
    for name, a in agg.items():
        avg = a["ratingSum"] / a["ratingCnt"] if a["ratingCnt"] else 0.0
        g = a["games"] or 1
        out.append({
            "name": name, "posCN": a["posCN"], "games": a["games"],
            "goals": a["goals"], "assists": a["assists"], "gA": a["goals"] + a["assists"],
            "xg": round(a["xg"], 2), "xa": round(a["xa"], 2),
            "pm": a["pm"], "pa": a["pa"], "passPct": round(a["pm"] / a["pa"] * 100) if a["pa"] else 0,
            "keyPass": a["keyPass"], "interceptions": a["interceptions"], "clearances": a["clearances"],
            "blocks": a["blocks"], "tk": a["tk"], "tacklesLost": a["tacklesLost"],
            "dribbles": a["dribbles"], "aerialDef": a["aerialDef"], "shots": a["shots"], "shotsOn": a["shotsOn"],
            "passFwd": a["passFwd"], "passBack": a["passBack"], "passSide": a["passSide"],
            "seconds": a["seconds"], "minutes": round(a["seconds"] / 60) if a["seconds"] else 0,
            "totalDef": a["interceptions"] + a["tk"] + a["blocks"] + a["aerialDef"],
            "avgRating": round(avg, 2),
            "goalsPerGame": round(a["goals"] / g, 2), "assistsPerGame": round(a["assists"] / g, 2),
        })
    out.sort(key=lambda x: (x["gA"], x["goals"], x["avgRating"]), reverse=True)
    return out


def club_record(matches: list) -> dict:
    w = d = l = gf = ga = 0
    form = []
    for m in matches:
        us = (m.get("clubs") or {}).get(CLUB_ID) or {}
        g1 = int(safe(us.get("goals", 0)))
        g2 = int(safe(us.get("goalsAgainst", 0)))
        gf += g1; ga += g2
        o = match_outcome(m)
        form.append(o)
        if o == "W": w += 1
        elif o == "D": d += 1
        else: l += 1
    return {"played": len(matches), "wins": w, "draws": d, "losses": l, "goalsFor": gf, "goalsAgainst": ga, "goalDiff": gf - ga, "form": form[:10]}


def build_board_payload(matches: list, status: str, now_hk: datetime.datetime, fetch_counts: dict, label: str) -> dict:
    players = build_players(matches)
    rec = club_record(matches)
    now_str = now_hk.strftime("%Y-%m-%d %H:%M HKT")
    return {
        "label": label, "players": players, "record": rec, "totalMatches": len(matches),
        "lastUpdated": now_hk.isoformat(), "lastUpdatedDisplay": now_str, "lastStatus": status,
        "lastFetchCounts": fetch_counts, "version": "curl_cffi-accumulate",
        "eventMap": "1erkandogan/fc27-clubs-api match-events.md",
        "source": f"{status} {label} {len(matches)}場 ({now_str})",
    }


def main() -> None:
    league = fetch("leagueMatch", 10)
    friendly = fetch("friendlyMatch", 10)
    playoff = fetch("playoffMatch", 10)
    incoming = league + friendly + playoff
    fetch_counts = {"league": len(league), "friendly": len(friendly), "playoff": len(playoff)}
    now_hk = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
    existing = load_existing()
    if not incoming:
        print(f"⚠ 今次 EA 0場，保留歷史 {len(existing)}場")
        merged = existing
        status = "保留舊檔"
        new_count = 0
    else:
        merged, new_count = merge_matches(existing, incoming)
        status = "已更新"
        print(f"合併：既有 {len(existing)} + 新進 {len(incoming)} → 去重後 {len(merged)}（新增 {new_count}）")
    MATCHES_PATH.parent.mkdir(parents=True, exist_ok=True)
    MATCHES_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    last10 = merged[:10]
    board_all = build_board_payload(merged, status, now_hk, fetch_counts, "全部累計")
    board_l10 = build_board_payload(last10, status, now_hk, fetch_counts, "近10場")
    BOARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    BOARD_PATH.write_text(json.dumps(board_all, ensure_ascii=False, indent=2), encoding="utf-8")
    BOARD_L10_PATH.write_text(json.dumps(board_l10, ensure_ascii=False, indent=2), encoding="utf-8")
    meta = {
        "totalMatches": len(merged), "last10Matches": len(last10), "newMatchesThisRun": new_count,
        "lastUpdated": board_all["lastUpdated"], "lastUpdatedDisplay": board_all["lastUpdatedDisplay"],
        "lastStatus": status, "lastFetchCounts": fetch_counts, "version": "curl_cffi-accumulate",
        "note": f"{status} · 歷史 {len(merged)} 場 · 近10 · 本輪新增 {new_count}",
        "recordAll": board_all["record"], "recordLast10": board_l10["record"],
    }
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ {status}: 歷史{len(merged)}場, 近10={len(last10)}, 球員{len(board_all['players'])}人")


if __name__ == "__main__":
    main()
