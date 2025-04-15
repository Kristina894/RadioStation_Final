import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AdminApprovalService } from './adminapproval.service';
import { JwtGuard } from 'src/guards';
import { UserDecorator } from 'src/decorator';
import { Role } from '@prisma/client';
import { AdminApprovalDTO } from './dto';

@Controller('adminapproval')
@UseGuards(JwtGuard)
export class AdminapprovalController {
  constructor(private readonly adminapprovalService: AdminApprovalService) { }

  @Post("")
  async Approve(@UserDecorator() usr, @Body() dto: AdminApprovalDTO) {
    if (usr.role != Role.ADMIN) {
      throw new HttpException("User is not an admin", HttpStatus.UNAUTHORIZED)
    }

    return this.adminapprovalService.approve(dto.bookingId, dto.adminId)
  }
}
