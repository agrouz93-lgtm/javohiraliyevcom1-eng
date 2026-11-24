'use client';

import {BasicCalculator} from './basic-calculator';
import type {Entry,Save} from './shared';

export function Estimate(_props:{initial?:Entry;save:Save}) {
  return <BasicCalculator/>;
}
