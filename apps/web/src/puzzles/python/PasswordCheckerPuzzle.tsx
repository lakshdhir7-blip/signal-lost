import type { PuzzleProps } from '../types';
import { PythonPuzzle } from './PythonPuzzle';
import { PASSWORD_CHECKER_CONFIG } from './password-checker';

export function PasswordCheckerPuzzle(props: PuzzleProps) {
  return <PythonPuzzle {...props} config={PASSWORD_CHECKER_CONFIG} />;
}
