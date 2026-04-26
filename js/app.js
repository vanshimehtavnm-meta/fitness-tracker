
// ── Navigation ────────────────────────────────────────────────
function nav(p) {
  document.querySelectorAll('.nav-a').forEach(el=>el.classList.toggle('active', el.dataset.p===p));
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active', el.id==='page-'+p));
  if(p==='dashboard') buildDash();
  if(p==='trends') buildTrends();
  if(p==='workout') buildWorkout();
  if(p==='meals') renderMeals();
  if(p==='assistant') initChat();
  if(p==='cycle') renderCycle();
}
document.querySelectorAll('.nav-a').forEach(el=>el.addEventListener('click',(e)=>nav(e.currentTarget.dataset.p)));

// ── Toast & confirm ───────────────────────────────────────────
function toast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}
function confirm(id,msg='✓ Saved') {
  const el=document.getElementById(id); if(!el) return;
  el.textContent=msg; setTimeout(()=>el.textContent='',3000);
}

// ── Init meta ─────────────────────────────────────────────────
(function initMeta(){
  const now=new Date();
  const h=now.getHours();
  document.getElementById('greeting').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+' ✦';
  const fmt=now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('dash-date').textContent=fmt;
  document.getElementById('log-date-lbl').textContent=fmt;
  document.getElementById('sidebar-date').textContent=now.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
})();

// ── Sleep quick pills ─────────────────────────────────────────
(function initSleepPills(){
  const row=document.getElementById('sleep-pills');
  [5,6,6.5,7,7.5,8,9].forEach(h=>{
    const b=document.createElement('button');
    b.className='pill'; b.textContent=h+'h';
    b.dataset.action = 'quick-sleep';
    b.dataset.val = h;
    row.appendChild(b);
  });
})();

// ── Exercise quick pills ──────────────────────────────────────
(function initExPills(){
  const row=document.getElementById('ex-pills');
  [{l:'Walk 20m',t:'Walking',d:20},{l:'Walk 30m',t:'Walking',d:30},{l:'Run 30m',t:'Running',d:30},{l:'Yoga 45m',t:'Yoga',d:45},{l:'Gym 60m',t:'Gym',d:60}].forEach((opt, idx)=>{
    const b=document.createElement('button');
    b.className='pill'; b.textContent=opt.l;
    b.dataset.action = 'quick-ex';
    b.dataset.idx = idx;
    row.appendChild(b);
  });
})();
const QUICK_EX = [{l:'Walk 20m',t:'Walking',d:20},{l:'Walk 30m',t:'Walking',d:30},{l:'Run 30m',t:'Running',d:30},{l:'Yoga 45m',t:'Yoga',d:45},{l:'Gym 60m',t:'Gym',d:60}];

// ── Water dots ────────────────────────────────────────────────
function renderWater() {
  const log=getLog(todayStr());
  const w=log.water||0;
  const container=document.getElementById('water-dots');
  container.innerHTML='';
  for(let i=0;i<8;i++){
    const d=document.createElement('div');
    d.className='wd'+(i<w?' on':'');
    d.dataset.action = 'log-water';
    d.dataset.idx = i;
    container.appendChild(d);
  }
  document.getElementById('water-lbl').textContent=(w||0)+' / 8 glasses';
}

// ── Mood buttons ──────────────────────────────────────────────
let selMood=null;
document.querySelectorAll('.mb').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    const target = e.currentTarget;
    document.querySelectorAll('.mb').forEach(b=>{b.classList.remove('on');b.style.borderColor='';b.style.background='';});
    target.classList.add('on');
    target.style.borderColor=target.dataset.c;
    target.style.background=target.dataset.c+'22';
    selMood=parseInt(target.dataset.v);
  });
});

// ── Log functions ─────────────────────────────────────────────
function logSleep() {
  const v=parseFloat(document.getElementById('sleep-inp').value);
  const q=document.getElementById('sleep-q').value;
  if(isNaN(v)||v<0||v>24) return toast('Enter valid hours (0–24)');
  const log=getLog(todayStr());
  log.sleep=v; if(q) log.sleepQ=parseInt(q);
  save(); confirm('sv-sleep'); toast('Sleep saved ✓');
}
function logMood() {
  if(!selMood) return toast('Pick a mood first');
  getLog(todayStr()).mood=selMood; save(); confirm('sv-mood'); toast('Mood saved ✓');
}
function logEx() {
  const d=parseInt(document.getElementById('ex-min').value);
  const t=document.getElementById('ex-type').value;
  if(!d||d<0) return toast('Enter duration');
  const log=getLog(todayStr());
  log.exercise=(log.exercise||0)+d; log.exType=t;
  save(); confirm('sv-ex'); toast('Exercise saved ✓');
}
function logWeight() {
  const v=parseFloat(document.getElementById('wt-inp').value);
  if(isNaN(v)||v<20) return toast('Enter valid weight');
  getLog(todayStr()).weight=v; save(); confirm('sv-wt'); toast('Weight saved ✓');
}
function logNotes() {
  const v=document.getElementById('notes-inp').value.trim();
  if(!v) return toast('Write something first');
  getLog(todayStr()).notes=v; save(); confirm('sv-notes'); toast('Notes saved ✓');
}

