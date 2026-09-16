# Stockfish.js 19.0.0 lite single-threaded

This directory contains an unmodified browser engine distribution from
Stockfish.js.

- Component: Stockfish.js
- Version: 19.0.0
- Variant: lite single-threaded
- License: GNU General Public License version 3
- Upstream repository: https://github.com/nmrugg/stockfish.js
- Upstream release tag: v19.0.0
- Upstream source commit: 9cb3e5066d48f1a35d792afeda36eff37ae60570
- Upstream source archive:
  https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.0.tar.gz
- Build command documented by upstream:
  npm run build-single-lite

Distributed object files:

- stockfish-19-lite-single.js
- stockfish-19-lite-single.wasm

The files are kept separate from the Apache-2.0 application sources and are
loaded only as an optional classic Web Worker for browser live evaluation.
They have not been modified.

For redistributed packaged releases, corresponding source must remain
available under the GPLv3 terms. The upstream tag and commit above identify
the exact corresponding source for these binaries. Release packaging should
mirror that source archive alongside distributed release artifacts rather
than relying solely on long-term availability of the upstream host.
