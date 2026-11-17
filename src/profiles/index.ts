import { compactLogix } from './compactlogix';
import type { PlatformProfile } from './types';

/** All available platform profiles. Add a new platform by adding a profile file here. */
export const profiles: Record<string, PlatformProfile> = {
  [compactLogix.id]: compactLogix,
};

/**
 * Customer configuration: which profiles a customer has switched on.
 * Later this comes from the customer's account; for now it is a constant.
 */
export const customerConfig = {
  customerName: 'Demo Plant',
  enabledProfiles: ['compactlogix'],
  defaultProfile: 'compactlogix',
};

export type { PlatformProfile } from './types';
