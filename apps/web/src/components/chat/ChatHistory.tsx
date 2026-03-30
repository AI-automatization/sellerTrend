import { useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { chatApi } from '../../api/chat';
import type { ConversationSummary } from '../../api/chat';

interface Props {
  conversations: ConversationSummary[];
  historyLoading: boolean;
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onLoad: () => void;
  onDelete: (id: string) => void;
}

export function ChatHistory({
  conversations,
  historyLoading,
  currentId,
  onSelect,
  onNew,
  onLoad,
}: Props) {
  const { t } = useI18n();

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm(t('chat.deleteConfirm'))) return;
    try {
      await chatApi.deleteConversation(id);
      onLoad();
      if (currentId === id) onNew();
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-base-300/40">
        <button onClick={onNew} className="btn btn-sm btn-outline w-full gap-2">
          <span>+</span>
          {t('chat.newChat')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {historyLoading ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-center text-base-content/40 text-xs py-4">
            {t('chat.noConversations')}
          </p>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentId === conv.id
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-base-200'
              }`}
            >
              <span className="flex-1 text-sm truncate">
                {conv.title ?? t('chat.history')}
              </span>
              <button
                onClick={e => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs text-error px-1 transition-opacity"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