// ── Dashboard ─────────────────────────────────────────────────
let dbCharts={};
function destroyChart(id) { if(dbCharts[id]){dbCharts[id].destroy();delete dbCharts[id];} }

function buildDash() {
  const days7=daysBack(7);
  const log=getLog(todayStr());
  const sleeps=daysBack(14).map(d=>S.logs[d]?.sleep??null);
  const waters=daysBack(14).map(d=>S.logs[d]?.water??null);
  const exs=daysBack(14).map(d=>S.logs[d]?.exercise??null);
  const totCals=(log.meals||[]).reduce((a,m)=>a+m.cals,0);
  const moodMap={1:'Very low',3:'Low',5:'Neutral',7:'Good',9:'Great'};
  const wts=daysBack(14).map(d=>S.logs[d]?.weight).filter(Boolean);
  const kpis=[
    {l:'Avg sleep',v:avg(sleeps)?avg(sleeps)+'h':'–',s:'14-day avg',c:'var(--green)'},
    {l:'Avg water',v:avg(waters)?avg(waters)+' gl':'–',s:'glasses/day',c:'var(--blue)'},
    {l:'Avg exercise',v:avg(exs)?avg(exs)+'m':'–',s:'min/day',c:'#9B72CF'},
    {l:"Today's mood",v:log.mood?moodMap[log.mood]:'–',s:'logged today',c:'var(--pink)'},
    {l:'Calories today',v:totCals>0?totCals+' kcal':'–',s:'goal: '+S.calGoal,c:'var(--amber)'},
    {l:'Weight',v:wts.slice(-1)[0]?wts.slice(-1)[0]+'kg':'–',s:'latest entry',c:'var(--ink2)'},
  ];
  document.getElementById('kpi-strip').innerHTML=kpis.map(k=>`
    <div class="kpi"><div class="kpi-l">${k.l}</div><div class="kpi-v" style="color:${k.c}">${k.v}</div><div class="kpi-s">${k.s}</div></div>`).join('');

  const labels=days7.map(shortLabel);
  destroyChart('db-week');
  dbCharts['db-week']=new Chart(document.getElementById('db-week'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'Sleep (h)',data:days7.map(d=>S.logs[d]?.sleep??null),backgroundColor:'#A8D9BB',borderRadius:4,yAxisID:'y'},
      {label:'Water (gl)',data:days7.map(d=>S.logs[d]?.water??null),backgroundColor:'#B5D4F4',borderRadius:4,yAxisID:'y'},
      {label:'Exercise (/6 min)',data:days7.map(d=>S.logs[d]?.exercise?+(S.logs[d].exercise/6).toFixed(1):null),backgroundColor:'#C4BFF0',borderRadius:4,yAxisID:'y'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11,family:"'DM Sans'"},color:'#A89A88',boxWidth:10,padding:12}}},scales:{x:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#A89A88'}},y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#A89A88'},min:0,max:12}}}
  });

  destroyChart('db-mood');
  dbCharts['db-mood']=new Chart(document.getElementById('db-mood'),{
    type:'line',
    data:{labels,datasets:[{data:days7.map(d=>S.logs[d]?.mood??null),borderColor:'var(--pink)',backgroundColor:'rgba(184,66,95,.1)',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'var(--pink)',spanGaps:true}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#A89A88'}},y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#A89A88'},min:0,max:10}}}
  });

  // Cycle snap
  const ci=getCycleInfo();
  const snapEl=document.getElementById('cycle-snap');
  const PMETA={
    menstrual:{label:'Menstrual phase',bg:'#FAEEF1',c:'#8B2242',note:'Energy is low. Gentle movement and rest work best.'},
    follicular:{label:'Follicular phase',bg:'#E6F3EE',c:'var(--green)',note:'Energy rising. Great time to push harder.'},
    ovulation:{label:'Ovulation phase',bg:'var(--amber-l)',c:'var(--amber)',note:'Peak energy and strength. Go for it!'},
    luteal:{label:'Luteal phase',bg:'var(--blue-l)',c:'var(--blue)',note:'Energy dipping. Moderate activity is ideal.'},
  };
  if(ci){
    const m=PMETA[ci.phase];
    snapEl.innerHTML=`<div style="background:${m.bg};border-radius:var(--r-sm);padding:.8rem 1rem;margin-bottom:8px"><div style="font-family:'Lora',serif;font-size:18px;color:${m.c};letter-spacing:-.02em;margin-bottom:2px">${m.label}</div><div style="font-size:12px;color:${m.c}CC">Day ${ci.day} of cycle</div></div><div style="font-size:13px;color:var(--ink2);line-height:1.6;margin-bottom:10px">${m.note}</div><button class="btn" style="font-size:12px;padding:6px 14px" data-action="nav" data-target="workout">See today's workout →</button>`;
  } else {
    snapEl.innerHTML=`<div style="font-size:13px;color:var(--ink3);padding:8px 0">Set up your cycle in the Cycle tab to see phase insights here.</div><button class="btn" style="font-size:12px;padding:6px 14px;margin-top:6px" data-action="nav" data-target="cycle">Set up cycle →</button>`;
  }
  loadInsight();
}

// ── Daily AI insight ──────────────────────────────────────────
async function loadInsight() {
  const el=document.getElementById('chip-txt');
  el.textContent='Generating your insight…';
  const ci=getCycleInfo();
  const days7=daysBack(7);
  const ctx=`avg_sleep=${avg(days7.map(d=>S.logs[d]?.sleep??null))||'?'}h, avg_water=${avg(days7.map(d=>S.logs[d]?.water??null))||'?'} glasses, cycle=${ci?ci.phase+' day '+ci.day:'not set'}`;
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:60,
        messages:[{role:'user',content:`Health stats: ${ctx}. Give ONE short uplifting health tip (max 16 words). No greeting, just the tip.`}]})
    });
    if(!r.ok) throw new Error('API '+r.status);
    const data=await r.json();
    const txt=data.content?.find(c=>c.type==='text')?.text?.trim();
    el.textContent=txt||'Stay consistent — small daily habits create lasting change.';
  } catch(e) {
    el.textContent='Stay consistent — small daily habits create lasting change.';
  }
}

