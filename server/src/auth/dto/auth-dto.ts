import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsIn,
  IsOptional,
  IsStrongPassword,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/** Roles allowed via public signup. Privileged roles are invite-only. */
export const PUBLIC_SIGNUP_ROLES = [UserRole.STUDENT, UserRole.PARENT] as const;

export class AuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  /** Public signup may only create STUDENT or PARENT accounts. */
  @IsOptional()
  @IsEnum(UserRole)
  @IsIn(PUBLIC_SIGNUP_ROLES)
  role?: (typeof PUBLIC_SIGNUP_ROLES)[number];
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;
}
