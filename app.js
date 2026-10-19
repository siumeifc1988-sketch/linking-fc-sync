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
let sortAll = "attack", sortL10 = "attack", selectedMatch = null;

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
  if(mode==="defense") rows.sort(function(a,b){return b.totalDef-a.totalDef||b.avgRating-a.avgRating;});
  else if(mode==="rating") rows.sort(function(a,b){return b.avgRating-a.avgRating||b.games-a.games;});
  else if(mode==="pass") rows.sort(function(a,b){return b.passPct-a.passPct||b.keyPass-a.keyPass;});
  else rows.sort(function(a,b){return (b.gA||(b.goals+b.assists))-(a.gA||(a.goals+a.assists))||b.goals-a.goals;});
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
    return '<tr class="player-row" data-name="'+esc(p.name)+'">'+ 
      '<td class="pos">'+(i+1)+'</td>'+
      '<td><div class="who"><div class="avatar">'+avatar(p.name)+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.posCN||"")+'</small></div></div></td>'+
      '<td class="n">'+p.games+'</td>'+
      '<td class="n">'+metric(p,mode)+'</td>'+
      '<td class="n">'+p.goals+'</td>'+
      '<td class="n">'+p.assists+'</td>'+
      '<td class="n">'+Number(p.avgRating).toFixed(2)+'</td></tr>';
  }).join("");
}
function matchButtons(list, limit){
  return (list||[]).slice(0, limit||20).map(function(r){
    return '<button type="button" class="match'+(selectedMatch===r.id?' active':'')+'" data-id="'+esc(r.id)+'">'+ 
      '<div><div><span class="pill zh'+r.code+'">'+r.outcome+'</span>'+esc(r.opp)+'</div>'+
      '<div class="meta">'+r.type+' · '+r.when+(r.dnf?' · 離線':'')+'</div></div>'+
      '<div class="score">'+r.us+'-'+r.them+'</div></button>';
  }).join("") || '<p class="hint">沒有比賽</p>';
}
function chips(ev, ids){
  return ids.filter(function(id){return num(ev[id])>0;}).map(function(id){
    return '<span class="chip">'+esc(EV[id]||("E"+id))+'<strong>'+num(ev[id])+'</strong></span>';
  }).join("") || '<span class="chip">無</span>';
}
function openPlayer(name){
  const src = tab==="l10" ? boardL10 : boardAll;
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
function playerList(raw){
  const map=(raw.players&&raw.players[CLUB])||{};
  let list=Array.isArray(map)?map.slice():Object.keys(map).map(function(k){return map[k];});
  list.sort(function(a,b){return num(b.rating)-num(a.rating);});
  return list;
}
function eventExpandHtml(p){
  const ev=decodeEvents(p);
  return '<div class="expand-body">'+
    '<p class="sec">傳球</p><div class="chips">'+chips(ev,[215,216,30,32,34,24,26,28,36,152,153,143])+'</div>'+
    '<p class="sec">射門 / 入球</p><div class="chips">'+chips(ev,[217,218,13,14,18,19,214,11])+'</div>'+
    '<p class="sec">防守</p><div class="chips">'+chips(ev,[0,1,6,156,265,266])+'</div>'+
    '<p class="sec">盤帶 / 站位 / 球權</p><div class="chips">'+chips(ev,[174,97,111,219,105,106,107,108,109,110])+'</div>'+
  '</div>';
}
function summaryHtml(row, list){
  let mom = null, sumR=0, g=0, a=0, shots=0;
  list.forEach(function(p){
    sumR += num(p.rating); g += num(p.goals); a += num(p.assists); shots += num(p.shots);
    if(num(p.mom)>0) mom = p;
  });
  if(!mom && list.length) mom = list[0];
  const avg = list.length ? (sumR/list.length).toFixed(2) : "-";
  const momName = mom ? (mom.playername||mom.name||"?") : "-";
  const momR = mom ? num(mom.rating).toFixed(2) : "-";
  return '<div class="detail-summary">'+
    '<div class="ds-score"><span class="ds-big">'+row.us+'-'+row.them+'</span><span class="ds-opp">vs '+esc(row.opp)+'</span></div>'+
    '<div class="ds-meta">'+
      '<div class="ds-item"><span class="l">結果</span><span class="v"><span class="pill zh'+row.code+'">'+row.outcome+'</span></span></div>'+
      '<div class="ds-item"><span class="l">MOTM</span><span class="v">'+esc(momName)+' <span class="rating-badge '+ratingClass(momR)+'">'+momR+'</span></span></div>'+
      '<div class="ds-item"><span class="l">隊均評分</span><span class="v">'+avg+'</span></div>'+
      '<div class="ds-item"><span class="l">G / A / 射</span><span class="v">'+g+' / '+a+' / '+shots+'</span></div>'+
      '<div class="ds-item"><span class="l">人數</span><span class="v">'+list.length+'</span></div>'+
    '</div>'+
  '</div>';
}
function modeTabsHtml(){
  return '<div class="detail-mode-tabs">'+
    '<button type="button" class="dmode'+(detailMode==="table"?" active":"")+'" data-dmode="table">評分表</button>'+
    '<button type="button" class="dmode'+(detailMode==="lineup"?" active":"")+'" data-dmode="lineup">陣容</button>'+
    '<span class="hint-inline">點選可展開細項</span>'+
  '</div>';
}
function tableViewHtml(list){
  const rows = list.map(function(p,i){
    const name=p.playername||p.name||"?";
    const pos=posLabel(p);
    const r=num(p.rating);
    const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
    const pct = pa>0 ? Math.round(pm/pa*100) : 0;
    const tkM=num(p.tacklesmade||p.tacklesMade), tkA=num(p.tackleattempts);
    const mins=Math.round(num(p.secondsPlayed||p.gameTime)/60);
    const key=name+"|"+i;
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
      '<th class="pos">#</th><th>位置</th><th>球員</th><th class="n">評分</th>'+
      '<th class="n">G</th><th class="n">A</th><th class="n">射</th><th class="n">傳%</th><th class="n">搶截</th><th class="n">分</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function lineupCardHtml(p, i){
  const name=p.playername||p.name||"?";
  const pos=posLabel(p);
  const pk=posKey(p);
  const r=num(p.rating);
  const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
  const pct = pa>0 ? Math.round(pm/pa*100) : 0;
  const tkM=num(p.tacklesmade||p.tacklesMade);
  const mins=Math.round(num(p.secondsPlayed||p.gameTime)/60);
  const key=name+"|L"+i;
  const open = expandedPlayer===key;
  let stats = "";
  if(pk==="forward"){
    stats = '<span>G<b>'+num(p.goals)+'</b></span><span>A<b>'+num(p.assists)+'</b></span><span>射<b>'+num(p.shots)+'</b></span>';
  } else if(pk==="midfielder"){
    const ev=decodeEvents(p);
    stats = '<span>A<b>'+num(p.assists)+'</b></span><span>直塞<b>'+num(ev[152])+'</b></span><span>傳%<b>'+pct+'</b></span>';
  } else if(pk==="defender"){
    const ev=decodeEvents(p);
    stats = '<span>搶<b>'+tkM+'</b></span><span>攔截<b>'+num(ev[6])+'</b></span><span>傳%<b>'+pct+'</b></span>';
  } else {
    stats = '<span>失球<b>'+num(p.goalsconceded)+'</b></span><span>撲救<b>'+num(p.saves)+'</b></span><span>分<b>'+(mins||0)+'</b></span>';
  }
  return '<div class="lineup-card'+(open?" open":"")+'" data-pkey="'+esc(key)+'">'+ 
    '<div class="lc-top"><span class="rating-badge '+ratingClass(r)+'">'+r.toFixed(2)+'</span>'+
    '<div class="lc-name"><strong>'+esc(name)+'</strong><small>'+esc(pos)+(mins?' · '+mins+'′':'')+'</small></div></div>'+
    '<div class="lc-stats">'+stats+'</div>'+
    (open ? eventExpandHtml(p) : '')+
  '</div>';
}
function lineupViewHtml(list){
  const groups = [
    {key:"goalkeeper", title:"門將"},
    {key:"defender", title:"後衛"},
    {key:"midfielder", title:"中場"},
    {key:"forward", title:"前鋒"}
  ];
  const by = {};
  list.forEach(function(p,i){ p._idx=i; const k=posKey(p); (by[k]=by[k]||[]).push(p); });
  return groups.map(function(g){
    const arr = by[g.key]||[];
    if(!arr.length) return "";
    return '<div class="lineup-group"><h4 class="lineup-h">'+g.title+' <span>'+arr.length+'</span></h4>'+
      '<div class="lineup-grid">'+arr.map(function(p){ return lineupCardHtml(p, p._idx); }).join("")+'</div></div>';
  }).join("") || '<p class="hint" style="padding:0">沒有球員</p>';
}
function renderDetailBody(){
  if(!detailMatch) return;
  const list = playerList(detailMatch.raw||{});
  const body = document.getElementById("detail-body");
  if(!list.length){ body.innerHTML = '<p class="hint" style="padding:0">沒有球員細項</p>'; return; }
  body.innerHTML = summaryHtml(detailMatch, list) + modeTabsHtml() +
    (detailMode==="lineup" ? lineupViewHtml(list) : tableViewHtml(list));
}
function openDetail(row){
  selectedMatch=row.id;
  detailMatch=row;
  expandedPlayer=null;
  document.getElementById("detail").hidden=false;
  document.getElementById("drawer").hidden=true;
  document.getElementById("detail-title").textContent=row.type+" · "+row.when+" · "+row.us+"-"+row.them+" vs "+row.opp;
  renderDetailBody();
  renderMatchLists();
  document.getElementById("detail").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderMatchLists(){
  document.getElementById("ov-matches").innerHTML=matchButtons(matches,6);
  document.getElementById("match-list").innerHTML=matchButtons(matches,25);
}
function showTab(name){
  tab=name;
  ["overview","all","l10","matches"].forEach(function(t){
    document.getElementById("view-"+t).classList.toggle("hide", t!==name);
  });
  document.querySelectorAll("#main-tabs button").forEach(function(b){
    b.classList.toggle("active", b.dataset.tab===name);
  });
}
function render(){
  const recAll=boardAll&&boardAll.record, rec10=boardL10&&boardL10.record;
  document.getElementById("header-sub").textContent =
    "歷史 "+((boardAll&&boardAll.totalMatches)||matches.length)+" 場 · 近10 "+((boardL10&&boardL10.totalMatches)||0)+" 場";
  renderRecord(document.getElementById("ov-record"), rec10||recAll);
  renderForm(document.getElementById("ov-form"), (rec10||recAll||{}).form||[]);
  document.getElementById("ov-top").innerHTML = sortPlayers((boardL10&&boardL10.players)||[], "attack").slice(0,8).map(function(p,i){
    return '<tr class="player-row" data-name="'+esc(p.name)+'"><td class="pos">'+(i+1)+'</td><td><div class="who"><div class="avatar">'+avatar(p.name)+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.posCN||"")+'</small></div></div></td>'+
      '<td class="n">'+p.games+'</td><td class="n">'+p.goals+'</td><td class="n">'+p.assists+'</td><td class="n">'+Number(p.avgRating).toFixed(2)+'</td></tr>';
  }).join("");
  renderRecord(document.getElementById("all-record"), recAll);
  renderForm(document.getElementById("all-form"), (recAll||{}).form||[]);
  document.getElementById("all-metric").textContent = sortAll==="defense"?"防守":sortAll==="rating"?"評分":sortAll==="pass"?"傳%":"G+A";
  document.getElementById("all-body").innerHTML = playerRows((boardAll&&boardAll.players)||[], sortAll);
  renderRecord(document.getElementById("l10-record"), rec10);
  renderForm(document.getElementById("l10-form"), (rec10||{}).form||[]);
  document.getElementById("l10-metric").textContent = sortL10==="defense"?"防守":sortL10==="rating"?"評分":sortL10==="pass"?"傳%":"G+A";
  document.getElementById("l10-body").innerHTML = playerRows((boardL10&&boardL10.players)||[], sortL10);
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
document.getElementById("btn-close-detail").onclick=function(){selectedMatch=null;detailMatch=null;document.getElementById("detail").hidden=true;renderMatchLists();};
document.getElementById("main-tabs").onclick=function(e){
  const b=e.target.closest("button[data-tab]"); if(!b) return; showTab(b.dataset.tab);
};
document.getElementById("all-sort").onclick=function(e){
  const b=e.target.closest("button[data-sort]"); if(!b) return;
  sortAll=b.dataset.sort;
  document.querySelectorAll("#all-sort button").forEach(function(x){x.classList.toggle("active",x===b);});
  render();
};
document.getElementById("l10-sort").onclick=function(e){
  const b=e.target.closest("button[data-sort]"); if(!b) return;
  sortL10=b.dataset.sort;
  document.querySelectorAll("#l10-sort button").forEach(function(x){x.classList.toggle("active",x===b);});
  render();
};
document.body.addEventListener("click", function(e){
  const row=e.target.closest("tr.player-row[data-name]");
  if(row) openPlayer(row.dataset.name);
  const mb=e.target.closest("button.match[data-id]");
  if(mb){
    const m=matches.find(function(x){return x.id===mb.dataset.id;});
    if(m) openDetail(m);
  }
});
document.getElementById("detail-body").addEventListener("click", function(e){
  const modeBtn = e.target.closest("button.dmode[data-dmode]");
  if(modeBtn){
    detailMode = modeBtn.dataset.dmode;
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
