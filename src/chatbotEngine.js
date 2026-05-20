const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9\s'-]/gi, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (text, words) => words.some((word) => text.includes(word));
const firstName = (profile) => profile?.fullName?.split(' ')[0] || profile?.displayName?.split(' ')[0] || 'there';
const openTasks = (memory) => (memory?.tasks || []).filter((task) => !task.completed);
const memoryItems = (memory) => (memory?.memories || []).map((item) => item.text || item).filter(Boolean);

const choice = (items, seed = '') => {
  if (!items.length) return '';
  const value = String(seed).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[value % items.length];
};

const meaningfulMemory = (memory = {}, pattern = /focus|stress|overthink|exam|goal|confus|problem|struggl|tired|pressure/i) => (
  [...memoryItems(memory)].reverse().find((note) => pattern.test(note)) || ''
).replace(/^(Goal noted|Focus pattern|Emotional pattern|Blocker update|Habit pattern|Preference):\s*/i, '');

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
  if (includesAny(text, ['hello', 'hi', 'hey', 'good morning', 'good evening'])) return 'greeting';
  if (includesAny(text, ['focus', 'distract', 'distraction', 'concentrate', 'procrastinate', 'phone', 'deep work'])) return 'focus';
  if (includesAny(text, ['study', 'exam', 'chapter', 'assignment', 'revision', 'learn', 'syllabus'])) return 'study';
  if (includesAny(text, ['calm', 'overthinking', 'overthink', 'mind racing', 'mental noise'])) return 'calm';
  if (includesAny(text, ['motivate', 'motivation', 'lazy', 'give up', 'boost'])) return 'motivation';
  if (includesAny(text, ['decide', 'decision', 'confused', 'confusion', 'choose', 'problem', 'solve'])) return 'problem';
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
  if (type === 'focus' && state.focusNotes.length) return 'You have mentioned focus getting interrupted before, so I would keep the reset familiar instead of inventing a new system.';
  if (type === 'emotion' && state.emotionalNotes.length) return 'This has shown up in your recent conversations too, so I want to treat it gently and practically.';
  if (type === 'goal' && state.goalNotes.length) return `I am also keeping your earlier goal in mind: ${state.goalNotes.at(-1).replace(/^Goal noted:\s*/i, '')}.`;
  return '';
};

const followUpFor = (intent, emotion, state) => {
  if (intent === 'focus') return 'What is pulling your focus most right now: pressure, distractions, overthinking, or mental exhaustion?';
  if (intent === 'study') return 'Which subject or chapter are you facing right now?';
  if (intent === 'problem') return 'What part feels most stuck: choosing, starting, staying consistent, or handling pressure?';
  if (intent === 'tasks') return 'Which one feels most urgent, and which one feels emotionally heaviest?';
  if (intent === 'emotional' && emotion === 'anxious') return 'What is the exact fear underneath it?';
  if (intent === 'calm') return 'What thought keeps repeating the loudest?';
  if (state.tasks.length) return `Should we begin with "${state.tasks[0].title}", or is something else heavier today?`;
  return 'What would make the next hour feel a little easier?';
};

const warmOpening = (name, emotion, seed) => choice({
  anxious: [
    `${name}, your mind sounds like it is trying to solve everything at once.`,
    `${name}, I can hear the pressure in that. Let us make it smaller first.`,
  ],
  stressed: [
    `${name}, this sounds more like overload than laziness.`,
    `${name}, when everything feels urgent, the first job is to reduce the noise.`,
  ],
  tired: [
    `${name}, if you are mentally tired, forcing a perfect routine will probably backfire.`,
    `${name}, low energy deserves a lighter approach, not harsher self-talk.`,
  ],
  stuck: [
    `${name}, stuck usually means the next step is too vague or too heavy.`,
    `${name}, we do not need dramatic motivation. We need a first move that feels possible.`,
  ],
  low: [
    `${name}, I am with you. We can keep this gentle.`,
    `${name}, that is a hard headspace to work from, so let us not demand too much at once.`,
  ],
  positive: [
    `${name}, good. Let us use that energy without overloading it.`,
    `${name}, that momentum matters. I would aim it at one meaningful thing first.`,
  ],
  sensitive: [
    `${name}, I remember this kind of pressure has been around recently, so let us move carefully.`,
    `${name}, this feels connected to what you have been carrying lately. We can slow it down.`,
  ],
  steady: [
    `${name}, I can work with that.`,
    `${name}, let us make this simple and real.`,
  ],
}[emotion] || [], seed);

