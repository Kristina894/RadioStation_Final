import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// for dependency injections we use injectable()
@Injectable()
export class PrismaService extends PrismaClient {
    cleanDb: any;
    constructor(config: ConfigService) {
        super({
            datasources: {
                db: {
                    url: config.get('DATABASE_URL')
                }
            }
        })
    }

    // db teardown
    cleanDB() {
        return this.$transaction([
            this.user.deleteMany()
        ])
    }
}
