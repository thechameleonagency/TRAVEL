import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Send, Paperclip, Image as ImageIcon, X } from 'lucide-react';

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load Group Info
    getDoc(doc(db, 'groups', id)).then(snap => {
      if(snap.exists()) setGroup(snap.data());
      else navigate('/chats');
    });

    // Listen to messages
    const q = query(collection(db, 'chatMessages'), where('groupId', '==', id));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.createdAt?.toDate() - b.createdAt?.toDate());
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [id, navigate]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 30) {
      alert("You can only upload a maximum of 30 files per message.");
      setFilesToUpload(selected.slice(0, 30));
    } else {
      setFilesToUpload(selected);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && filesToUpload.length === 0) return;

    let mediaUrls = [];
    
    if (filesToUpload.length > 0) {
      setIsUploading(true);
      const totalFiles = filesToUpload.length;
      let completedFiles = 0;

      for (const file of filesToUpload) {
        if (file.size > 200 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 200MB limit. Skipping.`);
          continue;
        }

        const storageRef = ref(storage, `chatMedia/${id}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // Very rough overall progress
              setUploadProgress(((completedFiles * 100) + fileProgress) / totalFiles);
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              mediaUrls.push({ url, type: file.type });
              resolve();
            }
          );
        });
        completedFiles++;
      }
      setIsUploading(false);
      setFilesToUpload([]);
      setUploadProgress(0);
    }

    if (mediaUrls.length === 0 && !newMessage.trim()) return;

    await addDoc(collection(db, 'chatMessages'), {
      groupId: id,
      text: newMessage,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email.split('@')[0],
      media: mediaUrls, // [{url, type}]
      createdAt: new Date()
    });

    setNewMessage('');
  };

  if (!group) return <div style={{ padding: '20px' }}>Loading Chat...</div>;

  return (
    <div className="animate-slide-up" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', zIndex: 10 }}>
        <button onClick={() => navigate('/chats')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{group.name}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{group.members?.length || 0} members</span>
        </div>
      </header>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => {
          const isMine = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {!isMine && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px', marginBottom: '4px' }}>{msg.senderName}</div>}
              
              <div style={{ 
                background: isMine ? 'var(--accent-blue)' : 'var(--bg-secondary)', 
                color: isMine ? 'white' : 'var(--text-primary)',
                padding: '12px', 
                borderRadius: '16px',
                borderBottomRightRadius: isMine ? '4px' : '16px',
                borderBottomLeftRadius: isMine ? '16px' : '4px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {msg.media && msg.media.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: msg.text ? '8px' : '0' }}>
                    {msg.media.map((m, i) => (
                      m.type.startsWith('video/') ? 
                        <video key={i} src={m.url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} /> :
                        <img key={i} src={m.url} alt="chat media" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ))}
                  </div>
                )}
                {msg.text && <div style={{ wordBreak: 'break-word', fontSize: '0.95rem' }}>{msg.text}</div>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {filesToUpload.length > 0 && (
        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {filesToUpload.map((f, i) => (
            <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {f.type.startsWith('image/') ? <ImageIcon size={24} color="var(--text-secondary)" /> : <Paperclip size={24} color="var(--text-secondary)" />}
              <button onClick={() => setFilesToUpload(filesToUpload.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--accent-pink)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {isUploading && (
        <div style={{ height: '4px', background: 'var(--border-light)', width: '100%' }}>
          <div style={{ height: '100%', background: 'var(--accent-blue)', width: `${uploadProgress}%`, transition: 'width 0.2s' }}></div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', background: 'var(--bg-secondary)', display: 'flex', gap: '12px', alignItems: 'center', paddingBottom: '30px' }}>
        <label style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelect} disabled={isUploading} />
          <Paperclip size={24} />
        </label>
        
        <input 
          type="text" 
          className="input-field" 
          style={{ flex: 1, padding: '12px 16px', borderRadius: '24px' }} 
          placeholder="Message..." 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)}
          disabled={isUploading}
        />
        
        <button type="submit" disabled={isUploading || (!newMessage.trim() && filesToUpload.length === 0)} style={{ background: 'var(--accent-pink)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (isUploading || (!newMessage.trim() && filesToUpload.length === 0)) ? 0.5 : 1 }}>
          <Send size={20} style={{ marginLeft: '2px' }} />
        </button>
      </form>
    </div>
  );
}
