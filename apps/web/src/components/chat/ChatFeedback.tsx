import { useState } from 'react';
import { chatApi } from '../../api/chat';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
  messageId: string;
  currentFeedback: 'UP' | 'DOWN' | null;
  onFeedback: (id: string, feedback: 'UP' | 'DOWN') => void;
}

export function ChatFeedback({ messageId, currentFeedback, onFeedback }: Props) {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);

  async function handleFeedback(feedback: 'UP' | 'DOWN') {
    if (sent || currentFeedback) return;
    try {
      await chatApi.sendFeedback(messageId, feedback);
      onFeedback(messageId, feedback);
      setSent(true);
    } catch {
      // silent
    }
  }

  if (sent) {
    return (
      <span className="text-xs text-base-content/40">{t('chat.feedbackThanks')}</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleFeedback('UP')}
        className={`btn btn-ghost btn-xs px-1 ${currentFeedback === 'UP' ? 'text-success' : 'text-base-content/40 hover:text-success'}`}
        title="Foydali"
      >
        👍
      </button>
      <button
        onClick={() => handleFeedback('DOWN')}
        className={`btn btn-ghost btn-xs px-1 ${currentFeedback === 'DOWN' ? 'text-error' : 'text-base-content/40 hover:text-error'}`}
        title="Foydali emas"
      >
        👎
      </button>
    </div>
  );
}
