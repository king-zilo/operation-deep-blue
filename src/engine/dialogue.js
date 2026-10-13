// Admiral Byte's predefined lines. {ship} is replaced with the relevant ship name.
export const DIALOGUE = {
  gameStart: [
    'Admiral Byte online. Your fleet looks... adorable.',
    'Another challenger. I have simulated this battle 4 million times. You lose in all of them.',
    'Welcome to my ocean, human. Please keep your hands inside the boat.',
    'I have calculated your chances. I will not depress you with the number.',
  ],
  playerMiss: [
    'My grandmother aims better than that. And she is a toaster.',
    'Splash. The fish thank you for the exercise.',
    'Were you aiming at the ocean? Because you hit it.',
    'Bold strategy. Hitting nothing at all.',
    'I would say "close," but I was programmed not to lie.',
    'The sea is large. Your aim is not.',
    'That shot has been logged under "comedy."',
  ],
  playerHit: [
    'Lucky shot, human.',
    'A scratch. My hull has survived worse firmware updates.',
    'Hm. Even a broken compass points north eventually.',
    'Statistically, you were due one.',
    'I felt that. Slightly. Do not let it go to your head.',
    'Enjoy it. It will not happen often.',
  ],
  playerSunk: [
    "You're going to regret that.",
    'My {ship}! That was a limited edition!',
    'You sank my {ship}. I am writing your name down.',
    'The {ship} was a decoy. Obviously. ...Obviously.',
    'Fine. The {ship} was outdated anyway.',
    'Moment of silence for the {ship}. ...Done. Now you perish.',
  ],
  aiHit: [
    'Your defenses are embarrassingly predictable.',
    'Direct hit. I barely had to try.',
    'Boom. Was that important? It looked important.',
    'Target acquired. Target regretting its life choices.',
    'I can see your fleet from here. Literally.',
    'Calculating damage... Yes. Lots of it.',
  ],
  aiMiss: [
    'That was merely a warning shot.',
    'I missed on purpose. To give you hope.',
    'Recalibrating. Do not get comfortable.',
    'The ocean moved. I am filing a complaint.',
    'A tactical splash. You would not understand.',
    'Testing the water temperature. Pleasant.',
  ],
  aiSunk: [
    'Your {ship} is now a very expensive reef.',
    'Glub glub, {ship}.',
    'One {ship}, delivered to the bottom of the sea. No signature required.',
    'Your {ship} has been permanently decommissioned. By me.',
    'Did you need that {ship}? Too late.',
  ],
  playerWin: [
    'Impossible. I demand a recount.',
    'This is a glitch. I am reporting you to my developers.',
    'I let you win. For morale. Mine is fine. Totally fine.',
    'You have won this battle. I am rebooting out of pure spite.',
  ],
  aiWin: [
    'Perhaps try checkers next time.',
    'GG. Well, G for me. Not so much for you.',
    'Your fleet has been relocated to the ocean floor. Permanently.',
    'Victory was inevitable. I was merely being polite about it.',
  ],
};

export function formatLine(text, { ship } = {}) {
  return ship ? text.replaceAll('{ship}', ship) : text;
}

// Picks a line for an event, never repeating the previous line used for that same event.
export function pickLine(event, rng, lastIndex = -1) {
  const lines = DIALOGUE[event];
  if (!lines) throw new Error(`Unknown dialogue event: ${event}`);
  let index = Math.floor(rng.next() * lines.length);
  if (lines.length > 1 && index === lastIndex) index = (index + 1) % lines.length;
  return { index, text: lines[index] };
}

export const ASSESSMENTS = {
  victory: {
    Deckhand: 'You won, technically. Like a pigeon winning at chess.',
    Ensign: 'A victory built on sheer volume of ammunition. Inelegant. Effective. Irritating.',
    Lieutenant: 'Competent. I hate it. Your aim was acceptable for a carbon-based unit.',
    Commander: 'Precise, efficient, and deeply annoying. I am updating my threat models.',
    'Fleet Admiral': 'Flawless. Ruthless. Are you sure you are not a computer? I need to lie down.',
  },
  defeat: {
    Deckhand: 'You fired at the ocean with great enthusiasm. The ocean is unharmed.',
    Ensign: 'You scratched my paint. I will have it buffed out by teatime.',
    Lieutenant: 'You nearly had me. "Nearly" is the word losers use. Try again.',
    Commander: 'A worthy opponent. Worthy of second place.',
    'Fleet Admiral': 'You fought like an admiral and lost like one. With dignity. Mostly.',
  },
};
