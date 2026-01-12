// Cleaned main module for the app

// Import what we need from the firebase-config module
import {
  auth,
  db,
  provider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithRedirect,
  getRedirectResult,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
  getDoc,
  setDoc
} from "./firebase-config.js";

// --- STATE MANAGEMENT ---
let currentUser = null;
let tasks = [];
let focusInterval;
let selectedSubjectId = null; // Track currently selected subject for filtering/topic display
let selectedTopicId = null;   // Track currently selected topic for filtering
let subjects = []; // New: Store loaded subjects
let topics = [];   // New: Store loaded topics
let userXP = 0;
let userLevel = 1;
let currentStatusFilter = 'all'; // Track 'all', 'pending', or 'completed'
const sounds = {};
let currentQuoteCategory = 'general'; // To track the current quote category
// --- DOM ELEMENTS ---
const authSection = document.getElementById('auth-section');
const appDashboard = document.getElementById('app-dashboard');
const taskList = document.getElementById('task-list');
const stressBar = document.getElementById('stress-bar');
const stressText = document.getElementById('stress-text');
const xpBarFill = document.getElementById('xp-bar-fill');
const levelDisplay = document.getElementById('level-display');
const subjectSelect = document.getElementById('subject-select'); // Existing
const topicSelect = document.getElementById('topic-select');     // New
const subjectsContainer = document.getElementById('subjects-container'); // New
const topicsContainer = document.getElementById('topics-container');     // New
const newSubjectInput = document.getElementById('new-subject-input');     // New
const newTopicInput = document.getElementById('new-topic-input');         // New
const addSubjectModal = document.getElementById('add-subject-modal');     // New
const addTopicModal = document.getElementById('add-topic-modal');         // New
const topicSubjectSelect = document.getElementById('topic-subject-select'); // New
const openAddSubjectModalBtn = document.getElementById('open-add-subject-modal-btn'); // New
const saveNewSubjectBtn = document.getElementById('save-new-subject-btn'); // New
const closeSubjectModalBtn = document.getElementById('close-subject-modal'); // New
const openAddTopicModalBtn = document.getElementById('open-add-topic-modal-btn');     // New
const saveNewTopicBtn = document.getElementById('save-new-topic-btn'); // New
const closeTopicModalBtn = document.getElementById('close-topic-modal'); // New

// --- ENGINEERING CONSTANTS ---
const subjectWeights = {
  'DSA': 5, 'OS': 4, 'DBMS': 4, 'Maths': 3, 'Projects': 5, 'General': 1
};

// --- INITIALIZATION & OFFLINE PERSISTENCE ---
// Subject and Topic selects will be populated dynamically from Firestore

// --- OFFLINE PERSISTENCE ---
try { enableIndexedDbPersistence(db).catch(err => console.log("Persistence error:", err.code)); } catch(e) {}

// --- ENGINEERING QUOTES SYSTEM ---
const engineeringQuotes = {
  general: [
    "Backlogs don’t define you — clearing them does. Start now 💪",
    "Engineering is the closest thing to magic that exists.",
    "Focus on progress, not perfection.",
    "Code is like humor. When you have to explain it, it’s bad.",
    "No one becomes an engineer by motivation alone — discipline builds degrees 🎓",
    "Your CGPA won’t improve by scrolling reels. Just saying 👀📱",
    "One focused hour beats ten distracted ones — start the task 🚀",
    "Engineering is hard. Staying average is harder."
  ],
  exam: [
    "Study now so future-you doesn’t cry during results 😴📖",
    "You’ve studied enough to start. Open the book 📘",
    "Yes, others are chilling. No, they won’t write your exam.",
    "Syllabus is huge, but your will is stronger. (Hopefully) 📚"
  ],
  coding: [
    "Every error you debug today is one less regret in placements 💻🔥",
    "Debug life like your code — step by step.",
    "Skills pay more than excuses. Open VS Code.",
    "It works on my machine... but that doesn't count. Fix it. 🐛"
  ],
  placement: [
    "Companies don’t ask how stressed you were — they ask what you know.",
    "One project can change your resume. Start it.",
    "Backlogs don’t define you — clearing them does. Start now 💪"
  ],
  morning: [
    "Start early. Engineers who plan suffer less later ☀️",
    "Coffee ☕ + Code 💻 = Progress 📈",
    "Morning grind sets the CGPA mind."
  ],
  night: [
    "Late nights are okay — wasted nights are not 🌙",
    "The compiler doesn't sleep, but you should eventually. Finish this first.",
    "3 AM motivation is fake. Do it now."
  ],
  stress: [
    "You don’t need perfection, just progress.",
    "Even 20 minutes of study beats zero.",
    "Take a deep breath. You got this. 🧘"
  ],
  motivated: [
    "This is the grind moment — don’t waste it. 🔥",
    "You’re officially serious now 😎",
    "This is how toppers are built 🧠"
  ],
  guilt: [
    "Skipping today = stress tomorrow. Choose wisely 😏",
    "Your future self is watching this decision 👀",
    "Procrastination is like a credit card: it's a lot of fun until you get the bill."
  ]
};

