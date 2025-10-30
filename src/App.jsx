import { useState } from 'react';
import RegisterFace from './components/RegisterFace';
import DoorLock from './components/DoorLock';
import AccessHistory from './components/AccessHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState('lock');

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.logo}>🔐 Face Recognition Door Lock</h1>
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveTab('lock')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'lock' ? styles.navButtonActive : {}),
            }}
          >
            Door Lock
          </button>
          <button
            onClick={() => setActiveTab('register')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'register' ? styles.navButtonActive : {}),
            }}
          >
            Register User
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'history' ? styles.navButtonActive : {}),
            }}
          >
            Access History
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === 'lock' && <DoorLock />}
        {activeTab === 'register' && <RegisterFace />}
        {activeTab === 'history' && <AccessHistory />}
      </main>

      <footer style={styles.footer}>
        <p>Face Recognition System - Secure Access Control</p>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e0e0e0',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    textAlign: 'center',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navButton: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: '#666',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  navButtonActive: {
    backgroundColor: '#00b8d4',
    color: 'white',
    borderColor: '#00b8d4',
  },
  main: {
    flex: 1,
    padding: '24px',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTop: '2px solid #e0e0e0',
    padding: '16px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
};
