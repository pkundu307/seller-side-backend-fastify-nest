import { FastifyRequest } from 'fastify';
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
}
export interface UserRequest extends FastifyRequest {
    user: AuthenticatedUser;
}
