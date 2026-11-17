import { Fragment, useEffect, useState, type Dispatch, type ReactNode } from 'react';
import { fillTokens, lessons } from '../lessons';
import type { Lesson } from '../lessons';
import type { Action, AppState } from '../store';

type P = { state: AppState; dispatch: Dispatch<Action> };

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((para, i) => (
        <p key={i}>
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j): ReactNode =>
            part.startsWith('**') && part.endsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : <Fragment key={j}>{part}</Fragment>,
          )}
        </p>
      ))}
    </>
  );
}

export function LessonPanel({ state, dispatch }: P) {
  const lesson = lessons.find((l) => l.id === state.lesson.id) ?? null;
  return <aside className="lesson">{lesson ? <ActiveLesson lesson={lesson} state={state} dispatch={dispatch} /> : <Course state={state} dispatch={dispatch} />}</aside>;
}

function Course({ state, dispatch }: P) {
  const modules = new Map<number, Lesson[]>();
  for (const l of lessons) modules.set(l.module, [...(modules.get(l.module) ?? []), l]);
  const done = state.lesson.completed;
  return (
    <div className="course">
      <div className="panel-title">Course</div>
      <div className="course-intro">
        <p>
          Training for <b>{state.profile.displayName}</b> systems. Work through the lessons in order. Each one is hands-on in the workspace on the left.
        </p>
        <div className="progress">
          <div className="bar" style={{ width: `${(done.length / lessons.length) * 100}%` }} />
        </div>
        <small>
          {done.length} of {lessons.length} lessons complete
        </small>
      </div>
      {[...modules.entries()].map(([num, ls]) => (
        <div key={num} className="module-block">
          <div className="module-title">
            Module {num}: {ls[0].moduleTitle}
          </div>
          {ls.map((l) => (
            <button
              key={l.id}
              className={`lesson-item ${done.includes(l.id) ? 'done' : ''}`}
              onClick={() => {
                if (l.freshWorkspace) dispatch({ type: 'resetWorkspace' });
                dispatch({ type: 'startLesson', id: l.id });
              }}
            >
              <span className="check">{done.includes(l.id) ? '✓' : '○'}</span>
              <span className="lesson-text">
                <b>{l.title}</b>
                <small>
                  {l.summary} · {l.minutes} min
                </small>
              </span>
            </button>
          ))}
        </div>
      ))}
      <p className="muted small-note">More modules (wiring, I/O cards, networks, connecting to a real PLC, troubleshooting) arrive in later milestones.</p>
    </div>
  );
}

function ActiveLesson({ lesson, state, dispatch }: P & { lesson: Lesson }) {
  const stepIndex = state.lesson.step;
  const step = lesson.steps[stepIndex];
  const p = state.profile;
  const [eventStart, setEventStart] = useState(state.events.length);
  const [passed, setPassed] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);

  // reset per-step state when the step changes
  useEffect(() => {
    setEventStart(state.events.length);
    setPassed(false);
    setAnswer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, stepIndex]);

  const checkMet = step.check ? step.check({ state, eventsSinceStart: state.events.slice(eventStart) }) : true;
  useEffect(() => {
    if (checkMet && !passed) setPassed(true);
  }, [checkMet, passed]);

  // highlight the element the step is about
  useEffect(() => {
    if (!step.highlight) return;
    const els = document.querySelectorAll(`[data-tour="${step.highlight}"]`);
    els.forEach((el) => el.classList.add('tour-highlight'));
    return () => els.forEach((el) => el.classList.remove('tour-highlight'));
  }, [step.highlight, state.view]);

  const quizOk = !step.quiz || answer === step.quiz.correct;
  const canNext = (passed || checkMet) && quizOk;
  const last = stepIndex === lesson.steps.length - 1;
  const f = (s: string) => fillTokens(s, p);

  return (
    <div className="active-lesson">
      <div className="panel-title">
        <button className="link" onClick={() => dispatch({ type: 'startLesson', id: '' })}>
          ‹ Course
        </button>
        <span>
          Module {lesson.module} · Step {stepIndex + 1} of {lesson.steps.length}
        </span>
      </div>
      <div className="lesson-head">
        <div className="lesson-title">{lesson.title}</div>
        <div className="steps-dots">
          {lesson.steps.map((_, i) => (
            <span key={i} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''} />
          ))}
        </div>
      </div>
      <div className="step">
        <h3>{f(step.title)}</h3>
        <Rich text={f(step.body)} />
        {step.note && p.notes[step.note] && (
          <div className="callout">
            <b>On {p.displayName}:</b> {p.notes[step.note]}
          </div>
        )}
        {step.quiz && (
          <div className="quiz">
            <div className="quiz-q">{f(step.quiz.question)}</div>
            {step.quiz.options.map((o, i) => (
              <button
                key={i}
                className={`quiz-opt ${answer === i ? (i === step.quiz!.correct ? 'right' : 'wrong') : ''}`}
                onClick={() => setAnswer(i)}
              >
                {f(o)}
              </button>
            ))}
            {answer !== null && (
              <div className={`quiz-feedback ${answer === step.quiz.correct ? 'right' : 'wrong'}`}>
                {answer === step.quiz.correct ? 'Correct. ' : 'Not quite. Try again. '}
                {answer === step.quiz.correct && f(step.quiz.explain)}
              </div>
            )}
          </div>
        )}
        {step.check && (
          <div className={`task ${passed || checkMet ? 'met' : ''}`}>
            {passed || checkMet ? '✓ Done' : <>▶ Your turn: {f(step.hint ?? 'Complete the step in the workspace.')}</>}
          </div>
        )}
      </div>
      <div className="lesson-nav">
        <button className="btn" disabled={stepIndex === 0} onClick={() => dispatch({ type: 'lessonStep', step: stepIndex - 1 })}>
          Back
        </button>
        <button
          className="btn primary"
          disabled={!canNext}
          onClick={() => {
            if (last) {
              dispatch({ type: 'completeLesson', id: lesson.id });
              dispatch({ type: 'startLesson', id: '' });
            } else dispatch({ type: 'lessonStep', step: stepIndex + 1 });
          }}
        >
          {last ? 'Finish lesson' : 'Next'}
        </button>
      </div>
    </div>
  );
}
