import { useEffect, useReducer } from 'react';
import { LadderEditor } from './components/Ladder';
import { LessonPanel } from './components/LessonPanel';
import { HardwareView, OutputWindow, PlantPanel, ProjectTree, TagsView } from './components/Panels';
import { Dialogs, InstructionToolbar, StatusBar } from './components/Toolbars';
import { customerConfig, profiles } from './profiles';
import { initialState, reducer } from './store';

const SCAN_MS = 50;
const PROGRESS_KEY = 'plc-trainer.completed';

function loadCompleted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const s = initialState(profiles[customerConfig.defaultProfile]);
    return { ...s, lesson: { ...s.lesson, completed: loadCompleted() } };
  });

  // The controller scans on its own clock, whether or not the PC is online.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', dtMs: SCAN_MS }), SCAN_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.lesson.completed));
    } catch {
      /* storage unavailable: progress lasts for this visit only */
    }
  }, [state.lesson.completed]);

  // Delete key removes the selected instruction
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'deleteSelected' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <span className="logo">▞</span> PLC Trainer
        </div>
        <div className="titlebar-info">
          <span className="muted">{customerConfig.customerName}</span>
          <label>
            Platform
            <select value={state.profile.id} disabled>
              {customerConfig.enabledProfiles.map((id) => (
                <option key={id} value={id}>
                  {profiles[id].displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <StatusBar state={state} dispatch={dispatch} />
      <div className="workspace">
        <ProjectTree state={state} dispatch={dispatch} />
        <main className="center">
          <InstructionToolbar state={state} dispatch={dispatch} />
          <div className="view" onClick={() => state.view === 'ladder' && dispatch({ type: 'select', selection: null })}>
            {state.view === 'ladder' && <LadderEditor state={state} dispatch={dispatch} />}
            {state.view === 'tags' && <TagsView state={state} dispatch={dispatch} />}
            {state.view === 'hardware' && <HardwareView state={state} />}
          </div>
          <div className="bottom">
            <PlantPanel state={state} dispatch={dispatch} />
            <OutputWindow state={state} />
          </div>
        </main>
        <LessonPanel state={state} dispatch={dispatch} />
      </div>
      <Dialogs state={state} dispatch={dispatch} />
    </div>
  );
}
