import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import RightSidebar from './components/RightSidebar';
import './App.css';

const BACKEND_URL = "http://localhost:8000";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModel, setActiveModel] = useState("gpt-oss-20b");
  const [audienceMode, setAudienceMode] = useState("doctor");
  const [chats, setChats] = useState([
    {
      id: 'chat-1',
      title: 'New Chat...',
      messages: [
        {
          sender: 'bot',
          text: "Hello! I am medai, your clinical prescribing assistant. Ask about indexed drugs and I will reply with page-level citations.",
          citations: []
        }
      ],
      conversationHistory: []
    }
  ]);
  const [selectedChatId, setSelectedChatId] = useState('chat-1');
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current chat messages & history
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];
  const messages = activeChat ? activeChat.messages : [];

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
          if (data.model) {
            // e.g. openai/gpt-oss-20b -> gpt-oss-20b
            const modelName = data.model.includes('/') ? data.model.split('/')[1] : data.model;
            setActiveModel(modelName);
          }
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

    // Create new chat log if none exist
    let currentChatId = selectedChatId;
    let updatedChats = [...chats];
    let chatToUpdate = updatedChats.find(c => c.id === currentChatId);

    if (!chatToUpdate) {
      currentChatId = 'chat-' + Date.now();
      chatToUpdate = {
        id: currentChatId,
        title: userQuery.substring(0, 30) + (userQuery.length > 30 ? '...' : ''),
        messages: [
          {
            sender: 'bot',
            text: "Hello! I am medai, your clinical prescribing assistant. Ask about indexed drugs and I will reply with page-level citations.",
            citations: []
          }
        ],
        conversationHistory: []
      };
      updatedChats.push(chatToUpdate);
      setSelectedChatId(currentChatId);
    } else if (chatToUpdate.title === "New Chat..." || (chatToUpdate.messages.length === 1 && chatToUpdate.messages[0].sender === 'bot')) {
      // Update title if it's the first real question in a new chat
      chatToUpdate.title = userQuery.substring(0, 30) + (userQuery.length > 30 ? '...' : '');
    }

    // Add user message
    chatToUpdate.messages = [...chatToUpdate.messages, { sender: 'user', text: userQuery }];
    setChats(updatedChats);
    setIsLoading(true);

    try {
      let queryToSend = userQuery;
      if (audienceMode === 'patient') {
        queryToSend = userQuery + "\n\n(IMPORTANT: Please answer in simple, layman terms suitable for a patient or caretaker. Avoid complex pharmacological jargon, use accessible vocabulary, explain dosage or precautions in everyday terms, but strictly maintain facts and citations from the context.)";
      }

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: queryToSend,
          conversation_history: chatToUpdate.conversationHistory.map(h => ({
            role: h.role,
            content: h.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: code ${response.status}`);
      }

      const data = await response.json();

      // Update chat with bot response
      const botMsg = {
        sender: 'bot',
        text: data.answer,
        citations: data.citations,
        debug_scores: data.debug_scores
      };

      setChats(prevChats => prevChats.map(c => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: [...c.messages, botMsg],
            conversationHistory: data.conversation_history
          };
        }
        return c;
      }));
    } catch (error) {
      console.error("Chat connection error:", error);
      const errorMsg = {
        sender: 'bot',
        text: "Error: Could not connect to the backend server. Verify that FastAPI is running on port 8000 and your API key is correctly configured.",
        citations: [],
        isError: true
      };

      setChats(prevChats => prevChats.map(c => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: [...c.messages, errorMsg]
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setChats(prevChats => prevChats.map(c => {
      if (c.id === selectedChatId) {
        return {
          ...c,
          title: "New Chat...",
          messages: [
            {
              sender: 'bot',
              text: "Conversation cleared. Ask me a new question!",
              citations: []
            }
          ],
          conversationHistory: []
        };
      }
      return c;
    }));
  };

  const handleClearAllHistory = () => {
    const newChatId = 'chat-' + Date.now();
    setChats([
      {
        id: newChatId,
        title: "New Chat...",
        messages: [
          {
            sender: 'bot',
            text: "Hello! I am medai, your clinical prescribing assistant. Ask about indexed drugs and I will reply with page-level citations.",
            citations: []
          }
        ],
        conversationHistory: []
      }
    ]);
    setSelectedChatId(newChatId);
  };

  const handleNewChat = () => {
    const newChatId = 'chat-' + Date.now();
    setChats(prev => [
      ...prev,
      {
        id: newChatId,
        title: "New Chat...",
        messages: [
          {
            sender: 'bot',
            text: "Hello! I am medai, your clinical prescribing assistant. Ask about indexed drugs and I will reply with page-level citations.",
            citations: []
          }
        ],
        conversationHistory: []
      }
    ]);
    setSelectedChatId(newChatId);
  };

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
        activeModel={activeModel}
        onNewChat={handleNewChat}
      />
      
      {/* Main Chat Workspace */}
      <div className="main-chat-container">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          backendStatus={backendStatus}
          onRetryConnection={checkBackendHealth}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          audienceMode={audienceMode}
          onAudienceModeChange={setAudienceMode}
        />
        
        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          onSelectQuery={handleSuggestionSelect}
          activeModel={activeModel}
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

      {/* Right Sidebar for Chat logs */}
      <RightSidebar 
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onClearHistory={handleClearAllHistory}
      />
    </div>
  );
}

export default App;
