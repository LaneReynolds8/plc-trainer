import { createControllerState, scan } from './engine/simulator';
import * as edit from './engine/edit';
import type { InsertPoint, VerifyError } from './engine/edit';
import type { ControllerState, Instruction, Node, Op, Program, Tag } from './engine/types';
import { inputsFromDevices } from './plant';
import type { PlatformProfile } from './profiles';
import { emptyControllerProgram, starterProject } from './starterProject';

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'gap'; at: InsertPoint }
  | null;

export type View = 'ladder' | 'tags' | 'hardware';
export type Dialog = null | 'goOnline' | 'download' | 'upload';

export type AppEvent = 'verify-ok' | 'verify-fail' | 'online' | 'offline' | 'download' | 'upload' | 'run' | 'program' | 'edit';

export interface LogLine {
  time: string;
  level: 'info' | 'warn' | 'error';
  text: string;
}

export interface AppState {
  profile: PlatformProfile;
  project: Program;
  /** Project saved since last edit? */
  view: View;
  selection: Selection;
  online: boolean;
  controller: {
    program: Program;
    mode: 'program' | 'run';
    state: ControllerState;
  };
  actuated: Record<string, boolean>;
  dialog: Dialog;
  log: LogLine[];
  verifyErrors: VerifyError[];
  /** Every event that happened, in order. Lesson checks read this. */
  events: AppEvent[];
  lesson: { id: string | null; step: number; completed: string[] };
}

export type Action =
  | { type: 'tick'; dtMs: number }
  | { type: 'setView'; view: View }
  | { type: 'select'; selection: Selection }
  | { type: 'insert'; op: Op }
  | { type: 'addBranch' }
  | { type: 'addLeg'; branchId: string }
  | { type: 'deleteSelected' }
  | { type: 'updateInstruction'; id: string; patch: Partial<Instruction> }
  | { type: 'addRung' }
  | { type: 'deleteRung'; index: number }
  | { type: 'rungComment'; index: number; comment: string }
  | { type: 'addTag'; tag: Tag }
  | { type: 'verify' }
  | { type: 'openDialog'; dialog: Dialog }
  | { type: 'goOnline' }
  | { type: 'goOffline' }
  | { type: 'download' }
  | { type: 'upload' }
  | { type: 'setMode'; mode: 'program' | 'run' }
  | { type: 'actuate'; device: string; on: boolean }
  | { type: 'startLesson'; id: string }
  | { type: 'lessonStep'; step: number }
  | { type: 'completeLesson'; id: string }
  | { type: 'resetWorkspace' };

