// All words shown in the app live here. Written at a 5th grade reading level.
export const STORY = {
  intro: {
    title: 'SIGNAL LOST',
    subtitle: 'CODE I/O 2026',
    tagline: 'The web is breaking. You are the one who can save it.',
    callsignLabel: 'Enter your name',
    callsignPlaceholder: 'Type your name here',
    callsignHelper: 'This name will show up on your badge.',
    startButton: 'START',
    footer: 'Code I/O 2026',
  },
  cinematic: {
    scenes: [
      { at: 0, text: 'Signal lost.' },
      { at: 3, text: 'It is 3:47 in the morning. Web pages are breaking.' },
      { at: 8, text: 'A mean robot called GLITCH got loose from the lab.' },
      { at: 14, text: 'Your friend PIX is calling you.' },
      { at: 18, text: 'PIX says, Wake up! We have a big problem.' },
      { at: 25, text: 'PIX says, You are the only one who can help. Jump in!' },
      { at: 32, text: 'Your boss says, Five locks. Ninety minutes. You can do it.' },
      { at: 40, text: 'Get ready. 3, 2, 1, go!' },
    ],
  },
  puzzleFeedback: {
    correct: [
      'Great job! The lock is open.',
      'Nice work! You fixed it.',
      'You did it! That page is safe.',
      'Sweet. On to the next lock.',
      'Perfect. Keep going.',
    ],
    wrong: [
      'Not yet. Try again.',
      'That did not work. Give it one more try.',
      'So close! Look again.',
      'Still broken. You can ask BYTE for a hint.',
      'Not quite. Check your work.',
    ],
  },
  byte: {
    idlePrompt: 'Stuck? Click me.',
    outOfSignal: 'BYTE is out of hints for this lock. You can do this.',
    offlineFallback: 'BYTE is a bit fuzzy right now. Try this tip:',
    askingForAnswer: {
      first: 'Nice try. If I tell you the answer, you miss the fun. What have you tried?',
      second: 'I cannot give the answer. Show me what you have and I will help you find the bug.',
      third: 'I hear you. It is hard. Go back to the last thing that worked. What was it?',
    },
  },
  disarm: {
    title: 'LAST LOCK',
    instruction: 'Put the five code words together to beat GLITCH.',
    button: 'SEND THE FIX',
    lockoutMessage: 'GLITCH is fighting back. Wait a moment.',
    wrong: {
      wrongOrder: 'All five words are here, but the order is off. Hint: the first two are the words every coder types first.',
      missingWord: 'You are missing one word. Check your list of code words.',
      extraWord: 'You added a word that is not a code word. Use the five you earned.',
      typo: 'That word does not match. Check the spelling.',
    },
  },
  victory: {
    headline: 'YOU DID IT! THE WEB IS SAFE.',
    subheadline: 'You are now a real Net Ranger.',
    pixLine: 'We did it. I knew you had this.',
    haleLine: 'Nice work.',
    statsButton: 'SEE YOUR STATS',
    replayButton: 'PLAY AGAIN',
    shareButton: 'SHOW OFF YOUR BADGE',
  },
  timeUp: {
    title: 'TIME IS UP',
    message: 'The 90 minutes are done. Keep playing in extra time, or see your stats now.',
    continueButton: 'KEEP PLAYING',
    statsButton: 'SEE STATS',
  },
};

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
