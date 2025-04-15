import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserDecorator } from '../decorator';
import { JwtGuard } from '../guards';
import { UserService } from './user.service';
import { EditUserDto } from './dto/edituser.dto';

@UseGuards(JwtGuard) // Applies JWT authentication guard
@Controller('users')
export class UserController {
  constructor(private userService: UserService) { }

  @Get('me')
  @HttpCode(200)
  UserInfo(@UserDecorator() user: User) {
    const { id, email, firstName, lastName, role } = user
    return { id, email, firstName, lastName, role };
  }

  @Patch('edituser')
  @HttpCode(200)
  editUser(@UserDecorator() user: User, @Body() dto: EditUserDto) {
    return this.userService.editUser(user.id, dto);
  }
}