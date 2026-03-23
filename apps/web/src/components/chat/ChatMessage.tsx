import { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '../../hooks/useChat';
import { ChatFeedback } from './ChatFeedback';

interface Props {
  message: ChatMessageType;
  onFeedback?: (id: string, feedback: 'UP' | 'DOWN') => void;
}

// Simple markdown renderer — no external library needed
function renderMarkdown(text: string): string {
  return text
    // bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="bg-base-300/60 px-1 rounded text-xs font-mono">$1</code>')
    // unordered list
    .replace(/^[-•]\s(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // newlines → <br>
    .replace(/\n/g, '<br />');
}

export const ChatMessage = memo(function ChatMessage({ message, onFeedback }: Props) {
  const isUser = message.role === 'USER';

  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
      {!isUser && (
        <div className="chat-image avatar placeholder">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-content">AI</span>
          </div>
        </div>
      )}
      <div
        className={`chat-bubble max-w-[85%] text-sm leading-relaxed ${
          isUser
            ? 'chat-bubble-primary'
            : 'bg-base-200 text-base-content'
        }`}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : message.streaming && message.content === '' ? (
          <span className="inline-flex gap-1 items-center py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <span
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        {message.streaming && message.content !== '' && (
          <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
        )}
      </div>
      {!isUser && !message.streaming && message.id && onFeedback && (
        <div className="chat-footer mt-1">
          <ChatFeedback
            messageId={message.id}
            currentFeedback={message.feedback ?? null}
            onFeedback={onFeedback}
          />
        </div>
      )}
    </div>
  );
});
