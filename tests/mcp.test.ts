import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id and lists the real tools", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" })).json();
    expect(body.id).toBe(7);
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_comments", "count_by_status"]);
  });

  it("list_comments filters the sample comments", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_comments", arguments: { status: "Spam" } } });
    const { result } = await res.json();
    expect(result.comments.map((c: { id: string }) => c.id)).toEqual(["c-02"]);
  });

  it("count_by_status counts the sample comments", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "count_by_status" } });
    expect((await res.json()).result.counts).toEqual({ All: 2, Pending: 0, Approved: 1, Spam: 1 });
  });

  it("rejects an unknown status", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_comments", arguments: { status: "Deleted" } } });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe(-32602);
    expect(body.id).toBe(3);
  });

  it("rejects an unknown tool, an unknown method and a malformed body", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_data" } })).json()).error.code).toBe(-32602);
    expect((await (await rpc({ jsonrpc: "2.0", id: 5, method: "nope" })).json()).error.code).toBe(-32601);
    const bad = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await bad.json()).error.code).toBe(-32700);
  });
});
