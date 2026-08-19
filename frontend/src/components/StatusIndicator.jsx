import React from 'react';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';

/**
 * StatusIndicator Component
 * Renders connection status to the local FastAPI server.
 * Allows retry clicking if offline.
 */
function StatusIndicator({ status, onRetry }) {
  if (status === 'checking') {
    return (
      <span className="status-badge checking">
        <Activity size={12} className="spin-icon" />
        Checking server...
      </span>
    );
  }

  if (status === 'connected') {
    return (
      <span className="status-badge online" title="Backend FastAPI is connected">
        <CheckCircle2 size={13} />
        Server Online
      </span>
    );
  }

  return (
    <button className="status-badge offline" onClick={onRetry} title="Click to retry connection">
      <XCircle size={13} />
      Server Offline (Retry)
    </button>
  );
}

export default StatusIndicator;
