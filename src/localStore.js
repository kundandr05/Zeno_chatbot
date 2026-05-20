const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const sanitizeMemoryText = (value) => String(value || '')
  .replace(/\b(User said:|You said:)\s*/gi, '')
  .trim();

const isIgnoredMemory = (value = '') => {
  const text = sanitizeMemoryText(value).toLowerCase();
  return [
    'help me focus',
    'solve my problem',
    'study support',
    'talk to me',
    'calm my mind',
    'help me out',
    'what to do tomorrow',
  ].some((phrase) => text.startsWith(phrase));
};

export const sanitizeMemoryArray = (items = []) => (Array.isArray(items) ? items.map((item) => {
  if (typeof item === 'string') return sanitizeMemoryText(item);
  return { ...item, text: sanitizeMemoryText(item.text) };
}).filter((item) => !isIgnoredMemory(typeof item === 'string' ? item : item.text)) : []);

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const storageKeys = (uid) => ({
  profile: `user_full_profile_${uid}`,
  sessions: `chat_sessions_${uid}`,
  checkins: `daily_checkins_${uid}`,
  memories: `user_memories_${uid}`,
  tasks: `daily_tasks_${uid}`,
  reminders: `daily_reminders_${uid}`,
});

export const loadArray = (key) => safeParse(localStorage.getItem(key), []);
export const saveArray = (key, value) => localStorage.setItem(key, JSON.stringify(value || []));
export const loadObject = (key, fallback = {}) => safeParse(localStorage.getItem(key), fallback);
export const saveObject = (key, value) => localStorage.setItem(key, JSON.stringify(value || {}));

export const loadCheckins = (uid) => loadArray(storageKeys(uid).checkins);

export const getTodayCheckin = (uid) => {
  const today = todayKey();
  return loadCheckins(uid).find((item) => item.date === today) || null;
};

export const upsertTodayCheckin = (uid, data) => {
  const key = storageKeys(uid).checkins;
  const today = todayKey();
  const checkins = loadArray(key).filter((item) => item.date !== today);
  const next = {
    date: today,
    mainGoal: data.mainGoal || '',
    focusBlockCompleted: Boolean(data.focusBlockCompleted),
    planPrepared: Boolean(data.planPrepared),
    blocker: data.blocker || '',
    completedTasks: Number(data.completedTasks || 0),
    confirmedGoals: Array.isArray(data.confirmedGoals) ? data.confirmedGoals : [],
    updatedAt: new Date().toISOString(),
  };
  const result = [...checkins, next].slice(-30);
  saveArray(key, result);
  return next;
};

export const updateTodayCheckin = (uid, patch) => {
  const current = getTodayCheckin(uid) || {};
  return upsertTodayCheckin(uid, { ...current, ...patch });
};

export const addMemory = (uid, memory) => {
  const key = storageKeys(uid).memories;
  const memories = loadArray(key);
  const next = [
    ...memories,
    { id: Date.now(), text: sanitizeMemoryText(memory), createdAt: new Date().toISOString() },
  ].slice(-80);
  saveArray(key, next);
  return next;
};

export const loadTasks = (uid) => loadArray(storageKeys(uid).tasks);

export const saveTasks = (uid, tasks) => saveArray(storageKeys(uid).tasks, tasks);

