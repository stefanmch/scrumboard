# Rate Limiting Strategy

## Overview

The Scrumboard API implements a dual rate limiting strategy to balance security and user experience:

1. **IP-based rate limiting** for general endpoint protection
2. **User-based rate limiting** for authentication endpoints to prevent account lockout in shared network environments

## Rate Limiting Types

### 1. IP-Based Rate Limiting (Default)

**Use Case**: General API protection, prevents abuse from single IP addresses

**Applied To**:
- Registration endpoint: 5 requests per minute
- Token refresh: 20 requests per minute
- Verify email: 10 requests per minute
- Forgot password: 3 requests per minute
- Reset password: 5 requests per minute
- Change password: 5 requests per minute
- Session management: 10 requests per minute

**Implementation**: Uses `@nestjs/throttler`'s default `ThrottlerGuard` which tracks by IP address.

**Pros**:
- Simple to implement
- Effective against distributed attacks
- No user context required

**Cons**:
- Can block legitimate users sharing IP addresses (corporate networks, NAT)
- Less precise for account-specific protection

### 2. User-Based Rate Limiting

**Use Case**: Account-specific protection, prevents brute force attacks without blocking legitimate users sharing IP addresses

**Applied To**:
- **Login endpoint**: 5 requests per 15 minutes per user (tracked by email)

**Implementation**: Custom `UserThrottlerGuard` that overrides the default tracker to use email address instead of IP.

**Pros**:
- Prevents legitimate users from being blocked when sharing IP addresses
- More precise protection per account
- Better user experience in corporate/shared network environments

**Cons**:
- Slightly more complex implementation
- Requires user identifier in request

## Implementation Details

### Custom User Throttler Guard

Location: `/apps/api/src/auth/guards/user-throttler.guard.ts`

```typescript
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // For login endpoint, use email from request body
    if (req.body?.email) {
      return `user:${req.body.email}`
    }

    // For authenticated endpoints, use user ID from JWT payload
    if (req.user && typeof req.user === 'object' && 'sub' in req.user) {
      return `user:${req.user.sub}`
    }

    // Fallback to IP address for endpoints without user context
    return req.ip || 'unknown'
  }
}
```

### Usage in Controllers

```typescript
@Public()
@Post('login')
@UseGuards(UserThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 per 15 minutes per user
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

## Rate Limit Configuration

### Login Endpoint (User-Based)
- **Limit**: 5 requests
- **Window**: 15 minutes (900,000ms)
- **Tracking**: Email address from request body
- **Reason**: Long window prevents brute force while allowing legitimate retry attempts

### Registration Endpoint (IP-Based)
- **Limit**: 5 requests
- **Window**: 1 minute (60,000ms)
- **Tracking**: IP address
- **Reason**: Prevents bulk account creation

### Token Refresh (IP-Based)
- **Limit**: 20 requests
- **Window**: 1 minute (60,000ms)
- **Tracking**: IP address
- **Reason**: Higher limit supports normal application flow with multiple tabs/devices

### Password Reset (IP-Based)
- **Forgot Password**: 3 requests per minute
- **Reset Password**: 5 requests per minute
- **Tracking**: IP address
- **Reason**: Prevents password reset abuse

## Error Handling

### Rate Limit Exceeded Response

**Status Code**: `429 Too Many Requests`

**User-Based Response**:
```json
{
  "statusCode": 429,
  "message": "Too many login attempts for user@example.com. Please try again later.",
  "error": "Too Many Requests"
}
```

**IP-Based Response**:
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests"
}
```

## Security Considerations

### Why User-Based Rate Limiting for Login?

**Problem with IP-Based**:
- Corporate networks, NATs, and VPNs share IP addresses
- Legitimate users can be blocked by failed attempts from colleagues
- Public Wi-Fi networks can have hundreds of users on same IP

**Solution with User-Based**:
- Each user account has independent rate limit
- Failed attempts on one account don't affect others
- More precise protection per account

**Example Scenario**:
```
Corporate Network (10.0.0.1):
- user1@company.com: 5 failed attempts → blocked for 15 minutes
- user2@company.com: Can still login (independent counter)
- user3@company.com: Can still login (independent counter)

With IP-based rate limiting, all three would be blocked after 5 total attempts.
```

### Attack Vectors and Mitigations

#### 1. Distributed Brute Force Attack
**Attack**: Attacker uses multiple IPs to try different passwords on one account
**Mitigation**: User-based rate limiting blocks the account after 5 attempts regardless of IP

#### 2. Credential Stuffing
**Attack**: Attacker tries known email/password combinations from data breaches
**Mitigation**: User-based rate limiting + account lockout after repeated failures

#### 3. Account Enumeration
**Attack**: Attacker tests which emails are registered
**Mitigation**: Generic error messages + IP-based rate limiting on registration checks

## Testing

### Unit Tests

Location: `/apps/api/src/auth/guards/user-throttler.guard.spec.ts`

Tests cover:
- Email-based tracking for login requests
- User ID tracking for authenticated requests
- IP fallback for requests without user context
- Different users on same IP (independent limits)
- Same user on different IPs (consistent limit)

### E2E Tests

Recommended tests:
```typescript
it('should allow 5 login attempts per user', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401)
  }

  // 6th attempt should be rate limited
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'test@example.com', password: 'wrong' })
    .expect(429)
})

it('should not block different users on same IP', async () => {
  // User 1: 5 failed attempts
  for (let i = 0; i < 5; i++) {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user1@example.com', password: 'wrong' })
      .expect(401)
  }

  // User 2: Should still be able to attempt login
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'user2@example.com', password: 'wrong' })
    .expect(401) // Not rate limited
})
```

## Configuration

### Environment Variables

```bash
# Default rate limiting (IP-based)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

# Custom rate limits are configured in code via @Throttle decorator
```

### Customization

To change rate limits, update the `@Throttle` decorator in the controller:

```typescript
@Throttle({ default: { limit: 10, ttl: 300000 } }) // 10 per 5 minutes
```

## Best Practices

1. **Use user-based rate limiting** for authentication endpoints
2. **Use IP-based rate limiting** for general API protection
3. **Set longer windows** for sensitive operations (login, password reset)
4. **Set higher limits** for frequently used endpoints (token refresh)
5. **Monitor rate limit metrics** to detect attacks
6. **Log rate limit violations** for security analysis
7. **Provide clear error messages** to legitimate users

## Future Enhancements

- [ ] Exponential backoff for repeated violations
- [ ] Whitelist trusted IPs (internal systems)
- [ ] Dynamic rate limits based on account reputation
- [ ] Machine learning-based anomaly detection
- [ ] Redis-based distributed rate limiting for horizontal scaling
- [ ] Rate limit bypass for premium users
- [ ] Detailed rate limit metrics dashboard

---

**Last Updated**: 2025-01-28
**Related Documents**:
- [Authentication API Documentation](./authentication-api.md)
- [Authentication Architecture ADR](../adr/001-authentication-architecture.md)
