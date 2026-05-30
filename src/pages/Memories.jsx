import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, DownloadCloud, Share2 } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import SmartCamera from '../components/SmartCamera';
import BottomSheet from '../components/BottomSheet';

export default function Memories() {
  const { currentUser } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [groups, setGroups] = useState([]);
  
  const [showCamera, setShowCamera] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Load User's Photos (Uploaded by them, or in their groups)
    // For now, let's just load photos uploaded by them to the free storage box 'personal'
    // To scale, we'd fetch all photos for all their groups.
    const qPhotos = query(collection(db, 'photos'), where('uploaderId', '==', currentUser.uid));
    const unsubPhotos = onSnapshot(qPhotos, snap => {
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    });

    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsubGroups = onSnapshot(qGroups, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPhotos(); unsubGroups(); };
  }, [currentUser]);

  const handleCapture = (file) => {
    setCapturedFile(file);
    setShowCamera(false);
    setShowShareSheet(true);
  };

  const uploadPhoto = async (targetId) => {
    if (!capturedFile) return;
    setIsUploading(true);
    
    try {
      const storageRef = ref(storage, `photos/vault_${Date.now()}_${capturedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, capturedFile);
      
      uploadTask.on('state_changed', null, 
        (err) => { console.error(err); alert("Upload failed."); setIsUploading(false); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'photos'), {
            url,
            uploaderId: currentUser.uid,
            experienceId: targetId === 'vault' ? 'personal' : null,
            groupId: targetId !== 'vault' ? targetId : null,
            itemId: 'general',
            createdAt: new Date()
          });
          setIsUploading(false);
          setShowShareSheet(false);
          setCapturedFile(null);
        }
      );
    } catch (e) {
      console.error(e);
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: '20px', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="edgy-title" style={{ fontSize: '1.75rem' }}>The Vault</h1>
        <button onClick={() => setShowCamera(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
          <Camera size={18} /> Click
        </button>
      </header>

      {photos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <ImageIcon size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Your vault is empty.</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Use the smart camera to capture memories and store them freely.
          </p>
          <button onClick={() => setShowCamera(true)} className="btn btn-outline" style={{ width: '100%' }}>Open Camera</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
              <img src={p.url} alt="Memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                <a href={p.url} target="_blank" download style={{ background: 'rgba(255,255,255,0.8)', padding: '4px', borderRadius: '50%', color: 'var(--text-primary)', display: 'block' }}>
                  <DownloadCloud size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCamera && (
        <SmartCamera onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      )}

      <BottomSheet isOpen={showShareSheet} onClose={() => { setShowShareSheet(false); setCapturedFile(null); }} title="Save Photo" height="auto">
        {capturedFile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '20px' }}>
            <img src={URL.createObjectURL(capturedFile)} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '20px' }} />
            
            <button disabled={isUploading} onClick={() => uploadPhoto('vault')} className="btn btn-primary" style={{ width: '100%', marginBottom: '12px' }}>
              {isUploading ? 'Saving...' : 'Save to Personal Vault'}
            </button>

            <div style={{ width: '100%', position: 'relative', textAlign: 'center', margin: '20px 0' }}>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
              <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-secondary)', padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Or Share</span>
            </div>

            {groups.map(g => (
              <button key={g.id} disabled={isUploading} onClick={() => uploadPhoto(g.id)} className="btn btn-outline" style={{ width: '100%', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{g.name}</span>
                <Share2 size={16} />
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
