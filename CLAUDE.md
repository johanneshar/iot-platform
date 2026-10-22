# IoT-Plattform – Projektleitfaden

> Diese Datei ist der Einstiegspunkt für das Projekt. Sie liegt im Wurzelverzeichnis des Repositories.
> Claude Code liest sie automatisch bei jeder Sitzung. Neue Kolleginnen und Kollegen lesen sie als Erstes.
> Änderungen an Architektur, Konventionen oder Ablauf werden **hier und in `docs/`** nachgezogen.

---

## 1. Worum es geht

Wir entwickeln eine **modulare IoT-Plattform für Pharma-Abfülllinien**. Kunden buchen Module wie aus einem
Baukasten; ein fester Kern ist immer dabei.

| Grundsatzentscheidung                          | Konsequenz                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Siemens Industrial Edge ist der Plattform-Kern | Jedes Modul ist eine Edge App (Docker), verteilt über das Industrial Edge Management (IEM) |
| Ein Edge Device pro Linie                      | Die Linie ist die zentrale Betrachtungsebene (Linien-OEE, Batch über alle Maschinen)       |
| Fremdmaschinen werden eingebunden              | Die Plattform kennt nur das kanonische Datenmodell, nie maschinenspezifische Details       |
| Die Plattform liest nur                        | Kein Modul schreibt in eine Steuerung (Ausnahmen nur per eigenem ADR mit Freigabekonzept)  |

**Abgrenzung:** Die Anbindung von SPS, HMI usw. übernimmt die Automatisierung. Wir entwickeln gegen die
**Schnittstellenspezifikation Maschinendaten** (siehe Abschnitt 5). Alles, was dort nicht definiert ist,
existiert für die Plattform nicht.

**Referenzen (verbindlich):**

- Konzept: _IoT-Plattform – Konzept_ (Claude Docs)
- Schnittstellenspezifikation: _Schnittstellenspezifikation Maschinendaten (Entwurf)_ (Claude Docs)
- UI-Mockup: _IoT-Plattform Mockup_ (Claude Design) – **die Oberfläche wird exakt so umgesetzt**

Lesekopien von Konzept und Spezifikation liegen in `docs/referenz/`. Entscheidungen, die noch nicht in
ADR oder Spezifikation stehen, sowie alle offenen Fragen stehen in `docs/offene-punkte.md`.

---

## 2. Arbeitsweise mit Claude Code

1. **In Meilensteinen arbeiten** (Abschnitt 10). Nie mehrere Meilensteine gleichzeitig.
2. **Vor jedem Meilenstein** einen kurzen Plan vorlegen und auf Freigabe warten.
3. **Jede Architekturentscheidung** wird als ADR in `docs/adr/` festgehalten (Vorlage in Abschnitt 9).
4. **Dokumentation ist Teil der Aufgabe, nicht danach.** Ein Feature ist erst fertig, wenn Code, Tests,
   Entwicklerdoku und Anwenderanleitung aktualisiert sind (Definition of Done, Abschnitt 11).
5. **Keine stillen Annahmen.** Unklare Anforderungen als offene Frage in `docs/offene-punkte.md` eintragen
   und nachfragen.
6. **Kleine, nachvollziehbare Commits** nach Conventional Commits (`feat(alarms): …`, `docs(guide): …`).
7. **Nichts erfinden:** Keine Maschinen-, Alarm- oder Teiledaten außerhalb des Simulators und der
   Beispieldaten in `packages/simulator/fixtures/`.

---

## 3. Technologie-Stack (bestätigt in ADR-001)

