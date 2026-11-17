import { runBehavior } from '../engine/simulator';
import type { Instruction, Node, Op, Program } from '../engine/types';
import type { StepContext } from './types';

export function allInstructions(nodes: Node[]): Instruction[] {
  const out: Instruction[] = [];
  for (const n of nodes) {
    if (n.kind === 'instr') out.push(n);
    else n.legs.forEach((leg) => out.push(...allInstructions(leg)));
  }
  return out;
}

export function rungHas(p: Program, rung: number, op: Op, tag?: string): boolean {
  const r = p.rungs[rung];
  if (!r) return false;
  return allInstructions(r.nodes).some((i) => i.op === op && (tag === undefined || i.tag === tag));
}

export const happened = (ctx: StepContext, e: StepContext['eventsSinceStart'][number]) => ctx.eventsSinceStart.includes(e);

/** Classic start/stop seal-in behavior, using the virtual rack's input points. */
export function sealInWorks(p: Program): boolean {
  return runBehavior(p, [
    { inputs: { '1:0': false, '1:1': true }, expect: { Motor: false } },
    { inputs: { '1:0': true }, expect: { Motor: true } },
    { inputs: { '1:0': false }, expect: { Motor: true } },
    { inputs: { '1:1': false }, expect: { Motor: false } },
    { inputs: { '1:1': true }, expect: { Motor: false } },
    { inputs: { '1:0': true, '1:1': false }, expect: { Motor: false } },
  ]).pass;
}

export const outputOn = (ctx: StepContext, slot: number, point: number) => ctx.state.controller.state.outputs[`${slot}:${point}`] === true;
