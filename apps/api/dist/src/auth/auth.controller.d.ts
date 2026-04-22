import { AuthService } from './auth.service';
import type { LoginDto, RegisterTenantDto } from '@dr-manoel/shared';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            tenantId: string;
        };
    }>;
    register(registerDto: RegisterTenantDto): Promise<{
        tenant: {
            id: string;
            name: string;
            document: string;
            createdAt: Date;
            updatedAt: Date;
        };
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.Role;
            deletedAt: Date | null;
            tenantId: string;
        };
    }>;
}
