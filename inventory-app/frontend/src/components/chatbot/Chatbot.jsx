import { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';

const BotIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/><path d="M8 15h.01"/><path d="M16 15h.01"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const INITIAL_MSG = { role: 'bot', content: "Hi! I'm your inventory assistant. Ask me about stock levels, values, or any inventory question." };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== 'bot' || m !== INITIAL_MSG).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));
      const res = await api.post('/chatbot/chat', { message: text, history });
      setMessages(m => [...m, { role: 'bot', content: res.data.data.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'bot', content: 'Sorry, I could not connect. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* FAB button */}
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)} title="Inventory Assistant">
        {open ? <CloseIcon /> : <BotIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <BotIcon />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Inventory Assistant</div>
              <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>Powered by Claude AI</div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)} style={{ marginLeft: 'auto' }}><CloseIcon /></button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className="animate-pulse">●</span>
                <span className="animate-pulse" style={{ animationDelay: '.15s' }}>●</span>
                <span className="animate-pulse" style={{ animationDelay: '.3s' }}>●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              className="form-input"
              style={{ flex: 1, fontSize: '.84rem', padding: '8px 12px' }}
              placeholder="Ask about your inventory..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="btn btn-primary btn-icon" onClick={send} disabled={loading || !input.trim()}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