// ── Meals ─────────────────────────────────────────────────────
let selMealType='Breakfast';
let lastSearchResults=[];
let macroChartInst=null;

document.querySelectorAll('.mt').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    const target = e.currentTarget;
    document.querySelectorAll('.mt').forEach(b=>b.classList.remove('on'));
    target.classList.add('on'); selMealType=target.dataset.t;
  });
});

function setGoal() {
  const v=parseInt(document.getElementById('goal-inp').value);
  if(!v||v<300) return toast('Enter a valid goal (300+)');
  S.calGoal=v; save(); renderMeals(); toast('Goal updated ✓');
}

function toggleManual() {
  const f=document.getElementById('manual-form');
  f.style.display=f.style.display==='none'?'block':'none';
}

function addManual() {
  const name=document.getElementById('m-name').value.trim();
  const cals=parseInt(document.getElementById('m-cals').value)||0;
  if(!name) return toast('Enter a food name');
  if(!cals) return toast('Enter calories');
  addMealEntry({name,cals,protein:parseInt(document.getElementById('m-prot').value)||0,carbs:parseInt(document.getElementById('m-carbs').value)||0,fat:parseInt(document.getElementById('m-fat').value)||0});
  ['m-name','m-cals','m-prot','m-carbs','m-fat'].forEach(id=>document.getElementById(id).value='');
}

function addMealEntry(item) {
  const log=getLog(todayStr());
  log.meals.push({name:item.name,cals:item.cals,protein:item.protein||0,carbs:item.carbs||0,fat:item.fat||0,type:selMealType});
  save(); renderMeals(); toast(item.name+' added ✓');
  document.getElementById('food-inp').value='';
  document.getElementById('food-results').innerHTML='';
  lastSearchResults=[];
}

function deleteMeal(i) {
  const log=getLog(todayStr());
  log.meals.splice(i,1); save(); renderMeals(); toast('Removed');
}

function renderMeals() {
  const log=getLog(todayStr());
  const meals=log.meals||[];
  const goal=S.calGoal||2000;
  const totCals=meals.reduce((a,m)=>a+m.cals,0);
  const totProt=meals.reduce((a,m)=>a+(m.protein||0),0);
  const totCarbs=meals.reduce((a,m)=>a+(m.carbs||0),0);
  const totFat=meals.reduce((a,m)=>a+(m.fat||0),0);
  const over=Math.max(0,totCals-goal);
  const rem=Math.max(0,goal-totCals);
  const pct=Math.min(100,Math.round(totCals/goal*100));
  const inp=document.getElementById('goal-inp');
  if(inp&&!inp.value) inp.value=goal;

  document.getElementById('cal-kpis').innerHTML=`
    <div class="ck"><div class="ck-v">${totCals}</div><div class="ck-l">consumed</div></div>
    <div class="ck"><div class="ck-v" style="color:${over>0?'var(--pink)':'var(--green)'}">${over>0?'+'+over:rem}</div><div class="ck-l">${over>0?'over goal':'remaining'}</div></div>
    <div class="ck"><div class="ck-v">${totProt}g</div><div class="ck-l">protein</div></div>`;

  const bar=document.getElementById('cal-bar');
  bar.style.width=pct+'%';
  bar.className='cal-bar-fill'+(pct>100?' over':pct>85?' warn':'');
  document.getElementById('cal-bar-lbl').textContent=pct+'% of '+goal+' kcal goal';

  if(macroChartInst){macroChartInst.destroy();macroChartInst=null;}
  if(totProt+totCarbs+totFat>0){
    macroChartInst=new Chart(document.getElementById('macro-chart'),{
      type:'doughnut',
      data:{labels:['Protein','Carbs','Fat'],datasets:[{data:[totProt,totCarbs,totFat],backgroundColor:['#A8D9BB','#FAC775','#F0BCC8'],borderWidth:0,hoverOffset:4}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'right',labels:{font:{size:11,family:"'DM Sans'"},color:'#6B5E50',boxWidth:10,padding:10}}}}
    });
  }

  const types=['Breakfast','Lunch','Dinner','Snack'];
  let html=meals.length===0?'<div class="meal-empty">No meals logged yet. Use the AI search above!</div>':'';
  types.forEach(type=>{
    const group=meals.filter(m=>m.type===type);
    if(!group.length) return;
    html+=`<div class="meal-group-lbl">${type}</div>`;
    group.forEach(m=>{
      const ri=meals.indexOf(m);
      const mac=[m.protein?m.protein+'g P':'',m.carbs?m.carbs+'g C':'',m.fat?m.fat+'g F':''].filter(Boolean).join(' · ');
      html+=`<div class="meal-entry"><div class="me-name">${m.name}</div>${mac?`<div class="me-macro">${mac}</div>`:''}<div class="me-cals">${m.cals} kcal</div><button class="me-del" data-action="delete-meal" data-index="${ri}">×</button></div>`;
    });
  });
  document.getElementById('meal-log').innerHTML=html;
}

