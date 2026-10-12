# Scoreboard

Unter-App zum Tracken von Siegen, Niederlagen und Punkten – für jede Sportart und jedes Spiel.

## Architektur

| Schicht | Datei | Aufgabe |
|---|---|---|
| Modell | `types.ts` | JSON-serialisierbare Typen (`Scoreboard`, `ScoreboardPlayer`, `Match`) |
| Logik | `logic.ts` | Reine Funktionen: Spieler/Matches verwalten, Validierung, Rangliste |
| Persistenz | `repository.ts` | `ScoreboardRepository`-Interface + `LocalStorageScoreboardRepository` |
| State | `useScoreboards.ts` | React-Hook, optimistische Updates über das Repository |
| UI | `ScoreboardApp.tsx`, `components/` | Darstellung |

Tests: `tests/scoreboard.test.ts` (`npm run test`).

## Datenbank anbinden

1. Neue Klasse implementieren, z.B. `SupabaseScoreboardRepository implements ScoreboardRepository`
   (`list`, `get`, `save`, `remove` – alle asynchron).
2. In `App.tsx` übergeben: `<ScoreboardApp repository={new SupabaseScoreboardRepository(client)} … />`.
3. Logik, Hook und UI bleiben unverändert. Optional: bestehende Browser-Daten einmalig mit
   `new LocalStorageScoreboardRepository().list()` lesen und in die DB `save()`-n (Migration).

`updatedAt` und `schemaVersion` sind bereits für Sync/Konflikterkennung und Migrationen vorgesehen.
Daten aus dem Speicher werden beim Laden validiert (`sanitizeScoreboard`) – das gilt auch für DB-Daten.

