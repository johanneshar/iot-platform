# Neues Modul anlegen

Für Modulentwickler: Nach dieser Anleitung hast du ein neues Modul angelegt, beim Core registriert und
in der Navigation der Shell gesehen.

## Schritte

1. **Modul aus der Vorlage erzeugen**

   ```bash
   pnpm create-module alarms "Alarm-Analytics" --port 4101
   pnpm install
   ```

   _Ergebnis:_ `modules/alarms/` mit Manifest, Oberfläche, Backend, Tests, Doku und Changelog. Die ID ist
   kebab-case, eindeutig und unveränderlich; der Port muss je Modul frei sein.

2. **Manifest ausfüllen** (`manifest.ts`)

   | Feld                    | Inhalt                                                                                                                                     |
   | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
   | `name`, `description`   | Deutsch Pflicht, Englisch empfohlen; die Beschreibung erscheint auf dem Sperrbildschirm (ohne Schlusspunkt)                                |
   | `category`              | `Kern`, `Produktion`, `Instandhaltung` oder `Integration`                                                                                  |
   | `gxp`, `minConformance` | aus der [Modulübersicht](/module/uebersicht)                                                                                               |
   | `nav`                   | Abschnitt `Linie`, `Service` oder `Plattform`, Reihenfolge, Icon; optional `label`, wenn die Navigation anders heißen soll als das Produkt |
   | `routes`                | eine Zeile je Seite; `''` ist die Startseite                                                                                               |
   | `permissions`           | Rechte mit Präfix der Modul-ID, z. B. `alarms.acknowledge`                                                                                 |

   _Ergebnis:_ `pnpm --filter @iot/module-alarms test` meldet ein gültiges Manifest.

3. **Seiten bauen** (`frontend/pages/`)
   - Nur Komponenten aus `@iot/ui`; fehlt eine, entsteht sie dort ([Neue Komponente](/anleitungen/neue-komponente)).
   - Texte über `useTranslation('<modul-id>')` und `frontend/locales/de.json`, `en.json`.
   - Linie, Navigation und Deep Links aus dem `module-sdk`: `useLine()`, `useNavigate()`,
     `useDeepLinkParams()`, `useIsModuleBooked()`.
   - Maschinendaten nur über das SDK: `useMachines()`, `useAlarms()`, `useValues()` ([ADR-005](/adr/ADR-005-datenzugriff)).
   - Jede Seite in `frontend/entry.tsx` unter ihrem Routenpfad eintragen.

4. **Starten**

   ```bash
   pnpm dev
   ```

   _Ergebnis:_ Das Modul-Backend meldet `beim Core http://localhost:4000 angemeldet`. In der Shell
   (<http://localhost:5180>) erscheint das Modul in der Navigation – mit Schloss, solange es nicht gebucht
   ist.

5. **Buchen**

   Im Baukasten auf „Modul buchen“ klicken.

   _Ergebnis:_ Das Schloss verschwindet, die Seite des Moduls öffnet sich.

6. **Checkliste abarbeiten** (CLAUDE.md, Abschnitt 6.3): Tests, Barrierefreiheit, `docs/entwickler.md`,
   `docs/anleitung.md`, `docs/schulung.md`, Eintrag in der [Modulübersicht](/module/uebersicht).

## Wie das Laden funktioniert

Das Modul baut sein Einstiegsmodul `dist/entry.js` mit Vite; React, `@iot/ui` und `module-sdk` bleiben
extern und kommen zur Laufzeit von der Shell ([ADR-002](/adr/ADR-002-modul-einbindung)). Das Beispiel unter
`tooling/example/` ist genau so entstanden und dient den E2E-Tests der Shell.
