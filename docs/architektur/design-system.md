# Design-System

Für alle, die Oberflächen bauen oder prüfen: Diese Seite erklärt, woher Farben und Maße kommen, welche
Komponenten es gibt und wo das Design bewusst vom Mockup abweicht.

## Design Tokens

- **Quelle:** `packages/design-tokens/src/tokens.ts`. Daraus wird `tokens.css` erzeugt; ein Test stellt
  sicher, dass beide übereinstimmen.
- **Inhalt:** Farben aus CLAUDE.md 7.1 und alle weiteren Werte, die das Mockup verwendet: Schriftgrößen,
  -gewichte, Zeilenhöhen, Abstände, Radien, Rahmen, Schatten, Größen und Rasterbreiten.
- **Regel:** Kein CSS verwendet Werte außerhalb der Tokens. Stylelint prüft das bei jedem Commit und in der CI.

### Zusätzliche Farben aus dem Mockup

Das Mockup verwendet Farben, die nicht in CLAUDE.md 7.1 stehen. Sie sind als eigene Tokens angelegt:

| Token                         | Wert                        | Verwendung                                                  |
| ----------------------------- | --------------------------- | ----------------------------------------------------------- |
| `--color-on-primary`          | `#ffffff`                   | Text auf Petrol                                             |
| `--color-on-primary-tint`     | `#00625e`                   | Text auf Petrol-Tönung (Info-Chip, aktueller Batch-Schritt) |
| `--color-chart-secondary`     | `#7fb9b6`                   | Balken ab Platz 2 (Top-Störungen)                           |
| `--color-border-control`      | `#cfd6d6`                   | Rahmen inaktiver Filter                                     |
| `--color-border-input`        | `#b4bcbb`                   | Eingabefeld, gestrichelte Platzhalter                       |
| `--color-border-foreign`      | `#9aa1a0`                   | Rahmen Fremdmaschine                                        |
| `--color-icon-muted`          | `#8a9190`                   | Pfeile im Linienfluss, Legende Fremdmaschine                |
| `--color-sidebar-text`        | `#eef1f1`                   | Navigation                                                  |
| `--color-sidebar-text-locked` | `#bfc6c6`                   | gesperrte Navigation                                        |
| `--color-sidebar-section`     | `#c9d0d0`                   | Abschnittsüberschrift                                       |
| `--color-sidebar-text-subtle` | `#d3d9d9`                   | Zeile unter dem Produktnamen                                |
| `--color-sidebar-text-muted`  | `#dde2e2`                   | Statusblock                                                 |
| `--color-sidebar-overlay`     | `rgba(255, 255, 255, 0.08)` | Statusblock-Fläche                                          |
| `--color-sidebar-chip`        | `rgba(255, 255, 255, 0.14)` | Zähler „Baukasten“                                          |

## Komponenten

Alle Komponenten liegen in `packages/ui/src/components/` und haben Stories in Storybook (`pnpm storybook`,
Port 5182).

| Komponente                   | Zweck                                                                |
| ---------------------------- | -------------------------------------------------------------------- |
| `AppShell`, `Stack`          | Grundlayout; Seitenleiste bricht unter 820 px unter den Inhalt um    |
| `Sidebar`, `SidebarStatus`   | Seitenleiste mit Marke, Abschnitten und Statusblock                  |
| `NavItem`                    | Navigationseintrag mit Zähler und Schloss                            |
| `Header`, `UserBadge`        | Seitenkopf mit Titel, Werkzeugleiste und Benutzer                    |
| `LineSwitch`                 | Linienwahl                                                           |
| `Card`, `CardHeader`         | Karte mit Überschrift, Beschriftung, Untertitel                      |
| `KpiTile`                    | Kennzahl, Variante `main`                                            |
| `InfoTile`                   | graue Kachel mit Beschriftung und Wert                               |
| `Chip`, `StateChip`          | Chips; PackML-Zustände                                               |
| `Button`                     | `primary`, `outline`, `ghost`, `accent`; Größe `sm`                  |
| `ChoiceButton`               | Einstieg wählen (Fehlerbaum, Zielformat)                             |
| `FilterGroup`                | Filterschalter                                                       |
| `DataTable`                  | Tabelle mit horizontalem Scrollen                                    |
| `ProgressBar`                | Fortschritt und Anteile                                              |
| `StepList`, `StepTrail`      | Schrittfolgen (Batch, Formatwechsel), bisheriger Weg der Fehlersuche |
| `MachineCard`, `LineFlow`    | Maschinenkarte, Linienfluss mit Legende                              |
| `AlarmItem`                  | anstehender Alarm                                                    |
| `HealthCard`                 | Zustand einer Komponente                                             |
| `ModuleCard`, `LockedModule` | Baukasten-Kachel, Sperrbildschirm                                    |
| `SuccessNote`                | Erfolgsmeldung                                                       |
| `Placeholder`                | Platzhalter für Bilder und Videos                                    |
| `SearchInput`                | Suchfeld                                                             |
| `Icon`                       | Icons aus dem Mockup                                                 |
| `Panel`                      | Frage bzw. Lösung der Fehlersuche (M5)                               |
| `BackLink`                   | „← Linienübersicht“: zurück zur übergeordneten Seite (M5a)           |
| `StateTimeline`              | Zeitbalken der PackML-Zustände (M5a)                                 |
| `BarChart`                   | Balken je Zeitabschnitt mit Soll- oder Grenzlinie (M5a)              |
| `ValueTrend`                 | Prozesswert mit Verlauf und Grenzband (M5a)                          |

`InfoTile`, `ChoiceButton`, `UserBadge`, `SidebarStatus`, `StepTrail`, `Stack` und `Icon` sind zu den 23
Komponenten aus CLAUDE.md 7.4 hinzugekommen, weil das Mockup diese Muster mehrfach verwendet. `Panel` kam mit
M5 dazu, `BackLink`, `StateTimeline`, `BarChart` und `ValueTrend` mit der Maschinen-Detailseite (M5a).

## Bewusste Abweichungen vom Mockup

Mit der Abnahme von M1 am 2026-10-22 bestätigt (E-21, E-22).

| Stelle                                 | Mockup                            | Umsetzung                        | Grund                                                    |
| -------------------------------------- | --------------------------------- | -------------------------------- | -------------------------------------------------------- |
| Haupt-KPI: Beschriftung und Untertitel | Weiß mit 90 % bzw. 85 % Deckkraft | volle Deckkraft                  | Kontrast im Mockup ca. 4,0:1 bzw. 3,8:1, gefordert 4,5:1 |
| Zähler „Baukasten“ im aktiven Eintrag  | halbtransparent auf Petrol        | dunkler Chip                     | Kontrast im Mockup unter 4,5:1                           |
| Fokus                                  | nicht gezeigt                     | Petrol-Umriss 2 px               | Tastaturbedienung (DoD)                                  |
| Schmale Bildschirme                    | Seitenleiste über dem Inhalt      | Seitenleiste unter dem Inhalt    | CLAUDE.md 7.3                                            |
| Linienwahl                             | Segment-Schalter                  | Auswahlliste mit Pfeil           | Platz bei mehr als zwei Linien (E-22)                    |
| Gesperrter Eintrag, Alarmpunkt         | nur optisch                       | zusätzlich Text für Screenreader | Bedeutung nicht nur über Farbe                           |
