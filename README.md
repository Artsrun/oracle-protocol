# ORACLE PROTOCOL v1.2

Local-only identity portrait. HUD handshake → harvest → witness.

Zero server. Everything stays in the tab.

## Live

https://artsrun.github.io/oracle-protocol/

## Protocol

1. **Approach** — enter
2. **Handshake** — wallet and/or WebAuthn (optional; spectral if denied)
3. **Harvest** — per-tile grant:
   geo · orientation · shake/g · GPU · CPU/memory · Bluetooth availability ·
   camera meta · mic energy · battery · network · device profile
4. **Witness** — local portrait + hash

Camera and mic are used only to read device metadata / energy, then tracks are stopped. No frames or audio leave the device.

iOS: geolocation and DeviceMotion/Orientation only prompt from a user tap. If geo is denied at OS level: Settings → Safari → Location → Allow, then tap the tile again.

Safari withholds Battery API, `deviceMemory`, and Web Bluetooth. Those tiles report N/A instead of looking empty.

## Stack

Vanilla HTML / CSS / JS. No build.
