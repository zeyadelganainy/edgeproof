// In-process simulator for the EdgeProof contract (no proof server / no Docker).
// Mirrors the example-counter Simulator pattern: build a Contract with witnesses,
// initialize state, then drive circuits and read back the public ledger.

import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, ledger } from "../managed/edgeproof/contract/index.js";
import { type EdgeProofPrivateState, witnesses } from "../witnesses.js";

export class EdgeProofSimulator {
  readonly contract: Contract<EdgeProofPrivateState>;
  circuitContext: CircuitContext<EdgeProofPrivateState>;

  constructor(initialPrivateState: EdgeProofPrivateState) {
    this.contract = new Contract<EdgeProofPrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      createConstructorContext(initialPrivateState, "0".repeat(64)),
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public commit(): Ledger {
    this.circuitContext = this.contract.impureCircuits.commit(this.circuitContext).context;
    return this.getLedger();
  }

  public proveNetPnL(minNetDeciPips: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.proveNetPnL(this.circuitContext, minNetDeciPips).context;
    return this.getLedger();
  }

  public proveWinRate(minWinRatePct: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.proveWinRate(this.circuitContext, minWinRatePct).context;
    return this.getLedger();
  }

  public proveMaxDrawdown(maxDdDeciPips: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.proveMaxDrawdown(this.circuitContext, maxDdDeciPips).context;
    return this.getLedger();
  }
}
