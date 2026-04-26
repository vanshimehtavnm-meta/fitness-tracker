// --- UTILS ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.bottom = '30px';
  setTimeout(() => t.style.bottom = '-50px', 2200);
}

function flashSave(id) {
  const el = document.getElementById(id);
  if(el) {
    el.style.opacity = '1';
    setTimeout(() => el.style.opacity = '0', 3000);
  }
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 18) return 'Good afternoon';
  return 'Good evening';
}

document.getElementById('sidebar-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// --- ROUTING ---
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-links a, .page').forEach(el => el.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(e.target.dataset.page).classList.add('active');

    // Page specific logic triggers
    if(e.target.dataset.page === 'dashboard') renderDashboard();
    if(e.target.dataset.page === 'log') populateLogToday();
    if(e.target.dataset.page === 'meals') renderMeals();
    if(e.target.dataset.page === 'trends') renderTrends();
    if(e.target.dataset.page === 'cycle') renderCycle();
    if(e.target.dataset.page === 'workout') renderWorkout();
  });
});

// --- CYCLE LOGIC ---
function getCycleData() {
  if (!state.cycleStart) return null;
  const start = new Date(state.cycleStart);
  const now = new Date();
  start.setHours(0,0,0,0);
  now.setHours(0,0,0,0);

  const diffTime = Math.abs(now - start);
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let currentDay = (diffDays % state.cycleLen) + 1;
  const ovDay = state.cycleLen - 14;

  let phase = '';
  let color = '';
  let desc = '';

  if (currentDay <= state.periodLen) {
    phase = 'Menstrual'; color = 'var(--pink)';
    desc = 'Low energy. Focus on rest, gentle stretching, and nourishment.';
  } else if (currentDay < ovDay - 5) {
    phase = 'Follicular'; color = 'var(--green)';
    desc = 'Rising energy. Great time to start new projects and push workouts.';
  } else if (currentDay >= ovDay - 5 && currentDay <= ovDay + 1) {
    phase = 'Ovulation'; color = 'var(--amber)';
    desc = 'Peak energy and communication. Ideal for high intensity activity.';
  } else {
    phase = 'Luteal'; color = 'var(--blue)';
    desc = 'Winding down. Shift to maintenance, pilates, and self-care.';
  }

  return { day: currentDay, phase, color, desc, ovDay };
}

// --- DASHBOARD ---
let charts = {};

function safeChart(id, config) {
  if(charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, config);
}

