# PLC Trainer

Step-by-step PLC training software for plant technicians who are brand new to PLCs. Learners work in a simulated, ladder-logic workspace laid out like a professional PLC programming tool, with a built-in PLC simulator, a training panel of pushbuttons and lights, and guided lessons that check each step.

The look and names are original. Platform names (such as CompactLogix) are used only to say which equipment a lesson set matches.

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
npm test         # simulator unit tests
npm run build    # type-check and production build
```

## What's in milestone 1

- **Workspace:** project tree, ladder editor (contacts, coils, latch/unlatch, one-shot, timers, counters, reset, parallel branches, rung comments), instruction toolbar, status bar (online/offline, Program/Run, "project matches controller"), tag list, I/O configuration view, output window.
- **Simulator:** a scan cycle (read inputs, solve rungs top to bottom, write outputs) running in the browser, with power-flow highlighting.
- **Download vs. upload:** the PC project and the controller program are separate copies. Going online when they differ asks which way to copy, in plain words. Download puts the controller in Program mode.
- **Training panel:** START (normally open), STOP (normally closed), JOG, HAND/AUTO selector, a conveyor motor and pilot lights, wired to the rack's input and output cards.
- **Lessons:** 6 guided lessons from modules 1, 7 and 12, ending with the start/stop seal-in circuit. Steps check what the learner did, including a behavior test of their seal-in logic.

## How the code is organized

| Folder | What it holds |
| --- | --- |
| `src/engine` | Platform-neutral program model, scan-cycle simulator, editing helpers and verify rules. Unit tested. |
| `src/profiles` | Platform profiles. Each profile defines hardware, terms, instruction names and I/O address format. `index.ts` also holds the customer configuration (which profiles are switched on). |
| `src/lessons` | Lessons as data: steps, highlights, checks and quizzes. Text uses `{tokens}` that each profile fills in. |
| `src/components` | The workspace UI and lesson panel. |
| `src/store.ts` | App state and actions (editing, online/offline, download/upload, modes). |

### Adding a platform

Create a new file in `src/profiles` that exports a `PlatformProfile`, register it in `src/profiles/index.ts`, and add its id to `enabledProfiles` for the customer.

### Adding a lesson

Add a `Lesson` object to a module file in `src/lessons` and include it in `src/lessons/index.ts`. A step can highlight any element with a `data-tour` attribute and can use a `check` function to wait for the learner to do something.
