# ADR-002: Einbindung der Modul-UIs per ES-Module und Import-Map

Status: angenommen
Datum: 2026-10-22 (Vorschlag vom 2026-10-21, mit M3a umgesetzt)

## Kontext

Jedes Modul ist eine eigene Edge App und wird unabhängig installiert, aktualisiert oder entfernt. Die
Navigation der Shell entsteht ausschließlich aus den registrierten Manifesten. Die Shell kann die
Oberflächen der Module deshalb nicht zur Build-Zeit kennen, sondern muss sie zur Laufzeit laden.
Gleichzeitig müssen alle Module dieselbe React-Instanz, dasselbe `module-sdk` (ein `ShellContext`) und
dieselbe `@iot/ui` nutzen.

## Entscheidung

1. **Manifest in zwei Teilen** (`packages/module-sdk/src/manifest/manifest.ts`)
   - `ModuleManifest` – reines JSON: ID, Version, Name, Beschreibung, Kategorie, GxP, Mindeststufe,
     Navigation, Routen, Rechte, `entry` (Adresse des Einstiegsmoduls), `styles`. Das Modul-Backend meldet
     es beim Start an (`POST /api/registry/modules`); die Registry prüft es mit `validateManifest()`.
   - `ModuleEntry` – Standard-Export des Einstiegsmoduls: Seiten je Routenpfad, `badge()`, Übersetzungen.
     Funktionen und Komponenten lassen sich nicht als JSON melden.
2. **Laden per `import()`:** Die Shell lädt das Einstiegsmodul gebuchter Module als natives ES-Modul,
   registriert seine Übersetzungen im Namespace der Modul-ID und bindet seine Stylesheets als `<link>` ein.
3. **Gemeinsame Bibliotheken über eine Import-Map:** Module bauen `react`, `react/jsx-runtime`,
   `react-dom`, `react-i18next`, `@iot/module-sdk` und `@iot/ui` als extern (`SHARED_MODULES`). Die Shell
   setzt eine Import-Map auf Weiterleitungsmodule unter `/shared/<datei>.js`, die aus ihrem eigenen Bundle
   re-exportieren. Damit gibt es je Bibliothek genau eine Instanz.
   - Für CommonJS-Pakete (React, React DOM, JSX-Runtime) erzeugt ein Vite-Plugin die benannten Exporte
     ausdrücklich, weil `export *` dort keine benannten Exporte liefert.
   - Im Dev-Betrieb zeigt die Import-Map auf die virtuellen Module des Vite-Dev-Servers, im Build auf
     `/shared/*.js`.
4. **Reservierte IDs:** `baukasten`, `api`, `shared`, `assets` belegt die Shell selbst
   (`RESERVED_MODULE_IDS`).
5. **Auslieferung:** Bis M10 liefert jedes Modul-Backend sein Einstiegsmodul selbst aus (mit CORS). Mit der
   Edge-Paketierung kommt die Auslieferung über den Reverse Proxy des Core unter `/modules/<id>/`.

## Alternativen

- **Module Federation:** etabliert, aber an den Bundler gebunden und mit eigener Laufzeit; mehr Komplexität
  bei unabhängigen Versionsständen.
- **iframes:** starke Trennung, aber Layout, Fokusführung, Barrierefreiheit und gemeinsame Anmeldung werden
  aufwendig; Deep Links über `postMessage`.
- **Alles in einem Frontend-Build:** widerspricht der unabhängigen Verteilung als Edge Apps.
- **Gemeinsame Bibliotheken über `window`:** kein natives ESM, Modul-Builds bräuchten Sonderkonfiguration.

## Konsequenzen

- Gemeinsame Pakete brauchen eine abgestimmte Versionspolitik: Brüche in `module-sdk` oder `@iot/ui` nur mit
  großer Version und Übergangszeit.
- Vite-Konfigurationen, die `@iot/module-sdk` importieren, laufen mit `--configLoader runner`.
- Offen für M3b: Absicherung der Registry (Dienst-Token); für M10: Proxy, Content-Security-Policy,
  Verhalten bei Versionskonflikt.
