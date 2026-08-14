import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatBubbleProps {
  text: string;
  timestamp: string;
  isSent: boolean;
  status?: 'sending' | 'sent' | 'read';
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  timestamp,
  isSent,
  status = 'sent',
}) => {
  const timeAgo = formatDistanceToNow(new Date(timestamp), {
    addSuffix: false,
    locale: fr,
  });

  // Check if content is a shared image URL
  const isImage = text.startsWith('http') && (
    text.match(/\.(jpeg|jpg|gif|png|webp)/i) != null ||
    text.includes('/storage/v1/object/public/')
  );

  return (
    <div
      className={cn(
        'flex mb-2.5 px-1',
        isSent ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] transition-all duration-200 shadow-sm',
          isImage ? 'p-1' : 'px-3.5 py-2.5',
          isSent
            ? 'rounded-2xl rounded-tr-xs bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/15'
            : 'rounded-2xl rounded-tl-xs bg-white text-gray-900 border border-gray-100/90 shadow-gray-100'
        )}
      >
        {isImage ? (
          <img
            src={text}
            alt="Image partagée"
            className="max-w-full max-h-60 object-cover rounded-xl shadow-inner cursor-pointer"
            onClick={() => window.open(text, '_blank')}
            loading="lazy"
          />
        ) : (
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words font-medium">
            {text}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-1 mt-1 select-none',
            isImage ? 'px-2 pb-1' : '',
            isSent ? 'justify-end text-orange-100/80' : 'justify-start text-gray-400'
          )}
        >
          <span className="text-[9.5px] font-semibold tracking-tight">
            {timeAgo}
          </span>
          {isSent && (
            <span className="shrink-0 ml-0.5">
              {status === 'sending' && (
                <Clock className="h-2.5 w-2.5 animate-pulse text-white/70" />
              )}
              {status === 'sent' && (
                <Check className="h-3 w-3 text-white/80" />
              )}
              {status === 'read' && (
                <CheckCheck className="h-3 w-3 text-white stroke-[2.5]" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export { ChatBubble };
export default ChatBubble;
