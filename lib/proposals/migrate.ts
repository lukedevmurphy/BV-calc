import type { ProposalPayload, SectionConfigEntry } from "@/lib/types";
import { normalizeSectionConfig } from "@/lib/sections/index";
import { DEFAULT_CODING, DEFAULT_IT_TAKEOUT, DEFAULT_VALUE_MODEL } from "@/lib/data/defaults";

// v3: coding-efficiency driver (assumptions.coding) + topline single-actual.
// v4: IT cost takeout driver (assumptions.itTakeout). All backfilled on load.
export const CURRENT_PROPOSAL_SCHEMA_VERSION = 4;

type LegacyProposalPayload = Omit<ProposalPayload, "schemaVersion" | "revision"> & {
  schemaVersion?: number;
  revision?: number;
  sectionConfig?: SectionConfigEntry[];
};

/**
 * Upgrades a persisted payload at the application boundary. Version 0 is the
 * original unversioned shape. Future migrations should be added here in order.
 */
export function migrateProposalPayload(input: unknown): ProposalPayload {
  if (!isRecord(input) || !isRecord(input.company) || typeof input.company.name !== "string") {
    throw new Error("invalid ProposalPayload: company is required");
  }
  if (!isRecord(input.assumptions) || !Array.isArray(input.selectedUseCaseIds)) {
    throw new Error("invalid ProposalPayload: assumptions and selectedUseCaseIds are required");
  }
  if (!Array.isArray(input.sections)) {
    throw new Error("invalid ProposalPayload: sections are required");
  }

  const legacy = input as LegacyProposalPayload;
  const incomingVersion = nonNegativeInteger(legacy.schemaVersion, 0);
  if (incomingVersion > CURRENT_PROPOSAL_SCHEMA_VERSION) {
    throw new Error(
      `proposal schema ${incomingVersion} is newer than supported schema ${CURRENT_PROPOSAL_SCHEMA_VERSION}`,
    );
  }

  return {
    ...legacy,
    schemaVersion: CURRENT_PROPOSAL_SCHEMA_VERSION,
    revision: nonNegativeInteger(legacy.revision, 0),
    selectedUseCaseIds: legacy.selectedUseCaseIds.filter(
      (id): id is string => typeof id === "string",
    ),
    sectionConfig: normalizeSectionConfig(legacy.sectionConfig),
    assumptions: {
      ...legacy.assumptions,
      // Backfill the coding-efficiency + IT-takeout drivers; a stored partial wins per-field.
      coding: { ...DEFAULT_CODING, ...(legacy.assumptions.coding ?? {}) },
      itTakeout: { ...DEFAULT_IT_TAKEOUT, ...(legacy.assumptions.itTakeout ?? {}) },
    },
    valueModel: {
      ...DEFAULT_VALUE_MODEL,
      ...(legacy.valueModel ?? {}),
      // v3: topline was a Ranged {low,base,high}; it's now a single current-state
      // actual. Collapse any legacy range to its base.
      topline: coerceTopline(legacy.valueModel?.topline, DEFAULT_VALUE_MODEL.topline),
      topDownFunctions:
        legacy.valueModel?.topDownFunctions?.filter(
          (label): label is string => typeof label === "string" && label.trim().length > 0,
        ) ?? DEFAULT_VALUE_MODEL.topDownFunctions,
      topDownAnnualCosts: legacy.valueModel?.topDownAnnualCosts ?? {},
    },
  };
}

/** Accepts the new number form or a legacy Ranged {low,base,high}, returning a
 *  single figure. Falls back to the default when neither is usable. */
function coerceTopline(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isRecord(value) && typeof value.base === "number" && Number.isFinite(value.base)) {
    return value.base;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}
