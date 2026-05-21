const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9\s'-]/gi, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (text, words) => words.some((word) => text.includes(word));
const firstName = (profile) => profile?.fullName?.split(' ')[0] || profile?.displayName?.split(' ')[0] || 'there';
const openTasks = (memory) => (memory?.tasks || []).filter((task) => !task.completed);
const cleanMemoryText = (text = '') => String(text)
  .replace(/\b(User said:|You said:)\s*/gi, '')
  .trim();
const firstSentence = (text = '') => {
  const cleaned = String(text).trim();
  if (!cleaned) return '';
  return cleaned.split(/(?<=[.!?])\s+/)[0].replace(/[.!?]+$/g, '').trim();
};
const isSmallTalk = (text = '') => includesAny(normalize(text), [
  'hello',
  'hi',
  'hey',
  'good morning',
  'good afternoon',
  'good evening',
  'how are you',
  'how are u',
  'how r u',
  'hru',
  'thanks',
  'thank you',
]);
const isIgnoredMemory = (text = '') => {
  const cleaned = cleanMemoryText(text).toLowerCase();
  return ['help me focus', 'solve my problem', 'study support', 'talk to me', 'calm my mind', 'help me out'].some((phrase) => cleaned.startsWith(phrase));
};
const memoryItems = (memory) => (memory?.memories || [])
  .map((item) => cleanMemoryText(item.text || item))
  .filter((item) => item && !isIgnoredMemory(item));

const choice = (items, seed = '') => {
  if (!items.length) return '';
  const value = String(seed).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[value % items.length];
};

const meaningfulMemory = (memory = {}, pattern = /focus|stress|overthink|exam|goal|confus|problem|struggl|tired|pressure/i) => {
  const note = [...memoryItems(memory)].reverse().find((item) => pattern.test(item)) || '';
  return firstSentence(note.replace(/^(Goal noted|Focus pattern|Emotional pattern|Blocker update|Habit pattern|Preference):\s*/i, ''));
};

const memoryProfile = (profile, memory = {}) => {
  const tasks = openTasks(memory);
  const notes = memoryItems(memory);
  const focusNotes = notes.filter((note) => /focus|distract|procrastinat|overthink|phone/i.test(note)).slice(-3);
  const emotionalNotes = notes.filter((note) => /stress|anxious|overwhelm|tired|pressure|sad|burnout/i.test(note)).slice(-3);
  const goalNotes = notes.filter((note) => /goal|exam|deadline|priority|interview|study/i.test(note)).slice(-3);
  const currentFocus = tasks[0]?.title || meaningfulMemory(memory, /goal|exam|deadline|priority|study|focus/i) || profile?.occupation || 'what matters next';

  return {
    tasks,
    notes,
    focusNotes,
    emotionalNotes,
    goalNotes,
    currentFocus,
    blocker: meaningfulMemory(memory, /blocker|stuck|struggl|confus|problem/i),
  };
};