function getDynamicQuote(category = 'general') {
  if (category === 'general') {
    const hour = new Date().getHours();
    if (hour < 10) category = 'morning';
    else if (hour > 22) category = 'night';
  }
  const list = engineeringQuotes[category] || engineeringQuotes['general'];
  return list[Math.floor(Math.random() * list.length)];
}

// --- AUTHENTICATION CORE FIXES ---

// 1. Ensure Auth Persistence across devices and reloads
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("Persistence Error:", error.code));

// 2. Handle Redirect Result (Crucial for Mobile Google Sign-In)
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) console.log("Redirect sign-in successful:", result.user.email);
  })
  .catch((error) => {
    console.error("Redirect Auth Error:", error.code, error.message);
  });

// --- AUTH HANDLERS ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authSection.classList.add('hidden');
    appDashboard.classList.remove('hidden');
    document.getElementById('quote-display').innerText = getDynamicQuote(currentQuoteCategory); // Set initial quote
    document.getElementById('user-name').innerText = user.displayName || (user.email ? user.email.split('@')[0] : 'Student');
    document.getElementById('quote-display').innerText = getDynamicQuote();
    loadUserStats(user.uid);
    // Load subjects and topics after user is authenticated
    loadSubjects(); // New: Load subjects
    loadTopics();   // New: Load topics (all topics initially)
    loadTasks();
  } else {
    currentUser = null;
    authSection.classList.remove('hidden');
    appDashboard.classList.add('hidden');
  }
});

// Helper: User-friendly error messages
function handleAuthError(error) {
  console.error("Firebase Auth Error:", error.code, error.message);
  const messageElement = document.getElementById('auth-message');
  let userMessage = "An unexpected error occurred. Please try again.";

  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      userMessage = "Invalid email or password. Please check your credentials.";
      break;
    case 'auth/invalid-email':
      userMessage = "Please enter a valid email address.";
      break;
    case 'auth/weak-password':
      userMessage = "Password should be at least 6 characters.";
      break;
    case 'auth/email-already-in-use':
      userMessage = "This email is already registered. Try logging in.";
      break;
    case 'auth/popup-closed-by-user':
      userMessage = "Sign-in window was closed before finishing.";
      break;
    case 'auth/operation-not-allowed':
      userMessage = "This sign-in method is not enabled in Firebase Console.";
      break;
  }
  if (messageElement) messageElement.innerText = userMessage;
}

// Email/Password Login
const loginBtn = document.getElementById('login-btn');
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim(); // Trim whitespace
  const pass = document.getElementById('password').value;

  if (!email || !pass) {
    return handleAuthError({ code: 'auth/invalid-email' });
  }

  try {
    // Clear previous messages
    document.getElementById('auth-message').innerText = "Logging in...";
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    handleAuthError(e);
  }
});

// Sign Up (Email/Password)
const signupBtn = document.getElementById('signup-btn');
signupBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value.trim();
  
  if (!email || pass.length < 6) {
    return handleAuthError({ code: 'auth/weak-password' });
  }

  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    handleAuthError(e);
  }
});