| Bereich          | Wahl                                                    | Begründung                                                       |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Sprache          | TypeScript (strict) durchgängig                         | Ein Typensystem für Frontend, Backend und Schnittstellen-Schemas |
| Frontend         | React 18 + Vite                                         | Passt zum HMI-Bedienkonzept, große Verbreitung                   |
| Styling          | CSS-Variablen (Design Tokens) + CSS Modules             | Exakte Umsetzung des Mockups ohne Framework-Eigenheiten          |
| Komponenten-Doku | Storybook                                               | Lebende Komponentenbibliothek, gleichzeitig Schulungsmaterial    |
| Backend je Modul | Node.js + Fastify                                       | Leichtgewichtig, gut in Containern                               |
| Datenzugriff     | MQTT (Databus), optional IIH per REST/GraphQL           | Siemens Industrial Edge                                          |
| Persistenz       | SQLite je Modul (lokal), Audit Trail zentral im Kern    | Edge-tauglich, keine externe DB nötig                            |
| Schemas          | JSON Schema → generierte TS-Typen                       | Eine Quelle der Wahrheit für die Schnittstelle                   |
| Monorepo         | pnpm Workspaces + Turborepo                             | Gemeinsame Pakete, getrennte Builds pro Modul                    |
| Tests            | Vitest (Unit), Playwright (E2E), axe (Barrierefreiheit) |                                                                  |
| Doku-Website     | VitePress aus `docs/`                                   | Markdown im Repo, als Website für Schulungen                     |
| Container        | Docker, docker compose                                  | Grundlage für Edge Apps                                          |
| Edge-Paketierung | Industrial Edge App Publisher bzw. `iectl`              | Siemens-Werkzeuge                                                |
| i18n             | i18next + react-i18next                                 | de/en mit Sprachumschaltung, weitere Sprachen per JSON-Datei     |
| Modul-UIs        | ES-Module + Import-Map (ADR-002)                        | Module werden zur Laufzeit geladen, React/SDK/UI gemeinsam       |
| CI               | GitHub Actions, SBOM (CycloneDX), Dependabot            | Repository auf GitHub, CRA                                       |

Versionen werden fest angegeben. pnpm installiert nur Pakete, die eine Mindestzeit veröffentlicht sind;
Ausnahmen von dieser Frist werden nicht eingetragen.

---

## 4. Architektur

```
Edge Device (eins pro Linie)
├── Siemens: Connectoren · Databus (MQTT) · IIH · Common Configurator
├── core            Edge App – Shell-UI, Modul-Registry, Benutzer & Rollen, Audit Trail, Lizenz
├── normalizer      Edge App – Mapping → kanonische Topics iot/v1/… (siehe Spezifikation)
└── module-*        je eine Edge App pro buchbarem Modul (Dashboard, Alarme, Batch, …)
```

**Prinzipien**

- **Core ist die Shell:** Layout, Navigation, Linienwahl, Anmeldung, Sperrbildschirm „nicht gebucht“,
  Baukasten-Ansicht. Core enthält keine Fachlogik eines Moduls.
- **Module sind eigenständig:** eigenes Backend, eigene UI-Seiten, eigene Datenhaltung. Ein Modul kann
  installiert, aktualisiert oder entfernt werden, ohne andere Module anzufassen.
- **Module registrieren sich beim Core** über ein Manifest (Abschnitt 6). Die Navigation entsteht
  ausschließlich aus den registrierten Manifesten – nichts ist im Core fest verdrahtet.
- **Module sprechen nicht direkt miteinander.** Querverweise (z. B. „Ersatzteil anzeigen“ aus der
  Fehlersuche) laufen über **Deep Links** der Shell: `navigate('spares', { search: 'ET-10233' })`.
  Ist das Zielmodul nicht gebucht, zeigt die Shell den Sperrbildschirm.
- **Fachdaten nur über die Schnittstelle:** Module lesen Maschinendaten ausschließlich über das
  `module-sdk` (Abschnitt 6), nie direkt von Connector-Topics.
- **GxP-relevante Aktionen** (Signatur, Parameteränderung, Formatwechsel-Abschluss) gehen immer über die
  Audit-API des Core. Kein Modul schreibt einen eigenen Audit Trail.
