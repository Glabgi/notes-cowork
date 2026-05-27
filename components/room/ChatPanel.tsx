'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, SmilePlus, ThumbsUp, Heart, Smile, Flame, PartyPopper, Timer, Dumbbell, CheckCircle2, MessageSquare, Trash2,
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const REACTION_ICONS: Record<string, React.ElementType> = {
  thumb: ThumbsUp, heart: Heart, smile: Smile, fire: Flame,
  party: PartyPopper, timer: Timer, muscle: Dumbbell, check: CheckCircle2,
};
const REACTION_KEYS: { id: string; Icon: React.ElementType }[] = [
  { id: 'thumb',  Icon: ThumbsUp },
  { id: 'heart',  Icon: Heart },
  { id: 'smile',  Icon: Smile },
  { id: 'fire',   Icon: Flame },
  { id: 'party',  Icon: PartyPopper },
  { id: 'timer',  Icon: Timer },
  { id: 'muscle', Icon: Dumbbell },
  { id: 'check',  Icon: CheckCircle2 },
];

export default function ChatPanel() {
  const { messages, room, currentUser } = useRoomStore();
  const [input, setInput] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const lastSendTimeRef = useRef(0);

  useEffect(() => {
    // Scroll the messages container only — never bubble up to the page
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const deleteMessage = (messageId: string) => {
    if (!room) return;
    (getSocket() as any).emit('chat:delete', { roomId: room.slug, messageId });
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || !room || !currentUser) return;
    // Guards against double-fire (form submit + button click + keydown)
    if (sendingRef.current) return;
    const now = Date.now();
    if (now - lastSendTimeRef.current < 250) return;
    sendingRef.current = true;
    lastSendTimeRef.current = now;
    try {
      getSocket().emit('chat:send', { roomId: room.slug, content });
      setInput('');
    } finally {
      // Release lock after short delay so user can send next message quickly
      setTimeout(() => { sendingRef.current = false; }, 200);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!room || !currentUser) return;
    getSocket().emit('chat:react', { roomId: room.slug, messageId, emoji });
    setShowReactionPicker(null);
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] min-h-0">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Чат</h3>
        <p className="text-xs text-[var(--text-muted)]">{messages.length} сообщений</p>
      </div>

      {/* Messages — bounded by min-h-0 + flex-1 so scroll stays inside this div */}
      <div
        ref={messagesScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-2">
            <MessageSquare size={28} />
            <p className="text-sm">Пока никто не написал</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.userId === currentUser?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn('flex gap-2 group', isMe && 'flex-row-reverse')}
              >
                {!isMe && <Avatar id={msg.userAvatarId} size={28} />}
                <div className={cn('max-w-[80%]', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'relative px-3 py-2 text-sm',
                    isMe
                      ? 'bg-[var(--accent)] rounded-[16px] rounded-tr-[4px] text-white'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[16px] rounded-tl-[4px] text-[var(--text-primary)]'
                  )}>
                    {!isMe && (
                      <p className="text-xs font-semibold text-[var(--accent)] mb-0.5">{msg.userName}</p>
                    )}
                    <p className="break-words leading-relaxed">{msg.content}</p>
                    <span className={cn('text-[10px] mt-1 block', isMe ? 'text-blue-200' : 'text-[var(--text-muted)]')}>
                      {formatTime(msg.createdAt)}
                    </span>

                    {/* Hover action row */}
                    <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                        className="p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-full shadow-sm hover:bg-[var(--bg-hover)]"
                        title="Реакция"
                      >
                        <SmilePlus size={12} className="text-[var(--text-muted)]" />
                      </button>
                      {isMe && (
                        <button
                          onClick={() => { if (confirm('Удалить сообщение?')) deleteMessage(msg.id); }}
                          className="p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-full shadow-sm hover:bg-[#FEE2E2] hover:border-[#FCA5A5]"
                          title="Удалить"
                        >
                          <Trash2 size={12} className="text-[#DC2626]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {msg.reactions.map((r) => {
                        const Icon = REACTION_ICONS[r.emoji] || ThumbsUp;
                        return (
                          <button key={r.emoji}
                            onClick={() => handleReaction(msg.id, r.emoji)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                              r.users.includes(currentUser?.id || '')
                                ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)]'
                                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                            )}>
                            <Icon size={11} /> <span>{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Reaction picker */}
                  {showReactionPicker === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-1 flex gap-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] z-10"
                    >
                      {REACTION_KEYS.map(({ id, Icon }) => (
                        <button key={id} onClick={() => handleReaction(msg.id, id)}
                          className="hover:bg-[var(--bg-hover)] hover:scale-110 transition-all p-1.5 rounded-[8px]">
                          <Icon size={14} className="text-[var(--text-secondary)]" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[var(--bg-subtle)] border-t border-[var(--border)]">
        <form
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); sendMessage(); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Написать сообщение..."
            maxLength={500}
            className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[#94A3B8] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[#DBEAFE]/50 transition-all"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-[10px] flex items-center justify-center transition-colors duration-150 flex-shrink-0"
          >
            <Send size={15} className="text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
