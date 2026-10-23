import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the seed comments, queue counts and the local-only notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Clear the queue");
    expect(html).toContain("Love this demo!");
    expect(html).toContain("spam link");
    expect(html).toContain("<span>All</span><b>2</b>");
    expect(html).toContain("This is a portfolio demo, not a connected comment system.");
    expect(html).toContain("NO SERVER CLAIMS / NO HIDDEN SYNC");
  });
});
