# ADR-002: Einbindung der Modul-UIs per ES-Module und Import-Map

Status: vorgeschlagen
Datum: 2026-10-21

## Kontext

Jedes Modul ist eine eigene Edge App und wird unabhängig installiert, aktualisiert oder entfernt. Die
Navigation der Shell entsteht ausschließlich aus den registrierten Manifesten. Die Shell kann die
Oberflächen der Module deshalb nicht zur Build-Zeit kennen, sondern muss sie zur Laufzeit laden.
Gleichzeitig sollen alle Module dieselbe React-Instanz, dasselbe `module-sdk` und dieselbe `@iot/ui` nutzen.

## Entscheidung

Die Modul-Oberflächen werden als **native ES-Module** geladen, gemeinsame Abhängigkeiten über eine
**Import-Map** der Shell bereitgestellt.

1. Jedes Modul baut ein Einstiegsmodul (`entry.js`), das sein Frontend-Manifest exportiert: Routen,
   Seitenkomponenten, Badge-Funktionen, Deep Links.
2. `react`, `react-dom`, `@iot/module-sdk` und `@iot/ui` werden im Modul-Build als extern markiert. Die
   Shell liefert sie einmal aus und bildet sie in der Import-Map ab.
3. Das Modul-Backend meldet beim Start den statischen Teil des Manifests (ID, Version, Rechte,
   Mindeststufe, Adresse des Einstiegsmoduls) bei der Registry des Core an.
4. Die Shell lädt nur Einstiegsmodule gebuchter Module per `import()`. Für nicht gebuchte zeigt sie
   den Sperrbildschirm.

## Alternativen

- **Module Federation:** etabliert, aber an den Bundler gebunden und mit eigener Laufzeit; mehr Komplexität
  bei unabhängigen Versionsständen.
- **iframes:** starke Trennung, aber Layout, Fokusführung, Barrierefreiheit und gemeinsame Anmeldung werden
  aufwendig; Deep Links über `postMessage`.
- **Alles in einem Frontend-Build:** widerspricht der unabhängigen Verteilung als Edge Apps.

## Konsequenzen

- Gemeinsame Pakete brauchen eine abgestimmte Versionspolitik: Brüche in `module-sdk` oder `@iot/ui` nur mit
  großer Version und Übergangszeit.
- Der Core muss die Einstiegsmodule der Modul-Container erreichen, z. B. über einen Reverse Proxy unter
  `/modules/<id>/`.
- Offen für M3: Auslieferung über den Proxy, Content-Security-Policy, Verhalten bei Versionskonflikt,
  Ablauf in der lokalen Entwicklung (Vite).
