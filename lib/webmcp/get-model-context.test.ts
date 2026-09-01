import { afterEach, describe, expect, it } from "vitest";
import {
  describeModelContextLocation,
  getModelContext,
} from "./get-model-context";
import { installFakeModelContext } from "../../test/mock-model-context";

describe("getModelContext", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("returns undefined and reports 'absent' when no API exists", () => {
    expect(getModelContext()).toBeUndefined();
    expect(describeModelContextLocation()).toBe("absent");
  });

  it("prefers document.modelContext", () => {
    ({ restore } = installFakeModelContext("document"));
    expect(getModelContext()).toBeDefined();
    expect(describeModelContextLocation()).toBe("document.modelContext");
  });

  it("falls back to the deprecated navigator alias", () => {
    ({ restore } = installFakeModelContext("navigator"));
    expect(getModelContext()).toBeDefined();
    expect(describeModelContextLocation()).toBe(
      "navigator.modelContext (deprecated alias)"
    );
  });
});
