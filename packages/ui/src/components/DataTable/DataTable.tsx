import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import utils from '../../styles/utils.module.css';
import styles from './DataTable.module.css';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** muted: Zeit u. Ä. · strong: Meldung, Aktion */
  tone?: 'default' | 'muted' | 'strong';
  nowrap?: boolean;
}

export interface DataTableProps<Row> {
  /** Beschreibung der Tabelle (Caption für Screenreader und Name des Scrollbereichs) */
  label: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Mindestbreite, ab der horizontal gescrollt wird: md 600 px · lg 720 px */
  minWidth?: 'md' | 'lg';
}

/** Tabelle mit horizontalem Scrollen auf schmalen Bildschirmen. */
export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  minWidth = 'md',
}: DataTableProps<Row>) {
  return (
    // Scrollbereich muss per Tastatur erreichbar sein (axe: scrollable-region-focusable)
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
      <table className={cx(styles.table, styles[minWidth])}>
        <caption className={utils.srOnly}>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={styles.th}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    styles.td,
                    column.tone && styles[column.tone],
                    column.nowrap && styles.nowrap,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
