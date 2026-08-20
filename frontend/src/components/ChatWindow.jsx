import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

/**
 * ChatWindow Component
 * Container for the active message list. 
 * Renders the welcome message, message bubble stream, 
 * and shows clickable suggested query cards when the chat is empty/new.
 */
function ChatWindow({ messages, isLoading, onSelectQuery, activeModel }) {
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

  // If there's only the default bot welcome message, show the suggestion cards right below it
  const showSuggestions = messages.length === 1 && messages[0].sender === 'bot' && !isLoading;

  return (
    <div className="chat-window">
      <div className="messages-scroll-area">
        {messages.map((msg, index) => (
          <MessageBubble key={index} msg={msg} activeModel={activeModel} />
        ))}

        {showSuggestions && (
          <div className="suggestions-in-chat">
            <h4 className="suggestions-title-chat">Suggested Queries:</h4>
            <div className="suggestions-grid-chat">
              {sampleQueries.map((query, idx) => (
                <button 
                  key={idx} 
                  className="suggestion-chip-chat"
                  onClick={() => onSelectQuery(query)}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

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
    </div>
  );
}

export default ChatWindow;
