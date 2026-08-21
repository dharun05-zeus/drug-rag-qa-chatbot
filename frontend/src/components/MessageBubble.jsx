import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  BarChart2, 
  Copy, 
  RotateCw, 
  ThumbsUp, 
  ThumbsDown 
} from 'lucide-react';

/**
 * MessageBubble Component
 * Renders individual user and bot messages.
 * Implements markdown rendering, warning bubbles for refusals,
 * interactive citation badges, and a hidden RAG debug scores panel.
 */
function MessageBubble({ msg, activeModel }) {
  const isUser = msg.sender === 'user';
  const isRefusal = msg.text && msg.text.startsWith("I don't have this information in the provided documents.");
  
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Simple parser for **bold** text and lists.
   * Strips out raw markdown symbols and inserts HTML tags.
   */
  const renderMessageContent = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let processed = line;
      // Bold Markdown **text** -> <strong>text</strong>
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Inline source citations format -> style spans
      processed = processed.replace(
        /\(Source:\s*([a-zA-Z0-9_\-\.]+)\s*,\s*[Pp]age\s*(\d+)\)/g, 
        '<span class="inline-citation">$1 (Pg. $2)</span>'
      );

      // Header Check
      if (processed.trim().startsWith('### ')) {
        const headerText = processed.replace(/^###\s+/, '');
        return <h3 key={idx} dangerouslySetInnerHTML={{ __html: headerText }} style={{ margin: '12px 0 6px 0', color: '#f2be18' }} />;
      }
      if (processed.trim().startsWith('## ')) {
        const headerText = processed.replace(/^##\s+/, '');
        return <h2 key={idx} dangerouslySetInnerHTML={{ __html: headerText }} style={{ margin: '14px 0 8px 0', color: '#f2be18' }} />;
      }
      if (processed.trim().startsWith('# ')) {
        const headerText = processed.replace(/^#\s+/, '');
        return <h1 key={idx} dangerouslySetInnerHTML={{ __html: headerText }} style={{ margin: '16px 0 10px 0', color: '#f2be18' }} />;
      }

      // Bullet Point Check
      if (processed.trim().startsWith('- ') || processed.trim().startsWith('* ')) {
        const item = processed.replace(/^[\-\*]\s+/, '');
        return <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />;
      }

      return <p key={idx} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  const toggleTooltip = (cIdx) => {
    setActiveTooltip(activeTooltip === cIdx ? null : cIdx);
  };

  return (
    <div className={`message-row ${isUser ? 'row-user' : 'row-bot'}`}>
      <div 
        className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-bot'} 
          ${isRefusal ? 'bubble-refusal' : ''} ${msg.isError ? 'bubble-error' : ''}`}
      >
        {/* Badges and copy button row at top for Bot */}
        {!isUser && (
          <div className="bot-message-header">
            <div className="bot-badges">
              <span className="badge-pill rag-pill">RAG</span>
              <span className="badge-pill model-pill">{activeModel || 'gpt-oss-20b'}</span>
              {msg.citations && msg.citations.length > 0 && (
                <span className="badge-pill cited-pill">Cited</span>
              )}
            </div>
            <button 
              className="copy-btn-top" 
              onClick={() => handleCopyText(msg.text)}
              title={copied ? "Copied!" : "Copy answer"}
            >
              <Copy size={13} />
            </button>
          </div>
        )}

        {/* Warning Icon for Refusals */}
        {isRefusal && (
          <div className="refusal-warning-header">
            <AlertTriangle size={14} className="warning-icon" />
            <span>Safety Guardrail Triggered</span>
          </div>
        )}

        {/* Message Prose */}
        <div className="bubble-text">{renderMessageContent(msg.text)}</div>

        {/* Bottom feedback row for Bot */}
        {!isUser && (
          <div className="bot-message-footer">
            <div className="footer-actions">
              <button className="footer-action-btn" title="Regenerate">
                <RotateCw size={13} />
              </button>
              <button className="footer-action-btn" title="Good response">
                <ThumbsUp size={13} />
              </button>
              <button className="footer-action-btn" title="Bad response">
                <ThumbsDown size={13} />
              </button>
              <button className="footer-action-btn" onClick={() => handleCopyText(msg.text)} title="Copy message">
                <Copy size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Citations Panel */}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="citations-panel">
            <span className="citations-title">Sources Cited:</span>
            <div className="citations-badge-container">
              {msg.citations.map((cite, cIdx) => (
                <div key={cIdx} className="citation-badge-wrapper">
                  <button 
                    className="citation-pill-btn" 
                    onClick={() => toggleTooltip(cIdx)}
                    title="Click to view reference details"
                  >
                    <FileText size={11} />
                    <span>{cite.document} · Page {cite.page}</span>
                  </button>
                  
                  {activeTooltip === cIdx && (
                    <div className="citation-tooltip">
                      <p><strong>Referenced Section</strong></p>
                      <p>Source document verification page: {cite.page}</p>
                      <p className="tooltip-sub">Facts checked against metadata index.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RAG Debug Transparency Table */}
        {!isUser && msg.debug_scores && msg.debug_scores.length > 0 && (
          <div className="debug-section">
            <button 
              className="debug-toggle-btn" 
              onClick={() => setShowDebug(!showDebug)}
            >
              <BarChart2 size={12} />
              <span>{showDebug ? 'Hide' : 'Show'} Retrieval Details</span>
              {showDebug ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showDebug && (
              <div className="debug-table-wrapper">
                <table className="debug-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Page</th>
                      <th>Distance Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msg.debug_scores.map((score, sIdx) => {
                      const isMatched = score.distance <= 1.25;
                      return (
                        <tr key={sIdx} className={isMatched ? 'row-matched' : 'row-discarded'}>
                          <td>{score.document}</td>
                          <td>Page {score.page}</td>
                          <td>
                            <code>{score.distance.toFixed(4)}</code>
                            <span className={`debug-badge ${isMatched ? 'badge-pass' : 'badge-fail'}`}>
                              {isMatched ? 'pass' : 'fail'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="debug-table-tip">
                  * Distance score &lt;= 1.25 are considered semantically relevant and merged into LLM context.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
