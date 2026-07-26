import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const OtpPinDisplay: React.FC<{ code: string; accentColor: string }> = ({ code, accentColor }) => {
  const digits = code.split('');
  const colorMap: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', shadow: 'shadow-orange-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', shadow: 'shadow-emerald-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', shadow: 'shadow-blue-100' },
  };
  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'w-11 h-14 rounded-xl border-2 flex items-center justify-center shadow-sm',
            colors.bg, colors.border, colors.shadow,
          )}
        >
          <span className={cn('text-2xl font-black tabular-nums', colors.text)}>
            {digit}
          </span>
        </motion.div>
      ))}
    </div>
  );
};
