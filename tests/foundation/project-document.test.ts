import { exampleProjectDocument } from "@viz-engine/example-projects";
import { describe, expect, it } from "vitest";
import { validateProjectDocument } from "@viz-engine/runtime";

describe("Viz project document validation", () => {
  it("accepts the canonical example project document", () => {
    const result = validateProjectDocument(exampleProjectDocument);

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
