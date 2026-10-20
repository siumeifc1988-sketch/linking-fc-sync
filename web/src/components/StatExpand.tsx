import type { BoardPlayer, MatchPlayerRaw } from "../types";
import { decodeEvents, passPct } from "../lib/events";
import { fmtPct, fmtRatio, num } from "../lib/format";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <h4 className="m-0 bg-pl-purple px-2.5 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-white">
        {title}
      </h4>
      <div className="py-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-[#f0ebf5] px-2.5 py-1.5 text-[0.8rem] last:border-0">
      <span className="min-w-0 truncate font-semibold text-muted">{label}</span>
      <span className="tabular shrink-0 text-right font-extrabold text-text">{value}</span>
    </div>
  );
}

/** 外層：在橫向捲動表格內仍貼齊螢幕左側 */
export function ExpandShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky left-0 w-[min(100vw-1.5rem,36rem)] max-w-[100%] px-1 py-1 sm:w-full sm:max-w-none">
      {children}
    </div>
  );
}

/** 累計球員展開 */
export function CumExpand({ p }: { p: BoardPlayer }) {
  const r = Number(p.avgRating).toFixed(2);
  const summary = `評分 ${r} · ${p.games} 場 · ${p.goals}G ${p.assists}A · 傳 ${p.passPct != null ? p.passPct + "%" : "-"}${p.minutes != null ? ` · ${p.minutes}′` : ""}`;
  return (
    <ExpandShell>
      <p className="mb-2 text-[0.82rem] font-bold leading-snug tracking-tight text-pl-purple">{summary}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Group title="進攻">
          <Row label="入球" value={String(p.goals)} />
          <Row label="助攻" value={String(p.assists)} />
          <Row label="G+A" value={String(p.gA)} />
          <Row label="射門" value={String(p.shots ?? "-")} />
          <Row label="射正" value={String(p.shotsOn ?? "-")} />
          <Row label="場均入球" value={String(p.goalsPerGame ?? "-")} />
          <Row label="xG / xA" value={`${p.xg ?? "-"} / ${p.xa ?? "-"}`} />
        </Group>
        <Group title="傳球">
          <Row label="成功率" value={p.passPct != null ? `${p.passPct}%` : "-"} />
          <Row label="成功 / 嘗試" value={`${p.pm ?? "-"} / ${p.pa ?? "-"}`} />
          <Row label="直塞" value={String(p.keyPass ?? "-")} />
          <Row label="向前 / 向後 / 橫" value={`${p.passFwd || 0} / ${p.passBack || 0} / ${p.passSide || 0}`} />
        </Group>
        <Group title="防守">
          <Row label="搶截" value={String(p.tk ?? "-")} />
          <Row label="攔截" value={String(p.interceptions ?? "-")} />
          <Row label="防守合計" value={String(p.totalDef ?? "-")} />
          <Row label="解圍" value={String(p.clearances ?? "-")} />
          <Row label="封堵" value={String(p.blocks ?? "-")} />
          <Row label="頭錘防守" value={String(p.aerialDef ?? "-")} />
        </Group>
        <Group title="活動">
          <Row label="上場場數" value={String(p.games)} />
          <Row label="上場分鐘" value={`${p.minutes ?? "-"}′`} />
          <Row label="盤球" value={String(p.dribbles ?? "-")} />
          <Row label="平均評分" value={r} />
        </Group>
      </div>
    </ExpandShell>
  );
}

/** 單場球員展開 */
export function MatchPlayerExpand({ p }: { p: MatchPlayerRaw }) {
  const ev = decodeEvents(p);
  const pm = num(p.passesmade ?? p.passesMade);
  const pa = num(p.passattempts ?? p.passAttempts);
  const pct = passPct(p);
  const tkM = num(p.tacklesmade ?? p.tacklesMade);
  const tkA = num(p.tackleattempts);
  const tkPct = tkA > 0 ? (tkM / tkA) * 100 : 0;
  const mins = Math.round(num(p.secondsPlayed ?? p.gameTime) / 60);
  const g = num(p.goals);
  const a = num(p.assists);
  const r = num(p.rating).toFixed(2);
  const summary = `評分 ${r} · ${g}G ${a}A · 傳 ${fmtPct(pct)} · 搶截 ${fmtRatio(tkM, tkA)}${mins ? ` · ${mins}′` : ""}`;

  return (
    <ExpandShell>
      <p className="mb-2 text-[0.82rem] font-bold leading-snug text-pl-purple">{summary}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Group title="進攻">
          <Row label="入球" value={String(g)} />
          <Row label="助攻" value={String(a)} />
          <Row label="射門" value={String(num(p.shots))} />
          <Row label="射正 / 射偏" value={`${num(ev[217])} / ${num(ev[218])}`} />
          <Row label="禁區內射正" value={String(num(ev[13]))} />
          <Row label="禁區外射正" value={String(num(ev[18]))} />
        </Group>
        <Group title="傳球">
          <Row label="成功 / 嘗試" value={fmtRatio(pm, pa)} />
          <Row label="成功率" value={fmtPct(pct)} />
          <Row label="向前 / 向後 / 橫" value={`${num(ev[30])} / ${num(ev[32])} / ${num(ev[34])}`} />
          <Row label="直塞成功" value={String(num(ev[152]))} />
          <Row label="傳中成功" value={String(num(ev[36]))} />
        </Group>
        <Group title="防守">
          <Row label="搶截成功 / 嘗試" value={fmtRatio(tkM, tkA)} />
          <Row label="搶截成功率" value={fmtPct(tkPct)} />
          <Row label="攔截" value={String(num(ev[6]))} />
          <Row label="封堵傳中" value={String(num(ev[156]))} />
          <Row label="頭錘勝（攻/防）" value={`${num(ev[265])} / ${num(ev[266])}`} />
        </Group>
        <Group title="活動 / 球權">
          <Row label="上場分鐘" value={`${mins || 0}′`} />
          <Row label="盤球成功" value={String(num(ev[174]))} />
          <Row label="帶球推進" value={String(num(ev[97]))} />
          <Row label="站位好 / 差" value={`${num(ev[111])} / ${num(ev[219])}`} />
          <Row label="奪回（後/中/前）" value={`${num(ev[108])} / ${num(ev[109])} / ${num(ev[110])}`} />
        </Group>
      </div>
    </ExpandShell>
  );
}
