export type ActionType = 'FORAGE' | 'REST' | 'SEEK_SHELTER' | 'EXPLORE' | 'SOCIALIZE' | 'IDLE';

export interface Action {
  type: ActionType;
  targetX: number;
  targetY: number;
  targetNpcId?: string;
}