- **Kernbausteine** „Datenkern“ und „Benutzer & Audit Trail“ sind Teil von `apps/core` (+ Normalizer),
  nicht eigene Module.

**Benutzer und Rollen**

Anmeldung lokal oder – wenn vom Kunden gewünscht – über LDAP. Standardrollen: `Operator`, `Maintenance`,
`Setup Man`, `QA`, `Admin`, `IT Admin`. Zusätzlich gibt es in jeder Installation unseren Zugang `Service` mit
allen Rechten. Module buchen darf nur der `Admin` des Kunden; der Lizenzstatus kommt vom IEM.
e-Signatur = erneute Eingabe von Benutzer und Passwort plus Bedeutung. Rechte je Rolle: `apps/core/backend/config/roles.json`
(QA signiert den Batchbericht; Service hat alle Rechte, auch GxP-Signaturen; mehrere Rollen je Benutzer).
Umsetzung: ADR-004.

**Daten außerhalb der Maschinenschnittstelle**

| Daten                                | Quelle                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Fehlerbäume                          | separates System (Anbindung offen)                                       |
| Ersatzteile, Bestand, Lieferzeit     | unser PLM                                                                |
| Formatwechsel-Abläufe                | werden je Format in der Plattform eingerichtet (von uns oder vom Kunden) |
| Komponentenzustand, Ausfallprognosen | berechnet die Plattform aus den Maschinendaten                           |
| Ersatzteilanfragen                   | gehen an ein Ticketsystem                                                |

Bis die Anbindungen stehen, kommen diese Daten ausschließlich aus `packages/simulator/fixtures/`.

**Endgeräte und Zeit:** HMI, Tablet und PC (Touch und Maus). Zeitstempel in UTC speichern, in der Zeitzone
des Maschinenstandorts anzeigen.

---

## 5. Schnittstelle Maschinendaten (Kurzfassung)

Maschinenlesbar und für die Struktur verbindlich: `packages/interface-schema/schemas/` (ADR-003). Der Text
der Spezifikation in Claude Docs (Entwurf 0.2) wird bei jeder Schemaänderung nachgezogen.

- Topics: `iot/v1/{lineId}/{machineId}/{identity|meta|state|counters|alarms|values|batch}`
- Einheitlicher Umschlag: `schema`, `machineId`, `ts` (Quelle, UTC), `tsEdge`, `quality`, `data`
- Konformitätsstufen: `basic`, `standard`, `full` – jedes Modul deklariert seine Mindeststufe
- Zustände nach PackML, Alarme mit stabiler `alarmId`, Prozesswerte nur mit Eintrag im `meta`-Katalog

**Regel:** Ändert sich die Spezifikation, wird zuerst `packages/interface-schema` angepasst, dann der
Simulator, dann die Module. Schemaänderungen brauchen ein ADR.

---

## 6. Modulkonzept – neue Module einfach hinzufügen

### 6.1 Modul-Manifest

Jedes Modul exportiert genau ein Manifest. Der Typ liegt in `packages/module-sdk/src/manifest.ts`:

```ts
export interface ModuleManifest {
  id: string; // 'alarms' – kebab-case, eindeutig, unveränderlich
  version: string; // SemVer des Moduls
  name: { de: string; en: string };
  description: { de: string; en: string };
  category: 'Kern' | 'Produktion' | 'Instandhaltung' | 'Integration';
  core?: boolean; // Kernmodul: immer aktiv, nicht abbestellbar
  gxp: boolean; // GxP-relevant → voller Validierungsumfang
  minConformance: 'basic' | 'standard' | 'full';
  ownMachinesOnly?: boolean; // z. B. Condition Monitoring, Ersatzteile
  nav?: {
    section: 'Linie' | 'Service' | 'Plattform';
    order: number;
    icon: IconName; // aus @iot/ui/icons
    badge?: () => number | null; // z. B. Anzahl aktiver Alarme
  };
  routes: ModuleRoute[]; // Seiten des Moduls
  deepLinks?: Record<string, DeepLinkParams>; // Einsprungpunkte für andere Module
  permissions: Permission[]; // z. B. 'alarms.acknowledge'
}
```

