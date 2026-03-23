import { api } from './base';

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  _count: { messages: number };
}

export interface ChatMessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  intent: string | null;
  model: string | null;
  feedback: 'UP' | 'DOWN' | null;
  created_at: string;
}

export const chatApi = {
  // SSE streaming — fetch + ReadableStream (axios SSE-ni qo'llab-quvvatlamaydi)
  async *sendMessage(message: string, conversationId?: string): AsyncGenerator<string> {
    const res = await fetch(`${BASE_URL}/chat/send`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Chat xatosi: ${res.status}${text ? ' — ' + text : ''}`);
    }
    if (!res.body) throw new Error('Response body yo\'q');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string };
          if (json.done) return;
          if (json.error) throw new Error(json.error);
          if (json.text) yield json.text;
        } catch {
          // malformed JSON line — skip
        }
      }
    }
  },

  getConversations: () =>
    api.get<ConversationSummary[]>('/chat/conversations').then(r => r.data),

  getMessages: (id: string) =>
    api.get<ChatMessageItem[]>(`/chat/conversations/${id}/messages`).then(r => r.data),

  sendFeedback: (messageId: string, feedback: 'UP' | 'DOWN', feedbackText?: string) =>
    api.post(`/chat/messages/${messageId}/feedback`, { feedback, feedback_text: feedbackText }),

  deleteConversation: (id: string) =>
    api.delete(`/chat/conversations/${id}`),
};
