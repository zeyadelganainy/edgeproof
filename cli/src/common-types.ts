// EdgeProof provider/contract type aliases. Modeled on example-counter counter-cli/src/common-types.ts.

import { EdgeProof, type EdgeProofPrivateState } from "@edgeproof/contract";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js/types";
import type { DeployedContract, FoundContract } from "@midnight-ntwrk/midnight-js/contracts";
import type { ProvableCircuitId } from "@midnight-ntwrk/compact-js";

export type EdgeProofCircuits = ProvableCircuitId<EdgeProof.Contract<EdgeProofPrivateState>>;

export const EdgeProofPrivateStateId = "edgeproofPrivateState";

export type EdgeProofProviders = MidnightProviders<
  EdgeProofCircuits,
  typeof EdgeProofPrivateStateId,
  EdgeProofPrivateState
>;

export type EdgeProofContractType = EdgeProof.Contract<EdgeProofPrivateState>;

export type DeployedEdgeProofContract =
  | DeployedContract<EdgeProofContractType>
  | FoundContract<EdgeProofContractType>;
