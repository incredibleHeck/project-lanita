import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  passwordHash: string;

  @Exclude()
  refreshToken: string | null;

  profile?: any;
  studentRecord?: any;
  children?: any[];
  teacherAllocations?: any[];

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
