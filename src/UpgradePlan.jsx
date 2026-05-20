import React from 'react';
import { X, Sparkles, Brain, Mic, Infinity, Lock, FileCode, Users, Settings, MessageSquare, Shield, Terminal, Monitor, CreditCard } from 'lucide-react';
import './UpgradePlan.css';

export default function UpgradePlan({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="upgrade-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>
        
        <div className="upgrade-header">
          <h2>Upgrade your plan</h2>
          <div className="plan-toggle">
            <span className="toggle-option">Personal</span>
            <span className="toggle-option active">Business</span>
          </div>
        </div>

        <div className="pricing-cards">
          {/* Basic Plan */}
          <div className="pricing-card card-go">
            <h3>Basic</h3>
            <div className="price-container">
              <span className="currency">Rs</span>
              <span className="price-strike">399</span>
              <span className="price-active">0</span>
              <div className="price-details">
                <span>INR / month (including GST)</span>
                <span>until Nov 10, 2026</span>
              </div>
            </div>
            <p className="plan-desc">Keep chatting with expanded access</p>
            <button className="plan-btn btn-current">Your current plan</button>

            <ul className="feature-list">
              <li><Sparkles size={16}/> Core model</li>
              <li><MessageSquare size={16}/> More messages and uploads</li>
              <li><Brain size={16}/> Local companion memory</li>
              <li><Mic size={16}/> Expanded voice mode</li>
            </ul>
            <div className="plan-footer">This plan may include ads. <a>Learn more</a></div>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card card-business-plus">
            <h3>Zeno <span>Pro</span></h3>
            <div className="price-container">
              <span className="currency">Rs</span>
              <span className="price-active">1,800</span>
              <div className="price-details">
                <span style={{ fontSize: '0.7rem' }}>INR / month (exclusive of GST)</span>
              </div>
            </div>
            <p className="plan-desc">Get more done with offline personal intelligence</p>
            <button className="plan-btn btn-upgrade-purple">Upgrade</button>

            <ul className="feature-list">
              <li><Sparkles size={16}/> Advanced local guidance flows</li>
              <li><Infinity size={16}/> Unlimited core chat and uploads</li>
              <li><Brain size={16}/> Deeper companion memory and focus guidance</li>
              <li><Settings size={16}/> Integrations and company knowledge</li>
              <li><FileCode size={16}/> Study and document helper tools</li>
              <li><Users size={16}/> Tools for teams like projects & custom GPTs</li>
              <li><Lock size={16}/> Advanced security with SSO, MFA, & more</li>
              <li><Shield size={16}/> Privacy built in; data never used for training</li>
            </ul>
            <div className="plan-footer">
              For 2+ seats, billed annually<br/>
              Unlimited subject to abuse guardrails. <a>Learn more</a><br/>
              GST excluded at checkout with a valid GST ID
            </div>
          </div>

          {/* Elite Plan */}
          <div className="pricing-card card-business-codex">
            <h3>Zeno <span>Elite</span></h3>
            <div className="price-container">
              <span className="price-active" style={{ fontSize: '1.5rem', marginTop: '1rem', letterSpacing: '0' }}>Usage pricing</span>
            </div>
            <p className="plan-desc">For advanced offline companion workflows</p>
            <button className="plan-btn btn-upgrade-white">Upgrade</button>

            <ul className="feature-list">
              <li><Terminal size={16}/> Local personal automation</li>
              <li><Shield size={16}/> Automated code and security reviews</li>
              <li><Monitor size={16}/> Automate tasks on your computer</li>
              <li><FileCode size={16}/> Take action across your documents, tools, and codebases</li>
              <li><Brain size={16}/> Private local companion workflows</li>
              <li><Lock size={16}/> No training on your data; SAML security</li>
              <li><Users size={16}/> Easy member, role, & billing management</li>
              <li><CreditCard size={16}/> No fixed seat fee; pay as you go based on usage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
