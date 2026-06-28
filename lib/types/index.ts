// Re-export all types from split files for backward compatibility
// Prefer importing from the specific sub-module for tree-shaking:
//   import { SymbioteStateV2 } from "@/lib/types/symbiote"
export * from "./common";
export * from "./symbiote";
export * from "./butterfly";
export * from "./xenogenesis";
