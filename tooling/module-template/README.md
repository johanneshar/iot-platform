# Modul-Vorlage

Vorlage für `pnpm create-module <id> "<Name>"` (CLAUDE.md, Abschnitt 6.3). Platzhalter:
`__MODULE_ID__`, `__MODULE_NAME__`, `__MODULE_PORT__`. `package.json.tpl` wird zu `package.json`.

Das Backend (`backend/main.ts`) liefert `entry.js` aus und meldet das Manifest mit `entry` und `backend` beim
Core an (`registerWithCore`). Eigene API-Routen sind nur über den Proxy des Core erreichbar (ADR-008):
Prüfung mit `readProxyUser`, Aufruf aus der Oberfläche mit `useModuleApi()`.
