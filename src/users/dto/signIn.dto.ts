import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class SignInDTO {
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;
  
    @IsNotEmpty()
    @IsString()
    readonly password: string;
  }