export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  "Strict-Transport-Security": "max-age=86400"
};

export class HttpError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

export async function readBounded(message, maxBytes, {timeoutMs = 10000, request = false} = {}) {
  const tooLarge = () => new HttpError("BODY_TOO_LARGE", request ? "요청 본문이 너무 큽니다." : "외부 응답이 허용 크기를 초과했습니다.", request ? 413 : 502);
  if (Number(message.headers.get("Content-Length")) > maxBytes) {
    void message.body?.cancel().catch(() => {});
    throw tooLarge();
  }
  if (!message.body) return new Uint8Array();
  const reader = message.body.getReader();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new HttpError("READ_TIMEOUT", "응답 대기 시간이 초과되었습니다. 다시 시도해 주세요.", request ? 408 : 504)), timeoutMs);
    });
    // Preallocate the byte budget so tiny chunks cannot grow an unbounded chunk list.
    const output = new Uint8Array(maxBytes);
    let size = 0;
    while (true) {
      const {done, value} = await Promise.race([reader.read(), timeout]);
      if (done) break;
      if (size + value.byteLength > maxBytes) throw tooLarge();
      output.set(value, size);
      size += value.byteLength;
    }
    return output.subarray(0, size);
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