export function initialState(profile: PlatformProfile): AppState {
  const ctrl = emptyControllerProgram();
  return {
    profile,
    project: starterProject(),
    view: 'ladder',
    selection: { kind: 'gap', at: { rung: 0, path: [], index: 0 } },
    online: false,
    controller: { program: ctrl, mode: 'program', state: createControllerState(ctrl) },
    actuated: {},
    dialog: null,
    log: [{ time: now(), level: 'info', text: 'Project opened. You are offline: changes are only on your PC.' }],
    verifyErrors: [],
    events: [],
    lesson: { id: null, step: 0, completed: [] },
  };
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function log(s: AppState, level: LogLine['level'], text: string): LogLine[] {
  return [...s.log.slice(-199), { time: now(), level, text }];
}

export const projectMatchesController = (s: AppState) => edit.programsEqual(s.project, s.controller.program);

/** Editing the project is only allowed offline in this milestone. */
function canEdit(s: AppState): string | null {
  if (s.online) return `You are online. ${s.profile.terms.goOffline} to edit, then ${s.profile.terms.download.toLowerCase()} your changes.`;
  return null;
}

function editProject(s: AppState, next: Program, selection: Selection = s.selection): AppState {
  return { ...s, project: next, selection, verifyErrors: [], events: [...s.events, 'edit'] };
}

/** Where a new instruction goes: at the selected gap, or right after the selected instruction. */
function insertPointFor(s: AppState): InsertPoint | null {
  const sel = s.selection;
  if (!sel) return null;
  if (sel.kind === 'gap') return sel.at;
  const found = findPath(s.project, sel.id);
  return found ? { ...found, index: found.index + 1 } : null;
}

/** Find the series path of a node id. */
export function findPath(p: Program, id: string): InsertPoint | null {
  const walk = (nodes: Node[], rung: number, path: InsertPoint['path']): InsertPoint | null => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) return { rung, path, index: i };
      if (n.kind === 'branch') {
        for (let l = 0; l < n.legs.length; l++) {
          const r = walk(n.legs[l], rung, [...path, { node: i, leg: l }]);
          if (r) return r;
        }
      }
    }
    return null;
  };
  for (let r = 0; r < p.rungs.length; r++) {
    const f = walk(p.rungs[r].nodes, r, []);
    if (f) return f;
  }
  return null;
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'tick': {
      const inputs = inputsFromDevices(s.actuated);
      const { program, mode, state } = s.controller;
      if (mode !== 'run') {
        // In Program mode the controller does not scan; outputs are off.
        return { ...s, controller: { ...s.controller, state: { ...state, inputs, outputs: {}, energized: new Set() } } };
      }
      const next = scan(program, { ...state, inputs }, a.dtMs);
      return { ...s, controller: { ...s.controller, state: next } };
    }

    case 'setView':
      return { ...s, view: a.view };

    case 'select':
      return { ...s, selection: a.selection };

    case 'insert': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      const at = insertPointFor(s);
      if (!at) return { ...s, log: log(s, 'warn', 'Click a spot on a rung first, then pick an instruction.') };
      const ins = edit.newInstruction(a.op);
      const next = edit.insertNode(s.project, at, ins);
      return editProject(s, next, { kind: 'node', id: ins.id });
    }

    case 'addBranch': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      if (s.selection?.kind !== 'node') return { ...s, log: log(s, 'warn', 'Select the instruction you want to put a branch around, then click Branch.') };
      const next = edit.wrapInBranch(s.project, s.selection.id);
      // select the empty leg so the next instruction goes there
      const loc = findPath(next, s.selection.id);
      const sel: Selection = loc && loc.path.length
        ? { kind: 'gap', at: { rung: loc.rung, path: [...loc.path.slice(0, -1), { node: loc.path[loc.path.length - 1].node, leg: 1 }], index: 0 } }
        : s.selection;
      return editProject(s, next, sel);
    }

    case 'addLeg': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      return editProject(s, edit.addLeg(s.project, a.branchId));
    }

    case 'deleteSelected': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      if (s.selection?.kind !== 'node') return s;
      return editProject(s, edit.removeNode(s.project, s.selection.id), null);
    }

    case 'updateInstruction': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      return editProject(s, edit.updateInstruction(s.project, a.id, a.patch));
    }

    case 'addRung': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      const next = edit.addRung(s.project);
      return editProject(s, next, { kind: 'gap', at: { rung: next.rungs.length - 1, path: [], index: 0 } });
    }

    case 'deleteRung': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      return editProject(s, edit.removeRung(s.project, a.index), null);
    }

    case 'rungComment': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      return editProject(s, edit.setRungComment(s.project, a.index, a.comment));
    }

    case 'addTag': {
      const blocked = canEdit(s);
      if (blocked) return { ...s, log: log(s, 'warn', blocked) };
      if (s.project.tags.some((t) => t.name.toLowerCase() === a.tag.name.toLowerCase())) {
        return { ...s, log: log(s, 'error', `A tag named "${a.tag.name}" already exists.`) };
      }
      return editProject(s, { ...s.project, tags: [...s.project.tags, a.tag] });
    }

    case 'verify': {
      const errors = edit.verify(s.project);
      const lines = errors.length
        ? [...s.log, ...errors.map((e) => ({ time: now(), level: 'error' as const, text: `Rung ${e.rung}: ${e.message}` }))]
        : log(s, 'info', `${s.profile.terms.verify}: no errors. The program is ready to ${s.profile.terms.download.toLowerCase()}.`);
      return { ...s, verifyErrors: errors, log: lines, events: [...s.events, errors.length ? 'verify-fail' : 'verify-ok'] };
    }

    case 'openDialog':
      return { ...s, dialog: a.dialog };

    case 'goOnline': {
      if (s.online) return s;
      const match = projectMatchesController(s);
      const base = { ...s, online: true, events: [...s.events, 'online' as const] };
      if (match) return { ...base, dialog: null, log: log(s, 'info', 'Online. The project on your PC matches the controller.') };
      return { ...base, dialog: 'goOnline', log: log(s, 'warn', 'Online, but the project on your PC does not match the program in the controller.') };
    }

    case 'goOffline':
      return { ...s, online: false, dialog: null, events: [...s.events, 'offline'], log: log(s, 'info', 'Offline. The controller keeps running whatever program it has.') };

    case 'download': {
      const errors = edit.verify(s.project);
      if (errors.length) {
        return {
          ...s,
          dialog: null,
          verifyErrors: errors,
          online: s.online,
          events: [...s.events, 'verify-fail'],
          log: [...log(s, 'error', `${s.profile.terms.download} stopped: fix the errors first.`), ...errors.map((e) => ({ time: now(), level: 'error' as const, text: `Rung ${e.rung}: ${e.message}` }))],
        };
      }
      const program = structuredClone(s.project);
      return {
        ...s,
        online: true,
        dialog: null,
        controller: { program, mode: 'program', state: createControllerState(program) },
        events: [...s.events, 'download', 'program'],
        log: log(s, 'info', `${s.profile.terms.download} complete: your PC's project replaced the program in the controller. Controller is in ${s.profile.terms.programMode}.`),
      };
    }

    case 'upload': {
      const program = structuredClone(s.controller.program);
      return {
        ...s,
        online: true,
        dialog: null,
        project: program,
        selection: null,
        events: [...s.events, 'upload'],
        log: log(s, 'warn', `${s.profile.terms.upload} complete: the controller's program replaced the project on your PC.`),
      };
    }

    case 'setMode': {
      if (!s.online) return { ...s, log: log(s, 'warn', `You must be online to change the controller mode. Click ${s.profile.terms.goOnline}.`) };
      if (a.mode === 'run' && s.controller.program.rungs.length === 0) {
        return { ...s, log: log(s, 'warn', 'The controller has no program to run. Download one first.') };
      }
      const label = a.mode === 'run' ? s.profile.terms.runMode : s.profile.terms.programMode;
      return {
        ...s,
        controller: { ...s.controller, mode: a.mode },
        events: [...s.events, a.mode],
        log: log(s, 'info', `Controller switched to ${label}.${a.mode === 'program' ? ' Outputs are off.' : ' The program is scanning and controlling outputs.'}`),
      };
    }

    case 'actuate':
      return { ...s, actuated: { ...s.actuated, [a.device]: a.on } };

    case 'startLesson':
      return { ...s, lesson: { ...s.lesson, id: a.id, step: 0 } };

    case 'lessonStep':
      return { ...s, lesson: { ...s.lesson, step: a.step } };

    case 'completeLesson':
      return {
        ...s,
        lesson: { ...s.lesson, completed: s.lesson.completed.includes(a.id) ? s.lesson.completed : [...s.lesson.completed, a.id] },
      };

    case 'resetWorkspace': {
      const fresh = initialState(s.profile);
      return { ...fresh, lesson: s.lesson };
    }
  }
}
