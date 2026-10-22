import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';
import type { AuditRef, BatchReport, BatchSummary, ReportMachine } from '../shared/batch';

const require = createRequire(import.meta.url);
// PDF/A verlangt eingebettete Schriften; DejaVu Sans (freie Lizenz) bis die Firmenschrift geklärt ist (O-10)
const FONT = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const FONT_BOLD = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');

// Farben des Design-Systems (packages/design-tokens) – im PDF als feste Werte
const TEXT = '#3a3a39';
const MUTED = '#5d6463';
const PRIMARY = '#00847e';
const FAULT = '#8a1f14';
const RULE = '#dfe5e5';

const MARGIN = 50;

const dateTime = (iso: string | null, timeZone: string) =>
  iso === null
    ? '—'
    : new Intl.DateTimeFormat('de-DE', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));

const num = (value: number | null, digits = 3) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(value);

const STATUS: Record<BatchSummary['status'], string> = {
  running: 'läuft',
  ended: 'beendet – Linienräumung offen',
  frozen: 'eingefroren – Prüfung offen',
  reviewed: 'geprüft – Freigabe offen',
  released: 'freigegeben',
};

/**
 * Batchbericht als PDF/A-2b (E-44, ADR-011): aus dem eingefrorenen Bericht, mit Hash und den Signaturen
 * aus dem Audit Trail. Zeiten in Ortszeit der Linie, Hash und Nummern im Audit Trail zum Nachprüfen.
 */
