import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Rocket, Plus, Trash2 } from 'lucide-react';

export default function CreateExperience() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Travel');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [groupId, setGroupId] = useState('Personal');
  const [groups, setGroups] = useState([]);
  
  // Dynamic Fields
  const [itemsToTry, setItemsToTry] = useState('');
  
  // Travel Arrays
  const [accommodations, setAccommodations] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGroups() {
      if (!currentUser?.uid) return;
      const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchGroups();
  }, [currentUser]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const addAccommodation = () => setAccommodations([...accommodations, { id: generateId(), name: '', pricePerNight: 0, nights: 1 }]);
  const updateAccommodation = (idx, field, value) => {
    const newAcc = [...accommodations];
    newAcc[idx][field] = value;
    setAccommodations(newAcc);
  };
  const removeAccommodation = (idx) => setAccommodations(accommodations.filter((_, i) => i !== idx));

  const addActivity = () => setActivities([...activities, { id: generateId(), name: '', pricePerPerson: 0, agentContact: '' }]);
  const updateActivity = (idx, field, value) => {
    const newAct = [...activities];
    newAct[idx][field] = value;
    setActivities(newAct);
  };
  const removeActivity = (idx) => setActivities(activities.filter((_, i) => i !== idx));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const expData = {
        title,
        type,
        date,
        location,
        groupId,
        creatorId: currentUser.uid,
        createdAt: new Date(),
        rsvps: { [currentUser.uid]: 'yes' },
        itemCompletion: {} // Stores completion status per item per user: { itemId: { userId: true } }
      };

      if (type === 'Dining') {
        expData.itemsToTry = itemsToTry.split(',').map(i => ({ id: generateId(), name: i.trim() })).filter(i => i.name);
      } else if (type === 'Travel') {
        expData.accommodations = accommodations;
        expData.activities = activities;
      }

      await addDoc(collection(db, 'experiences'), expData);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Failed to create experience.");
    }
    setLoading(false);
  }

  return (
    <div className="animate-slide-up" style={{ padding: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>Manifest an Experience</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Write it down so you can feel bad when you cancel.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <div className="input-group">
          <label className="input-label">What are we doing?</label>
          <input type="text" className="input-field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rishikesh Madness" />
        </div>

        <div className="input-group">
          <label className="input-label">Where? (City or Maps Link)</label>
          <input type="text" className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Rishikesh or https://maps..." />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Type of Experience</label>
            <select 
              className="input-field" 
              value={type} 
              onChange={e => {
                setType(e.target.value);
                setAccommodations([]);
                setActivities([]);
                setItemsToTry('');
              }}
            >
              <option value="Dining">Dining (Restaurants, Cafes, Bars)</option>
              <option value="Travel">Travel (Trips, Getaways)</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">When?</label>
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Who is coming?</label>
          <select className="input-field" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="Personal">Self-Use Only (Personal)</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '20px 0' }} />

        {/* Dynamic Fields */}
        {type === 'Dining' && (
          <div className="input-group animate-slide-up">
            <label className="input-label">What do you want to try here?</label>
            <textarea className="input-field" value={itemsToTry} onChange={e => setItemsToTry(e.target.value)} placeholder="e.g. Truffle Fries, Pink Latte (comma separated)" rows={3}></textarea>
          </div>
        )}

        {type === 'Travel' && (
          <div className="animate-slide-up">
            <h4 style={{ marginBottom: '8px' }}>Accommodations</h4>
            {accommodations.map((acc, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '8px' }}>
                <input type="text" className="input-field" style={{ width: '100%', marginBottom: '8px' }} placeholder="Hotel Name" value={acc.name} onChange={e => updateAccommodation(idx, 'name', e.target.value)} required />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input-field" style={{ flex: 1 }} placeholder="₹ / Night" value={acc.pricePerNight} onChange={e => updateAccommodation(idx, 'pricePerNight', e.target.value)} required />
                  <input type="number" className="input-field" style={{ flex: 1 }} placeholder="Nights" value={acc.nights} onChange={e => updateAccommodation(idx, 'nights', e.target.value)} required />
                  <button type="button" onClick={() => removeAccommodation(idx)} className="btn btn-outline" style={{ padding: '0 12px', color: 'var(--accent-pink)' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addAccommodation} className="btn btn-outline" style={{ width: '100%', marginBottom: '20px', padding: '8px' }}><Plus size={16}/> Add Hotel Option</button>

            <h4 style={{ marginBottom: '8px' }}>Activities</h4>
            {activities.map((act, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '8px' }}>
                <input type="text" className="input-field" style={{ width: '100%', marginBottom: '8px' }} placeholder="Activity Name (e.g. Bungee)" value={act.name} onChange={e => updateActivity(idx, 'name', e.target.value)} required />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input-field" style={{ flex: 1 }} placeholder="₹ / Person" value={act.pricePerPerson} onChange={e => updateActivity(idx, 'pricePerPerson', e.target.value)} required />
                  <input type="text" className="input-field" style={{ flex: 1 }} placeholder="Agent Contact" value={act.agentContact} onChange={e => updateActivity(idx, 'agentContact', e.target.value)} />
                  <button type="button" onClick={() => removeActivity(idx)} className="btn btn-outline" style={{ padding: '0 12px', color: 'var(--accent-pink)' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addActivity} className="btn btn-outline" style={{ width: '100%', marginBottom: '8px', padding: '8px' }}><Plus size={16}/> Add Activity</button>
          </div>
        )}

        <button disabled={loading} type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
          <Rocket size={20} />
          Lock It In
        </button>
      </form>
    </div>
  );
}
