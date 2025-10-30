import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { loadModels, detectFace, findBestMatch } from '../utils/faceDetection';

export default function DoorLock() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('locked');
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [modelsReady, setModelsReady] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const labeledDescriptorsRef = useRef([]);

  const UNLOCK_DURATION = 10;
  const CONFIDENCE_THRESHOLD = 85;

  useEffect(() => {
    loadModels().then(() => setModelsReady(true));
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, face_descriptors');

      if (error) throw error;

      labeledDescriptorsRef.current = data.map(user => ({
        label: user.username,
        userId: user.id,
        descriptors: user.face_descriptors,
      }));

      setUsersLoaded(true);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function startRecognition() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsActive(true);
      setStatus('scanning');

      intervalRef.current = setInterval(recognizeFace, 1000);
    } catch (error) {
      console.error('Camera access denied:', error);
      setStatus('error');
    }
  }

  async function recognizeFace() {
    if (!videoRef.current) return;

    try {
      const detection = await detectFace(videoRef.current);

      if (detection) {
        const match = findBestMatch(
          detection.descriptor,
          labeledDescriptorsRef.current,
          0.6
        );

        if (match && match.confidence >= CONFIDENCE_THRESHOLD) {
          await unlockDoor(match.label, match.confidence);
        } else {
          setStatus('locked');
          setRecognizedUser(null);
          setConfidence(match ? match.confidence : 0);

          if (match && match.confidence < CONFIDENCE_THRESHOLD) {
            await logAccess(null, 'denied', match.confidence);
          }
        }
      } else {
        setStatus('locked');
        setRecognizedUser(null);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Recognition error:', error);
    }
  }

  async function unlockDoor(username, conf) {
    if (status === 'unlocked') return;

    clearInterval(intervalRef.current);
    setStatus('unlocked');
    setRecognizedUser(username);
    setConfidence(conf);
    setCountdown(UNLOCK_DURATION);

    const user = labeledDescriptorsRef.current.find(u => u.label === username);
    await logAccess(user?.userId, 'granted', conf, UNLOCK_DURATION);

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Welcome ${username}. Door unlocked. It will lock in ${UNLOCK_DURATION} seconds.`
      );
      speechSynthesis.speak(utterance);
    }

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          lockDoor();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function lockDoor() {
    clearInterval(countdownRef.current);
    setStatus('scanning');
    setRecognizedUser(null);
    setConfidence(0);
    setCountdown(0);

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Door locked for your safety.');
      speechSynthesis.speak(utterance);
    }

    intervalRef.current = setInterval(recognizeFace, 1000);
  }

  async function logAccess(userId, accessType, conf, duration = null) {
    try {
      await supabase.from('access_logs').insert({
        user_id: userId,
        username: userId ? labeledDescriptorsRef.current.find(u => u.userId === userId)?.label : null,
        access_type: accessType,
        confidence: conf,
        unlocked_duration: duration,
      });
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }

  function stopRecognition() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    setIsActive(false);
    setStatus('locked');
    setRecognizedUser(null);
    setConfidence(0);
    setCountdown(0);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Door Lock System</h2>

      {!isActive ? (
        <div style={styles.startScreen}>
          <div style={styles.lockIcon}>🔒</div>
          <button
            onClick={startRecognition}
            style={styles.startButton}
            disabled={!modelsReady || !usersLoaded}
          >
            {!modelsReady ? 'Loading models...' : !usersLoaded ? 'Loading users...' : 'Activate System'}
          </button>
        </div>
      ) : (
        <div style={styles.activeArea}>
          <div style={styles.videoContainer}>
            <video ref={videoRef} autoPlay playsInline style={styles.video} />
            <div style={{...styles.statusPanel, ...styles[`status_${status}`]}}>
              <div style={styles.statusIcon}>
                {status === 'locked' && '🔒'}
                {status === 'scanning' && '🔍'}
                {status === 'unlocked' && '🔓'}
              </div>
              <div style={styles.statusText}>
                {status === 'locked' && 'Locked'}
                {status === 'scanning' && 'Scanning...'}
                {status === 'unlocked' && `Unlocked: ${recognizedUser}`}
              </div>
              {confidence > 0 && (
                <div style={styles.confidence}>
                  Confidence: {confidence}%
                </div>
              )}
              {status === 'unlocked' && countdown > 0 && (
                <div style={styles.countdown}>
                  <div style={styles.countdownText}>Locks in {countdown}s</div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${(countdown / UNLOCK_DURATION) * 100}%`,
                        backgroundColor: countdown > 3 ? '#00b8d4' : '#ff5252',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={stopRecognition} style={styles.stopButton}>
            Stop System
          </button>
        </div>
      )}
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
  startScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    padding: '48px',
  },
  lockIcon: {
    fontSize: '80px',
  },
  startButton: {
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '600',
    backgroundColor: '#00b8d4',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  activeArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  videoContainer: {
    position: 'relative',
  },
  video: {
    width: '100%',
    maxWidth: '640px',
    borderRadius: '12px',
    border: '3px solid #333',
  },
  statusPanel: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: '16px 24px',
    borderRadius: '12px',
    minWidth: '280px',
    backdropFilter: 'blur(10px)',
  },
  status_locked: {
    borderLeft: '4px solid #ff5252',
  },
  status_scanning: {
    borderLeft: '4px solid #ffa726',
  },
  status_unlocked: {
    borderLeft: '4px solid #00b8d4',
  },
  statusIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  statusText: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '4px',
  },
  confidence: {
    fontSize: '14px',
    color: '#e0e0e0',
    marginTop: '8px',
  },
  countdown: {
    marginTop: '12px',
  },
  countdownText: {
    fontSize: '14px',
    color: '#e0e0e0',
    marginBottom: '8px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 1s linear, background-color 0.3s',
    borderRadius: '4px',
  },
  stopButton: {
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
};
