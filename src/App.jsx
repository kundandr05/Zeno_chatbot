import { useState, useRef, useEffect } from 'react';
import { Send, Menu, User, Bot, PlusCircle, Trash2, Sun, Moon, MessageSquare, Clock, LogOut, Copy, Check, Mic, Share2, Paperclip, X, BrainCircuit, ListChecks, GraduationCap, HeartHandshake } from 'lucide-react';
import { PeacockFeatherIcon } from './PeacockFeatherIcon';
import Markdown from 'markdown-to-jsx';
import Login from './Login';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';
import { logoutUser, saveChatSessions, loadChatSessions, loadUserMemories, loadUserProfile, saveUserProfile } from './localAuthStore';
import { processChatMessage, processChatMessageAsync } from './chatbotEngine';
import { addMemory, loadLifeMemory, saveExtractedMemories, sanitizeMemoryArray } from './localStore';
import './App.css';

const voiceLanguages = [
  { code: 'en-IN', label: 'EN', name: 'English' },
  { code: 'hi-IN', label: 'HI', name: 'Hindi' },
  { code: 'kn-IN', label: 'KN', name: 'Kannada' },
];

const readableFileTypes = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-javascript',
  'application/x-ndjson',
  'application/csv',
];

const readableFileExtensions = /\.(txt|md|markdown|csv|json|jsonl|xml|html|css|js|jsx|ts|tsx|py|java|c|cpp|h|hpp|cs|go|rs|php|rb|sql|yaml|yml|log)$/i;
const maxReadableFileBytes = 2 * 1024 * 1024;
const maxStoredFileChars = 50000;

const isReadableFile = (file) => (
  readableFileTypes.some((type) => file.type.startsWith(type) || file.type === type)
  || readableFileExtensions.test(file.name)
);

const readTextFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  const slice = file.slice(0, maxReadableFileBytes);
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not read file'));
  reader.readAsText(slice);
});

const formatBytes = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const quickActions = [
  { label: 'Help me focus', icon: BrainCircuit, prompt: "Help me focus. Name the single task and the main distraction." },
  { label: 'Solve a problem', icon: ListChecks, prompt: "Solve my problem. Briefly describe the decision or barrier." },
  { label: 'Study support', icon: GraduationCap, prompt: "Study support. Which topic or task do you want a short plan for?" },
  { label: 'Talk to me', icon: HeartHandshake, prompt: "Talk to me. Say what’s been on your mind in one sentence." },
];

const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  return match ? (
    <pre><code className={`language-${match[1]}`}>{String(children).replace(/\n$/, '')}</code></pre>
  ) : (
    <code className={className} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontFamily: 'monospace' }}>
      {children}
    </code>
  );
};

const QuickActionPill = ({ action, onClick, disabled = false }) => {
  const Icon = action.icon;
  return (
    <button type="button" onClick={() => onClick(action.prompt)} disabled={disabled}>
      <Icon size={14} /> {action.label}
    </button>
  );
};

