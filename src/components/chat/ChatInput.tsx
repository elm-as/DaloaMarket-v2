import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🙏', '👏', '🔥', '🎉', '💡', '🌾', '🤝'];

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  return (
    <div 
      className="bg-white/95 backdrop-blur-xl border-t border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col w-full relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
    >
      {/* QUICK EMOJI PICKER */}
      {showEmojiPicker && (
        <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 sm:left-4 sm:right-4 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl p-2 shadow-xl flex items-center justify-between gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 active:scale-90 rounded-xl transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 w-full max-w-4xl mx-auto">
        {/* Input Bar Container */}
        <div className="flex-1 flex items-center bg-gray-100/80 hover:bg-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400 border border-transparent rounded-full px-3.5 py-1.5 transition-all duration-200">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className={cn(
              "mr-2 shrink-0 transition-colors p-1 rounded-full hover:bg-gray-200/60 active:scale-90",
              showEmojiPicker ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
            )}
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez un message..."
            disabled={disabled}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 border-none p-0 outline-none"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-all duration-200 shrink-0 shadow-md",
            text.trim()
              ? "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/25 cursor-pointer scale-100"
              : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed opacity-70"
          )}
          aria-label="Envoyer"
        >
          <Send className={cn("h-4 w-4 transition-transform", text.trim() ? "translate-x-0.5" : "")} />
        </button>
      </div>
    </div>
  );
};

export { ChatInput };
export default ChatInput;