// Google sign-in (single handler)
const googleBtn = document.getElementById('google-btn');
googleBtn.addEventListener('click', async () => {
  // Detect mobile to prevent popup issues
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Verify domain (Development check)
  if (window.location.hostname !== "localhost" && !window.location.hostname.includes("firebaseapp.com")) {
    console.warn("Warning: Ensure this domain is added to Authorized Domains in Firebase Console.");
  }

  try {
    if (isMobile) {
      console.log("Auth: Mobile detected, using Redirect method.");
      await signInWithRedirect(auth, provider);
    } else {
      console.log("Auth: Desktop detected, using Popup method.");
      await signInWithPopup(auth, provider);
    }
  } catch (e) {
    if (e.code === 'auth/popup-blocked') {
      console.warn("Popup blocked, falling back to redirect...");
      await signInWithRedirect(auth, provider);
    } else {
      handleAuthError(e);
    }
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Sign out failed', e);
  }
});

// --- GAMIFICATION ---
async function loadUserStats(uid) {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    userXP = data.xp || 0;
    userLevel = Math.floor(Math.sqrt(userXP / 10)) + 1;
  } else {
    userXP = 0; userLevel = 1;
  }
  updateXPUI();
}

function updateXPUI() {
  levelDisplay.innerText = `Lvl ${userLevel}`;
  const nextLevelXP = Math.pow(userLevel, 2) * 10;
  const prevLevelXP = Math.pow(userLevel - 1, 2) * 10;
  const progress = ((userXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
  xpBarFill.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
}

async function addXP(amount) {
  userXP += amount;
  userLevel = Math.floor(Math.sqrt(userXP / 10)) + 1;
  updateXPUI();
  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid), { xp: userXP }, { merge: true });
  }
}

// --- TASK MANAGEMENT ---

// Add Task
const addTaskBtn = document.getElementById('add-task-btn');
addTaskBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  // Overload Warning
  if (tasks.filter(t => !t.completed).length >= 10) {
    if (!confirm("⚠️ Overload Warning: You have a lot on your plate. Are you sure you want to add more?")) return;
  }

  const titleInput = document.getElementById('task-input');
  const title = titleInput.value.trim();
  let priority = document.getElementById('priority-select').value; // Changed to let
  
  const selectedSubjectIdForTask = subjectSelect.value === 'all' ? null : subjectSelect.value; // Get selected subject ID from dropdown
  const selectedSubject = subjects.find(s => s.id === selectedSubjectIdForTask); // Find the subject object
  const subjectName = selectedSubject ? selectedSubject.name : 'General'; // Get subject name

  const selectedTopicIdForTask = topicSelect.value === 'all' ? null : topicSelect.value; // Get selected topic ID from dropdown
  const selectedTopic = topics.find(t => t.id === selectedTopicIdForTask); // Find the topic object
  const topicName = selectedTopic ? selectedTopic.name : 'No Topic'; // Get topic name
  let date = document.getElementById('task-date').value;

  // Validation with visual feedback
  if (!title) { // Check if title is empty after trimming
    titleInput.classList.add('shake');
    titleInput.focus();
    setTimeout(() => titleInput.classList.remove('shake'), 500);
    return;
  }

  // Default to today if no date picked
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  // Smart Priority Logic
  const today = new Date();
  const due = new Date(date);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  // Use subjectName for weight lookup
  if (diffDays <= 2 || subjectWeights[subjectName] >= 5) priority = 'high';
  else if (diffDays <= 5 || subjectWeights[subjectName] >= 3) priority = 'medium';

  try {
    await addDoc(collection(db, 'zenfocus_db'), {
      uid: currentUser.uid,
      title, // Task title
      subjectId: selectedSubjectIdForTask,
      subjectName, // Store subject name directly
      topicId: selectedTopicIdForTask,
      topicName,
      priority,
      dueDate: date,
      completed: false,
      createdAt: serverTimestamp()
    });
    document.getElementById('task-input').value = '';
    addXP(5); // XP for adding a task
    showEncouragement();
  } catch (e) {
    console.error('Error adding task:', e);
    alert("Failed to add task. Please check your connection or login status.");
  }
});

// Update topic dropdown when subject changes in the input group
subjectSelect.addEventListener('change', (e) => {
  renderTopicSelectors(e.target.value);
});

// Allow "Enter" key to add task
document.getElementById('task-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('add-task-btn').click();
  }
});