// ── AI food search ────────────────────────────────────────────
// Built-in food database (Indian + common foods)
const FOOD_DB={
  'rice':{name:'Cooked white rice',cals:205,protein:4,carbs:45,fat:0,unit:'1 cup'},
  'brown rice':{name:'Brown rice',cals:215,protein:5,carbs:45,fat:2,unit:'1 cup'},
  'roti':{name:'Roti / Chapati',cals:120,protein:3,carbs:22,fat:2,unit:'1 piece'},
  'paratha':{name:'Plain paratha',cals:200,protein:4,carbs:28,fat:8,unit:'1 piece'},
  'aloo paratha':{name:'Aloo paratha',cals:260,protein:5,carbs:36,fat:10,unit:'1 piece'},
  'dal':{name:'Dal (yellow)',cals:180,protein:10,carbs:30,fat:2,unit:'1 bowl'},
  'dal tadka':{name:'Dal tadka',cals:220,protein:11,carbs:32,fat:6,unit:'1 bowl'},
  'rajma':{name:'Rajma',cals:230,protein:14,carbs:38,fat:3,unit:'1 bowl'},
  'chole':{name:'Chole / chana masala',cals:240,protein:13,carbs:36,fat:6,unit:'1 bowl'},
  'paneer':{name:'Paneer',cals:265,protein:11,carbs:1,fat:20,unit:'100g'},
  'palak paneer':{name:'Palak paneer',cals:290,protein:13,carbs:12,fat:22,unit:'1 bowl'},
  'paneer butter masala':{name:'Paneer butter masala',cals:350,protein:12,carbs:15,fat:28,unit:'1 bowl'},
  'chicken':{name:'Chicken breast (cooked)',cals:165,protein:31,carbs:0,fat:3,unit:'100g'},
  'butter chicken':{name:'Butter chicken',cals:380,protein:30,carbs:14,fat:24,unit:'1 bowl'},
  'chicken biryani':{name:'Chicken biryani',cals:490,protein:28,carbs:62,fat:14,unit:'1 plate'},
  'veg biryani':{name:'Veg biryani',cals:380,protein:9,carbs:68,fat:9,unit:'1 plate'},
  'biryani':{name:'Veg biryani',cals:380,protein:9,carbs:68,fat:9,unit:'1 plate'},
  'idli':{name:'Idli',cals:70,protein:2,carbs:13,fat:0.5,unit:'1 piece'},
  'dosa':{name:'Plain dosa',cals:165,protein:4,carbs:30,fat:4,unit:'1 piece'},
  'masala dosa':{name:'Masala dosa',cals:280,protein:6,carbs:42,fat:10,unit:'1 piece'},
  'sambar':{name:'Sambar',cals:130,protein:6,carbs:18,fat:4,unit:'1 bowl'},
  'upma':{name:'Upma',cals:220,protein:5,carbs:35,fat:7,unit:'1 bowl'},
  'poha':{name:'Poha',cals:250,protein:5,carbs:40,fat:8,unit:'1 bowl'},
  'khichdi':{name:'Dal khichdi',cals:250,protein:10,carbs:42,fat:5,unit:'1 bowl'},
  'aloo sabzi':{name:'Aloo sabzi',cals:180,protein:3,carbs:28,fat:7,unit:'1 bowl'},
  'egg':{name:'Boiled egg',cals:78,protein:6,carbs:1,fat:5,unit:'1 large'},
  'oats':{name:'Oatmeal',cals:150,protein:5,carbs:27,fat:3,unit:'1 cup'},
  'milk':{name:'Whole milk',cals:150,protein:8,carbs:12,fat:8,unit:'250ml'},
  'curd':{name:'Curd / dahi',cals:100,protein:6,carbs:8,fat:4,unit:'1 bowl'},
  'yogurt':{name:'Yogurt',cals:100,protein:6,carbs:8,fat:4,unit:'1 bowl'},
  'banana':{name:'Banana',cals:105,protein:1,carbs:27,fat:0,unit:'1 medium'},
  'apple':{name:'Apple',cals:95,protein:0,carbs:25,fat:0,unit:'1 medium'},
  'mango':{name:'Mango',cals:150,protein:2,carbs:38,fat:1,unit:'1 medium'},
  'orange':{name:'Orange',cals:65,protein:1,carbs:16,fat:0,unit:'1 medium'},
  'chai':{name:'Chai with milk & sugar',cals:60,protein:2,carbs:10,fat:2,unit:'1 cup'},
  'coffee':{name:'Coffee with milk',cals:50,protein:2,carbs:6,fat:2,unit:'1 cup'},
  'sandwich':{name:'Veg sandwich',cals:220,protein:7,carbs:32,fat:7,unit:'1 piece'},
  'almonds':{name:'Almonds',cals:70,protein:3,carbs:2,fat:6,unit:'10 pieces'},
  'nuts':{name:'Mixed nuts',cals:180,protein:5,carbs:6,fat:16,unit:'30g handful'},
  'peanut butter':{name:'Peanut butter',cals:190,protein:7,carbs:6,fat:16,unit:'2 tbsp'},
  'pizza':{name:'Pizza (cheese)',cals:285,protein:12,carbs:36,fat:10,unit:'1 slice'},
  'burger':{name:'Veggie burger',cals:350,protein:14,carbs:42,fat:14,unit:'1 burger'},
  'pasta':{name:'Pasta with sauce',cals:380,protein:14,carbs:58,fat:10,unit:'1 plate'},
  'noodles':{name:'Noodles (cooked)',cals:220,protein:7,carbs:40,fat:3,unit:'1 bowl'},
};

