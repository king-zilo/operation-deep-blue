// Full-screen end-of-battle moment. Purely decorative and skippable; game state is already final.
export default function Finale({ outcome, onSkip }) {
  const victory = outcome === 'victory';
  return (
    <div className={`finale finale-${outcome}`} role="alertdialog" aria-label={victory ? 'Victory' : 'Defeat'}>
      <div className="finale-flash" aria-hidden="true" />
      <div className="finale-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2 className="finale-title">{victory ? 'ENEMY FLEET ANNIHILATED.' : 'MISSION FAILED — ALL HANDS LOST.'}</h2>
      <button type="button" className="btn btn-ghost finale-skip" onClick={onSkip}>
        Skip to debrief ›
      </button>
    </div>
  );
}
