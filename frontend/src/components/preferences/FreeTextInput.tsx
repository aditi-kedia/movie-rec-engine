import React from 'react';

interface FreeTextInputProps {
  value: string;
  onChange: (val: string) => void;
}

export const FreeTextInput: React.FC<FreeTextInputProps> = ({ value, onChange }) => {
  const maxLength = 1000;

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#9ab] uppercase tracking-wider">
        Free-text Preference / Custom Instructions
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          rows={4}
          placeholder="e.g. I want to watch a cozy, atmospheric murder mystery set in a snow-covered village, with a slow burn, beautiful cinematography, and unexpected plot twists..."
          className="w-full bg-[#24303c] border border-[#303840] rounded-lg p-3 text-white focus:outline-none focus:border-[#00c030] text-sm placeholder-[#9ab]/40 resize-none transition-all"
        />
        <div className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-[#9ab]/50">
          {value.length} / {maxLength}
        </div>
      </div>
    </div>
  );
};
