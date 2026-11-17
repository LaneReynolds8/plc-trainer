import type { Program } from './engine/types';

/** The project a learner starts with: tags already wired to the virtual rack, one empty rung. */
export function starterProject(): Program {
  return {
    name: 'Conveyor_Training',
    tags: [
      { name: 'Start_PB', type: 'BOOL', description: 'Start pushbutton (NO)', io: { kind: 'input', slot: 1, point: 0 } },
      { name: 'Stop_PB', type: 'BOOL', description: 'Stop pushbutton (NC)', io: { kind: 'input', slot: 1, point: 1 } },
      { name: 'Jog_PB', type: 'BOOL', description: 'Jog pushbutton (NO)', io: { kind: 'input', slot: 1, point: 2 } },
      { name: 'Auto_SS', type: 'BOOL', description: 'Hand/Auto selector, ON = Auto', io: { kind: 'input', slot: 1, point: 3 } },
      { name: 'Motor', type: 'BOOL', description: 'Conveyor motor starter', io: { kind: 'output', slot: 2, point: 0 } },
      { name: 'Run_Lamp', type: 'BOOL', description: 'Green RUN pilot light', io: { kind: 'output', slot: 2, point: 1 } },
      { name: 'Fault_Lamp', type: 'BOOL', description: 'Amber FAULT pilot light', io: { kind: 'output', slot: 2, point: 2 } },
      { name: 'Delay_Timer', type: 'TIMER', description: 'General purpose timer' },
      { name: 'Part_Count', type: 'COUNTER', description: 'General purpose counter' },
    ],
    rungs: [{ id: 'r-start', comment: '', nodes: [] }],
  };
}

/** What is in the controller's memory before the learner's first download. */
export function emptyControllerProgram(): Program {
  return { name: '(no program)', tags: [], rungs: [] };
}
