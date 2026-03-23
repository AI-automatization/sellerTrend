import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import { ChatMessage } from './ChatMessage';
import { ChatHistory } from './ChatHistory';

const PLAN_HIERARCHY: Record<string, number> = { FREE: 0, PRO: 1, MAX: 2, COMPANY: 3 };
function hasAccess(plan: string | undefined, required: string) {
  return (PLAN_HIERARCHY[plan ?? 'FREE'] ?? 0) >= (PLAN_HIERARCHY[required] ?? 0);
}

export function ChatWidget() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const payload = useAuthStore(s => s.payload);
  const canUseChat = hasAccess(payload?.plan, 'MAX');
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    conversationId,
    isStreaming,
    error,
    conversations,
    historyLoading,
    sendMessage,
    loadConversations,
    loadConversation,
    startNewChat,
    setFeedback,
  } = useChat();

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !showHistory) {
      inputRef.current?.focus();
    }
  }, [isOpen, showHistory]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isStreaming) return;
      setInput('');
      await sendMessage(text);
    },
    [input, isStreaming, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
    setShowHistory(false);
  };

  const handleNewChat = () => {
    startNewChat();
    setShowHistory(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 btn btn-circle btn-primary shadow-lg shadow-primary/30 w-13 h-13"
        aria-label="AI Chat"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[400px] h-[500px] md:h-[560px] flex flex-col rounded-2xl shadow-2xl shadow-black/20 bg-base-100 border border-base-300/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300/40 bg-base-100 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-content">AI</span>
            </div>
            <span className="font-semibold text-sm flex-1">{t('chat.title')}</span>
            <button
              onClick={() => { setShowHistory(v => !v); if (!showHistory) loadConversations(); }}
              className={`btn btn-ghost btn-xs px-2 ${showHistory ? 'text-primary' : ''}`}
              title={t('chat.history')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-xs px-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          {!canUseChat ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold">{t('chat.planRequired')}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setIsOpen(false); navigate('/billing'); }}
              >
                {t('billing.upgrade')}
              </button>
            </div>
          ) : showHistory ? (
            <div className="flex-1 overflow-hidden">
              <ChatHistory
                conversations={conversations}
                historyLoading={historyLoading}
                currentId={conversationId}
                onSelect={handleSelectConversation}
                onNew={handleNewChat}
                onLoad={loadConversations}
                onDelete={() => loadConversations()}
              />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-xl">✨</span>
                    </div>
                    <p className="text-sm text-base-content/60 leading-relaxed">
                      {t('chat.placeholder')}
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id ?? i}
                    message={msg}
                    onFeedback={setFeedback}
                  />
                ))}
                {error && (
                  <div className="alert alert-error text-xs py-2 px-3">
                    <span>{t('chat.error')}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 px-3 py-3 border-t border-base-300/40 bg-base-100 shrink-0"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 textarea textarea-bordered textarea-sm resize-none min-h-[36px] max-h-[100px] text-sm py-2"
                  style={{ height: 'auto', overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="btn btn-primary btn-sm h-9 w-9 min-h-0 p-0 shrink-0"
                >
                  {isStreaming ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
