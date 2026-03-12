import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { AuthDto, CreateUserDto } from './dto/auth-dto';
import { UserRole, Gender } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async hashData(data: string): Promise<string> {
    return argon2.hash(data);
  }

  async getTokens(userId: string, email: string, role: string) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: hash,
      },
    });
  }

  async signup(dto: CreateUserDto) {
    const schoolId = getTenantSchoolId();
    const userExists = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        ...(schoolId && { schoolId }),
      },
    });

    if (userExists) {
      throw new ForbiddenException('User already exists');
    }

    const passwordHash = await this.hashData(dto.password);

    // Create User and Profile in transaction
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await (tx as any).user.create({
        data: {
          ...(schoolId && { schoolId }),
          email: dto.email,
          passwordHash,
          role: dto.role || UserRole.STUDENT,
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          // Required fields for Profile based on schema
          dob: new Date(), // Placeholder
          gender: Gender.OTHER, // Placeholder
          contactNumber: '', // Placeholder
          address: {}, // Placeholder
        },
      });

      return user;
    });

    const tokens = await this.getTokens(newUser.id, newUser.email, newUser.role);
    await this.updateRefreshToken(newUser.id, tokens.refreshToken);
    return tokens;
  }

  async signin(dto: AuthDto) {
    try {
      const schoolId = getTenantSchoolId();
      const user = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          ...(schoolId && { schoolId }),
        },
      });

      if (!user) {
        throw new ForbiddenException('Access Denied');
      }

      const passwordMatches = await argon2.verify(
        user.passwordHash,
        dto.password,
      );
      if (!passwordMatches) {
        throw new ForbiddenException('Access Denied');
      }

      const tokens = await this.getTokens(user.id, user.email, user.role);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error('Signin unexpected error', err);
      throw new ForbiddenException('Access Denied');
    }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const tokenMatches = await argon2.verify(user.refreshToken, refreshToken);
    if (!tokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }
}
