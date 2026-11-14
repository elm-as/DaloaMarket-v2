import React from 'react';
import {
  Search,
  ShoppingBag,
  Bike,
  Layers,
  UserX,
  Flag,
  Repeat,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AdminBadge } from '../ui/AdminUI';
import type { AdminUserCounts, PlatformFilter } from './adminUsers.types';

interface AdminUsersToolbarProps {
  counts: AdminUserCounts;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: PlatformFilter;
  onFilterChange: (filter: PlatformFilter) => void;
}

interface FilterOption {
  key: PlatformFilter;
  label: string;
  count: number;
  showWhenZero?: boolean;
  icon?: React.ReactNode;
  activeClass: string;
  idleClass: string;
}

export const AdminUsersToolbar: React.FC<AdminUsersToolbarProps> = ({
  counts,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  const filterOptions: FilterOption[] = [
    {
      key: 'all',
      label: 'Tous',
      count: counts.allCount,
      showWhenZero: true,
      activeClass: 'bg-stone-900 text-white',
      idleClass: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
    },
    {
      key: 'market_only',
      label: 'DaloaMarket',
      count: counts.marketCount,
      showWhenZero: true,
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
      activeClass: 'bg-orange-600 text-white',
      idleClass: 'border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
    },
    {
      key: 'delivery',
      label: 'DaloaDelivery',
      count: counts.deliveryCount,
      showWhenZero: true,
      icon: <Bike className="h-3.5 w-3.5" />,
      activeClass: 'bg-emerald-600 text-white',
      idleClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'both',
      label: 'Mixtes (DM + DD)',
      count: counts.bothCount,
      icon: <Layers className="h-3.5 w-3.5" />,
      activeClass: 'bg-stone-800 text-white',
      idleClass: 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100',
    },
    {
      key: 'banned',
      label: 'Bannis',
      count: counts.bannedCount,
      icon: <UserX className="h-3.5 w-3.5" />,
      activeClass: 'bg-red-600 text-white',
      idleClass: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    },
    {
      key: 'suspect',
      label: 'Signalés',
      count: counts.suspectCount,
      icon: <Flag className="h-3.5 w-3.5" />,
      activeClass: 'bg-amber-600 text-white',
      idleClass: 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    },
    {
      key: 'rejoins',
      label: 'Réinscriptions',
      count: counts.rejoinCount,
      icon: <Repeat className="h-3.5 w-3.5" />,
      activeClass: 'bg-stone-700 text-white',
      idleClass: 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100',
    },
    {
      key: 'deleted',
      label: 'Supprimés',
      count: counts.deletedCount,
      icon: <Trash2 className="h-3.5 w-3.5" />,
      activeClass: 'bg-stone-700 text-white',
      idleClass: 'border border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200',
    },
    {
      key: 'appeals',
      label: 'Contestations',
      count: counts.appealCount,
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      activeClass: 'bg-amber-700 text-white',
      idleClass: 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
    },
  ];

  const visibleFilters = filterOptions.filter((opt) => opt.showWhenZero || opt.count > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminBadge>
          DaloaMarket : <span className="tabular-nums">{counts.marketCount}</span>
        </AdminBadge>
        <AdminBadge>
          DaloaDelivery : <span className="tabular-nums">{counts.deliveryCount}</span>
        </AdminBadge>
        {counts.bothCount > 0 && (
          <AdminBadge>
            Les deux : <span className="tabular-nums">{counts.bothCount}</span>
          </AdminBadge>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone, boutique ou IP..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-2 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 transition-colors focus:border-[var(--color-primary)] focus:bg-white focus:outline-none sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {visibleFilters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                activeFilter === option.key ? option.activeClass : option.idleClass
              )}
            >
              {option.icon}
              <span>{option.label}</span>
              <span className="tabular-nums opacity-85">({option.count})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
