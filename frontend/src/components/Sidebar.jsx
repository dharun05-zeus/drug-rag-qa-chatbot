import React from 'react';
import { Database, ShieldAlert, FileText, X } from 'lucide-react';

/**
 * Sidebar Component
 * Left panel showing project info, guardrails, and loaded documents.
 * Can be collapsed or closed via standard state callbacks.
 */
function Sidebar({ isOpen, onClose, documents = [] }) {
  return (
    <aside className={`chat-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header-area">
        <div className="sidebar-logo">
          <Database className="logo-icon" size={20} />
          <h2>RAG Knowledge</h2>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} title="Close Sidebar">
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-scrollable">
        {/* System Summary */}
        <section className="sidebar-card">
          <h3>System Architecture</h3>
          <p>
            This prototype leverages a zero-hallucination RAG (Retrieval-Augmented Generation) pipeline. Questions are answered strictly using retrieved text segments.
          </p>
        </section>

        {/* Knowledge Base Files */}
        <section className="sidebar-card">
          <h3>Active Knowledge Base</h3>
          <div className="doc-list">
            {documents.length === 0 ? (
              <div className="no-docs-message">
                No active documents found. Place PDFs in backend/data/ and run ingest.py
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div key={idx} className="doc-item">
                  <FileText size={14} className="doc-icon" />
                  <div className="doc-info">
                    <span className="doc-name">{doc.name}</span>
                    <span className="doc-meta">{doc.pages} pages indexed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Safety Guardrails */}
        <section className="sidebar-card">
          <h3>Guardrails Enabled</h3>
          <ul className="guardrails-list">
            <li>
              <ShieldAlert size={14} className="g-icon" />
              <span><strong>Page-Level Citations:</strong> Only exact pages parsed from context are cited.</span>
            </li>
            <li>
              <ShieldAlert size={14} className="g-icon" />
              <span><strong>Distance Threshold:</strong> Non-relevant questions (L2 &gt; 1.25) are blocked before invoking LLMs.</span>
            </li>
            <li>
              <ShieldAlert size={14} className="g-icon" />
              <span><strong>Medical Refusal:</strong> Clinically unsupported advice triggers fallback warnings.</span>
            </li>
          </ul>
        </section>
      </div>

      <div className="sidebar-footer">
        <p>Cognizant Hackathon Prototype</p>
        <span className="version">v1.1.0 (Qwen-27B)</span>
      </div>
    </aside>
  );
}

export default Sidebar;
