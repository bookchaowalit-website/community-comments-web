import { NextResponse } from "next/server";
import { FILTERS, SEED, countByStatus, filterComments, type Filter } from "@/lib/comments";

// Stateless JSON-RPC MCP endpoint over the sample comments the page starts with. Comments added in the browser stay
// in that browser's localStorage, so this route never sees them.

type RpcRequest = { id?: number | string | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const TOOLS = [
  {
    name: "list_comments",
    description: "List the sample comments, optionally filtered by status and a search over author and text",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: FILTERS }, query: { type: "string" } },
    },
  },
  { name: "count_by_status", description: "Count the sample comments per status", inputSchema: { type: "object", properties: {} } },
];

class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

function callTool(name: string | undefined, args: Record<string, unknown> = {}) {
  switch (name) {
    case "list_comments": {
      const status = args.status ?? "All";
      if (!(FILTERS as unknown[]).includes(status)) throw new RpcError(-32602, `Unknown status: ${String(status)}`);
      return { comments: filterComments(SEED, status as Filter, typeof args.query === "string" ? args.query : "") };
    }
    case "count_by_status":
      return { counts: countByStatus(SEED) };
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  }
}

export async function POST(request: Request) {
  let id: RpcRequest["id"] = null;
  try {
    const body = (await request.json()) as RpcRequest;
    id = body.id ?? null;
    let result: unknown;
    switch (body.method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "Comments Review Desk", version: "1.0.0" },
        };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = callTool(body.params?.name, body.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(body.method)}`);
    }
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32700;
    const message = error instanceof RpcError ? error.message : "Parse error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
  }
}
