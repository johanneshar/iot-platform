# Architektur – Übersicht

Für Entwicklerinnen und Entwickler: Nach dieser Seite kennst du die Bausteine der Plattform und weißt,
wie die Daten von der Maschine bis in ein Modul fließen.

## Bausteine auf dem Edge Device

```text
Edge Device (eins pro Linie)
├── Siemens: Connectoren · Databus (MQTT) · IIH · Common Configurator
├── core            Edge App – Shell-UI, Modul-Registry, Benutzer & Rollen, Audit Trail, Lizenz
├── normalizer      Edge App – Mapping → kanonische Topics iot/v1/…
└── module-*        je eine Edge App pro buchbarem Modul
```

## Datenfluss

```text
Steuerung ──Connector──▶ Databus ──Normalizer──▶ iot/v1/{lineId}/{machineId}/… ──module-sdk──▶ Modul
```

1. Ein Connector liest die Steuerung und legt die Rohdaten auf den Databus.
2. Der Normalizer bildet sie anhand der Mapping-Datei auf die kanonischen Topics ab.
3. Module lesen ausschließlich über das `module-sdk` – nie direkt von Connector-Topics.

## Grundsätze

- **Core ist die Shell** und enthält keine Fachlogik eines Moduls.
- **Module sind eigenständig:** eigenes Backend, eigene Oberfläche, eigene Datenhaltung.
- **Navigation nur aus Manifesten**; die Oberflächen werden zur Laufzeit geladen
  ([ADR-002](/adr/ADR-002-modul-einbindung)).
- **Module sprechen nicht direkt miteinander**, Querverweise laufen über Deep Links der Shell.
- **GxP-relevante Aktionen** gehen immer über die Audit-API des Core.
- **Die Plattform liest nur.**

## Benutzer und Rollen

Anmeldung lokal am Core oder – wenn der Kunde es wünscht – über LDAP.

| Rolle       | Wer                                                                        |
| ----------- | -------------------------------------------------------------------------- |
| Operator    | Bedienung an der Linie                                                     |
| Maintenance | Instandhaltung                                                             |
| Setup Man   | Einrichter, z. B. Formatwechsel                                            |
| Admin       | Administrator des Kunden; bucht als Einziger Module                        |
| IT Admin    | IT des Kunden, z. B. LDAP und Netzwerk                                     |
| Service     | Unser Hersteller-Zugang mit allen Rechten, in jeder Installation vorhanden |

Die Rechte je Rolle werden in M3 festgelegt.

::: info Stand M0
Diagramme und Details folgen mit M3 (Core) und M9 (Normalizer).
:::
