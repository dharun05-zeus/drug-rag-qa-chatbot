import React from 'react';
import { Menu } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

/**
 * Header Component
 * Renders the top navbar of the chat workspace.
 * Includes title, description, and the backend server health indicator.
 */
function Header({ onToggleSidebar, backendStatus, onRetryConnection }) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle Sidebar">
          <Menu size={20} />
        </button>
        <div className="header-title-area">
          <h1>💊 Clinical Q&A RAG Engine</h1>
          <p>FDA Prescribing Documentation Assistant</p>
        </div>
      </div>
      <div className="header-right">
        <StatusIndicator status={backendStatus} onRetry={onRetryConnection} />
      </div>
    </header>
  );
}

export default Header;
