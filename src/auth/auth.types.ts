// src/auth/auth.types.ts

import { FastifyRequest } from 'fastify';

// Define the shape of the user object that your JWT strategy returns
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

// Extend the FastifyRequest to include the 'user' property
export interface UserRequest extends FastifyRequest {
  user: AuthenticatedUser;
}