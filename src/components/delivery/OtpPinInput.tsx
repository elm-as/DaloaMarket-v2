import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface OtpPinInputProps {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export const OtpPinInput: React.FC<OtpPinInputProps> = ({ length, value, onChange, disabled, error }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split('');
    arr[index] = char;
    const newVal = arr.join('').slice(0, length);
    onChange(newVal);
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          animate={error ? { x: [0, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            'w-11 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all duration-200 tabular-nums',
            'focus:ring-4 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)]',
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white',
            error ? 'border-red-400 text-red-600' : 'border-gray-200 text-gray-900',
          )}
        />
      ))}
    </div>
  );
};