Umgesetzt ist das Manifest in zwei Teilen (ADR-002): `ModuleManifest` ist reines JSON und enthält
zusätzlich `entry` (Adresse des Einstiegsmoduls) und `styles`; das Modul-Backend meldet es beim Start an.
`badge` und die Seitenkomponenten liefert das Einstiegsmodul (`ModuleEntry`). Reservierte IDs:
`baukasten`, `audit`, `core`, `api`, `shared`, `assets`. Optional `nav.label`, wenn die Navigation anders
heißt als das Produkt (z. B. „Linienübersicht“ für „Linien-Dashboard“).

Maschinendaten lesen Module über die Hooks des SDK aus dem Datenkern des Core (ADR-005).

### 6.2 Modul-SDK (`packages/module-sdk`)

Alles, was ein Modul vom System braucht, kommt aus dem SDK – damit sieht jedes Modul gleich aus und
verhält sich gleich:

| Bereich        | API (Beispiele)                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Kontext        | `useLine()`, `useUser()`, `usePermission('alarms.acknowledge')`                                       |
| Maschinendaten | `useMachines()`, `useMachineState(id)`, `useCounters(id)`, `useAlarms(filter)`, `useValues(id, keys)` |
| Navigation     | `navigate(moduleId, params)`, `useDeepLinkParams()`                                                   |
| GxP            | `audit.record({ action, oldValue, newValue, reason })`, `requestSignature({ meaning })`               |
| Lizenz         | `isModuleBooked(id)`                                                                                  |
| UI             | Re-Export aus `@iot/ui` (siehe Abschnitt 7)                                                           |

### 6.3 Neues Modul anlegen (Ablauf)

```bash
pnpm create-module <id> "<Name>" --port <port>   # erzeugt modules/<id>/ aus tooling/module-template
```

Das Template enthält bereits:

```
modules/<id>/
├── manifest.ts              # Manifest ausfüllen
├── frontend/pages/          # Seiten, nur mit @iot/ui-Komponenten
├── backend/                 # Fastify-Service: liefert entry.js aus, meldet das Manifest beim Core an
├── tests/                   # Unit + E2E
├── docs/
│   ├── entwickler.md        # Aufbau, Datenfluss, Entscheidungen
│   ├── anleitung.md         # Bedienanleitung für Anwender (mit Screenshots)
│   └── schulung.md          # Lernziele, Übungen, Prüffragen
├── edge/                    # docker-compose.yml + Edge-App-Metadaten
└── CHANGELOG.md
```

Checkliste für ein neues Modul:

- [ ] Manifest vollständig (inkl. `minConformance` und `gxp`)
- [ ] Nur `@iot/ui`-Komponenten, keine eigenen Farben oder Abstände
- [ ] Daten nur über `module-sdk`
- [ ] Deep Links für andere Module dokumentiert
- [ ] Sperrbildschirm-Text (Beschreibung im Manifest) geprüft
- [ ] Tests grün, Barrierefreiheitsprüfung ohne Fehler
- [ ] `docs/entwickler.md`, `docs/anleitung.md`, `docs/schulung.md` geschrieben
- [ ] Modul in `docs/module/uebersicht.md` eingetragen

---

## 7. Design-System – exakt wie im Mockup

Alle Werte stehen als Tokens in `packages/design-tokens/src/tokens.ts` (daraus erzeugt: `tokens.css`).
**Kein Modul verwendet Werte außerhalb dieser Tokens** – Stylelint lehnt Hex-Farben und Pixelwerte ab.
Die vollständige Liste inklusive der zusätzlichen Mockup-Farben steht in `docs/architektur/design-system.md`.

