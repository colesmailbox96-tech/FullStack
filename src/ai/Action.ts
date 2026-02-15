export type ActionType = 'FORAGE' | 'REST' | 'SEEK_SHELTER' | 'EXPLORE' | 'SOCIALIZE' | 'IDLE' | 'GATHER' | 'CRAFT';

export interface Action {
  type: ActionType;
  targetX: number;
  targetY: number;
  targetNpcId?: string;
}
