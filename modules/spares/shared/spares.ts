/** Ersatzteilkatalog (schemas/catalog.schema.json) und Anfragen an den Service (E-16). */
export type Text = { de: string } & Record<string, string>;

export interface Part {
  /** Teilenummer aus dem PLM, z. B. „ET-10233“ */
  id: string;
  name: Text;
  /** Baugruppe, z. B. „Dosierung“ */
  group: string;
  /** Maschinen der Linie, in denen das Teil verbaut ist */
  machines: string[];
  stock: number;
  /** Lieferzeit in Tagen; `null` = keine Angabe (z. B. Formatteile) */
  leadDays: number | null;
}

export interface Catalog {
  lineId: string;
  groups: string[];
  parts: Part[];
}

/** Maschine, wie das Backend sie aus `identity` und `state` kennt */
export interface MachineInfo {
  machineId: string;
  name: string;
  own: boolean;
  serial: string | null;
  state: string | null;
}

export interface CatalogResponse extends Catalog {
  machines: MachineInfo[];
}

export interface RequestItem {
  id: string;
  name: string;
}

export interface SpareRequest {
  /** Vorgangsnummer der Plattform, bis das Ticketsystem angebunden ist (O-03) */
  ticket: string;
  createdAt: string;
  username: string;
  userName: string;
  lineId: string;
  machine: MachineInfo | null;
  items: RequestItem[];
  /** Übermittlung an das Ticketsystem (O-03): bis dahin `pending` im Postausgang */
  delivery: 'pending';
}
