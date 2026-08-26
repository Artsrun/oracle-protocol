# ORACLE PROTOCOL v1.1

Local-only identity portrait. HUD handshake → harvest → witness.

Zero server. Everything stays in the tab.

## Live

Open `index.html` or enable GitHub Pages on `prod`.

https://artsrun.github.io/oracle-protocol/

## Protocol

1. **Approach** — enter
2. **Handshake** — wallet and/or WebAuthn (optional; spectral if denied)
3. **Harvest** — geo / camera meta / mic energy / battery / device profile, per grant
4. **Witness** — local portrait + hash

Camera and mic are used only to read device metadata / energy, then tracks are stopped. No frames or audio leave the device.

## Stack

Vanilla HTML / CSS / JS. No build.