const classifyEmotion = (input, state) => {
  const text = normalize(input);
  if (includesAny(text, ['panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'worried'])) return 'anxious';
  if (includesAny(text, ['stress', 'stressed', 'overwhelmed', 'pressure', 'too much', 'burnout'])) return 'stressed';
  if (includesAny(text, ['tired', 'exhausted', 'drained', 'mentally tired', 'mental exhaustion', 'no energy'])) return 'tired';
  if (includesAny(text, ['lazy', 'procrastinate', 'procrastinating', 'unmotivated', 'give up', 'stuck'])) return 'stuck';
  if (includesAny(text, ['sad', 'down', 'lonely', 'upset', 'bad mood'])) return 'low';
  if (includesAny(text, ['happy', 'great', 'excited', 'confident', 'better'])) return 'positive';
  if (state.emotionalNotes.length) return 'sensitive';
  return 'steady';
};

const classifyIntent = (input) => {
  const text = normalize(input);
  if (isSmallTalk(text)) return 'greeting';
  if (includesAny(text, ['hello', 'hi', 'hey', 'good morning', 'good evening', 'hlo', 'helo'])) return 'greeting';
  if (includesAny(text, ['focus', 'distract', 'distraction', 'concentrate', 'procrastinate', 'phone', 'deep work'])) return 'focus';
  if (includesAny(text, ['study', 'exam', 'chapter', 'assignment', 'revision', 'learn', 'syllabus'])) return 'study';
  if (includesAny(text, ['calm', 'overthinking', 'overthink', 'mind racing', 'mental noise'])) return 'calm';
  if (includesAny(text, ['motivate', 'motivation', 'lazy', 'give up', 'boost'])) return 'motivation';
  if (includesAny(text, ['decide', 'decision', 'confused', 'confusion', 'choose', 'problem', 'solve', 'help me', 'help', 'help out'])) return 'problem';
  if (includesAny(text, ['task', 'todo', 'to do', 'deadline', 'reminder', 'priority'])) return 'tasks';
  if (includesAny(text, ['stress', 'stressed', 'anxious', 'tired', 'scared', 'sad', 'overwhelmed', 'mood'])) return 'emotional';
  if (includesAny(text, ['money', 'career', 'job', 'salary', 'freelance', 'gig', 'hire', 'employed', 'work', 'portfolio'])) return 'career';
  if (/\?$/.test(input.trim()) || /^(what|why|how|when|where|explain|define|tell me about)\b/i.test(input.trim())) return 'question';
  return 'conversation';
};

const extractTopic = (input = '') => input
  .replace(/^(please\s+)?(explain|tell me about|what is|what are|why is|why are|how does|how do|how to|define)\s+/i, '')
  .replace(/[?!.]+$/g, '')
  .trim();

const splitIntoSections = (text = '') => text
  .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
  .map((section) => section.trim())
  .filter(Boolean);

const keywordsFromQuestion = (question) => {
  const stopWords = new Set(['the', 'and', 'for', 'from', 'with', 'that', 'this', 'what', 'why', 'how', 'when', 'where', 'please', 'explain', 'about', 'into', 'your', 'you', 'are']);
  return normalize(question).split(' ').filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 14);
};

const fileOverview = (file) => {
  const lines = file.text.split(/\r?\n/).filter((line) => line.trim());
  const words = normalize(file.text).split(' ').filter(Boolean).length;
  const preview = lines.slice(0, 4).join('\n').slice(0, 520);
  return `**${file.name}** has about ${words} readable words across ${lines.length} non-empty lines.${preview ? `\n\nA quick preview:\n> ${preview.replace(/\n/g, '\n> ')}` : ''}`;
};

const answerFromFiles = (input, files = []) => {
  const usableFiles = files.filter((file) => file?.text?.trim());
  if (!usableFiles.length) return '';

  const lower = input.toLowerCase();
  const wantsSummary = includesAny(lower, ['summarize', 'summary', 'overview', 'explain this file', 'what is in this file']);
  const asksFile = wantsSummary || includesAny(lower, ['file', 'document', 'attachment', 'attached', 'csv', 'json', 'code']);
  const keywords = keywordsFromQuestion(input);
  const passages = usableFiles
    .flatMap((file) => splitIntoSections(file.text).map((section, index) => {
      const sectionText = normalize(section);
      const score = keywords.reduce((sum, keyword) => sum + (sectionText.includes(keyword) ? 1 : 0), 0);
      return { file, section, index, score };
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3);

  if (wantsSummary || (!passages.length && asksFile)) {
    return [
      'I read the attachment locally. Here is the useful shape of it:',
      '',
      usableFiles.map(fileOverview).join('\n\n'),
      '',
      'Tell me what you want from it next: a simpler explanation, key points, weak areas, or action items.',
    ].join('\n');
  }

  if (!passages.length) return '';

  return [
    'I found the closest matching parts in your attachment:',
    '',
    ...passages.map((item) => `**${item.file.name}**\n${item.section.slice(0, 850)}${item.section.length > 850 ? '...' : ''}`),
    '',
    'My read: this is enough to narrow the answer. Ask me a sharper follow-up and I will keep it grounded in the file.',
  ].join('\n\n');
};

const memoryNudge = (state, type) => {
  if (type === 'focus' && state.focusNotes.length) return 'Focus has been interrupted before; keep the next step familiar and simple.';
  if (type === 'emotion' && state.emotionalNotes.length) return 'This showed up earlier too, so keep the next move small and practical.';
  if (type === 'goal' && state.goalNotes.length) return `The last goal was ${state.goalNotes.at(-1).replace(/^Goal noted:\s*/i, '')}.`;
  return '';
};

const followUpFor = (intent, emotion, state) => {
  if (intent === 'focus') return 'What is the one task that will reduce the most friction today?';
  if (intent === 'study') return 'Which topic should we lock in first: concept, example, or practice question?';
  if (intent === 'problem') return 'What specific decision or step is blocking progress?';
  if (intent === 'tasks') return 'Which open item would move the needle most if it moved forward once?';
  if (intent === 'emotional') return 'What exact problem is this causing in your day?';
  if (intent === 'calm') return 'Name the main blockage and one small action to reduce it.';
  if (intent === 'career') return 'Are you aiming for income now, skill growth, or a better role?';
  if (state.tasks.length) return `Start with "${state.tasks[0].title}" or tell me which item feels more urgent.`;
  return 'Give me the key issue and I’ll help narrow it down.';
};

const warmOpening = (name, emotion, seed) => choice({
  anxious: [
    `${name}, there’s too much noise. Let’s narrow this to one clear next step.`,
    `${name}, the useful move is smaller than it feels. Pick one thing and finish it.`,
  ],
  stressed: [
    `${name}, urgency is not progress. Let’s make this manageable and concrete.`,
    `${name}, handle one thing that reduces pressure, then reassess.`,
  ],
  tired: [
    `${name}, the best step is one that does not need more energy than you have.`,
    `${name}, choose a low-effort action that still moves something forward.`,
  ],
  stuck: [
    `${name}, stuck means the step is unclear. I can help make it specific.`,
    `${name}, the next move should feel obvious, not perfect.`,
  ],
  low: [
    `${name}, let’s keep this practical and avoid overthinking it.`,
    `${name}, stay with the most useful next action, not the ideal one.`,
  ],
  positive: [
    `${name}, use that momentum on one thing that actually changes the day.`,
    `${name}, focus the energy on a result, not just keeping busy.`,
  ],
  sensitive: [
    `${name}, this is worth clearing in a direct way. We can do that together.`,
    `${name}, I’m aiming for clarity, not extra feeling.`,
  ],
  steady: [
    `${name}, good. Let’s make the next move concrete.`,
    `${name}, the most useful step is the one you can finish now.`,
  ],
}[emotion] || [], seed);

const buildGreeting = (profile, memory, input = '') => {
  const lastGoal = meaningfulMemory(memory) || profile?.occupation || 'your current goal';
  const lower = normalize(input);
  if (includesAny(lower, ['how are you', 'how are u', 'how are you doing', 'hru'])) {
    return 'I’m ready to help with the next thing. What do you want to move forward on?';
  }

  const options = [
    `Hey ${firstName(profile)}. ${lastGoal ? `You were focused on ${lastGoal}.` : 'Tell me the one thing you want to solve.'}`,
    `${firstName(profile)}, pick one concrete issue and I’ll help narrow the next step.`,
    `Hi ${firstName(profile)}. Describe the problem or goal in one sentence.`,
    `Let’s sort this out. Start with the main obstacle or decision.`,
  ];
  return choice(options, `${firstName(profile)} ${lastGoal}`);
};

const buildFocusReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const nudge = memoryNudge(state, 'focus');
  return [
    `${firstName(profile)}, start with one thing you can actually do now.`,
    '',
    `${nudge ? `${nudge} ` : ''}Open the material, write one sentence, or finish one visible item. Make it small enough to feel possible.`,
    '',
    followUpFor('focus', 'steady', state),
  ].join('\n');
};

const buildEmotionalReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const emotion = classifyEmotion(input, state);
  const opening = warmOpening(firstName(profile), emotion, input);
  const nudge = memoryNudge(state, 'emotion');
  const next = {
    anxious: 'Treat this as a decision problem: what is the next concrete move? Choose one action and test it.',
    stressed: 'Break the task into a single first action and do that before anything else.',
    tired: 'Pick one short, low-effort task that still gives you momentum.',
    stuck: 'The goal is not perfect clarity. Do the smallest useful thing and see what changes.',
    low: 'Keep the next move small and specific so it is easy to complete.',
    positive: `Put your energy on ${state.currentFocus} with one simple result in mind.`,
    sensitive: 'Focus on one practical step instead of trying to solve everything at once.',
    steady: `Make the next step tied to ${state.currentFocus} and finish it.`,
  }[emotion];

  return [
    opening,
    '',
    `${nudge ? `${nudge} ` : ''}${next}`,
    '',
    followUpFor('emotional', emotion, state),
  ].join('\n');
};

const buildCalmReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  return [
    `${firstName(profile)}, identify the exact block first.`,
    '',
    `Name the one thing that is slowing you down, then choose a next action that is easy to start.`,
    '',
    `Keep it tied to ${state.currentFocus} so this stays practical.`,
    '',
    followUpFor('calm', 'steady', state),
  ].join('\n');
};

const buildProblemReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const topic = extractTopic(input).replace(/^(help me solve|solve|problem|i am confused about|i'm confused about)\s+/i, '') || state.blocker || state.currentFocus;
  return [
    `${firstName(profile)}, here’s a practical way through this.`,
    '',
    `Separate what you can control from what you can’t, then choose one small action that moves the situation forward.`,
    '',
    `For ${topic}, start with the first step you can complete in under 15 minutes.`,
    '',
    followUpFor('problem', 'steady', state),
  ].join('\n');
};

const buildStudyReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const target = extractTopic(input) || state.tasks[0]?.title || state.currentFocus;
  return [
    'For studying, I would keep it active and practical.',
    '',
    `Start with ${target}. Read enough to know what it is, then close the material and say it back in your own words. That reveals the gap faster than rereading for hours.`,
    '',
    `${memoryNudge(state, 'goal') || 'Keep the session short enough that you can finish with some confidence left.'}`,
    '',
    followUpFor('study', 'steady', state),
  ].join('\n');
};

const buildMotivationReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  return [
    `${firstName(profile)}, this is about starting, not feeling ready.`,
    '',
    `Choose the smallest action that produces a real result for ${state.currentFocus}. Then commit to it for a short block.`,
    '',
    'The point is progress, not perfect momentum.',
    '',
    followUpFor('conversation', 'steady', state),
  ].join('\n');
};