### 7.1 Farben

| Token                        | Wert                  | Verwendung                                                       |
| ---------------------------- | --------------------- | ---------------------------------------------------------------- |
| `--color-primary`            | `#00847e`             | Petrol: aktive Navigation, Primärbuttons, Haupt-KPI, Fortschritt |
| `--color-primary-dark`       | `#006a65`             | Hover auf Petrol                                                 |
| `--color-primary-tint`       | `#e6f3f2`             | Hinterlegung aktiver Schritte, Erfolgsmeldungen                  |
| `--color-primary-tint-2`     | `#f0f9f8`             | ausgewählte Maschinenkarte                                       |
| `--color-accent`             | `#00ffc1`             | Mint: nur als Fläche/Markierung, **nie als Textfarbe auf Weiß**  |
| `--color-on-accent`          | `#10403c`             | Text auf Mint                                                    |
| `--color-sidebar`            | `#4a4a49`             | Seitenleiste, dunkle Chips                                       |
| `--color-text`               | `#3a3a39`             | Überschriften, Werte                                             |
| `--color-text-body`          | `#4a4a49`             | Fließtext                                                        |
| `--color-text-muted`         | `#5d6463`             | Beschriftungen, Sekundärtext                                     |
| `--color-bg`                 | `#f2f5f5`             | Seitenhintergrund, Kacheln                                       |
| `--color-surface`            | `#ffffff`             | Karten                                                           |
| `--color-border`             | `#dfe5e5`             | Kartenrahmen                                                     |
| `--color-border-subtle`      | `#edf1f1`             | Trennlinien in Listen                                            |
| `--color-control-bg`         | `#eef2f2`             | Segment-Schalter, neutrale Chips                                 |
| `--color-warning-bg` / `-fg` | `#fff0d4` / `#7a4a00` | Warnung, PackML Suspended                                        |
| `--color-fault-bg` / `-fg`   | `#ffe1dc` / `#8a1f14` | Störung, PackML Held                                             |
| `--color-fault`              | `#c8372d`             | Störungspunkt, kritischer Balken                                 |
| `--color-warning`            | `#d98a00`             | Warnpunkt, Warnbalken                                            |

PackML-Zustandschips: `Execute` → Mint/`on-accent`, `Suspended` → Warnung, `Held` → Störung,
`Idle`/`Stopped` → `control-bg`/`text-body`.

### 7.2 Typografie

- Schrift: `'Helvetica Neue LT Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif`
  (Firmenschrift als lokale Webfont einbinden, Lizenz prüfen)

| Rolle                | Größe / Gewicht                                            |
| -------------------- | ---------------------------------------------------------- |
| Seitentitel (Header) | 24 px / 700                                                |
| Kartenüberschrift    | 18 px / 700 (Detailtitel 20–22 px)                         |
| KPI-Wert             | 34 px / 700, Einheit 15 px                                 |
| Fließtext            | 15 px / 400, Zeilenhöhe 1,55                               |
| Tabellen, Listen     | 14 px                                                      |
| Beschriftung, Chips  | 12–13 px; Tabellenkopf 12 px, Versalien, Laufweite 0,06 em |

### 7.3 Layout und Formen

| Element            | Maß                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------- |
| Seitenleiste       | Breite 260 px, Innenabstand 24/16 px, Navigationseintrag min. 44 px hoch, Radius 10 px |
| Header             | Weiß, Innenabstand 18/32 px, Trennlinie unten `--color-border`                         |
| Inhaltsbereich     | Innenabstand 28/32/40 px, max. Breite 1400 px, Abstand zwischen Blöcken 24 px          |
| Karte              | Radius 14 px, Rahmen 1 px, Innenabstand 20–28 px                                       |
| Haupt-KPI          | Petrol-Fläche, unten 4 px Mint-Linie                                                   |
| Button             | min. 44 px hoch (klein: 36 px), Radius 10 px, 15 px / 600                              |
| Chip               | Radius 999 px, 4/10 px, 13 px / 600                                                    |
| Fortschrittsbalken | 8–10 px hoch, Radius halbe Höhe                                                        |
| Fremdmaschine      | Rahmen 1,5 px gestrichelt `#9aa1a0`                                                    |
| Responsiv          | Seitenleiste bricht unter den Inhalt um, Tabellen scrollen horizontal                  |

