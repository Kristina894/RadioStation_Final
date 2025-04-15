import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException, // Import ConflictException
    InternalServerErrorException // Import InternalServerErrorException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { CreateSlotDto, UpdateSlotDto } from './dto/create-slot.dto'; // Assuming DTOs are defined

@Injectable()
export class AdvertisementSlotService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateSlotDto) {
        // Convert slotTime to a proper ISO-8601 string for consistent storage and querying
        const slotTimeISOString = new Date(data.slotTime).toISOString();

        // Check for existing slot with the same unique combination
        const existingSlot = await this.prisma.advertisementSlot.findFirst({
            where: {
                stationId: data.stationId,
                rjId: data.rjId,
                slotTime: slotTimeISOString, // Query using the ISO string
            },
            select: { id: true }, // Only fetch ID for efficiency
        });

        if (existingSlot) {
            // Throw 400 Bad Request if a duplicate is found
            throw new BadRequestException('A slot already exists for this station, RJ, and exact time.');
        }

        // Create the slot using the ISO string for slotTime
        return this.prisma.advertisementSlot.create({
            data: { ...data, slotTime: slotTimeISOString },
            include: { station: true, rj: true } // Optionally include related data on create response
        });
    }

    async findAll() {
        // Fetch all slots, optionally include related data
        return this.prisma.advertisementSlot.findMany({
            include: { station: true, rj: true, booking: true }, // booking: true might return a lot of data
            orderBy: { slotTime: 'asc' } // Order by time
        });
    }

    async findAllAvailableSlotsWithFilter(availabilityStatus?: string) {
        // Filter slots based on availability status
        const filter: any = {};
        if (availabilityStatus) {
            // Ensure the status matches your Prisma schema enum/type if applicable
            filter.availabilityStatus = availabilityStatus.toUpperCase(); // Example: Ensure case consistency
        }
        return this.prisma.advertisementSlot.findMany({
            where: filter,
            include: { station: true, rj: true, booking: true },
            orderBy: { slotTime: 'asc' }
        });
    }

    async findOne(id: string) {
        // Find a single slot by ID
        const slot = await this.prisma.advertisementSlot.findUnique({
            where: { id },
            include: { station: true, rj: true, booking: true },
        });

        if (!slot) {
            // Throw 404 if not found
            throw new NotFoundException(`Slot with ID "${id}" not found.`);
        }
        return slot;
    }


    async update(id: string, data: UpdateSlotDto) {
        // Check if the slot exists before attempting update
        const slotExists = await this.prisma.advertisementSlot.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!slotExists) {
            throw new NotFoundException(`Slot with ID "${id}" not found.`);
        }

        let updatedData: Partial<UpdateSlotDto> = { ...data }; // Use Partial for flexibility

        // Consistently handle date conversion to ISO string if slotTime is being updated
        if (data.slotTime) {
            updatedData.slotTime = data.slotTime;
            // OPTIONAL: Add duplicate check here if time/rj/station is changed
            // This requires fetching potential duplicates based on the *new* data
        }

        // Ensure price is handled as a number if present
        if (data.price !== undefined && data.price !== null) {
            updatedData.price = Number(data.price);
        }


        // Perform the update
        return this.prisma.advertisementSlot.update({
            where: { id },
            data: updatedData, // Pass the potentially modified data
            include: { station: true, rj: true } // Optionally include related data on update response
        });
    }

    async remove(id: string) {
        // --- Step 1: Check if the slot exists ---
        const slotExists = await this.prisma.advertisementSlot.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!slotExists) {
            throw new NotFoundException(`Advertisement Slot with ID "${id}" not found.`);
        }

        // --- Step 2: Check for related bookings ---
        const relatedBookingsCount = await this.prisma.booking.count({
            where: { slotId: id },
            // Add condition to only count active/non-cancelled bookings if applicable
            // where: { slotId: id, status: { notIn: ['CANCELLED'] } }
        });

        // --- Step 3: Throw conflict error if bookings exist ---
        if (relatedBookingsCount > 0) {
            throw new ConflictException(
                `Cannot delete this slot. It has ${relatedBookingsCount} associated booking(s). Please cancel or reassign the bookings first.`
            );
        }

        // --- Step 4: Proceed with deletion if safe ---
        try {
            const deletedSlot = await this.prisma.advertisementSlot.delete({
                where: { id },
            });
            // Return confirmation or the deleted object
            return { message: `Slot ${id} deleted successfully.`, deletedSlot };
        } catch (error) {
            // Log unexpected errors during deletion
            console.error(`Error during deletion of slot ${id} after checks:`, error);

            // Handle unexpected Prisma errors specifically if needed
            if (error.code === 'P2014') { // Defensive check
                throw new ConflictException(
                    `Deletion conflict: Slot ${id} might still have associated bookings. Please refresh.`
                );
            }
            // Fallback generic error
            throw new InternalServerErrorException(`Could not delete slot ${id} due to an internal error.`);
        }
    }
}