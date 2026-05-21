import React, { useRef, useState } from 'react';
import { User, Calendar, Briefcase, Languages, Check } from 'lucide-react';

export default function Onboarding({ user, onComplete }) {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    dob: '',
    age: '',
    preferredLanguage: 'en-IN',
  });

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    onComplete({
      ...formData,
      dob: formData.dob || '',
      age: formData.age || '',
    });
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div
        className="glass-panel onboarding-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: 'clamp(1.5rem, 5vw, 3rem)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.3s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p className="eyebrow">Zeno</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            A calmer companion starts here
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Just the basics. Zeno will learn the rest naturally through conversation.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="input-group">
            <label><User size={16} /> Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required pattern=".*\S.*" title="Please enter your name." className="onboarding-input" />
          </div>

          <div className="onboarding-two">
            <div className="input-group">
              <label><Calendar size={16} /> Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="onboarding-input" />
            </div>
            <div className="input-group">
              <label>Age</label>
              <input type="number" name="age" min="1" max="120" value={formData.age} onChange={handleChange} className="onboarding-input" placeholder="Optional if DOB set" />
            </div>
          </div>

          <div className="input-group">
            <label><Languages size={16} /> Preferred Language</label>
            <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} required className="onboarding-input">
              <option value="en-IN">English</option>
              <option value="hi-IN">Hindi</option>
              <option value="kn-IN">Kannada</option>
            </select>
          </div>

          <button type="submit" className="action-button primary full-width" style={{ marginTop: '1rem' }}>
            Begin with Zeno <Check size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
