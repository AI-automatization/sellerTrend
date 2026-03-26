import { useState, useCallback, useRef } from 'react';
import { chatApi, type ChatMessageItem, type ConversationSummary } from '../api/chat';

export interface ChatMessage {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  feedback?: 'UP' | 'DOWN' | null;
  streaming?: boolean;
  intent?: string | null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const abortRef = useRef<boolean>(false);

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming) return;
    setError(null);
    abortRef.current = false;

    setMessages(prev => [
      ...prev,
      { role: 'USER', content: text },
      { role: 'ASSISTANT', content: '', streaming: true },
    ]);
    setIsStreaming(true);

    try {
      for await (const chunk of chatApi.sendMessage(text, conversationId ?? undefined)) {
        if (abortRef.current) break;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
          }
          return prev;
        });
      }
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.streaming
          ? [...prev.slice(0, -1), { ...last, streaming: false }]
          : prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xato yuz berdi');
      setMessages(prev => prev.filter(m => !m.streaming));
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming]);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const list = await chatApi.getConversations();
      setConversations(list);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const msgs = await chatApi.getMessages(convId);
      setConversationId(convId);
      setMessages(
        msgs.map((m: ChatMessageItem) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          feedback: m.feedback,
          intent: m.intent,
        }))
      );
    } catch {
      setError('Suhbat yuklanmadi');
    }
  }, []);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const setFeedback = useCallback((messageId: string, feedback: 'UP' | 'DOWN') => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, feedback } : m))
    );
  }, []);

  return {
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
  };
}
