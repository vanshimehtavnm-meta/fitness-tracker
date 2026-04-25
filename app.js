// --- Mock Database for "AI" Meal Search ---
// In a real app, this would call an API (like Edamam or OpenAI)
const nutritionDB = {
    "poha": { calories: 250, protein: "4g", carbs: "45g", fat: "6g" },
    "paneer butter masala": { calories: 450, protein: "14g", carbs: "12g", fat: "35g" },
    "dal tadka": { calories: 220, protein: "12g", carbs: "35g", fat: "5g" },
    "roti": { calories: 120, protein: "4g", carbs: "22g", fat: "1g" },
    "chicken salad": { calories: 300, protein: "35g", carbs: "10g", fat: "12g" },
    "default": { calories: 200, protein: "5g", carbs: "20g", fat: "10g" } // Fallback
};

// --- State to hold user data for the Daily Tip ---
let userData = {
    lastSleepScore: null,
    lastSleepHours: null
};

// --- 1. AI Meal Search Logic ---
function logMeal() {
    const inputField = document.getElementById('meal-input');
    const mealName = inputField.value.toLowerCase().trim();

    if (!mealName) {
        alert("Please enter a meal first!");
        return;
    }

    // Simulate AI looking up the food
    let nutrition = nutritionDB[mealName];

    // If exact match not found, use a fallback but pretend we estimated it
    if (!nutrition) {
        // Simple mock randomizer to make it look like AI is guessing
        nutrition = {
            calories: Math.floor(Math.random() * 300) + 150,
            protein: Math.floor(Math.random() * 20) + 5 + "g",
            carbs: Math.floor(Math.random() * 50) + 10 + "g",
            fat: Math.floor(Math.random() * 20) + 5 + "g"
        };
    }

    // Update UI
    document.getElementById('meal-calories').innerText = nutrition.calories + " kcal";
    document.getElementById('meal-protein').innerText = nutrition.protein;
    document.getElementById('meal-carbs').innerText = nutrition.carbs;
    document.getElementById('meal-fat').innerText = nutrition.fat;

    // Show results
    document.getElementById('meal-results').classList.remove('hidden');
    inputField.value = ''; // Clear input
}

// --- 2. Sleep Quality Score Logic ---
function logSleep() {
    const hoursInput = document.getElementById('sleep-hours').value;
    const qualityInput = document.getElementById('sleep-quality').value;

    if (!hoursInput) {
        alert("Please enter hours slept.");
        return;
    }

    const hours = parseFloat(hoursInput);
    const quality = parseInt(qualityInput); // 1 to 5

    // Calculation logic:
    // Ideal sleep is 7-9 hours. Let's say 8 is perfect.
    // Score out of 100. Hours are worth 60 points, Quality is worth 40 points.

    // Calculate hours score (max 60)
    let hoursScore = 0;
    if (hours >= 7 && hours <= 9) {
        hoursScore = 60;
    } else if (hours < 7) {
        // Penalty for too little
        hoursScore = Math.max(0, 60 - ((7 - hours) * 15));
    } else if (hours > 9) {
        // Penalty for too much
        hoursScore = Math.max(0, 60 - ((hours - 9) * 10));
    }

    // Calculate quality score (max 40)
    // 5 = 40, 4 = 32, 3 = 24, 2 = 16, 1 = 8
    let qualityScore = (quality / 5) * 40;

    // Total Score
    let totalScore = Math.round(hoursScore + qualityScore);

    // Save to state for the daily tip
    userData.lastSleepScore = totalScore;
    userData.lastSleepHours = hours;

    // Update UI
    document.getElementById('sleep-score-value').innerText = totalScore;

    let feedback = "";
    if (totalScore >= 90) feedback = "Excellent sleep! You're ready to conquer the day.";
    else if (totalScore >= 70) feedback = "Good sleep. Keep up the consistent routine.";
    else if (totalScore >= 50) feedback = "Fair sleep. You might feel a bit tired today.";
    else feedback = "Poor sleep. Try to prioritize rest and a calming evening routine tonight.";

    document.getElementById('sleep-feedback').innerText = feedback;
    document.getElementById('sleep-results').classList.remove('hidden');

    // Instantly update the tip based on new data
    updateDailyTip();
}

// --- 3. Daily AI Health Tip Logic ---
function updateDailyTip() {
    const tipElement = document.getElementById('daily-tip');

    // Default tip if no data
    if (userData.lastSleepHours === null) {
        tipElement.innerText = "Log your sleep and meals to get personalized daily tips!";
        return;
    }

    // Generate tip based on sleep
    if (userData.lastSleepHours < 6) {
        tipElement.innerText = "You slept under 6h — try a lighter workout today like yoga or walking, and stay hydrated.";
    } else if (userData.lastSleepScore < 70) {
        tipElement.innerText = "Your sleep quality was a bit low. Avoid caffeine after 2 PM today to prep for a better night.";
    } else {
        tipElement.innerText = "Great sleep last night! It's a perfect day for a high-intensity workout or tackling a big project.";
    }
}

// Initialize tip on load
window.onload = updateDailyTip;
