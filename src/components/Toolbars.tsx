import type { Dispatch } from 'react';
import type { Op } from '../engine/types';
import type { Action, AppState } from '../store';
import { projectMatchesController } from '../store';

type P = { state: AppState; dispatch: Dispatch<Action> };

export function StatusBar({ state, dispatch }: P) {
  const t = state.profile.terms;
  const matches = projectMatchesController(state);
  return (
    <div className="statusbar" data-tour="statusbar">
      <div className={`status-pill ${state.online ? 'online' : 'offline'}`}>
        <span className="dot" />
        {state.online ? 'Online' : 'Offline'}
      </div>
      <div className={`status-pill ${state.controller.mode === 'run' ? 'run' : 'prog'}`} title="Controller mode">
        {state.online ? (state.controller.mode === 'run' ? t.runMode : t.programMode) : 'Mode unknown (offline)'}
      </div>
      <div className={`status-text ${matches ? '' : 'warn'}`}>
        {state.online ? (matches ? 'PC project matches controller' : 'PC project and controller program are DIFFERENT') : 'Editing the copy on your PC'}
      </div>
      <div className="status-text muted">Path: Training rack › Slot 0</div>
      <div className="spacer" />
      <button data-tour="tb-online" className="btn" onClick={() => dispatch({ type: state.online ? 'goOffline' : 'goOnline' })}>
        {state.online ? t.goOffline : t.goOnline}
      </button>
      <span data-tour="tb-mode" className="btn-group">
        <button
          className={`btn ${state.online && state.controller.mode === 'program' ? 'pressed' : ''}`}
          disabled={!state.online}
          onClick={() => dispatch({ type: 'setMode', mode: 'program' })}
        >
          Program
        </button>
        <button
          className={`btn ${state.online && state.controller.mode === 'run' ? 'pressed run' : ''}`}
          disabled={!state.online}
          onClick={() => dispatch({ type: 'setMode', mode: 'run' })}
        >
          Run
        </button>
      </span>
      <button data-tour="tb-download" className="btn arrow-down" onClick={() => dispatch({ type: 'openDialog', dialog: 'download' })} title="Send the project on your PC into the controller">
        ⇩ {t.download}
      </button>
      <button data-tour="tb-upload" className="btn arrow-up" onClick={() => dispatch({ type: 'openDialog', dialog: 'upload' })} title="Copy the controller's program onto your PC">
        ⇧ {t.upload}
      </button>
    </div>
  );
}

const BIT_OPS: Op[] = ['NO', 'NC', 'COIL', 'LATCH', 'UNLATCH', 'ONESHOT'];
const BLOCK_OPS: Op[] = ['TON', 'TOF', 'CTU', 'RES'];

export function InstructionToolbar({ state, dispatch }: P) {
  const p = state.profile;
  const btn = (op: Op) => (
    <button
      key={op}
      data-tour={`tb-${op}`}
      className="tool"
      disabled={state.online}
      title={`${p.instructions[op].mnemonic}: ${p.instructions[op].name}. ${p.instructions[op].help}`}
      onClick={() => dispatch({ type: 'insert', op })}
    >
      {p.instructions[op].mnemonic}
    </button>
  );
  return (
    <div className="itoolbar" data-tour="toolbar">
      <span className="group-label">Bit</span>
      {BIT_OPS.map(btn)}
      <span className="sep" />
      <span className="group-label">Timer/Counter</span>
      {BLOCK_OPS.map(btn)}
      <span className="sep" />
      <button data-tour="tb-branch" className="tool" disabled={state.online} title="Put a parallel branch around the selected instruction" onClick={() => dispatch({ type: 'addBranch' })}>
        Branch
      </button>
      <button className="tool" disabled={state.online || state.selection?.kind !== 'node'} title="Delete the selected instruction (Delete key)" onClick={() => dispatch({ type: 'deleteSelected' })}>
        Delete
      </button>
      <span className="spacer" />
      <button data-tour="tb-verify" className="tool verify" onClick={() => dispatch({ type: 'verify' })} title="Check the program for errors">
        ✓ {p.terms.verify}
      </button>
    </div>
  );
}

export function Dialogs({ state, dispatch }: P) {
  if (!state.dialog) return null;
  const t = state.profile.terms;
  const ctrl = state.controller.program;
  const ctrlDesc = ctrl.rungs.length ? `"${ctrl.name}", ${ctrl.rungs.length} rung${ctrl.rungs.length === 1 ? '' : 's'}` : 'no program';
  const pcDesc = `"${state.project.name}", ${state.project.rungs.length} rung${state.project.rungs.length === 1 ? '' : 's'}`;
  const close = () => dispatch({ type: 'openDialog', dialog: null });

  const transfer = (dir: 'down' | 'up') => (
    <div className={`transfer ${dir}`}>
      <div className="xfer-box">
        <b>Your PC</b>
        <small>{pcDesc}</small>
      </div>
      <div className="xfer-arrow">{dir === 'down' ? '──────▶' : '◀──────'}</div>
      <div className="xfer-box">
        <b>{t.controller}</b>
        <small>{ctrlDesc}</small>
      </div>
    </div>
  );

  let body;
  if (state.dialog === 'goOnline') {
    body = (
      <>
        <h2>The PC and the controller have different programs</h2>
        <p>
          Your PC has {pcDesc}. The controller has {ctrlDesc}. To go online, one copy must replace the other. <b>Read both choices before you click.</b>
        </p>
        <div className="choice-grid">
          <button className="choice up" onClick={() => dispatch({ type: 'upload' })}>
            <b>⇧ {t.upload}</b>
            <span>Controller ▶ PC</span>
            <small>Copies the controller's program onto your PC. <b>Your project on the PC is replaced.</b> The machine is not affected.</small>
          </button>
          <button className="choice down" onClick={() => dispatch({ type: 'download' })}>
            <b>⇩ {t.download}</b>
            <span>PC ▶ Controller</span>
            <small>Sends your project into the controller. <b>The controller's program is replaced</b> and it goes to {t.programMode}, which stops the machine.</small>
          </button>
          <button className="choice" onClick={() => dispatch({ type: 'goOffline' })}>
            <b>Cancel</b>
            <span>Stay offline</span>
            <small>Nothing is copied. Both programs stay as they are.</small>
          </button>
        </div>
      </>
    );
  } else if (state.dialog === 'download') {
    body = (
      <>
        <h2>
          ⇩ {t.download}: PC to {t.controller}
        </h2>
        {transfer('down')}
        <p>
          <b>The program in the controller will be replaced</b> by the project on your PC. The controller goes to {t.programMode}, and all outputs turn off.
        </p>
        {state.online && state.controller.mode === 'run' && (
          <p className="danger">The controller is in {t.runMode}. Downloading stops the machine. On a real machine, make sure it is safe and you have permission.</p>
        )}
        <div className="dialog-actions">
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => dispatch({ type: 'download' })}>
            {t.download}
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h2>
          ⇧ {t.upload}: {t.controller} to PC
        </h2>
        {transfer('up')}
        <p>
          <b>The project open on your PC will be replaced</b> by the controller's program ({ctrlDesc}). Any changes you have not downloaded are lost. The machine keeps running as it is.
        </p>
        <div className="dialog-actions">
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => dispatch({ type: 'upload' })}>
            {t.upload}
          </button>
        </div>
      </>
    );
  }
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        {body}
      </div>
    </div>
  );
}
