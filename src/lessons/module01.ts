import type { Lesson } from './types';

export const module01: Lesson[] = [
  {
    id: 'm1-l1',
    module: 1,
    moduleTitle: 'What a PLC is',
    title: 'Meet the PLC',
    minutes: 8,
    summary: 'What a PLC does, the parts of a PLC system, and how it controls a machine.',
    steps: [
      {
        title: 'Welcome',
        body:
          'This course assumes you have never worked with a PLC before. That is fine. Every lesson is hands-on, and nothing you do here can hurt a real machine.\n\nA **PLC** (Programmable Logic Controller) is an industrial computer that controls a machine. It replaces the panels full of relays, timers and wiring that plants used before.',
      },
      {
        title: 'Input, logic, output',
        body:
          'Every PLC does three things, over and over:\n\n**1. Reads inputs.** Pushbuttons, switches and sensors are wired to input cards. The PLC sees each one as ON or OFF.\n\n**2. Solves the logic.** The program decides what should happen. For example: "if START is pressed and STOP is not, run the motor."\n\n**3. Writes outputs.** Motor starters, lights and valves are wired to output cards. The PLC turns them ON or OFF.',
      },
      {
        title: 'The parts of a PLC system',
        highlight: 'tree-hardware',
        body:
          'Click **I/O Configuration** in the {projectTree} on the left to see this training rack.\n\n**Power supply:** turns plant power into the low voltage the PLC runs on.\n\n**Controller (CPU):** the brain. It stores and runs the program.\n\n**Input card:** where field devices like pushbuttons are wired in.\n\n**Output card:** where devices like motor starters and lights are wired.\n\nThe cards sit next to each other in numbered **slots**. The slot number becomes part of each point\'s address, so it matters.',
        check: ({ state }) => state.view === 'hardware',
        hint: 'Click "I/O Configuration" in the tree on the left.',
      },
      {
        title: 'The scan cycle',
        body:
          'The PLC repeats input, logic, output in a loop called the **scan**. A scan usually takes a few milliseconds, so it happens hundreds of times every second.\n\nBecause the scan is so fast, the machine reacts almost instantly when you press a button. But the order still matters: the PLC reads all inputs first, then solves every rung from top to bottom, then updates all outputs.',
        quiz: {
          question: 'In what order does a PLC do its work during each scan?',
          options: ['Write outputs, read inputs, solve logic', 'Read inputs, solve logic, write outputs', 'Solve logic, read inputs, write outputs'],
          correct: 1,
          explain: 'Inputs are read first, then the logic is solved from the top rung to the bottom, then the outputs are updated. Then it starts again.',
        },
      },
      {
        title: 'Check yourself',
        body: 'One more question before you move on.',
        quiz: {
          question: 'A proximity sensor that detects parts on a conveyor is wired to which kind of card?',
          options: ['An output card', 'An input card', 'The power supply'],
          correct: 1,
          explain: 'Sensors, switches and pushbuttons tell the PLC what is happening, so they are inputs. Things the PLC turns on, like motors and lights, are outputs.',
        },
      },
    ],
  },
  {
    id: 'm1-l2',
    module: 1,
    moduleTitle: 'What a PLC is',
    title: 'A PLC does nothing without a program',
    minutes: 4,
    summary: 'Press the buttons on the training panel and see what the PLC sees.',
    freshWorkspace: true,
    steps: [
      {
        title: 'The training panel',
        highlight: 'plant',
        body:
          'Below the editor is the **training panel**: real-looking pushbuttons, a selector switch, a conveyor motor and pilot lights. They are wired to the input and output cards of the training rack.\n\nEach input has a small light next to it. That light shows what the **input card** sees, like the LEDs on a real card.',
      },
      {
        title: 'Press START',
        highlight: 'plant',
        body: 'Press and hold the green **START** button. Watch its input light.\n\nThe input card sees the button, but the motor does not run. The controller has no program yet, so nothing tells the output to turn on.',
        check: ({ state }) => state.actuated.start === true,
        hint: 'Press and hold START on the training panel.',
      },
      {
        title: 'The STOP button is backwards',
        highlight: 'plant',
        body:
          'Look at the **STOP** input light. It is ON even though nobody is pressing STOP.\n\nThat is on purpose. Stop buttons are wired **normally closed**, so current flows until you press them. If a wire breaks, the input goes OFF and the machine stops, which is the safe result.\n\nPress STOP and watch its light go out.',
        check: ({ state }) => state.actuated.stop === true,
        hint: 'Press and hold STOP on the training panel.',
        note: 'stopButton',
      },
      {
        title: 'Check yourself',
        body: 'You are ready to look around the software.',
        quiz: {
          question: 'Why are stop buttons wired normally closed?',
          options: ['It uses less power', 'A broken wire then stops the machine instead of hiding a fault', 'Because PLC inputs only accept closed contacts'],
          correct: 1,
          explain: 'With a normally closed stop button, a cut wire looks exactly like pressing STOP, so the machine stops. That is called fail-safe wiring.',
        },
      },
    ],
  },
];
