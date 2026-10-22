# ADR-008: Modul-Backends über den Proxy des Core, Einsprungpunkte für Deep Links

Status: angenommen
Datum: 2026-10-22

## Kontext

Mit M5 haben Module eigene APIs (Alarmverlauf, Fehlerbäume, Lösungswege). Die Oberfläche läuft unter der
Adresse der Shell; die Anmeldung liegt im Core (ADR-004). Module dürfen sich nicht direkt aufrufen (CLAUDE.md,
Abschnitt 4). Außerdem muss ein Modul wissen, ob ein Deep Link sinnvoll ist, z. B. „Fehlersuche“ nur bei
Alarmen mit Fehlerbaum (E-36, ursprünglich für M10 geplant).

## Entscheidung

1. **Proxy:** Der Core leitet `/api/modules/<id>/<pfad>` an das Backend weiter, das das Modul im Manifest
   als `backend` angemeldet hat. Voraussetzungen: gültige Sitzung und gebuchtes Modul (sonst 401/403).
   Der Core setzt die Kopfzeilen `x-iot-user` (Benutzer, Anzeigename, Rechte; base64url-JSON) und
   `x-iot-token` (Dienst-Token).
2. **Modul-Backends** nehmen API-Aufrufe nur mit gültigem Dienst-Token an (`readProxyUser` aus
   `@iot/module-sdk/server`, Vergleich in konstanter Zeit) und prüfen Rechte selbst (`userCan`).
3. **Oberfläche** ruft das eigene Backend nur über `useModuleApi()` auf – nie über die Adresse des Moduls.
4. **Einsprungpunkte:** Ein Modul meldet mit `publishDeepLinkTargets` (PUT
   `/api/registry/modules/<id>/targets`, Dienst-Token), welche Ziele es bedient, z. B.
   `{ alarm: ['FILL-WGT-0003', …] }`. Die Shell gibt sie an alle Module weiter
   (`useDeepLinkAvailable`, `useDeepLinkTargets`); für nicht gebuchte oder nicht installierte Module gibt es
   keine Ziele.

**Ergänzung (M5a):** Modul-Backends lesen die Linienkonfiguration (Zeitzone, Schichtmodell, OEE-Ziel) mit
`GET /api/registry/line` und Dienst-Token (`fetchLineConfig`). Eine Modulseite kann den Titel im Kopf der
Shell setzen (`usePageTitle`, z. B. Name der Maschine).

## Alternativen

- **Module direkt aufrufen (CORS):** Anmeldung und Rechte müssten in jedem Modul geprüft werden; der
  Browser bräuchte Zugriff auf jedes Modul-Backend.
- **Ziele im Manifest:** Das Manifest ist statisch; die Fehlerbäume ändern sich zur Laufzeit.
- **Zielmodul fragt beim Klick nach:** Schaltflächen erschienen auch dort, wo es nichts zu tun gibt.

## Konsequenzen

- Ein Modul-Backend muss für den Browser nicht erreichbar sein; nur `entry.js` wird noch direkt geladen
  (O-19, M10).
- Der Proxy überträgt JSON-Körper; Datei-Uploads brauchen eine Erweiterung, wenn ein Modul sie benötigt.
- Das Dienst-Token ist im Betrieb Pflicht (`CORE_REGISTRY_TOKEN`); ohne Token startet der Core nicht.
