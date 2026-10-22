import type { InstrumentAnimator } from './types.js';
import { HippoAnimator } from './hippoAnimator.js';
import { BearAnimator } from './bearAnimator.js';
import { ParrotAnimator } from './parrotAnimator.js';
import { MonkeyAnimator } from './monkeyAnimator.js';
import { OwlAnimator } from './owlAnimator.js';
import { CatAnimator } from './catAnimator.js';
import { RabbitAnimator } from './rabbitAnimator.js';

export interface AnimalSpec {
  id: string;
  label: string;
  instrument: string;
  continuous: string[];
  triggers: string[];
  create: () => InstrumentAnimator;
}

export const ANIMALS: AnimalSpec[] = [
  {
    id: 'hippo',
    label: 'Hippo · Bass',
    instrument: 'bass',
    continuous: ['drive'],
    triggers: [],
    create: () => new HippoAnimator(),
  },
  {
    id: 'bear',
    label: 'Bear · Snare',
    instrument: 'snare',
    continuous: ['drive'],
    triggers: [],
    create: () => new BearAnimator(),
  },
  {
    id: 'parrot',
    label: 'Parrot · Vocals',
    instrument: 'mic',
    continuous: ['drive'],
    triggers: [],
    create: () => new ParrotAnimator(),
  },
  {
    id: 'monkey',
    label: 'Monkey · Guitar',
    instrument: 'guitar',
    continuous: ['drive'],
    triggers: [],
    create: () => new MonkeyAnimator(),
  },
  {
    id: 'owl',
    label: 'Owl · Drum Pad',
    instrument: 'drumpad',
    continuous: ['drive'],
    triggers: [],
    create: () => new OwlAnimator(),
  },
  {
    id: 'cat',
    label: 'Cat · Keyboard',
    instrument: 'keyboard',
    continuous: ['drive'],
    triggers: [],
    create: () => new CatAnimator(),
  },
  {
    id: 'rabbit',
    label: 'Rabbit · Violin',
    instrument: 'violin',
    continuous: ['drive'],
    triggers: [],
    create: () => new RabbitAnimator(),
  },
];
