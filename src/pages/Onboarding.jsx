import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, Camera, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else {
      localStorage.setItem(`onboarded_${currentUser.uid}`, 'true');
      navigate('/');
    }
  };

  const screens = [
    {
      title: "Stop Dreaming. Start Doing.",
      description: "You have talked about that trip for years. It's time to actually build the itinerary, invite your people, and lock it in.",
      icon: <Rocket size={80} color="var(--accent-pink)" />
    },
    {
      title: "Smart Memories Vault",
      description: "Upload photos or use our Smart Camera with built-in AI auto-filters. Throw away the boring group chats, keep the memories.",
      icon: <Camera size={80} color="var(--accent-blue)" />
    }
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 20px', background: 'var(--bg-primary)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
        >
          <div style={{ marginBottom: '40px', background: 'var(--bg-secondary)', padding: '30px', borderRadius: '50%', boxShadow: 'var(--shadow-lg)' }}>
            {screens[step].icon}
          </div>
          <h1 className="edgy-title" style={{ fontSize: '2rem', marginBottom: '16px' }}>{screens[step].title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '300px', lineHeight: '1.6' }}>
            {screens[step].description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step === 0 ? 'var(--accent-blue)' : 'var(--border-light)' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step === 1 ? 'var(--accent-blue)' : 'var(--border-light)' }} />
        </div>
        <button onClick={handleNext} className="btn btn-primary" style={{ padding: '14px 24px' }}>
          {step === 0 ? (
            <>Next <ArrowRight size={18} /></>
          ) : (
            <>Get Started <Check size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
