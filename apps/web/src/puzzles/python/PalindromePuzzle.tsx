import type { PuzzleProps } from '../types';
import { PythonPuzzle } from './PythonPuzzle';
import { PALINDROME_CONFIG } from './palindrome';

export function PalindromePuzzle(props: PuzzleProps) {
  return <PythonPuzzle {...props} config={PALINDROME_CONFIG} />;
}
