import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Post("change-password")
  async changePassword(
    @Body()
    body: ChangePasswordDto & {
      username: string;
    },
  ) {
    return this.authService.changePassword(
      body.username,
      body.oldPassword,
      body.newPassword,
      body.confirmPassword,
    );
  }
}