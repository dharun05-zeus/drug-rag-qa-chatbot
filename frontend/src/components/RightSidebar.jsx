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
                padding: '2px 8px',
                marginBottom: '4px',
                borderRadius: '6px',
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
                  color: isActive ? '#1a1a1a' : '#eaeaea',
                  padding: '8px 4px',
                  fontWeight: isActive ? '600' : 'normal',
                  fontSize: '14px',
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
                  color: isActive ? '#1a1a1a' : '#888',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = isActive ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = isActive ? '#1a1a1a' : '#888';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Trash2 size={14} />
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