### 7.4 Komponentenbibliothek `@iot/ui`

Aus dem Mockup abgeleitet, jede Komponente mit Storybook-Story:

`AppShell`, `Sidebar`, `NavItem` (mit Badge und Schloss), `Header`, `LineSwitch`, `Card`, `KpiTile`
(Variante `main`), `Chip`, `StateChip` (PackML), `Button` (`primary`, `outline`, `ghost`, Größe `sm`),
`FilterGroup`, `DataTable`, `ProgressBar`, `StepList` (Formatwechsel, Batch-Verlauf), `MachineCard`,
`LineFlow`, `AlarmItem`, `HealthCard`, `ModuleCard`, `LockedModule`, `SuccessNote`, `Placeholder`
(für Bilder/Videos), `SearchInput`.

Seit M1 zusätzlich: `InfoTile`, `ChoiceButton`, `UserBadge`, `SidebarStatus`, `StepTrail`, `Stack`, `Icon`;
`Button` hat außerdem die Variante `accent` (Mint, aktiver Umschalter). `LineSwitch` ist eine Auswahlliste
(Dropdown), weil Kunden mehr als zwei Linien haben. Feste Texte der Bibliothek stehen
im i18n-Namespace `ui`, den die Shell mit registriert. Storybook läuft auf Port 5182.

**Regel:** Gibt es eine Komponente noch nicht, wird sie in `@iot/ui` gebaut (mit Story und Doku), nicht im
Modul.

---

## 8. Projektstruktur

```
iot-platform/
├── CLAUDE.md                     # diese Datei
├── README.md                     # Schnellstart (3 Befehle bis zur laufenden Plattform)
├── apps/
│   ├── core/
│   │   ├── frontend/             # @iot/core-frontend – Shell-UI (Port 5180)
│   │   └── backend/              # @iot/core-backend – Registry, Auth, Audit, Lizenz (Port 4000)
│   └── normalizer/               # Mapping → kanonische Topics
├── modules/
│   ├── dashboard/  alarms/  batch/  format/
│   ├── condition-monitoring/  predictive-maintenance/
│   ├── troubleshooting/  spares/
│   ├── mes-integration/  data-export/
│   └── remote-service/  energy-monitoring/
├── packages/
│   ├── design-tokens/            # tokens.css + tokens.ts
│   ├── ui/                       # @iot/ui Komponentenbibliothek + Storybook
│   ├── module-sdk/               # Manifest-Typen, Hooks, Navigation, Audit, Lizenz
│   ├── interface-schema/         # JSON Schemas der Schnittstelle + generierte Typen
│   ├── simulator/                # Erzeugt Linien- und Maschinendaten nach Spezifikation
│   └── conformance-checker/      # Prüfwerkzeug für die Automatisierung
├── tooling/
│   ├── module-template/          # Vorlage für pnpm create-module
│   ├── example/                  # Beispielmodul aus der Vorlage (Anleitung, E2E der Shell) – kein Produktmodul
│   └── scripts/                  # dev, create-module, module-dev, dev-line2, serve-static
├── deploy/
│   ├── docker-compose.dev.yml    # Mosquitto + Simulator + Core + alle Module
│   └── edge/                     # Paketierung, iectl-Skripte
└── docs/                         # VitePress-Dokumentation (siehe Abschnitt 9)
```

---

## 9. Dokumentation und Schulung (wird mitgeschrieben)

