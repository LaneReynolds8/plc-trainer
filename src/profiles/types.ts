import type { Op } from '../engine/types';

/**
 * A platform profile holds everything that changes between PLC platforms.
 * The simulator, editor and lessons stay the same; the profile changes the
 * hardware, the words on screen and the instruction names.
 */
export interface PlatformProfile {
  id: string;
  /** Factual platform name shown to learners, e.g. "CompactLogix". */
  displayName: string;
  family: string;

  terms: {
    projectTree: string;
    controller: string;
    download: string;
    upload: string;
    programMode: string;
    runMode: string;
    goOnline: string;
    goOffline: string;
    routine: string;
    tags: string;
    verify: string;
  };

  /** How each generic instruction is labelled for this platform. */
  instructions: Record<Op, { mnemonic: string; name: string; help: string }>;

  hardware: {
    controller: { name: string; description: string };
    /** Modules in the local rack or bus, by slot. */
    modules: HardwareModule[];
  };

  /** Format a physical I/O address the way this platform shows it. */
  ioAddress: (kind: 'input' | 'output', slot: number, point: number) => string;

  /** Notes shown in lessons where this platform differs from the generic steps. */
  notes: Record<string, string>;
}

export interface HardwareModule {
  slot: number;
  kind: 'controller' | 'discrete-input' | 'discrete-output';
  name: string;
  description: string;
  points?: number;
}
