# Beispielmodul – Entwicklerdoku

Für Entwicklerinnen und Entwickler dieses Moduls: Aufbau, Datenfluss und Entscheidungen.

## Aufbau

| Ordner        | Inhalt                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| `manifest.ts` | Manifest (ID, Navigation, Rechte, Mindeststufe)                                 |
| `frontend/`   | Einstiegsmodul und Seiten, nur `@iot/ui`-Komponenten                            |
| `backend/`    | Fastify-Dienst: liefert die Oberfläche aus und meldet das Manifest beim Core an |
| `tests/`      | Unit- und E2E-Tests                                                             |
| `edge/`       | Paketierung als Edge App (ab M10)                                               |

## Deep Links

[Einsprungpunkte für andere Module beschreiben – oder „keine“]
