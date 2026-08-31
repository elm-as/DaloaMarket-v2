import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface InviteDelivererCardProps {
  invitePhone: string;
  setInvitePhone: (phone: string) => void;
  inviting: boolean;
  onInvite: (e: React.FormEvent) => void;
}

export const InviteDelivererCard: React.FC<InviteDelivererCardProps> = ({
  invitePhone,
  setInvitePhone,
  inviting,
  onInvite,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-6 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">Inviter un Livreur</h2>
            <p className="text-xs text-gray-400 font-medium">Ajoutez un livreur pour lui confier vos courses en direct</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
          📱 DaloaDelivery
        </span>
      </div>

      <form onSubmit={onInvite} className="pt-1">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1 flex items-center bg-gray-50/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400 border border-gray-200 rounded-2xl transition-all overflow-hidden px-3.5 py-1">
            <span className="text-xs font-black text-gray-500 select-none pr-2 border-r border-gray-200">
              🇨🇮 +225
            </span>
            <input
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="07 08 09 10 11"
              className="flex-1 bg-transparent px-2.5 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none border-none"
            />
          </div>

          <Button
            type="submit"
            color="primary"
            size="md"
            loading={inviting}
            disabled={inviting}
            icon={<Plus size={16} />}
            className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-md shadow-orange-500/25 active:scale-[0.98] whitespace-nowrap px-6 py-3"
          >
            Inviter
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 font-medium">
          💡 Le livreur recevra une demande d'affiliation à valider dans son application DaloaDelivery.
        </p>
      </form>
    </div>
  );
};
