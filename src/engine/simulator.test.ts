import { describe, expect, it } from 'vitest';
import { createControllerState, runBehavior, scan } from './simulator';
import { verify } from './edit';
import type { Instruction, Node, Program } from './types';

const I = (op: Instruction['op'], tag: string, preset?: number): Instruction => ({ kind: 'instr', id: `${op}-${tag}-${Math.random()}`, op, tag, preset });
const B = (...legs: Node[][]): Node => ({ kind: 'branch', id: `b${Math.random()}`, legs });

const baseTags: Program['tags'] = [
  { name: 'Start_PB', type: 'BOOL', io: { kind: 'input', slot: 1, point: 0 } },
  { name: 'Stop_PB', type: 'BOOL', io: { kind: 'input', slot: 1, point: 1 } },
  { name: 'Motor', type: 'BOOL', io: { kind: 'output', slot: 2, point: 0 } },
  { name: 'T1', type: 'TIMER' },
  { name: 'C1', type: 'COUNTER' },
  { name: 'Flag', type: 'BOOL' },
];

const prog = (nodes: Node[][]): Program => ({ name: 'Test', tags: baseTags, rungs: nodes.map((n, i) => ({ id: `r${i}`, comment: '', nodes: n })) });

describe('scan cycle', () => {
  it('copies an input through a contact to an output', () => {
    const p = prog([[I('NO', 'Start_PB'), I('COIL', 'Motor')]]);
    let s = createControllerState(p);
    s = scan(p, { ...s, inputs: { '1:0': true } }, 10);
    expect(s.outputs['2:0']).toBe(true);
    s = scan(p, { ...s, inputs: { '1:0': false } }, 10);
    expect(s.outputs['2:0']).toBe(false);
  });

  it('runs a start/stop seal-in circuit with a normally closed stop', () => {
    const p = prog([[B([I('NO', 'Start_PB')], [I('NO', 'Motor')]), I('NO', 'Stop_PB'), I('COIL', 'Motor')]]);
    const result = runBehavior(p, [
      { inputs: { '1:0': false, '1:1': true }, expect: { Motor: false } },
      { inputs: { '1:0': true }, expect: { Motor: true } },
      { inputs: { '1:0': false }, expect: { Motor: true } },
      { inputs: { '1:1': false }, expect: { Motor: false } },
      { inputs: { '1:1': true }, expect: { Motor: false } },
    ]);
    expect(result.pass).toBe(true);
  });

  it('fails the seal-in behavior when the seal branch is missing', () => {
    const p = prog([[I('NO', 'Start_PB'), I('NO', 'Stop_PB'), I('COIL', 'Motor')]]);
    const result = runBehavior(p, [
      { inputs: { '1:0': true, '1:1': true }, expect: { Motor: true } },
      { inputs: { '1:0': false }, expect: { Motor: true } },
    ]);
    expect(result).toEqual({ pass: false, failedStep: 1 });
  });

  it('times an on-delay timer and sets DN at the preset', () => {
    const p = prog([[I('NO', 'Start_PB'), I('TON', 'T1', 1000)], [I('NO', 'T1.DN'), I('COIL', 'Motor')]]);
    expect(
      runBehavior(p, [
        { inputs: { '1:0': true }, holdMs: 500, expect: { Motor: false, 'T1.TT': true } },
        { inputs: { '1:0': true }, holdMs: 600, expect: { Motor: true, 'T1.DN': true } },
        { inputs: { '1:0': false }, expect: { Motor: false, 'T1.DN': false } },
      ]).pass,
    ).toBe(true);
  });

  it('holds an off-delay timer after the rung goes false', () => {
    const p = prog([[I('NO', 'Start_PB'), I('TOF', 'T1', 500)], [I('NO', 'T1.DN'), I('COIL', 'Motor')]]);
    expect(
      runBehavior(p, [
        { inputs: { '1:0': true }, expect: { Motor: true } },
        { inputs: { '1:0': false }, holdMs: 200, expect: { Motor: true } },
        { inputs: { '1:0': false }, holdMs: 400, expect: { Motor: false } },
      ]).pass,
    ).toBe(true);
  });

  it('counts rising edges only, and resets', () => {
    const p = prog([[I('NO', 'Start_PB'), I('CTU', 'C1', 2)], [I('NO', 'Stop_PB'), I('RES', 'C1')], [I('NO', 'C1.DN'), I('COIL', 'Motor')]]);
    expect(
      runBehavior(p, [
        { inputs: { '1:0': true }, holdMs: 100, expect: { Motor: false } },
        { inputs: { '1:0': false }, expect: { Motor: false } },
        { inputs: { '1:0': true }, expect: { Motor: true } },
        { inputs: { '1:0': false, '1:1': true }, expect: { Motor: false } },
      ]).pass,
    ).toBe(true);
  });

  it('latches and unlatches', () => {
    const p = prog([[I('NO', 'Start_PB'), I('LATCH', 'Motor')], [I('NO', 'Stop_PB'), I('UNLATCH', 'Motor')]]);
    expect(
      runBehavior(p, [
        { inputs: { '1:0': true }, expect: { Motor: true } },
        { inputs: { '1:0': false }, expect: { Motor: true } },
        { inputs: { '1:1': true }, expect: { Motor: false } },
      ]).pass,
    ).toBe(true);
  });

  it('one-shot passes power for a single scan', () => {
    const p = prog([[I('NO', 'Start_PB'), I('ONESHOT', 'Flag'), I('CTU', 'C1', 10)]]);
    let s = createControllerState(p);
    s = { ...s, inputs: { '1:0': true } };
    for (let i = 0; i < 5; i++) s = scan(p, s, 10);
    expect((s.values.C1 as { ACC: number }).ACC).toBe(1);
  });

  it('marks energized instructions for power-flow display', () => {
    const start = I('NO', 'Start_PB');
    const coil = I('COIL', 'Motor');
    const p = prog([[start, coil]]);
    const s = scan(p, { ...createControllerState(p), inputs: { '1:0': true } }, 10);
    expect(s.energized.has(start.id)).toBe(true);
    expect(s.energized.has(coil.id)).toBe(true);
  });
});

describe('verify', () => {
  it('accepts a good program', () => {
    expect(verify(prog([[I('NO', 'Start_PB'), I('COIL', 'Motor')]]))).toEqual([]);
  });
  it('flags missing outputs, empty legs, missing tags and wrong types', () => {
    const errs = verify(prog([[I('NO', 'Start_PB')], [B([I('NO', 'Start_PB')], []), I('COIL', 'Motor')], [I('NO', ''), I('COIL', 'Motor')], [I('NO', 'T1'), I('COIL', 'Start_PB')]]));
    const msgs = errs.map((e) => `${e.rung}: ${e.message}`).join('\n');
    expect(msgs).toContain('0: Rung does not end with an output');
    expect(msgs).toContain('1: A branch has an empty leg');
    expect(msgs).toContain('2: An instruction has no tag');
    expect(msgs).toContain('3: "T1" is a TIMER');
    expect(msgs).toContain('3: "Start_PB" is a physical input');
  });
});