function renderDashboard() {
  document.getElementById('greeting').innerText = `${getGreeting()} ✦`;

  const keys = getLast(7);
  const sleeps = keys.map(k => state.logs[k]?.sleep);
  const waters = keys.map(k => state.logs[k]?.water);
  const exercises = keys.map(k => state.logs[k]?.exercise);
  const moods = keys.map(k => state.logs[k]?.mood);

  const todayKeyStr = todayKey();
  const todayLog = state.logs[todayKeyStr];

  document.getElementById('dash-sleep').innerText = avg(sleeps) + 'h';
  document.getElementById('dash-water').innerText = avg(waters);
  document.getElementById('dash-exercise').innerText = avg(exercises) + 'm';
  document.getElementById('dash-mood').innerText = todayLog?.mood || '--';
  document.getElementById('dash-cals').innerText = todayLog?.cals || '0';
  document.getElementById('dash-weight').innerText = todayLog?.weight || '--';

  // Glance Chart
  safeChart('glanceChart', {
    type: 'bar',
    data: {
      labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yest', 'Today'],
      datasets: [
        { label: 'Sleep (h)', data: sleeps, backgroundColor: 'var(--green)' },
        { label: 'Water (gl)', data: waters, backgroundColor: 'var(--blue)' },
        { label: 'Exercise (m/6)', data: exercises.map(e => e ? e/6 : 0), backgroundColor: 'var(--purple)' }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  // Mood Dash Chart
  safeChart('moodDashChart', {
    type: 'line',
    data: {
      labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yest', 'Today'],
      datasets: [{
        label: 'Mood', data: moods,
        borderColor: 'var(--pink)', backgroundColor: 'var(--pink-l)', fill: true, tension: 0.3, spanGaps: true
      }]
    },
    options: { responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }
  });

  // Cycle Dash
  const cData = getCycleData();
  const cb = document.getElementById('dash-cycle-banner');
  const cd = document.getElementById('dash-cycle-desc');
  if (cData) {
    cb.innerText = `${cData.phase} Phase — Day ${cData.day}`;
    cb.style.backgroundColor = cData.color;
    cb.style.color = '#fff';
    cd.innerText = cData.desc;
  } else {
    cb.innerText = 'Setup Cycle Tracker';
    cb.style.backgroundColor = 'var(--surface2)';
    cb.style.color = 'var(--ink)';
    cd.innerText = 'Track your cycle to get phase-specific insights.';
  }

  // Load AI Chip if not loaded today
  if(document.getElementById('ai-insight-text').innerText.includes('Generating')) {
    generateDashInsight();
  }
}

// --- LOG TODAY UI SETUP ---
function setupLogUI() {
  // Water
  const wc = document.getElementById('water-dots');
  wc.innerHTML = '';
  for(let i=1; i<=8; i++) {
    const d = document.createElement('div');
    d.className = 'water-dot';
    d.onclick = () => {
      const log = getDayLog(todayKey());
      log.water = (log.water === i) ? i-1 : i; // allow unfill
      saveState();
      populateLogToday();
      showToast('Water updated');
    };
    wc.appendChild(d);
  }

  // Pills functionality
  document.querySelectorAll('#sleep-pills .pill').forEach(p => {
    p.onclick = () => {
      document.getElementById('log-sleep-hrs').value = p.dataset.val;
      document.querySelectorAll('#sleep-pills .pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
    };
  });

  document.querySelectorAll('#mood-pills .pill').forEach(p => {
    p.onclick = () => {
      document.querySelectorAll('#mood-pills .pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
      const log = getDayLog(todayKey());
      log.mood = parseInt(p.dataset.val);
      saveState();
      flashSave('mood-saved');
    };
  });

  document.querySelectorAll('#ex-pills .pill').forEach(p => {
    p.onclick = () => {
      document.getElementById('log-ex-type').value = p.dataset.type;
      document.getElementById('log-ex-dur').value = p.dataset.dur;
      document.querySelectorAll('#ex-pills .pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
    };
  });
}

function populateLogToday() {
  const log = getDayLog(todayKey());

  if(log.sleep) document.getElementById('log-sleep-hrs').value = log.sleep;
  if(log.sleepQ) document.getElementById('log-sleep-q').value = log.sleepQ;

  document.getElementById('water-label').innerText = `${log.water} / 8 glasses`;
  document.querySelectorAll('.water-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < log.water);
  });

  document.querySelectorAll('#mood-pills .pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.val) === log.mood);
  });

  if(log.exercise) document.getElementById('log-ex-dur').value = log.exercise;
  if(log.exerciseType) document.getElementById('log-ex-type').value = log.exerciseType;

  if(log.weight) document.getElementById('log-weight').value = log.weight;
  if(log.notes) document.getElementById('log-notes').value = log.notes;
}

function saveLog(type) {
  const log = getDayLog(todayKey());
  if (type === 'sleep') {
    log.sleep = parseFloat(document.getElementById('log-sleep-hrs').value);
    log.sleepQ = document.getElementById('log-sleep-q').value;
  }
  if (type === 'exercise') {
    log.exerciseType = document.getElementById('log-ex-type').value;
    log.exercise = parseInt(document.getElementById('log-ex-dur').value);
  }
  if (type === 'weight') log.weight = parseFloat(document.getElementById('log-weight').value);
  if (type === 'notes') log.notes = document.getElementById('log-notes').value;

  saveState();
  flashSave(`${type}-saved`);
}

// --- MEALS UI ---
let activeMealType = 'Breakfast';

document.querySelectorAll('#meal-type-tabs .pill').forEach(p => {
  p.onclick = () => {
    document.querySelectorAll('#meal-type-tabs .pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active');
    activeMealType = p.dataset.type;
  };
});

function saveCalGoal() {
  state.calGoal = parseInt(document.getElementById('meal-goal-input').value) || 2000;
  saveState();
  renderMeals();
  showToast('Goal saved');
}

function renderMeals() {
  document.getElementById('meal-goal-input').value = state.calGoal;
  const log = getDayLog(todayKey());

  let tc = 0, tp = 0, tcar = 0, tf = 0;
  log.meals.forEach(m => { tc+=m.cals; tp+=m.protein; tcar+=m.carbs; tf+=m.fat; });
  log.cals = tc;
  saveState();

  document.getElementById('meal-sum-cals').innerText = tc;
  document.getElementById('meal-sum-pro').innerText = tp + 'g';

  const rem = state.calGoal - tc;
  document.getElementById('meal-sum-rem-lbl').innerText = rem >= 0 ? 'Remaining' : 'Over';
  document.getElementById('meal-sum-rem').innerText = Math.abs(rem);
  document.getElementById('meal-sum-rem').style.color = rem >= 0 ? 'var(--ink)' : 'var(--pink)';

  const pct = Math.min((tc / state.calGoal) * 100, 100);
  const pb = document.getElementById('meal-progress');
  pb.style.width = pct + '%';
  pb.style.background = pct > 100 ? 'var(--pink)' : pct > 85 ? 'var(--amber)' : 'var(--green)';

  safeChart('macroChart', {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{ data: [tp, tcar, tf], backgroundColor: ['var(--green)', 'var(--amber)', 'var(--pink)'] }]
    },
    options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'right' } } }
  });

  const list = document.getElementById('meal-log-list');
  list.innerHTML = '<h2>Logged Meals</h2>';
  ['Breakfast', 'Lunch', 'Dinner', 'Snack'].forEach(type => {
    const tMeals = log.meals.filter(m => m.type === type);
    if(tMeals.length > 0) {
      list.innerHTML += `<h3 style="font-size:14px; color:var(--ink2); margin-top:15px; text-transform:uppercase;">${type}</h3>`;
      tMeals.forEach((m, idx) => {
        list.innerHTML += `
          <div class="nutrition-result">
            <div>
              <div style="font-weight:600;">${m.name}</div>
              <div class="macros-row">${m.cals}kcal · P:${m.protein}g · C:${m.carbs}g · F:${m.fat}g</div>
            </div>
            <button class="secondary" style="padding:4px 8px; font-size:12px;" onclick="delMeal('${type}', ${idx})">✕</button>
          </div>
        `;
      });
    }
  });
}

