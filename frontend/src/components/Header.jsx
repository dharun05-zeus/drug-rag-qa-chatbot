import React from 'react';
import { Search, Info, Menu, CheckCircle } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

/**
 * Header Component
 * Renders the top navbar of the chat workspace.
 * Includes AI Chat Helper title, search pill, info icon, and Server Online status badge.
 */
function Header({ onToggleSidebar, backendStatus, onRetryConnection, searchQuery, onSearchChange }) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button className="sidebar-toggle-btn-header" onClick={onToggleSidebar} title="Toggle Sidebar">
          <Menu size={18} />
        </button>
        <h2 className="header-title">AI Chat Helper</h2>
      </div>

      <div className="header-center">
        <div className="search-bar-container">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input-field"
          />
        </div>
        <button className="info-icon-btn" title="Information">
          <Info size={18} />
        </button>
      </div>

      <div className="header-right">
        <StatusIndicator status={backendStatus} onRetry={onRetryConnection} />
      </div>
    </header>
  );
}

export default Header;
