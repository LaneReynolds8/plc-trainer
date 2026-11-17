import type { AppEvent, AppState } from '../store';

export interface StepContext {
  state: AppState;
  /** Events that happened since this step started. */
  eventsSinceStart: AppEvent[];
}

export interface Quiz {
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface LessonStep {
  title: string;
  /**
   * Lesson text. Blank lines start new paragraphs, **bold** is supported, and
   * {tokens} are replaced from the platform profile: {download}, {upload},
   * {goOnline}, {goOffline}, {programMode}, {runMode}, {projectTree}, {verify},
   * and instruction mnemonics such as {NO}, {NC}, {COIL}.
   */
  body: string;
  /** data-tour id of the screen element to highlight. */
  highlight?: string;
  /** The learner must do something; Next unlocks when this returns true. */
  check?: (ctx: StepContext) => boolean;
  /** Shown under the step while the check is not met. */
  hint?: string;
  quiz?: Quiz;
  /** Profile note key to show as a callout. */
  note?: string;
}

export interface Lesson {
  id: string;
  module: number;
  moduleTitle: string;
  title: string;
  minutes: number;
  summary: string;
  steps: LessonStep[];
  /** Reset the workspace to the starter project when the lesson begins. */
  freshWorkspace?: boolean;
}
