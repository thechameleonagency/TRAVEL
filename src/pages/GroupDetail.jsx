import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Users, Calendar, Image as ImageIcon, UserPlus, Settings, Trash2 } from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import ConfirmSheet from '../components/ConfirmSheet';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [photos, setPhotos] = useState([]);
  
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  
  const [confirmProps, setConfirmProps] = useState({ isOpen: false });

  useEffect(() => {
    // Listen to group
    const unsubGroup = onSnapshot(doc(db, 'groups', id), (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/groups');
      }
    });

    // Listen to group experiences
    const qExp = query(collection(db, 'experiences'), where('groupId', '==', id));
    const unsubExp = onSnapshot(qExp, (snap) => {
      setExperiences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubGroup(); unsubExp(); };
  }, [id, navigate]);

  useEffect(() => {
    if (experiences.length === 0) return;
    const expIds = experiences.map(e => e.id);
    
    // Listen to photos for these experiences
    // Firestore 'in' query supports up to 10 items. For scale, we'd fetch photos globally and filter client side.
    const unsubPhotos = onSnapshot(collection(db, 'photos'), (snap) => {
      const allPhotos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhotos(allPhotos.filter(p => expIds.includes(p.experienceId)));
    });
    
    return () => { unsubPhotos(); };
  }, [experiences]);

  if (!group) return <div style={{ padding: '20px' }}>Loading Squad...</div>;

  const handleAddMembers = async (e) => {
    e.preventDefault();
    const emailRegex = /\S+@\S+\.\S+/;
    const emails = inviteEmails.split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0 && e !== currentUser.email && emailRegex.test(e));

    if (inviteEmails.trim() && emails.length === 0) {
      alert("Invalid email format detected.");
      return;
    }

    try {
      await updateDoc(doc(db, 'groups', id), {
        pendingInvites: arrayUnion(...emails)
      });
      setInviteEmails('');
      setShowInviteSheet(false);
    } catch (err) {
      console.error(err);
      alert("Failed to send invites.");
    }
  };

  const kickMember = (uidToKick, emailToKick) => {
    setConfirmProps({
      isOpen: true,
      title: "Kick Member",
      message: `Are you sure you want to kick ${emailToKick}?`,
      isDestructive: true,
      confirmText: "Kick",
      onClose: () => setConfirmProps({ isOpen: false }),
      onConfirm: async () => {
        await updateDoc(doc(db, 'groups', id), {
          members: arrayRemove(uidToKick),
          memberEmails: arrayRemove(emailToKick)
        });
      }
    });
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '80px' }}>
      <header style={{ padding: '20px', paddingBottom: '0', background: 'var(--bg-secondary)' }}>
        <button onClick={() => navigate('/groups')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          <ChevronLeft size={20} /> Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>{group.name}</h1>
          <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setShowInviteSheet(true)}>
            <UserPlus size={18} /> Add
          </button>
        </div>
      </header>

      <section style={{ padding: '20px' }}>
        {/* Members List */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Roster
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {group.memberEmails?.map((email, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.875rem' }}>{email} {group.creatorId === group.members[idx] && '👑'}</span>
                {group.creatorId === currentUser.uid && email !== currentUser.email && (
                  <button onClick={() => kickMember(group.members[idx], email)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {group.pendingInvites?.map((email, idx) => (
              <div key={`pending-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', opacity: 0.6 }}>
                <span style={{ fontSize: '0.875rem' }}>{email} (Pending)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Group Plans */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Squad Plans
          </h3>
          {experiences.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>No plans yet. Get off the couch.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {experiences.map(exp => (
                <Link to={`/experience/${exp.id}`} key={exp.id} className="card" style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}>
                  <span className="badge badge-pink" style={{ marginBottom: '8px' }}>{exp.type}</span>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{exp.title}</h4>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                    {exp.date && <span>📅 {exp.date}</span>}
                    {exp.location && <span>📍 {exp.location}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Group Photos */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} /> Squad Memories
          </h3>
          {photos.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No photos yet. Did it even happen?</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {photos.map(p => (
                <div key={p.id} style={{ aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BottomSheet isOpen={showInviteSheet} onClose={() => setShowInviteSheet(false)} title="Invite to Squad">
        <form onSubmit={handleAddMembers}>
          <div className="input-group">
            <label className="input-label">Invite via Emails (comma separated)</label>
            <input type="text" className="input-field" value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} placeholder="friend1@mail.com, friend2@mail.com" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Send Invites</button>
        </form>
      </BottomSheet>

      <ConfirmSheet {...confirmProps} />
    </div>
  );
}
