import { useState } from 'react';
import { PeacockFeatherIcon } from './PeacockFeatherIcon';
import { continueAsLocalGuest, loginWithEmail, registerWithEmail } from './localAuthStore';
import { Mail, Lock, LogIn, UserPlus, User } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocalGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await continueAsLocalGuest();
      onLogin(user);
    } catch (err) {
      setError(err.message || "Failed to continue locally.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let user;
      if (isLogin) {
        user = await loginWithEmail(email, password);
      } else {
        user = await registerWithEmail(email, password);
      }
      onLogin(user);
    } catch (err) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        className="glass-panel" 
        style={{ 
          width: '100%', maxWidth: '420px', padding: '2.5rem', 
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', zIndex: 10,
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          animation: 'fadeInUp 0.35s ease-out'
        }}
      >
        <div style={{ 
          width: '72px', height: '72px', borderRadius: '50%', 
          background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-highlight)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          marginBottom: '1.5rem', boxShadow: 'var(--shadow-glow)'
        }}>
          <PeacockFeatherIcon size={36} className="text-accent-primary" />
        </div>
        
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          {isLogin ? "Sign in to continue to Zeno." : "Join Zeno for calm, thoughtful conversations."}
        </p>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', width: '100%', animation: 'fadeInUp 0.2s ease-out' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="btn-icon primary"
            style={{ width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginTop: '0.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none' }}
          >
            {loading ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <div className="typing-dot" style={{ background: 'white' }}></div>
                <div className="typing-dot" style={{ background: 'white' }}></div>
                <div className="typing-dot" style={{ background: 'white' }}></div>
              </div>
            ) : isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <button 
          type="button"
          onClick={handleLocalGuest}
          disabled={loading}
          style={{
            width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            fontWeight: 500, fontSize: '0.95rem', background: 'var(--bg-glass-heavy)',
            border: '1px solid var(--border-color)', color: 'var(--text-primary)',
            cursor: 'pointer', transition: 'background 0.2s'
          }}
        >
          <User size={18} />
          Continue Offline
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
