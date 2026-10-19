const CLUB = "41026";
const TYPE = { leagueMatch: "聯賽", playoffMatch: "季後賽", friendlyMatch: "友誼賽" };
const POS = { forward: "前鋒", midfielder: "中場", defender: "後衛", goalkeeper: "門將" };
const EV = {
  215:"成功傳球",216:"失敗傳球",30:"向前傳",32:"向後傳",34:"橫傳",24:"短傳",26:"中傳",28:"長傳",36:"傳中成功",
  152:"直塞成功",153:"傳球越位",143:"一腳出球",217:"射正",218:"射偏",13:"禁區內射正",14:"禁區內射偏",
  18:"禁區外射正",19:"禁區外射偏",214:"入球(事件)",11:"助攻(事件)",174:"盤球成功",97:"帶球推進",
  0:"搶截成功",1:"搶截失敗",6:"攔截",156:"封堵傳中",265:"進攻頭錘勝",266:"防守頭錘勝",
  111:"站位好",219:"站位差",105:"後場失球權",106:"中場失球權",107:"前場失球權",108:"後場奪回",109:"中場奪回",110:"前場奪回"
};

let boardAll = null, boardL10 = null, matches = [], tab = "overview";
let sortAll = "gA", selectedMatch = null;

function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function esc(s){ return String(s).replace(/&/g,"&"+"amp;").replace(/</g,"&"+"lt;").replace(/>/g,"&"+"gt;").replace(/"/g,"&"+"quot;"); }
function whenHK(ts){
  if(!ts) return "-";
  return new Intl.DateTimeFormat("zh-HK",{timeZone:"Asia/Hong_Kong",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(ts*1000));
}
function decodeEvents(p){
  const out={};
  for(let i=0;i<4;i++){
    const s=p["match_event_aggregate_"+i]||"";
    if(!s) continue;
    String(s).split(",").forEach(function(part){
      const kv=part.split(":"); if(kv.length!==2) return;
      const id=parseInt(kv[0],10), c=parseFloat(kv[1]);
      if(!isNaN(id)&&!isNaN(c)) out[id]=c;
    });
  }
  return out;
}
function shapeMatches(raw){
  return (raw||[]).map(function(m){
    const clubs=m.clubs||{}, us=clubs[CLUB]; if(!us) return null;
    const oppId=Object.keys(clubs).find(function(id){return id!==CLUB;});
    const opp=oppId?clubs[oppId]:null;
    const gf=num(us.goals), ga=num(us.goalsAgainst);
    const outcome=gf>ga?"勝":gf<ga?"負":"和";
    const code=gf>ga?"W":gf<ga?"L":"D";
    return {
      id:String(m.matchId||m.timestamp), type:TYPE[m._matchType]||"比賽",
      when:whenHK(num(m.timestamp)), ts:num(m.timestamp), us:gf, them:ga,
      opp:(opp&&opp.details&&opp.details.name)||"對手", outcome:outcome, code:code,
      dnf:num(us.winnerByDnf)>0||(opp&&num(opp.winnerByDnf)>0), raw:m
    };
  }).filter(Boolean).sort(function(a,b){return b.ts-a.ts;});
}
function sortPlayers(list, mode){
  const rows=(list||[]).slice();
  const by = {
    games: function(a,b){return b.games-a.games||b.avgRating-a.avgRating;},
    goals: function(a,b){return b.goals-a.goals||b.assists-a.assists;},
    assists: function(a,b){return b.assists-a.assists||b.goals-a.goals;},
    gA: function(a,b){return (b.gA||(b.goals+b.assists))-(a.gA||(a.goals+a.assists))||b.goals-a.goals;},
    shots: function(a,b){return (b.shots||0)-(a.shots||0);},
    shotsOn: function(a,b){return (b.shotsOn||0)-(a.shotsOn||0);},
    pass: function(a,b){return (b.passPct||0)-(a.passPct||0)||(b.keyPass||0)-(a.keyPass||0);},
    keyPass: function(a,b){return (b.keyPass||0)-(a.keyPass||0);},
    interceptions: function(a,b){return (b.interceptions||0)-(a.interceptions||0);},
    tk: function(a,b){return (b.tk||0)-(a.tk||0);},
    defense: function(a,b){return (b.totalDef||0)-(a.totalDef||0)||b.avgRating-a.avgRating;},
    dribbles: function(a,b){return (b.dribbles||0)-(a.dribbles||0);},
    rating: function(a,b){return b.avgRating-a.avgRating||b.games-a.games;},
    minutes: function(a,b){return (b.minutes||0)-(a.minutes||0);},
    attack: function(a,b){return (b.gA||(b.goals+b.assists))-(a.gA||(a.goals+a.assists))||b.goals-a.goals;}
  };
  const fn = by[mode] || by.gA;
  rows.sort(fn);
  return rows;
}
function metric(p, mode){
  if(mode==="defense") return p.totalDef;
  if(mode==="rating") return Number(p.avgRating).toFixed(2);
  if(mode==="pass") return p.passPct+"%";
  return (p.gA!=null?p.gA:(p.goals+p.assists));
}
function avatar(name){ return esc(String(name||"?").slice(0,2).toUpperCase()); }

function renderRecord(el, rec){
  if(!rec){ el.innerHTML=""; return; }
  const gd = rec.goalDiff;
  const gdCls = gd>0?"gd-pos":gd<0?"gd-neg":"";
  const gdTxt = gd>0?"+"+gd:String(gd);
  el.innerHTML =
    '<div class="record-item"><span class="l">比賽</span><span class="v">'+rec.played+'</span></div>'+
    '<div class="record-item"><span class="l">勝</span><span class="v w">'+rec.wins+'</span></div>'+
    '<div class="record-item"><span class="l">和</span><span class="v">'+rec.draws+'</span></div>'+
    '<div class="record-item"><span class="l">負</span><span class="v l">'+rec.losses+'</span></div>'+
    '<div class="record-item"><span class="l">入球</span><span class="v">'+rec.goalsFor+'</span></div>'+
    '<div class="record-item"><span class="l">失球</span><span class="v">'+rec.goalsAgainst+'</span></div>'+
    '<div class="record-item"><span class="l">淨勝</span><span class="v '+gdCls+'">'+gdTxt+'</span></div>';
}
function renderForm(el, form){
  if(!form||!form.length){ el.innerHTML=""; return; }
  el.innerHTML = '<span class="label">近況</span>' + form.map(function(c){
    return '<div class="form-dot '+c+'">'+c+'</div>';
  }).join("");
}
function playerRows(list, mode, limit){
  return sortPlayers(list, mode).slice(0, limit||99).map(function(p,i){
    const ga = p.gA!=null?p.gA:(p.goals+p.assists);
    const r = Number(p.avgRating);
    const pos = p.posCN || "";
    const key = p.name;
    const open = expandedCum === key;
    return '<tr class="player-row detail-row'+(open?" open":"")+'" data-cname="'+esc(p.name)+'">'+ 
      '<td class="pos">'+(i+1)+'</td>'+
      '<td><span class="pos-tag">'+esc(pos||"-")+'</span></td>'+
      '<td><strong>'+esc(p.name)+'</strong></td>'+
      '<td class="n"><span class="rating-badge '+ratingClass(r)+'">'+r.toFixed(2)+'</span></td>'+
      '<td class="n">'+p.games+'</td>'+
      '<td class="n">'+p.goals+'</td>'+
      '<td class="n">'+p.assists+'</td>'+
      '<td class="n">'+ga+'</td>'+
      '<td class="n">'+(p.shots!=null?p.shots:"-")+'</td>'+
      '<td class="n">'+(p.passPct!=null?p.passPct+"%":"-")+'</td>'+
      '<td class="n">'+(p.keyPass!=null?p.keyPass:"-")+'</td>'+
      '<td class="n">'+(p.interceptions!=null?p.interceptions:"-")+'</td>'+
      '<td class="n">'+(p.tk!=null?p.tk:"-")+'</td>'+
      '<td class="n">'+(p.minutes!=null?p.minutes:"-")+'</td></tr>'+
      (open ? '<tr class="expand-tr"><td colspan="14">'+cumExpandHtml(p)+'</td></tr>' : '');
  }).join("");
}
function cumExpandHtml(p){
  const ga = p.gA!=null?p.gA:(p.goals+p.assists);
  const r = Number(p.avgRating).toFixed(2);
  const summary = "評分 "+r+" · "+p.games+" 場 · "+p.goals+"G "+p.assists+"A · 傳 "+(p.passPct!=null?p.passPct+"%":"-")+(p.minutes!=null?" · "+p.minutes+"′":"");
  function row(label, value){
    return '<div class="stat-row"><span class="stat-l">'+esc(label)+'</span><span class="stat-v">'+value+'</span></div>';
  }
  function group(title, rowsHtml){
    return '<div class="stat-group"><h4 class="stat-gh">'+esc(title)+'</h4><div class="stat-rows">'+rowsHtml+'</div></div>';
  }
  const attack = group("進攻",
    row("入球", String(p.goals))+
    row("助攻", String(p.assists))+
    row("G+A", String(ga))+
    row("射門", String(p.shots!=null?p.shots:"-"))+
    row("射正", String(p.shotsOn!=null?p.shotsOn:"-"))+
    row("場均入球", String(p.goalsPerGame!=null?p.goalsPerGame:"-"))+
    row("xG / xA", (p.xg!=null?p.xg:"-")+" / "+(p.xa!=null?p.xa:"-"))
  );
  const passing = group("傳球",
    row("成功率", (p.passPct!=null?p.passPct+"%":"-"))+
    row("成功 / 嘗試", (p.pm!=null?p.pm:"-")+" / "+(p.pa!=null?p.pa:"-"))+
    row("直塞", String(p.keyPass!=null?p.keyPass:"-"))+
    row("向前 / 向後 / 橫傳", (p.passFwd||0)+" / "+(p.passBack||0)+" / "+(p.passSide||0))
  );
  const defense = group("防守",
    row("搶截", String(p.tk!=null?p.tk:"-"))+
    row("攔截", String(p.interceptions!=null?p.interceptions:"-"))+
    row("防守合計", String(p.totalDef!=null?p.totalDef:"-"))+
    row("解圍", String(p.clearances!=null?p.clearances:"-"))+
    row("封堵", String(p.blocks!=null?p.blocks:"-"))+
    row("頭錘防守", String(p.aerialDef!=null?p.aerialDef:"-"))
  );
  const activity = group("活動",
    row("上場場數", String(p.games))+
    row("上場分鐘", (p.minutes!=null?p.minutes:"-")+"′")+
    row("盤球", String(p.dribbles!=null?p.dribbles:"-"))+
    row("平均評分", r)
  );
  return '<div class="expand-c">'+
    '<p class="expand-summary">'+esc(summary)+'</p>'+
    '<div class="stat-grid">'+attack+passing+defense+activity+'</div>'+
  '</div>';
}
function matchButtons(list, limit){
  const rows = (list||[]).slice(0, limit||20);
  if(!rows.length) return '<p class="hint">沒有比賽</p>';
  return rows.map(function(r){
    const scoreCls = r.code==="W"?"score-w":r.code==="L"?"score-l":"score-d";
    return '<button type="button" class="match match-card'+(selectedMatch===r.id?' active':'')+'" data-id="'+esc(r.id)+'">'+ 
      '<div class="mc-main">'+ 
        '<div class="mc-score '+scoreCls+'">'+r.us+' <span>-</span> '+r.them+'</div>'+ 
        '<div class="mc-info">'+ 
          '<div class="mc-opp"><span class="pill zh'+r.code+'">'+r.outcome+'</span>'+esc(r.opp)+'</div>'+ 
          '<div class="mc-meta">'+r.type+' · '+r.when+(r.dnf?' · 離線':'')+'</div>'+ 
        '</div>'+ 
      '</div>'+ 
      '<div class="mc-chev" aria-hidden="true">›</div>'+ 
    '</button>';
  }).join("");
}
function chips(ev, ids){
  return ids.filter(function(id){return num(ev[id])>0;}).map(function(id){
    return '<span class="chip">'+esc(EV[id]||("E"+id))+'<strong>'+num(ev[id])+'</strong></span>';
  }).join("") || '<span class="chip">無</span>';
}
function openPlayer(name){
  const src = boardAll;
  const p = (src&&src.players||[]).find(function(x){return x.name===name;});
  if(!p) return;
  document.getElementById("drawer").hidden=false;
  document.getElementById("detail").hidden=true;
  document.getElementById("drawer-name").textContent=p.name;
  document.getElementById("drawer-sub").textContent=(p.posCN||"")+" · "+(src.label||"")+" · "+p.games+" 場";
  document.getElementById("drawer-body").innerHTML =
    '<div class="rating-xl">'+Number(p.avgRating).toFixed(2)+'</div>'+
    '<div class="grid2">'+
    '<div class="mini"><p class="l">入球</p><p class="v">'+p.goals+'</p></div>'+
    '<div class="mini"><p class="l">助攻</p><p class="v">'+p.assists+'</p></div>'+
    '<div class="mini"><p class="l">G+A</p><p class="v">'+(p.gA!=null?p.gA:p.goals+p.assists)+'</p></div>'+
    '<div class="mini"><p class="l">射門</p><p class="v">'+p.shots+(p.shotsOn!=null?' <small style="color:var(--muted)">('+p.shotsOn+' 正)</small>':'')+'</p></div>'+
    '<div class="mini"><p class="l">傳球%</p><p class="v">'+p.passPct+'%</p></div>'+
    '<div class="mini"><p class="l">直塞</p><p class="v">'+p.keyPass+'</p></div>'+
    '<div class="mini"><p class="l">攔截</p><p class="v">'+p.interceptions+'</p></div>'+
    '<div class="mini"><p class="l">搶截</p><p class="v">'+p.tk+'</p></div>'+
    '<div class="mini"><p class="l">盤球</p><p class="v">'+p.dribbles+'</p></div>'+
    '<div class="mini"><p class="l">防守合計</p><p class="v">'+p.totalDef+'</p></div>'+
    '<div class="mini"><p class="l">場均入球</p><p class="v">'+(p.goalsPerGame!=null?p.goalsPerGame:"-")+'</p></div>'+
    '<div class="mini"><p class="l">上場</p><p class="v">'+(p.minutes||0)+'′</p></div>'+
    '</div>'+
    '<p class="hint" style="padding:0">傳球方向：前 '+(p.passFwd||0)+' · 後 '+(p.passBack||0)+' · 橫 '+(p.passSide||0)+'</p>';
  document.getElementById("drawer").scrollIntoView({behavior:"smooth",block:"start"});
}

let detailMode = "table";
let detailMatch = null;
let expandedPlayer = null;
let detailSort = { key: "rating", dir: -1 };
let expandedCum = null;

function ratingClass(r){
  r = num(r);
  if(r >= 8) return "r-high";
  if(r >= 7) return "r-mid";
  if(r >= 6) return "r-ok";
  return "r-low";
}
function posKey(p){
  const s = String(p.pos||"").toLowerCase();
  if(s.indexOf("goal")>=0 || s==="gk") return "goalkeeper";
  if(s.indexOf("def")>=0) return "defender";
  if(s.indexOf("mid")>=0) return "midfielder";
  if(s.indexOf("for")>=0 || s.indexOf("att")>=0 || s.indexOf("st")>=0) return "forward";
  return s || "midfielder";
}
function posLabel(p){ return POS[posKey(p)] || p.pos || ""; }
function oppClubId(raw){
  const clubs = (raw&&raw.clubs)||{};
  return Object.keys(clubs).find(function(id){ return id !== CLUB; }) || null;
}
function playersOf(raw, clubId){
  const map=(raw.players&&raw.players[clubId])||{};
  let list=Array.isArray(map)?map.slice():Object.keys(map).map(function(k){return map[k];});
  list.sort(function(a,b){return num(b.rating)-num(a.rating);});
  return list;
}
function playerList(raw){
  return playersOf(raw, CLUB);
}
function fmtPct(n){ return (Number.isFinite(n)?Math.round(n):0)+"%"; }
function fmtRatio(a,b){ return num(a)+" / "+num(b); }
function eventExpandHtml(p){
  const ev=decodeEvents(p);
  const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
  const pct = pa>0 ? (pm/pa*100) : 0;
  const tkM=num(p.tacklesmade||p.tacklesMade), tkA=num(p.tackleattempts);
  const tkPct = tkA>0 ? (tkM/tkA*100) : 0;
  const mins=Math.round(num(p.secondsPlayed||p.gameTime)/60);
  const g=num(p.goals), a=num(p.assists), sh=num(p.shots);
  const r=num(p.rating).toFixed(2);
  const summary = "評分 "+r+" · "+g+"G "+a+"A · 傳 "+fmtPct(pct)+" · 搶截 "+fmtRatio(tkM,tkA)+(mins?" · "+mins+"′":"");

  function row(label, value){
    return '<div class="stat-row"><span class="stat-l">'+esc(label)+'</span><span class="stat-v">'+value+'</span></div>';
  }
  function group(title, rowsHtml){
    return '<div class="stat-group"><h4 class="stat-gh">'+esc(title)+'</h4><div class="stat-rows">'+rowsHtml+'</div></div>';
  }

  const attack = group("進攻",
    row("入球", String(g))+
    row("助攻", String(a))+
    row("射門", String(sh))+
    row("射正 / 射偏", num(ev[217])+" / "+num(ev[218]))+
    row("禁區內射正", String(num(ev[13])))+
    row("禁區外射正", String(num(ev[18])))
  );
  const passing = group("傳球",
    row("成功 / 嘗試", fmtRatio(pm, pa))+
    row("成功率", fmtPct(pct))+
    row("向前 / 向後 / 橫傳", num(ev[30])+" / "+num(ev[32])+" / "+num(ev[34]))+
    row("直塞成功", String(num(ev[152])))+
    row("傳中成功", String(num(ev[36])))+
    row("一腳出球", String(num(ev[143])))
  );
  const defense = group("防守",
    row("搶截成功 / 嘗試", fmtRatio(tkM, tkA))+
    row("搶截成功率", fmtPct(tkPct))+
    row("攔截", String(num(ev[6])))+
    row("封堵傳中", String(num(ev[156])))+
    row("頭錘勝（攻/防）", num(ev[265])+" / "+num(ev[266]))
  );
  const activity = group("活動 / 球權",
    row("上場分鐘", (mins||0)+"′")+
    row("盤球成功", String(num(ev[174])))+
    row("帶球推進", String(num(ev[97])))+
    row("站位好 / 差", num(ev[111])+" / "+num(ev[219]))+
    row("奪回（後/中/前）", num(ev[108])+" / "+num(ev[109])+" / "+num(ev[110]))+
    row("失球權（後/中/前）", num(ev[105])+" / "+num(ev[106])+" / "+num(ev[107]))
  );

  return '<div class="expand-c">'+
    '<p class="expand-summary">'+esc(summary)+'</p>'+
    '<div class="stat-grid">'+attack+passing+defense+activity+'</div>'+
  '</div>';
}
function summaryHtml(row, usList, themList){
  themList = themList || [];
  let mom = null, sumR=0, g=0, a=0, shots=0;
  usList.forEach(function(p){
    sumR += num(p.rating); g += num(p.goals); a += num(p.assists); shots += num(p.shots);
    if(num(p.mom)>0) mom = p;
  });
  if(!mom && usList.length) mom = usList[0];
  const avg = usList.length ? (sumR/usList.length).toFixed(2) : "-";
  const momName = mom ? (mom.playername||mom.name||"?") : "-";
  const momR = mom ? num(mom.rating).toFixed(2) : "-";
  let tg=0, ta=0, ts=0, tsum=0;
  themList.forEach(function(p){
    tg += num(p.goals); ta += num(p.assists); ts += num(p.shots); tsum += num(p.rating);
  });
  const tavg = themList.length ? (tsum/themList.length).toFixed(2) : "-";
  return '<div class="detail-summary">'+
    '<div class="ds-score"><span class="ds-big">'+row.us+'-'+row.them+'</span><span class="ds-opp">vs '+esc(row.opp)+'</span></div>'+
    '<div class="ds-meta">'+
      '<div class="ds-item"><span class="l">結果</span><span class="v"><span class="pill zh'+row.code+'">'+row.outcome+'</span></span></div>'+
      '<div class="ds-item"><span class="l">我方 MOTM</span><span class="v">'+esc(momName)+' <span class="rating-badge '+ratingClass(momR)+'">'+momR+'</span></span></div>'+
      '<div class="ds-item"><span class="l">我方均分</span><span class="v">'+avg+'</span></div>'+
      '<div class="ds-item"><span class="l">我方 G/A/射</span><span class="v">'+g+' / '+a+' / '+shots+'</span></div>'+
      '<div class="ds-item"><span class="l">對手均分</span><span class="v">'+tavg+'</span></div>'+
      '<div class="ds-item"><span class="l">對手 G/A/射</span><span class="v">'+tg+' / '+ta+' / '+ts+'</span></div>'+
    '</div>'+
  '</div>';
}
function modeTabsHtml(){ return ""; }
function matchPlayerVal(p, key){
  if(key==="rating") return num(p.rating);
  if(key==="goals") return num(p.goals);
  if(key==="assists") return num(p.assists);
  if(key==="shots") return num(p.shots);
  if(key==="pass"){
    const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
    return pa>0 ? pm/pa*100 : 0;
  }
  if(key==="tk") return num(p.tacklesmade||p.tacklesMade);
  if(key==="mins") return Math.round(num(p.secondsPlayed||p.gameTime)/60);
  if(key==="name") return String(p.playername||p.name||"").toLowerCase();
  return 0;
}
function sortMatchPlayers(list){
  const key = detailSort.key || "rating";
  const dir = detailSort.dir || -1;
  return (list||[]).slice().sort(function(a,b){
    const va = matchPlayerVal(a, key), vb = matchPlayerVal(b, key);
    if(typeof va === "string") return dir * va.localeCompare(vb);
    return dir * (va - vb) || num(b.rating) - num(a.rating);
  });
}
function tableViewHtml(list, side){
  side = side || "us";
  const sorted = sortMatchPlayers(list);
  const sk = detailSort.key, dir = detailSort.dir;
  const th = function(label, key, cls){
    cls = cls || "n";
    const active = sk===key ? " sorted" : "";
    const arrow = sk===key ? (dir>0?" ▲":" ▼") : "";
    return '<th class="'+cls+' sort'+active+'" data-msort="'+key+'">'+label+arrow+'</th>';
  };
  const rows = sorted.map(function(p,i){
    const name=p.playername||p.name||"?";
    const pos=posLabel(p);
    const r=num(p.rating);
    const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
    const pct = pa>0 ? Math.round(pm/pa*100) : 0;
    const tkM=num(p.tacklesmade||p.tacklesMade), tkA=num(p.tackleattempts);
    const mins=Math.round(num(p.secondsPlayed||p.gameTime)/60);
    const key=side+"|"+name+"|"+i;
    const open = expandedPlayer===key;
    return '<tr class="player-row detail-row'+(open?" open":"")+'" data-pkey="'+esc(key)+'">'+ 
      '<td class="pos">'+(i+1)+'</td>'+
      '<td><span class="pos-tag">'+esc(pos)+'</span></td>'+
      '<td><strong>'+esc(name)+'</strong></td>'+
      '<td class="n"><span class="rating-badge '+ratingClass(r)+'">'+r.toFixed(2)+'</span></td>'+
      '<td class="n">'+num(p.goals)+'</td>'+
      '<td class="n">'+num(p.assists)+'</td>'+
      '<td class="n">'+num(p.shots)+'</td>'+
      '<td class="n">'+pct+'%</td>'+
      '<td class="n">'+tkM+(tkA?'/'+tkA:'')+'</td>'+
      '<td class="n">'+(mins||"-")+'</td>'+
    '</tr>'+
    (open ? '<tr class="expand-tr"><td colspan="10">'+eventExpandHtml(p)+'</td></tr>' : '');
  }).join("");
  return '<div class="table-wrap"><table class="detail-table">'+
    '<thead><tr>'+
      '<th class="pos">#</th>'+th("位置","name","")+th("球員","name","")+th("評分","rating")+
      th("G","goals")+th("A","assists")+th("射","shots")+th("傳%","pass")+th("搶截","tk")+th("分","mins")+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function teamBlockHtml(title, list, side){
  if(!list.length) return '<p class="hint" style="padding:0.4rem 0">沒有 '+esc(title)+' 球員細項</p>';
  return '<div class="team-block team-'+side+'"><h3 class="team-h">'+esc(title)+' <span>'+list.length+' 人</span></h3>' +
    tableViewHtml(list, side) + '</div>';
}
function renderDetailBody(){
  if(!detailMatch) return;
  const raw = detailMatch.raw||{};
  const usList = playersOf(raw, CLUB);
  const oid = oppClubId(raw);
  const themList = oid ? playersOf(raw, oid) : [];
  const oppName = detailMatch.opp || '對手';
  const body = document.getElementById("detail-body");
  body.innerHTML = summaryHtml(detailMatch, usList, themList) + modeTabsHtml() +
    teamBlockHtml('LinKing FC', usList, 'us') +
    teamBlockHtml(oppName, themList, 'them');
}
function openDetail(row){
  selectedMatch=row.id;
  detailMatch=row;
  expandedPlayer=null;
  detailSort = { key: "rating", dir: -1 };
  document.getElementById("detail").hidden=false;
  document.getElementById("drawer").hidden=true;
  document.getElementById("detail-title").textContent=row.type+" · "+row.when+" · "+row.us+"-"+row.them+" vs "+row.opp;
  renderDetailBody();
  renderMatchLists();
  try { document.getElementById("detail").scrollIntoView({behavior:"smooth",block:"nearest"}); } catch(e) {}
}
function renderMatchLists(){
  document.getElementById("ov-matches").innerHTML=matchButtons(matches,6);
  const form = (matches||[]).slice(0,10).map(function(m){ return m.code; });
  const formHtml = form.length
    ? '<div class="match-list-form"><span class="label" style="font-size:0.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-right:0.25rem">近況</span>'+
      form.map(function(c){ return '<div class="form-dot '+c+'">'+c+'</div>'; }).join("")+'</div>'
    : '';
  document.getElementById("match-list").innerHTML = formHtml + matchButtons(matches,25);
}
function showTab(name){
  tab=name;
  ["overview","all","matches"].forEach(function(t){
    var el=document.getElementById("view-"+t);
    if(el) el.classList.toggle("hide", t!==name);
  });
  document.querySelectorAll("#main-tabs button").forEach(function(b){
    b.classList.toggle("active", b.dataset.tab===name);
  });
}
function render(){
  const recAll=boardAll&&boardAll.record;
  document.getElementById("header-sub").textContent =
    "歷史 "+((boardAll&&boardAll.totalMatches)||matches.length)+" 場 · 戰報 "+matches.length+" 場";
  renderRecord(document.getElementById("ov-record"), recAll);
  renderForm(document.getElementById("ov-form"), (recAll||{}).form||[]);
  document.getElementById("ov-top").innerHTML = sortPlayers((boardAll&&boardAll.players)||[], "attack").slice(0,8).map(function(p,i){
    return '<tr class="player-row" data-name="'+esc(p.name)+'"><td class="pos">'+(i+1)+'</td><td><div class="who"><div class="avatar">'+avatar(p.name)+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.posCN||"")+'</small></div></div></td>'+
      '<td class="n">'+p.games+'</td><td class="n">'+p.goals+'</td><td class="n">'+p.assists+'</td><td class="n">'+Number(p.avgRating).toFixed(2)+'</td></tr>';
  }).join("");
  renderRecord(document.getElementById("all-record"), recAll);
  renderForm(document.getElementById("all-form"), (recAll||{}).form||[]);
  document.getElementById("all-body").innerHTML = playerRows((boardAll&&boardAll.players)||[], sortAll);
  document.querySelectorAll("#all-thead th[data-sort]").forEach(function(th){
    th.classList.toggle("sorted", th.dataset.sort===sortAll);
  });
  renderMatchLists();
}
async function load(){
  const err=document.getElementById("error");
  err.classList.add("hide");
  try{
    const t="?t="+Date.now();
    const rs=await Promise.all([
      fetch("./data/aggregated/board.json"+t,{cache:"no-store"}),
      fetch("./data/aggregated/board_last10.json"+t,{cache:"no-store"}),
      fetch("./data/matches.json"+t,{cache:"no-store"})
    ]);
    if(!rs[0].ok||!rs[2].ok) throw new Error("讀取資料失敗");
    boardAll=await rs[0].json();
    boardL10=rs[1].ok?await rs[1].json():null;
    matches=shapeMatches(await rs[2].json());
    if(!boardL10) boardL10={players:[],record:null,totalMatches:0,label:"近10場"};
    render();
  }catch(e){
    err.classList.remove("hide");
    err.textContent=e.message||String(e);
  }
}
document.getElementById("btn-reload").onclick=load;
document.getElementById("btn-close-drawer").onclick=function(){document.getElementById("drawer").hidden=true;};
document.getElementById("btn-close-detail").onclick=function(){selectedMatch=null;detailMatch=null;document.getElementById("detail").hidden=true;renderMatchLists(); try{window.scrollBy(0,-1);}catch(e){}};
document.getElementById("main-tabs").onclick=function(e){
  const b=e.target.closest("button[data-tab]"); if(!b) return; showTab(b.dataset.tab);
};
document.getElementById("all-thead").onclick=function(e){
  const th=e.target.closest("th[data-sort]"); if(!th) return;
  sortAll=th.dataset.sort;
  render();
};
document.body.addEventListener("click", function(e){
  const crow=e.target.closest("tr.player-row[data-cname]");
  if(crow){
    const name = crow.dataset.cname;
    expandedCum = (expandedCum === name) ? null : name;
    document.getElementById("drawer").hidden = true;
    render();
    return;
  }
  const row=e.target.closest("tr.player-row[data-name]");
  if(row) openPlayer(row.dataset.name);
  const mb=e.target.closest("button.match[data-id]");
  if(mb){
    const m=matches.find(function(x){return x.id===mb.dataset.id;});
    if(m) openDetail(m);
  }
});
document.getElementById("detail-body").addEventListener("click", function(e){
  const th = e.target.closest("th[data-msort]");
  if(th && detailMatch){
    const k = th.dataset.msort;
    if(detailSort.key === k) detailSort.dir = -detailSort.dir;
    else { detailSort.key = k; detailSort.dir = (k==="name") ? 1 : -1; }
    expandedPlayer = null;
    renderDetailBody();
    return;
  }
  const row = e.target.closest("[data-pkey]");
  if(row && detailMatch){
    const key = row.dataset.pkey;
    expandedPlayer = (expandedPlayer === key) ? null : key;
    renderDetailBody();
  }
});
load();