export default function App() {
  const [userAuth, setUserAuth] = useState(() => {
    const saved = localStorage.getItem('user_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_full_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('dashboard'); // 'onboarding', 'dashboard', 'chat'
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme_dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [tonePreference, setTonePreference] = useState(() => {
    const saved = localStorage.getItem('zeno_tone_preference');
    return saved || 'Calm';
  });
  
  const [userMemories, setUserMemories] = useState(() => {
    const uid = userAuth?.uid;
    if (!uid) return [];
      const saved = localStorage.getItem(`user_memories_${uid}`);
      return saved ? sanitizeMemoryArray(JSON.parse(saved)) : [];
  });

  const [sessions, setSessions] = useState(() => {
    const uid = userAuth?.uid;
    if (!uid) return [];
    const saved = localStorage.getItem(`chat_sessions_${uid}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });
  
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [input, setInput] = useState('');
  const inputRef = useRef('');
  const [voiceLanguage, setVoiceLanguage] = useState(() => {
    const saved = localStorage.getItem('preferred_language');
    return saved || userProfile?.preferredLanguage || 'en-IN';
  });
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseInputRef = useRef('');
  const sessionsRef = useRef(sessions);
  const activeSessionIdRef = useRef(activeSessionId);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];
  const sessionFiles = activeSession?.files || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, currentView]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    if (userAuth) {
      localStorage.setItem(`chat_sessions_${userAuth.uid}`, JSON.stringify(sessions));
      saveChatSessions(userAuth.uid, sessions);
    }
  }, [sessions, userAuth]);

  useEffect(() => {
    localStorage.setItem('theme_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('zeno_tone_preference', tonePreference);
  }, [tonePreference]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    localStorage.setItem('preferred_language', voiceLanguage);
  }, [voiceLanguage]);

  useEffect(() => {
    if (userProfile?.preferredLanguage) {
      setVoiceLanguage(userProfile.preferredLanguage);
    }
  }, [userProfile?.preferredLanguage]);

  const handleLogin = async (user) => {
    setUserAuth(user);
    localStorage.setItem('user_auth', JSON.stringify(user));
    
    // Load profile
    let profile = await loadUserProfile(user.uid);
    if (!profile) {
      const savedProfile = localStorage.getItem(`user_full_profile_${user.uid}`);
      if (savedProfile) profile = JSON.parse(savedProfile);
    }

    if (profile) {
      setUserProfile(profile);
      localStorage.setItem('user_full_profile', JSON.stringify(profile));
      if (profile.preferredLanguage) setVoiceLanguage(profile.preferredLanguage);
      setCurrentView('dashboard');
    } else {
      setCurrentView('onboarding');
    }
    
    const fsSessions = await loadChatSessions(user.uid);
    if (fsSessions?.length) {
      setSessions(fsSessions);
    } else {
      const savedSessions = localStorage.getItem(`chat_sessions_${user.uid}`);
      if (savedSessions) {
        try { setSessions(JSON.parse(savedSessions)); } catch (e) { setSessions([]); }
      }
    }

    const memories = await loadUserMemories(user.uid);
    setUserMemories(memories || []);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUserAuth(null);
    setUserProfile(null);
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem('user_auth');
    localStorage.removeItem('user_full_profile');
    setShowUserMenu(false);
  };

  const handleOnboardingComplete = async (data) => {
    const fullProfile = { ...data, uid: userAuth.uid, email: userAuth.email };
    setUserProfile(fullProfile);
    setVoiceLanguage(fullProfile.preferredLanguage || 'en-IN');
    localStorage.setItem('user_full_profile', JSON.stringify(fullProfile));
    localStorage.setItem(`user_full_profile_${userAuth.uid}`, JSON.stringify(fullProfile));
    await saveUserProfile(userAuth.uid, fullProfile);
    setCurrentView('dashboard');
  };

  const updateMessages = (newMessagesOrUpdater) => {
    const sessionId = activeSessionIdRef.current;
    setSessions(prevSessions => prevSessions.map(session => {
      if (session.id === sessionId) {
        const updatedMessages = typeof newMessagesOrUpdater === 'function' 
          ? newMessagesOrUpdater(session.messages) 
          : newMessagesOrUpdater;
          
        let newTitle = session.title;
        if (session.title === 'New Chat' && updatedMessages.length > 1) {
          const firstUserMsg = updatedMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
             newTitle = firstUserMsg.content.slice(0, 25) + (firstUserMsg.content.length > 25 ? '...' : '');
          }
        }
        return { ...session, title: newTitle, messages: updatedMessages };
      }
      return session;
    }));
  };

  const createNewChat = (initialPrompt = '') => {
    const lifeMemory = userAuth?.uid ? loadLifeMemory(userAuth.uid) : {};
    const lastMem = (userMemories || []).slice(-1)[0] || lifeMemory.today?.mainGoal || lifeMemory.tasks?.[0]?.title || userProfile?.occupation || '';
    const openingPrompt = lastMem
      ? `You were working on ${String(lastMem).slice(0, 120)}. Did you make progress or get stuck somewhere?`
      : 'Hey — what would you like to focus on right now?';

    const greeting = processChatMessage(openingPrompt, userProfile, { ...lifeMemory, memories: userMemories }, { language: voiceLanguage, tone: tonePreference });

    const newSession = {
      id: Date.now(),
      title: 'New Chat',
      files: [],
      messages: [{ role: 'bot', content: greeting, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]
    };

    const nextSessions = [newSession, ...sessionsRef.current];
    sessionsRef.current = nextSessions;
    activeSessionIdRef.current = newSession.id;
    setSessions(nextSessions);
    setActiveSessionId(newSession.id);
    setCurrentView('chat');
    setInput(initialPrompt);
    if (window.innerWidth <= 768) setSidebarOpen(false);
    if (initialPrompt.trim()) {
      setTimeout(() => {
        if (!isTypingRef.current) handleSend(initialPrompt);
      }, 180);
    }
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
       setActiveSessionId(null);
       setCurrentView('dashboard');
    }
  };

  const handleSend = (overrideText = null) => {
    const text = overrideText !== null ? overrideText.trim() : inputRef.current.trim();
    if (!text || isTypingRef.current) return;
    recognitionRef.current?.stop();

    const currentSession = sessionsRef.current.find((session) => session.id === activeSessionIdRef.current);
    const currentMessages = currentSession?.messages || [];
    const userMsg = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    const newHistory = [...currentMessages, userMsg];
    updateMessages(newHistory);
    setInput('');
    setIsTyping(true);

    // Simulate thoughtful local reasoning, then stream the response in the UI.
    setTimeout(async () => {
      addMemory(userAuth.uid, userMsg.content);
      const extraction = saveExtractedMemories(userAuth.uid, userMsg.content);
      const updatedMemories = extraction.memories;
      setUserMemories(updatedMemories);
      const lifeMemory = loadLifeMemory(userAuth.uid);
      const currentSession = sessionsRef.current.find((session) => session.id === activeSessionIdRef.current);
      const responseContent = await processChatMessageAsync(userMsg.content, userProfile, { ...lifeMemory, memories: updatedMemories }, { language: voiceLanguage, files: currentSession?.files || [], recentMessages: newHistory.slice(-8), tone: tonePreference });
      const fullResponse = responseContent;
      const botId = Date.now() + 10;
      const botMsg = { id: botId, role: 'bot', content: '', streaming: true, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
      updateMessages([...newHistory, botMsg]);

      let index = 0;
      const step = Math.max(18, Math.ceil(fullResponse.length / 80));
      const stream = window.setInterval(() => {
        index = Math.min(fullResponse.length, index + step);
        updateMessages((currentMessages) => currentMessages.map((message) => (
          message.id === botId
            ? { ...message, content: fullResponse.slice(0, index), streaming: index < fullResponse.length }
            : message
        )));

        if (index >= fullResponse.length) {
          window.clearInterval(stream);
          setIsTyping(false);
        }
      }, 24);
    }, 600);
  };

  const handleQuickAction = (prompt) => {
    if (isTypingRef.current) return;
    // Build a contextual prompt using recent memories and profile hints
    const recent = (userMemories || []).slice(-3).map((m) => (typeof m === 'string' ? m : m.text)).filter(Boolean).join(' • ');
    const contextHint = recent ? `Context: ${recent}` : (userProfile?.occupation ? `Context: ${userProfile.occupation}` : '');
    const dynamicPrompt = contextHint ? `${prompt} — ${contextHint}` : prompt;

    if (currentView !== 'chat' || !activeSession) {
      createNewChat(dynamicPrompt);
      return;
    }

    setInput(dynamicPrompt);
    textareaRef.current?.focus();
    setTimeout(() => handleSend(dynamicPrompt), 180);
  };

  const addFilesToActiveSession = (files) => {
    setSessions(prevSessions => prevSessions.map(session => {
      if (session.id !== activeSessionId) return session;
      const existingFiles = session.files || [];
      return { ...session, files: [...files, ...existingFiles].slice(0, 8) };
    }));
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length || !activeSessionId) return;

    const readable = selectedFiles.filter(isReadableFile);
    const unsupported = selectedFiles.filter((file) => !isReadableFile(file));

    if (unsupported.length) {
      setVoiceStatus(`Skipped unsupported file type: ${unsupported.map((file) => file.name).join(', ')}`);
      setTimeout(() => setVoiceStatus(''), 3600);
    }

    if (!readable.length) return;

    setVoiceStatus('Reading file...');

    const loadedFiles = await Promise.all(readable.map(async (file) => {
      try {
        const rawText = await readTextFile(file);
        const text = rawText.slice(0, maxStoredFileChars);
        return {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          text,
          truncated: file.size > maxReadableFileBytes || rawText.length > maxStoredFileChars,
          addedAt: new Date().toISOString(),
        };
      } catch {
        return null;
      }
    }));

    const usableFiles = loadedFiles.filter(Boolean);
    if (!usableFiles.length) {
      setVoiceStatus('Could not read that file. Try a text, markdown, CSV, JSON, or code file.');
      setTimeout(() => setVoiceStatus(''), 3600);
      return;
    }

    addFilesToActiveSession(usableFiles);
    const fileNames = usableFiles.map((file) => file.name).join(', ');
    const botMsg = {
      role: 'bot',
      content: `Attached **${fileNames}**. Ask me to summarize it, explain it, find something inside it, or answer questions from it.${usableFiles.some((file) => file.truncated) ? '\n\n_Note: very large files are read from the beginning and trimmed for browser performance._' : ''}`,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    };
    updateMessages((currentMessages) => [...currentMessages, botMsg]);
    setVoiceStatus(`Added ${usableFiles.length} file(s)`);
    setTimeout(() => setVoiceStatus(''), 2200);
  };

  const removeSessionFile = (fileId) => {
    setSessions(prevSessions => prevSessions.map(session => (
      session.id === activeSessionId
        ? { ...session, files: (session.files || []).filter((file) => file.id !== fileId) }
        : session
    )));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const updateChatInput = (value) => {
    setInput(value);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    });
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('Voice input is not supported in this browser.');
      setTimeout(() => setVoiceStatus(''), 2600);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;
    voiceBaseInputRef.current = input.trim();

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('Listening...');
      textareaRef.current?.focus();
    };

    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      const cleanTranscript = transcript.trim();
      const baseInput = voiceBaseInputRef.current;
      updateChatInput(baseInput && cleanTranscript ? `${baseInput} ${cleanTranscript}` : cleanTranscript || baseInput);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('Voice input stopped. Try again.');
      setTimeout(() => setVoiceStatus(''), 2600);
    };
    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => setVoiceStatus(''), 1200);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleShareChat = async () => {
    if (!messages.length) return;

    const chatText = messages
      .map((msg) => `${msg.role === 'user' ? 'You' : 'Zeno'}: ${msg.content}`)
      .join('\n\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: activeSession.title,
          text: chatText,
        });
        setShareStatus('Shared');
      } else {
        await navigator.clipboard.writeText(chatText);
        setShareStatus('Copied');
      }
    } catch {
      setShareStatus('Cancelled');
    }

    setTimeout(() => setShareStatus(''), 1800);
  };

  const handleShareMessage = async (msg) => {
    const text = `${msg.role === 'user' ? 'You' : 'Zeno'}: ${msg.content}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: activeSession.title,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus('Copied');
        setTimeout(() => setShareStatus(''), 1800);
      }
    } catch {
      setShareStatus('Cancelled');
      setTimeout(() => setShareStatus(''), 1800);
    }
  };

  if (!userAuth) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentView === 'onboarding') {
    return <Onboarding user={userAuth} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" onClick={() => { setCurrentView('dashboard'); setActiveSessionId(null); if(window.innerWidth <= 768) setSidebarOpen(false); }} style={{ cursor: 'pointer' }}>
          <PeacockFeatherIcon className="text-accent-primary" size={28} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zeno</h2>
        </div>
        
        <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="sidebar-btn new-chat-btn" onClick={() => createNewChat('')}>
            <PlusCircle size={20} className="text-accent-primary" /> New Chat
          </button>
          <div className="tone-settings glass-panel-hover">
            <label htmlFor="tone-select" className="tone-label">Tone</label>
            <select
              id="tone-select"
              className="tone-select"
              value={tonePreference}
              onChange={(e) => setTonePreference(e.target.value)}
            >
              <option value="Calm">Calm</option>
              <option value="Direct">Direct</option>
              <option value="Friendly">Friendly</option>
              <option value="Mentor">Mentor-like</option>
            </select>
          </div>
          <div className="history-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <Clock size={14} /> History
          </div>
          
          <div className="sessions-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${activeSessionId === session.id && currentView === 'chat' ? 'active' : ''}`}
                onClick={() => { setActiveSessionId(session.id); setCurrentView('chat'); if(window.innerWidth <= 768) setSidebarOpen(false); }}
              >
                <MessageSquare size={16} className="session-icon" />
                <span className="session-title">{session.title}</span>
                <button className="session-delete" onClick={(e) => deleteSession(session.id, e)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="user-menu-container" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
            {showUserMenu && (
              <div className="glass-panel" style={{ 
                position: 'absolute', bottom: 'calc(100% + 0.5rem)', left: '0', right: '0', 
                borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'flex', 
                flexDirection: 'column', gap: '0.25rem', animation: 'fadeInUp 0.2s ease-out'
              }}>
                <button className="dropdown-item" onClick={() => { setIsDarkMode(!isDarkMode); setShowUserMenu(false); }}>
                  {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>} Toggle Theme
                </button>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }}></div>
                <button className="dropdown-item" onClick={handleLogout}><LogOut size={16}/> Log out</button>
              </div>
            )}
            
            <button className="sidebar-btn" onClick={() => setShowUserMenu(!showUserMenu)} style={{ justifyContent: 'flex-start', padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                {userAuth.photoURL ? (
                  <img src={userAuth.photoURL} alt="Profile" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-glass-heavy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                )}
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userProfile?.fullName || userAuth.displayName || "User"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="main-area">
        {currentView === 'dashboard' && (
          <Dashboard user={userAuth} userProfile={userProfile} onNewChat={createNewChat} quickActions={quickActions} onQuickAction={handleQuickAction} />
        )}

        {currentView === 'chat' && activeSession && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <header className="header glass-panel" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderRadius: 0 }}>
              <button className="btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginRight: '1rem', display: window.innerWidth > 768 ? 'none' : 'flex' }}>
                <Menu size={24} />
              </button>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 500 }}>{activeSession.title}</h1>
              <div className="chat-header-actions">
                {shareStatus && <span className="share-status">{shareStatus}</span>}
                <button
                  className="btn-icon"
                  onClick={handleShareChat}
                  title="Share chat"
                  aria-label="Share chat"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <div className="chat-container" onClick={() => setSidebarOpen(false)}>
              {messages.length <= 1 && (
                <div className="chat-welcome-panel">
                  <p className="eyebrow">Zeno</p>
                  <h2>What do you want to talk through?</h2>
                  <p className="muted">Bring a problem, a rough feeling, a study block, or a small next step.</p>
                  <div className="quick-action-row welcome-actions">
                    {quickActions.map((action) => (
                      <QuickActionPill key={action.label} action={action} onClick={handleQuickAction} />
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx} 
                  className={`message-row ${msg.role}`}
                >
                  {msg.role === 'bot' && (
                    <div className="message-avatar bot-avatar">
                      <Bot size={20} className="text-accent-primary" />
                    </div>
                  )}
                  
                  <div className="message-bubble-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'bot' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                    <div className="message-bubble glass-panel-hover" style={{ position: 'relative' }}>
                      <div className="message-content">
                        {msg.role === 'bot' ? (
                          msg.content ? (
                            <>
                              <Markdown options={{ overrides: { code: { component: CodeBlock } } }}>{msg.content}</Markdown>
                              {msg.streaming && <span className="stream-cursor" />}
                            </>
                          ) : (
                            <div className="typing-inline">
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                            </div>
                          )
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', padding: '0 0.5rem', display: 'flex', gap: '0.5rem' }}>
                      {msg.timestamp}
                      <button onClick={() => handleCopy(msg.content, idx)} style={{ background: 'none', border: 'none', color: copiedIdx === idx ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', padding: 0 }} title="Copy message" aria-label="Copy message">
                        {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button onClick={() => handleShareMessage(msg)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }} title="Share message" aria-label="Share message">
                        <Share2 size={12} />
                      </button>
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="message-avatar user-avatar">
                      {userAuth.photoURL ? (
                        <img src={userAuth.photoURL} alt="You" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && !messages.some((message) => message.streaming) && (
                <div className="message-row bot">
                  <div className="message-avatar bot-avatar">
                    <Bot size={20} className="text-accent-primary" />
                  </div>
                  <div className="message-bubble glass-panel-hover" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="input-area glass-panel" style={{ borderLeft: 'none', borderRight: 'none', borderBottom: 'none', borderRadius: 0, padding: '1rem' }}>
              <div className="quick-action-row">
                {quickActions.map((action) => (
                  <QuickActionPill key={action.label} action={action} onClick={handleQuickAction} disabled={isTyping} />
                ))}
              </div>
              {sessionFiles.length > 0 && (
                <div className="file-context-row" aria-label="Attached files">
                  {sessionFiles.map((file) => (
                    <div className="file-chip" key={file.id} title={`${file.name} - ${formatBytes(file.size)}`}>
                      <span>{file.name}</span>
                      <small>{formatBytes(file.size)}</small>
                      <button type="button" onClick={() => removeSessionFile(file.id)} aria-label={`Remove ${file.name}`}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-wrapper" style={{ background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                <textarea
                  ref={textareaRef}
                  id="chat-input"
                  value={input}
                  onChange={(e) => {
                    updateChatInput(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Talk to Zeno..."
                  rows={1}
                  style={{ maxHeight: '150px' }}
                />
                
                <div className="input-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileUpload}
                    accept=".txt,.md,.markdown,.csv,.json,.jsonl,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.php,.rb,.sql,.yaml,.yml,.log,text/*,application/json"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTyping}
                    title="Attach files"
                    aria-label="Attach files"
                  >
                    <Paperclip size={18} />
                  </button>
                  <select
                    className="language-select"
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    disabled={isListening || isTyping}
                    aria-label="Reply language"
                    title="Reply language"
                  >
                    {voiceLanguages.map((language) => (
                      <option key={language.code} value={language.code}>{language.label}</option>
                    ))}
                  </select>
                  <button
                    className={isListening ? 'btn-icon voice-active' : 'btn-icon'}
                    onClick={handleVoiceInput}
                    disabled={isTyping}
                    title={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    <Mic size={18} />
                  </button>
                  <button 
                    className="btn-icon primary" 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    style={{ background: (!input.trim() || isTyping) ? 'var(--bg-glass-heavy)' : 'var(--accent-primary)', color: (!input.trim() || isTyping) ? 'var(--text-secondary)' : 'white' }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
              {voiceStatus && <div className="input-status">{voiceStatus}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