async function searchFood() {
  const raw=document.getElementById('food-inp').value.trim().toLowerCase();
  if(!raw) return toast('Type a food name first');
  const btn=document.getElementById('search-btn');
  const resEl=document.getElementById('food-results');
  btn.disabled=true; btn.textContent='Searching…';
  resEl.innerHTML='<div style="font-size:13px;color:var(--ink3);padding:8px 0">Looking up nutrition…</div>';

  // Check local DB first (exact or partial match)
  const localMatches=Object.entries(FOOD_DB).filter(([k])=>k.includes(raw)||raw.includes(k));
  if(localMatches.length>0){
    const items=localMatches.slice(0,3).map(([,v])=>v);
    lastSearchResults=items;
    renderFoodResults(items);
    btn.disabled=false;
    btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Search';
    return;
  }

  // Fallback to AI
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:300,
        messages:[{role:'user',content:`Nutrition database lookup. Food: "${raw}". Return ONLY a JSON array of 1-3 serving options with no markdown, no explanation. Schema: [{"name":"string","cals":number,"protein":number,"carbs":number,"fat":number,"unit":"string"}]. Use realistic Indian or international values.`}]})
    });
    if(!r.ok) throw new Error('API '+r.status);
    const data=await r.json();
    const txt=data.content?.find(c=>c.type==='text')?.text?.trim()||'[]';
    const clean=txt.replace(/```json|```/g,'').trim();
    let items=[];
    try{items=JSON.parse(clean);}catch(e){items=[];}
    if(!items.length) throw new Error('No results');
    lastSearchResults=items;
    renderFoodResults(items);
  } catch(e) {
    resEl.innerHTML=`<div style="font-size:13px;color:var(--ink3);padding:6px 0">Couldn't find "${raw}". Try being more specific, or use manual entry below.</div>`;
  } finally {
    btn.disabled=false;
    btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Search';
  }
}

function renderFoodResults(items) {
  const el=document.getElementById('food-results');
  el.innerHTML=items.map((item,i)=>`
    <div class="food-result" data-action="add-food" data-index="${i}">
      <div style="flex:1; pointer-events:none;">
        <div class="fr-name">${item.name}</div>
        <div class="fr-macros">${item.unit||''} · P:${item.protein}g · C:${item.carbs}g · F:${item.fat}g</div>
      </div>
      <div class="fr-cals" style="pointer-events:none;">${item.cals} kcal</div>
      <div class="fr-add" style="pointer-events:none;">+ Add</div>
    </div>`).join('');
}

