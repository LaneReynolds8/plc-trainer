import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { CounterValue, TagType, TagValue, TimerValue } from '../engine/types';
import { ioKey } from '../engine/types';
import { inputDevices, outputDevices } from '../plant';
import type { Action, AppState } from '../store';
import { projectMatchesController } from '../store';

type P = { state: AppState; dispatch: Dispatch<Action> };

export function ProjectTree({ state, dispatch }: P) {
  const t = state.profile.terms;
  const item = (label: string, view: AppState['view'], tour: string, depth: number, icon: string) => (
    <button
      className={`tree-item ${state.view === view ? 'active' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      data-tour={tour}
      onClick={() => dispatch({ type: 'setView', view })}
    >
      <span className="tree-icon">{icon}</span>
      {label}
    </button>
  );
  return (
    <aside className="tree" data-tour="tree">
      <div className="panel-title">{t.projectTree}</div>
      <div className="tree-node" style={{ paddingLeft: 8 }}>
        <span className="tree-icon">▣</span>
        {t.controller} <b>{state.project.name}</b>
      </div>
      {item(t.tags, 'tags', 'tree-tags', 1, '#')}
      <div className="tree-node" style={{ paddingLeft: 22 }}>
        <span className="tree-icon">▸</span>Tasks
      </div>
      <div className="tree-node" style={{ paddingLeft: 36 }}>
        <span className="tree-icon">⟳</span>MainTask
      </div>
      <div className="tree-node" style={{ paddingLeft: 50 }}>
        <span className="tree-icon">▤</span>MainProgram
      </div>
      {item(t.routine, 'ladder', 'tree-routine', 4.5, '≡')}
      {item('I/O Configuration', 'hardware', 'tree-hardware', 1, '▥')}
    </aside>
  );
}

function fmtValue(v: TagValue | undefined) {
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '1' : '0';
  const tv = v as TimerValue & CounterValue;
  return `ACC ${tv.ACC} / PRE ${tv.PRE}${tv.DN ? '  DN' : ''}`;
}

export function TagsView({ state, dispatch }: P) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TagType>('BOOL');
  const live = state.online && projectMatchesController(state);
  return (
    <div className="tags-view">
      <div className="view-title">{state.profile.terms.tags}</div>
      <table className="grid">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Address (alias for)</th>
            <th>Description</th>
            <th>Value {live ? '' : '(online only)'}</th>
          </tr>
        </thead>
        <tbody>
          {state.project.tags.map((tag) => {
            const v = live ? state.controller.state.values[tag.name] : undefined;
            return (
              <tr key={tag.name}>
                <td className="mono">{tag.name}</td>
                <td>{tag.type}</td>
                <td className="mono">{tag.io ? state.profile.ioAddress(tag.io.kind, tag.io.slot, tag.io.point) : ''}</td>
                <td>{tag.description}</td>
                <td className={`mono ${v === true ? 'val-on' : ''}`}>{fmtValue(v)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <form
        className="new-tag"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = name.trim();
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(clean)) return;
          dispatch({ type: 'addTag', tag: { name: clean, type } });
          setName('');
        }}
      >
        <span>New tag</span>
        <input placeholder="Name, e.g. Conveyor_Run" value={name} onChange={(e) => setName(e.target.value)} disabled={state.online} />
        <select value={type} onChange={(e) => setType(e.target.value as TagType)} disabled={state.online}>
          <option>BOOL</option>
          <option>TIMER</option>
          <option>COUNTER</option>
        </select>
        <button type="submit" disabled={state.online || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name.trim())}>
          Create
        </button>
        <small>Names start with a letter and use letters, numbers and _ only.</small>
      </form>
    </div>
  );
}

export function HardwareView({ state }: { state: AppState }) {
  const { inputs, outputs } = state.controller.state;
  const p = state.profile;
  return (
    <div className="hw-view">
      <div className="view-title">I/O Configuration</div>
      <p className="muted">{p.hardware.controller.description}</p>
      <div className="rack">
        <div className="module psu">
          <div className="mod-slot">PSU</div>
          <div className="mod-name">Power supply</div>
          <div className="mod-desc">24 VDC</div>
        </div>
        {p.hardware.modules.map((m) => (
          <div key={m.slot} className={`module ${m.kind}`}>
            <div className="mod-slot">Slot {m.slot}</div>
            <div className="mod-name">{m.name}</div>
            <div className="mod-desc">{m.description}</div>
            {m.kind === 'controller' ? (
              <div className="cpu-leds">
                <span className={`led ${state.controller.mode === 'run' ? 'on green' : ''}`}>RUN</span>
                <span className={`led ${state.online ? 'on green' : ''}`}>LINK</span>
                <span className="led">FAULT</span>
              </div>
            ) : (
              <div className="points">
                {Array.from({ length: m.points ?? 0 }, (_, i) => {
                  const on = m.kind === 'discrete-input' ? inputs[ioKey({ slot: m.slot, point: i })] : outputs[ioKey({ slot: m.slot, point: i })];
                  return (
                    <span key={i} className={`pt ${on ? 'on' : ''}`} title={p.ioAddress(m.kind === 'discrete-input' ? 'input' : 'output', m.slot, i)}>
                      {i}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="muted">The small lights show each point's state, just like the LEDs on the front of a real card. Hover a point to see its address.</p>
    </div>
  );
}

export function PlantPanel({ state, dispatch }: P) {
  const { inputs, outputs } = state.controller.state;
  const motorOn = outputs['2:0'];
  return (
    <div className="plant" data-tour="plant">
      <div className="panel-title">Training panel</div>
      <div className="plant-body">
        <div className="devices">
          {inputDevices.map((d) => {
            const lit = inputs[ioKey(d)];
            const pressed = state.actuated[d.id] ?? false;
            return (
              <div key={d.id} className="device" title={d.wiring}>
                {d.kind === 'selector' ? (
                  <button className={`selector ${pressed ? 'auto' : ''}`} onClick={() => dispatch({ type: 'actuate', device: d.id, on: !pressed })}>
                    <span className="knob" />
                  </button>
                ) : (
                  <button
                    className={`pb ${d.color} ${pressed ? 'pressed' : ''}`}
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      dispatch({ type: 'actuate', device: d.id, on: true });
                    }}
                    onPointerUp={() => dispatch({ type: 'actuate', device: d.id, on: false })}
                    onPointerCancel={() => dispatch({ type: 'actuate', device: d.id, on: false })}
                    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && dispatch({ type: 'actuate', device: d.id, on: true })}
                    onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && dispatch({ type: 'actuate', device: d.id, on: false })}
                    aria-label={d.label}
                  />
                )}
                <div className="dev-label">{d.label}</div>
                <div className="dev-io">
                  <span className={`led small ${lit ? 'on green' : ''}`} /> {state.profile.ioAddress('input', d.slot, d.point)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="outputs">
          <div className="machine">
            <div className={`motor ${motorOn ? 'running' : ''}`}>
              <div className="rotor" />
            </div>
            <div className={`belt ${motorOn ? 'running' : ''}`} />
          </div>
          {outputDevices.map((d) => (
            <div key={d.id} className="out-row" title={d.wiring}>
              <span className={`lamp ${d.color} ${outputs[ioKey(d)] ? 'on' : ''}`} />
              <span>{d.label}</span>
              <span className="mono muted">{state.profile.ioAddress('output', d.slot, d.point)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OutputWindow({ state }: { state: AppState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [state.log.length]);
  return (
    <div className="output" data-tour="output">
      <div className="panel-title">Output</div>
      <div className="log" ref={ref}>
        {state.log.map((l, i) => (
          <div key={i} className={`log-line ${l.level}`}>
            <span className="muted">{l.time}</span> {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
