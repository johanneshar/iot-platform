# Changelog

Für alle im Projekt: Was mit jedem Meilenstein fertig wurde, mit kurzer Demo-Notiz.

## Nach M6: nur noch Linie 3 · Flexfill (2026-10-22)

- Simulator, Core und Tests laufen nur noch mit Linie 3 · Flexfill (E-47); Linien 1 und 2 bleiben als
  Mockup-Daten in Storybook
- Neu: Isolator als Fremdmaschine der Stufe Basis vor dem Beutelauspacker, im 3D-Modell zugeordnet; Alarm
  `CAP-INF-0001` „Einlauf: keine Vials“ am Bördelmodul
- Module übernehmen die Linie vom Core (`fetchLineConfig`); `pnpm dev:line2` und `pnpm dev:line3` entfallen
- E2E-Test der Linienwahl entfällt (die Funktion bleibt)
- Bestätigt: Annahmen der Flexfill (E-48) und Rechte im Batch (E-49)

**Demo:** `pnpm dev` neu starten, <http://localhost:5180> öffnen – die Linienübersicht zeigt die sechs
Maschinen der Flexfill, der Isolator ist als „Fremd · Basis“ markiert.

## Nach M6: Schnittstelle Entwurf 0.4 (2026-10-22)

- `batch` retained mit `startedAt`, neue Datenklasse `activeAlarms` (retained), `productName` und
  `targetQuantity` in Batch-Meldungen ([ADR-012](/adr/ADR-012-retained-alarme-batch); E-45, E-46)
- Datenkern übernimmt `activeAlarms` als Stand; Alarm-, Dashboard- und Batch-Modul gleichen ihren Verlauf ab
- Batch-Reporting: Produktname und Fortschritt wie im Mockup; verpasste Batch-Starts werden nachgetragen
- Simulator: Wiederholung der Alarme entfällt

## M6 – Batch-Reporting mit e-Signatur (2026-10-22)

**Neu**

- Modul `batch` (GxP): Batchdaten aller Maschinen der Linie, GxP-Rohwerte mit Quellzeitstempel und Qualität,
  Datenlücken; Seite nach Mockup mit Verlauf, Audit Trail des Batches, Batchbericht und Liste der Batches
- Ablauf: Linienfreigabe (e-Signatur QA) → Linienräumung → Bericht eingefroren → „Geprüft“ → „Freigabe“ im
  Vier-Augen-Prinzip (E-40, E-41); Signaturen an den Bericht-Hash gebunden ([ADR-011](/adr/ADR-011-batchbericht))
- Bericht als PDF/A-2b mit eingebetteter Schrift (E-44)
- Core: Audit-Einträge mit Bezug (`reference`), Lesen für Modul-Backends, Export des Audit Trail als Datei
- SDK: `useAudit().record` liefert die laufende Nummer; `fetchAudit`, `fetchAuditEntry`
- Simulator: Batch-Zyklus (15 min Lauf, 2 min Pause, Zählerreset), in Tests verkürzbar
- `create-module` legt eine passende README im Modul an (statt der Beschreibung der Vorlage)

**Demo**

1. `pnpm dev` (neu starten, damit Modul und Simulator-Zyklus laufen); als `qa` die Linie freigeben.
2. Nach Batchende als `operator` die Linienräumung bestätigen, als `setup` prüfen, als `qa` freigeben.
3. „Bericht als PDF exportieren“ – PDF/A mit Hash und Signaturen.

## M5a-2 – 3D-Ansicht (2026-10-22)

**Neu**

- `@iot/ui`: `ModelViewer` mit three.js (nachgeladen), Markierungen und Maschinennamen als Schaltflächen
- Dashboard: „Linie in 3D“ über dem Linienfluss und 3D-Ansicht auf der Detailseite; Markierung → Fehlersuche,
  Maschine → Detailseite; ohne Modell nur der Linienfluss ([ADR-010](/adr/ADR-010-3d-ansicht))
- Zuordnungsdatei `*.model.json` mit Schema; Namensregel für CAD-Exporte ([Anleitung](/anleitungen/3d-modell))
- Simulator: Linie 3 · Flexfill (Annahmen O-28) mit Blockmodell; anstehende Alarme werden alle 30 s
  wiederholt (O-25); `pnpm dev:line3`
- Core: eine wiederholte Meldung „kommt“ ändert einen anstehenden Alarm nicht

**Behoben**

- OEE und Leistung weit über 100 %, wenn zwei Quellen dieselbe Maschine mit unterschiedlichen Zählerständen
  melden (z. B. zwei Simulatoren): Rücksprünge ohne neuen Reset und unmögliche Sprünge werden nicht mehr
  gezählt (`counterStep`), die Detailseite weist auf unplausible Zählerstände hin

