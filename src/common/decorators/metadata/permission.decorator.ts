import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission_by_roles';

export const Permission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
