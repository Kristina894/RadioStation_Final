import { IsString } from "class-validator"

export class AdminApprovalDTO {
    @IsString()
    bookingId: string

    @IsString()
    adminId: string
}