function addMealData(food) {
  const log = getDayLog(todayKey());
  log.meals.push({ type: activeMealType, ...food });
  saveState();
  renderMeals();
  showToast('Meal logged');
  document.getElementById('ai-food-search').value = '';
  document.getElementById('ai-food-results').innerHTML = '';
}

function delMeal(type, typeIdx) {
  const log = getDayLog(todayKey());
  let count = -1;
  const realIdx = log.meals.findIndex(m => {
    if(m.type === type) count++;
    return count === typeIdx;
  });
  if(realIdx > -1) {
    log.meals.splice(realIdx, 1);
    saveState();
    renderMeals();
  }
}

function addManualFood() {
  const name = document.getElementById('man-name').value || 'Manual entry';
  const cals = parseInt(document.getElementById('man-cals').value) || 0;
  const protein = parseInt(document.getElementById('man-pro').value) || 0;
  const carbs = parseInt(document.getElementById('man-carbs').value) || 0;
  const fat = parseInt(document.getElementById('man-fat').value) || 0;

  addMealData({ name, cals, protein, carbs, fat });
  document.getElementById('manual-food').style.display = 'none';
}

// --- CYCLE UI ---
function renderCycle() {
  if(state.cycleStart) document.getElementById('cycle-start').value = state.cycleStart;
  document.getElementById('cycle-per-len').value = state.periodLen;
  document.getElementById('cycle-len').value = state.cycleLen;

  const cd = getCycleData();
  if (cd) {
    document.getElementById('cycle-status').innerText = `Day ${cd.day}`;
    document.getElementById('cycle-phase-desc').innerText = `You are in your ${cd.phase} phase.`;

    // Grid
    const g = document.getElementById('cycle-cal-grid');
    g.innerHTML = '';
    for(let i=1; i<=state.cycleLen; i++) {
      let bg = 'var(--surface2)';
      let col = 'var(--ink)';
      if (i <= state.periodLen) { bg = '#FAEEF1'; col = '#9B2C45'; }
      else if (i >= cd.ovDay - 5 && i <= cd.ovDay + 1) { bg = '#E8F4EC'; }
      if (i === cd.ovDay) { bg = '#FBF2E5'; }

      let out = '';
      if (i === cd.day) out = 'border: 2px solid var(--blue);';

      g.innerHTML += `<div style="aspect-ratio: 1; border-radius: 50%; background: ${bg}; color: ${col}; display: flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; ${out}">${i}</div>`;
    }
  }
}

