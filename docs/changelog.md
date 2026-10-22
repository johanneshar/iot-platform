# Changelog

Für alle im Projekt: Was mit jedem Meilenstein fertig wurde, mit kurzer Demo-Notiz.

## M4 – Linien-Dashboard (2026-10-22)

**Neu**

- Datenkern im Core: Linienmodell aus dem Databus, nur schemakonforme Nachrichten, Verlauf der Schicht,
  Live-Daten per Server-Sent Events ([ADR-005](/adr/ADR-005-datenzugriff))
- `module-sdk`: `useMachines`, `useAlarms`, `useValues` u. a.; `findBottleneck`, `lineState`, `currentShift`
- Modul `dashboard`: Linienübersicht nach Mockup mit OEE (E-27), Engpass (E-28), Datenqualität, Deep Links
- Shell: Zustand der Linie im Kopf; Manifest-Feld `nav.label`
- Schichtmodell und OEE-Ziel in der Linienkonfiguration (E-29)
- E2E Simulator → Core → Dashboard mit MQTT-Broker im Testprozess (ohne Docker)

**Demo**

1. Docker Desktop starten, `pnpm dev`, als `operator` anmelden.
2. „Linienübersicht“: Maschinen von Linie 1 aus dem Simulator, Engpass Füll- und Verschließmaschine, drei
   anstehende Alarme; Kennzahlen erscheinen nach wenigen Sekunden.

## M3b – Benutzer, Rollen, Audit Trail, e-Signatur (2026-10-22)

**Neu**

- Anmeldung am Core mit lokalen Benutzern; Sperre nach 5 Fehlversuchen; LDAP vorbereitet
- Rollen und Rechte aus `config/roles.json` inkl. neuer Rolle QA; serverseitige Prüfung, Oberfläche blendet aus
- Audit Trail: nur Anhängen, Hash-Kette mit Prüfung, Trigger gegen Ändern und Löschen; Seite „Audit Trail“
- e-Signatur mit erneuter Eingabe von Benutzer und Passwort und Pflicht-Bedeutung
- `module-sdk`: `useUser`, `usePermission`, `useAudit`, `useRequestSignature`
- `@iot/ui`: `LoginForm`, `SignatureDialog`
- Registry nur mit Dienst-Token; Benutzer-API für `core.users.manage`
- [ADR-004](/adr/ADR-004-anmeldung-audit-signatur), [Rollen und Rechte](/architektur/rollen-rechte)

**Demo**

1. `pnpm dev`, als `operator` anmelden (Passwort `entwicklung`) → Baukasten: Buchen gesperrt, kein Audit Trail.
2. Als `service` anmelden → Beispielmodul → „Beispiel signieren“ → Signatur mit Passwort.
3. „Audit Trail“ öffnen → Eintrag mit „Signatur: Freigabe“, Kette unversehrt.

## M3a – Shell und Modul-Registry (2026-10-22)

**Neu**

- `module-sdk`: Modul-Manifest (statischer Teil und Einstiegsmodul), `validateManifest()`, Shell-Kontext mit
  `useLine`, `useNavigate`, `useDeepLinkParams`, `useIsModuleBooked`
- Core-Backend: Registry, Produktkatalog des Baukastens, Lizenzspeicher (SQLite) hinter einer Schnittstelle
  bis zur IEM-Anbindung, Standortkonfiguration der Linien
- Shell: Navigation nur aus Manifesten, Sperrbildschirm, Baukasten mit Kategoriefilter, Linienwahl zum Core
  der anderen Linie, Sprachumschaltung; Module werden per ES-Modul und Import-Map geladen
  ([ADR-002](/adr/ADR-002-modul-einbindung) angenommen)
- `pnpm create-module` mit Vorlage; Beispielmodul `tooling/example`
- E2E-Tests der Shell mit axe; `pnpm dev:line2` für die zweite Linie

**Demo**

1. `pnpm dev` → <http://localhost:5180> zeigt das Beispielmodul in der Navigation.
2. Baukasten öffnen, beim Beispielmodul „Aktiv – deaktivieren“ → Schloss in der Navigation, Sperrbildschirm.
3. „Modul aktivieren“ → Seite erscheint wieder.

## M2 – Schnittstellen-Schema und Simulator (2026-10-22)

**Neu**

