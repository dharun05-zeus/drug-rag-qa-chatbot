import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { HelpCircle, Sparkles } from 'lucide-react';

/**
 * ChatWindow Component
 * Container for the active message list. 
 * Renders empty state instructions and suggested questions.
 */
function ChatWindow({ messages, isLoading, onSelectQuery }) {
  const messagesEndRef = useRef(null);

  const sampleQueries = [
    "What is the recommended dosage of RINVOQ for rheumatoid arthritis?",
    "What are the common side effects of RINVOQ?",
    "Can I double my dose if I miss a day of RINVOQ?",
    "How do you bake a chocolate chip cookie?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const isEmpty = messages.length <= 1;

  return (
    <div className="chat-window">
      {isEmpty ? (
        <div className="welcome-container">
          <div className="welcome-logo">
            <Sparkles size={40} className="sparkle-icon" />
          </div>
          <h2>Clinical Q&A RAG Chatbot</h2>
          <p className="welcome-sub">
            Ask precise questions about the uploaded drug prescribing documents. 
            All answers are strictly verified against indexed documents.
          </p>

          <div className="suggestions-area">
            <h3>
              <HelpCircle size={16} />
              Suggested Queries to Test Ingestion & Guardrails:
            </h3>
            <div className="suggestions-grid">
              {sampleQueries.map((query, idx) => (
                <button 
                  key={idx} 
                  className="suggestion-chip"
                  onClick={() => onSelectQuery(query)}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="messages-scroll-area">
          {messages.map((msg, index) => (
            <MessageBubble key={index} msg={msg} />
          ))}

          {/* Typing/Loader Segment */}
          {isLoading && (
            <div className="message-row row-bot">
              <div className="message-bubble bubble-bot loader-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="loader-label">Retrieving context & calling Groq API...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
