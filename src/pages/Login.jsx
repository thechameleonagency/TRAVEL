import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, KeyRound } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      if (isReset) {
        await resetPassword(email);
        setMsg("Reset link sent! Check your inbox.");
        setIsReset(false);
      } else if (isLogin) {
        await login(email, password, rememberMe);
      } else {
        await signup(email, password, displayName);
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message || "Failed to authenticate.");
    }
    setLoading(false);
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 className="edgy-title" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Planner.</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isReset ? "Let's get you back in." : isLogin ? "Welcome back. Time to plan things you might actually do." : "Join us. Stop dreaming, start planning."}
        </p>
      </div>

      <div className="card">
        {error && <div style={{ color: 'var(--accent-pink)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}
        {msg && <div style={{ color: 'var(--accent-blue)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>{msg}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!isLogin && !isReset && (
            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input 
                type="text" 
                className="input-field" 
                required 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          {!isReset && (
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {isLogin && !isReset && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember Me
              </label>
              <button type="button" onClick={() => setIsReset(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 500 }}>
                Forgot Password?
              </button>
            </div>
          )}

          <button disabled={loading} type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
            {isReset ? <KeyRound size={20} /> : <LogIn size={20} />}
            {isReset ? 'Send Reset Link' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            onClick={() => { setIsLogin(!isLogin); setIsReset(false); setError(''); setMsg(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600 }}
          >
            {isReset ? "Back to Login" : isLogin ? "Don't have an account? Sign up." : "Already have an account? Log in."}
          </button>
        </div>
      </div>
    </div>
  );
}
