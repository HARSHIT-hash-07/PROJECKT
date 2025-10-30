import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AccessHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getAccessTypeStyle(type) {
    switch (type) {
      case 'granted':
        return { backgroundColor: '#e8f5e9', color: '#2e7d32', icon: '✓' };
      case 'denied':
        return { backgroundColor: '#ffebee', color: '#c62828', icon: '✗' };
      case 'unknown':
        return { backgroundColor: '#fff3e0', color: '#ef6c00', icon: '?' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666', icon: '·' };
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Access History</h2>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Access History</h2>
      <button onClick={loadLogs} style={styles.refreshButton}>
        Refresh
      </button>

      {logs.length === 0 ? (
        <div style={styles.empty}>No access logs yet</div>
      ) : (
        <div style={styles.logList}>
          {logs.map(log => {
            const typeStyle = getAccessTypeStyle(log.access_type);
            return (
              <div key={log.id} style={styles.logItem}>
                <div
                  style={{
                    ...styles.accessBadge,
                    backgroundColor: typeStyle.backgroundColor,
                    color: typeStyle.color,
                  }}
                >
                  <span style={styles.badgeIcon}>{typeStyle.icon}</span>
                  <span style={styles.badgeText}>{log.access_type.toUpperCase()}</span>
                </div>
                <div style={styles.logDetails}>
                  <div style={styles.logUser}>
                    {log.username || 'Unknown User'}
                  </div>
                  <div style={styles.logMeta}>
                    <span>{formatDate(log.timestamp)}</span>
                    {log.confidence && (
                      <span style={styles.logConfidence}>
                        {log.confidence.toFixed(0)}% confidence
                      </span>
                    )}
                    {log.unlocked_duration && (
                      <span style={styles.logDuration}>
                        Unlocked for {log.unlocked_duration}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
    marginBottom: '16px',
    color: '#1a1a1a',
  },
  refreshButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#00b8d4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#666',
    fontSize: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: '#999',
    fontSize: '16px',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logItem: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    transition: 'box-shadow 0.3s',
  },
  accessBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    borderRadius: '8px',
    minWidth: '80px',
    fontWeight: '700',
  },
  badgeIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  badgeText: {
    fontSize: '11px',
    letterSpacing: '0.5px',
  },
  logDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '8px',
  },
  logUser: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  logMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '14px',
    color: '#666',
  },
  logConfidence: {
    color: '#00b8d4',
    fontWeight: '500',
  },
  logDuration: {
    color: '#4caf50',
    fontWeight: '500',
  },
};
