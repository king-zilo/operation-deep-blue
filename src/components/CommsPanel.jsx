export function AdmiralAvatar({ mood = 'smug' }) {
  return (
    <svg className={`avatar avatar-${mood}`} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="hull" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e4a6e" />
          <stop offset="1" stopColor="#0b2236" />
        </linearGradient>
      </defs>
      <path d="M14 22 L32 10 L50 22 Z" fill="#0f2b44" stroke="#3ee6d8" strokeWidth="1.5" />
      <rect x="18" y="19" width="28" height="4" rx="1" fill="#f5b942" />
      <rect x="14" y="24" width="36" height="28" rx="8" fill="url(#hull)" stroke="#3ee6d8" strokeWidth="1.5" />
      <rect className="avatar-eye" x="21" y="32" width="8" height="5" rx="1.5" fill="#3ee6d8" />
      <rect className="avatar-eye" x="35" y="32" width="8" height="5" rx="1.5" fill="#3ee6d8" />
      <path d="M24 44 Q32 48 41 42" fill="none" stroke="#ff7a45" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="10" x2="32" y2="4" stroke="#3ee6d8" strokeWidth="1.5" />
      <circle className="avatar-antenna" cx="32" cy="4" r="2" fill="#ff5a3c" />
    </svg>
  );
}

const MOOD = {
  playerHit: 'annoyed',
  playerSunk: 'annoyed',
  playerWin: 'annoyed',
  aiHit: 'smug',
  aiSunk: 'smug',
  aiWin: 'smug',
};

export default function CommsPanel({ comms }) {
  const [latest, ...older] = comms;
  return (
    <section className="comms panel" aria-label="Admiral Byte communications">
      <div className="comms-avatar">
        <AdmiralAvatar mood={MOOD[latest?.event] ?? 'neutral'} />
      </div>
      <div className="comms-body">
        <div className="comms-header">
          <span className="comms-name">ADMIRAL BYTE</span>
          <span className="comms-channel">
            <span className="live-dot" aria-hidden="true" /> ENEMY COMMS · CH 7
          </span>
        </div>
        <p className="comms-line" key={latest?.id} aria-live="polite">
          {latest ? `“${latest.text}”` : '…'}
        </p>
        {older.length > 0 && (
          <ul className="comms-history">
            {older.slice(0, 2).map((msg) => (
              <li key={msg.id}>“{msg.text}”</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