// Load Tasks (Real-time listener)
function loadTasks() {
  if (!currentUser) return;
  const q = query(collection(db, 'zenfocus_db'), where('uid', '==', currentUser.uid)); // Order by createdAt for consistency
  onSnapshot(q, (snapshot) => { // Removed duplicate onSnapshot
    tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks(); // Render tasks based on current filters
    updateBossBattle();
    updateWellnessStats();
  });
}

 
// Render Tasks
function renderTasks(taskArray) {
  let filteredTasks = taskArray || tasks;

  // 1. Filter by Status
  if (currentStatusFilter === 'pending') {
    filteredTasks = filteredTasks.filter(t => !t.completed);
  } else if (currentStatusFilter === 'completed') {
    filteredTasks = filteredTasks.filter(t => t.completed);
  }

  // 2. Filter by Subject/Topic (Sidebar)
  if (selectedSubjectId && selectedSubjectId !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.subjectId === selectedSubjectId);
  }
  if (selectedTopicId && selectedTopicId !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.topicId === selectedTopicId);
  }

  taskList.innerHTML = '';

  if (filteredTasks.length === 0) {
    // Add pulse animation to add-task-btn when empty
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('add-task-btn').classList.add('pulse-cta');
    return;
  }
  document.getElementById('empty-state').classList.add('hidden');
  // Remove pulse animation if tasks exist
  if (document.getElementById('add-task-btn').classList.contains('pulse-cta')) {
    document.getElementById('add-task-btn').classList.remove('pulse-cta');
  }

  filteredTasks.sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.priority] - { high: 3, medium: 2, low: 1 }[a.priority]));

  // Identify Hardest Task (High Priority + Earliest Due Date)
  let hardestTaskId = null;
  const pendingHigh = filteredTasks.filter(t => !t.completed && t.priority === 'high');
  if (pendingHigh.length > 0) {
    pendingHigh.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    hardestTaskId = pendingHigh[0].id;
  }

  filteredTasks.forEach(task => { // Iterate over filteredTasks
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority || 'low'}`; // Default to low if priority is missing
    if (task.id === hardestTaskId) {
      li.classList.add('hardest-task');
    }
    li.style.opacity = task.completed ? '0.5' : '1';

    // Escape single quotes to prevent breaking the UI
    const safeTitle = task.title ? task.title.replace(/'/g, "\\'") : '';
    const safeSubjectName = task.subjectName ? task.subjectName.replace(/'/g, "\\'") : 'General'; // Ensure subjectName is safe
    const safeTopicName = task.topicName ? task.topicName.replace(/'/g, "\\'") : 'No Topic';

    li.innerHTML = ` 
      <div class="task-content ${task.completed ? 'completed-task-text' : ''}" title="${task.title}">
        <h4>${task.title} <span class="badge subject-badge">${safeSubjectName}</span> <span class="badge topic-badge">${safeTopicName}</span></h4>
        <small><i class="far fa-clock"></i> ${task.dueDate || 'No deadline'}</small>
      </div> 
      <div class="actions">
        ${!task.completed ? `<button class="btn-split" onclick="splitTask('${task.id}', '${safeTitle}', '${task.subjectId}', '${safeSubjectName}', '${task.topicId}', '${safeTopicName}', '${task.dueDate}')" title="Smart Split Task"><i class="fas fa-project-diagram"></i></button>` : ''}
        <button onclick="toggleTask('${task.id}', ${task.completed})" title="${task.completed ? 'Mark as Pending' : 'Mark as Complete'}">
          <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
        </button>
        <button onclick="deleteTask('${task.id}')" title="Delete Task"><i class="fas fa-trash"></i></button>
      </div>
    `; 

    taskList.appendChild(li);
  });
}

// Global functions for HTML onclick access
window.toggleTask = async (id, status) => {
  try {
    await updateDoc(doc(db, 'zenfocus_db', id), { completed: !status });
    if (!status) {
      showConfetti();
      // Boss Damage Effect
      const bossBar = document.getElementById('boss-hp-fill');
      if (bossBar) {
        bossBar.style.backgroundColor = '#fff';
        setTimeout(() => bossBar.style.backgroundColor = '', 200);
      }
      addXP(20); // XP for completion
    }
  } catch (e) {
    console.error('Toggle task failed', e);
  }
};

window.deleteTask = async (id) => {
  const guiltQuote = getDynamicQuote('guilt');
  if (confirm(`Delete this task?\n\n"${guiltQuote}"`)) {
    await deleteDoc(doc(db, 'zenfocus_db', id));
  }
};

// Smart Task Splitter (Simulated AI)
window.splitTask = async (id, title, subjectId, subjectName, topicId, topicName, dueDate) => {
  if(!confirm(`Use Smart Splitter to break down "${title}"?`)) return;
  
  const subtasks = ["Research & Planning", "Core Development", "Testing & Review"];

  for (let sub of subtasks) {
    await addDoc(collection(db, 'zenfocus_db'), { // Pass all relevant fields to subtasks, using dueDate
      uid: currentUser.uid, title: `${sub}: ${title}`, priority: 'medium', subjectId: subjectId || null, subjectName: subjectName || 'General', topicId: topicId || null, topicName: topicName || 'No Topic', dueDate: dueDate, completed: false, createdAt: serverTimestamp()
    });
  }
  await deleteDoc(doc(db, 'zenfocus_db', id)); // Remove original big task
  addXP(10);
};

window.filterTasks = (type) => {
  currentStatusFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${type}'`));
  });
  renderTasks();
};

