import { Chip, type ChipTone } from '../Chip/Chip';

/** Zustände nach PackML (ISA-TR88.00.02). */
export const PACKML_STATES = [
  'Idle',
  'Starting',
  'Execute',
  'Completing',
  'Complete',
  'Resetting',
  'Holding',
  'Held',
  'Unholding',
  'Suspending',
  'Suspended',
  'Unsuspending',
  'Stopping',
  'Stopped',
  'Aborting',
  'Aborted',
  'Clearing',
] as const;

export type PackMLState = (typeof PACKML_STATES)[number];

/**
 * Farbe je Zustand nach CLAUDE.md, Abschnitt 7.1. Festgelegt sind nur Execute,
 * Suspended, Held, Idle und Stopped; alle übrigen Zustände sind neutral, bis
 * offener Punkt O-12 entschieden ist.
 */
export function stateTone(state: PackMLState): ChipTone {
  switch (state) {
    case 'Execute':
      return 'accent';
    case 'Suspended':
      return 'warning';
    case 'Held':
      return 'fault';
    default:
      return 'neutral';
  }
}

export interface StateChipProps {
  state: PackMLState;
  /** Text vor dem Zustand, z. B. „PackML:“ oder „Linie:“ */
  prefix?: string;
  dot?: 'sm' | 'md';
}

export function StateChip({ state, prefix, dot = 'sm' }: StateChipProps) {
  return (
    <Chip tone={stateTone(state)} dot={dot}>
      {prefix ? `${prefix} ${state}` : state}
    </Chip>
  );
}
