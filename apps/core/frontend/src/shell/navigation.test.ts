import type { ModuleEntry, ModuleManifest } from '@iot/module-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { ShellModule } from '../api';
import { buildSections, homeModuleId } from './navigation';

const manifest = (
  id: string,
  section: 'Linie' | 'Service' | 'Plattform',
  order: number,
): ModuleManifest => ({
  id,
  version: '1.0.0',
  name: { de: id },
  description: { de: id },
  category: 'Produktion',
  gxp: false,
  minConformance: 'basic',
  nav: { section, order, icon: 'overview' },
  routes: [{ path: '', title: { de: id } }],
  permissions: [],
  entry: `http://localhost/${id}.js`,
});

const mod = (id: string, booked: boolean, m?: ModuleManifest): ShellModule => ({
  id,
  category: 'Produktion',
  name: { de: `Name ${id}`, en: `Name EN ${id}` },
  description: { de: id },
  core: false,
  gxp: false,
  booked,
  installed: m !== undefined,
  ...(m ? { manifest: m } : {}),
});

const modules = [
  mod('alarms', true, manifest('alarms', 'Linie', 20)),
  mod('dashboard', true, manifest('dashboard', 'Linie', 10)),
  mod('spares', false, manifest('spares', 'Service', 10)),
  mod('batch', true), // gebucht, aber nicht installiert
];

const build = (entries = new Map<string, ModuleEntry>(), activeId = '') =>
  buildSections({
    modules,
    entries,
    activeId,
    language: 'de',
    sectionLabel: (s) => `Abschnitt ${s}`,
    catalogLabel: 'Baukasten',
    go: vi.fn(),
  });

describe('Navigation', () => {
  it('zeigt nur installierte Module, sortiert nach Abschnitt und Reihenfolge', () => {
    const sections = build();
    expect(sections.map((s) => [s.id, s.items.map((i) => i.id)])).toEqual([
      ['Linie', ['dashboard', 'alarms']],
      ['Service', ['spares']],
      ['Plattform', ['baukasten']],
    ]);
  });

  it('sperrt nicht gebuchte Module', () => {
    const spares = build()
      .flatMap((s) => s.items)
      .find((i) => i.id === 'spares');
    expect(spares?.locked).toBe(true);
  });

  it('zeigt den Zähler aus dem Einstiegsmodul', () => {
    const entries = new Map<string, ModuleEntry>([['alarms', { pages: {}, badge: () => 3 }]]);
    const alarms = build(entries)
      .flatMap((s) => s.items)
      .find((i) => i.id === 'alarms');
    expect(alarms?.badge).toBe(3);
  });

  it('zählt gebuchte Module im Baukasten', () => {
    const catalog = build()
      .flatMap((s) => s.items)
      .find((i) => i.id === 'baukasten');
    expect(catalog?.badge).toBe('3/4');
  });

  it('markiert den aktiven Eintrag', () => {
    const active = build(new Map(), 'alarms')
      .flatMap((s) => s.items)
      .filter((i) => i.active);
    expect(active.map((i) => i.id)).toEqual(['alarms']);
  });
});

describe('Startseite', () => {
  it('ist der erste gebuchte Eintrag', () => {
    expect(homeModuleId(modules)).toBe('dashboard');
  });

  it('ist der Baukasten, wenn nichts gebucht ist', () => {
    expect(homeModuleId([mod('spares', false, manifest('spares', 'Service', 10))])).toBe(
      'baukasten',
    );
  });
});
