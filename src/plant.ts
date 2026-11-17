import type { IoImage } from './engine/types';
import { ioKey } from './engine/types';

/** Field devices wired to the virtual rack. */
export type InputDevice = {
  id: string;
  label: string;
  kind: 'pb-no' | 'pb-nc' | 'selector';
  color: 'green' | 'red' | 'black';
  slot: number;
  point: number;
  wiring: string;
};

export type OutputDevice = {
  id: string;
  label: string;
  kind: 'motor' | 'lamp';
  color: 'green' | 'red' | 'amber';
  slot: number;
  point: number;
  wiring: string;
};

export const inputDevices: InputDevice[] = [
  { id: 'start', label: 'START', kind: 'pb-no', color: 'green', slot: 1, point: 0, wiring: 'Normally open pushbutton. Input is ON only while pressed.' },
  { id: 'stop', label: 'STOP', kind: 'pb-nc', color: 'red', slot: 1, point: 1, wiring: 'Normally closed pushbutton. Input is ON until pressed.' },
  { id: 'jog', label: 'JOG', kind: 'pb-no', color: 'black', slot: 1, point: 2, wiring: 'Normally open pushbutton.' },
  { id: 'auto', label: 'HAND / AUTO', kind: 'selector', color: 'black', slot: 1, point: 3, wiring: 'Maintained selector switch. Input is ON in AUTO.' },
];

export const outputDevices: OutputDevice[] = [
  { id: 'motor', label: 'Conveyor motor (M1)', kind: 'motor', color: 'green', slot: 2, point: 0, wiring: 'Motor starter coil.' },
  { id: 'runLamp', label: 'RUN lamp', kind: 'lamp', color: 'green', slot: 2, point: 1, wiring: 'Green pilot light.' },
  { id: 'faultLamp', label: 'FAULT lamp', kind: 'lamp', color: 'amber', slot: 2, point: 2, wiring: 'Amber pilot light.' },
];

/** Translate what the learner is doing with the buttons into input card voltages. */
export function inputsFromDevices(actuated: Record<string, boolean>): IoImage {
  const img: IoImage = {};
  for (const d of inputDevices) {
    const a = actuated[d.id] ?? false;
    img[ioKey(d)] = d.kind === 'pb-nc' ? !a : a;
  }
  return img;
}
