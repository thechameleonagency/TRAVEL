import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, getDoc, collection, addDoc, query, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Calendar, Camera, DownloadCloud, MessageCircle, Send, Copy, Share, MapPin, CheckCircle, BarChart2 } from 'lucide-react';

export default function ExperienceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [experience, setExperience] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [comments, setComments] = useState([]);
  const [polls, setPolls] = useState([]);
  
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');

  const [uploadingItem, setUploadingItem] = useState(null); // stores itemId currently uploading
  const [groups, setGroups] = useState([]);
  
  const commentsEndRef = useRef(null);

  useEffect(() => {
    // Listen to Experience
    const unsubscribeExp = onSnapshot(doc(db, 'experiences', id), (docSnap) => {
      if (docSnap.exists()) {
        setExperience({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/');
      }
    });

    // Listen to Photos
    const unsubscribePhotos = onSnapshot(query(collection(db, 'photos')), (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.experienceId === id));
    });

    // Listen to Comments
    const unsubscribeComments = onSnapshot(query(collection(db, 'comments')), (snapshot) => {
      const c = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.experienceId === id)
        .sort((a,b) => a.createdAt?.toDate() - b.createdAt?.toDate());
      setComments(c);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // Listen to Polls
    const unsubscribePolls = onSnapshot(query(collection(db, 'polls')), (snapshot) => {
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.experienceId === id);
      setPolls(p);
    });

    // Fetch groups for sharing
    if (currentUser?.email) {
      getDoc(doc(db, 'users', currentUser.uid)).then(() => {
        const unsubscribeGroups = onSnapshot(collection(db, 'groups'), (snap) => {
           setGroups(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(g => g.members?.includes(currentUser.uid)));
        });
        return unsubscribeGroups;
      });
    }

    return () => {
      unsubscribeExp();
      unsubscribePhotos();
      unsubscribeComments();
      unsubscribePolls();
    };
  }, [id, navigate, currentUser]);

  const handleFileUpload = async (e, itemId = 'general') => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingItem(itemId);
    const storageRef = ref(storage, `photos/${id}_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', null, 
      (error) => { console.error(error); setUploadingItem(null); }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'photos'), {
          url: downloadURL,
          uploaderId: currentUser.uid,
          experienceId: id,
          itemId: itemId, // 'general' or specific activity id
          createdAt: new Date()
        });
        setUploadingItem(null);
      }
    );
  };

  const handleRSVP = async (status) => {
    const rsvps = { ...(experience.rsvps || {}) };
    rsvps[currentUser.uid] = status;
    await updateDoc(doc(db, 'experiences', id), { rsvps });
  };

  const markItemComplete = async (itemId) => {
    const ic = { ...(experience.itemCompletion || {}) };
    if (!ic[itemId]) ic[itemId] = {};
    ic[itemId][currentUser.uid] = true;
    await updateDoc(doc(db, 'experiences', id), { itemCompletion: ic });
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addDoc(collection(db, 'comments'), {
      experienceId: id,
      text: newComment,
      senderId: currentUser.uid,
      senderEmail: currentUser.email,
      senderName: currentUser.displayName || currentUser.email.split('@')[0],
      replyToId: replyToId || null,
      createdAt: new Date()
    });
    setNewComment('');
    setReplyToId(null);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const opts = pollOptions.split(',').map(o => o.trim()).filter(o => o.length > 0);
    if (opts.length < 2) return alert("Enter at least 2 options.");
    await addDoc(collection(db, 'polls'), {
      experienceId: id,
      question: pollQuestion,
      options: opts,
      votes: {}, // { userId: optionIndex }
      creatorId: currentUser.uid,
      createdAt: new Date()
    });
    setPollQuestion('');
    setPollOptions('');
    setShowPollForm(false);
  };

  const handleVote = async (pollId, pollVotes, optionIndex) => {
    const newVotes = { ...pollVotes, [currentUser.uid]: optionIndex };
    await updateDoc(doc(db, 'polls', pollId), { votes: newVotes });
  };

  const handleDuplicate = async () => {
    if (!window.confirm("Are you sure you want to duplicate this plan?")) return;
    const newExp = { ...experience, date: '', createdAt: new Date(), rsvps: { [currentUser.uid]: 'yes' }, itemCompletion: {} };
    delete newExp.id;
    const docRef = await addDoc(collection(db, 'experiences'), newExp);
    navigate(`/experience/${docRef.id}`);
  };

  const shareToGroup = async (e) => {
    const newGroupId = e.target.value;
    if (newGroupId) {
      await updateDoc(doc(db, 'experiences', id), { groupId: newGroupId });
    }
  };

  if (!experience) return <div style={{ padding: '20px' }}>Loading...</div>;

  // Calculators
  const goingCount = Object.values(experience.rsvps || {}).filter(v => v === 'yes').length || 1;
  let totalAccom = 0;
  let totalActivity = 0;
  
  if (experience.type === 'Travel') {
    (experience.accommodations || []).forEach(acc => {
      totalAccom += (Number(acc.pricePerNight) * Number(acc.nights) * goingCount);
    });
    (experience.activities || []).forEach(act => {
      totalActivity += (Number(act.pricePerPerson) * goingCount);
    });
  }
  const totalBudget = totalAccom + totalActivity;

  const myRSVP = experience.rsvps?.[currentUser.uid];
  const didAnyoneComplete = Object.keys(experience.itemCompletion || {}).some(itemId => Object.keys(experience.itemCompletion[itemId] || {}).length > 0);

  const renderItemCard = (item, typeIcon, priceDetails) => {
    const isCompletedByMe = experience.itemCompletion?.[item.id]?.[currentUser.uid] === true;
    const isCompletedByAnyone = Object.keys(experience.itemCompletion?.[item.id] || {}).length > 0;
    const teasing = isCompletedByAnyone && myRSVP === 'no' && !isCompletedByMe;
    
    const itemPhotos = photos.filter(p => p.itemId === item.id);

    return (
      <div key={item.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <strong style={{ textDecoration: teasing ? 'line-through' : 'none' }}>{typeIcon} {item.name}</strong>
            {priceDetails && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{priceDetails}</div>}
            {teasing && <p style={{ color: 'var(--accent-pink)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Completed by friends. Go cry in solo. 😭</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isCompletedByMe && myRSVP === 'yes' && (
              <button onClick={() => markItemComplete(item.id)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}><CheckCircle size={14}/> Done</button>
            )}
            {isCompletedByMe && <span style={{ color: 'var(--accent-blue)', fontSize: '0.875rem', fontWeight: 600 }}>Completed ✅</span>}
            <label style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, item.id)} disabled={uploadingItem === item.id} />
              <Camera size={18} />
            </label>
          </div>
        </div>

        {/* Item Photos */}
        {itemPhotos.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
            {itemPhotos.map(p => (
              <div key={p.id} style={{ position: 'relative', minWidth: '60px', width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <a href={p.url} target="_blank" download style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(255,255,255,0.8)', padding: '2px', borderRadius: '50%', color: 'var(--text-primary)' }}>
                  <DownloadCloud size={10} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper to build threaded comments
  const renderComments = () => {
    const parentComments = comments.filter(c => !c.replyToId);
    
    return parentComments.map(parent => {
      const replies = comments.filter(c => c.replyToId === parent.id);
      return (
        <div key={parent.id} style={{ marginBottom: '12px' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{parent.senderName || parent.senderEmail.split('@')[0]}</div>
               <button onClick={() => setReplyToId(parent.id)} style={{ fontSize: '0.7rem', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Reply</button>
            </div>
            <div style={{ fontSize: '0.875rem' }}>{parent.text}</div>
          </div>
          
          {replies.length > 0 && (
            <div style={{ marginLeft: '16px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '2px solid var(--border-light)', paddingLeft: '8px' }}>
              {replies.map(reply => (
                <div key={reply.id} style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-pink)', fontWeight: 600 }}>{reply.senderName || reply.senderEmail.split('@')[0]}</div>
                  <div style={{ fontSize: '0.875rem' }}>{reply.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '80px' }}>
      <header style={{ padding: '20px', paddingBottom: '0' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          <ChevronLeft size={20} /> Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="badge badge-pink" style={{ marginBottom: '8px' }}>{experience.type}</span>
            {experience.groupId === 'Personal' && <span className="badge badge-blue" style={{ marginLeft: '8px' }}>Personal</span>}
            <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>{experience.title}</h1>
          </div>
          <button onClick={handleDuplicate} className="btn btn-outline" style={{ padding: '8px', fontSize: '0.75rem' }}><Copy size={16}/> Duplicate</button>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '12px' }}>
          {experience.date && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={16}/> {experience.date}</span>}
          {experience.location && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16}/> {experience.location.startsWith('http') ? <a href={experience.location} target="_blank" rel="noreferrer">View Map</a> : experience.location}</span>}
        </div>

        {experience.groupId === 'Personal' && groups.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share size={16} color="var(--accent-blue)" />
            <select className="input-field" style={{ padding: '8px', fontSize: '0.875rem' }} onChange={shareToGroup}>
              <option value="">Share to Squad...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </header>

      <section style={{ padding: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>RSVP</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{goingCount} Going</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button disabled={didAnyoneComplete} onClick={() => handleRSVP('yes')} className={myRSVP === 'yes' ? "btn btn-primary" : "btn btn-outline"} style={{ flex: 1, padding: '8px', fontSize: '0.875rem' }}>I'm In 🤘</button>
            <button disabled={didAnyoneComplete} onClick={() => handleRSVP('no')} className={myRSVP === 'no' ? "btn btn-secondary" : "btn btn-outline"} style={{ flex: 1, padding: '8px', fontSize: '0.875rem' }}>Bailing 😭</button>
          </div>
        </div>

        {/* Dynamic Data rendering */}
        {experience.type === 'Dining' && experience.itemsToTry?.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Items to Try</h3>
            {experience.itemsToTry.map(item => renderItemCard(item, '🍽️', null))}
          </div>
        )}

        {experience.type === 'Travel' && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Trip Itinerary & Budget</h3>
            {(experience.accommodations || []).map(acc => renderItemCard(acc, '🏨', `₹${acc.pricePerNight}/night x ${acc.nights} nights`))}
            {(experience.activities || []).map(act => renderItemCard(act, '🎢', `₹${act.pricePerPerson}/person ${act.agentContact ? `• Contact: ${act.agentContact}` : ''}`))}
            
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Group Estimated Total:</span>
                <span style={{ color: 'var(--accent-pink)' }}>₹{totalBudget.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>Per Person:</span>
                <span>₹{(totalBudget / goingCount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Polls Section */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={20} /> Polls</h3>
            <button onClick={() => setShowPollForm(!showPollForm)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+ Create Poll</button>
          </div>
          
          {showPollForm && (
            <form className="card animate-slide-up" style={{ marginBottom: '16px', border: '1px solid var(--accent-blue)' }} onSubmit={handleCreatePoll}>
              <input type="text" className="input-field" style={{ marginBottom: '8px' }} placeholder="Poll Question" value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} required />
              <input type="text" className="input-field" style={{ marginBottom: '8px' }} placeholder="Option A, Option B (comma separated)" value={pollOptions} onChange={e=>setPollOptions(e.target.value)} required />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px' }}>Post Poll</button>
                <button type="button" onClick={() => setShowPollForm(false)} className="btn btn-outline" style={{ flex: 1, padding: '8px' }}>Cancel</button>
              </div>
            </form>
          )}

          {polls.map(poll => {
            const totalVotes = Object.keys(poll.votes || {}).length || 1; // avoid / 0
            const myVote = poll.votes?.[currentUser.uid];
            return (
              <div key={poll.id} className="card" style={{ marginBottom: '12px' }}>
                <strong style={{ marginBottom: '12px', display: 'block' }}>{poll.question}</strong>
                {poll.options.map((opt, idx) => {
                  const voteCount = Object.values(poll.votes || {}).filter(v => v === idx).length;
                  const percent = Math.round((voteCount / (Object.keys(poll.votes||{}).length || 1)) * 100);
                  return (
                    <div key={idx} onClick={() => handleVote(poll.id, poll.votes, idx)} style={{ marginBottom: '8px', cursor: 'pointer', position: 'relative', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: myVote === idx ? 'rgba(59, 130, 246, 0.2)' : 'var(--border-light)', width: `${percent}%`, transition: 'width 0.3s ease' }}></div>
                      <div style={{ padding: '8px 12px', position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>{myVote === idx && '✓ '} {opt}</span>
                        <span>{voteCount} ({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Global Photos / Evidence */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Global Evidence</h3>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', fontSize: '0.875rem', fontWeight: 600 }}>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'general')} disabled={uploadingItem === 'general'} />
              <Camera size={18} /> {uploadingItem === 'general' ? '...' : 'Add Group/Cover Photo'}
            </label>
          </div>
          
          {photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)', color: 'var(--text-secondary)' }}>
              No photos yet. Did it even happen?
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                  <img src={photo.url} alt="Memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <a href={photo.url} target="_blank" download style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(255,255,255,0.8)', padding: '4px', borderRadius: '50%', color: 'var(--text-primary)' }}>
                    <DownloadCloud size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Comments */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={20} /> Trash Talk</h3>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px', padding: '12px' }}>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column' }}>
              {renderComments()}
              <div ref={commentsEndRef} />
            </div>
            {replyToId && (
               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                 <span>Replying to comment...</span>
                 <button onClick={() => setReplyToId(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)' }}>Cancel</button>
               </div>
            )}
            <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="input-field" style={{ flex: 1, padding: '10px' }} placeholder="Say something..." value={newComment} onChange={e => setNewComment(e.target.value)} />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}><Send size={18} /></button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
