import { happened, outputOn, rungHas, sealInWorks } from './checks';
import type { Lesson } from './types';

export const module12: Lesson[] = [
  {
    id: 'm12-l1',
    module: 12,
    moduleTitle: 'Ladder logic and instructions',
    title: 'Your first rung',
    minutes: 12,
    summary: 'Write a rung that runs the motor while START is held, send it to the PLC, and test it.',
    freshWorkspace: true,
    steps: [
      {
        title: 'The goal',
        body:
          'You will write this rung:\n\n**If START is pressed, run the motor.**\n\nIn ladder logic that is one contact and one coil: {NO} Start_PB, then {COIL} Motor.',
      },
      {
        title: 'Pick a spot',
        highlight: 'ladder',
        body: 'Rung 0 is empty. Click the **+** on rung 0 to choose where the instruction goes. The spot turns blue when it is selected.',
        check: ({ state }) => state.selection?.kind === 'gap' && state.selection.at.rung === 0,
        hint: 'Click the + on rung 0.',
      },
      {
        title: 'Add a contact',
        highlight: 'tb-NO',
        body:
          'Click **{NO}** on the toolbar.\n\n{NO} checks whether a bit is ON. If it is, power passes through it to the rest of the rung, just like a normally open contact closing.',
        check: ({ state }) => rungHas(state.project, 0, 'NO'),
        hint: 'Click the {NO} button on the instruction toolbar.',
      },
      {
        title: 'Give it a tag',
        highlight: 'ladder',
        body:
          'The new instruction shows **?** because it does not know which bit to look at yet.\n\nUse the drop-down on the instruction to choose **Start_PB**. That tag is wired to the START button.',
        check: ({ state }) => rungHas(state.project, 0, 'NO', 'Start_PB'),
        hint: 'Choose Start_PB in the drop-down on the {NO} instruction.',
      },
      {
        title: 'Add the coil',
        highlight: 'tb-COIL',
        body:
          'With the contact still selected, click **{COIL}**. It goes to the right of the contact.\n\nThen choose **Motor** as its tag. Motor is wired to the motor starter on the output card.',
        check: ({ state }) => rungHas(state.project, 0, 'COIL', 'Motor'),
        hint: 'Click {COIL}, then pick Motor in its drop-down.',
      },
      {
        title: 'Check your work',
        highlight: 'tb-verify',
        body: 'Click **{verify}**. The software checks the program for mistakes, like an instruction with no tag. The result appears in the output window.',
        check: (ctx) => happened(ctx, 'verify-ok'),
        hint: 'Click {verify}. If it reports errors, fix them and verify again.',
      },
      {
        title: 'Go online',
        highlight: 'tb-online',
        body:
          'Click **{goOnline}**.\n\nThe software sees that the program in the PLC is not the same as the project on your PC, and asks what to do. Read the choices carefully.\n\nChoose **{download}**: you want your new rung to go **from your PC into the PLC**.',
        check: (ctx) => happened(ctx, 'download'),
        hint: 'Click {goOnline}, then choose {download} in the window that opens.',
      },
      {
        title: 'Put the PLC in {runMode}',
        highlight: 'tb-mode',
        body:
          'After a download the PLC is in **{programMode}**. In {programMode} it does not run the logic, and all outputs are off.\n\nSwitch it to **{runMode}**.',
        check: ({ state }) => state.controller.mode === 'run',
        hint: 'Click the {runMode} button.',
      },
      {
        title: 'Test it',
        highlight: 'plant',
        body:
          'Press and hold **START**. The motor runs.\n\nWatch the rung while you do it: the parts of the rung that are passing power turn green. This is called **power flow**, and it is how you will troubleshoot later.',
        check: (ctx) => outputOn(ctx, 2, 0),
        hint: 'Press and hold START on the training panel.',
      },
      {
        title: 'Let go',
        highlight: 'plant',
        body:
          'Now let go of START. The motor stops.\n\nThat is correct for this rung, but a real conveyor needs to keep running after you let go. You will fix that in the next lesson with a **seal-in**.',
        check: (ctx) => !ctx.state.actuated.start && !outputOn(ctx, 2, 0),
        hint: 'Release START.',
      },
      {
        title: 'Check yourself',
        body: 'Good work. You have written, downloaded and tested your first program.',
        quiz: {
          question: 'You downloaded, but the motor does not run when you press START. The status bar shows {programMode}. Why?',
          options: ['The download failed', 'In {programMode} the PLC does not run the logic', 'START is wired wrong'],
          correct: 1,
          explain: 'In {programMode} the controller holds the program but does not scan it, and outputs are off. Switch to {runMode}.',
        },
      },
    ],
  },
  {
    id: 'm12-l2',
    module: 12,
    moduleTitle: 'Ladder logic and instructions',
    title: 'Start/stop motor control with a seal-in',
    minutes: 15,
    summary: 'The most common circuit in industry: START latches the motor on, STOP turns it off.',
    steps: [
      {
        title: 'What we are building',
        body:
          'The motor must:\n\n**Start** when START is pressed.\n\n**Keep running** after START is released.\n\n**Stop** when STOP is pressed, even if START is held.\n\nThis is the **start/stop seal-in circuit**. You will see it on almost every machine.',
      },
      {
        title: 'Go offline',
        highlight: 'tb-online',
        body:
          'You cannot change the program while online in this course yet. Click **{goOffline}**.\n\nNotice the PLC keeps running the old program after you go offline. Going offline only stops your PC from talking to it.',
        check: ({ state }) => !state.online,
        hint: 'Click {goOffline}.',
      },
      {
        title: 'Start from your first rung',
        body:
          'If you finished the last lesson, rung 0 already has {NO} Start_PB and {COIL} Motor. If not, build that first: one {NO} with Start_PB, then one {COIL} with Motor.',
        check: ({ state }) => rungHas(state.project, 0, 'NO', 'Start_PB') && rungHas(state.project, 0, 'COIL', 'Motor'),
        hint: 'Rung 0 needs {NO} Start_PB and {COIL} Motor.',
      },
      {
        title: 'Add the STOP condition',
        highlight: 'ladder',
        body:
          'Click the Start_PB contact to select it, then click **{NO}** to add another contact right after it. Give it the tag **Stop_PB**.\n\nWait, a {NO} for a stop button? Yes. The STOP button is wired normally closed, so Stop_PB is **ON** when nobody presses it, and power passes. Pressing STOP turns the bit OFF and breaks the rung.',
        note: 'stopButton',
        check: ({ state }) => rungHas(state.project, 0, 'NO', 'Stop_PB'),
        hint: 'Select the Start_PB contact, click {NO}, and choose Stop_PB.',
      },
      {
        title: 'Add the seal-in branch',
        highlight: 'tb-branch',
        body:
          'Now the motor needs to "remember" it was started. Select the **Start_PB** contact again, then click **Branch**.\n\nA branch is a parallel path. Power can go through either leg. The software puts Start_PB on the top leg and leaves an empty spot on the bottom leg, already selected.',
        check: ({ state }) => state.project.rungs[0]?.nodes.some((n) => n.kind === 'branch') ?? false,
        hint: 'Select the Start_PB contact, then click Branch.',
      },
      {
        title: 'Seal it in',
        highlight: 'tb-NO',
        body:
          'With the empty bottom leg selected, click **{NO}** and choose **Motor**.\n\nHere is the trick: once the motor is on, the Motor bit is ON, so this contact passes power around the START button. Letting go of START no longer matters. Only STOP can break the rung.',
        check: ({ state }) => sealInWorks(state.project),
        hint: 'Put a {NO} Motor on the bottom leg of the branch. The rung should read: branch (Start_PB OR Motor), then Stop_PB, then {COIL} Motor.',
      },
      {
        title: 'Verify and download',
        highlight: 'tb-download',
        body:
          'Click **{verify}**. Then click **{download}**.\n\nRead the warning. A download replaces the program in the PLC, and the PLC goes to {programMode}, which stops the machine. On a real machine you would make sure that is safe first.',
        check: (ctx) => happened(ctx, 'download') && sealInWorks(ctx.state.controller.program),
        hint: 'Click {verify}, then {download}, and confirm.',
      },
      {
        title: 'Run and test',
        highlight: 'plant',
        body:
          'Switch to **{runMode}**. Then:\n\n**1.** Tap START and let go. The motor keeps running.\n\n**2.** Press STOP. The motor stops.\n\n**3.** Hold START and press STOP. The motor still stops. Stop wins.',
        check: (ctx) => ctx.state.controller.mode === 'run' && happened(ctx, 'run'),
        hint: 'Click {runMode}, then try the buttons.',
      },
      {
        title: 'Check yourself',
        body: 'You have built the most common circuit in industrial control.',
        quiz: {
          question: 'What keeps the motor running after START is released?',
          options: ['The {COIL} remembers its state', 'The Motor contact on the branch passes power around START', 'The STOP button holds it on'],
          correct: 1,
          explain: 'The {NO} Motor contact on the parallel leg is ON while the motor runs, so it provides a second path for power. That is the seal-in.',
        },
      },
      {
        title: 'One more',
        body: 'Last question.',
        quiz: {
          question: 'Someone rewired STOP as a normally open button. What happens with your program?',
          options: ['Nothing changes', 'The motor will not start, because Stop_PB is now OFF when nobody presses it', 'The motor cannot be stopped'],
          correct: 1,
          explain: 'With a normally open STOP, Stop_PB is OFF at rest, so the {NO} Stop_PB contact never passes power and the motor never starts. Wiring and logic have to match.',
        },
      },
    ],
  },
];
