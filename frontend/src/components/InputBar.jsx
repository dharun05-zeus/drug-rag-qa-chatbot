import React from 'react';
import { Send, Trash2 } from 'lucide-react';

/**
 * InputBar Component
 * Renders the text entry form for user queries.
 * Features submit hooks, disabled states, and clean buttons.
 */
function InputBar({ value, onChange, onSubmit, isLoading, isConnected, onClear }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <footer className="chat-footer">
      <form onSubmit={onSubmit} className="input-form">
        <button 
          type="button" 
          className="sidebar-clear-btn" 
          onClick={onClear} 
          title="Clear Chat Logs"
          disabled={isLoading}
        >
          <Trash2 size={18} />
        </button>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isConnected 
              ? "Ask a question about drug dosages, side effects, or administration..." 
              : "Please connect the backend server to continue..."
          }
          disabled={isLoading || !isConnected}
          className="chat-input"
        />
        
        <button 
          type="submit" 
          disabled={!value.trim() || isLoading || !isConnected}
          className="send-btn"
          title="Send Message"
        >
          <Send size={16} />
        </button>
      </form>
      <div className="medical-disclaimer-footer">
        Disclaimer: This AI engine compiles data from prescribing documentation. Consult a healthcare professional for clinical advice.
      </div>
    </footer>
  );
}

export default InputBar;