// --- WELLNESS FEATURES ---

function updateWellnessStats() {
  const pending = tasks.filter(t => !t.completed);
  const highPri = pending.filter(t => t.priority === 'high').length;
  // AI-based Stress Calculation
  let stressScore = 0; // Initialize stressScore
  pending.forEach(t => {
    const weight = subjectWeights[t.subjectName || 'General'] || 2; // Use subjectName for weight lookup
    stressScore += weight * 2;
    if (t.priority === 'high') stressScore += 10;
  });

  let stressLevel = Math.min(stressScore, 100);
  if (stressLevel > 100) stressLevel = 100;

  stressBar.style.width = `${stressLevel}%`;

  if (stressLevel < 30) {
    stressBar.style.background = '#00b894';
    stressText.innerText = 'Chill Mode 🧘';
  } else if (stressLevel < 70) {
    stressBar.style.background = '#fdcb6e';
    stressText.innerText = 'Moderate Load 📚';
  } else {
    stressBar.style.background = '#ff7675';
    stressText.innerText = 'High Stress! Take a break. ☕';
  }
}

// --- BOSS BATTLE MODE ---
function updateBossBattle() {
  const bossSection = document.getElementById('boss-battle-section');
  if (document.body.classList.contains('exam-mode')) {
    bossSection.classList.add('active');
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const hpPercent = totalTasks === 0 ? 100 : 100 - ((completedTasks / totalTasks) * 100);
    
    document.getElementById('boss-hp-fill').style.width = `${hpPercent}%`;
    document.getElementById('boss-name').innerText = hpPercent === 0 ? "DEFEATED 🏆" : "Semester Exams";
  } else {
    bossSection.classList.remove('active');
  }
}

