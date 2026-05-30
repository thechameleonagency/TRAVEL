import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCcw, Send, Download, Sparkles } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

export default function SmartCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // environment or user
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  
  const [filter, setFilter] = useState('none');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState(null);

  // Filters dictionary
  const filters = {
    'none': 'none',
    'food': 'saturate(1.5) contrast(1.1) brightness(1.1)',
    'portrait': 'brightness(1.1) contrast(0.9) sepia(0.2)',
    'sunset': 'saturate(1.8) hue-rotate(-10deg) brightness(0.9)',
    'bnw': 'grayscale(1) contrast(1.2)',
    'vintage': 'sepia(0.5) contrast(1.2) hue-rotate(-15deg)',
    'cyberpunk': 'saturate(2) hue-rotate(90deg)',
  };

  useEffect(() => {
    // Load MobileNet Model
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (err) {
        console.error("TF Model load failed", err);
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Camera access is required to use the Smart Camera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // AI Classification Loop
  useEffect(() => {
    if (!model || !videoRef.current || capturedPhoto) return;

    let animationFrameId;
    
    const analyzeFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const predictions = await model.classify(videoRef.current);
          const topResult = predictions[0]?.className.toLowerCase();
          
          if (topResult) {
            // Very simple heuristic
            if (topResult.includes('food') || topResult.includes('plate') || topResult.includes('fruit') || topResult.includes('burger')) {
              setAiSuggestion('Food detected. Auto-applying Food Filter! 🍕');
              setFilter('food');
            } else if (topResult.includes('person') || topResult.includes('face') || topResult.includes('sunglasses')) {
              setAiSuggestion('Portrait mode. Softening edges. 👤');
              setFilter('portrait');
            } else if (topResult.includes('sky') || topResult.includes('sun')) {
              setAiSuggestion('Sunset detected. Warming up! 🌅');
              setFilter('sunset');
            } else {
              setAiSuggestion('');
              setFilter('none');
            }
          }
        } catch (e) {
          // ignore frame errors
        }
      }
      // Analyze every ~1 second instead of every frame to save battery
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(analyzeFrame);
      }, 1000);
    };

    analyzeFrame();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [model, capturedPhoto]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Apply CSS filter to canvas drawing
    ctx.filter = filters[filter];
    
    // If front camera, mirror image
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirm = async () => {
    // Convert dataURL to File object for uploading
    const res = await fetch(capturedPhoto);
    const blob = await res.blob();
    const file = new File([blob], `smart_cam_${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white' }}>
          <X size={24} />
        </button>
        {!capturedPhoto && (
          <button onClick={toggleCamera} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white' }}>
            <RefreshCcw size={24} />
          </button>
        )}
      </div>

      {/* Viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {capturedPhoto ? (
          <img src={capturedPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              filter: filters[filter],
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)'
            }} 
          />
        )}
        
        {/* AI Overlay */}
        {!capturedPhoto && (
          <div style={{ position: 'absolute', top: '80px', left: '20px', right: '20px', textAlign: 'center' }}>
            {isModelLoading ? (
              <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem' }}>Loading AI Engine...</span>
            ) : aiSuggestion ? (
              <span style={{ background: 'var(--accent-pink)', color: 'white', padding: '6px 12px', borderRadius: '16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <Sparkles size={16} /> {aiSuggestion}
              </span>
            ) : null}
          </div>
        )}
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Controls */}
      <div style={{ padding: '20px', background: '#000', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Filters Scroll (only if not captured) */}
        {!capturedPhoto && (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {Object.keys(filters).map(f => (
              <button 
                key={f} 
                onClick={() => { setFilter(f); setAiSuggestion('Manual Override'); }}
                style={{ 
                  background: filter === f ? 'var(--accent-pink)' : '#333', 
                  color: 'white', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '16px', 
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Capture / Confirm Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '20px' }}>
          {capturedPhoto ? (
            <>
              <button onClick={handleRetake} style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '1rem', padding: '12px' }}>Retake</button>
              <button onClick={handleConfirm} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                Save & Share <Send size={20} />
              </button>
            </>
          ) : (
            <button onClick={takePhoto} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'white', border: '4px solid #ccc', outline: '4px solid white', outlineOffset: '2px', cursor: 'pointer' }}></button>
          )}
        </div>
      </div>
    </div>
  );
}
