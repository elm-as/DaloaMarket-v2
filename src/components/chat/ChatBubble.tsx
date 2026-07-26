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
    addSuffix: true,
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
        'flex mb-3.5 px-0.5',
        isSent ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[78%] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200',
          isImage ? 'p-1' : 'px-4 py-3',
          isSent
            ? 'rounded-2xl rounded-tr-none bg-gradient-to-r from-[#FF7F00] to-orange-600 text-white shadow-orange-500/5'
            : 'rounded-2xl rounded-tl-none bg-white text-gray-900 border border-gray-100'
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
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
            {text}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1.5 select-none',
            isImage ? 'px-2 pb-1.5' : '',
            isSent ? 'justify-end' : 'justify-start'
          )}
        >
          <span className={cn('text-[9px] font-bold tracking-tight', isSent ? 'text-white/70' : 'text-gray-400')}>
            {timeAgo}
          </span>
          {isSent && (
            <span className="text-white/75 shrink-0">
              {status === 'sending' && (
                <Clock className="h-2.5 w-2.5 animate-pulse" />
              )}
              {status === 'sent' && (
                <Check className="h-3 w-3" />
              )}
              {status === 'read' && (
                <CheckCheck className="h-3 w-3 text-white" />
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
