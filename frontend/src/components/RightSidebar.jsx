import React from 'react';
import { Trash2 } from 'lucide-react';

/**
 * RightSidebar Component
 * Displays past chat logs/history and a clear history action.
 */
function RightSidebar({ chats = [], selectedChatId, onSelectChat, onDeleteChat, onClearHistory }) {
  return (
    <aside className="chat-logs-sidebar">
      <div className="logs-header">
        <h3>Chat logs</h3>
        <span className="logs-counter">{chats.length}/50</span>
      </div>

      <div className="logs-list-scrollable" style={{ padding: '8px' }}>
        {chats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          return (
            <div
              key={chat.id}
              className={`log-item-wrapper ${isActive ? 'active-log-wrapper' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 14px',
                marginBottom: '4px',
                borderRadius: '20px',
                backgroundColor: isActive ? '#f2be18' : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <button
                className="log-item-title-btn"
                onClick={() => onSelectChat(chat.id)}
                title={chat.title}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#1e293b' : '#475569',
                  padding: '10px 0',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {chat.title}
              </button>
              
              <button
                className="log-item-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                title="Delete Chat"
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#1e293b' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = isActive ? '#1e293b' : '#94a3b8';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {chats.length === 0 && (
          <div className="no-logs">No past chats</div>
        )}
      </div>

      <div className="logs-footer">
        <button className="clear-history-btn" onClick={onClearHistory}>
          <Trash2 size={16} className="trash-icon" />
          <span>Clear History</span>
        </button>
      </div>
    </aside>
  );
}

export default RightSidebar;
