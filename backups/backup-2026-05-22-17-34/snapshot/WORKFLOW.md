# TokenSync — Arbeitsablauf (dauerhaft)

Diese Datei ergänzt `PROJECT_PLAN.md` und gilt für **jeden** abgeschlossenen Task.

## Nach jedem Task

1. **Security & Bug Check**
   - `npm audit` (client + server)
   - XSS: sanitisierte HTML/RSS-Ausgabe
   - Secrets nicht im Client
   - API Rate Limits / Error Handling
   - Kurzprotokoll in der Task-Antwort

2. **Backup (nur bei Erfolg)**
   - Ordner: `backups/backup-YYYY-MM-DD-HH-mm/`
   - Inhalt: relevante Dateien + `MANIFEST.txt` (Task, Datum, Notizen)

3. **Arbeitsweise**
   - Minimaler, fokussierter Diff
   - Bestehende Konventionen
   - Klare Zusammenfassung: Was · Prüfung · Backup-Pfad

## Task-Format vom Auftraggeber

Bitte nummerierte Tasks, z. B.:

- Task 1: Phase 0 — Projekt-Grundgerüst
- Task 2: News RSS (5 Quellen)
- …
