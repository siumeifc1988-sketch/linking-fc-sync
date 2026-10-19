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
function openDetail(row){
  selectedMatch=row.id;
  document.getElementById("detail").hidden=false;
  document.getElementById("drawer").hidden=true;
  document.getElementById("detail-title").textContent=row.type+" · "+row.when+" · "+row.us+"-"+row.them+" vs "+row.opp;
  const map=(row.raw.players&&row.raw.players[CLUB])||{};
  let list=Array.isArray(map)?map:Object.keys(map).map(function(k){return map[k];});
  list.sort(function(a,b){return num(b.rating)-num(a.rating);});
  document.getElementById("detail-body").innerHTML = list.length ? list.map(function(p){
    const name=p.playername||p.name||"?";
    const pos=POS[String(p.pos||"").toLowerCase()]||p.pos||"";
    const ev=decodeEvents(p);
    const pm=num(p.passesmade||p.passesMade), pa=num(p.passattempts||p.passAttempts);
    const mins=Math.round(num(p.secondsPlayed||p.gameTime)/60);
    return '<div class="player-block"><h3>'+esc(name)+' <span style="color:var(--muted);font-weight:500;font-size:0.85rem">'+esc(pos)+'</span> <span class="rating">'+num(p.rating).toFixed(2)+'</span></h3>'+
      '<div class="chips" style="margin-bottom:0.4rem">'+
      '<span class="chip">入球<strong>'+num(p.goals)+'</strong></span>'+
      '<span class="chip">助攻<strong>'+num(p.assists)+'</strong></span>'+
      '<span class="chip">射門<strong>'+num(p.shots)+'</strong></span>'+
      '<span class="chip">傳球<strong>'+pm+"/"+pa+'</strong></span>'+
      '<span class="chip">搶截<strong>'+num(p.tacklesmade||p.tacklesMade)+"/"+num(p.tackleattempts)+'</strong></span>'+
      (mins?'<span class="chip">上場<strong>'+mins+"′</strong></span>":"")+
      '</div>'+
      '<p class="sec">傳球</p><div class="chips">'+chips(ev,[215,216,30,32,34,24,26,28,36,152,153,143])+'</div>'+
      '<p class="sec">射門 / 入球</p><div class="chips">'+chips(ev,[217,218,13,14,18,19,214,11])+'</div>'+
      '<p class="sec">防守</p><div class="chips">'+chips(ev,[0,1,6,156,265,266])+'</div>'+
      '<p class="sec">盤帶 / 站位 / 球權</p><div class="chips">'+chips(ev,[174,97,111,219,105,106,107,108,109,110])+'</div></div>';
  }).join("") : '<p class="hint" style="padding:0">沒有球員細項</p>';
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
document.getElementById("btn-close-detail").onclick=function(){selectedMatch=null;document.getElementById("detail").hidden=true;renderMatchLists();};
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
load();
