/**
 * SSE 流式响应工具 — 将 AI streaming text 转为 Server-Sent Events
 */

export function createSSEResponse(readable: ReadableStream): Response {
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export function sseEncoder() {
  const encoder = new TextEncoder();

  return {
    encode(data: { type: string; data?: unknown; message?: string }): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    },
    done(): Uint8Array {
      return encoder.encode("data: [DONE]\n\n");
    },
  };
}
