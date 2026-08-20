import React from 'react';
import { SendHorizontal, Paperclip, Mic } from 'lucide-react';

/**
 * InputBar Component
 * Renders the text entry form for user queries with attachment, mic, dark input field,
 * and yellow send button. Also includes the clinical disclaimer.
 */
function InputBar({ value, onChange, onSubmit, isLoading, isConnected }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <footer className="chat-footer-bar">
      <form onSubmit={onSubmit} className="input-form-bar">
        {/* Attachment & Mic Buttons */}
        <button 
          type="button" 
          className="input-utility-btn" 
          title="Attach file"
          disabled={isLoading || !isConnected}
        >
          <Paperclip size={18} />
        </button>

        <button 
          type="button" 
          className="input-utility-btn" 
          title="Voice input"
          disabled={isLoading || !isConnected}
        >
          <Mic size={18} />
        </button>
        
        {/* Dark Input Capsule */}
        <div className="input-field-wrapper">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected 
                ? "Start typing..." 
                : "Please connect the backend server to continue..."
            }
            disabled={isLoading || !isConnected}
            className="chat-input-field-dark"
          />
        </div>
        
        {/* Yellow Circular Send Button */}
        <button 
          type="submit" 
          disabled={!value.trim() || isLoading || !isConnected}
          className="send-btn-circle-yellow"
          title="Send Message"
        >
          <SendHorizontal size={16} />
        </button>
      </form>

      {/* Footer Disclaimer */}
      <div className="medai-disclaimer-footer">
        medai compiles prescribing documentation for education only. Consult a clinician for medical advice.
      </div>
    </footer>
  );
}

export default InputBar;
