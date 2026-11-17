import type { PlatformProfile } from './types';

/**
 * Profile for CompactLogix-style controllers.
 * Platform names are used factually to tell learners which equipment the
 * lessons match. No vendor logos, icons or screen layouts are copied.
 */
export const compactLogix: PlatformProfile = {
  id: 'compactlogix',
  displayName: 'CompactLogix',
  family: 'Logix (tag-based)',

  terms: {
    projectTree: 'Project Organizer',
    controller: 'Controller',
    download: 'Download',
    upload: 'Upload',
    programMode: 'Program mode',
    runMode: 'Run mode',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    routine: 'MainRoutine',
    tags: 'Controller Tags',
    verify: 'Verify',
  },

  instructions: {
    NO: { mnemonic: 'XIC', name: 'Examine If Closed', help: 'Passes power when the bit is ON (1). Think "normally open contact".' },
    NC: { mnemonic: 'XIO', name: 'Examine If Open', help: 'Passes power when the bit is OFF (0). Think "normally closed contact".' },
    COIL: { mnemonic: 'OTE', name: 'Output Energize', help: 'Turns the bit ON while the rung is true, and OFF when the rung is false.' },
    LATCH: { mnemonic: 'OTL', name: 'Output Latch', help: 'Turns the bit ON when the rung is true. It stays ON until something unlatches it.' },
    UNLATCH: { mnemonic: 'OTU', name: 'Output Unlatch', help: 'Turns the bit OFF when the rung is true.' },
    ONESHOT: { mnemonic: 'ONS', name: 'One Shot', help: 'Passes power for one scan only, when the rung goes from false to true.' },
    TON: { mnemonic: 'TON', name: 'Timer On Delay', help: 'Counts time while the rung is true. DN turns ON when the time reaches the preset. Resets when the rung goes false.' },
    TOF: { mnemonic: 'TOF', name: 'Timer Off Delay', help: 'DN is ON while the rung is true, and stays ON for the preset time after the rung goes false.' },
    CTU: { mnemonic: 'CTU', name: 'Count Up', help: 'Adds 1 each time the rung goes from false to true. DN turns ON when the count reaches the preset.' },
    RES: { mnemonic: 'RES', name: 'Reset', help: 'Sets a timer or counter accumulator back to zero.' },
  },

  hardware: {
    controller: {
      name: 'CompactLogix controller',
      description: 'Compact controller with a built-in Ethernet port and USB port. Local I/O modules sit to its right, numbered from slot 1.',
    },
    modules: [
      { slot: 0, kind: 'controller', name: 'Controller', description: 'The CPU. Runs the program.' },
      { slot: 1, kind: 'discrete-input', name: '16-point 24 VDC input', description: 'Discrete inputs: pushbuttons, switches, sensors.', points: 16 },
      { slot: 2, kind: 'discrete-output', name: '16-point 24 VDC output', description: 'Discrete outputs: contactors, lights, solenoids.', points: 16 },
    ],
  },

  ioAddress: (kind, slot, point) => `Local:${slot}:${kind === 'input' ? 'I' : 'O'}.Data.${point}`,

  notes: {
    addressing:
      'On this platform every I/O point has an address made from the slot and point number, like Local:1:I.Data.0. You give it a friendly name (an alias tag) such as Start_PB, and use that name in your logic.',
    stopButton:
      'Stop buttons are wired normally closed, so the input is ON when nobody is pressing it. That is why the stop button uses XIC, not XIO.',
  },
};
