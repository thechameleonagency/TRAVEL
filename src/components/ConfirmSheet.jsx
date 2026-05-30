import React from 'react';
import BottomSheet from './BottomSheet';

export default function ConfirmSheet({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="auto">
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button 
            className={`btn ${isDestructive ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ width: '100%', padding: '14px' }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </button>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', padding: '14px', border: 'none', color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
