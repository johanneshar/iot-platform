import type {
  AlarmData,
  BatchData,
  CountersData,
  Envelope,
  IdentityData,
  MetaData,
  StateData,
  ValuesData,
} from './generated/types';
import type { DataClass } from './topics';

/** Inhalt von `data` je Datenklasse. */
export interface DataByClass {
  identity: IdentityData;
  meta: MetaData;
  state: StateData;
  counters: CountersData;
  alarms: AlarmData;
  values: ValuesData;
  batch: BatchData;
}

/** Vollständige Nachricht einer Datenklasse: Umschlag mit typisiertem `data`. */
export type Message<C extends DataClass> = Omit<Envelope, 'data'> & { data: DataByClass[C] };
