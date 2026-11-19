import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font-geist" }) }));

describe("home page", () => {
  it("renders the seed comments, queue counts and the local-only notice on the App shell", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("<h1>All comments</h1>");
    expect(html).toContain("Love this demo!");
    expect(html).toContain("spam link");
    expect(html).toMatch(/All comments<\/span><span class="as-count">2</);
    expect(html).toContain("not a connected comment system");
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });

  it("puts the font variable on <html> and the site's own domain in metadata", () => {
    const html = renderToString(<RootLayout><p>child</p></RootLayout>);
    expect(html).toContain('<html lang="en" class="font-geist"');
    expect(String(metadata.metadataBase)).toBe("https://comments.bookchaowalit.com/");
  });
});
