const TYPES=['남복','혼복','여복'];
const $=id=>document.getElementById(id);
let db=load('tennis-player-db',[]), players=[], schedule=[], stats={}, history={};
let courtRules={1:new Set(TYPES),2:new Set(TYPES),3:new Set(TYPES),4:new Set(TYPES)};
const keyPair=(a,b)=>[a,b].sort().join('|');
function load(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function toast(msg){alert(msg)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function persistDB(){save('tennis-player-db',db)}
function upsertDB(p){const i=db.findIndex(x=>x.name===p.name); const clean={name:p.name,gender:p.gender,level:+p.level,fixedPartner:p.fixedPartner||null}; if(i>=0)db[i]=clean;else db.push(clean); persistDB()}
function addPlayer(){const name=$('name').value.trim(); if(!name)return toast('이름을 입력하세요.'); if(players.some(p=>p.name===name))return toast('오늘 참가자에 이미 있습니다.'); if(players.length>=16)return toast('최대 16명까지 가능합니다.'); let p={name,gender:$('gender').value,level:+$('level').value,fixedPartner:null}; const existing=db.find(x=>x.name===name); if(existing)p={...existing}; players.push({...p}); upsertDB(p); $('name').value=''; renderPlayers();renderFixed()}
function removePlayer(name){players=players.filter(p=>p.name!==name); players.forEach(p=>{if(p.fixedPartner===name)p.fixedPartner=null}); renderPlayers();renderFixed()}
function changePlayer(name,field,value){let p=players.find(x=>x.name===name); if(!p)return;p[field]=field==='level'?+value:value;upsertDB(p);renderPlayers();renderFixed()}
function renderPlayers(){ $('playerCount').textContent=`${players.length}명`; $('playerList').innerHTML=players.length?players.map(p=>`<div class="player"><div class="player-main"><div class="player-name">${esc(p.name)}</div><div class="meta"><span class="pill">${p.gender}</span><span class="pill">실력 ${p.level}</span>${p.fixedPartner?`<span class="pill">파트너 ${esc(p.fixedPartner)}</span>`:''}</div></div><div class="row"><select style="width:70px" onchange="changePlayer('${esc(p.name)}','level',this.value)">${[1,2,3,4,5].map(n=>`<option ${n===+p.level?'selected':''}>${n}</option>`).join('')}</select><button class="btn danger small" onclick="removePlayer('${esc(p.name)}')">삭제</button></div></div>`).join(''):'<div class="empty">참가자를 추가하거나 저장 명단에서 선택하세요.</div>'}
window.removePlayer=removePlayer;window.changePlayer=changePlayer;

function openRoster(){renderRoster();$('rosterModal').classList.add('show')}
function renderRoster(){const current=new Set(players.map(p=>p.name));$('rosterList').innerHTML=db.length?db.map((p,i)=>`<label class="select-player"><input type="checkbox" class="rosterCheck" data-i="${i}" ${current.has(p.name)?'checked':''}><div><strong>${esc(p.name)}</strong><div class="meta">${p.gender} · 실력 ${p.level}${p.fixedPartner?' · 파트너 '+esc(p.fixedPartner):''}</div></div></label>`).join(''):'<div class="empty">저장된 참가자가 없습니다.</div>'; updateSelected()}
function updateSelected(){const n=document.querySelectorAll('.rosterCheck:checked').length;$('selectedCount').textContent=`${n}명 선택`}
function loadSelected(){const idx=[...document.querySelectorAll('.rosterCheck:checked')].map(x=>+x.dataset.i); if(idx.length>16)return toast('최대 16명까지 선택할 수 있습니다.'); players=idx.map(i=>({...db[i]})); $('rosterModal').classList.remove('show');renderPlayers();renderFixed()}
function exportRoster(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tennis_players.json';a.click();URL.revokeObjectURL(a.href)}
async function importRoster(file){
  if(!file){toast('파일이 선택되지 않았습니다.');return}
  try{
    const text=await file.text();
    let x=JSON.parse(text.replace(/^\uFEFF/,''));
    if(x && !Array.isArray(x) && Array.isArray(x.players)) x=x.players;
    if(!Array.isArray(x)) throw new Error('format');
    let added=0, updated=0, skipped=0;
    for(const p of x){
      if(!p || !p.name || !['남','여'].includes(p.gender)){skipped++;continue}
      const item={
        name:String(p.name).trim(),
        gender:p.gender,
        level:Math.max(1,Math.min(5,Number(p.level)||3)),
        fixedPartner:p.fixedPartner||null
      };
      if(!item.name){skipped++;continue}
      const i=db.findIndex(d=>String(d.name).trim().toLowerCase()===item.name.toLowerCase());
      if(i>=0){db[i]=item;updated++}else{db.push(item);added++}
    }
    persistDB();
    renderPlayers();
    renderFixed();
    toast(`명단 가져오기 완료: 신규 ${added}명, 업데이트 ${updated}명${skipped?`, 제외 ${skipped}명`:''}`);
    setTimeout(openRoster,250);
  }catch(err){
    console.error(err);
    toast('명단을 읽지 못했습니다. 이 앱에서 내보낸 JSON 파일인지 확인해 주세요.');
  }finally{
    $('importRoster').value='';
  }
}
function renderCourtRules(){const n=+$('courtCount').value;let html='';for(let c=1;c<=4;c++){html+=`<div class="court-rule ${c>n?'hidden':''}"><strong>${c}코트</strong><div class="checks">${TYPES.map(t=>`<label><input type="checkbox" data-court="${c}" data-type="${t}" ${courtRules[c].has(t)?'checked':''}>${t}</label>`).join('')}</div></div>`}$('courtRules').innerHTML=html;document.querySelectorAll('#courtRules input').forEach(el=>el.onchange=()=>{const c=+el.dataset.court,t=el.dataset.type;el.checked?courtRules[c].add(t):courtRules[c].delete(t)})}
function renderFixed(){if(!$('fixedPartners'))return;$('fixedCard').style.opacity=$('partnerMode').value==='고정 파트너'?'1':'.55';const names=players.map(p=>p.name);$('fixedPartners').innerHTML=players.length?players.map(p=>`<div class="player"><strong>${esc(p.name)}</strong><select style="width:160px" onchange="setPartner('${esc(p.name)}',this.value)"><option value="">미지정</option>${names.filter(n=>n!==p.name).map(n=>`<option value="${esc(n)}" ${p.fixedPartner===n?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`).join(''):'<div class="empty">참가자를 먼저 등록하세요.</div>'}
function setPartner(name,partner){const p=players.find(x=>x.name===name);if(!p)return; if(!partner){const old=p.fixedPartner;p.fixedPartner=null;if(old){const q=players.find(x=>x.name===old);if(q&&q.fixedPartner===name)q.fixedPartner=null}}else{const q=players.find(x=>x.name===partner);if(!q)return; for(const x of players){if(x.fixedPartner===name||x.fixedPartner===partner){x.fixedPartner=null}}p.fixedPartner=partner;q.fixedPartner=name;upsertDB(p);upsertDB(q)}renderFixed();renderPlayers()}
window.setPartner=setPartner;

function gameTypeValid(team1,team2,type){const all=[...team1,...team2];if(type==='남복')return all.every(p=>p.gender==='남');if(type==='여복')return all.every(p=>p.gender==='여');return team1[0].gender!==team1[1].gender&&team2[0].gender!==team2[1].gender}
function fixedTeams(){const out=[],seen=new Set();for(const p of players){if(p.fixedPartner&&!seen.has(p.name)){const q=players.find(x=>x.name===p.fixedPartner);if(q){out.push([p,q]);seen.add(p.name);seen.add(q.name)}}}return out}
function allCandidates(type,usedNames,partnerCount,opponentCount,played){let out=[];if($('partnerMode').value==='고정 파트너'){
  const teams=fixedTeams().filter(t=>t.every(p=>!usedNames.has(p.name)));for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++){if(gameTypeValid(teams[i],teams[j],type))out.push(scoreCandidate(teams[i],teams[j],partnerCount,opponentCount,played))}
}else{
 const avail=players.filter(p=>!usedNames.has(p.name));for(const four of combinations(avail,4)){const pairings=[[[four[0],four[1]],[four[2],four[3]]],[[four[0],four[2]],[four[1],four[3]]],[[four[0],four[3]],[four[1],four[2]]]];for(const [a,b] of pairings)if(gameTypeValid(a,b,type))out.push(scoreCandidate(a,b,partnerCount,opponentCount,played))}
}return out.sort((a,b)=>a.score-b.score)}
function* combinations(arr,k,start=0,p=[]){if(p.length===k){yield p.slice();return}for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);yield* combinations(arr,k,i+1,p);p.pop()}}
function scoreCandidate(a,b,pc,oc,played){const lvA=a[0].level+a[1].level,lvB=b[0].level+b[1].level;let s=Math.abs(lvA-lvB)*12; s+=(pc[keyPair(a[0].name,a[1].name)]||0)*25+(pc[keyPair(b[0].name,b[1].name)]||0)*25; for(const x of a)for(const y of b)s+=(oc[keyPair(x.name,y.name)]||0)*8; const vals=[...a,...b].map(x=>played[x.name]||0);s+=(Math.max(...vals)-Math.min(...vals))*20+sumsq(vals)*2; s+=Math.random()*3; return{team1:a,team2:b,score:s,lvA,lvB}}
function sumsq(a){return a.reduce((s,x)=>s+x*x,0)}
function buildSchedule(){if(players.length<4)return {error:'참가자는 최소 4명입니다.'};if(players.length>16)return{error:'참가자는 최대 16명입니다.'};const counts={'남복':+$('mensGames').value||0,'혼복':+$('mixedGames').value||0,'여복':+$('womensGames').value||0};const total=Object.values(counts).reduce((a,b)=>a+b,0);if(total<1)return{error:'경기 수를 1경기 이상 설정하세요.'};const courts=+$('courtCount').value;for(let c=1;c<=courts;c++)if(courtRules[c].size===0)return{error:`${c}코트에서 허용할 경기 종류를 하나 이상 선택하세요.`};for(const t of TYPES){if(counts[t]>0&&!Array.from({length:courts},(_,i)=>courtRules[i+1].has(t)).some(Boolean))return{error:`${t}을 허용한 코트가 없습니다.`}}
 const pc={},oc={},played={};players.forEach(p=>played[p.name]=0);const left={...counts},out=[];let game=1,wave=1;let guard=0;while(Object.values(left).some(x=>x>0)&&guard++<100){let used=new Set(),placed=0;for(let c=1;c<=courts;c++){const choices=TYPES.filter(t=>left[t]>0&&courtRules[c].has(t));if(!choices.length)continue;let best=null,bestType=null;for(const t of choices){const cand=allCandidates(t,used,pc,oc,played)[0];if(cand&&(!best||cand.score<best.score)){best=cand;bestType=t}}if(!best)continue;const names=[...best.team1,...best.team2].map(p=>p.name);names.forEach(n=>used.add(n));const pk1=keyPair(best.team1[0].name,best.team1[1].name),pk2=keyPair(best.team2[0].name,best.team2[1].name);pc[pk1]=(pc[pk1]||0)+1;pc[pk2]=(pc[pk2]||0)+1;for(const a of best.team1)for(const b of best.team2){const k=keyPair(a.name,b.name);oc[k]=(oc[k]||0)+1}names.forEach(n=>played[n]++);out.push({id:'m'+Date.now()+game,game:game++,wave,court:c,type:bestType,team1:best.team1.map(p=>p.name),team2:best.team2.map(p=>p.name),lv1:best.lvA,lv2:best.lvB,s1:'',s2:'',done:false});left[bestType]--;placed++}if(!placed){return{error:'현재 참가자 구성, 고정 파트너 또는 코트별 경기 종류 설정으로는 남은 경기를 배정할 수 없습니다. 성별 인원과 코트 설정을 확인하세요.'}}wave++}
 return{schedule:out,played}}
function generate(){const r=buildSchedule();if(r.error)return toast(r.error);schedule=r.schedule;history={};initStats();renderSchedule();renderPlayersPlanned(r.played);renderRanking();switchPage('schedule')}
function renderPlayersPlanned(played){document.querySelectorAll('.player').forEach(()=>{}); $('playerCount').textContent=`${players.length}명 · 예정 ${Object.values(played).reduce((a,b)=>a+b,0)/4}경기`}
function initStats(){stats={};players.forEach(p=>stats[p.name]={played:0,win:0,draw:0,loss:0,gf:0,ga:0})}
function renderSchedule(){
  if(!schedule.length){$('scheduleArea').classList.remove('capture-mode');$('scheduleArea').innerHTML='<div class="empty">아직 생성된 대진이 없습니다.</div>';return}
  const courts=+$('courtCount').value;
  let html=`<div class="schedule-toolbar"><h2 class="grow">전체 대진표</h2><span class="summary">총 ${schedule.length}경기</span><button class="btn small secondary capture-exit" onclick="toggleCaptureMode(false)">입력 화면</button></div><div class="courts-grid">`;
  for(let c=1;c<=courts;c++){
    const ms=schedule.filter(m=>m.court===c);
    html+=`<div class="court"><h3>${c}코트 <span class="meta">(${[...courtRules[c]].join('+')})</span></h3>${ms.length?ms.map(matchHTML).join(''):'<div class="empty">배정 경기 없음</div>'}</div>`;
  }
  html+='</div>';
  $('scheduleArea').innerHTML=html;
}
window.toggleCaptureMode=(on)=>{
  const el=$('scheduleArea');
  if(on){el.classList.add('capture-mode');window.scrollTo({top:0,behavior:'smooth'});toast('캡처 모드: 점수 입력란을 숨겼습니다.');}
  else el.classList.remove('capture-mode');
};
function shareMatchHTML(m){const score=m.done?`<div class="share-score">${esc(String(m.s1))} : ${esc(String(m.s2))}</div>`:'';return `<div class="share-match"><div class="share-match-head"><span>${m.game}경기 · 순서 ${m.wave}</span><span class="share-match-type">${m.type}</span></div><div class="share-teams"><div class="share-team">${esc(m.team1.join(' / '))}</div><div class="share-vs">VS</div><div class="share-team">${esc(m.team2.join(' / '))}</div></div>${score}</div>`}
window.openShareView=()=>{if(!schedule.length)return toast('먼저 대진을 생성하세요.');const courts=+$('courtCount').value;const now=new Date();const date=`${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;let html=`<h1 class="share-title">🎾 테니스 복식 대진표</h1><div class="share-sub">${date} · 총 ${schedule.length}경기 · ${players.length}명 참가</div><div class="share-grid">`;for(let c=1;c<=courts;c++){const ms=schedule.filter(m=>m.court===c);html+=`<section class="share-court"><h3>${c}코트 · ${[...courtRules[c]].join('+')}</h3>${ms.length?ms.map(shareMatchHTML).join(''):'<div class="share-match"><div class="share-team">배정 경기 없음</div></div>'}</section>`}html+='</div><div class="share-hint">스크린샷 준비를 누르면 버튼이 숨겨집니다. 화면을 한 번 누르면 다시 표시됩니다.</div>';$('shareWrap').innerHTML=html;$('shareOverlay').classList.add('show');$('shareOverlay').classList.remove('clean');document.body.style.overflow='hidden'};
window.closeShareView=()=>{$('shareOverlay').classList.remove('show','clean');document.body.style.overflow=''};
window.cleanShareView=()=>{$('shareOverlay').classList.add('clean')};
window.shareOverlayTap=e=>{if($('shareOverlay').classList.contains('clean')){$('shareOverlay').classList.remove('clean');e.stopPropagation()}};
function matchHTML(m){
  const result=m.done?(+m.s1===+m.s2?'무승부':(+m.s1>+m.s2?'팀1 승':'팀2 승')):'점수 입력';
  const capScore=m.done?`${esc(String(m.s1))} : ${esc(String(m.s2))}`:'';
  return `<div class="match"><div class="match-head"><span>${m.game}경기 · 순서 ${m.wave}</span><strong>${m.type}</strong></div><div class="teams"><div class="team">${esc(m.team1.join(' / '))}<div class="meta">실력합 ${m.lv1}</div></div><div class="vs">VS</div><div class="team">${esc(m.team2.join(' / '))}<div class="meta">실력합 ${m.lv2}</div></div></div><div class="capture-score">${capScore}</div><div class="score-row"><input class="score" type="number" min="0" value="${m.s1}" placeholder="0" onchange="setScore('${m.id}',1,this.value)"><span>:</span><input class="score" type="number" min="0" value="${m.s2}" placeholder="0" onchange="setScore('${m.id}',2,this.value)"><button class="btn small" onclick="saveScore('${m.id}')">저장</button></div><div class="status">${result}</div></div>`;
}
window.setScore=(id,n,v)=>{const m=schedule.find(x=>x.id===id);if(m)m[n===1?'s1':'s2']=v};
window.saveScore=id=>{const m=schedule.find(x=>x.id===id);if(!m)return;if(m.s1===''||m.s2==='')return toast('두 팀 점수를 모두 입력하세요.');if(+m.s1<0||+m.s2<0)return toast('점수는 0 이상이어야 합니다.');m.done=true;recalcStats();renderSchedule();renderRanking()};
function recalcStats(){initStats();for(const m of schedule.filter(x=>x.done)){const a=+m.s1,b=+m.s2;for(const n of m.team1){let s=stats[n];s.played++;s.gf+=a;s.ga+=b;a>b?s.win++:a<b?s.loss++:s.draw++}for(const n of m.team2){let s=stats[n];s.played++;s.gf+=b;s.ga+=a;b>a?s.win++:b<a?s.loss++:s.draw++}}}
function renderRanking(){const rows=players.map(p=>({p,s:stats[p.name]||{played:0,win:0,draw:0,loss:0,gf:0,ga:0}})).sort((a,b)=>(b.s.win*2+b.s.draw)-(a.s.win*2+a.s.draw)||(b.s.gf-b.s.ga)-(a.s.gf-a.s.ga)||b.s.win-a.s.win);let html='<div class="rank head"><span>#</span><span>이름</span><span>경기</span><span>승</span><span>무</span><span>패</span><span>득실</span></div>';rows.forEach((r,i)=>html+=`<div class="rank"><strong>${i+1}</strong><span class="name">${esc(r.p.name)} <small>Lv${r.p.level}</small></span><span>${r.s.played}</span><span>${r.s.win}</span><span>${r.s.draw}</span><span>${r.s.loss}</span><span>${r.s.gf-r.s.ga>0?'+':''}${r.s.gf-r.s.ga}</span></div>`);$('rankingArea').innerHTML=html}
function switchPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.page===id))}
function updateTotal(){$('totalGames').textContent=`총 ${(+mensGames.value||0)+(+mixedGames.value||0)+(+womensGames.value||0)}경기`}

$('closeShare').onclick=e=>{e.stopPropagation();closeShareView()};$('cleanShare').onclick=e=>{e.stopPropagation();cleanShareView()};$('addPlayer').onclick=addPlayer;$('openRoster').onclick=openRoster;$('closeRoster').onclick=()=>rosterModal.classList.remove('show');$('selectAll').onclick=()=>{document.querySelectorAll('.rosterCheck').forEach(x=>x.checked=true);updateSelected()};$('selectNone').onclick=()=>{document.querySelectorAll('.rosterCheck').forEach(x=>x.checked=false);updateSelected()};$('rosterList').onchange=updateSelected;$('loadSelected').onclick=loadSelected;$('exportRoster').onclick=exportRoster;$('importRosterBtn').onclick=()=>{const input=$('importRoster');input.value='';input.click()};$('importRoster').onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importRoster(f);};$('courtCount').onchange=renderCourtRules;$('partnerMode').onchange=renderFixed;['mensGames','mixedGames','womensGames'].forEach(id=>$(id).oninput=updateTotal);$('generate').onclick=generate;$('resetMatches').onclick=()=>{schedule=[];initStats();renderSchedule();renderRanking()};document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchPage(t.dataset.page));$('name').onkeydown=e=>{if(e.key==='Enter')addPlayer()};
renderPlayers();renderCourtRules();renderFixed();initStats();renderRanking();updateTotal();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