const inferTaskMeta = (title, meta = {}) => {
  const lower = title.toLowerCase();
  const dueMatch = lower.match(/\b(today|tonight|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i);
  const recurring = /\b(daily|every day|weekly|every week|recurring)\b/i.test(lower);
  const priority = meta.priority
    || (/\b(urgent|important|exam|deadline|submission|interview|high priority)\b/i.test(lower) ? 'high' : '')
    || (/\b(low priority|later|someday|optional)\b/i.test(lower) ? 'low' : 'normal');

  return {
    priority,
    dueText: meta.dueText || dueMatch?.[1] || '',
    recurring: Boolean(meta.recurring ?? recurring),
    reminderText: meta.reminderText || (dueMatch ? dueMatch[1] : ''),
  };
};

export const addTask = (uid, title, meta = {}) => {
  const cleaned = title.trim();
  if (!cleaned) return loadTasks(uid);
  const tasks = loadTasks(uid);
  const taskMeta = inferTaskMeta(cleaned, meta);
  const next = [
    {
      id: Date.now(),
      title: cleaned,
      completed: false,
      priority: taskMeta.priority,
      source: meta.source || 'manual',
      dueText: taskMeta.dueText,
      recurring: taskMeta.recurring,
      reminderText: taskMeta.reminderText,
      createdAt: new Date().toISOString(),
      completedAt: '',
    },
    ...tasks,
  ].slice(0, 80);
  saveTasks(uid, next);
  return next;
};

export const toggleTask = (uid, taskId) => {
  const tasks = loadTasks(uid);
  const next = tasks.map((task) => task.id === taskId
    ? { ...task, completed: !task.completed, completedAt: task.completed ? '' : new Date().toISOString() }
    : task);
  saveTasks(uid, next);
  return next;
};

export const deleteTask = (uid, taskId) => {
  const next = loadTasks(uid).filter((task) => task.id !== taskId);
  saveTasks(uid, next);
  return next;
};

export const updateTask = (uid, taskId, patch) => {
  const next = loadTasks(uid).map((task) => task.id === taskId ? { ...task, ...patch } : task);
  saveTasks(uid, next);
  return next;
};

export const extractSmartMemories = (message) => {
  const text = message.trim();
  const lower = text.toLowerCase();
  const memories = [];
  const tasks = [];
  const checkin = {};

  const goalMatch = lower.match(/\b(?:i want to|i need to|my goal is|goal is|i have to)\s+(.+)/i);
  if (goalMatch?.[1]) {
    const value = goalMatch[1].replace(/[.!?]$/, '').trim();
    memories.push(value);
    tasks.push({ title: value, priority: 'high', source: 'chat-goal' });
  }

  const eventMatch = lower.match(/\b(?:exam|test|interview|meeting|deadline|submission)\b.*?(?:on|by|this|next)?\s*([a-z]+day|tomorrow|today|tonight|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i);
  if (eventMatch) {
    memories.push(text);
    tasks.push({ title: `Prepare for ${text}`, priority: 'high', source: 'chat-event', dueText: eventMatch[1] });
  }

  const reminderMatch = lower.match(/\b(?:remind me to|remember to|add task|todo|to-do)\s+(.+)/i);
  if (reminderMatch?.[1]) {
    const value = reminderMatch[1].replace(/[.!?]$/, '').trim();
    const meta = inferTaskMeta(value);
    memories.push(value);
    tasks.push({ title: value, priority: meta.priority, source: 'chat-reminder', dueText: meta.dueText, recurring: meta.recurring, reminderText: meta.reminderText });
  }

  const preferenceMatch = lower.match(/\b(?:i like|i prefer|i don't like|i hate|i love)\s+(.+)/i);
  if (preferenceMatch?.[1]) {
    memories.push(text);
  }

  if (/\b(?:cannot focus|can't focus|can not focus|distracted|phone usage|overthinking|overthink|procrastinating|procrastinate)\b/i.test(lower)) {
    memories.push(text);
  }

  if (/\b(?:stressed|stress|anxious|overwhelmed|burnout|mentally tired|mental exhaustion|pressure)\b/i.test(lower)) {
    memories.push(text);
  }

  const habitMatch = lower.match(/\b(?:habit|routine|consistency|consistent|inconsistent)\b.*?(study|phone|planning|focus)?/i);
  if (habitMatch) {
    memories.push(text);
  }

  const moodMatch = lower.match(/\b(?:i feel|feeling|i am|i'm)\s+(sad|okay|ok|good|great|stressed|anxious|tired|happy|scared|overwhelmed|lazy|confused)\b/i);
  if (moodMatch?.[1]) {
    memories.push(text);
  }

  const mainGoalMatch = lower.match(/\b(?:today(?:'s)? main goal is|main goal is|top priority is)\s+(.+)/i);
  if (mainGoalMatch?.[1]) {
    checkin.mainGoal = mainGoalMatch[1].replace(/[.!?]$/, '').trim();
    memories.push(checkin.mainGoal);
  }

  const blockerMatch = lower.match(/\b(?:blocker is|blocked by|stuck on|struggling with)\s+(.+)/i);
  if (blockerMatch?.[1]) {
    checkin.blocker = blockerMatch[1].replace(/[.!?]$/, '').trim();
    memories.push(checkin.blocker);
  }

  if (/\b(?:finished|completed|did)\s+(?:a\s+)?(?:focus block|deep work block|study block)\b/i.test(lower)) {
    checkin.focusBlockCompleted = true;
    memories.push('Completed a focus block');
  }

  if (/\b(?:planned tomorrow|prepared tomorrow|tomorrow is planned|set up tomorrow)\b/i.test(lower)) {
    checkin.planPrepared = true;
    memories.push('Tomorrow is prepared');
  }

  return { memories, tasks, checkin };
};

export const saveExtractedMemories = (uid, message) => {
  const extracted = extractSmartMemories(message);
  let memories = loadArray(storageKeys(uid).memories);
  let tasks = loadTasks(uid);

  if (extracted.memories.length) {
    const timestamp = new Date().toISOString();
    const newMemories = extracted.memories
      .map((text) => sanitizeMemoryText(text))
      .filter((text) => text && !isIgnoredMemory(text));
    memories = [
      ...memories,
      ...newMemories.map((text, index) => ({ id: Date.now() + index, text, createdAt: timestamp })),
    ].slice(-80);
    saveArray(storageKeys(uid).memories, memories);
  }

  if (extracted.tasks.length) {
    const timestamp = new Date().toISOString();
    const newTasks = extracted.tasks.map((task, index) => ({
      id: Date.now() + 100 + index,
      title: task.title,
      completed: false,
      priority: task.priority,
      source: task.source,
      dueText: task.dueText || '',
      recurring: Boolean(task.recurring),
      reminderText: task.reminderText || task.dueText || '',
      createdAt: timestamp,
      completedAt: '',
    }));
    tasks = [...newTasks, ...tasks].slice(0, 80);
    saveTasks(uid, tasks);
  }

  if (Object.keys(extracted.checkin || {}).length) {
    updateTodayCheckin(uid, extracted.checkin);
  }

  return { memories, tasks, extracted };
};

export const loadLifeMemory = (uid) => ({
  checkins: loadCheckins(uid),
  today: getTodayCheckin(uid),
  tasks: loadTasks(uid),
  reminders: loadArray(storageKeys(uid).reminders),
  memories: sanitizeMemoryArray(loadArray(storageKeys(uid).memories)).filter((item) => !isIgnoredMemory(typeof item === 'string' ? item : item.text)),
});

export const weeklySummary = (uid) => {
  const checkins = loadCheckins(uid).slice(-7);
  const completed = (key) => checkins.filter((item) => item[key]).length;

  return {
    days: checkins.length,
    focusDays: completed('focusBlockCompleted'),
    planningDays: completed('planPrepared'),
  };
};
