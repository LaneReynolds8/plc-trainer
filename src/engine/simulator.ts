import {
  type ControllerState,
  type CounterValue,
  type Instruction,
  type Node,
  type Program,
  type TagValue,
  type TimerValue,
  ioKey,
} from './types';

export function initialValue(type: 'BOOL' | 'TIMER' | 'COUNTER'): TagValue {
  if (type === 'TIMER') return { PRE: 0, ACC: 0, EN: false, TT: false, DN: false };
  if (type === 'COUNTER') return { PRE: 0, ACC: 0, CU: false, DN: false };
  return false;
}

export function createControllerState(program: Program | null): ControllerState {
  const values: Record<string, TagValue> = {};
  for (const tag of program?.tags ?? []) values[tag.name] = initialValue(tag.type);
  return { values, inputs: {}, outputs: {}, energized: new Set(), edges: {} };
}

/** Bit members that ladder contacts can examine on timers and counters. */
export const TIMER_BITS = ['DN', 'TT', 'EN'] as const;
export const COUNTER_BITS = ['DN', 'CU'] as const;

/** Read a bit operand: a BOOL tag ("Motor") or a member bit ("T1.DN"). */
export function readBit(values: Record<string, TagValue>, operand: string): boolean {
  const [base, member] = operand.split('.');
  const v = values[base];
  if (v === undefined) return false;
  if (typeof v === 'boolean') return member ? false : v;
  if (!member) return false;
  return Boolean((v as unknown as Record<string, unknown>)[member]);
}

function writeBit(values: Record<string, TagValue>, operand: string, on: boolean) {
  if (operand.includes('.')) return; // member bits are read-only in this simulator
  if (typeof values[operand] === 'boolean' || values[operand] === undefined) values[operand] = on;
}

interface ScanCtx {
  values: Record<string, TagValue>;
  energized: Set<string>;
  edges: Record<string, boolean>;
  dtMs: number;
}

function execInstruction(ins: Instruction, rungIn: boolean, ctx: ScanCtx): boolean {
  const { values } = ctx;
  let out = rungIn;
  switch (ins.op) {
    case 'NO':
      out = rungIn && readBit(values, ins.tag);
      break;
    case 'NC':
      out = rungIn && !readBit(values, ins.tag);
      break;
    case 'COIL':
      writeBit(values, ins.tag, rungIn);
      break;
    case 'LATCH':
      if (rungIn) writeBit(values, ins.tag, true);
      break;
    case 'UNLATCH':
      if (rungIn) writeBit(values, ins.tag, false);
      break;
    case 'ONESHOT': {
      const prev = ctx.edges[ins.id] ?? false;
      ctx.edges[ins.id] = rungIn;
      out = rungIn && !prev;
      break;
    }
    case 'TON': {
      const t = values[ins.tag] as TimerValue | undefined;
      if (!t || typeof t !== 'object') break;
      t.PRE = ins.preset ?? t.PRE;
      if (rungIn) {
        t.EN = true;
        t.ACC = Math.min(t.PRE, t.ACC + ctx.dtMs);
        t.DN = t.ACC >= t.PRE;
        t.TT = !t.DN;
      } else {
        t.EN = t.TT = t.DN = false;
        t.ACC = 0;
      }
      break;
    }
    case 'TOF': {
      const t = values[ins.tag] as TimerValue | undefined;
      if (!t || typeof t !== 'object') break;
      t.PRE = ins.preset ?? t.PRE;
      if (rungIn) {
        t.EN = true;
        t.DN = true;
        t.TT = false;
        t.ACC = 0;
      } else {
        t.EN = false;
        if (t.DN) {
          t.ACC = Math.min(t.PRE, t.ACC + ctx.dtMs);
          if (t.ACC >= t.PRE) {
            t.DN = false;
            t.TT = false;
          } else t.TT = true;
        }
      }
      break;
    }
    case 'CTU': {
      const c = values[ins.tag] as CounterValue | undefined;
      if (!c || typeof c !== 'object') break;
      c.PRE = ins.preset ?? c.PRE;
      if (rungIn && !c.CU) c.ACC += 1;
      c.CU = rungIn;
      c.DN = c.ACC >= c.PRE;
      break;
    }
    case 'RES': {
      const v = values[ins.tag];
      if (rungIn && v && typeof v === 'object') {
        v.ACC = 0;
        v.DN = false;
        if ('TT' in v) v.TT = false;
      }
      break;
    }
  }
  if (out) ctx.energized.add(ins.id);
  return out;
}

function execSeries(nodes: Node[], rungIn: boolean, ctx: ScanCtx): boolean {
  let power = rungIn;
  for (const node of nodes) {
    if (node.kind === 'instr') {
      power = execInstruction(node, power, ctx);
    } else {
      let any = false;
      for (const leg of node.legs) {
        if (execSeries(leg, power, ctx)) any = true;
      }
      power = any;
      if (power) ctx.energized.add(node.id);
    }
  }
  return power;
}

/**
 * Run one scan: read inputs into input aliases, solve every rung top to bottom,
 * then write output aliases to the output image. Returns a new state object.
 */
export function scan(program: Program, prev: ControllerState, dtMs: number): ControllerState {
  const values = structuredClone(prev.values);
  // make sure every tag exists (program may have been changed by a download)
  for (const tag of program.tags) {
    const v = values[tag.name];
    const ok = tag.type === 'BOOL' ? typeof v === 'boolean' : typeof v === 'object';
    if (!ok) values[tag.name] = initialValue(tag.type);
  }

  // 1. Read inputs
  for (const tag of program.tags) {
    if (tag.io?.kind === 'input') values[tag.name] = prev.inputs[ioKey(tag.io)] ?? false;
  }

  // 2. Solve logic
  const ctx: ScanCtx = { values, energized: new Set(), edges: { ...prev.edges }, dtMs };
  for (const rung of program.rungs) {
    if (execSeries(rung.nodes, true, ctx)) ctx.energized.add(rung.id);
  }

  // 3. Write outputs
  const outputs: Record<string, boolean> = {};
  for (const tag of program.tags) {
    if (tag.io?.kind === 'output') outputs[ioKey(tag.io)] = readBit(values, tag.name);
  }

  return { values, inputs: prev.inputs, outputs, energized: ctx.energized, edges: ctx.edges };
}

/** Behavior test helper used by lesson checks and unit tests. */
export interface BehaviorStep {
  inputs: Record<string, boolean>; // keyed by "slot:point"
  /** How long to hold these inputs, in ms (scanned at 10 ms). Default one scan. */
  holdMs?: number;
  expect: Record<string, boolean>; // tag/operand name -> expected bit
}

export function runBehavior(program: Program, steps: BehaviorStep[]): { pass: boolean; failedStep?: number } {
  let state = createControllerState(program);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    state = { ...state, inputs: { ...state.inputs, ...step.inputs } };
    const scans = Math.max(2, Math.ceil((step.holdMs ?? 0) / 10));
    for (let s = 0; s < scans; s++) state = scan(program, state, 10);
    for (const [operand, want] of Object.entries(step.expect)) {
      if (readBit(state.values, operand) !== want) return { pass: false, failedStep: i };
    }
  }
  return { pass: true };
}