```
docs/
├── index.md                      # Startseite
├── einstieg/
│   ├── ueberblick.md             # Was ist die Plattform, für wen, Baukasten-Idee
│   ├── entwicklungsumgebung.md   # VS Code, Dev-Container, Simulator starten
│   └── glossar.md                # PackML, OEE, Konformitätsstufe, Edge App, IEM …
├── architektur/
│   ├── uebersicht.md             # Diagramme, Datenfluss
│   ├── schnittstelle.md          # Verweis + Erläuterung der Spezifikation
│   └── gxp.md                    # Audit Trail, Signaturen, Validierungsansatz
├── adr/                          # ADR-001-tech-stack.md, ADR-002-…
├── module/
│   ├── uebersicht.md             # Tabelle aller Module, Kategorie, Mindeststufe, GxP
│   └── <modul>/ → Links auf modules/<id>/docs/*
├── anleitungen/
│   ├── neues-modul.md            # Schritt für Schritt, mit Beispielmodul
│   ├── neue-komponente.md
│   ├── maschine-anbinden.md      # für die Automatisierung: Mapping + Konformitätsprüfung
│   └── deployment-edge.md        # Paketieren, IEM, Virtual Device
├── referenz/                     # Lesekopien von Konzept und Spezifikation (verbindlich: Claude Docs)
├── schulung/
│   ├── entwickler-tag-1.md       # Lernpfad mit Übungen
│   ├── anwender.md               # Bedienung für Kunden/Service
│   └── service.md                # Fehlersuche, Ersatzteile, Remote
└── offene-punkte.md
```

**Regeln für die Doku**

- Jede Seite beginnt mit einem Satz: _Für wen ist das und was kann man danach?_
- Anleitungen sind nummerierte Schritte mit erwartetem Ergebnis pro Schritt.
- Screenshots werden per Playwright aus dem Simulator-Betrieb erzeugt (`pnpm docs:screenshots`),
  damit sie nie veralten.
- Schulungsseiten enthalten Lernziele, Übungen und 3–5 Prüffragen.

**ADR-Vorlage** (`docs/adr/ADR-000-vorlage.md`)

```md
# ADR-XXX: Titel

Status: vorgeschlagen | angenommen | ersetzt durch ADR-YYY
Datum: JJJJ-MM-TT

## Kontext

## Entscheidung

## Alternativen

## Konsequenzen
```

---

## 10. Meilensteine

| Nr. | Ergebnis                                                                                                  | Abnahme                                                          |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| M0  | Monorepo, Linting, Formatierung, CI, Dev-Container, Doku-Gerüst, ADR-001                                  | `pnpm dev` startet leere Shell, `pnpm docs` startet Doku         |
| M1  | Design Tokens + `@iot/ui` mit allen Komponenten aus 7.4 in Storybook                                      | Komponenten pixelgleich zum Mockup                               |
| M2  | `interface-schema` + Simulator (Linie 1 Vials, Linie 2 Spritzen wie im Mockup)                            | Simulator erzeugt schemakonforme Daten                           |
| M3  | Core: Shell, Linienwahl, Modul-Registry, Sperrbildschirm, Baukasten, Audit-API, Rollen                    | Module erscheinen nur per Manifest; Abschalten sperrt Navigation |
| M4  | Modul Linien-Dashboard                                                                                    | entspricht Mockup-Ansicht „Linienübersicht“                      |
| M5  | Module Alarme + Geführte Fehlersuche (inkl. Fehlerbaum-Format)                                            | Alarm → Fehlersuche per Deep Link                                |
| M5a | 3D-Ansicht der Linie (A-01): Modell aus CAD, Alarmmarkierung → Fehlersuche, Klick → Maschinen-Detailseite | Alarm im 3D-Bild markiert, Berühren öffnet die Fehlersuche       |
| M6  | Modul Batch-Reporting inkl. e-Signatur                                                                    | Audit-Einträge über Core                                         |
| M7  | Formatwechsel, Ersatzteilkatalog                                                                          | Deep Links aus Fehlersuche/Instandhaltung                        |
| M8  | Condition Monitoring, Predictive Maintenance                                                              |                                                                  |
| M9  | Normalizer + Konformitätsprüfer                                                                           | Prüfbericht für eine echte Maschine                              |
| M10 | Edge-Paketierung, Deployment auf Virtual Device über IEM                                                  | Alle Apps laufen auf dem Virtual Device                          |
| M11 | Module Integration MES/ERP, Datenexport (Data Act)                                                        |                                                                  |
| M12 | Module Remote-Service, Energie-Monitoring                                                                 |                                                                  |

