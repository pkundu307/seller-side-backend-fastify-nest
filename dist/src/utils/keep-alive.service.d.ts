import { PrismaService } from 'src/prisma/prisma.service';
export declare class KeepAliveService {
    private prisma;
    constructor(prisma: PrismaService);
    keepDbAlive(): Promise<void>;
}
