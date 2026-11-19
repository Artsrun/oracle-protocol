# vendor/ — third-party files, byte-identical to their pinned npm releases

Nothing here is loaded on the first screen. `core/vendor.js` imports a file with `import()` from this site only
(same origin, allowed by the existing `script-src 'self'`) the first time a feature needs it, and the service worker
precaches it for offline use. `tests/vendor.test.cjs` fails if any byte changes or if a forbidden API appears.
Do not edit these files. `.gitattributes` marks `vendor/**` as binary so line endings never change.

| Library | Version | Tarball | npm integrity | File | Bytes | SHA-256 | Licence |
|---|---|---|---|---|---|---|---|
| gifenc | 1.0.3 (gitHead 15e2c3e, tag v1.0.3) | https://registry.npmjs.org/gifenc/-/gifenc-1.0.3.tgz | sha512-xdr6AdrfGBcfzncONUOlXMBuc5wJDtOueE3c5rdG0oNgtINLD+f2iFZltrBRZYzACRbKr+mSVU/x98zv2u3jmw== | gifenc-1.0.3/gifenc.esm.js (package `dist/gifenc.esm.js`) | 9098 | 217761244379253ba5815510d3048a4fb1f4c4dbe9fb51a5cfbfe26f34eec093 | MIT |
| gifenc | 1.0.3 | same | same | gifenc-1.0.3/LICENSE.md (package `LICENSE.md`) | 1083 | 47bc590c39d8ccccfc544875a9faebf44bafa828ef20315b396b5d0629f0cfd6 | — |
| ZzFX | 1.4.0 (same bytes as GitHub ac5a472) | https://registry.npmjs.org/zzfx/-/zzfx-1.4.0.tgz | sha512-yV/7JnIBPThWh/ZLVZLlmadms5bHQQeoWKKA+DafX4554FHypsop1BQrDHhsf2xxXweUmwjWrnpiB42uBGyGlQ== | zzfx-1.4.0/ZzFX.js (package `ZzFX.js`) | 10301 | 43f321101a935892c112a291e2e943b4da33159b43fcd4a21f3eae710f4a27ff | MIT |
| ZzFX | 1.4.0 | same | same | zzfx-1.4.0/LICENSE (package `LICENSE`) | 1089 | 8917d3dfd55d69fb08e7786d4ac5bf01a4f7eb89c6008713bb4e48c3016ce537 | — |

Notes
- gifenc.esm.js ends with a `sourceMappingURL` comment; the map is not vendored. Browsers only request it with
  developer tools open (same origin, 404), never during normal use.
- ZzFX.js creates an `AudioContext` when the module is evaluated. `core/sound.js` imports it only after a tap, closes
  that context and plays on its own context created inside the tap (iOS requirement). Randomness is always 0.

Updating (a work package of its own): `npm pack <name>@<version>`, check the integrity against
`npm view <name>@<version> dist.integrity`, copy the files, update this table and `tests/vendor.test.cjs`, rerun
`node tools/sw-version.cjs` and the full QA.
