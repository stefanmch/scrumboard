import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { promisify } from 'util'

@Injectable()
export class HashService {
  private readonly saltLength: number
  private readonly scrypt = promisify(crypto.scrypt)

  constructor() {
    this.saltLength = parseInt(process.env.HASH_SALT_LENGTH || '16')
  }

  /**
   * Hash a plain text password
   */
  async hashPassword(password: string): Promise<string> {
    // Generate a random salt
    const salt = crypto.randomBytes(this.saltLength).toString('hex')

    // Hash password with scrypt
    const hash = (await this.scrypt(password, salt, 64)) as Buffer

    // Return salt + hash
    return salt + ':' + hash.toString('hex')
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':')
      if (!salt || !hash) {
        return false
      }

      // Hash the plain password with the same salt
      const hashBuffer = (await this.scrypt(plainPassword, salt, 64)) as Buffer

      // Compare the hashes
      return hash === hashBuffer.toString('hex')
    } catch (error) {
      return false
    }
  }

  /**
   * Generate a random salt
   */
  async generateSalt(): Promise<string> {
    return crypto.randomBytes(this.saltLength).toString('hex')
  }

  /**
   * Hash data with a specific salt
   */
  async hashWithSalt(data: string, salt: string): Promise<string> {
    const hash = (await this.scrypt(data, salt, 64)) as Buffer
    return hash.toString('hex')
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Handle null/undefined password
    if (!password) {
      errors.push('Password is required')
      errors.push('Password must be at least 8 characters long')
      errors.push('Password must contain at least one uppercase letter')
      errors.push('Password must contain at least one lowercase letter')
      errors.push('Password must contain at least one number')
      errors.push('Password must contain at least one special character')
      return { isValid: false, errors }
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''

    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return token
  }

  /**
   * Hash a reset token for storage
   */
  async hashResetToken(token: string): Promise<string> {
    // Use a shorter salt for tokens as they're temporary
    const salt = crypto.randomBytes(8).toString('hex')
    const hash = (await this.scrypt(token, salt, 32)) as Buffer
    return salt + ':' + hash.toString('hex')
  }

  /**
   * Verify a reset token
   */
  async verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedToken.split(':')
      if (!salt || !hash) {
        return false
      }

      const hashBuffer = (await this.scrypt(token, salt, 32)) as Buffer
      return hash === hashBuffer.toString('hex')
    } catch (error) {
      return false
    }
  }
}
