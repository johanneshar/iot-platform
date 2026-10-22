import { NAV_SECTIONS, type ModuleEntry } from '@iot/module-sdk';
import type { SidebarSection } from '@iot/ui';
import type { ShellModule } from '../api';
import { localized } from '../localized';
import { CATALOG_ROUTE } from '../router';

type NavEntry = SidebarSection['items'][number];

interface NavOptions {
  modules: readonly ShellModule[];
  entries: ReadonlyMap<string, ModuleEntry>;
  activeId: string;
  language: string;
  sectionLabel: (section: string) => string;
  catalogLabel: string;
  go: (moduleId: string) => void;
}

/**
 * Navigation ausschließlich aus den angemeldeten Manifesten (CLAUDE.md, Abschnitt 4). Nicht gebuchte
 * Module erscheinen mit Schloss. Einzige feste Seite ist der Baukasten des Core.
 */
export function buildSections({
  modules,
  entries,
  activeId,
  language,
  sectionLabel,
  catalogLabel,
  go,
}: NavOptions): SidebarSection[] {
  const withNav = modules.filter((m) => m.installed && m.manifest?.nav);
  const sections = NAV_SECTIONS.map((section): SidebarSection & { items: NavEntry[] } => ({
    id: section,
    label: sectionLabel(section),
    items: withNav
      .filter((m) => m.manifest?.nav?.section === section)
      .sort((a, b) => (a.manifest?.nav?.order ?? 0) - (b.manifest?.nav?.order ?? 0))
      .map((m): NavEntry => ({
        id: m.id,
        icon: m.manifest?.nav?.icon ?? 'overview',
        label: localized(m.name, language),
        active: activeId === m.id,
        locked: !m.booked,
        badge: m.booked ? (entries.get(m.id)?.badge?.() ?? null) : null,
        onClick: () => {
          go(m.id);
        },
      })),
  }));

  const booked = modules.filter((m) => m.booked).length;
  const platform = sections.find((s) => s.id === 'Plattform');
  const catalog: NavEntry = {
    id: CATALOG_ROUTE,
    icon: 'modules',
    label: catalogLabel,
    active: activeId === CATALOG_ROUTE,
    locked: false,
    badge: `${String(booked)}/${String(modules.length)}`,
    badgeTone: 'subtle',
    onClick: () => {
      go(CATALOG_ROUTE);
    },
  };
  platform?.items.push(catalog);

  return sections.filter((s) => s.items.length > 0);
}

/** Startseite: erster gebuchter Navigationseintrag, sonst der Baukasten. */
export function homeModuleId(modules: readonly ShellModule[]): string {
  const first = NAV_SECTIONS.flatMap((section) =>
    modules
      .filter((m) => m.installed && m.booked && m.manifest?.nav?.section === section)
      .sort((a, b) => (a.manifest?.nav?.order ?? 0) - (b.manifest?.nav?.order ?? 0)),
  )[0];
  return first?.id ?? CATALOG_ROUTE;
}