function saveCycle() {
  state.cycleStart = document.getElementById('cycle-start').value;
  state.periodLen = parseInt(document.getElementById('cycle-per-len').value);
  state.cycleLen = parseInt(document.getElementById('cycle-len').value);
  saveState();
  renderCycle();
  flashSave('cycle-saved');
}

// --- WORKOUT UI ---
const workouts = {
  Menstrual: [
    { n: "Gentle Flow Yoga", d: 20, i: 1, desc: "Restorative poses to relieve cramps." },
    { n: "Slow Nature Walk", d: 30, i: 1, desc: "Light movement to boost mood." },
    { n: "Meditation", d: 15, i: 0, desc: "Deep breathing for pain management." }
  ],
  Follicular: [
    { n: "Cardio Run", d: 30, i: 3, desc: "Capitalise on rising estrogen levels." },
    { n: "Lower Body Strength", d: 45, i: 3, desc: "Build muscle during this anabolic phase." },
    { n: "HIIT Session", d: 25, i: 4, desc: "High energy, fast paced intervals." }
  ],
  Ovulation: [
    { n: "Peak Performance Lift", d: 50, i: 5, desc: "Go for personal bests. Energy is highest." },
    { n: "Spin Class / Fast Cycle", d: 45, i: 5, desc: "Intense cardio session." }
  ],
  Luteal: [
    { n: "Pilates Core", d: 30, i: 2, desc: "Low impact, high burn. Good for early luteal." },
    { n: "Moderate Swim", d: 35, i: 2, desc: "Gentle on joints if experiencing bloating." },
    { n: "Yin Yoga", d: 40, i: 1, desc: "Deep stretching for late luteal phase." }
  ]
};

function renderWorkout() {
  const cd = getCycleData();
  const wGrid = document.getElementById('workout-grid');
  wGrid.innerHTML = '';

  if (!cd) {
    document.getElementById('workout-banner').style.display = 'block';
    return;
  }

  document.getElementById('workout-banner').style.display = 'none';
  const list = workouts[cd.phase] || workouts.Follicular;

  list.forEach(w => {
    let pips = '';
    for(let i=0; i<5; i++) {
      let pc = 'var(--surface2)';
      if(i < w.i) pc = w.i <= 2 ? 'var(--green)' : w.i <= 3 ? 'var(--amber)' : 'var(--pink)';
      pips += `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${pc}; margin-right:3px;"></span>`;
    }

    wGrid.innerHTML += `
      <div class="card" style="border-left: 4px solid ${cd.color}">
        <h3 style="margin-bottom:5px; font-family:'Instrument Sans', sans-serif;">${w.n}</h3>
        <div style="font-size:12px; color:var(--ink2); margin-bottom:10px; display:flex; align-items:center; gap:10px;">
          <span>⏱ ${w.d} min</span>
          <div>${pips}</div>
        </div>
        <p style="font-size:14px;">${w.desc}</p>
        <button class="secondary" style="margin-top:15px; width:100%;" onclick="logWorkout('${w.n}', ${w.d})">Log this workout</button>
      </div>
    `;
  });
}

function logWorkout(type, dur) {
  const log = getDayLog(todayKey());
  log.exerciseType = type;
  log.exercise = dur;
  saveState();
  showToast('Workout logged to today!');
}