- `@iot/interface-schema`: JSON Schemas (Draft 2020-12) für Umschlag und alle sieben Datenklassen,
  daraus erzeugte TypeScript-Typen, Prüfer `validateMessage()` und Topic-Hilfen
- Spezifikation Entwurf 0.2 mit S-02 bis S-06 ([ADR-003](/adr/ADR-003-schnittstelle-v0-2))
- `@iot/simulator`: veröffentlicht Linie 1 · Vials und Linie 2 · Spritzen aus dem Mockup über MQTT, je
  Maschine passend zu ihrer Konformitätsstufe; startet mit `pnpm dev`
- Tests: jede Nachricht des Simulators ist schemakonform; Stufen, Zählerverlauf, Zeitumrechnung
- Doku: [Simulator nutzen](/anleitungen/simulator) mit allen Annahmen, Schnittstellen-Seite ausgebaut

**Demo**

1. Docker Desktop starten, `pnpm dev`
2. `docker exec -it iot-dev-mosquitto-1 mosquitto_sub -t 'iot/v1/#' -v` → Nachrichten beider Linien, Zähler
   alle 5 s

## M1 – Design Tokens und @iot/ui (2026-10-21)

**Neu**

- `@iot/design-tokens`: alle Werte des Mockups als Tokens in `tokens.ts`, daraus erzeugt `tokens.css`
- `@iot/ui`: 23 Komponenten aus CLAUDE.md 7.4 plus `InfoTile`, `ChoiceButton`, `UserBadge`,
  `SidebarStatus`, `StepTrail`, `Stack`, `Icon`; feste Texte auf Deutsch und Englisch
- Storybook (`pnpm storybook`, Port 5182) mit 78 Stories, Sprachumschaltung und a11y-Addon
- Gesamtansichten „Linienübersicht“ und „Sperrbildschirm“ zum Abgleich mit dem Mockup
- Beispieldaten des Mockups in `packages/simulator/fixtures/mockup.ts`
- Stylelint erzwingt Tokens: keine Hex-Farben, keine Pixelwerte im CSS
- axe-Prüfung jeder Story in Deutsch und Englisch (Playwright, auch in der CI)
- Doku: [Design-System](/architektur/design-system), [Neue Komponente](/anleitungen/neue-komponente)

**Abnahme 2026-10-22:** Optik abgenommen. Bestätigte Abweichungen vom Mockup: volle Deckkraft der
Haupt-KPI-Texte und dunkler Zähler im aktiven Navigationseintrag (Kontrast), sichtbarer Fokus, Linienwahl als
Auswahlliste statt Segment-Schalter (mehr als zwei Linien).

- Referenzbilder aller Stories; die CI meldet jede optische Abweichung

**Demo**

1. `pnpm storybook` → <http://localhost:5182>
2. „Ansichten › Mockup-Abgleich › Linienübersicht“ öffnen und neben das Mockup legen; Maschinen anklicken.
3. In der Werkzeugleiste „Sprache“ auf English stellen → feste Texte der Komponenten wechseln.

## M0 – Gerüst (2026-10-21)

**Neu**

- Monorepo mit pnpm Workspaces und Turborepo, TypeScript strict, ESLint, Prettier
- Conventional Commits über commitlint und lefthook
- Leere Shell (`apps/core/frontend`) mit Sprachumschaltung Deutsch/Englisch
- Core-Backend (`apps/core/backend`) mit `/api/health`
- i18n-Grundgerüst im `module-sdk`
- Paketgerüste für Design Tokens, UI, Schnittstellen-Schema, Simulator, Konformitätsprüfer, Normalizer
- Lokaler MQTT-Broker (Mosquitto) per docker compose, Dev-Container
- CI mit GitHub Actions: Format, Lint, Typecheck, Unit-Tests, Build, Doku-Build, E2E mit axe, SBOM
- Doku-Gerüst mit VitePress, ADR-001 (Tech-Stack), ADR-002 (Modul-Einbindung, vorgeschlagen)

**Demo**

1. `pnpm install && pnpm dev` → Shell unter <http://localhost:5180> zeigt „Noch keine Module registriert.“
2. Sprache auf „English“ stellen → Titel wechselt auf „IoT Platform“; die Wahl bleibt nach dem Neuladen erhalten.
3. `pnpm docs` → Doku unter <http://localhost:5181>.
