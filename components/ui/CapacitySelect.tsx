'use client';

import { useAppStore } from '@/store/useAppStore';
import { CAPACITY_OPTIONS } from '@/lib/constants';
import { fmtMins } from '@/lib/utils';

// Compact control for the daily time limit used to flag overbooked days
export default function CapacitySelect() {
  const { dailyCapacity, setDailyCapacity } = useAppStore();
  const options = CAPACITY_OPTIONS.includes(dailyCapacity) ? CAPACITY_OPTIONS : [...CAPACITY_OPTIONS, dailyCapacity].sort((a, b) => a - b);

  return (
    <label className="capacity-select" title="Daily limit — days with more planned time than this are flagged as overbooked">
      <span>Day limit</span>
      <select value={dailyCapacity} onChange={e => setDailyCapacity(Number(e.target.value))}>
        {options.map(m => <option key={m} value={m}>{fmtMins(m)}</option>)}
      </select>
    </label>
  );
}
