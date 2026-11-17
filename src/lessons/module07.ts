import type { Lesson } from './types';

export const module07: Lesson[] = [
  {
    id: 'm7-l1',
    module: 7,
    moduleTitle: 'Touring the software',
    title: 'Find your way around',
    minutes: 10,
    summary: 'The project tree, the ladder editor, the instruction toolbar, the status bar and the tag list.',
    steps: [
      {
        title: 'The project tree',
        highlight: 'tree',
        body:
          'On the left is the **{projectTree}**. It holds everything in your project: the controller, its tasks and programs, the routines that contain your ladder logic, the tags, and the I/O configuration.\n\nIf you ever get lost, start here.',
      },
      {
        title: 'Open the main routine',
        highlight: 'tree-routine',
        body: 'Click **{routine}** in the tree. A routine is a page of ladder logic. Most simple machines need only one.',
        check: ({ state }) => state.view === 'ladder',
        hint: 'Click MainRoutine in the tree.',
      },
      {
        title: 'The ladder editor',
        highlight: 'ladder',
        body:
          'This is where you write the program. It looks like a ladder: the two vertical lines are the **rails**, and each horizontal line is a **rung**.\n\nPower flows from the left rail to the right rail. Instructions on the left side of a rung are conditions (like contacts). The instruction on the right end is the action (like a coil).',
      },
      {
        title: 'The instruction toolbar',
        highlight: 'toolbar',
        body:
          'Above the editor is the **instruction toolbar**. Click a spot on a rung, then click an instruction to place it there.\n\nHover over any button to see what it does. You will use {NO}, {NC} and {COIL} the most.',
      },
      {
        title: 'Look at the tags',
        highlight: 'tree-tags',
        body:
          'Click **{tags}** in the tree. A **tag** is a name for a piece of data, like Start_PB or Motor.\n\nSome tags are linked to a real I/O point. The **Address** column shows which card and point each one is wired to.',
        check: ({ state }) => state.view === 'tags',
        hint: 'Click Controller Tags in the tree.',
        note: 'addressing',
      },
      {
        title: 'The status bar',
        highlight: 'statusbar',
        body:
          'Go back to {routine}. Then look at the **status bar** at the top. Right now it says **Offline**.\n\n**Offline** means you are only editing the copy of the program on your PC. Nothing you change reaches the PLC until you send it.\n\n**Online** means the software is talking to the PLC, showing live values and power flow.',
        check: ({ state }) => state.view === 'ladder',
        hint: 'Click MainRoutine in the tree.',
      },
      {
        title: 'The output window',
        highlight: 'output',
        body: 'At the bottom is the **output window**. The software reports errors, warnings and what it just did here. When something does not work, read this first.',
      },
      {
        title: 'Check yourself',
        body: 'Nice work.',
        quiz: {
          question: 'You change a rung while the status bar says Offline. Is the PLC running your change?',
          options: ['Yes, changes go to the PLC right away', 'No, the change is only on your PC until you send it', 'Only if the PLC is in Run mode'],
          correct: 1,
          explain: 'Offline edits live only in the project file on your PC. You have to send the program to the controller (a download) before the PLC runs it.',
        },
      },
    ],
  },
  {
    id: 'm7-l2',
    module: 7,
    moduleTitle: 'Touring the software',
    title: 'Download vs. upload: the one-minute version',
    minutes: 5,
    summary: 'The most important rule in this course, before you touch a real PLC.',
    steps: [
      {
        title: 'Two copies of the program',
        body:
          'There are always **two copies** of a program:\n\n**The project on your PC**, which you edit.\n\n**The program in the PLC**, which is actually running the machine.\n\nThey are not automatically the same. Moving a program between them always overwrites one of them.',
      },
      {
        title: '{download}: PC to PLC',
        body:
          '**{download}** sends the project from your PC **into the PLC**.\n\nThe program in the PLC is **replaced**. Whatever was running before is gone, unless someone has a backup. The PLC also stops controlling the machine while it loads the new program.\n\nUse it when you have made a change on purpose and are ready for the machine to run it.',
      },
      {
        title: '{upload}: PLC to PC',
        body:
          '**{upload}** copies the program **from the PLC onto your PC**.\n\nThe project open on your PC is **replaced** by what is in the PLC. The PLC and the machine are not affected.\n\nUse it when you want to see what the machine is really running, for example before you troubleshoot or make a change.',
      },
      {
        title: 'The safe habit',
        body:
          'When you walk up to a machine you did not program:\n\n**1. Upload first**, so your PC has exactly what the PLC is running.\n\n**2. Save a backup** of that file.\n\n**3. Make your change**, then **download** only with permission and with the machine in a safe state.\n\nDownloading an old file from a laptop is one of the most common ways technicians break a working machine.',
      },
      {
        title: 'Check yourself',
        body: 'This comes up again and again in the course.',
        quiz: {
          question: 'You need to see what program a running machine has. Which do you do?',
          options: ['{download}', '{upload}', 'Either one, they do the same thing'],
          correct: 1,
          explain: 'An upload copies the PLC\'s program to your PC and leaves the machine alone. A download would replace the program in the machine.',
        },
      },
      {
        title: 'One more',
        body: 'Last one.',
        quiz: {
          question: 'Your laptop has a project from six months ago. What happens if you download it to the machine?',
          options: ['Nothing, the PLC keeps the newer program', 'The PLC\'s current program is replaced by the six-month-old one', 'The PLC merges the two programs'],
          correct: 1,
          explain: 'A download always replaces what is in the PLC. Any changes made in the last six months would be lost. Upload first.',
        },
      },
    ],
  },
];
