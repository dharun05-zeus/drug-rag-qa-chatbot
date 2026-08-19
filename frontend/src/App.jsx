import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import './App.css';

const BACKEND_URL = "http://localhost:8000";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your clinical prescribing information assistant. Ask me questions about indexed drugs, and I will search the documents and reply with page-level citations.",
      citations: []
    }
  ]);
  const [input, setInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [documents, setDocuments] = useState([]);

  // Ping backend to check health status
  const checkBackendHealth = () => {
    setBackendStatus("checking");
    fetch(`${BACKEND_URL}/health`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Offline");
      })
      .then(data => {
        if (data.status === "healthy") {
          setBackendStatus("connected");
          // Fetch dynamic list of indexed files
          fetch(`${BACKEND_URL}/documents`)
            .then(res => res.ok ? res.json() : [])
            .then(docs => setDocuments(docs))
            .catch(() => {});
        } else {
          setBackendStatus("error");
        }
      })
      .catch(() => {
        setBackendStatus("disconnected");
      });
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || backendStatus !== "connected") return;

    const userQuery = input.trim();
    setInput("");

    // Add user message to state
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userQuery,
          conversation_history: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: code ${response.status}`);
      }

      const data = await response.json();

      // Add bot response to state
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.answer,
        citations: data.citations,
        debug_scores: data.debug_scores
      }]);

      // Sync conversation history from backend
      setConversationHistory(data.conversation_history);
    } catch (error) {
      console.error("Chat connection error:", error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "Error: Could not connect to the backend server. Verify that FastAPI is running on port 8000 and your Groq API key is correctly configured.",
        citations: [],
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: "Conversation cleared. Ask me a new question!",
        citations: []
      }
    ]);
    setConversationHistory([]);
  };

  // Helper when clicking suggestions
  const handleSuggestionSelect = (query) => {
    setInput(query);
  };

  return (
    <div className="app-workspace">
      {/* Collapsible Left Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        documents={documents}
      />
      
      {/* Main Chat Workspace */}
      <div className="main-chat-container">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          backendStatus={backendStatus}
          onRetryConnection={checkBackendHealth}
        />
        
        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          onSelectQuery={handleSuggestionSelect}
        />
        
        <InputBar 
          value={input} 
          onChange={setInput} 
          onSubmit={handleSend} 
          isLoading={isLoading}
          isConnected={backendStatus === "connected"}
          onClear={handleClearChat}
        />
      </div>
    </div>
  );
}

export default App;