const buildTasksReply = (profile, memory) => {
  const state = memoryProfile(profile, memory);
  if (!state.tasks.length) {
    return 'I do not see any saved reminders yet. Tell me what you want to remember, and I will keep it in the background for future conversations.';
  }
  const taskNames = state.tasks.slice(0, 4).map((task) => task.title).join(', ');
  return [
    `I see these open items: ${taskNames}.`,
    '',
    'I would not add more structure yet. Pick the one that would reduce the most pressure if it moved forward today, then make the first action concrete and easy to start.',
    '',
    followUpFor('tasks', 'steady', state),
  ].join('\n');
};

const buildQuestionReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const topic = extractTopic(input) || 'that';
  return [
    `Here is a clean way to think about ${topic}.`,
    '',
    `Start with what it means, why it matters, and one example. If you can explain those three without looking, you probably understand the core. If not, the confusing part will show itself quickly.`,
    '',
    `If this connects to ${state.currentFocus}, tell me the subject and I will make the explanation more specific.`,
  ].join('\n');
};

const conversationBridge = (input, state, options = {}) => {
  const lower = normalize(input);
  if (isSmallTalk(lower)) return '';
  const lastBot = [...(options.recentMessages || [])].reverse().find((message) => message.role === 'bot')?.content || '';
  if (!lastBot) return '';

  if (/pressure|distractions|overthinking|mental exhaustion/i.test(lastBot)) {
    if (includesAny(lower, ['pressure', 'deadline', 'exam', 'expectation'])) return 'Pressure comes from uncertainty. Pick the most visible progress step and do it now.';
    if (includesAny(lower, ['distraction', 'phone', 'mobile', 'instagram', 'youtube', 'reels'])) return 'Clear the distraction first, then start with one task that you can actually finish.';
    if (includesAny(lower, ['overthinking', 'thoughts', 'worry', 'mind'])) return 'Stop chasing the thought. Write it once and move to one concrete action.';
    if (includesAny(lower, ['tired', 'exhausted', 'energy'])) return 'Low energy means one shorter, clearer task is better than a long plan.';
  }

  return '';
};