**Demo**

1. `pnpm dev`, dann in einem zweiten Terminal `pnpm dev:line3`; <http://localhost:5195> als `maintenance`.
2. „Linie in 3D“: Markierung „Wägezelle 3“ antippen → Fehlerbaum.
3. Maschinennamen „Transfermodul“ antippen → Detailseite mit Fokus; der Roboteralarm ist ohne Fehlerbaum nicht
   markiert.

## M5a-1 – Maschinen-Detailseite (2026-10-22)

**Neu**

- Entwürfe in Claude Design abgenommen: „M5a · Linienübersicht mit 3D-Ansicht“ und „M5a · Maschinendetail“
  (A-01.5, A-01.11)
- Dashboard: Detailseite je Maschine mit Kennzahlen, Zustandsverlauf, Stillständen samt Ursache, Leistung
  und Ausschuss je Abschnitt, Prozesswerten mit Grenzen und Alarmen; Zeiträume vom Kunden einstellbar
  (E-37); Tipp auf eine Maschine öffnet sie (E-38); Fremdmaschinen reduziert (E-39)
- Verlauf im Dashboard-Modul (SQLite), Auswertung im Backend ([ADR-009](/adr/ADR-009-verlauf-dashboard))
- Core: `GET /api/registry/line` für Modul-Backends; SDK: `fetchLineConfig`, `plannedIntervals`,
  `usePageTitle`, `useModuleData`
- `@iot/ui`: `StateTimeline`, `BarChart`, `ValueTrend`, `BackLink`

**Demo**

1. `pnpm dev`, anmelden, „Linienübersicht“ → Karte „Füll- und Verschließmaschine“ antippen.
2. Zeitraum wechseln; „Daten seit …“ zeigt, ab wann aufgezeichnet wurde.
3. „Sterilisationstunnel“ öffnen: Stufe Basis ohne Prozesswerte.

## M5 – Alarme und geführte Fehlersuche (2026-10-22)

**Neu**

- Modul `alarms`: Alarmliste nach Mockup mit Filter, Verlauf (SQLite, 90 Tage einstellbar, E-34),
  Top-Störungen der letzten 7 Tage (E-33), Zähler in der Navigation; kein Quittieren (E-32)
- Modul `troubleshooting`: Fehlerbaum-Format mit Schema ([ADR-007](/adr/ADR-007-fehlerbaum-format)),
  Beispielbäume aus dem Mockup, Ja/Nein-Schritte, bisheriger Weg, Ersatzteil per Deep Link, Lösung
  dokumentieren mit Benutzer und Zeit (E-35)
- Core: Proxy `/api/modules/<id>/…` zu Modul-Backends und Einsprungpunkte für Deep Links
  ([ADR-008](/adr/ADR-008-modul-backends-proxy), E-36)
- `module-sdk`: `useModuleApi`, `useDeepLinkTargets`, `useDeepLinkAvailable`; Server-Teil
  `@iot/module-sdk/server` (`registerWithCore`, `readProxyUser`, `userCan`, `subscribeLine`,
  `publishDeepLinkTargets`); Manifest-Feld `backend`; `badge(line)` bekommt den Stand der Linie
- `@iot/ui`: `Panel` (Frage / Lösung)
- Dashboard: „Fehlersuche starten“ an Alarmen mit Fehlerbaum

**Behoben**

- Datenkern: Nach einem Zählerreset (neues `resetAt` oder fallender Stand) wurden Leistung und Ausbringung
  negativ; die bisherige Menge der Schicht bleibt jetzt erhalten

**Demo**

1. `pnpm dev`, als `maintenance` anmelden (Passwort `entwicklung`).
2. „Alarme“: Bei „Wägezelle 3: Tara-Abweichung“ auf „Fehlersuche“ tippen.
3. Dreimal „Ja“ → Lösung „Wägezelle tauschen“ mit Ersatzteil ET-50100; „Lösung dokumentieren“.
4. Als `operator`: Dasselbe aus der Linienübersicht mit „Fehlersuche starten“ – ohne „Lösung dokumentieren“.

## Nach M4 (2026-10-22)

- Simulator: stehende Maschinen wechseln zwischen Stillstand und Lauf, Alarme kommen und gehen mit (O-24)
- Schnittstelle: optionales Feld `identity.source`, Dashboard zeigt die Datenquelle wie im Mockup
  ([ADR-006](/adr/ADR-006-identity-source))
- `pnpm dev` läuft ohne Docker (Broker im Prozess); Mosquitto mit `pnpm dev:mosquitto`

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
