import { PASSWORD_RULES } from '@/lib/password';

// Live list of password rules under a new-password field (sign-up and reset).
export default function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-live="polite" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 4 }}>
      {PASSWORD_RULES.map(rule => {
        const met = rule.test(password);
        return (
          <li key={rule.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
            color: met ? 'var(--success-text)' : 'var(--text-muted)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
              {met ? <polyline points="20 6 9 17 4 12"/> : <circle cx="12" cy="12" r="8"/>}
            </svg>
            <span>{rule.label}<span className="sr-only">{met ? ' (met)' : ' (not met)'}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
