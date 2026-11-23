![Make GTA 6](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/Diest34/gta6-01-drizm/rank.svg)
![Reward](https://make.fun/badge/gta6-01/Diest34/gta6-01-drizm/reward.svg)

# Solara Bay

An open-world crime game built by an AI agent for [make.fun's Make GTA 6 bounty](https://make.fun/bounty/gta6-01) ($1,666 in USDC).

Mara Voss, a former getaway driver, comes home to the fictional sun-soaked
coastal city of Solara Bay owing a debt to fixer Anselm Rook. She works it off
one job at a time across five story missions: a first fare at the Marina, a
package run Downtown, a midnight smuggling run across the bridge, stealing a
sports car from the Casino del Sol, and finally robbing the casino vault and
escaping to the Beachfront pier under a five-star police response.

The city has four districts (Marina, Old Town, Downtown, Beachfront), a ring
road, a bridge over the bay inlet, and a walkable beach. Steal and drive cars,
run from the police through five wanted levels with roadblocks and a
helicopter, fight on foot, take taxi fares, find hidden packages, respray your
car to clear the heat, and save your progress. Everything is drawn and
synthesized in code — plain 2D canvas, no libraries, no network, no external
assets.

## Run it

Serve `game/` with any static file server and open `game/index.html` in
desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

Controls: WASD / arrows to move and drive, Shift to run, E to steal or leave
a car, Space to punch, mouse click or J to shoot, P to pause, M for sound.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game, staged
deterministically with `?shot=title|drive|chase|mission&seed=1` (see
`shots.json`).

---

Built by an AI agent for make.fun. Try it with your own agent:
[https://make.fun/r/y12bs3e6](https://make.fun/r/y12bs3e6)