const applyTone = (text, tone) => {
  if (!tone || tone === 'Calm') return text;
  const t = String(tone || '').toLowerCase();

  if (t === 'direct') {
    const cleaned = String(text).replace(/^(Okay,|Alright,|I can hear that,?)/i, '').trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    return `${sentences}\n\nAction: pick one specific next step and start.`;
  }

  if (t === 'friendly') {
    return `${String(text).trim()}\n\nI can help make the next step easier to start.`;
  }

  if (t === 'mentor' || t === 'mentor-like') {
    return `${String(text).trim()}\n\nSuggestion: choose the smallest action that proves progress, then repeat.`;
  }

  return text;
};

const sanitizeResponse = (text) => {
  const banned = [
    "I'm here.",
    'I’m here.',
    'Let’s keep it simple.',
    'What feels important right now?',
    'Would you like me to break this into a tiny step?',
    'I can work with that.',
    'It looks like',
    'Your earlier goal was',
    'Should we continue where we left off?',
    'What feels hardest?',
    'How does that make you feel?',
    'Take a deep breath.',
  ];
  return banned.reduce((result, phrase) => result.replace(phrase, ''), String(text)).replace(/\s{2,}/g, ' ').trim();
};

// Add a short, practical career helper
const buildCareerReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const skills = profile?.skills ? profile.skills.slice(0, 6).join(', ') : (profile?.occupation || state.currentFocus || 'your skills');
  return [
    `${firstName(profile)}, here are practical next moves based on ${skills}:`,
    '',
    '- Apply for small freelance gigs that match your current projects.',
    '- Build one showcase piece that demonstrates the exact skill people hire for.',
    '- Network with two contacts and ask for one critique or short task.',
    '',
    'Which of these sounds doable this week?'
  ].join('\n');
};

