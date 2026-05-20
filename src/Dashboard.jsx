import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, BrainCircuit, Check, MessageCircle, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { addTask, deleteTask, loadLifeMemory, loadTasks, toggleTask } from './localStore';

const quickActions = [
  'Help me focus',
  'Solve my problem',
  'Study support',
  'Calm my mind',
  'Motivate me',
  'Talk to me',
];

const memoryText = (memory = {}) => {
  const notes = (memory.memories || []).map((item) => item.text || item).filter(Boolean);
  const meaningful = [...notes].reverse().find((note) => /focus|stress|overthink|exam|goal|confus|tired|problem|struggl/i.test(note));
  if (!meaningful) return 'Zeno will quietly notice your goals, blockers, and emotional patterns as you talk.';
  return meaningful.replace(/^(Goal noted|Focus pattern|Emotional pattern|Blocker update|Preference):\s*/i, '');
};

export default function Dashboard({ user, onNewChat, userProfile }) {
  const uid = user?.uid;
  const [tasks, setTasks] = useState(() => (uid ? loadTasks(uid) : []));
  const [lifeMemory, setLifeMemory] = useState(() => (uid ? loadLifeMemory(uid) : { memories: [] }));
  const [taskInput, setTaskInput] = useState('');

  useEffect(() => {
    if (!uid) return;
    setTasks(loadTasks(uid));
    setLifeMemory(loadLifeMemory(uid));
  }, [uid]);

  const time = new Date().getHours();
  const greeting = time < 12 ? 'Good morning' : time < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = userProfile?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there';
  const openTasks = tasks.filter((task) => !task.completed).slice(0, 5);
  const recentConversations = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`chat_sessions_${uid}`) || '[]').slice(0, 4);
    } catch {
      return [];
    }
  }, [uid, tasks.length]);

  const currentFocus = openTasks[0]?.title || memoryText(lifeMemory) || 'Start with one honest conversation.';

  const handleAddTask = (event) => {
    event.preventDefault();
    if (!uid || !taskInput.trim()) return;
    setTasks(addTask(uid, taskInput));
    setLifeMemory(loadLifeMemory(uid));
    setTaskInput('');
  };

  const handleToggleTask = (taskId) => {
    if (!uid) return;
    setTasks(toggleTask(uid, taskId));
    setLifeMemory(loadLifeMemory(uid));
  };

  const handleDeleteTask = (taskId) => {
    if (!uid) return;
    setTasks(deleteTask(uid, taskId));
    setLifeMemory(loadLifeMemory(uid));
  };

  return (
    <div className="dashboard-container">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Zeno Companion</p>
          <h1>{greeting}, {firstName}.</h1>
          <p className="muted">A quiet place for clarity, focus, and conversations that remember what matters.</p>
        </div>
        <div className="hero-actions">
          <button onClick={onNewChat} className="action-button primary"><Sparkles size={18} /> Talk to Zeno</button>
        </div>
      </section>

      <section className="assistant-summary-grid">
        <div className="glass-panel dashboard-card focus-card companion-focus">
          <p className="eyebrow">Current Focus</p>
          <h2>{currentFocus}</h2>
          <p className="muted">Zeno keeps the next step small enough to begin, especially when your mind feels busy.</p>
          <button className="mini-action" onClick={onNewChat}>
            Continue in chat <ArrowRight size={16} />
          </button>
        </div>

        <div className="glass-panel dashboard-card status-card">
          <div className="status-item">
            <span><BrainCircuit size={18} /> Memory</span>
            <strong>Private and local</strong>
          </div>
          <div className="status-item">
            <span><MessageCircle size={18} /> Style</span>
            <strong>Calm conversation</strong>
          </div>
          <div className="status-item">
            <span><Target size={18} /> Direction</span>
            <strong>{openTasks.length ? `${openTasks.length} open item(s)` : 'Open-ended'}</strong>
          </div>
        </div>
      </section>

      <section className="insight-grid companion-actions">
        {quickActions.map((action) => (
          <button key={action} className="glass-panel insight-card action-card" onClick={onNewChat}>
            <div className="card-title"><Sparkles size={18} /> {action}</div>
            <p>{action === 'Calm my mind' ? 'Slow the noise down and find one grounded next move.' : 'Start a natural conversation with Zeno.'}</p>
          </button>
        ))}
      </section>

      <section className="glass-panel dashboard-card habit-card">
        <div className="card-title"><BrainCircuit size={22} /> What Zeno Remembers</div>
        <p>{memoryText(lifeMemory)}</p>
        <p className="muted small">Memory stays in the background so the chat feels continuous, not like a report.</p>
      </section>

      <section className="glass-panel dashboard-card task-card">
        <div className="card-title"><Bell size={22} /> Simple Reminders</div>
        <form className="task-form" onSubmit={handleAddTask}>
          <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="Add one gentle reminder or important task" />
          <button className="action-button primary" type="submit"><Plus size={16} /> Add</button>
        </form>
        <div className="task-list">
          {tasks.length === 0 && <p className="muted small">No reminders yet. You can add one here, or just tell Zeno in chat.</p>}
          {tasks.slice(0, 8).map((task) => (
            <div key={task.id} className={task.completed ? 'task-row completed' : 'task-row'}>
              <button className="goal-check task-check" onClick={() => handleToggleTask(task.id)} aria-label="Toggle task">
                {task.completed && <Check size={13} />}
              </button>
              <div>
                <strong>{task.title}</strong>
                <span>{task.source === 'manual' ? 'Added by you' : 'Remembered from chat'}{task.dueText ? ` - ${task.dueText}` : ''}</span>
              </div>
              <button className="task-delete" onClick={() => handleDeleteTask(task.id)} aria-label="Delete task"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      {recentConversations.length > 0 && (
        <section className="glass-panel dashboard-card reminders-card">
          <div className="card-title"><MessageCircle size={22} /> Recent Conversations</div>
          <div className="reminder-list">
            {recentConversations.map((session) => (
              <span key={session.id}>{session.title}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
