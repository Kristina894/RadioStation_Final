import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly configService: ConfigService, private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get("JWT_SECRET") || "default_secret_key"
        });
    }
    async validate(payload: { sub: string, email: string }) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: payload.sub
            }
        })
        if (!user) {
            return null
        }
        const { password, ...userWithoutPass } = user
        return userWithoutPass;
    }
}
