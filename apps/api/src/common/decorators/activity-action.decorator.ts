import { SetMetadata } from '@nestjs/common';

export const ACTIVITY_ACTION_KEY = 'activity_action';
export const ActivityAction = (action: string) =>
  SetMetadata(ACTIVITY_ACTION_KEY, action);
