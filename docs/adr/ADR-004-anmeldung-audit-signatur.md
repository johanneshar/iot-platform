# ADR-004: Anmeldung, Rechte, Audit Trail und e-Signatur im Core

Status: angenommen
Datum: 2026-10-22

## Kontext

21 CFR Part 11 und EU GMP Annex 11 verlangen eindeutige Benutzer, Zugriffskontrolle, einen unveränderbaren
Audit Trail und elektronische Signaturen mit zwei Merkmalen. Laut CLAUDE.md führt nur der Core den Audit
Trail; Module melden GxP-relevante Vorgänge über das `module-sdk`. Benutzer kommen lokal oder – wenn der Kunde
es wünscht – aus LDAP (E-12).

## Entscheidung

1. **Benutzer und Anmeldung**
   - Lokale Benutzer in SQLite, Passwörter mit scrypt (Salt je Benutzer), Mindestlänge 8 Zeichen.
   - Nach 5 Fehlversuchen ist das Konto 15 Minuten gesperrt; Fehlversuche und Sperre stehen im Audit Trail.
   - Anmeldung hinter der Schnittstelle `AuthProvider`; LDAP wird eine weitere Umsetzung davon (O-04).
   - Erster Start im Betrieb: Service-Zugang mit `CORE_SERVICE_PASSWORD`. In der Entwicklung je Rolle ein
     Beispielbenutzer; im Betrieb (`NODE_ENV=production`) verweigert der Core das.
2. **Sitzungen:** zufälliges Token im Cookie (`HttpOnly`, `SameSite=Strict`, im Betrieb `Secure`); in der
   Datenbank steht nur sein SHA-256-Hash. Gültigkeit 12 Stunden (`CORE_SESSION_HOURS`). Deaktivieren eines
   Benutzers beendet seine Sitzungen.
3. **Rechte:** `config/roles.json` ist die einzige Quelle ([Rollen und Rechte](/architektur/rollen-rechte)).
   Rechte mehrerer Rollen addieren sich; `*` steht für alle Rechte (Service). Der Core prüft jedes Recht
   serverseitig; die Oberfläche blendet nur aus.
4. **Audit Trail**
   - Nur Anhängen. Benutzer und Zeitstempel (UTC) setzt der Core, nie das Modul.
   - Jeder Eintrag enthält den SHA-256-Hash seines Vorgängers; `GET /api/audit/verify` prüft die Kette.
   - SQLite-Trigger verweigern `UPDATE` und `DELETE`.
   - Erfasst werden u. a. An- und Abmeldung, Fehlversuche, Buchungen, Benutzer- und Rollenänderungen,
     Signaturen und alle Vorgänge der Module (`POST /api/audit`).
5. **e-Signatur** (`POST /api/signatures`)
   - Erneute Eingabe von Benutzer und Passwort, auch innerhalb einer Sitzung (E-13).
   - Signieren kann nur der angemeldete Benutzer mit seinen eigenen Zugangsdaten.
   - Bedeutung (z. B. „Freigabe“) und das nötige Recht (z. B. `batch.sign`) sind Pflicht; der Eintrag im
     Audit Trail enthält beides.
   - Module rufen `useRequestSignature()` auf; die Shell zeigt den `SignatureDialog`.
6. **Registry:** Modul-Backends melden sich mit einem Dienst-Token an (`CORE_REGISTRY_TOKEN`, O-18).

## Alternativen

- **Anmeldung über das Benutzermanagement von Industrial Edge:** würde den Core an eine Siemens-Schnittstelle
  binden, deren GxP-Eignung offen ist; als weitere `AuthProvider`-Umsetzung später möglich.
- **JWT statt Sitzung in der Datenbank:** Sperren und Abmelden würden erst mit Ablauf des Tokens wirken.
- **Audit Trail ohne Hash-Kette:** Manipulation an der Datenbank vorbei wäre nicht erkennbar.

## Konsequenzen

- Jeder Aufruf der API außer `/api/health`, Anmeldung und Registry braucht eine Sitzung.
- Offen: Passwortregeln, Ablauf und Inaktivitätsabmeldung am HMI (O-20), Oberfläche der Benutzerverwaltung
  (O-21), LDAP (O-04), Sicherung und Export des Audit Trail (M6).
- Der Service hat alle Rechte, auch GxP-Signaturen. Ob das für die Validierung beim Kunden trägt, bewertet
  der Kunde ([GxP](/architektur/gxp)).
