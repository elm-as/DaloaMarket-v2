import React from 'react';
import {
  ShoppingBag,
  Bike,
  Layers,
  CheckCircle2,
  MessageSquare,
  Flag,
  Repeat,
  Trash2,
} from 'lucide-react';
import { cn, formatDate } from '../../../lib/utils';
import type { AdminUserRecord } from './adminUsers.types';

export const AdminUserPlatformBadges: React.FC<{ user: AdminUserRecord }> = ({ user }) => {
  const deliveryData = user.delivery_person;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.isMarket && (
        <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
          <ShoppingBag className="h-3 w-3 shrink-0 text-orange-600" />
          <span>DaloaMarket</span>
          {user.listings_count > 0 && (
            <span className="rounded bg-orange-200/70 px-1 text-[10px] font-bold tabular-nums text-orange-900">
              {user.listings_count} ann.
            </span>
          )}
        </span>
      )}

      {user.isDelivery && (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          <Bike className="h-3 w-3 shrink-0 text-emerald-600" />
          <span>DaloaDelivery</span>
          {deliveryData?.vehicle_type && (
            <span className="text-[10px] font-medium text-emerald-700">({deliveryData.vehicle_type})</span>
          )}
        </span>
      )}

      {user.isBoth && (
        <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
          <Layers className="h-3 w-3 text-stone-600" />
          <span>Compte double</span>
        </span>
      )}

      {deliveryData?.is_verified && (
        <span className="mt-0.5 inline-flex w-full items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Coursier vérifié</span>
        </span>
      )}
    </div>
  );
};

export const AdminUserModerationBadges: React.FC<{ user: AdminUserRecord }> = ({ user }) => {
  const hasAppeal = user.ban_appeal_status === 'pending';

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
          user.banned
            ? 'border-red-200 bg-red-100 text-red-700'
            : 'border-emerald-200 bg-emerald-100 text-emerald-800'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', user.banned ? 'bg-red-600' : 'bg-emerald-600')} />
        {user.banned ? 'Banni' : 'Actif'}
      </span>

      {user.banned && user.ban_reason && (
        <span className="max-w-[150px] truncate text-[10px] font-medium text-red-700" title={user.ban_reason}>
          Motif : {user.ban_reason}
        </span>
      )}

      {hasAppeal && (
        <span
          className="inline-flex cursor-help items-center gap-1 rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
          title={user.ban_appeal_reason || ''}
        >
          <MessageSquare size={10} />
          Contestation
        </span>
      )}

      {user.suspect && (
        <span
          className="inline-flex cursor-help items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
          title={user.suspect_reason || 'Compte signalé'}
        >
          <Flag size={10} />
          Signalé
        </span>
      )}

      {user.rejoin && (
        <span
          className="inline-flex cursor-help items-center gap-1 rounded border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800"
          title={`Même ${user.rejoin.matched_kind === 'identity' ? 'compte Google' : 'adresse e-mail'} qu'un compte supprimé (${user.rejoin.previous_state || 'inconnu'})`}
        >
          <Repeat size={10} />
          Réinscription
        </span>
      )}

      {user.deleted_at && (
        <span
          className="inline-flex cursor-help items-center gap-1 rounded border border-stone-300 bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700"
          title={`Compte anonymisé le ${formatDate(user.deleted_at)}.`}
        >
          <Trash2 size={10} />
          Supprimé
        </span>
      )}
    </div>
  );
};
