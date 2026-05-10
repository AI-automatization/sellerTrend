import { memo, Fragment } from 'react';
import type { ChatMessage as ChatMessageType } from '../../hooks/useChat';
import { ChatFeedback } from './ChatFeedback';

interface Props {
  message: ChatMessageType;
  onFeedback?: (id: string, feedback: 'UP' | 'DOWN') => void;
}

const INTENT_LABELS: Record<string, string> = {
  PRODUCT_ANALYSIS: '🔍 Mahsulot tahlili',
  PRICE_ADVICE: '💰 Narx maslahati',
  COMPETITOR: '⚔️ Raqobat tahlili',
  NICHE: '🎯 Niche tahlili',
  FORECAST: '📈 Bashorat',
  DEAD_STOCK: '⚠️ Dead stock',
  REVENUE: '💵 Daromad',
  CATEGORY_TREND: '📊 Kategoriya trendi',
  RECOMMENDATION: '💡 Tavsiya',
};

// Parse inline tokens (bold, code) into React elements — no dangerouslySetInnerHTML
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code key={`${keyPrefix}-c${i}`} className="bg-base-300/60 px-1 rounded text-xs font-mono">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const listMatch = /^[-•]\s(.+)$/.exec(line);
    if (listMatch) {
      nodes.push(<li key={idx} className="ml-4 list-disc">{parseInline(listMatch[1], String(idx))}</li>);
    } else {
      if (idx > 0) nodes.push(<br key={`br-${idx}`} />);
      nodes.push(...parseInline(line, String(idx)));
    }
  });

  return <Fragment>{nodes}</Fragment>;
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
          <span>{renderMarkdown(message.content)}</span>
        )}
        {message.streaming && message.content !== '' && (
          <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
        )}
      </div>
      {!isUser && !message.streaming && (
        <div className="chat-footer mt-1 flex items-center gap-2 flex-wrap">
          {message.intent && INTENT_LABELS[message.intent] && (
            <span className="badge badge-ghost badge-sm text-base-content/50">
              {INTENT_LABELS[message.intent]}
            </span>
          )}
          {message.id && onFeedback && (
            <ChatFeedback
              messageId={message.id}
              currentFeedback={message.feedback ?? null}
              onFeedback={onFeedback}
            />
          )}
        </div>
      )}
    </div>
  );
});
