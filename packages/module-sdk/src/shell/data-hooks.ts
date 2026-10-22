import { useMemo, useSyncExternalStore } from 'react';
import { machinesInOrder } from '../data/analysis';
import type { LocalizedText } from '@iot/interface-schema';
import type { ActiveAlarm, LineSnapshot, MachineSnapshot } from '../data/types';
import { useShell } from './shell-context';

/**
 * Maschinendaten für Module (CLAUDE.md, Abschnitt 6.2) – ausschließlich aus dem kanonischen Linienmodell
 * des Core, nie direkt von Connector-Topics. Alle Hooks aktualisieren sich live.
 */
export function useLineData(): LineSnapshot | null {
  const { data } = useShell();
  return useSyncExternalStore(data.subscribe, data.getSnapshot);
}

/** Maschinen der Linie in Reihenfolge ihrer Position. */
export function useMachines(): MachineSnapshot[] {
  const line = useLineData();
  return useMemo(() => (line ? machinesInOrder(line) : []), [line]);
}

export function useMachine(machineId: string): MachineSnapshot | null {
  return useMachines().find((m) => m.machineId === machineId) ?? null;
}

export function useMachineState(machineId: string): MachineSnapshot['state'] {
  return useMachine(machineId)?.state ?? null;
}

export function useCounters(machineId: string): MachineSnapshot['counters'] {
  return useMachine(machineId)?.counters ?? null;
}

export interface LineAlarm extends ActiveAlarm {
  machineId: string;
}

/** Anstehende Alarme der Linie, neueste zuerst; optional gefiltert nach Maschine oder Klasse. */
export function useAlarms(
  filter: { machineId?: string; class?: ActiveAlarm['class'] } = {},
): LineAlarm[] {
  const machines = useMachines();
  const { machineId, class: alarmClass } = filter;
  return useMemo(
    () =>
      machines
        .filter((m) => !machineId || m.machineId === machineId)
        .flatMap((m) => m.alarms.map((a) => ({ ...a, machineId: m.machineId })))
        .filter((a) => !alarmClass || a.class === alarmClass)
        .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)),
    [machines, machineId, alarmClass],
  );
}

export interface ProcessValue {
  key: string;
  name: LocalizedText;
  unit: string;
  value: number;
  ts: string;
  gxp: boolean;
}

/** Prozesswerte einer Maschine mit Name und Einheit aus dem `meta`-Katalog. */
export function useValues(machineId: string, keys?: readonly string[]): ProcessValue[] {
  const machine = useMachine(machineId);
  return useMemo(() => {
    if (!machine?.meta) return [];
    return machine.meta.values
      .filter((d) => !keys || keys.includes(d.key))
      .flatMap((d) => {
        const current = machine.values[d.key];
        return current
          ? [
              {
                key: d.key,
                name: d.name,
                unit: d.unit,
                value: current.value,
                ts: current.ts,
                gxp: d.gxp,
              },
            ]
          : [];
      });
  }, [machine, keys]);
}
