"""
scripts/bigdata.py - 即時查詢 (唔入data)
fc27-clubs-api = 大數據 DataFrame 模式
只出 data/summary.json (統計)，唔存 raw，唔會令 repo 爆

用途:
- Discord bot: !stats !compare
- 網站 search 對手
- Top scorer / assist / 最佳傳球 / 最佳防守

安裝: pip install fc-clubs-api pandas
"""
import json, time
from pathlib import Path

Path("data").mkdir(exist_ok=True)

summary = {
    "updated": int(time.time()),
    "clubId": "41026",
    "clubName": "LinKing FC",
    "source": "fc27-clubs-api (big data, 不入raw)",
    "mode": "bigdata - 即查即用"
}

try:
    from fc_clubs_api import FC27API
    api = FC27API()
    print("fc27-clubs-api 已連接")

    # 1. Club Info
    try:
        info = api.get_club_info(41026)
        summary["clubInfo"] = info if isinstance(info, dict) else str(info)[:2000]
        print("Club info OK")
    except Exception as e:
        print(f"clubInfo失敗: {e}")
        summary["clubInfoError"] = str(e)

    # 2. Matches as DataFrame (大數據)
    try:
        df_matches = api.get_club_matches(41026)
        if df_matches is not None:
            # 轉做統計，唔存raw
            summary["matches"] = {
                "total": len(df_matches),
                "columns": list(df_matches.columns)[:20],
                "latest5": df_matches.head(5).to_dict(orient="records") if hasattr(df_matches, 'head') else []
            }
            print(f"Matches DF: {len(df_matches)}")
    except Exception as e:
        print(f"matches DF失敗: {e}")

    # 3. Members stats as DataFrame
    try:
        df_members = api.get_members_stats(41026)
        if df_members is not None and hasattr(df_members, 'to_dict'):
            # 只存 Top 10 統計
            top = df_members.sort_values("goals", ascending=False).head(10) if "goals" in df_members.columns else df_members.head(10)
            summary["topScorers"] = top.to_dict(orient="records")
            print(f"Members DF: {len(df_members)}")
    except Exception as e:
        print(f"members DF失敗: {e}")

    # 4. 對手比較範例 (唔入data，即查)
    summary["compareExample"] = {
        "how": "api.search_club('對手名') -> get_club_matches() -> 對比 W/D/L, GF/GA",
        "code": "club_id = api.find_club_id('Eternal Blue FC'); df = api.get_club_matches(club_id)"
    }

except ImportError:
    summary["error"] = "未安裝 fc-clubs-api，pip install fc-clubs-api"
    print("未安裝 fc-clubs-api，跳過")
except Exception as e:
    summary["error"] = str(e)
    print(f"bigdata錯誤: {e}")

# 只存統計，唔存raw，repo唔會大
Path("data/summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print("已出 data/summary.json (只統計，唔入raw)")
