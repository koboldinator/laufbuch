# Laufbuch

Persönliche Lauf-App: Trainingsplan, Blöcke, Läufe, Krafttraining und Fortschritt an einem Ort.
Läuft im Browser am Handy und am Desktop und lässt sich am iPhone auf den Homescreen legen.

- **Oberfläche:** React + Vite, Schrift Outfit, „Liquid Glass“-Look
- **Daten:** Firebase Authentication + Firestore (Spark-Tarif, kostenlos)
- **Veröffentlichung:** GitHub Pages über GitHub Actions (kostenlos)

## Einmalige Einrichtung

1. **Firebase › Authentication › Anmeldemethode:** Google (und optional E-Mail/Passwort) aktivieren.
2. **Firebase › Authentication › Einstellungen › Autorisierte Domains:** `<dein-github-name>.github.io` hinzufügen.
3. **Firebase › Firestore Database › Regeln:** Inhalt von `firestore.rules` einfügen und veröffentlichen.
4. **GitHub › Repo › Settings › Pages:** Source = „GitHub Actions“.

Danach veröffentlicht jeder Push auf `main` automatisch nach
`https://<dein-github-name>.github.io/<repo-name>/`.

## Daten importieren

Unter **Import** kannst du ablegen:

- **Excel-Pläne** im Tabellen-Layout (eine Zeile pro Woche, Spalten Mo–So, optional „Wochen-km“ und „Fokus / Notizen“, Phasen-Überschriften, Tempo-Zonen und Hinweise). Beim Import wählst du den Start-Montag und optional „Easy-Läufe + km“.
- **Laufbuch-JSON** (`format: "laufbuch"`), z. B. ein Backup oder eine Datei, die Claude aus Screenshots, PDFs oder anderen Plänen erstellt hat.

Aufbau einer Laufbuch-JSON-Datei:

```json
{
  "format": "laufbuch",
  "version": 1,
  "activities": [
    { "id": "optional", "date": "2026-11-14", "type": "easy", "km": 10.2, "durationSec": 3540,
      "avgHr": 146, "maxHr": 158, "cadence": 161, "elevation": 42, "rpe": 3, "notes": "", "source": "strava" }
  ],
  "strength": [{ "date": "2026-11-13", "minutes": 45, "focus": "Beine", "rpe": 6 }],
  "sessions": [{ "date": "2026-11-15", "type": "long", "km": 16, "title": "Long Run", "details": "komplett Easy", "planId": "…" }],
  "plans": [], "blocks": [], "races": [], "settings": {}
}
```

Arten (`type`): `easy`, `long`, `threshold`, `racepace`, `vo2`, `race`, `run`, `strength`, `rest`.

## Lokal starten

```bash
npm install
npm run dev
```