// ── Workout ───────────────────────────────────────────────────
const WORKOUTS={
  menstrual:[
    {n:'Gentle yoga & stretching',d:'20–30 min',i:1,desc:'Restorative poses — child\'s pose, supine twists, hip openers. Rest is valid on heavy days.'},
    {n:'Slow walking',d:'20–30 min',i:1,desc:'Light movement eases cramps and lifts mood without taxing your body. Keep pace comfortable.'},
    {n:'Breathing & meditation',d:'15 min',i:0,desc:'Diaphragmatic breathing and body-scan to ease discomfort and lower cortisol.'},
  ],
  follicular:[
    {n:'Cardio run or jog',d:'30–45 min',i:3,desc:'Rising estrogen means more energy and higher pain tolerance. Great for steady-state runs.'},
    {n:'Lower body strength',d:'40–50 min',i:3,desc:'Squats, lunges, deadlifts. Estrogen supports muscle building — push for progressive overload.'},
    {n:'HIIT or cycling',d:'25–35 min',i:4,desc:'40s on / 20s rest intervals. Your recovery is faster now — make the most of it.'},
    {n:'Dance or Zumba',d:'30–40 min',i:3,desc:'High-motivation phase. Social cardio that feels energising, not draining.'},
  ],
  ovulation:[
    {n:'Peak performance session',d:'45–60 min',i:5,desc:'Testosterone peaks — your absolute strongest phase. Attempt personal bests in anything.'},
    {n:'Group fitness or sport',d:'45–60 min',i:5,desc:'Energy and confidence at their highest. Team sports or boot camp will feel electric.'},
    {n:'Upper body strength',d:'40–50 min',i:4,desc:'Bench press, rows, shoulder press, pull-ups. Build on follicular momentum.'},
  ],
  luteal:[
    {n:'Pilates or barre',d:'30–40 min',i:2,desc:'Progesterone rises, energy dips. Low-impact movement that builds core without spiking cortisol.'},
    {n:'Swimming',d:'30–40 min',i:2,desc:'Buoyancy reduces joint stress — perfect for pre-period heaviness. Full-body without strain.'},
    {n:'Moderate strength',d:'35–45 min',i:3,desc:'Slightly reduce weights from ovulation peak. Focus on form over max effort.'},
    {n:'Yin yoga',d:'30–45 min',i:1,desc:'Long-held passive stretches. Reduces PMS tension and improves sleep quality.'},
  ],
};
const PMETA={
  menstrual:{label:'Menstrual phase',bg:'#FAEEF1',c:'#8B2242',note:'Energy is low. Rest and gentle movement are your best friends today.'},
  follicular:{label:'Follicular phase',bg:'#E6F3EE',c:'var(--green)',note:'Energy and strength are rising. A great time to challenge yourself.'},
  ovulation:{label:'Ovulation phase',bg:'var(--amber-l)',c:'var(--amber)',note:'Peak energy, strength, and coordination. Your body is primed to perform.'},
  luteal:{label:'Luteal phase',bg:'var(--blue-l)',c:'var(--blue)',note:'Progesterone rises and energy gradually dips. Moderate intensity works best.'},
};
const ILVL=['Rest','Very light','Light','Moderate','Hard','Peak'];

function buildWorkout() {
  const ci=getCycleInfo();
  const phase=ci?.phase||null;
  const el=document.getElementById('workout-content');
  if(!phase){
    el.innerHTML=`<div class="phase-banner" style="background:var(--surface2);border-color:var(--border)"><div class="phase-name" style="color:var(--ink2)">No cycle data</div><div class="phase-note">Add your period start date in the Cycle tab to get phase-specific workouts.</div></div><button class="btn" data-action="nav" data-target="cycle">Set up cycle →</button>`;
    // Show generic workouts anyway
    const generic=WORKOUTS.follicular;
    let html='<div class="wk-grid" style="margin-top:16px">';
    generic.forEach(w=>{ html+=workoutCard(w,{c:'var(--ink3)',bg:'var(--surface2)'}); });
    el.innerHTML=el.innerHTML+html+'</div>';
    return;
  }
  const meta=PMETA[phase];
  const list=WORKOUTS[phase];
  let html=`<div class="phase-banner" style="background:${meta.bg};border-color:${meta.c}33">
    <div class="phase-name" style="color:${meta.c}">${meta.label}${ci?' — day '+ci.day:''}</div>
    <div class="phase-note" style="color:${meta.c}CC">${meta.note}</div>
  </div><div class="wk-grid">`;
  list.forEach(w=>{ html+=workoutCard(w,meta); });
  el.innerHTML=html+'</div>';
}

function workoutCard(w,meta) {
  let pips='';
  for(let p=0;p<5;p++) pips+=`<div class="pip${p<w.i?' '+(w.i<=2?'low':w.i<=3?'med':'hi'):''}"></div>`;
  return `<div class="wk-card"><div class="wk-name">${w.n}</div><div class="wk-meta">${w.d} · ${ILVL[w.i]}</div><div class="wk-desc">${w.desc}</div><div class="wk-pips">${pips}</div></div>`;
}

