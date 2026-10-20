export type FormCode = "W" | "D" | "L";

export interface BoardPlayer {
  name: string;
  posCN?: string;
  games: number;
  goals: number;
  assists: number;
  gA: number;
  xg?: number;
  xa?: number;
  pm?: number;
  pa?: number;
  passPct?: number;
  keyPass?: number;
  interceptions?: number;
  clearances?: number;
  blocks?: number;
  tk?: number;
  tacklesLost?: number;
  dribbles?: number;
  aerialDef?: number;
  shots?: number;
  shotsOn?: number;
  passFwd?: number;
  passBack?: number;
  passSide?: number;
  seconds?: number;
  minutes?: number;
  totalDef?: number;
  avgRating: number;
  goalsPerGame?: number;
  assistsPerGame?: number;
}

export interface ClubRecord {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  form: FormCode[];
}

export interface Board {
  label: string;
  players: BoardPlayer[];
  record: ClubRecord;
  totalMatches: number;
  lastUpdatedDisplay?: string;
  source?: string;
}

export interface MatchClub {
  goals?: string | number;
  goalsAgainst?: string | number;
  winnerByDnf?: string | number;
  details?: { name?: string };
}

export interface MatchPlayerRaw {
  playername?: string;
  name?: string;
  pos?: string;
  rating?: string | number;
  goals?: string | number;
  assists?: string | number;
  shots?: string | number;
  passesmade?: string | number;
  passesMade?: string | number;
  passattempts?: string | number;
  passAttempts?: string | number;
  tacklesmade?: string | number;
  tacklesMade?: string | number;
  tackleattempts?: string | number;
  secondsPlayed?: string | number;
  gameTime?: string | number;
  mom?: string | number;
  match_event_aggregate_0?: string;
  match_event_aggregate_1?: string;
  match_event_aggregate_2?: string;
  match_event_aggregate_3?: string;
  [key: string]: unknown;
}

export interface RawMatch {
  matchId?: string | number;
  timestamp?: number;
  clubs?: Record<string, MatchClub>;
  players?: Record<string, Record<string, MatchPlayerRaw> | MatchPlayerRaw[]>;
  _matchType?: string;
}

export interface ShapedMatch {
  id: string;
  type: string;
  when: string;
  ts: number;
  us: number;
  them: number;
  opp: string;
  outcome: string;
  code: FormCode;
  dnf: boolean;
  raw: RawMatch;
}
