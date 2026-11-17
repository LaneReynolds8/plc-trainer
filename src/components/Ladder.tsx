import type { Dispatch, ReactNode } from 'react';
import { COUNTER_BITS, TIMER_BITS } from '../engine/simulator';
import type { SeriesPath } from '../engine/edit';
import type { CounterValue, Instruction, Node, Program, TagValue, TimerValue } from '../engine/types';
import { isOutputOp, tagTypesFor } from '../engine/types';
import type { PlatformProfile } from '../profiles';
import type { Action, AppState } from '../store';
import { projectMatchesController } from '../store';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  live: boolean; // show power flow
  values: Record<string, TagValue>;
}

export function LadderEditor({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const matches = projectMatchesController(state);
  const live = state.online && matches;
  const ctx: Ctx = { state, dispatch, live, values: state.controller.state.values };
  const errorRungs = new Set(state.verifyErrors.map((e) => e.rung));

  return (
    <div className="ladder" data-tour="ladder">
      {state.online && !matches && (
        <div className="banner warn">Online, but this project is different from the program in the controller. Live values are hidden.</div>
      )}
      {state.online && matches && state.controller.mode === 'program' && (
        <div className="banner info">Online in {state.profile.terms.programMode}. The logic is not being scanned, so no power flow is shown.</div>
      )}
      {state.project.rungs.map((rung, r) => {
        const rungOn = live && state.controller.mode === 'run' && state.controller.state.energized.has(rung.id);
        return (
          <div key={rung.id} className={`rung ${errorRungs.has(r) ? 'has-error' : ''}`}>
            <div className="rung-head">
              <span className="rung-num">{r}</span>
              <input
                className="rung-comment"
                placeholder="Rung comment (describe what this rung does)"
                value={rung.comment}
                disabled={state.online}
                onChange={(e) => dispatch({ type: 'rungComment', index: r, comment: e.target.value })}
              />
              {!state.online && state.project.rungs.length > 1 && (
                <button className="icon-btn" title="Delete rung" onClick={() => dispatch({ type: 'deleteRung', index: r })}>
                  ✕
                </button>
              )}
            </div>
            <div className={`rung-body ${live && state.controller.mode === 'run' ? 'live' : ''}`}>
              <div className={`rail left ${live && state.controller.mode === 'run' ? 'on' : ''}`} />
              <Series nodes={rung.nodes} rung={r} path={[]} ctx={ctx} main />
              <div className={`rail right ${rungOn ? 'on' : ''}`} />
            </div>
          </div>
        );
      })}
      <button className="add-rung" disabled={state.online} onClick={() => dispatch({ type: 'addRung' })}>
        + Add rung
      </button>
    </div>
  );
}

function Series({ nodes, rung, path, ctx, main }: { nodes: Node[]; rung: number; path: SeriesPath; ctx: Ctx; main?: boolean }) {
  const { state, dispatch } = ctx;
  const sel = state.selection;
  const gapSelected = (index: number) =>
    sel?.kind === 'gap' && sel.at.rung === rung && sel.at.index === index && JSON.stringify(sel.at.path) === JSON.stringify(path);

  const gap = (index: number) => (
    <button
      key={`gap-${index}`}
      className={`gap ${gapSelected(index) ? 'selected' : ''} ${nodes.length === 0 ? 'empty' : ''}`}
      title="Click to place the next instruction here"
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'select', selection: { kind: 'gap', at: { rung, path, index } } });
      }}
    >
      +
    </button>
  );

  const items: ReactNode[] = [gap(0)];
  nodes.forEach((n, i) => {
    const isLastOutput = main && i === nodes.length - 1 && n.kind === 'instr' && isOutputOp(n.op);
    if (isLastOutput) items.push(<div key="fill" className="wire-fill" />);
    items.push(
      n.kind === 'instr' ? (
        <InstructionView key={n.id} ins={n} ctx={ctx} />
      ) : (
        <BranchView key={n.id} branch={n} rung={rung} path={path} index={i} ctx={ctx} />
      ),
    );
    items.push(gap(i + 1));
  });
  if (main && !(nodes.length && nodes[nodes.length - 1].kind === 'instr' && isOutputOp((nodes[nodes.length - 1] as Instruction).op))) {
    items.push(<div key="fill-end" className="wire-fill" />);
  }
  return <div className={`series ${main ? 'main' : ''}`}>{items}</div>;
}