// ── Cycle ─────────────────────────────────────────────────────
function renderCycle() {
  const {start,perLen,len}=S.cycle;
  if(start) document.getElementById('cyc-start').value=start;
  document.getElementById('cyc-per-len').value=perLen||5;
  document.getElementById('cyc-len').value=len||28;

  const ci=getCycleInfo();
  const statusEl=document.getElementById('cyc-status');
  const guideEl=document.getElementById('phase-guide');
  const grid=document.getElementById('cyc-grid');
  const labelsEl=document.getElementById('cyc-day-labels');

  // Day labels
  labelsEl.innerHTML=['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="cyc-lbl">${d}</div>`).join('');

  if(!ci){
    statusEl.textContent='Enter your last period start date above and click Save.';
    guideEl.textContent='Set up your cycle to see phase information here.';
    grid.innerHTML='';
    return;
  }

  // Status message
  const {day,phase,ovDay,fertStart,pl,cl}=ci;
  const daysUntilNext=cl-day+1;
  let statusMsg='';
  if(phase==='menstrual') statusMsg=`Day ${day} of your period. Take it easy today.`;
  else if(phase==='follicular') statusMsg=`Day ${day} of cycle — follicular phase. Energy is building.`;
  else if(phase==='ovulation') statusMsg=`Day ${day} of cycle — ovulation window. You're at your peak!`;
  else statusMsg=`Day ${day} of cycle — luteal phase. Period expected in ~${daysUntilNext} days.`;
  statusEl.textContent=statusMsg;

  // Phase guide
  const guides={
    menstrual:'Your body is shedding the uterine lining. Oestrogen and progesterone are at their lowest. Focus on iron-rich foods, hydration, and gentle movement.',
    follicular:'Oestrogen rises steadily. Energy, creativity, and motivation increase. Ideal time for starting new habits, strength training, and social activities.',
    ovulation:'LH surge triggers egg release. You\'re strongest and most energetic. Prioritise challenging workouts and high-protein meals.',
    luteal:'Progesterone rises. PMS symptoms may appear in the second half. Focus on magnesium-rich foods, stress management, and recovery.',
  };
  guideEl.innerHTML=`<strong style="color:var(--ink)">${['menstrual','follicular','ovulation','luteal'].includes(phase)?phase.charAt(0).toUpperCase()+phase.slice(1)+' phase':''}</strong><br>${guides[phase]||''}`;

  // Calendar — offset by start day of week
  const startDate=dateFromStr(start);
  const startDow=startDate.getDay(); // 0=Sun
  grid.innerHTML='';
  // Blank cells before cycle day 1
  for(let i=0;i<startDow;i++){
    const blank=document.createElement('div');
    blank.style.visibility='hidden'; blank.className='cyc-day';
    grid.appendChild(blank);
  }
  const todayDate=dateFromStr(todayStr());
  for(let i=1;i<=cl;i++){
    const d=document.createElement('div');
    d.className='cyc-day';
    d.textContent=i;
    // Phase colouring
    if(i<=pl) d.classList.add('period');
    else if(i===ovDay) d.classList.add('ovulation');
    else if(i>=fertStart&&i<=ovDay+1) d.classList.add('fertile');
    // Today marker
    const thisDate=new Date(startDate); thisDate.setDate(startDate.getDate()+(i-1));
    if(thisDate.getFullYear()===todayDate.getFullYear()&&thisDate.getMonth()===todayDate.getMonth()&&thisDate.getDate()===todayDate.getDate()){
      d.classList.add('today');
    }
    grid.appendChild(d);
  }
}

function saveCycle() {
  const dateVal=document.getElementById('cyc-start').value.trim();
  const perLen=parseInt(document.getElementById('cyc-per-len').value);
  const len=parseInt(document.getElementById('cyc-len').value);
  if(!dateVal) return toast('Please select your last period start date');
  // Validate date format YYYY-MM-DD
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return toast('Invalid date format');
  const parsed=dateFromStr(dateVal);
  if(!parsed) return toast('Invalid date');
  if(perLen<1||perLen>15) return toast('Period length should be 1–15 days');
  if(len<18||len>60) return toast('Cycle length should be 18–60 days');
  S.cycle={start:dateVal,perLen,len};
  save();
  renderCycle();
  toast('Cycle saved ✓');
}

// ── Trends ────────────────────────────────────────────────────
function buildTrends() {
  const days=daysBack(30);
  const labels=days.map(shortLabel);
  const CO={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{x:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:10,family:"'DM Sans'"},color:'#A89A88',maxRotation:45,autoSkip:true,maxTicksLimit:10}},
      y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11,family:"'DM Sans'"},color:'#A89A88'},min:0}}};
  [
    {id:'t-sleep',data:days.map(d=>S.logs[d]?.sleep??null),color:'var(--green)',fill:'rgba(37,121,90,.1)',type:'line'},
    {id:'t-water',data:days.map(d=>S.logs[d]?.water??null),color:'var(--blue)',fill:'var(--blue)',type:'bar'},
    {id:'t-ex',data:days.map(d=>S.logs[d]?.exercise??null),color:'#9B72CF',fill:'#9B72CF',type:'bar'},
    {id:'t-mood',data:days.map(d=>S.logs[d]?.mood??null),color:'var(--pink)',fill:'rgba(184,66,95,.1)',type:'line'},
    {id:'t-cals',data:days.map(d=>S.logs[d]?.meals?.reduce((a,m)=>a+m.cals,0)??null),color:'var(--amber)',fill:'var(--amber)',type:'bar'},
    {id:'t-wt',data:days.map(d=>S.logs[d]?.weight??null),color:'var(--ink2)',fill:'rgba(107,94,80,.1)',type:'line'},
  ].forEach(({id,data,color,fill,type})=>{
    destroyChart(id);
    dbCharts[id]=new Chart(document.getElementById(id),{
      type,
      data:{labels,datasets:[{data,borderColor:color,backgroundColor:type==='line'?fill:color+'BB',fill:type==='line',tension:0.35,pointRadius:2,pointBackgroundColor:color,borderRadius:4,spanGaps:true}]},
      options:CO
    });
  });
}

// ── AI Chat ───────────────────────────────────────────────────
let chatHistory=[];
const SUGGESTIONS=['Analyse my sleep this week','What should I eat today?','Workout tip for my phase','How are my calories trending?','What does my mood pattern look like?'];

function initChat() {
  const sugsEl=document.getElementById('ai-sugs');
  if(!sugsEl.innerHTML){
    sugsEl.innerHTML=SUGGESTIONS.map(s=>`<button class="ai-sug" data-action="chat-sug" data-sug="${s}">${s}</button>`).join('');
  }
  if(chatHistory.length===0){
    appendMsg('ai','Hi! I\'m your personal health assistant. I can see your logged data and help you understand patterns, suggest meals, explain your cycle, or answer health questions. What\'s on your mind?');
  }
}

