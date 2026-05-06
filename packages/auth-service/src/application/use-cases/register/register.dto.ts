import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches, IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRoleEnum } from '@app/shared';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password!: string;

  @ApiProperty({ enum: UserRoleEnum, isArray: true, example: [UserRoleEnum.CUSTOMER], required: false })
  @IsArray()
  @IsEnum(UserRoleEnum, { each: true })
  @IsOptional()
  roles?: UserRoleEnum[];
}

export type RegisterInput = RegisterDto;

export interface RegisterOutput {
  userId: string;
  email: string;
  roles: UserRoleEnum[];
}
