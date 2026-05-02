import { COLORS } from '@/lib/constants';

interface ColorPickerProps {
  value: string;
  onChange: (c: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: c,
              border: value === c ? '3px solid var(--text)' : '2px solid transparent',
              cursor: 'pointer',
              outline: 'none',
              transition: 'border 0.15s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, padding: 2, borderRadius: 6, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          style={{ flex: 1 }}
        />
      </div>
    </div>
  );
}
