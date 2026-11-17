import {
  type Branch,
  type Instruction,
  type Node,
  type Op,
  type Program,
  type Rung,
  isOutputOp,
  tagTypesFor,
} from './types';

/** Address of a series inside a rung: a chain of (branch node index, leg index) hops. */
export type SeriesPath = { node: number; leg: number }[];

/** A gap in a series where a new instruction can go. */
export interface InsertPoint {
  rung: number;
  path: SeriesPath;
  index: number;
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function newInstruction(op: Op, tag = '', preset?: number): Instruction {
  const needsPreset = op === 'TON' || op === 'TOF' || op === 'CTU';
  return { kind: 'instr', id: newId('i'), op, tag, preset: needsPreset ? (preset ?? (op === 'CTU' ? 5 : 3000)) : undefined };
}

export function newRung(comment = ''): Rung {
  return { id: newId('r'), comment, nodes: [] };
}

export function getSeries(rung: Rung, path: SeriesPath): Node[] {
  let series = rung.nodes;
  for (const hop of path) {
    const n = series[hop.node];
    if (!n || n.kind !== 'branch') throw new Error('Bad series path');
    series = n.legs[hop.leg];
  }
  return series;
}

function clone(p: Program): Program {
  return structuredClone(p);
}

export function insertNode(p: Program, at: InsertPoint, node: Node): Program {
  const next = clone(p);
  getSeries(next.rungs[at.rung], at.path).splice(at.index, 0, node);
  return next;
}

/** Find an instruction or branch by id and return its parent series and index. */
export function locate(p: Program, id: string): { rung: number; series: Node[]; index: number } | null {
  const walk = (series: Node[], rung: number): { rung: number; series: Node[]; index: number } | null => {
    for (let i = 0; i < series.length; i++) {
      const n = series[i];
      if (n.id === id) return { rung, series, index: i };
      if (n.kind === 'branch') {
        for (const leg of n.legs) {
          const r = walk(leg, rung);
          if (r) return r;
        }
      }
    }
    return null;
  };
  for (let r = 0; r < p.rungs.length; r++) {
    const found = walk(p.rungs[r].nodes, r);
    if (found) return found;
  }
  return null;
}

export function removeNode(p: Program, id: string): Program {
  const next = clone(p);
  const loc = locate(next, id);
  if (!loc) return p;
  loc.series.splice(loc.index, 1);
  return next;
}

export function updateInstruction(p: Program, id: string, patch: Partial<Instruction>): Program {
  const next = clone(p);
  const loc = locate(next, id);
  if (!loc) return p;
  const n = loc.series[loc.index];
  if (n.kind === 'instr') Object.assign(n, patch);
  return next;
}

/** Wrap a node in a new branch with an empty second leg (the classic "add a parallel path"). */
export function wrapInBranch(p: Program, id: string): Program {
  const next = clone(p);
  const loc = locate(next, id);
  if (!loc) return p;
  const node = loc.series[loc.index];
  const branch: Branch = { kind: 'branch', id: newId('b'), legs: [[node], []] };
  loc.series[loc.index] = branch;
  return next;
}

export function addLeg(p: Program, branchId: string): Program {
  const next = clone(p);
  const loc = locate(next, branchId);
  if (!loc) return p;
  const n = loc.series[loc.index];
  if (n.kind === 'branch') n.legs.push([]);
  return next;
}

export function addRung(p: Program, afterIndex = p.rungs.length - 1): Program {
  const next = clone(p);
  next.rungs.splice(afterIndex + 1, 0, newRung());
  return next;
}

export function removeRung(p: Program, index: number): Program {
  const next = clone(p);
  next.rungs.splice(index, 1);
  return next;
}

export function setRungComment(p: Program, index: number, comment: string): Program {
  const next = clone(p);
  next.rungs[index].comment = comment;
  return next;
}

export interface VerifyError {
  rung: number;
  id?: string;
  message: string;
}

/** Check a program for the mistakes a real editor would refuse to download. */
export function verify(p: Program): VerifyError[] {
  const errors: VerifyError[] = [];
  const tagByName = new Map(p.tags.map((t) => [t.name, t]));

  const checkSeries = (series: Node[], rung: number) => {
    for (const n of series) {
      if (n.kind === 'branch') {
        n.legs.forEach((leg) => {
          if (leg.length === 0) errors.push({ rung, id: n.id, message: 'A branch has an empty leg. An empty leg is a short circuit around the logic. Add an instruction or delete the branch.' });
          checkSeries(leg, rung);
        });
        continue;
      }
      if (!n.tag) {
        errors.push({ rung, id: n.id, message: 'An instruction has no tag assigned.' });
        continue;
      }
      const [base, member] = n.tag.split('.');
      const tag = tagByName.get(base);
      if (!tag) {
        errors.push({ rung, id: n.id, message: `Tag "${base}" does not exist.` });
        continue;
      }
      const wanted = tagTypesFor(n.op);
      const actual = member ? 'BOOL' : tag.type;
      if (!wanted.includes(actual)) {
        errors.push({ rung, id: n.id, message: `"${n.tag}" is a ${actual} but this instruction needs a ${wanted.join(' or ')}.` });
      }
      if (member && isOutputOp(n.op)) {
        errors.push({ rung, id: n.id, message: `"${n.tag}" is a status bit and cannot be written by an output.` });
      }
      if (n.tag && tag.io?.kind === 'input' && isOutputOp(n.op)) {
        errors.push({ rung, id: n.id, message: `"${n.tag}" is a physical input. Outputs cannot write to inputs.` });
      }
    }
  };

  p.rungs.forEach((rung, r) => {
    if (rung.nodes.length === 0) {
      errors.push({ rung: r, message: 'Rung is empty.' });
      return;
    }
    checkSeries(rung.nodes, r);
    const last = rung.nodes[rung.nodes.length - 1];
    const endsInOutput =
      last.kind === 'instr'
        ? isOutputOp(last.op)
        : last.legs.every((leg) => leg.length > 0 && leg[leg.length - 1].kind === 'instr' && isOutputOp((leg[leg.length - 1] as Instruction).op));
    if (!endsInOutput) errors.push({ rung: r, message: 'Rung does not end with an output instruction.' });
  });
  return errors;
}

/** Simple structural equality used for "project and controller differ". */
export function programsEqual(a: Program | null, b: Program | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}
