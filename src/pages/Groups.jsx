import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users as UsersIcon, Check, X, Settings, Trash2, Mail } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import ConfirmSheet from '../components/ConfirmSheet';
import BottomSheet from '../components/BottomSheet';

export default function Groups() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [globalInviteEmail, setGlobalInviteEmail] = useState('');

  const [loading, setLoading] = useState(false);

  // Confirm Sheets state
  const [confirmProps, setConfirmProps] = useState({ isOpen: false });

  useEffect(() => {
    if (!currentUser?.uid || !currentUser?.email) return;
    
    // Joined Groups
    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Pending App/Group Invites
    const qInvites = query(collection(db, 'groups'), where('pendingInvites', 'array-contains', currentUser.email));
    const unsubInvites = onSnapshot(qInvites, (snapshot) => {
      setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubGroups(); unsubInvites(); };
  }, [currentUser]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        members: [currentUser.uid],
        memberEmails: [currentUser.email],
        pendingInvites: [],
        creatorId: currentUser.uid,
        createdAt: new Date()
      });
      setGroupName('');
      setShowForm(false);
      navigate(`/group/${docRef.id}`); // Jump straight to the new group
    } catch (err) {
      console.error(err);
      alert("Failed to create squad.");
    }
    setLoading(false);
  };

  const handleGlobalInvite = (e) => {
    e.preventDefault();
    if (!globalInviteEmail) return;
    
    // Send email via mailto
    const subject = encodeURIComponent("Join my inner circle on Planner");
    const body = encodeURIComponent(`Hey!\n\nI'm using Planner to organize trips and share memories. Join me here:\nhttps://your-app-url.netlify.app`);
    window.open(`mailto:${globalInviteEmail}?subject=${subject}&body=${body}`);
    setGlobalInviteEmail('');
    setShowInviteForm(false);
  };

  const acceptInvite = async (group) => {
    const ref = doc(db, 'groups', group.id);
    await updateDoc(ref, {
      members: arrayUnion(currentUser.uid),
      memberEmails: arrayUnion(currentUser.email),
      pendingInvites: arrayRemove(currentUser.email)
    });
  };

  const declineInvite = async (groupId) => {
    await updateDoc(doc(db, 'groups', groupId), {
      pendingInvites: arrayRemove(currentUser.email)
    });
  };

  const renameGroup = async (group) => {
    const newName = window.prompt("New Squad Name:", group.name);
    if (newName && newName.trim()) {
      await updateDoc(doc(db, 'groups', group.id), { name: newName.trim() });
    }
  };

  const leaveGroup = (group) => {
    setConfirmProps({
      isOpen: true,
      title: "Leave Squad",
      message: `Are you sure you want to leave ${group.name}?`,
      isDestructive: true,
      confirmText: "Leave",
      onClose: () => setConfirmProps({ isOpen: false }),
      onConfirm: async () => {
        await updateDoc(doc(db, 'groups', group.id), {
          members: arrayRemove(currentUser.uid),
          memberEmails: arrayRemove(currentUser.email)
        });
      }
    });
  };

  const deleteGroup = (group) => {
    setConfirmProps({
      isOpen: true,
      title: "Delete Squad",
      message: `Are you sure you want to completely destroy ${group.name}? This cannot be undone.`,
      isDestructive: true,
      confirmText: "Delete",
      onClose: () => setConfirmProps({ isOpen: false }),
      onConfirm: async () => {
        await deleteDoc(doc(db, 'groups', group.id));
      }
    });
  };

  return (
    <div className="animate-slide-up" style={{ padding: '20px', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>My People</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" style={{ padding: '12px' }} onClick={() => setShowInviteForm(true)}>
            <Mail size={20} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '12px' }} onClick={() => setShowForm(true)}>
            <UserPlus size={20} />
          </button>
        </div>
      </header>

      {/* INBOX */}
      {invites.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--accent-pink)' }}>Pending Invites</h3>
          {invites.map(inv => (
            <div key={inv.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--accent-pink)' }}>
              <div>
                <strong>{inv.name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invited you to join</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => acceptInvite(inv)} className="btn btn-primary" style={{ padding: '8px' }}><Check size={16} /></button>
                <button onClick={() => declineInvite(inv.id)} className="btn btn-outline" style={{ padding: '8px' }}><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <UsersIcon size={48} color="var(--border-light)" />
          </div>
          <h3 style={{ marginBottom: '8px' }}>It's quiet in here.</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.875rem' }}>
            No squads yet. Create a circle and start planning.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ width: '100%' }}>Create Squad</button>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/group/${group.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UsersIcon size={18} color="var(--accent-blue)"/> {group.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {group.members.length} Members {group.pendingInvites?.length > 0 && `• ${group.pendingInvites.length} Pending`}
                </p>
              </div>
              
              <div onClick={(e) => e.stopPropagation()}>
                {group.creatorId === currentUser.uid ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => renameGroup(group)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><Settings size={18}/></button>
                    <button onClick={() => deleteGroup(group)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)' }}><Trash2 size={18}/></button>
                  </div>
                ) : (
                  <button onClick={() => leaveGroup(group)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Leave</button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Create a Squad" height="50vh">
        <form onSubmit={handleCreateGroup}>
          <div className="input-group">
            <label className="input-label">Squad Name</label>
            <input type="text" className="input-field" required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. The Inner Circle" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Create Squad</button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={showInviteForm} onClose={() => setShowInviteForm(false)} title="Invite to App" height="50vh">
        <form onSubmit={handleGlobalInvite}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Send an email invite to a friend to download the app and join the platform.
          </p>
          <div className="input-group">
            <label className="input-label">Friend's Email</label>
            <input type="email" className="input-field" required value={globalInviteEmail} onChange={e => setGlobalInviteEmail(e.target.value)} placeholder="friend@example.com" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Send Invite via Email</button>
        </form>
      </BottomSheet>

      <ConfirmSheet {...confirmProps} />
    </div>
  );
}