function showEncouragement(customText) {
  const msg = document.createElement('div');
  msg.innerText = customText || "Added! You're doing great.";
  msg.style = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #6c5ce7; color: white; padding: 10px 20px; border-radius: 20px; animation: slideUp 0.5s;";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// --- FOCUS MODE (POMODORO) ---
window.startTimer = (minutes) => {
  clearInterval(focusInterval);
  let seconds = minutes * 60;
  const display = document.getElementById('timer');
  
  // Activate Focus Shield
  document.body.classList.add('focus-shield');

  focusInterval = setInterval(() => {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    display.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

    if (seconds === 0) {
      clearInterval(focusInterval);
      alert('Focus session complete! Take a break.');
      document.body.classList.remove('focus-shield');
      display.innerText = '00:00';
    }
    seconds--;
  }, 1000);
};

window.resetTimer = () => {
  // Regret Minimizer Prompt
  if (confirm("Will future-you be happy if you stop now? 🥺")) {
    clearInterval(focusInterval);
    document.body.classList.remove('focus-shield');
    document.getElementById('timer').innerText = '25:00';
  }
};

// --- BREATHING EXERCISE ---
document.getElementById('breathe-btn').addEventListener('click', () => {
  document.getElementById('breathing-modal').classList.remove('hidden');
});

window.setBreathingMode = (mode) => {
  const circle = document.getElementById('breath-circle');
  const text = document.getElementById('breath-text');
  
  // Reset animation
  circle.style.animation = 'none';
  circle.offsetHeight; /* trigger reflow */
  
  if (mode === 'energy') {
    circle.style.animation = 'breathAnim 4s infinite'; // Fast
    text.innerText = "Power Up";
  } else if (mode === 'focus') {
    circle.style.animation = 'breathAnim 10s infinite'; // Slow
    text.innerText = "Focus";
  } else {
    circle.style.animation = 'breathAnim 19s infinite'; // 4-7-8
    text.innerText = "Inhale";
  }
};

document.getElementById('close-breath').addEventListener('click', () => {
  document.getElementById('breathing-modal').classList.add('hidden');
});

// --- AMBIENT SOUNDS ---
window.toggleSound = (type) => {
  if (!sounds[type]) {
    const urls = {
      rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
      coffee: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
    };
    sounds[type] = new Audio(urls[type]);
    sounds[type].loop = true;
  }
  
  if (sounds[type].paused) {
    sounds[type].play();
  } else {
    sounds[type].pause();
  }
};

// --- EXAM MODE ---
document.getElementById('exam-mode-btn').addEventListener('click', () => {
  document.body.classList.toggle('exam-mode');
  const btn = document.getElementById('exam-mode-btn');
  btn.innerHTML = document.body.classList.contains('exam-mode') ? '<i class="fas fa-times"></i> Exit Exam Mode' : '<i class="fas fa-user-graduate"></i> Exam Mode';
  updateBossBattle();
});

// --- MOOD HANDLER ---
window.setMood = (mood) => {
  let category = 'general';
  if (mood === 'tired' || mood === 'stressed') category = 'stress';
  else if (mood === 'motivated') category = 'motivated'; // Corrected category assignment
  
  currentQuoteCategory = category; // Update the global category
  document.getElementById('quote-display').innerText = getDynamicQuote(currentQuoteCategory);
  
  const msg = mood === 'tired' || mood === 'stressed' ? "Take it easy 💙" : "Let's go! 🔥";
  showEncouragement(msg);
};

// --- DARK MODE ---
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
});

function showConfetti() {
  document.body.style.filter = 'hue-rotate(90deg)';
  setTimeout(() => document.body.style.filter = 'none', 500);
}

// --- SOCIAL SIMULATION ---
setInterval(() => {
  const count = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
  document.getElementById('online-count').innerText = count;
}, 10000);

// --- SUBJECT & TOPIC MANAGEMENT ---

// Load Subjects from Firestore
async function loadSubjects() {
  if (!currentUser) return;
  const q = query(collection(db, `users/${currentUser.uid}/subjects`));
  onSnapshot(q, snapshot => {
    subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSubjectSelectors();
    renderSubjectChips();
    // After loading subjects, ensure topics are rendered for the initially selected subject (if any)
    if (selectedSubjectId) {
      renderTopicTags(selectedSubjectId);
      renderTopicSelectors(selectedSubjectId);
    } else {
      renderTopicTags('all'); // Show all topics initially if no subject is selected
      renderTopicSelectors('all');
    }
  });
}

// Load Topics from Firestore
async function loadTopics() {
  if (!currentUser) return;
  const q = query(collection(db, `users/${currentUser.uid}/topics`));
  onSnapshot(q, snapshot => {
    topics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Re-render topic selectors and tags based on current subject selection
    if (selectedSubjectId) {
      renderTopicSelectors(selectedSubjectId);
      renderTopicTags(selectedSubjectId);
    } else {
      renderTopicSelectors('all');
      renderTopicTags('all');
    }
  });
}

// Render subjects into the task creation dropdowns
function renderSubjectSelectors() {
  subjectSelect.innerHTML = '<option value="all">Select Subject</option>';
  topicSubjectSelect.innerHTML = '<option value="">Select Subject</option>'; // For add topic modal

  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.innerText = subject.name;
    subjectSelect.appendChild(option);

    const modalOption = option.cloneNode(true);
    topicSubjectSelect.appendChild(modalOption);
  });

  // Set selected values if they exist
  if (selectedSubjectId) {
    subjectSelect.value = selectedSubjectId;
    topicSubjectSelect.value = selectedSubjectId;
  }
}

