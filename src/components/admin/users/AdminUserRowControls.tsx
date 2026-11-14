import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Phone, Flag, UserCheck, UserX } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { formatCleanWhatsappPhone, type AdminUserRecord } from './adminUsers.types';

interface RoleSelectProps {
  role?: string | null;
  disabled: boolean;
  canAssignSuperAdmin: boolean;
  onChange: (newRole: string) => void;
}

function getRoleBadgeStyle(role?: string | null): string {
  if (role === 'admin' || role === 'superadmin') return 'border-stone-400 bg-stone-100 text-stone-900';
  if (role === 'livreur') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (role === 'pro') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-stone-200 bg-stone-50 text-stone-700';
}

export const AdminUserRoleSelect: React.FC<RoleSelectProps> = ({
  role,
  disabled,
  canAssignSuperAdmin,
  onChange,
}) => (
  <select
    value={role || 'user'}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      'cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      getRoleBadgeStyle(role)
    )}
  >
    <option value="user">User (Client)</option>
    <option value="pro">Pro (Vendeur)</option>
    <option value="livreur">Livreur</option>
    <option value="helper">Helper</option>
    <option value="moderateur">Modérateur</option>
    <option value="admin">Admin</option>
    {canAssignSuperAdmin && <option value="superadmin">SuperAdmin</option>}
  </select>
);

interface RowActionsProps {
  user: AdminUserRecord;
  disabled: boolean;
  onFlag: () => void;
  onToggleBan: () => void;
}

export const AdminUserRowActions: React.FC<RowActionsProps> = ({
  user,
  disabled,
  onFlag,
  onToggleBan,
}) => {
  const cleanPhone = formatCleanWhatsappPhone(user.phone || user.delivery_person?.phone);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link
        to={`/messages/support/${user.id}`}
        title="Ouvrir la messagerie support"
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100"
      >
        <MessageSquare size={13} className="text-orange-600" />
        <span>Écrire</span>
      </Link>

      {cleanPhone && (
        <a
          href={`https://wa.me/225${cleanPhone}?text=${encodeURIComponent(
            `Bonjour ${user.displayName || ''}, nous vous contactons depuis l'équipe DaloaMarket.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Contacter sur WhatsApp (+225 ${cleanPhone})`}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <Phone size={13} className="text-emerald-600" />
          <span className="lg:hidden">WhatsApp</span>
        </a>
      )}

      <Button
        size="sm"
        variant="outlined"
        disabled={disabled}
        onClick={onFlag}
        title={user.suspect ? 'Retirer le signalement' : 'Signaler sans bloquer'}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
          user.suspect
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-stone-300 text-stone-700 hover:bg-stone-50'
        )}
      >
        <Flag size={13} />
        <span>{user.suspect ? 'Signalé' : 'Signaler'}</span>
      </Button>

      <Button
        size="sm"
        variant={user.banned ? 'tonal' : 'outlined'}
        color={user.banned ? 'success' : 'error'}
        disabled={disabled}
        onClick={onToggleBan}
        className={cn(
          'inline-flex min-w-[84px] items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
          user.banned
            ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-red-300 text-red-600 hover:bg-red-50'
        )}
      >
        {user.banned ? (
          <>
            <UserCheck size={13} />
            <span>Débannir</span>
          </>
        ) : (
          <>
            <UserX size={13} />
            <span>Bannir</span>
          </>
        )}
      </Button>
    </div>
  );
};
