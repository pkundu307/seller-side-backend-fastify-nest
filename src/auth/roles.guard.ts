// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles required for this specific endpoint (e.g., ['admin'])
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the user object attached by JwtAuthGuard
    const { user } = context.switchToHttp().getRequest();

    // Check if the user's role is included in the list of required roles
    const hasRole = requiredRoles.some((role) => user?.role === role);

    if (user && hasRole) {
      return true;
    }

    // If user has no role or their role is not sufficient, deny access
    throw new ForbiddenException('You do not have the necessary permissions to access this resource.');
  }
}