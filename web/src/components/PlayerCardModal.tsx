import type { ReactNode } from "react";
import type { BoardPlayer } from "../types";
import { initials, seasonHighlight } from "../lib/cardStats";

function num(v: number | undefined | null): number | null {
  if (v == null || !Number.isFinite(Number(v))) return null;
  return Number(v);
}

function fmt(v: number | undefined | null, digits = 0): string {
  const x = num(v);
  if (x == null) return "-";
  return digits > 0 ? x.toFixed(digits) : String(Math.round(x));
}

function perGame(total: number | undefined | null, games: number, digits = 2): string {
  const x = num(total);
  if (x == null || !games) return "-";
  return (x / games).toFixed(digits);
}

function pair(a: number | undefined, b: number | undefined, digits = 2): string {
  if (a == null && b == null) return "-";
  return `${fmt(a, digits)} / ${fmt(b, digits)}`;
}

function ProfileCard({ p }: { p: BoardPlayer }) {
  const rating = num(p.avgRating);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#37003c] p-4 text-white shadow-xl shadow-purple-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[0.16em] text-white/60">平均評分</div>
          <div className="tabular text-[44px] font-black leading-none tracking-tight">
            {rating != null ? rating.toFixed(2) : "-"}
          </div>
          <div className="mt-1 text-[12px] font-extrabold tracking-wide text-white/80">{p.posCN || "球員"}</div>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-[22px] font-black ring-1 ring-white/25">
          {initials(p.name)}
        </div>
      </div>
      <div className="mt-3 truncate text-[18px] font-black tracking-wide" title={p.name}>
        {p.name}
      </div>
      <div className="text-[11px] font-semibold text-white/55">
        {p.games} 場{p.minutes != null ? ` · ${p.minutes}′` : ""}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
        <Mini k="入球" v={fmt(p.goals)} />
        <Mini k="助攻" v={fmt(p.assists)} />
        <Mini k="傳球%" v={p.passPct != null ? `${fmt(p.passPct)}%` : "-"} />
      </div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wide text-white/50">{k}</div>
      <div className="tabular text-[18px] font-black leading-tight">{v}</div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2.5 text-center sm:px-3 sm:py-3 ${
        accent ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className={`text-[10px] font-bold tracking-wide ${accent ? "text-emerald-300/80" : "text-white/40"}`}>
        {label}
      </div>
      <div className={`mt-1 tabular text-[20px] font-black leading-none sm:text-[22px] ${accent ? "text-emerald-300" : ""}`}>
        {value}
      </div>
      <div className={`mt-1 min-h-[14px] text-[10px] ${accent ? "text-emerald-300/70" : "text-white/45"}`}>
        {sub || "\u00a0"}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] font-bold tracking-[0.14em] text-white/40">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 text-[12px] last:border-0">
      <span className="min-w-0 text-white/50">{label}</span>
      <span className="tabular shrink-0 text-right font-bold">{value}</span>
    </div>
  );
}

function shotLine(p: BoardPlayer): string {
  if (p.shots == null && p.shotsOn == null) return "-";
  const shots = p.shots ?? 0;
  const on = p.shotsOn ?? 0;
  const pct = shots > 0 ? ` · ${Math.round((on / shots) * 100)}%` : "";
  return `${on} / ${shots}${pct}`;
}

function tackleLine(p: BoardPlayer): string {
  if (p.tk == null && p.tacklesLost == null) return "-";
  const made = p.tk ?? 0;
  if (p.tacklesLost == null) return String(made);
  const attempts = made + p.tacklesLost;
  const pct = attempts > 0 ? ` · ${Math.round((made / attempts) * 100)}%` : "";
  return `${made} / ${attempts}${pct}`;
}

