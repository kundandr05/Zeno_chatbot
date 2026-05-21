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
  if (type === 'focus' && state.focusNotes.length) return 'You mentioned focus getting interrupted before. I would keep the next step familiar and simple.';
  if (type === 'emotion' && state.emotionalNotes.length) return 'You brought this up earlier too, so I would keep the next move small and practical.';
  if (type === 'goal' && state.goalNotes.length) return `Your earlier goal was: ${state.goalNotes.at(-1).replace(/^Goal noted:\s*/i, '')}.`;
  return '';
};

const followUpFor = (intent, emotion, state) => {
  if (intent === 'focus') return 'What is distracting you the most right now?';
  if (intent === 'study') return 'Which subject or chapter worries you most?';
  if (intent === 'problem') return 'What part feels most unclear: choosing, starting, staying consistent, or handling pressure?';
  if (intent === 'tasks') return 'Which item would help most if it moved forward today?';
  if (intent === 'emotional' && emotion === 'anxious') return 'What is the exact fear underneath it?';
  if (intent === 'calm') return 'What thought keeps coming back the loudest?';
  if (state.tasks.length) return `Should we begin with "${state.tasks[0].title}", or is something else heavier today?`;
  return 'What feels hardest right now?';
};

const warmOpening = (name, emotion, seed) => choice({
  anxious: [
    `${name}, it sounds like your head is trying to solve too much at once.`,
    `${name}, I can hear the pressure there. Let’s make it smaller.`,
  ],
  stressed: [
    `${name}, this feels more like overload than laziness.`,
    `${name}, when everything seems urgent, the first move is to reduce the noise.`,
  ],
  tired: [
    `${name}, if you are mentally tired, a perfect routine is not the best first step.`,
    `${name}, low energy needs something easier, not harsher.`,
  ],
  stuck: [
    `${name}, stuck usually means the next step is too vague or too heavy.`,
    `${name}, we do not need drama. We need a first move that feels possible.`,
  ],
  low: [
    `${name}, that is a rough spot. Keep the next move small.`,
    `${name}, this is hard, so let us not demand too much right now.`,
  ],
  positive: [
    `${name}, that is good. Let’s use that energy without overloading it.`,
    `${name}, momentum matters. I would point it at one useful thing first.`,
  ],
  sensitive: [
    `${name}, this feels connected to what you’ve been carrying lately.`,
    `${name}, I remember this kind of pressure has shown up before.`,
  ],
  steady: [
    `${name}, I can work with that.`,
    `${name}, let’s keep this simple.`,
  ],
}[emotion] || [], seed);

const buildGreeting = (profile, memory, input = '') => {
  const remembered = meaningfulMemory(memory);
  const lower = normalize(input);
  if (includesAny(lower, ['how are you', 'how are u', 'how r u', 'hru', 'how is it going', 'how you doing'])) {
    return `I’m okay. How are you?`;
  }

  const options = [
    `Hey ${firstName(profile)}. ${remembered ? `You mentioned before that ${remembered}.` : 'What’s been on your mind today?'}`,
    `Hey ${firstName(profile)}. ${remembered ? `Last time you were dealing with ${remembered}.` : 'How has your day been so far?'}`,
    `${firstName(profile)}, should we continue where we left off or start fresh?`,
    `Hi ${firstName(profile)}. ${remembered ? `You said ${remembered} earlier.` : 'What feels most important right now?'}`,
  ];
  return choice(options, `${firstName(profile)} ${remembered}`);
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
    anxious: 'Name the fear in one sentence, then choose one small action that gives you a bit of evidence.',
    stressed: 'Write down the loudest loop and pick one thing you can handle first. Let the rest wait.',
    tired: 'Lower the demand. Pick one short thing that can finish without much effort.',
    stuck: 'Try one ten-minute version. The goal is just to get a little motion going.',
    low: 'Keep the day smaller. One honest message to yourself or one easy action is enough.',
    positive: `Use the energy on ${state.currentFocus}. Keep it specific so it does not spread too thin.`,
    sensitive: 'It is okay to keep this slow. One small step is enough for now.',
    steady: `The next useful move is connected to ${state.currentFocus}. Keep it simple enough to finish.`,
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
    `${firstName(profile)}, okay. Don’t try to fix everything at once.`,
    '',
    'Write the main worry in one plain sentence, then pick one small thing you can do next.',
    '',
    `After that, choose one controllable action connected to ${state.currentFocus}. Small is fine.`,
    '',
    followUpFor('calm', 'steady', state),
  ].join('\n');
};

const buildProblemReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const topic = extractTopic(input).replace(/^(help me solve|solve|problem|i am confused about|i'm confused about)\s+/i, '') || state.blocker || state.currentFocus;
  return [
    `${firstName(profile)}, okay. Let’s make this clearer.`,
    '',
    `For "${topic}", notice what you can actually change and pick the smallest step that makes it feel less overwhelming. You do not need the perfect answer right now.`,
    '',
    'If your day feels overloaded, choose the thing that helps you feel steadier first.',
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
    `${firstName(profile)}, I will not pretend motivation is always there on demand.`,
    '',
    `You can make starting less dramatic. Choose the smallest useful action connected to ${state.currentFocus}, and do it for ten minutes. Once your brain sees motion, it usually quiets down.`,
    '',
    'You do not need to feel like a different person today. You only need one clear, manageable first step.',
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

  if (/pressure, distractions, overthinking, or mental exhaustion/i.test(lastBot)) {
    if (includesAny(lower, ['pressure', 'deadline', 'exam', 'expectation'])) return 'Then pressure is the main weight. We should reduce uncertainty first: choose one visible action that proves progress, even if it is small.';
    if (includesAny(lower, ['distraction', 'phone', 'mobile', 'instagram', 'youtube', 'reels'])) return 'Then the environment is louder than your intention. Move the distraction away for one short block, and make the task visible before you start.';
    if (includesAny(lower, ['overthinking', 'thoughts', 'worry', 'mind'])) return 'Then the distraction is internal. Put the thought in one sentence on paper, promise to return to it later, and restart with the next tiny action.';
    if (includesAny(lower, ['tired', 'exhausted', 'mental', 'energy'])) return 'Then we should not treat this as laziness. Use a lighter block and give your brain a clear finish line.';
  }

  return '';
};

const applyTone = (text, tone) => {
  if (!tone || tone === 'Calm') return text;
  const suffix = {
    Direct: 'Keep it practical and clear.',
    Friendly: 'I’m here.',
    Mentor: 'Let’s keep it simple.',
  }[tone];
  return suffix ? `${text.trim()}\n\n${suffix}` : text;
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
  else if (intent === 'question') response = buildQuestionReply(input, userProfile, memory);
  else {
    response = [
      warmOpening(firstName(userProfile), classifyEmotion(input, state), input),
      '',
      `It looks like ${state.currentFocus} is still in play. What feels most important right now?`,
      '',
      followUpFor('conversation', 'steady', state),
    ].join('\n');
  }

  return applyTone(response, options.tone);
};

export const processChatMessageAsync = async (input, userProfile, memory = {}, options = {}) => (
  processChatMessage(input, userProfile, memory, options)
);
