// Platform-neutral program model. Instruction "ops" are generic; each
// platform profile decides how they are named and described on screen.

export type BitOp = 'NO' | 'NC' | 'COIL' | 'LATCH' | 'UNLATCH' | 'ONESHOT';
export type BlockOp = 'TON' | 'TOF' | 'CTU' | 'RES';
export type Op = BitOp | BlockOp;

export type TagType = 'BOOL' | 'TIMER' | 'COUNTER';

export interface Tag {
  name: string;
  type: TagType;
  description?: string;
  /** Physical I/O point this tag is an alias for, e.g. { kind: 'input', slot: 1, point: 0 }. */
  io?: IoPoint;
}

export interface IoPoint {
  kind: 'input' | 'output';
  slot: number;
  point: number;
}

export interface Instruction {
  kind: 'instr';
  id: string;
  op: Op;
  /** Tag name the instruction operates on. Empty string means "not addressed yet". */
  tag: string;
  /** Preset for timers (ms) and counters (counts). */
  preset?: number;
}

export interface Branch {
  kind: 'branch';
  id: string;
  /** Parallel legs; each leg is a series of nodes. */
  legs: Node[][];
}

export type Node = Instruction | Branch;

export interface Rung {
  id: string;
  comment: string;
  nodes: Node[];
}

export interface Program {
  name: string;
  tags: Tag[];
  rungs: Rung[];
}

export interface TimerValue {
  PRE: number;
  ACC: number;
  EN: boolean;
  TT: boolean;
  DN: boolean;
}

export interface CounterValue {
  PRE: number;
  ACC: number;
  CU: boolean;
  DN: boolean;
}

export type TagValue = boolean | TimerValue | CounterValue;

/** Input/output image tables keyed by "slot:point". */
export type IoImage = Record<string, boolean>;

export interface ControllerState {
  values: Record<string, TagValue>;
  inputs: IoImage;
  outputs: IoImage;
  /** Instruction/branch ids that were passing power on the last scan (for highlighting). */
  energized: Set<string>;
  /** Previous rung-in state of one-shots and counters, keyed by instruction id. */
  edges: Record<string, boolean>;
}

export const ioKey = (p: { slot: number; point: number }) => `${p.slot}:${p.point}`;

export const isBitOp = (op: Op): op is BitOp =>
  op === 'NO' || op === 'NC' || op === 'COIL' || op === 'LATCH' || op === 'UNLATCH' || op === 'ONESHOT';

/** Tag type an instruction expects. RES works on timers and counters. */
export function tagTypesFor(op: Op): TagType[] {
  if (op === 'TON' || op === 'TOF') return ['TIMER'];
  if (op === 'CTU') return ['COUNTER'];
  if (op === 'RES') return ['TIMER', 'COUNTER'];
  return ['BOOL'];
}

/** Instructions that must sit at the end of a rung (outputs). */
export const isOutputOp = (op: Op) =>
  op === 'COIL' || op === 'LATCH' || op === 'UNLATCH' || op === 'TON' || op === 'TOF' || op === 'CTU' || op === 'RES';
