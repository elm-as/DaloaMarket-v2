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
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
          <Phone className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-gray-900">Logistique & Contact</h2>
          <p className="text-[11px] font-medium text-gray-500">Localisation à Daloa et contact direct</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
            Quartier de localisation à Daloa <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <select
              {...register('district', { required: 'Choisissez un quartier' })}
              className="w-full h-12 pl-10 pr-10 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all appearance-none"
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
          {errors.district && <p className="text-xs font-semibold text-red-500 mt-1.5 ml-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {errors.district.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1 flex justify-between items-center">
            <span>Numéro WhatsApp pour contact rapide</span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
              <Smartphone className="h-4 w-4" />
            </div>
            <input
              type="tel"
              {...register('phone', { validate: (value) => !value || validateIvorianPhone(value) || 'Format de téléphone invalide' })}
              placeholder="Ex: 07 00 00 00 00"
              className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
            />
          </div>
          {errors.phone && <p className="text-xs font-semibold text-red-500 mt-1.5 ml-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {errors.phone.message}</p>}
          <p className="text-[10px] text-gray-400 mt-1.5 pl-1 leading-relaxed">
            Permet aux acheteurs intéressés de vous joindre directement via WhatsApp. 
          </p>
        </div>
      </div>
    </section>
  );
};
