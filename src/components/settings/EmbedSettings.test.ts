import { describe, expect, it } from "vitest";
import { buildEmbedCode } from "./EmbedSettings";

describe("registration embed", () => {
  it("uses the selected registration address at full width with a tall form viewport", () => {
    const code = buildEmbedCode("https://www.teevents.golf/t/test-event#register", "Test Event");
    expect(code).toContain('src="https://www.teevents.golf/t/test-event#register"');
    expect(code).toContain("width:100%;min-height:1600px");
    expect(code).toContain('allow="payment"');
  });
  it("keeps event titles inside a single escaped iframe attribute", () => {
    const code = buildEmbedCode("https://www.teevents.golf/t/test-event#register", 'Test & "Guest" <Event>');
    expect(code).toContain('title="Test &amp; &quot;Guest&quot; &lt;Event&gt; registration"');
  });
});