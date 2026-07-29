import { resolveVizComponentSettings } from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz component settings resolution", () => {
  it("immutably applies resolved inputs through canonical colon-delimited paths", () => {
    const settings = {
      appearance: {
        scaleY: 0.8,
        color: "#ffffff",
      },
      enabled: false,
    };

    const resolved = resolveVizComponentSettings(settings, {
      "appearance:scaleY": {
        key: "appearance:scaleY",
        sourceKind: "graph-output",
        status: "resolved",
        value: 1.25,
      },
      enabled: {
        key: "enabled",
        sourceKind: "literal",
        status: "resolved",
        value: true,
      },
      missing: {
        key: "missing",
        sourceKind: "graph-output",
        status: "missing",
      },
    });

    expect(resolved).toEqual({
      appearance: {
        scaleY: 1.25,
        color: "#ffffff",
      },
      enabled: true,
    });
    expect(settings.appearance.scaleY).toBe(0.8);
  });

  it("ignores unsafe object-prototype paths", () => {
    const resolved = resolveVizComponentSettings({}, {
      "__proto__:polluted": {
        key: "__proto__:polluted",
        sourceKind: "literal",
        status: "resolved",
        value: true,
      },
    });

    expect(resolved).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
