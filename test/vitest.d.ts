import "vitest";
import type { AxeMatchers } from "jest-axe";

declare module "vitest" {
  interface Assertion<T = unknown> extends AxeMatchers {
    _t?: T;
  }
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