export function PlayerCardModal({ player, onClose }: { player: BoardPlayer; onClose: () => void }) {
  const games = player.games || 0;
  const rating = num(player.avgRating);
  const gpg = player.goalsPerGame ?? (games ? player.goals / games : null);
  const apg = player.assistsPerGame ?? (games ? player.assists / games : null);
  const minPg = games && player.minutes != null ? player.minutes / games : null;
  const tkPct =
    player.tk != null && player.tacklesLost != null && player.tk + player.tacklesLost > 0
      ? `${Math.round((player.tk / (player.tk + player.tacklesLost)) * 100)}%`
      : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} Pro Clubs 累計`}
        className="relative flex max-h-[92dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-white px-2 text-[13px] font-black tabular text-ink">
              {rating != null ? rating.toFixed(2) : "-"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 truncate text-[16px] font-extrabold">{player.name}</h3>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{player.posCN || "球員"}</span>
              </div>
              <p className="m-0 text-[11px] text-white/50">
                Pro Clubs 累計 · {player.games} 場
                {player.minutes != null ? ` · ${player.minutes}′` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)]">
            <ProfileCard p={player} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="G+A" value={fmt(player.gA)} sub={`${player.games} 場`} accent />
              <Tile label="場均入球" value={fmt(gpg, 2)} sub={`入球 ${fmt(player.goals)}`} />
              <Tile label="場均助攻" value={fmt(apg, 2)} sub={`助攻 ${fmt(player.assists)}`} />
              <Tile
                label="直塞"
                value={fmt(player.keyPass)}
                sub={games && player.keyPass != null ? `${perGame(player.keyPass, games)}/場` : undefined}
              />
              <Tile label="射門" value={fmt(player.shots)} sub={player.shotsOn != null ? `射正 ${player.shotsOn}` : undefined} />
              <Tile label="搶截" value={fmt(player.tk)} sub={tkPct ? `成功率 ${tkPct}` : undefined} />
              <Tile
                label="攔截"
                value={fmt(player.interceptions)}
                sub={player.totalDef != null ? `防守 ${player.totalDef}` : undefined}
              />
              <Tile
                label="場均分鐘"
                value={minPg != null ? minPg.toFixed(1) : "-"}
                sub={player.minutes != null ? `共 ${player.minutes}′` : undefined}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Group title="進攻">
              <Line label="入球" value={fmt(player.goals)} />
              <Line label="助攻" value={fmt(player.assists)} />
              <Line label="G+A" value={fmt(player.gA)} />
              <Line label="場均入球 / 助攻" value={`${fmt(gpg, 2)} / ${fmt(apg, 2)}`} />
              <Line label="射正 / 射門" value={shotLine(player)} />
              <Line label="xG / xA" value={pair(player.xg, player.xa)} />
            </Group>
            <Group title="傳球">
              <Line label="成功率" value={player.passPct != null ? `${fmt(player.passPct)}%` : "-"} />
              <Line label="成功 / 嘗試" value={pair(player.pm, player.pa, 0)} />
              <Line label="直塞" value={fmt(player.keyPass)} />
              <Line label="場均直塞" value={perGame(player.keyPass, games)} />
              <Line
                label="向前 / 向後 / 橫"
                value={
                  player.passFwd == null && player.passBack == null && player.passSide == null
                    ? "-"
                    : `${player.passFwd ?? 0} / ${player.passBack ?? 0} / ${player.passSide ?? 0}`
                }
              />
            </Group>
            <Group title="防守">
              <Line label="搶截成功 / 嘗試" value={tackleLine(player)} />
              <Line label="攔截" value={fmt(player.interceptions)} />
              <Line label="防守合計" value={fmt(player.totalDef)} />
              <Line label="解圍" value={fmt(player.clearances)} />
              <Line label="封堵" value={fmt(player.blocks)} />
              <Line label="頭錘防守" value={fmt(player.aerialDef)} />
            </Group>
            <Group title="上場">
              <Line label="上場場數" value={fmt(player.games)} />
              <Line label="上場分鐘" value={player.minutes != null ? `${player.minutes}′` : "-"} />
              <Line label="場均分鐘" value={minPg != null ? `${minPg.toFixed(1)}′` : "-"} />
              <Line label="盤球" value={fmt(player.dribbles)} />
              <Line label="場均盤球" value={perGame(player.dribbles, games)} />
              <Line label="平均評分" value={rating != null ? rating.toFixed(2) : "-"} />
            </Group>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[12px] leading-relaxed text-white/80">
            <span className="font-bold text-white">數據重點 · </span>
            {seasonHighlight(player)}
          </div>

          <p className="mt-2 text-center text-[10px] leading-relaxed text-white/35">
            數字來自 Pro Clubs 同步累計，不是遊戲能力值。
          </p>
        </div>

        <div
          className="flex gap-2 border-t border-white/10 bg-[#0c0e13] px-4 py-3 sm:px-5"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-full bg-white text-[14px] font-extrabold text-ink"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
