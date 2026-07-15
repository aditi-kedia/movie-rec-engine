import React from 'react';

interface RuntimeSelectorProps {
  minRuntime: number | '';
  maxRuntime: number | '';
  onChangeMin: (val: number | '') => void;
  onChangeMax: (val: number | '') => void;
}

export const RuntimeSelector: React.FC<RuntimeSelectorProps> = ({
  minRuntime,
  maxRuntime,
  onChangeMin,
  onChangeMax,
}) => {
  const applyPreset = (min: number | '', max: number | '') => {
    onChangeMin(min);
    onChangeMax(max);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#9ab] uppercase tracking-wider mb-1.5">
            Min Runtime (mins)
          </label>
          <input
            type="number"
            value={minRuntime}
            onChange={(e) => onChangeMin(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="No minimum"
            min="0"
            className="w-full bg-[#24303c] border border-[#303840] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00c030] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#9ab] uppercase tracking-wider mb-1.5">
            Max Runtime (mins)
          </label>
          <input
            type="number"
            value={maxRuntime}
            onChange={(e) => onChangeMax(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="No maximum"
            min="0"
            className="w-full bg-[#24303c] border border-[#303840] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00c030] text-sm"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => applyPreset('', '')}
          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-all ${
            minRuntime === '' && maxRuntime === ''
              ? 'bg-[#00c030] border-[#00c030] text-white'
              : 'bg-[#1c252d] border-[#24303c] text-[#9ab] hover:text-white hover:border-[#9ab]/50'
          }`}
        >
          Any Length
        </button>
        <button
          type="button"
          onClick={() => applyPreset('', 90)}
          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-all ${
            minRuntime === '' && maxRuntime === 90
              ? 'bg-[#00c030] border-[#00c030] text-white'
              : 'bg-[#1c252d] border-[#24303c] text-[#9ab] hover:text-white hover:border-[#9ab]/50'
          }`}
        >
          Under 90 mins
        </button>
        <button
          type="button"
          onClick={() => applyPreset(90, 120)}
          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-all ${
            minRuntime === 90 && maxRuntime === 120
              ? 'bg-[#00c030] border-[#00c030] text-white'
              : 'bg-[#1c252d] border-[#24303c] text-[#9ab] hover:text-white hover:border-[#9ab]/50'
          }`}
        >
          90 - 120 mins
        </button>
        <button
          type="button"
          onClick={() => applyPreset(120, '')}
          className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer transition-all ${
            minRuntime === 120 && maxRuntime === ''
              ? 'bg-[#00c030] border-[#00c030] text-white'
              : 'bg-[#1c252d] border-[#24303c] text-[#9ab] hover:text-white hover:border-[#9ab]/50'
          }`}
        >
          Over 2 hours
        </button>
      </div>
    </div>
  );
};