function appendMsg(role,text) {
  const win=document.getElementById('chat-win');
  const div=document.createElement('div');
  div.className='msg '+role;
  div.innerHTML=`<div class="msg-av">${role==='ai'?'✦':'👤'}</div><div class="msg-bub">${text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
  win.appendChild(div);
  win.scrollTop=win.scrollHeight;
}

function addTyping() {
  const win=document.getElementById('chat-win');
  const div=document.createElement('div');
  div.className='msg ai'; div.id='typing-dot';
  div.innerHTML=`<div class="msg-av">✦</div><div class="msg-bub"><div class="typing"><span></span><span></span><span></span></div></div>`;
  win.appendChild(div); win.scrollTop=win.scrollHeight;
}
function removeTyping() { document.getElementById('typing-dot')?.remove(); }

function buildContext() {
  const d14=daysBack(14);
  const log=getLog(todayStr());
  const ci=getCycleInfo();
  const totCals=(log.meals||[]).reduce((a,m)=>a+m.cals,0);
  return `User health data (use this to give specific, personalised answers):
- Avg sleep (14 days): ${avg(d14.map(d=>S.logs[d]?.sleep??null))||'no data'}h
- Avg water (14 days): ${avg(d14.map(d=>S.logs[d]?.water??null))||'no data'} glasses/day
- Avg exercise (14 days): ${avg(d14.map(d=>S.logs[d]?.exercise??null))||'no data'} min/day
- Today's calories: ${totCals} kcal (goal: ${S.calGoal} kcal)
- Cycle phase: ${ci?ci.phase+', day '+ci.day+' of '+ci.cl:'not set up'}
- Recent moods (14 days, scale 1–9): ${d14.map(d=>S.logs[d]?.mood??'–').join(', ')}
- Latest weight: ${d14.map(d=>S.logs[d]?.weight).filter(Boolean).slice(-1)[0]||'not logged'} kg
- Today's notes: ${log.notes||'none'}`;
}

async function sendChat(text) {
  const inp=document.getElementById('chat-inp');
  const msg=(typeof text==='string'&&text.trim())?text.trim():inp.value.trim();
  if(!msg) return;
  inp.value='';
  appendMsg('user',msg);
  chatHistory.push({role:'user',content:msg});
  if(chatHistory.length>20) chatHistory=chatHistory.slice(-20);
  addTyping();
  try {
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',max_tokens:500,
        system:`You are a warm, knowledgeable personal health assistant inside a health tracking app. Always be specific to the user's data. Use **bold** for key numbers. Keep answers concise (3–5 sentences unless more is asked). Never diagnose.\n\n${buildContext()}`,
        messages:chatHistory
      })
    });
    if(!r.ok){ const e=await r.text(); throw new Error(e); }
    const data=await r.json();
    const reply=data.content?.find(c=>c.type==='text')?.text?.trim();
    if(!reply) throw new Error('Empty response');
    removeTyping();
    appendMsg('ai',reply);
    chatHistory.push({role:'assistant',content:reply});
  } catch(e) {
    removeTyping();
    appendMsg('ai','Sorry, I couldn\'t connect right now. Make sure the app is being served locally and try again.');
    console.error('AI error:',e);
  }
}

// ── Boot ──────────────────────────────────────────────────────
renderWater();
renderCycle();
renderMeals();
buildDash();

// Event Delegation
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) {
        const action = el.dataset.action;
        if (action === 'nav') nav(el.dataset.target);
        if (action === 'log-sleep') logSleep();
        if (action === 'log-mood') logMood();
        if (action === 'log-ex') logEx();
        if (action === 'log-weight') logWeight();
        if (action === 'log-notes') logNotes();
        if (action === 'set-goal') setGoal();
        if (action === 'search-food') searchFood();
        if (action === 'toggle-manual') toggleManual();
        if (action === 'add-manual') addManual();
        if (action === 'add-food') addMealEntry(lastSearchResults[el.dataset.index]);
        if (action === 'delete-meal') deleteMeal(el.dataset.index);
        if (action === 'save-cycle') saveCycle();
        if (action === 'send-chat') sendChat();
        if (action === 'chat-sug') sendChat(el.dataset.sug);
        if (action === 'quick-sleep') {
            document.querySelectorAll('#sleep-pills .pill').forEach(x=>x.classList.remove('on-green'));
            el.classList.add('on-green');
            document.getElementById('sleep-inp').value = el.dataset.val;
        }
        if (action === 'quick-ex') {
            document.querySelectorAll('#ex-pills .pill').forEach(x=>x.classList.remove('on-green'));
            el.classList.add('on-green');
            const opt = QUICK_EX[el.dataset.idx];
            document.getElementById('ex-type').value=opt.t;
            document.getElementById('ex-min').value=opt.d;
        }
        if (action === 'log-water') {
            const log=getLog(todayStr());
            const i = parseInt(el.dataset.idx);
            log.water=(log.water||0)===i+1?i:i+1;
            save(); renderWater(); toast('Water updated');
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.target.id === 'food-inp') searchFood();
        if (e.target.id === 'chat-inp') sendChat();
    }
});