Jeder Meilenstein endet mit: Doku aktualisiert, Changelog, kurze Demo-Notiz in `docs/changelog.md`.

---

## 11. Definition of Done

- [ ] Code typisiert (kein `any`), Lint und Format ohne Fehler
- [ ] Unit-Tests für Logik, E2E-Test für den Hauptablauf des Features
- [ ] Barrierefreiheit: axe ohne Fehler, Bedienung per Tastatur, Kontrast ≥ 4,5:1
- [ ] Optik mit Mockup abgeglichen (Screenshot-Vergleich in Storybook/Playwright)
- [ ] Texte über i18n-Schlüssel (de/en), keine festen Strings in Komponenten
- [ ] GxP-Aktionen über Audit-API, Zeitstempel in UTC
- [ ] Entwickler-, Anwender- und ggf. Schulungsdoku aktualisiert
- [ ] Changelog-Eintrag

---

## 12. Konventionen

- **Namen:** Code, Dateien und Bezeichner auf Englisch; UI-Texte und Doku auf Deutsch (en als zweite Sprache).
- **Dateien:** Komponenten `PascalCase.tsx`, Hooks `useXyz.ts`, sonst `kebab-case.ts`.
- **Ordner pro Feature**, nicht pro Typ (`alarms/AlarmList.tsx`, `alarms/useAlarmFilter.ts`, `alarms/AlarmList.test.tsx`).
- **Keine Magic Numbers** in UI-Code – nur Tokens.
- **Fehlerbehandlung:** Datenqualität `bad`/`uncertain` wird in der UI sichtbar markiert, nie verschluckt.
- **Sicherheit:** keine Secrets im Repo, Zertifikate über die interne PKI, Abhängigkeiten mit SBOM (CRA).

---

## 13. Lokale Entwicklung

```bash
# Voraussetzungen: Node.js 22 LTS, pnpm 12, Docker Desktop, VS Code mit Dev-Containers-Erweiterung
pnpm install
pnpm dev            # startet MQTT-Broker, Simulator, Core und alle Module
pnpm storybook      # Komponentenbibliothek (Port 5182)
pnpm docs           # Dokumentation als Website (Port 5181)
pnpm test           # alle Unit-Tests
pnpm test:e2e       # E2E + axe (Playwright)
```

Port 5173 ist auf dem Entwicklungsrechner belegt; die Shell läuft deshalb auf 5180. Weitere Ports:
Backend 4000, Beispielmodul 4100, zweite Linie 4001/5190 (`pnpm dev:line2`), Storybook 5182, Doku 5181,
E2E-Tests 4010/4110/5185.

Im Dev-Betrieb ersetzt ein lokaler Mosquitto-Broker den Databus. Der Simulator erzeugt die Daten aus dem
Mockup (Linie 1 Vials, Linie 2 Spritzen), damit Entwicklung ohne Maschine und ohne Edge Device möglich ist.

---

## 14. Stand

M0 bis M4 sind abgeschlossen (siehe `docs/changelog.md`). Nächster Schritt: Plan für **M5** (Alarme und
geführte Fehlersuche) vorlegen und auf Freigabe warten.
