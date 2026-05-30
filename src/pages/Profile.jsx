import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Mail } from 'lucide-react';

export default function Profile() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
      alert("Failed to log out");
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: '20px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 className="edgy-title" style={{ fontSize: '2rem' }}>Profile</h1>
      </header>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>
            {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
          </span>
        </div>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserIcon size={20} color="var(--accent-pink)" /> 
          {currentUser.displayName || "Unknown User"}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={16} /> {currentUser.email}
        </p>

        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border-light)', margin: '32px 0' }} />

        <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', color: 'var(--accent-pink)' }}>
          <LogOut size={18} /> Log Out
        </button>
      </div>
    </div>
  );
}