// --- TRENDS UI ---
function renderTrends() {
  const keys = getLast(30);
  const lbls = keys.map(k => k.split('-').slice(1).join('/')); // MM/DD

  const dS = keys.map(k => state.logs[k]?.sleep);
  const dW = keys.map(k => state.logs[k]?.water);
  const dE = keys.map(k => state.logs[k]?.exercise);
  const dM = keys.map(k => state.logs[k]?.mood);
  const dC = keys.map(k => state.logs[k]?.cals);
  const dWt = keys.map(k => state.logs[k]?.weight);

  const opt = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } };

  safeChart('tr-sleep', { type: 'line', data: { labels: lbls, datasets: [{ data: dS, borderColor: 'var(--green)', spanGaps: true }] }, options: opt });
  safeChart('tr-water', { type: 'bar', data: { labels: lbls, datasets: [{ data: dW, backgroundColor: 'var(--blue)' }] }, options: opt });
  safeChart('tr-exercise', { type: 'bar', data: { labels: lbls, datasets: [{ data: dE, backgroundColor: 'var(--purple)' }] }, options: opt });
  safeChart('tr-mood', { type: 'line', data: { labels: lbls, datasets: [{ data: dM, borderColor: 'var(--pink)', spanGaps: true }] }, options: opt });
  safeChart('tr-cals', { type: 'bar', data: { labels: lbls, datasets: [{ data: dC, backgroundColor: 'var(--amber)' }] }, options: opt });
  safeChart('tr-weight', { type: 'line', data: { labels: lbls, datasets: [{ data: dWt, borderColor: 'var(--ink2)', spanGaps: true }] }, options: opt });
}


// --- AI API LOGIC ---
const AI_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = "claude-sonnet-4-20250514";

function buildAiPrompt() {
  const keys = getLast(7);
  const sleeps = keys.map(k => state.logs[k]?.sleep);
  const waters = keys.map(k => state.logs[k]?.water);
  const cd = getCycleData();
  const log = getDayLog(todayKey());

  return `User health data:
Avg Sleep 7d: ${avg(sleeps)}h
Avg Water 7d: ${avg(waters)}
Today Cals: ${log.cals} / ${state.calGoal}
Cycle: ${cd ? cd.phase + ' phase, Day ' + cd.day : 'Not set'}
Latest weight: ${log.weight || 'unknown'}`;
}

