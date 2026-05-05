import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useI18n } from '../../context/I18nContext';

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

const chatbotLabels = {
  en: {
    title: 'Inventory Assistant',
    powered: 'Powered by Llama (Free & Open Source)',
    placeholder: 'Ask about your inventory...',
    initialMsg: "Hi! I'm your inventory assistant. Ask me about stock levels, values, or any inventory question.",
    starting: 'AI model is starting up, please wait...',
    ready: 'Model ready',
    error: 'Sorry, I could not connect. Please try again.',
  },
  fr: {
    title: 'Assistant Inventaire',
    powered: 'Propulsé par Llama (Gratuit & Open Source)',
    placeholder: 'Posez une question sur votre inventaire...',
    initialMsg: "Bonjour ! Je suis votre assistant inventaire. Posez-moi des questions sur vos stocks ou vos valeurs d'inventaire.",
    starting: 'Le modèle IA démarre, veuillez patienter...',
    ready: 'Modèle prêt',
    error: 'Désolé, je ne peux pas me connecter. Réessayez.',
  },
  ar: {
    title: 'مساعد المخزون',
    powered: 'مدعوم بـ Llama (مجاني ومفتوح المصدر)',
    placeholder: 'اسأل عن مخزونك...',
    initialMsg: 'مرحباً! أنا مساعد المخزون. اسألني عن مستويات المخزون أو القيم أو أي سؤال متعلق بالمخزون.',
    starting: 'نموذج الذكاء الاصطناعي يبدأ، يرجى الانتظار...',
    ready: 'النموذج جاهز',
    error: 'عذراً، لم أتمكن من الاتصال. حاول مرة أخرى.',
  },
};

export default function Chatbot() {
  const { lang } = useI18n();
  const labels = chatbotLabels[lang] || chatbotLabels.en;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', content: labels.initialMsg }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiReady, setAiReady] = useState(null); // null=unknown, true=ready, false=loading
  const bottomRef = useRef();
  const inputRef = useRef();

  // Update initial message when language changes
  useEffect(() => {
    setMessages([{ role: 'bot', content: labels.initialMsg }]);
  }, [lang]);

  // Check Ollama health when chatbot opens
  const checkHealth = useCallback(async () => {
    try {
      const res = await api.get('/chatbot/health');
      setAiReady(res.data?.data?.modelReady === true);
    } catch {
      setAiReady(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      checkHealth();
    }
  }, [open, checkHealth]);

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
      const history = messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));
      const res = await api.post('/chatbot/chat', { message: text, history });
      setMessages(m => [...m, { role: 'bot', content: res.data.data.reply }]);
      if (aiReady === false) setAiReady(true);
    } catch {
      setMessages(m => [...m, { role: 'bot', content: labels.error }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* FAB button */}
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)} title="Inventory Assistant">
        {open ? <CloseIcon /> : <BotIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div className="chatbot-panel" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="chatbot-header">
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <BotIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{labels.title}</div>
              <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: aiReady === true ? '#22c55e' : aiReady === false ? '#f59e0b' : '#8aada9',
                  display: 'inline-block', flexShrink: 0,
                }} />
                {aiReady === false ? labels.starting : labels.powered}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)}><CloseIcon /></button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`} style={{ whiteSpace: 'pre-wrap', textAlign: lang === 'ar' ? 'right' : 'left' }}>
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
              style={{ flex: 1, fontSize: '.84rem', padding: '8px 12px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}
              placeholder={labels.placeholder}
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
