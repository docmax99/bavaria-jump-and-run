# Bavaria Jump & Run — Roadmap

Alle Features priorisiert nach Impact und Aufwand.

---

## Phase 1 — Quick Wins

- [x] **Pause-Menü** (`P` / `ESC`-Taste) — Semi-transparentes Overlay, Spiel friert ein
- [x] **Screen-Fade zwischen Levels** — Schwarze Blende beim Level-Wechsel
- [x] **Respawn-Blink-Effekt** — Spieler blinkt während der Unverwundbarkeits-Phase *(war bereits implementiert)*
- [x] **Getrennte Lautstärke (Musik vs. SFX)** — Separate Regler im Pause-Menü, gespeichert in localStorage

---

## Phase 2 — Gameplay

- [x] **Checkpoint-System** — Goldene Fahnen in jedem Level, Respawn am letzten Checkpoint
- [x] **Boss-Angriffsmuster** — Bierkrug-Projektile in 3 Phasen (Phase 1: 1 Krug/120f, Phase 2: 1 Krug/90f ×1.5 Speed, Phase 3: 2 Krüge/70f ×2.2 Speed)
- [x] **Gegner-Vielfalt** — Fledermaus (Sinus-Flug, rote Augen) + Schildkröte (2 HP, zieht sich in Schale zurück) in Levels 4–6

---

## Phase 3 — Polish & QoL

- [x] **Tutorial-Overlay (Level 1)** — 5 positionsgetriggerte Hinweise zur Steuerung
- [x] **Statistik-Screen** — Zeit (MM:SS), gesammelte Items und besiegte Feinde nach Level-Abschluss
- [x] **Vollbild-Modus** (`F`-Taste) — toggelt requestFullscreen(), Hinweis im Pause-Menü

---

## Steuerung (komplett)

| Taste | Aktion |
|---|---|
| `←` / `A` | Links |
| `→` / `D` | Rechts |
| `Leertaste` / `↑` / `W` | Springen / Doppelsprung |
| `P` | Pause / Fortsetzen |
| `ESC` | Pause (dann `M` für Hauptmenü) |
| `F` | Vollbild ein/aus |
| `M` | Hauptmenü (nur aus Pause-Menü) |
