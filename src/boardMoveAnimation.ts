const MOVE_ANIMATION_DURATION_MS = 100;
const BOARD_RESYNC_SAFETY_MARGIN_MS = 20;

let installed = false;

function getRequestPath(input: RequestInfo | URL): string | null {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    return new URL(rawUrl, window.location.href).pathname;
  } catch {
    return null;
  }
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/**
 * Keeps the visual board reconciliation from replacing piece DOM nodes while their
 * short CSS move transition is still running.
 *
 * The actual move request and every computer-move request are left untouched. The
 * backend therefore advances the game immediately and the next engine may start
 * thinking while the previous piece is still moving on screen. Only the delivery
 * of a subsequent /api/board response to the React board is held back for the
 * remaining animation time.
 */
export function installBoardMoveAnimationTiming(): void {
  if (installed) {
    return;
  }

  installed = true;

  const originalFetch = window.fetch.bind(window);
  let lastSuccessfulMoveResponseAt = Number.NEGATIVE_INFINITY;

  window.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const path = getRequestPath(input);
    const response = await originalFetch(input, init);

    if (
      response.ok
      && (path === "/api/move" || path === "/api/computer-move")
    ) {
      lastSuccessfulMoveResponseAt = performance.now();
      return response;
    }

    if (path === "/api/board") {
      const elapsedSinceMove = performance.now() - lastSuccessfulMoveResponseAt;
      const minimumVisualLifetime =
        MOVE_ANIMATION_DURATION_MS + BOARD_RESYNC_SAFETY_MARGIN_MS;
      const remaining = minimumVisualLifetime - elapsedSinceMove;

      if (remaining > 0) {
        await delay(remaining);
      }
    }

    return response;
  }) as typeof window.fetch;
}
