/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {computeStyle, now, readStyle} from '../../../src/render3/animations/util';

export async function waitForReflows(total: number = 1): Promise<any> {
  if (total) {
    const p = new Promise(resolve => { requestAnimationFrame(() => resolve()); });
    return p.then(() => waitForReflows(total - 1));
  }
  return Promise.resolve(true);
}

export function waitForTime(delay: number): Promise<any> {
  return new Promise(r => { setTimeout(() => r, delay); });
}

export function makeElement() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
}

interface TransitionValues {
  duration: number;
  property: string|null;
  delay: number;
  easing: string|null;
  styleStr: string;
}

export function assertTransition(
    elementOrLog: HTMLElement | string[] | string, exps: string | string[]) {
  let comparisons: TransitionValues[]|null = null;
  if (Array.isArray(exps)) {
    comparisons = exps.map(value => parseTestTransition(value));
  } else if (exps) {
    comparisons = [parseTestTransition(exps)];
  }

  let transitionStrs: string[] = [];
  if (Array.isArray(elementOrLog)) {
    transitionStrs = elementOrLog;
  } else {
    let strValue: string = '';
    if (elementOrLog instanceof HTMLElement) {
      if (!isNode) {
        strValue = computeStyle(elementOrLog, 'transition');
      }
      strValue = strValue || elementOrLog.style.transition || '';
    } else {
      strValue = elementOrLog;
    }
    strValue = strValue.trim();
    if (strValue.length) {
      transitionStrs = strValue.split(/\s*,\s*/);
    }
  }

  let actual: TransitionValues[] =
      transitionStrs ? transitionStrs.map(s => parseTestTransition(s)) : [];
  if (comparisons) {
    expect(actual.length).toEqual(comparisons.length);
    for (let i = 0; i < actual.length; i++) {
      compareTransitions(actual[i], comparisons[i]);
    }
  } else {
    // special case to detect `0s` (which is the default for a gcs)
    if (actual.length == 1 && actual[0].duration === 0) {
      actual = [];
    }
    if (actual.length) {
      fail('Expected instance to have zero transition styles active');
    }
  }
}

function convertToMS(value: string): number {
  const captures = value.match(/^([\d\.]+)(m?s)/);
  if (captures) {
    let time = parseFloat(captures[1]);
    if (captures[2] == 's') {
      time *= 1000;
    }
    return time;
  } else {
    fail('UNPARSED ' + value);
  }
  return -1;
}

function parseTestTransition(value: string): TransitionValues {
  const parts = value.split(/\s+/).sort(sortTransitionTimingValues);
  let duration = convertToMS(parts[0]);
  let delayVal: string|null = parts[1];
  let easing: string|null = null;
  let property: string|null = null;

  if (delayVal && !/[0-9]/.test(delayVal.charAt(0))) {
    property = delayVal;
    delayVal = null;
  }

  const delay = delayVal ? convertToMS(delayVal) : 0;
  const propertyOrEasing = parts[2] || null;
  if (propertyOrEasing) {
    if (/^ease|cubic|linear/.test(propertyOrEasing)) {
      easing = propertyOrEasing;
      property = parts[3];
    } else {
      property = propertyOrEasing;
      easing = parts[3];
    }
  }

  return {duration, delay, property, easing, styleStr: value};
}

function sortTransitionTimingValues(a: string, b: string): number {
  const numA = /[0-9]/.test(a.charAt(0));
  const numB = /[0-9]/.test(b.charAt(0));
  if (numA) {
    if (numB) return 0;
    return -1;
  } else if (numB) {
    return 1;
  }
  return 0;
}

function compareTransitions(actual: TransitionValues, target: TransitionValues) {
  let hasFailed = target.duration !== actual.duration || target.property !== actual.property;
  if (target.delay) {
    hasFailed = hasFailed || target.delay !== actual.delay;
  }
  if (target.easing) {
    hasFailed = hasFailed || target.easing !== actual.easing;
  }
  if (hasFailed) {
    fail([
      '',                                              //
      'expected the following transitions to match:',  //
      `=> TARGET`,
      `   - style: "${target.styleStr}"`,            //
      `   - parsed: "${reportTransition(target)}"`,  //
      `=> ACTUAL`,
      `   - style: "${actual.styleStr}"`,            //
      `   - parsed: "${reportTransition(actual)}"`,  //
      ''
    ].join('\n'));
  }
}

function reportTransition(value: TransitionValues) {
  const {duration, property, delay, easing} = value;
  return JSON.stringify({duration, property, delay, easing});
}

export function triggerTransitionEndEvent(element: HTMLElement, elapsedTime: number = 0) {
  let event: AnimationEvent;
  if (typeof AnimationEvent !== 'undefined') {
    event = new AnimationEvent('transitionend');
  } else {
    event = document.createEvent('HTMLEvents') as any;
    event.initEvent('transitionend');
  }

  Object.defineProperty(event, 'elapsedTime', {get: () => elapsedTime});

  const timeStamp = now() + elapsedTime;
  Object.defineProperty(event, 'timeStamp', {get: () => timeStamp});

  element.dispatchEvent(event);
}

export function assertStyle(element: HTMLElement, prop: string, value: string) {
  expect(readStyle(element.style as any, prop) || '').toEqual(value);
}

export function assertClass(element: HTMLElement, name: string, exists: boolean) {
  expect(element.classList.contains(name)).toBe(exists);
}