import type { ProposalPayload, SectionConfigEntry } from "@/lib/types";
import { normalizeSectionConfig } from "@/lib/sections/index";

export const CURRENT_PROPOSAL_SCHEMA_VERSION = 1;

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
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}
