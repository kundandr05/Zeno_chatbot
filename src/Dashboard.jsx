import { useMemo } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';

export default function Dashboard({ user, onNewChat, quickActions, onQuickAction, userProfile }) {
  const uid = user?.uid;
  const time = new Date().getHours();
  const greeting = time < 12 ? 'Good morning' : time < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = userProfile?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there';

  const recentConversations = useMemo(() => {
    if (!uid) return [];
    try {
      return JSON.parse(localStorage.getItem(`chat_sessions_${uid}`) || '[]').slice(0, 4);
    } catch {
      return [];
    }
  }, [uid]);

  return (
    <div className="dashboard-container">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Zeno Companion</p>
          <h1>{greeting}, {firstName}.</h1>
          <p className="muted">A quiet place for clear conversation, gentle perspective, and sound next steps.</p>
        </div>
        <div className="hero-actions">
          <button onClick={() => onNewChat('')} className="action-button primary">
            <Sparkles size={18} /> Talk to Zeno
          </button>
        </div>
      </section>

      <section className="insight-grid companion-actions">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="glass-panel insight-card action-card"
            onClick={() => onQuickAction(action.prompt)}
          >
            <div className="card-title"><Sparkles size={18} /> {action.label}</div>
            <p className="muted">{action.label === 'Help me focus' ? 'Start with the thing that matters most right now.' : 'Start a calm, natural conversation with Zeno.'}</p>
          </button>
        ))}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div className="glass-panel dashboard-card">
          <div className="card-title"><MessageCircle size={18} /> Recent conversations</div>
          {recentConversations.length > 0 ? (
            <div className="recent-list">
              {recentConversations.map((session) => (
                <div key={session.id} className="recent-item">
                  {session.title}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">You don’t need perfect words to start. Zeno is ready whenever you are.</p>
          )}
        </div>

        <div className="glass-panel dashboard-card">
          <div className="card-title"><Sparkles size={18} /> Remembered goals & suggestions</div>
          {uid ? (
            (() => {
              try {
                const mems = JSON.parse(localStorage.getItem(`user_memories_${uid}`) || '[]').slice(-6).reverse();
                const goals = mems.filter((m) => typeof m === 'string' && /goal|want|need|prepare|study|deadline|interview/i.test(m)).slice(0, 3);
                const others = mems.filter((m) => typeof m === 'string' && !goals.includes(m)).slice(0, 3);
                return (
                  <div>
                    {goals.length > 0 && (
                      <div style={{ marginBottom: '0.6rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Saved goals</div>
                        {goals.map((g, i) => <div key={i} className="muted" style={{ marginTop: '0.25rem' }}>{g}</div>)}
                      </div>
                    )}
                    {others.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Recent notes</div>
                        {others.map((g, i) => <div key={i} className="muted" style={{ marginTop: '0.25rem' }}>{g}</div>)}
                      </div>
                    )}
                    {goals.length === 0 && others.length === 0 && (
                      <p className="muted">No remembered goals yet. Mention a goal in chat and I will keep it in the background.</p>
                    )}
                  </div>
                );
              } catch (e) {
                return <p className="muted">No remembered goals yet.</p>;
              }
            })()
          ) : (
            <p className="muted">Sign in to save goals and get smart suggestions.</p>
          )}
        </div>
      </section>
    </div>
  );
}
