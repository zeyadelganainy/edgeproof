import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  tradeLog(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { pnlEnc: bigint,
                                                                         valid: boolean,
                                                                         openTime: bigint
                                                                       }[]];
  commitmentSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  equityOff(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  cumValid(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  cumWins(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  peakOff(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
}

export type ImpureCircuits<PS> = {
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  proveNetPnL(context: __compactRuntime.CircuitContext<PS>,
              minNetDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveWinRate(context: __compactRuntime.CircuitContext<PS>,
               minWinRatePct_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMaxDrawdown(context: __compactRuntime.CircuitContext<PS>,
                   maxDdDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  proveNetPnL(context: __compactRuntime.CircuitContext<PS>,
              minNetDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveWinRate(context: __compactRuntime.CircuitContext<PS>,
               minWinRatePct_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMaxDrawdown(context: __compactRuntime.CircuitContext<PS>,
                   maxDdDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  proveNetPnL(context: __compactRuntime.CircuitContext<PS>,
              minNetDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveWinRate(context: __compactRuntime.CircuitContext<PS>,
               minWinRatePct_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMaxDrawdown(context: __compactRuntime.CircuitContext<PS>,
                   maxDdDeciPips_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly commitment: Uint8Array;
  readonly netPnlProven: boolean;
  readonly netPnlThresholdDeciPips: bigint;
  readonly winRateProven: boolean;
  readonly winRateThresholdPct: bigint;
  readonly maxDrawdownProven: boolean;
  readonly maxDrawdownThresholdDeciPips: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
