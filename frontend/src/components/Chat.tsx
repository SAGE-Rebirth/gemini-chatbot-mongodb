import React, { useState } from 'react';
import { fetchChatResponse } from '../api';

const Chat: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!query.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChatResponse(query);
      setMessages((prev) => [...prev, { role: 'bot', text: data.answer }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <div className="chat-container">
      <h2>Chatbot</h2>
      <div className="chat-messages" style={{ minHeight: 180 }}>
        {messages.length === 0 && !loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <img src="/NetligentLogo.png" alt="Netligent Logo" style={{ width: 120, opacity: 1 }} />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-msg ${msg.role}`}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? '#dbeafe' : '#f7fafc',
                  color: msg.role === 'user' ? '#0a2540' : '#222',
                  border: msg.role === 'user' ? '1px solid #b6d0f7' : '1px solid #dbe7f6',
                  marginLeft: msg.role === 'user' ? 'auto' : undefined,
                  marginRight: msg.role === 'bot' ? 'auto' : undefined,
                }}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="chat-msg bot">Loading...</div>}
          </>
        )}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !query.trim()}>
          Send
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Chat;