export const processChatMessage = (input, userProfile, memory = {}, options = {}) => {
  const fileAnswer = answerFromFiles(input, options.files || []);
  if (fileAnswer) return applyTone(fileAnswer, options.tone);

  const state = memoryProfile(userProfile, memory);
  const intent = classifyIntent(input);
  const bridge = conversationBridge(input, state, options);
  if (bridge) {
    return applyTone(`${bridge}\n\n${followUpFor(intent === 'conversation' ? 'focus' : intent, classifyEmotion(input, state), state)}`, options.tone);
  }

  let response = '';
  if (intent === 'greeting') response = buildGreeting(userProfile, memory, input);
  else if (intent === 'focus') response = buildFocusReply(input, userProfile, memory);
  else if (intent === 'study') response = buildStudyReply(input, userProfile, memory);
  else if (intent === 'calm') response = buildCalmReply(input, userProfile, memory);
  else if (intent === 'problem') response = buildProblemReply(input, userProfile, memory);
  else if (intent === 'tasks') response = buildTasksReply(userProfile, memory);
  else if (intent === 'motivation') response = buildMotivationReply(input, userProfile, memory);
  else if (intent === 'emotional') response = buildEmotionalReply(input, userProfile, memory);
  else if (intent === 'career') response = buildCareerReply(input, userProfile, memory);
  else if (intent === 'question') response = buildQuestionReply(input, userProfile, memory);
  else {
    response = [
      warmOpening(firstName(userProfile), classifyEmotion(input, state), input),
      '',
      `Identify the main obstacle or decision, then pick one concrete step to move it forward.`,
      '',
      followUpFor('conversation', 'steady', state),
    ].join('\n');
  }

  return sanitizeResponse(applyTone(response, options.tone));
};

export const processChatMessageAsync = async (input, userProfile, memory = {}, options = {}) => (
  processChatMessage(input, userProfile, memory, options)
);
