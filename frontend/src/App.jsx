import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import RightSidebar from './components/RightSidebar';
import './App.css';

const BACKEND_URL = "http://localhost:8000";

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function App() {
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('medai_session_id');
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem('medai_session_id', id);
    }
    return id;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModel, setActiveModel] = useState("gpt-oss-20b");
  const [audienceMode, setAudienceMode] = useState("doctor");
  const [chats, setChats] = useState([
    {
      id: 'chat-1',
      sessionId: generateUUID(),
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

  // Citation Page Viewer Modal State
  const [pageView, setPageView] = useState(null);
  const [isPageViewLoading, setIsPageViewLoading] = useState(false);
  const [pageViewError, setPageViewError] = useState(null);
  const activeCitationRequestRef = React.useRef(null);

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
        sessionId: generateUUID(),
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

    const activeSessionId = chatToUpdate.sessionId || sessionId;

    // Add user message
    chatToUpdate.messages = [...chatToUpdate.messages, { sender: 'user', text: userQuery }];
    setChats(updatedChats);
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: userQuery,
          role: audienceMode,
          session_id: activeSessionId
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

  const handleUploadFile = async (file) => {
    setIsLoading(true);
    const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];
    const activeSessionId = activeChat ? activeChat.sessionId : sessionId;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', activeSessionId);
    
    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }
      
      const sysMsg = {
        sender: 'bot',
        text: `📎 Attachment processed successfully: **${data.filename}** (${data.chunks} chunks extracted). You can now ask questions about this document.`,
        citations: []
      };
      
      setChats(prevChats => prevChats.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: [...c.messages, sysMsg]
          };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
      const errMsg = {
        sender: 'bot',
        text: `❌ Failed to process attachment: ${err.message}`,
        citations: [],
        isError: true
      };
      setChats(prevChats => prevChats.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: [...c.messages, errMsg]
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
        sessionId: generateUUID(),
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
        sessionId: generateUUID(),
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

  const handleDeleteChat = async (chatId) => {
    const chatToDelete = chats.find(c => c.id === chatId);
    if (!chatToDelete) return;

    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);

    if (selectedChatId === chatId) {
      if (updatedChats.length > 0) {
        setSelectedChatId(updatedChats[updatedChats.length - 1].id);
      } else {
        const newChatId = 'chat-' + Date.now();
        setChats([
          {
            id: newChatId,
            sessionId: generateUUID(),
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
      }
    }

    try {
      await fetch(`${BACKEND_URL}/session/${chatToDelete.sessionId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Failed to delete chat session on backend:", err);
    }
  };

  const handleSuggestionSelect = (query) => {
    setInput(query);
  };

  const viewCitation = async (citation) => {
    // Abort previous citation request if still in flight
    if (activeCitationRequestRef.current) {
      activeCitationRequestRef.current.abort();
    }

    const abortController = new AbortController();
    activeCitationRequestRef.current = abortController;

    const docId = citation.doc_id || citation.docId || citation.document;
    const pageNum = citation.page;
    const chunkId = citation.chunk_id || citation.chunkId || '';

    setIsPageViewLoading(true);
    setPageViewError(null);
    setPageView({
      docId: docId,
      pageNum: pageNum,
      imageUrl: null,
      imageWidth: 0,
      imageHeight: 0,
      highlights: []
    });

    try {
      const url = `${BACKEND_URL}/page-image?doc_id=${encodeURIComponent(docId)}&page=${pageNum}&chunk_id=${encodeURIComponent(chunkId)}`;
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const dataUrl = `data:image/png;base64,${data.image_base64}`;

      setPageView({
        docId: docId,
        pageNum: pageNum,
        imageUrl: dataUrl,
        imageWidth: data.image_width,
        imageHeight: data.image_height,
        highlights: data.highlights || []
      });
      setIsPageViewLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') {
        // Superceded by a newer citation click
        return;
      }
      console.error("Failed to load page image:", err);
      setPageViewError("Couldn't load this page");
      setIsPageViewLoading(false);
    }
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
          onViewCitation={viewCitation}
        />
        
        <InputBar 
          value={input} 
          onChange={setInput} 
          onSubmit={handleSend} 
          isLoading={isLoading}
          isConnected={backendStatus === "connected"}
          onClear={handleClearChat}
          onUploadFile={handleUploadFile}
        />

      </div>

      {/* Right Sidebar for Chat logs */}
      <RightSidebar 
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onDeleteChat={handleDeleteChat}
        onClearHistory={handleClearAllHistory}
      />

      {/* Citation Page Highlight Modal */}
      {pageView && (
        <div className="citation-modal-backdrop" onClick={() => setPageView(null)}>
          <div className="citation-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="citation-modal-header">
              <div className="citation-modal-title-area">
                <span className="citation-doc-tag">{pageView.docId}</span>
                <span className="citation-page-heading">Page {pageView.pageNum}</span>
                {pageView.highlights && pageView.highlights.length > 0 && (
                  <span className="citation-highlights-badge">
                    {pageView.highlights.length} highlighted section{pageView.highlights.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button 
                className="citation-modal-close-btn" 
                onClick={() => setPageView(null)}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="citation-modal-content">
              {isPageViewLoading && (
                <div className="citation-modal-loader">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Loading referenced page with highlights...</p>
                </div>
              )}

              {pageViewError && (
                <div className="citation-modal-error">
                  <p className="error-lead">⚠️ {pageViewError}</p>
                  <p className="error-desc">Could not render page {pageView.pageNum}. Please verify document availability.</p>
                </div>
              )}

              {pageView.imageUrl && (
                <div className="citation-image-wrapper" style={{ position: 'relative' }}>
                  <img 
                    src={pageView.imageUrl} 
                    alt={`Page ${pageView.pageNum} of ${pageView.docId}`}
                    style={{ width: '100%', display: 'block' }}
                  />
                  {pageView.highlights && pageView.highlights.map((h, hIdx) => {
                    const left = `${(h.x / pageView.imageWidth) * 100}%`;
                    const top = `${(h.y / pageView.imageHeight) * 100}%`;
                    const width = `${(h.width / pageView.imageWidth) * 100}%`;
                    const height = `${(h.height / pageView.imageHeight) * 100}%`;
                    return (
                      <div
                        key={hIdx}
                        className="citation-highlight-rect"
                        style={{
                          position: 'absolute',
                          left,
                          top,
                          width,
                          height,
                          background: 'rgba(255, 235, 59, 0.25)',
                          border: '1px solid rgba(234, 179, 8, 0.45)',
                          borderRadius: '2px',
                          mixBlendMode: 'multiply',
                          pointerEvents: 'none'
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
