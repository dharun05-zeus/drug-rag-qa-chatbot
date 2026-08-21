import React from 'react';
import { 
  ShieldAlert, 
  MessageSquare, 
  LayoutGrid, 
  FileText, 
  BarChart2, 
  Settings, 
  Info, 
  LogOut, 
  Sidebar as SidebarIcon,
  Shield
} from 'lucide-react';

/**
 * Sidebar Component
 * Left panel showing the medai. logo, main menu with Pro badges,
 * Clinical Guardrails card, and Logout action.
 */
function Sidebar({ isOpen, onClose, documents = [], activeModel, onNewChat }) {
  return (
    <aside className={`chat-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <div className="sidebar-header-area">
        <div className="sidebar-logo">
          <Shield className="logo-icon-shield" size={22} fill="#f2be18" stroke="#f2be18" />
          <span className="logo-text">medai.</span>
        </div>
        <button className="sidebar-toggle-btn" onClick={onClose} title="Collapse Sidebar">
          <SidebarIcon size={18} />
        </button>
      </div>

      <div className="new-chat-btn-container" style={{ padding: '0 16px', marginBottom: '12px' }}>
        <button 
          onClick={onNewChat}
          className="new-chat-trigger-btn"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            backgroundColor: '#f2be18',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d9aa12'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f2be18'}
        >
          <MessageSquare size={16} />
          <span>+ New Chat</span>
        </button>
      </div>

      <div className="sidebar-menu-list">
        {/* Menu Items */}
        <button className="menu-item active" onClick={onNewChat}>
          <MessageSquare size={18} className="menu-icon" />
          <span>AI Chat Assistant</span>
        </button>

        <button className="menu-item">
          <LayoutGrid size={18} className="menu-icon" />
          <span>My Workspaces</span>
        </button>

        <button className="menu-item">
          <FileText size={18} className="menu-icon" />
          <span>Templates</span>
          <span className="pro-badge">Pro</span>
        </button>

        <button className="menu-item">
          <BarChart2 size={18} className="menu-icon" />
          <span>Statistics</span>
          <span className="pro-badge">Pro</span>
        </button>

        <button className="menu-item">
          <Settings size={18} className="menu-icon" />
          <span>Preferences</span>
        </button>

        <button className="menu-item">
          <Info size={18} className="menu-icon" />
          <span>What's New & Help</span>
        </button>
      </div>

      {/* Clinical Guardrails card */}
      <div className="clinical-guardrails-container">
        <div className="clinical-guardrails-card">
          <div className="guardrails-card-header">
            <ShieldAlert size={20} className="guardrails-shield-icon" />
            <h4>Clinical Guardrails</h4>
          </div>
          <p className="guardrails-card-desc">
            Answers are retrieved from indexed prescribing documents with page citations.
          </p>
          <div className="guardrails-card-footer">
            <span className="rag-on-text">RAG on</span>
            <span className="verified-pill">Verified</span>
          </div>
        </div>
      </div>

      {/* Logout option at the very bottom */}
      <div className="sidebar-footer-logout">
        <button className="logout-btn">
          <LogOut size={18} className="logout-icon" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