export function renderReportPdf(report: BatchReport, batch: BatchSummary): Promise<Buffer> {
  const tz = report.line.timeZone;
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    pdfVersion: '1.7',
    subset: 'PDF/A-2b',
    font: FONT,
    lang: 'de-DE',
    displayTitle: true,
    bufferPages: true,
    info: {
      Title: `Batchbericht ${report.batchId}`,
      Subject: `${report.line.name} · Rezept ${report.recipe.id} v${String(report.recipe.version)}`,
      Author: 'IoT-Plattform – Batch-Reporting',
      Keywords: batch.reportHash ?? '',
    },
  });
  doc.registerFont('regular', FONT);
  doc.registerFont('bold', FONT_BOLD);
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  const width = doc.page.width - 2 * MARGIN;
  const heading = (text: string, size = 13) => {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.moveDown(0.8).font('bold').fontSize(size).fillColor(TEXT).text(text);
    doc.moveDown(0.3);
  };
  const line = (label: string, value: string) => {
    doc.font('regular').fontSize(9.5).fillColor(MUTED).text(`${label}: `, { continued: true });
    doc.fillColor(TEXT).text(value);
  };
  const rule = () => {
    doc
      .moveTo(MARGIN, doc.y + 2)
      .lineTo(MARGIN + width, doc.y + 2)
      .strokeColor(RULE)
      .lineWidth(0.8)
      .stroke();
    doc.moveDown(0.4);
  };
  /** Einfache Tabelle; Spaltenbreiten als Anteile der Seitenbreite */
  const table = (headers: string[], rows: string[][], shares: number[]) => {
    const widths = shares.map((s) => s * width);
    const draw = (cells: string[], bold: boolean) => {
      if (doc.y > doc.page.height - 80) doc.addPage();
      const y = doc.y;
      let x = MARGIN;
      let height = 0;
      cells.forEach((cell, i) => {
        const w = widths[i] ?? 60;
        doc
          .font(bold ? 'bold' : 'regular')
          .fontSize(8.5)
          .fillColor(bold ? MUTED : TEXT)
          .text(cell, x, y, { width: w - 6 });
        height = Math.max(height, doc.y - y);
        x += w;
      });
      doc.x = MARGIN;
      doc.y = y + height + 3;
    };
    draw(headers, true);
    rule();
    for (const row of rows) draw(row, false);
    doc.moveDown(0.3);
  };
  const ref = (label: string, r: (AuditRef & { afterStart?: boolean }) | null) => {
    line(
      label,
      r
        ? `${r.userName} (${r.username}) · ${dateTime(r.ts, tz)} · Audit Trail Nr. ${String(r.seq)}${
            r.afterStart ? ' · erteilt nach Batchstart' : ''
          }`
        : 'fehlt',
    );
  };

  // Kopf
  doc.font('bold').fontSize(20).fillColor(TEXT).text(`Batchbericht ${report.batchId}`);
  doc
    .font('regular')
    .fontSize(10)
    .fillColor(MUTED)
    .text(`${report.line.name} · Status: ${STATUS[batch.status]}`);
  doc.moveDown(0.6);
  line('Produkt', report.productName ?? '—');
  line('Rezept', `${report.recipe.id} · Version ${String(report.recipe.version)}`);
  line(
    'Sollmenge',
    report.targetQuantity === null ? '—' : `${num(report.targetQuantity, 0)} Stück`,
  );
  line('Formatteile', report.formatParts.length ? report.formatParts.join(', ') : '—');
  line('Start', dateTime(report.startedAt, tz));
  line('Ende', dateTime(report.endedAt, tz));
  line('Zeitzone', `${tz} (gespeichert in UTC)`);
  line('Bericht erzeugt', dateTime(report.generatedAt, tz));
  line('Bericht-Hash', batch.reportHash ?? '—');

  heading('Ablauf und Signaturen');
  ref('Linienfreigabe (e-Signatur, Bedeutung „Linienfreigabe“)', report.lineRelease);
  ref('Linienräumung bestätigt', report.clearance);
  ref('Geprüft (e-Signatur)', batch.review);
  ref('Freigabe (e-Signatur)', batch.release);
  doc
    .moveDown(0.3)
    .font('regular')
    .fontSize(8.5)
    .fillColor(MUTED)
    .text(
      'Die Signaturen „Geprüft“ und „Freigabe“ beziehen sich auf den Bericht-Hash oben (Vier-Augen-Prinzip). ' +
        'Sie stehen mit Benutzer, Bedeutung und Zeit im Audit Trail der Plattform (21 CFR Part 11 / EU GMP Annex 11).',
      { width },
    );

  const machine = (m: ReportMachine) => {
    heading(m.name, 12);
    doc
      .font('regular')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${m.machineId}${m.source ? ` · ${m.source}` : ''}`);
    doc.moveDown(0.3);
    line(
      'Mengen',
      `${num(m.counts.good, 0)} gut · ${num(m.counts.bad, 0)} schlecht · ${num(m.counts.total, 0)} gesamt`,
    );
    if (m.counts.implausible > 0) {
      doc
        .font('bold')
        .fontSize(9)
        .fillColor(FAULT)
        .text(
          `${String(m.counts.implausible)} unplausible Zählersprünge nicht gezählt – Datenquelle prüfen.`,
        );
    }
    line('Ereignisse', m.events.map((e) => `${e.event} ${dateTime(e.ts, tz)}`).join(' · ') || '—');

    doc.moveDown(0.3).font('bold').fontSize(10).fillColor(TEXT).text('GxP-relevante Prozesswerte');
    doc.moveDown(0.2);
    if (m.values.length === 0) {
      doc
        .font('regular')
        .fontSize(9)
        .fillColor(MUTED)
        .text('Keine GxP-relevanten Werte im Wertekatalog.');
    } else {
      table(
        ['Wert', 'Anzahl', 'Min', 'Max', 'Ø', 'Grenzen', 'außerhalb', 'unsicher / ungültig'],
        m.values.map((v) => [
          `${v.name.de} [${v.unit}]`,
          num(v.count, 0),
          num(v.low),
          num(v.high),
          num(v.avg),
          v.min === null && v.max === null ? '—' : `${num(v.min)} – ${num(v.max)}`,
          num(v.outOfLimits, 0),
          `${num(v.uncertain, 0)} / ${num(v.bad, 0)}`,
        ]),
        [0.22, 0.08, 0.09, 0.09, 0.09, 0.15, 0.13, 0.15],
      );
    }

    doc.font('bold').fontSize(10).fillColor(TEXT).text('Alarme im Batch');
    doc.moveDown(0.2);
    if (m.alarms.length === 0) doc.font('regular').fontSize(9).fillColor(MUTED).text('Keine.');
    else
      table(
        ['Alarm', 'Klasse', 'Gekommen', 'Gegangen'],
        m.alarms.map((a) => [
          `${a.text?.de ?? a.alarmId} (${a.alarmId})`,
          a.class === 'fault' ? 'Störung' : a.class === 'warning' ? 'Warnung' : 'Info',
          dateTime(a.raisedAt, tz),
          dateTime(a.clearedAt, tz),
        ]),
        [0.46, 0.12, 0.21, 0.21],
      );

    doc.font('bold').fontSize(10).fillColor(TEXT).text('Datenlücken');
    doc.moveDown(0.2);
    if (m.gaps.length === 0) doc.font('regular').fontSize(9).fillColor(MUTED).text('Keine.');
    else
      for (const g of m.gaps)
        doc
          .font('regular')
          .fontSize(9)
          .fillColor(FAULT)
          .text(`${dateTime(g.from, tz)} – ${dateTime(g.to, tz)}: keine Daten der Maschine`);
  };
  heading('Maschinen');
  report.machines.forEach(machine);

  // Fußzeile auf jeder Seite: Batch, Hash, Seite
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 35;
    doc.page.margins.bottom = 0;
    doc
      .font('regular')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        `Batchbericht ${report.batchId} · ${batch.reportHash ?? ''} · Seite ${String(i + 1)} von ${String(range.count)}`,
        MARGIN,
        bottom,
        { width, align: 'center', lineBreak: false },
      );
  }
  doc.fillColor(PRIMARY);
  doc.end();
  return done;
}
