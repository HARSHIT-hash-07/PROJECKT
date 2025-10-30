import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { loadModels, detectFace } from '../utils/faceDetection';

export default function RegisterFace() {
  const [username, setUsername] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [message, setMessage] = useState('');
  const [modelsReady, setModelsReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const descriptorsRef = useRef([]);

  const MAX_SAMPLES = 10;

  useEffect(() => {
    loadModels().then(() => setModelsReady(true));
  }, []);

  async function startCapture() {
    if (!username.trim()) {
      setMessage('Please enter a username');
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (existingUser) {
        setMessage('Username already exists. Choose a different name.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsCapturing(true);
      setSamplesCollected(0);
      descriptorsRef.current = [];
      setMessage('Position your face in the camera...');
    } catch (error) {
      setMessage('Camera access denied: ' + error.message);
    }
  }

  async function captureSample() {
    if (!videoRef.current || samplesCollected >= MAX_SAMPLES) return;

    try {
      const detection = await detectFace(videoRef.current);

      if (detection) {
        descriptorsRef.current.push(Array.from(detection.descriptor));
        const newCount = samplesCollected + 1;
        setSamplesCollected(newCount);
        setMessage(`Sample ${newCount}/${MAX_SAMPLES} captured!`);

        if (newCount >= MAX_SAMPLES) {
          await saveToDatabase();
        }
      } else {
        setMessage('No face detected. Please try again.');
      }
    } catch (error) {
      setMessage('Error detecting face: ' + error.message);
    }
  }

  async function saveToDatabase() {
    try {
      const { error } = await supabase.from('users').insert({
        username: username.trim(),
        face_descriptors: descriptorsRef.current,
      });

      if (error) throw error;

      setMessage(`Success! ${username} registered with ${MAX_SAMPLES} face samples.`);
      stopCapture();
      setUsername('');
    } catch (error) {
      setMessage('Error saving to database: ' + error.message);
    }
  }

  function stopCapture() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Register New User</h2>

      {!isCapturing ? (
        <div style={styles.form}>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={styles.input}
            disabled={!modelsReady}
          />
          <button
            onClick={startCapture}
            style={styles.button}
            disabled={!modelsReady || !username.trim()}
          >
            {modelsReady ? 'Start Registration' : 'Loading models...'}
          </button>
        </div>
      ) : (
        <div style={styles.captureArea}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={styles.video}
            onLoadedMetadata={() => setMessage('Camera ready. Click Capture Sample.')}
          />
          <div style={styles.controls}>
            <div style={styles.progress}>
              Samples: {samplesCollected}/{MAX_SAMPLES}
            </div>
            <button onClick={captureSample} style={styles.button} disabled={samplesCollected >= MAX_SAMPLES}>
              Capture Sample
            </button>
            <button onClick={stopCapture} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#1a1a1a',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#00b8d4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#ff5252',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  captureArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  video: {
    width: '100%',
    maxWidth: '640px',
    borderRadius: '12px',
    border: '3px solid #00b8d4',
  },
  controls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  progress: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#00b8d4',
    flex: 1,
  },
  message: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
  },
};
