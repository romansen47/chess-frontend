export async function terminateBackend(): Promise<void> {
  const response = await fetch("/api/program/terminate", {
    method: "POST",
    headers: { "X-Chess-Terminate": "terminate" },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
}

export async function terminateDevelopmentFrontend(): Promise<void> {
  await fetch("/__chess/terminate", {
    method: "POST",
    headers: { "X-Chess-Terminate": "terminate" },
  });
}