const buildGreeting = (profile, memory) => {
  const state = memoryProfile(profile, memory);
  const remembered = meaningfulMemory(memory);
  const context = remembered ? `I remember you were dealing with ${remembered}.` : `I am here when you want clarity, focus, or just a steady conversation.`;
  return `Hello ${firstName(profile)}. ${context} What would help right now?`;
};

const buildFocusReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const nudge = memoryNudge(state, 'focus');
  return [
    `${firstName(profile)}, focus usually comes back faster when we stop treating it like a character test.`,
    '',
    `${nudge ? `${nudge} ` : ''}For now, pick one thing and make the finish line tiny: open the material, write the first answer, solve one question, or clear one visible task. Then put the biggest distraction out of reach for just one short block.`,
    '',
    `Do not aim for a perfect flow state. Aim for a clean restart. ${followUpFor('focus', 'steady', state)}`,
  ].join('\n');
};

const buildEmotionalReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const emotion = classifyEmotion(input, state);
  const opening = warmOpening(firstName(profile), emotion, input);
  const nudge = memoryNudge(state, 'emotion');
  const next = {
    anxious: 'First, name the fear in one sentence. Then choose one action that gives you evidence, not certainty. Certainty may come later; evidence can start now.',
    stressed: 'Write the open loops somewhere outside your head. Circle only one. The rest can wait for a moment while your nervous system stops treating everything as immediate danger.',
    tired: 'Lower the demand. Take a small reset, then do one short task that has a visible ending. Tonight does not need to become a full self-improvement project.',
    stuck: 'Start with a ten-minute version. The point is not to feel inspired first; it is to prove that motion is still available.',
    low: 'Keep the day smaller. One honest conversation, one body-level reset, one useful action. That is enough for a rough moment.',
    positive: `Use the energy on ${state.currentFocus}. Keep the win specific so it does not turn into scattered effort.`,
    sensitive: 'Let us avoid judging the feeling. We can still choose one grounded action while the emotion is present.',
    steady: `The next useful move is connected to ${state.currentFocus}. Make it specific enough that you know when it is done.`,
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
    `${firstName(profile)}, pause for a second. You do not have to untangle the whole mind at once.`,
    '',
    'Try this quietly: relax your jaw, let your shoulders drop, and write the worry in one plain sentence. When a thought becomes visible, it usually becomes less powerful.',
    '',
    `After that, choose one controllable action connected to ${state.currentFocus}. Small is fine. Calm often returns after the first grounded move, not before it.`,
    '',
    followUpFor('calm', 'steady', state),
  ].join('\n');
};

const buildProblemReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const topic = extractTopic(input).replace(/^(help me solve|solve|problem|i am confused about|i'm confused about)\s+/i, '') || state.blocker || state.currentFocus;
  return [
    `${firstName(profile)}, let us make the problem less foggy.`,
    '',
    `For "${topic}", separate three things: what is happening, what you can control, and what action would reduce pressure today. You do not need the perfect answer yet. You need a clearer first handle.`,
    '',
    'My instinct: choose the move that makes tomorrow lighter, unless your body feels overloaded. If you are overloaded, choose the move that makes you feel steadier first.',
    '',
    followUpFor('problem', 'steady', state),
  ].join('\n');
};

const buildStudyReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const target = extractTopic(input) || state.tasks[0]?.title || state.currentFocus;
  return [
    'For studying, I would keep it active and humane.',
    '',
    `Start with ${target}. Read just enough to orient yourself, then close the material and recall what you can. After that, check the gaps. This works better than rereading for hours because it shows your brain what actually needs attention.`,
    '',
    `${memoryNudge(state, 'goal') || 'Keep the session short enough that you can finish with some confidence left.'}`,
    '',
    followUpFor('study', 'steady', state),
  ].join('\n');
};

const buildMotivationReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  return [
    `${firstName(profile)}, I will not pretend motivation is always available on command.`,
    '',
    `But you can make starting less dramatic. Choose the smallest useful action connected to ${state.currentFocus}, and do it for ten minutes. Once your brain sees movement, it usually stops arguing as loudly.`,
    '',
    'You do not need to feel like a different person today. You just need one clean restart.',
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
    'I would not add more structure yet. Pick the one that would reduce the most pressure if it moved forward today, then make the first action very concrete.',
    '',
    followUpFor('tasks', 'steady', state),
  ].join('\n');
};

const buildQuestionReply = (input, profile, memory) => {
  const state = memoryProfile(profile, memory);
  const topic = extractTopic(input) || 'that';
  return [
    `Here is the clean way to think about ${topic}.`,
    '',
    `Start with what it means, why it matters, and one example. If you can explain those three without looking, you probably understand the core. If not, the confusing part will show itself quickly.`,
    '',
    `If this connects to ${state.currentFocus}, tell me the subject and I will make the explanation more specific.`,
  ].join('\n');
};

const conversationBridge = (input, state, options = {}) => {
  const lastBot = [...(options.recentMessages || [])].reverse().find((message) => message.role === 'bot')?.content || '';
  const lower = normalize(input);
  if (!lastBot) return '';

  if (/pressure, distractions, overthinking, or mental exhaustion/i.test(lastBot)) {
    if (includesAny(lower, ['pressure', 'deadline', 'exam', 'expectation'])) return 'Then pressure is the main weight. We should reduce uncertainty first: choose one visible action that proves progress, even if it is small.';
    if (includesAny(lower, ['distraction', 'phone', 'mobile', 'instagram', 'youtube', 'reels'])) return 'Then the environment is louder than your intention. Move the distraction away for one short block, and make the task visible before you start.';
    if (includesAny(lower, ['overthinking', 'thoughts', 'worry', 'mind'])) return 'Then the distraction is internal. Put the thought in one sentence on paper, promise to return to it later, and restart with the next tiny action.';
    if (includesAny(lower, ['tired', 'exhausted', 'mental', 'energy'])) return 'Then we should not treat this as laziness. Use a lighter block and give your brain a clear finish line.';
  }

  return '';
};

export const processChatMessage = (input, userProfile, memory = {}, options = {}) => {
  const fileAnswer = answerFromFiles(input, options.files || []);
  if (fileAnswer) return fileAnswer;

  const state = memoryProfile(userProfile, memory);
  const intent = classifyIntent(input);
  const bridge = conversationBridge(input, state, options);
  if (bridge) return `${bridge}\n\n${followUpFor(intent === 'conversation' ? 'focus' : intent, classifyEmotion(input, state), state)}`;

  if (intent === 'greeting') return buildGreeting(userProfile, memory);
  if (intent === 'focus') return buildFocusReply(input, userProfile, memory);
  if (intent === 'study') return buildStudyReply(input, userProfile, memory);
  if (intent === 'calm') return buildCalmReply(input, userProfile, memory);
  if (intent === 'problem') return buildProblemReply(input, userProfile, memory);
  if (intent === 'tasks') return buildTasksReply(userProfile, memory);
  if (intent === 'motivation') return buildMotivationReply(input, userProfile, memory);
  if (intent === 'emotional') return buildEmotionalReply(input, userProfile, memory);
  if (intent === 'question') return buildQuestionReply(input, userProfile, memory);

  return [
    warmOpening(firstName(userProfile), classifyEmotion(input, state), input),
    '',
    `I am keeping your context in mind: ${state.currentFocus}. Say what feels most important right now, and I will help you make it clearer without turning it into a giant plan.`,
    '',
    followUpFor('conversation', 'steady', state),
  ].join('\n');
};

export const processChatMessageAsync = async (input, userProfile, memory = {}, options = {}) => (
  processChatMessage(input, userProfile, memory, options)
);
