Zeno — Local Conversational Companion

What this change adds

- Improved local reasoning and intent handling (focus, study, problem, career, emotional, tasks).
- Natural, contextual opening messages that reference recent goals and memories.
- Better tone rendering: Calm / Direct / Friendly / Mentor-like.
- Smarter quick actions that attach recent memory context.
- Dashboard simplified to show recent conversations and remembered goals only (removed wellness widgets).
- All processing is local — no cloud AI or paid APIs required.

How to run (dev)

```bash
npm install
npm run dev
```

Where to look in code

- `src/chatbotEngine.js` — local NLU, intent classification, reply builders, tone logic.
- `src/localStore.js` — persistent local memory, tasks, and checkins (localStorage-backed).
- `src/App.jsx` — UI glue: quick actions, streaming responses, and new contextual opening message.
- `src/Dashboard.jsx` — simplified dashboard with remembered goals.

Usage notes

- Quick actions now include recent memory context for faster, targeted conversations.
- Tone selection affects phrasing and suggestions; try the same prompt with different tones.
- Add goals or "remind me" style messages and Zeno will store them in local memory for future conversations.

Privacy

All data is stored in your browser's `localStorage`. No external services are contacted.

Next steps you may want

- Add export/import for memories and sessions.
- Add richer suggestion generation (local heuristics for scheduling or blockers).
- Add user-editable memory manager UI.
