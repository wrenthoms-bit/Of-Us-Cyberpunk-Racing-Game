# Of Us · Neon Circuit

A cyberpunk street racer that runs in the browser, set to "Of Us (Remastered)" by Delrogue.

Steer through the city, dodge barricades, spike strips and orbital lasers, hit ramps for air time, and see how far you get before your shields run out.

## Play

Open `index.html` through a web server, or host the folder on GitHub Pages. The game is a single HTML file; keep `Of Us (Remastered).mp3` next to it.

To run it locally:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000.

Opening the file by double-click also works, but the road will not pulse in time with the music.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | ← → or A D | Arrow buttons, or the wheel |
| Nitro | Space or Shift (hold) | Nitro button (hold) |
| Pause | P or Esc | Pause button |
| Mute | M | ♪ button |
| Start / restart | Enter | Start Race / Restart |

## Notes

- Three difficulties: Rookie, Racer and Legend. Best score and distance are saved per difficulty in the browser.
- Chase and cockpit cameras.
- Three.js r128 and the Orbitron font load from CDNs, so the game needs an internet connection.
