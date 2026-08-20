import React from 'react';
import { Trash2 } from 'lucide-react';

/**
 * RightSidebar Component
 * Displays past chat logs/history and a clear history action.
 */
function RightSidebar({ chats = [], selectedChatId, onSelectChat, onClearHistory }) {
  return (
    <aside className="chat-logs-sidebar">
      <div className="logs-header">
        <h3>Chat logs</h3>
        <span className="logs-counter">{chats.length}/50</span>
      </div>

      <div className="logs-list-scrollable">
        {chats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          return (
            <button
              key={chat.id}
              className={`log-item ${isActive ? 'active-log' : ''}`}
              onClick={() => onSelectChat(chat.id)}
              title={chat.title}
            >
              {chat.title}
            </button>
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
