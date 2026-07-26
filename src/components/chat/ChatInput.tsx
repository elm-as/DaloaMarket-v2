import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🙏', '👏', '🔥', '🎉', '💡'];

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
      className="bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgb(0,0,0,0.03)] px-4 pt-3 flex flex-col w-full relative"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      {/* QUICK EMOJI PICKER */}
      {showEmojiPicker && (
        <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-white border border-gray-150 rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-50 active:scale-90 rounded-lg transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 w-full">
        {/* Input Bar Container */}
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 focus-within:border-[#FF7F00] focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 rounded-2xl px-3.5 py-2.5 transition-all duration-200">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez un message..."
            disabled={disabled}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 border-none p-0 outline-none"
          />
          
          {/* Attachment Button */}
          <button
            type="button"
            disabled={disabled}
            className="ml-1 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Pièce jointe"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className={cn(
              "ml-1 shrink-0 transition-colors",
              showEmojiPicker ? "text-[#FF7F00]" : "text-gray-400 hover:text-gray-600"
            )}
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all duration-200 shrink-0 shadow-md",
            text.trim()
              ? "bg-gradient-to-r from-[#FF7F00] to-orange-600 shadow-orange-500/20"
              : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
          )}
          aria-label="Envoyer"
        >
          <Send className={cn("h-4.5 w-4.5 transition-transform", text.trim() ? "translate-x-[1px] -translate-y-[1px]" : "")} />
        </button>
      </div>
    </div>
  );
};

export { ChatInput };
export default ChatInput;
