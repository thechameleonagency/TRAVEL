import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Calendar, Download, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [experiences, setExperiences] = useState([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Listen for PWA Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'experiences'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExperiences(exps);
    });

    return unsubscribe;
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="animate-slide-up" style={{ padding: '20px', paddingBottom: '80px' }}>
      
      {showInstallBanner && (
        <div style={{ background: 'var(--accent-pink)', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Install App</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Add to home screen for native experience.</p>
          </div>
          <button onClick={handleInstallClick} style={{ background: 'white', color: 'var(--accent-pink)', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
            <Download size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Install
          </button>
        </div>
      )}

      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>Upcoming Escapes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Get off your couch and do something.
          </p>
        </div>
        <button onClick={() => navigate('/create-experience')} className="btn btn-primary" style={{ padding: '10px 14px' }}>
          <Plus size={20} />
        </button>
      </header>

      <section>
        {experiences.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Calendar size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>No plans yet.</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
              What a sad, boring life.
            </p>
            <button onClick={() => navigate('/create-experience')} className="btn btn-primary" style={{ width: '100%' }}>Fix it</button>
          </div>
        ) : (
          experiences.map(exp => {
            const didIComplete = exp.completionStatus?.[currentUser.uid] === true;
            const didAnyoneComplete = Object.values(exp.completionStatus || {}).some(v => v === true);
            const myRSVP = exp.rsvps?.[currentUser.uid];
            const teasing = didAnyoneComplete && myRSVP === 'no' && !didIComplete;

            return (
              <div 
                key={exp.id} 
                className="card" 
                style={{ cursor: 'pointer', opacity: teasing ? 0.7 : 1 }}
                onClick={() => navigate(`/experience/${exp.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="badge badge-pink" style={{ marginBottom: '8px' }}>{exp.type}</span>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', textDecoration: teasing ? 'line-through' : 'none' }}>{exp.title}</h3>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: teasing ? '12px' : '0' }}>
                  {exp.date && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={16}/> {exp.date}</span>}
                </div>

                {teasing && (
                  <p style={{ color: 'var(--accent-pink)', fontSize: '0.875rem', fontWeight: 600 }}>
                    Completed by friends. Go cry in solo. 😭
                  </p>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
