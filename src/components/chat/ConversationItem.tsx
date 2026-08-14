import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Avatar from '../profile/Avatar';

interface ConversationItemProps {
  conversation: {
    other_user: {
      id: string;
      full_name: string;
      avatar: string | null;
    };
    last_message: string;
    last_message_time: string;
    unread_count: number;
    listing_title: string;
    listing_id: string;
  };
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { other_user, last_message, last_message_time, unread_count, listing_title, listing_id } =
    conversation;

  const timeAgo = formatDistanceToNow(new Date(last_message_time), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <Link
      to={`/messages/${listing_id}/${other_user.id}`}
      className={`flex items-center gap-3 px-4 py-4 bg-white rounded-3xl border active:scale-[0.98] transition-all shadow-lg shadow-gray-200/50 ${
        unread_count > 0 ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100 hover:bg-gray-50'
      }`}
    >
      {/* Avatar avec point vert si non-lu */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={other_user.avatar}
          name={other_user.full_name}
          size="md"
        />
        {unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-sm truncate ${unread_count > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
            {other_user.full_name}
          </h3>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {timeAgo}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          <span className="text-orange-600 font-bold">Re: {listing_title}</span>
          {' · '}
          {last_message}
        </p>
      </div>

      {/* Unread badge */}
      {unread_count > 0 && (
        <span className="min-w-[24px] h-[24px] bg-gradient-to-r from-orange-500 to-amber-600 text-white text-[11px] font-extrabold rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
          {unread_count > 99 ? '99+' : unread_count}
        </span>
      )}
    </Link>
  );
};

export { ConversationItem };
export default ConversationItem;
