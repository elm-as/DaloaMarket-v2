import React from 'react';
import { MapPin } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { DISTRICTS, validateIvorianPhone } from '../../../lib/utils';

interface ListingLogisticsSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.45 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.59.21-1.09.14-1.19-.06-.11-.23-.17-.48-.3z" />
  </svg>
);

export const ListingLogisticsSection: React.FC<ListingLogisticsSectionProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ── QUARTIER ── */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
            Quartier à Daloa <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <select
              {...register('district', { required: 'Choisissez un quartier' })}
              className="w-full h-11 pl-9 pr-9 rounded-2xl border border-gray-200 bg-gray-50/70 text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all appearance-none shadow-2xs"
            >
              <option value="" className="text-gray-400">Sélectionnez le quartier</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          {errors.district && <p className="text-xs font-semibold text-red-500 mt-1 ml-1">{errors.district.message}</p>}
        </div>

        {/* ── WHATSAPP ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5 pl-1">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <span>Numéro WhatsApp</span>
            </label>
            <span className="text-[10px] text-gray-400 font-medium">Optionnel</span>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 transition-colors">
              <WhatsAppIcon className="h-4 w-4 fill-current" />
            </div>
            <input
              type="tel"
              {...register('phone', { validate: (value) => !value || validateIvorianPhone(value) || 'Format ivoirien invalide' })}
              placeholder="Ex: 07 00 00 00 00"
              className="w-full h-11 pl-9 pr-3 rounded-2xl border border-gray-200 bg-gray-50/70 text-xs sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
            />
          </div>
          {errors.phone && <p className="text-xs font-semibold text-red-500 mt-1 ml-1">{errors.phone.message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ListingLogisticsSection;
