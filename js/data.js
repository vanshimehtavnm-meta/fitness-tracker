const STORE = 'vitals_v2';

function loadState() {
  const raw = localStorage.getItem(STORE);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error parsing stored data", e);
    }
  }
  return {
    logs: {},
    calGoal: 2000,
    cycleStart: null,
    cycleLen: 28,
    periodLen: 5,
    savedMeals: [] // For favorites
  };
}

function saveState() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayLog(k) {
  if (!state.logs[k]) {
    state.logs[k] = {
      sleep: null, sleepQ: null,
      water: 0,
      exercise: null, exerciseType: '',
      mood: null,
      cals: 0,
      weight: null,
      notes: '',
      symptoms: [], // Added symptoms tracking
      meals: []
    };
  }
  return state.logs[k];
}

function getLast(n) {
  const keys = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const pastDate = new Date(d);
    pastDate.setDate(d.getDate() - i);
    const k = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
    keys.push(k);
  }
  return keys;
}

function avg(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Number((sum / valid.length).toFixed(1));
}

function seedData(s) {
  if (Object.keys(s.logs).length > 0) return; // Only seed if empty

  const indianMeals = [
    { name: "Poha with peanuts", cals: 300, protein: 6, carbs: 45, fat: 10 },
    { name: "Dal tadka & rice", cals: 450, protein: 15, carbs: 70, fat: 12 },
    { name: "Palak paneer & roti", cals: 500, protein: 18, carbs: 40, fat: 28 },
    { name: "Idli sambar", cals: 350, protein: 10, carbs: 60, fat: 5 },
    { name: "Rajma chawal", cals: 550, protein: 18, carbs: 80, fat: 14 }
  ];

  const keys = getLast(7);

  keys.forEach((k, i) => {
    // Generate some realistic variance
    s.logs[k] = {
      sleep: 6 + (Math.random() * 2), // 6 to 8 hours
      sleepQ: ['Poor', 'Fair', 'Good', 'Excellent'][Math.floor(Math.random() * 4)],
      water: 4 + Math.floor(Math.random() * 5), // 4 to 8 glasses
      exercise: Math.floor(Math.random() * 60), // 0 to 60 mins
      exerciseType: ['Yoga', 'Walk', 'Run', 'Gym'][Math.floor(Math.random() * 4)],
      mood: 4 + Math.floor(Math.random() * 5), // 4 to 8 mood
      cals: 1800 + Math.floor(Math.random() * 400),
      weight: Number((62.0 + (Math.random() * 1.5)).toFixed(1)),
      notes: i === 6 ? "Feeling great today!" : "",
      symptoms: i % 3 === 0 ? ["Bloating", "Fatigue"] : [],
      meals: [
        { type: 'Breakfast', ...indianMeals[Math.floor(Math.random() * indianMeals.length)] },
        { type: 'Lunch', ...indianMeals[Math.floor(Math.random() * indianMeals.length)] }
      ]
    };
  });
}

let state = loadState();
seedData(state);
getDayLog(todayKey());
saveState();
