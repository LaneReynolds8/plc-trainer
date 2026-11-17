import type { PlatformProfile } from '../profiles';
import { module01 } from './module01';
import { module07 } from './module07';
import { module12 } from './module12';
import type { Lesson } from './types';

export const lessons: Lesson[] = [...module01, ...module07, ...module12];

/** Replace {tokens} in lesson text with this platform's words. */
export function fillTokens(text: string, profile: PlatformProfile): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (key in profile.terms) return profile.terms[key as keyof PlatformProfile['terms']];
    if (key in profile.instructions) return profile.instructions[key as keyof PlatformProfile['instructions']].mnemonic;
    return whole;
  });
}

export type { Lesson, LessonStep } from './types';