async function callAI(messages, max_tokens = 400) {
  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: max_tokens,
        system: buildAiPrompt(),
        messages: messages
      })
    });

    if(!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.content[0].text;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// 1. Dash Insight
async function generateDashInsight() {
  const t = document.getElementById('ai-insight-text');
  try {
    const txt = await callAI([{role: 'user', content: 'Give me ONE short, uplifting sentence (max 18 words) of advice based on my 7-day stats.'}], 50);
    t.innerText = txt.replace(/["']/g, '');
  } catch (e) {
    t.innerText = "Focus on drinking a bit more water today! ✦";
  }
}

// 2. Meal Search
const localFoodDB = {
  "rice": [{ name: "Cooked White Rice", unit: "cup", qty: 1, cals: 205, protein: 4, carbs: 45, fat: 0 }],
  "milk": [{ name: "Whole Milk", unit: "ml", qty: 250, cals: 150, protein: 8, carbs: 12, fat: 8 }],
  "chicken": [{ name: "Chicken Breast (cooked)", unit: "grams", qty: 100, cals: 165, protein: 31, carbs: 0, fat: 3 }],
  "egg": [{ name: "Boiled Egg", unit: "large egg(s)", qty: 1, cals: 78, protein: 6, carbs: 1, fat: 5 }],
  "poha": [{ name: "Poha", unit: "bowl", qty: 1, cals: 250, protein: 5, carbs: 40, fat: 8 }],
  "paneer": [{ name: "Paneer", unit: "grams", qty: 100, cals: 265, protein: 11, carbs: 1, fat: 20 }]
};

async function searchFood() {
  const inp = document.getElementById('ai-food-search');
  const resDiv = document.getElementById('ai-food-results');
  const query = inp.value.toLowerCase().trim();
  if(!query) return;

  const btn = inp.nextElementSibling;
  btn.innerText = '...';
  btn.disabled = true;

  let data = [];

  try {
    // Attempt AI search
    const txt = await callAI([{role: 'user', content: `You are a nutrition database. For the food '${query}', return ONLY a JSON array of 1-3 serving options. Format: [{"name":"...","unit":"cup/ml/grams/piece","qty":1,"cals":N,"protein":N,"carbs":N,"fat":N}]. Ensure 'qty' is a number.`}]);

    // Extract JSON from response
    const jsonStr = txt.substring(txt.indexOf('['), txt.lastIndexOf(']') + 1);
    data = JSON.parse(jsonStr);
  } catch(e) {
    console.warn("AI search failed, falling back to local dictionary.");
    // Fallback local search
    const exactMatch = localFoodDB[query];
    if (exactMatch) {
      data = exactMatch;
    } else {
      // Find partial matches
      const matches = Object.keys(localFoodDB).filter(k => query.includes(k) || k.includes(query));
      if (matches.length > 0) {
        data = localFoodDB[matches[0]];
      } else {
        // Generic fallback if nothing matches
        data = [{ name: query, unit: "serving(s)", qty: 1, cals: 200, protein: 5, carbs: 20, fat: 10 }];
        showToast("Using estimated values.");
      }
    }
  } finally {
    btn.innerText = 'Search';
    btn.disabled = false;
  }

  resDiv.innerHTML = '';
  data.forEach((f, index) => {
    // Save to window variable so button can reference it
    window[`tempFoodData_${index}`] = f;
    resDiv.innerHTML += `
      <div class="nutrition-result" style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div>
            <div style="font-weight:600;">${f.name}</div>
            <div class="macros-row">Per ${f.qty} ${f.unit}: ${f.cals}kcal · P:${f.protein}g · C:${f.carbs}g · F:${f.fat}g</div>
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <input type="number" id="qty-input-${index}" value="${f.qty}" style="width:70px; margin-bottom:0;" step="0.1" min="0.1">
          <span style="font-size:14px; color:var(--ink2);">${f.unit}</span>
          <button style="margin-left:auto; padding:6px 12px;" onclick='handleDynamicAdd(${index})'>+ Add</button>
        </div>
      </div>
    `;
  });
}

function handleDynamicAdd(index) {
  const f = window[`tempFoodData_${index}`];
  const inputEl = document.getElementById(`qty-input-${index}`);
  const userQty = parseFloat(inputEl.value) || f.qty;

  // Calculate multiplier based on base qty
  const multiplier = userQty / f.qty;

  addMealData({
    name: `${f.name} (${userQty} ${f.unit})`,
    cals: Math.round(f.cals * multiplier),
    protein: Math.round(f.protein * multiplier),
    carbs: Math.round(f.carbs * multiplier),
    fat: Math.round(f.fat * multiplier)
  });
}

// 3. AI Assistant Chat
let chatHistory = [];
async function sendAiMsg(text) {
  if(!text) return;
  const w = document.getElementById('chat-window');
  const i = document.getElementById('chat-input');

  // User msg
  w.innerHTML += `<div style="align-self: flex-end; background: var(--surface2); padding: 12px 16px; border-radius: 12px 12px 0 12px; max-width: 80%;">${text}</div>`;
  i.value = '';
  w.scrollTop = w.scrollHeight;

  chatHistory.push({role: 'user', content: text});
  if(chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  // Typing indicator
  const typId = 'typ-' + Date.now();
  w.innerHTML += `<div id="${typId}" style="align-self: flex-start; background: var(--ai-l); padding: 12px 16px; border-radius: 12px 12px 12px 0; max-width: 80%;"><span style="color: var(--ai);">✦</span> ...</div>`;
  w.scrollTop = w.scrollHeight;

  try {
    const reply = await callAI(chatHistory);
    chatHistory.push({role: 'assistant', content: reply});
    document.getElementById(typId).innerHTML = `<span style="color: var(--ai);">✦</span> ${reply}`;
  } catch(e) {
    document.getElementById(typId).innerHTML = `<span style="color: var(--pink);">✦</span> Sorry, I couldn't connect right now.`;
    chatHistory.pop();
  }
  w.scrollTop = w.scrollHeight;
}

// --- INITIALIZE ---
setupLogUI();
renderDashboard();