// Render topics into the task creation dropdown (filtered by subject)
function renderTopicSelectors(subjectId) {
  topicSelect.innerHTML = '<option value="all">Select Topic</option>';
  const filteredTopics = subjectId === 'all' ? topics : topics.filter(t => t.subjectId === subjectId);

  filteredTopics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic.id;
    option.innerText = topic.name;
    topicSelect.appendChild(option);
  });

  if (selectedTopicId) {
    topicSelect.value = selectedTopicId;
  }
}

// Render subject chips in the sidebar
function renderSubjectChips() {
  subjectsContainer.innerHTML = '';
  if (subjects.length === 0) {
    subjectsContainer.innerHTML = '<p class="empty-message">No subjects yet. Add one!</p>';
    return;
  }

  subjects.forEach(subject => {
    const chip = document.createElement('div');
    chip.className = `subject-chip ${selectedSubjectId === subject.id ? 'active' : ''}`;
    chip.dataset.subjectId = subject.id;
    
    // Calculate workload density for bonus UX
    // Calculate workload density for bonus UX (ensure 'tasks' array is available)
    const taskCount = tasks.filter(t => t.subjectId === subject.id && !t.completed).length;
    chip.style.setProperty('--workload-glow', `rgba(162, 155, 254, ${Math.min(taskCount / 5, 1) * 0.5 + 0.1})`); // Max 10 tasks for full glow

    chip.innerHTML = `
      <span>${subject.name}</span>
      <span class="subject-task-count">${taskCount}</span>
      <button class="delete-chip-btn" onclick="deleteSubject('${subject.id}')"><i class="fas fa-times"></i></button>
    `;
    chip.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-chip-btn') && !e.target.closest('.delete-chip-btn')) {
        selectSubjectFilter(subject.id);
      }
    });
    subjectsContainer.appendChild(chip);
  });
}

// Render topic tags in the sidebar (filtered by selected subject)
function renderTopicTags(subjectId) {
  topicsContainer.innerHTML = '';
  const filteredTopics = subjectId === 'all' ? topics : topics.filter(t => t.subjectId === subjectId);

  if (filteredTopics.length === 0) {
    topicsContainer.innerHTML = '<p class="empty-message">No topics for this subject. Add one!</p>';
    return;
  }

  filteredTopics.forEach(topic => {
    const tag = document.createElement('div');
    tag.className = `topic-tag ${selectedTopicId === topic.id ? 'active' : ''}`;
    tag.dataset.topicId = topic.id;
    tag.innerHTML = `
      <span>${topic.name}</span>
      <button class="delete-chip-btn" onclick="deleteTopic('${topic.id}')"><i class="fas fa-times"></i></button>
    `;
    tag.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-chip-btn') && !e.target.closest('.delete-chip-btn')) {
        selectTopicFilter(topic.id);
      }
    });
    topicsContainer.appendChild(tag);
  });
}

// Handle subject chip click for filtering
function selectSubjectFilter(subjectId) {
  selectedSubjectId = subjectId;
  selectedTopicId = null; // Reset topic filter when subject changes
  renderSubjectChips(); // Update active state
  renderTopicTags(subjectId); // Show topics for selected subject
  renderTopicSelectors(subjectId); // Update topic dropdown
  renderTasks(); // Re-render tasks with new filter
}

// Handle topic tag click for filtering
function selectTopicFilter(topicId) {
  selectedTopicId = topicId;
  renderTopicTags(selectedSubjectId); // Update active state
  renderTasks(); // Re-render tasks with new filter
}

// Event Listeners for Subject/Topic Modals
openAddSubjectModalBtn.addEventListener('click', () => addSubjectModal.classList.remove('hidden'));
closeSubjectModalBtn.addEventListener('click', () => addSubjectModal.classList.add('hidden'));
saveNewSubjectBtn.addEventListener('click', async () => {
  const subjectName = newSubjectInput.value.trim();
  if (!subjectName) return alert('Subject name cannot be empty.');
  await addDoc(collection(db, `users/${currentUser.uid}/subjects`), { name: subjectName, createdAt: serverTimestamp() });
  newSubjectInput.value = '';
  addSubjectModal.classList.add('hidden');
});

