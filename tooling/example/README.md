# Beispielmodul

Modul `example` der IoT-Plattform (Backend-Port 4100), angelegt mit `pnpm create-module` – Beispiel für die Anleitung und die E2E-Tests der Shell, kein Produktmodul.

- [Entwicklerdoku](docs/entwickler.md) – Aufbau, Datenfluss, API, Konfiguration
- [Bedienanleitung](docs/anleitung.md)
- [Schulung](docs/schulung.md)
- [Changelog](CHANGELOG.md)

```bash
pnpm dev                                        # mit der ganzen Plattform
pnpm --filter @iot/module-example test    # Unit-Tests
```
