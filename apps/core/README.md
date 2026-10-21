# Core

Für Entwickler der Plattform: Der Core ist die Shell jeder Installation – Layout, Navigation, Linienwahl,
Anmeldung, Sperrbildschirm „nicht gebucht“, Baukasten sowie Modul-Registry, Rollen, Audit-API und Lizenz.
Er enthält keine Fachlogik eines Moduls (CLAUDE.md, Abschnitt 4).

| Ordner      | Paket                | Inhalt                                    |
| ----------- | -------------------- | ----------------------------------------- |
| `frontend/` | `@iot/core-frontend` | Shell-UI (React + Vite), Port 5180        |
| `backend/`  | `@iot/core-backend`  | Fastify-Service, Port 4000, `/api/health` |

Stand M0: leere Shell mit Sprachumschaltung, Backend mit Health-Endpunkt. Ausbau in M3.
