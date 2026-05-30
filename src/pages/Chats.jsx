import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function Chats() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  return (
    <div className="animate-slide-up" style={{ padding: '20px', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>Squad Chats</h1>
      </header>

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <MessageSquare size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No active chats.</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            You need to join or create a squad first.
          </p>
          <button onClick={() => navigate('/groups')} className="btn btn-primary" style={{ width: '100%' }}>Find My People</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groups.map(group => (
            <div key={group.id} className="card" style={{ cursor: 'pointer', margin: 0, padding: '16px' }} onClick={() => navigate(`/chat/${group.id}`)}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  {group.name[0].toUpperCase()}
                </div>
                {group.name}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '8px', marginLeft: '48px' }}>
                Tap to open chat...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
