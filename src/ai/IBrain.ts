import type { Perception } from './Perception';
import type { Action } from './Action';

export interface IBrain {
  decide(perception: Perception): Action;
}
