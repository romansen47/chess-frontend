export async function responseErrorMessage(response: Response): Promise<string> {
  const message = await response.text();
  return message || `HTTP ${response.status}`;
}

export async function checkedResponse(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = init === undefined
    ? await fetch(input)
    : await fetch(input, init);
  if (!response.ok) throw new Error(await responseErrorMessage(response));
  return response;
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  return (await (await checkedResponse(input, init)).json()) as T;
}

export interface JsonApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

export async function requestJsonResponse<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<JsonApiResponse<T>> {
  const response = init === undefined
    ? await fetch(input)
    : await fetch(input, init);
  return {
    ok: response.ok,
    status: response.status,
    data: (await response.json()) as T,
  };
}

export async function requestBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Blob> {
  return await (await checkedResponse(input, init)).blob();
}

export async function requestVoid(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<void> {
  await checkedResponse(input, init);
}

export function jsonRequest(
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
