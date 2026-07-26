import React from 'react';
import { Phone, MapPin, Smartphone } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card } from '../../ui/Card';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { DISTRICTS, validateIvorianPhone } from '../../../lib/utils';

interface ListingLogisticsSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

export const ListingLogisticsSection: React.FC<ListingLogisticsSectionProps> = ({
  register,
  errors,
}) => {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Phone className="h-5 w-5 text-[#FF7F00]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Logistique & Contact</h2>
          <p className="text-xs text-gray-500 mt-0.5">Où et comment vous joindre ?</p>
        </div>
      </div>

      <Card elevation={1} padding="lg" className="rounded-2xl space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-900">
            Quartier de localisation <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF7F00] transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
            <select
              {...register('district', { required: 'Choisissez un quartier' })}
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF7F00] transition-all appearance-none"
            >
              <option value="" className="text-gray-400">Sélectionnez un quartier</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          {errors.district && <p className="text-xs font-medium text-red-500 mt-1.5 ml-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> {errors.district.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-900 flex justify-between items-center">
            <span>Téléphone WhatsApp</span>
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF7F00] transition-colors">
              <Smartphone className="h-5 w-5" />
            </div>
            <input
              type="tel"
              {...register('phone', { validate: (value) => !value || validateIvorianPhone(value) || 'Format de téléphone invalide' })}
              placeholder="Ex: 07 00 00 00 00"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF7F00] transition-all"
            />
          </div>
          {errors.phone && <p className="text-xs font-medium text-red-500 mt-1.5 ml-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> {errors.phone.message}</p>}
          <p className="text-[11px] text-gray-500 mt-2 ml-1 leading-relaxed">
            Fournissez un numéro WhatsApp valide pour que les acheteurs puissent vous contacter facilement. 
          </p>
        </div>
      </Card>
    </section>
  );
};