openAddTopicModalBtn.addEventListener('click', () => {
  if (subjects.length === 0) {
    alert('Please add a subject first before adding topics.');
    return;
  }
  addTopicModal.classList.remove('hidden');
});
closeTopicModalBtn.addEventListener('click', () => addTopicModal.classList.add('hidden'));
saveNewTopicBtn.addEventListener('click', async () => {
  const topicName = newTopicInput.value.trim();
  const subjectId = topicSubjectSelect.value;
  if (!topicName || !subjectId) return alert('Topic name and subject must be selected.');

  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return alert('Selected subject not found.');

  await addDoc(collection(db, `users/${currentUser.uid}/topics`), {
    name: topicName,
    subjectId: subjectId,
    subjectName: subject.name,
    createdAt: serverTimestamp()
  });
  newTopicInput.value = '';
  topicSubjectSelect.value = '';
  addTopicModal.classList.add('hidden');
});

// Delete Subject/Topic functions
window.deleteSubject = async (subjectId) => {
  if (!confirm('Deleting a subject will also delete all associated topics and tasks. Are you sure?')) return;
  
  // Delete associated topics
  const topicsToDelete = topics.filter(t => t.subjectId === subjectId);
  for (const topic of topicsToDelete) {
    await deleteDoc(doc(db, `users/${currentUser.uid}/topics`, topic.id));
  }

  // Delete associated tasks
  const tasksToDelete = tasks.filter(t => t.subjectId === subjectId);
  for (const task of tasksToDelete) {
    await deleteDoc(doc(db, 'zenfocus_db', task.id));
  }

  await deleteDoc(doc(db, `users/${currentUser.uid}/subjects`, subjectId));
  if (selectedSubjectId === subjectId) { // Reset filter if deleted subject was active
    selectedSubjectId = null;
    selectedTopicId = null;
    renderTasks();
  }
};

window.deleteTopic = async (topicId) => {
  if (!confirm('Deleting this topic will remove it from all associated tasks. Are you sure?')) return;
  
  // Update tasks that have this topic to remove the topic association
  const tasksToUpdate = tasks.filter(t => t.topicId === topicId);
  for (const task of tasksToUpdate) {
    await updateDoc(doc(db, 'zenfocus_db', task.id), {
      topicId: null,
      topicName: null
    });
  }

  await deleteDoc(doc(db, `users/${currentUser.uid}/topics`, topicId));
  if (selectedTopicId === topicId) { // Reset filter if deleted topic was active
    selectedTopicId = null;
    renderTasks();
  }
};



// --- VANTA BACKGROUND ---
let vantaEffect = null;

if (window.VANTA) {
  vantaEffect = window.VANTA.NET({
    el: "#vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: true,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    color: 0xa29bfe,
    backgroundColor: 0x0B0F1A
  });
}

// Update Vanta on Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (vantaEffect) {
    vantaEffect.setOptions({
      backgroundColor: isDark ? 0x0B0F1A : 0xF4F6FA,
      color: isDark ? 0xa29bfe : 0x6c5ce7
    });
  }
});

// Initial population of subject/topic selectors when the page loads (before auth)
// This is important for the add task form to have options even if user is not logged in yet,
// though actual saving will require auth.
document.addEventListener('DOMContentLoaded', () => {
  renderSubjectSelectors();
  renderTopicSelectors('all');
});

// --- MOBILE NAVIGATION HANDLER ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return; // Skip buttons with onclick handlers like Breathe

    // Update Active Button
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle Views
    const views = ['tasks-view', 'sidebar-view'];
    views.forEach(viewId => {
      const el = document.getElementById(viewId);
      if (viewId === targetId) {
        el.classList.remove('mobile-hidden');
      } else {
        el.classList.add('mobile-hidden');
      }
    });
  });
});

// --- CHATBOT DELAYED LOAD ---
setTimeout(() => {
  const script = document.createElement('script');
  script.src = "https://cdn.jotfor.ms/agent/embedjs/019ba7fd7a2a751ea33d83b66787da991bfa/embed.js";
  document.body.appendChild(script);
}, 5000);