function BranchView({ branch, rung, path, index, ctx }: { branch: Extract<Node, { kind: 'branch' }>; rung: number; path: SeriesPath; index: number; ctx: Ctx }) {
  const on = ctx.live && ctx.state.controller.mode === 'run' && ctx.state.controller.state.energized.has(branch.id);
  return (
    <div className={`branch ${on ? 'on' : ''}`}>
      {branch.legs.map((leg, l) => (
        <div key={l} className={`leg ${l === 0 ? 'first' : ''} ${l === branch.legs.length - 1 ? 'last' : ''}`}>
          <Series nodes={leg} rung={rung} path={[...path, { node: index, leg: l }]} ctx={ctx} />
        </div>
      ))}
      {!ctx.state.online && (
        <button className="add-leg" title="Add another parallel leg" onClick={() => ctx.dispatch({ type: 'addLeg', branchId: branch.id })}>
          + leg
        </button>
      )}
    </div>
  );
}

export function operandOptions(op: Instruction['op'], program: Program): string[] {
  const wanted = tagTypesFor(op);
  const out: string[] = [];
  for (const t of program.tags) {
    if (wanted.includes(t.type)) out.push(t.name);
    if (wanted.includes('BOOL') && !isOutputOp(op)) {
      if (t.type === 'TIMER') TIMER_BITS.forEach((b) => out.push(`${t.name}.${b}`));
      if (t.type === 'COUNTER') COUNTER_BITS.forEach((b) => out.push(`${t.name}.${b}`));
    }
  }
  return out;
}

function symbol(op: Instruction['op']) {
  switch (op) {
    case 'NO':
      return '─┤ ├─';
    case 'NC':
      return '─┤/├─';
    case 'COIL':
      return '─( )─';
    case 'LATCH':
      return '─(L)─';
    case 'UNLATCH':
      return '─(U)─';
    default:
      return null;
  }
}

function bitValue(values: Record<string, TagValue>, operand: string): boolean | undefined {
  const [base, member] = operand.split('.');
  const v = values[base];
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (!member) return undefined;
  return Boolean((v as unknown as Record<string, unknown>)[member]);
}

function InstructionView({ ins, ctx }: { ins: Instruction; ctx: Ctx }) {
  const { state, dispatch, live, values } = ctx;
  const profile: PlatformProfile = state.profile;
  const meta = profile.instructions[ins.op];
  const selected = state.selection?.kind === 'node' && state.selection.id === ins.id;
  const running = live && state.controller.mode === 'run';
  const on = running && state.controller.state.energized.has(ins.id);
  const hasError = state.verifyErrors.some((e) => e.id === ins.id);
  const sym = symbol(ins.op);
  const bit = running && sym ? bitValue(values, ins.tag) : undefined;
  const block = values[ins.tag] as TimerValue | CounterValue | undefined;

  return (
    <div
      className={`ins ${selected ? 'selected' : ''} ${on ? 'on' : ''} ${hasError ? 'error' : ''} ${sym ? 'bit' : 'block'}`}
      title={`${meta.mnemonic}: ${meta.name}. ${meta.help}`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'select', selection: { kind: 'node', id: ins.id } });
      }}
    >
      {sym ? (
        <>
          <select
            className={`tag-select ${bit ? 'bit-on' : ''}`}
            value={ins.tag}
            disabled={state.online}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => dispatch({ type: 'updateInstruction', id: ins.id, patch: { tag: e.target.value } })}
          >
            <option value="">?</option>
            {operandOptions(ins.op, state.project).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div className="sym">{sym}</div>
          <div className="mn">{meta.mnemonic}</div>
        </>
      ) : (
        <div className="box">
          <div className="box-title">
            {meta.mnemonic} <span>{meta.name}</span>
          </div>
          <label>
            {ins.op === 'RES' ? 'Tag' : ins.op === 'CTU' ? 'Counter' : ins.op === 'ONESHOT' ? 'Storage bit' : 'Timer'}
            <select
              className="tag-select"
              value={ins.tag}
              disabled={state.online}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => dispatch({ type: 'updateInstruction', id: ins.id, patch: { tag: e.target.value } })}
            >
              <option value="">?</option>
              {operandOptions(ins.op, state.project).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          {ins.preset !== undefined && (
            <label>
              Preset{ins.op === 'CTU' ? '' : ' (ms)'}
              <input
                type="number"
                min={0}
                value={ins.preset}
                disabled={state.online}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => dispatch({ type: 'updateInstruction', id: ins.id, patch: { preset: Math.max(0, Number(e.target.value) || 0) } })}
              />
            </label>
          )}
          {ins.preset !== undefined && running && block && typeof block === 'object' && (
            <div className="accum">
              Accum <b>{block.ACC}</b>
              <span className={block.DN ? 'flag on' : 'flag'}>DN</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
