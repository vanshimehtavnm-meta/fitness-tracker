// ── Storage ──────────────────────────────────────────────────
const STORE = 'vitals_v3';

function defaultState() {
  return { logs:{}, cycle:{ start:'', perLen:5, len:28 }, calGoal:2000 };
}

function load() {
  try { const r=localStorage.getItem(STORE); if(r) return JSON.parse(r); } catch(e){}
  return defaultState();
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch(e){}
}

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function dateFromStr(s) {
  // Parse YYYY-MM-DD safely in local timezone (avoids UTC shift)
  if(!s) return null;
  const [y,m,d]=s.split('-').map(Number);
  if(!y||!m||!d) return null;
  return new Date(y, m-1, d);
}

function daysBack(n) {
  const arr=[];
  for(let i=n-1;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    arr.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
  }
  return arr;
}

function shortLabel(k) {
  const d=dateFromStr(k); if(!d) return k;
  return (d.getMonth()+1)+'/'+d.getDate();
}

function getLog(k) {
  if(!S.logs[k]) S.logs[k]={sleep:null,sleepQ:null,water:0,mood:null,exercise:null,exType:'',weight:null,notes:'',meals:[]};
  if(!S.logs[k].meals) S.logs[k].meals=[];
  return S.logs[k];
}

function avg(arr) {
  const f=arr.filter(v=>v!=null&&v>0);
  return f.length ? +(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1) : null;
}

// ── Cycle helpers ─────────────────────────────────────────────
function getCycleInfo() {
  if(!S.cycle.start) return null;
  const start=dateFromStr(S.cycle.start);
  if(!start) return null;
  const todayD=dateFromStr(todayStr());
  const diffMs=todayD-start;
  if(diffMs<0) return null; // future date
  const diffDays=Math.floor(diffMs/86400000);
  const cl=S.cycle.len||28;
  const pl=S.cycle.perLen||5;
  const dayInCycle=(diffDays%cl)+1; // 1-indexed
  const ovDay=cl-14;
  const fertStart=Math.max(pl+1, ovDay-5);
  let phase;
  if(dayInCycle<=pl) phase='menstrual';
  else if(dayInCycle<fertStart) phase='follicular';
  else if(dayInCycle>=fertStart && dayInCycle<=ovDay+1) phase='ovulation';
  else phase='luteal';
  return { day:dayInCycle, phase, ovDay, fertStart, pl, cl };
}

// ── Seed sample data ──────────────────────────────────────────
function seedIfEmpty() {
  if(Object.keys(S.logs).length>0) return;
  const meals=[
    [{n:'Oatmeal & banana',c:340,p:10,cb:58,f:6,t:'Breakfast'},{n:'Dal tadka & rice',c:620,p:22,cb:88,f:12,t:'Lunch'},{n:'Palak paneer & roti',c:560,p:24,cb:50,f:22,t:'Dinner'},{n:'Apple',c:80,p:0,cb:21,f:0,t:'Snack'}],
    [{n:'Poha with peanuts',c:310,p:9,cb:52,f:7,t:'Breakfast'},{n:'Grilled chicken wrap',c:460,p:34,cb:36,f:12,t:'Lunch'},{n:'Rajma chawal',c:700,p:26,cb:110,f:10,t:'Dinner'},{n:'Chai & almonds',c:130,p:4,cb:12,f:7,t:'Snack'}],
    [{n:'Idli sambar (3 pcs)',c:270,p:9,cb:50,f:3,t:'Breakfast'},{n:'Paneer wrap',c:490,p:22,cb:52,f:18,t:'Lunch'},{n:'Aloo sabzi & 2 roti',c:530,p:12,cb:78,f:14,t:'Dinner'},{n:'Yoghurt',c:100,p:6,cb:8,f:4,t:'Snack'}],
    [{n:'Eggs on toast',c:370,p:22,cb:30,f:15,t:'Breakfast'},{n:'Veg biryani',c:580,p:14,cb:98,f:14,t:'Lunch'},{n:'Grilled fish & salad',c:420,p:42,cb:16,f:12,t:'Dinner'},{n:'Mango',c:130,p:1,cb:33,f:1,t:'Snack'}],
    [{n:'Smoothie bowl',c:390,p:13,cb:66,f:9,t:'Breakfast'},{n:'Chole & puri (2)',c:560,p:18,cb:80,f:16,t:'Lunch'},{n:'Khichdi & papad',c:470,p:16,cb:72,f:10,t:'Dinner'},{n:'Mixed nuts',c:170,p:5,cb:7,f:15,t:'Snack'}],
    [{n:'Paratha & curd',c:440,p:12,cb:60,f:16,t:'Breakfast'},{n:'Lentil soup & bread',c:360,p:18,cb:50,f:6,t:'Lunch'},{n:'Butter chicken & naan',c:800,p:42,cb:66,f:28,t:'Dinner'},{n:'Banana',c:105,p:1,cb:27,f:0,t:'Snack'}],
    [{n:'Upma with chutney',c:290,p:8,cb:46,f:7,t:'Breakfast'},{n:'Chicken biryani',c:490,p:28,cb:62,f:14,t:'Lunch'},{n:'Masoor dal & rice',c:510,p:20,cb:82,f:8,t:'Dinner'},{n:'Orange',c:65,p:1,cb:16,f:0,t:'Snack'}],
  ];
  const sleeps=[7.5,6,8,5.5,7,8.5,7];
  const waters=[6,5,8,4,7,8,6];
  const exercises=[30,0,45,0,30,60,20];
  const moods=[7,5,9,3,7,9,7];
  const weights=[62.5,null,62.3,null,62.6,null,62.4];
  for(let i=0;i<7;i++){
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    S.logs[k]={
      sleep:sleeps[i],sleepQ:8,water:waters[i],mood:moods[i],
      exercise:exercises[i],exType:exercises[i]>0?'Running':'',
      weight:weights[i],notes:'',
      meals:meals[i].map(m=>({name:m.n,cals:m.c,protein:m.p,carbs:m.cb,fat:m.f,type:m.t}))
    };
  }
  save();
}

let S=load();
seedIfEmpty();
getLog(todayStr()); // ensure today exists
save();
