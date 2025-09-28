import { Test, TestingModule } from '@nestjs/testing'
import { HashService } from './hash.service'
import * as crypto from 'crypto'

// Mock crypto module to control randomization for testing
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  scrypt: jest.fn(),
  createHmac: jest.fn(),
}))

describe('HashService', () => {
  let service: HashService
  let mockScrypt: jest.MockedFunction<typeof crypto.scrypt>
  let mockRandomBytes: jest.MockedFunction<typeof crypto.randomBytes>
  let mockCreateHmac: jest.MockedFunction<typeof crypto.createHmac>

  beforeEach(async () => {
    jest.clearAllMocks()

    // Set up environment variable for testing
    process.env.HASH_SALT_LENGTH = '16'

    mockScrypt = crypto.scrypt as jest.MockedFunction<typeof crypto.scrypt>
    mockRandomBytes = crypto.randomBytes as jest.MockedFunction<
      typeof crypto.randomBytes
    >
    mockCreateHmac = crypto.createHmac as jest.MockedFunction<
      typeof crypto.createHmac
    >

    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile()

    service = module.get<HashService>(HashService)
  })

  afterEach(() => {
    delete process.env.HASH_SALT_LENGTH
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('hashPassword', () => {
    it('should hash password with salt successfully', async () => {
      const password = 'testPassword123!'
      const mockSalt = 'randomsalt16bytes'
      const mockHash = Buffer.from('hashedpasswordbytes')

      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue(mockSalt),
      } as any)

      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(null, mockHash)
      })

      const result = await service.hashPassword(password)

      expect(mockRandomBytes).toHaveBeenCalledWith(16)
      expect(mockScrypt).toHaveBeenCalledWith(
        password,
        mockSalt,
        64,
        expect.any(Function)
      )
      expect(result).toBe(`${mockSalt}:${mockHash.toString('hex')}`)
    })

    it('should handle scrypt errors', async () => {
      const password = 'testPassword123!'
      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue('salt'),
      } as any)

      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(new Error('Scrypt failed'), null)
      })

      await expect(service.hashPassword(password)).rejects.toThrow(
        'Scrypt failed'
      )
    })

    it('should use default salt length when environment variable is not set', async () => {
      delete process.env.HASH_SALT_LENGTH

      // Create new service instance to pick up environment change
      const module: TestingModule = await Test.createTestingModule({
        providers: [HashService],
      }).compile()
      const newService = module.get<HashService>(HashService)

      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue('salt'),
      } as any)
      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(null, Buffer.from('hash'))
      })

      await newService.hashPassword('test')

      expect(mockRandomBytes).toHaveBeenCalledWith(16) // Default value
    })
  })

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'testPassword123!'
      const salt = 'randomsalt16bytes'
      const hash = '686173686564706173737764627974' // hex encoding of 'hashedpasswdbyt'
      const hashedPassword = `${salt}:${hash}`

      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(null, Buffer.from('hashedpasswdbyt'))
      })

      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword
      )

      expect(mockScrypt).toHaveBeenCalledWith(
        plainPassword,
        salt,
        64,
        expect.any(Function)
      )
      expect(result).toBe(true)
    })

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'wrongPassword'
      const hashedPassword = 'salt:differenthash'

      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(null, Buffer.from('completelydifferenthash', 'hex'))
      })

      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword
      )

      expect(result).toBe(false)
    })

    it('should return false for malformed hashed password', async () => {
      const plainPassword = 'testPassword123!'
      const malformedHash = 'invalidformat'

      const result = await service.comparePasswords(
        plainPassword,
        malformedHash
      )

      expect(result).toBe(false)
    })

    it('should return false for empty salt or hash', async () => {
      const plainPassword = 'testPassword123!'

      let result = await service.comparePasswords(plainPassword, ':hash')
      expect(result).toBe(false)

      result = await service.comparePasswords(plainPassword, 'salt:')
      expect(result).toBe(false)

      result = await service.comparePasswords(plainPassword, ':')
      expect(result).toBe(false)
    })

    it('should handle scrypt errors gracefully', async () => {
      const plainPassword = 'testPassword123!'
      const hashedPassword = 'salt:hash'

      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(new Error('Scrypt comparison failed'), null)
      })

      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword
      )

      expect(result).toBe(false)
    })
  })

  describe('generateSalt', () => {
    it('should generate salt with correct length', async () => {
      const mockSalt = 'randomsalt16bytes'
      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue(mockSalt),
      } as any)

      const result = await service.generateSalt()

      expect(mockRandomBytes).toHaveBeenCalledWith(16)
      expect(result).toBe(mockSalt)
    })
  })

  describe('hashWithSalt', () => {
    it('should hash data with provided salt', async () => {
      const data = 'testData'
      const salt = 'providedSalt'
      const mockHash = Buffer.from('hasheddata')

      mockScrypt.mockImplementation((data, salt, keylen, callback) => {
        callback(null, mockHash)
      })

      const result = await service.hashWithSalt(data, salt)

      expect(mockScrypt).toHaveBeenCalledWith(
        data,
        salt,
        64,
        expect.any(Function)
      )
      expect(result).toBe(mockHash.toString('hex'))
    })

    it('should handle scrypt errors in hashWithSalt', async () => {
      mockScrypt.mockImplementation((data, salt, keylen, callback) => {
        callback(new Error('Hash with salt failed'), null)
      })

      await expect(service.hashWithSalt('data', 'salt')).rejects.toThrow(
        'Hash with salt failed'
      )
    })
  })

  describe('validatePasswordStrength', () => {
    it('should return valid for strong password', () => {
      const strongPassword = 'StrongPass123!'

      const result = service.validatePasswordStrength(strongPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should return invalid for password too short', () => {
      const shortPassword = 'Short1!'

      const result = service.validatePasswordStrength(shortPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must be at least 8 characters long'
      )
    })

    it('should return invalid for password without uppercase letter', () => {
      const password = 'lowercase123!'

      const result = service.validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      )
    })

    it('should return invalid for password without lowercase letter', () => {
      const password = 'UPPERCASE123!'

      const result = service.validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      )
    })

    it('should return invalid for password without number', () => {
      const password = 'NoNumbersHere!'

      const result = service.validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must contain at least one number'
      )
    })

    it('should return invalid for password without special character', () => {
      const password = 'NoSpecialChars123'

      const result = service.validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      )
    })

    it('should return multiple errors for very weak password', () => {
      const weakPassword = 'weak'

      const result = service.validatePasswordStrength(weakPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4)
      expect(result.errors).toContain(
        'Password must be at least 8 characters long'
      )
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      )
      expect(result.errors).toContain(
        'Password must contain at least one number'
      )
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      )
    })

    it('should accept various special characters', () => {
      const specialChars = [
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '_',
        '+',
        '-',
        '=',
        '[',
        ']',
        '{',
        '}',
        ';',
        "'",
        '"',
        '\\',
        '|',
        ',',
        '.',
        '<',
        '>',
        '/',
        '?',
      ]

      specialChars.forEach((char) => {
        const password = `StrongPass123${char}`
        const result = service.validatePasswordStrength(password)
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle empty password', () => {
      const result = service.validatePasswordStrength('')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(6)
      expect(result.errors).toContain('Password is required')
    })

    it('should handle extremely long password', () => {
      const longPassword = 'A'.repeat(1000) + '1!a'

      const result = service.validatePasswordStrength(longPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('generateSecureToken', () => {
    const originalMathRandom = Math.random

    beforeEach(() => {
      // Mock Math.random for predictable testing
      Math.random = jest.fn().mockReturnValue(0.5)
    })

    afterEach(() => {
      Math.random = originalMathRandom
    })

    it('should generate token with default length', () => {
      const result = service.generateSecureToken()

      expect(result).toHaveLength(32)
      expect(typeof result).toBe('string')
    })

    it('should generate token with custom length', () => {
      const customLength = 16
      const result = service.generateSecureToken(customLength)

      expect(result).toHaveLength(customLength)
    })

    it('should generate token with only valid characters', () => {
      const result = service.generateSecureToken()
      const validChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

      for (const char of result) {
        expect(validChars).toContain(char)
      }
    })

    it('should generate different tokens on subsequent calls', () => {
      Math.random = originalMathRandom // Use real random for this test

      const token1 = service.generateSecureToken()
      const token2 = service.generateSecureToken()

      expect(token1).not.toBe(token2)
    })

    it('should handle zero length gracefully', () => {
      const result = service.generateSecureToken(0)

      expect(result).toBe('')
    })
  })

  describe('hashResetToken', () => {
    it('should hash reset token with shorter salt', async () => {
      const token = 'resetToken123'
      const mockSalt = 'shortsalt'
      const mockHash = Buffer.from('hashedtoken')

      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue(mockSalt),
      } as any)

      mockScrypt.mockImplementation((token, salt, keylen, callback) => {
        callback(null, mockHash)
      })

      const result = await service.hashResetToken(token)

      expect(mockRandomBytes).toHaveBeenCalledWith(8) // Shorter salt for tokens
      expect(mockScrypt).toHaveBeenCalledWith(
        token,
        mockSalt,
        32,
        expect.any(Function)
      ) // Shorter hash
      expect(result).toBe(`${mockSalt}:${mockHash.toString('hex')}`)
    })

    it('should handle scrypt errors in hashResetToken', async () => {
      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue('salt'),
      } as any)

      mockScrypt.mockImplementation((token, salt, keylen, callback) => {
        callback(new Error('Reset token hash failed'), null)
      })

      await expect(service.hashResetToken('token')).rejects.toThrow(
        'Reset token hash failed'
      )
    })
  })

  describe('verifyResetToken', () => {
    it('should return true for valid reset token', async () => {
      const token = 'resetToken123'
      const salt = 'shortsalt'
      const hash = '686173686564746f6b656e' // hex encoding of 'hashedtoken'
      const hashedToken = `${salt}:${hash}`

      mockScrypt.mockImplementation((token, salt, keylen, callback) => {
        callback(null, Buffer.from('hashedtoken'))
      })

      const result = await service.verifyResetToken(token, hashedToken)

      expect(mockScrypt).toHaveBeenCalledWith(
        token,
        salt,
        32,
        expect.any(Function)
      )
      expect(result).toBe(true)
    })

    it('should return false for invalid reset token', async () => {
      const token = 'wrongToken'
      const hashedToken = 'salt:differenthash'

      mockScrypt.mockImplementation((token, salt, keylen, callback) => {
        callback(null, Buffer.from('completelydifferenthash', 'hex'))
      })

      const result = await service.verifyResetToken(token, hashedToken)

      expect(result).toBe(false)
    })

    it('should return false for malformed hashed reset token', async () => {
      const token = 'resetToken123'
      const malformedHash = 'invalidformat'

      const result = await service.verifyResetToken(token, malformedHash)

      expect(result).toBe(false)
    })

    it('should handle scrypt errors gracefully in verifyResetToken', async () => {
      const token = 'resetToken123'
      const hashedToken = 'salt:hash'

      mockScrypt.mockImplementation((token, salt, keylen, callback) => {
        callback(new Error('Reset token verification failed'), null)
      })

      const result = await service.verifyResetToken(token, hashedToken)

      expect(result).toBe(false)
    })

    it('should handle empty salt or hash in reset token', async () => {
      const token = 'resetToken123'

      let result = await service.verifyResetToken(token, ':hash')
      expect(result).toBe(false)

      result = await service.verifyResetToken(token, 'salt:')
      expect(result).toBe(false)

      result = await service.verifyResetToken(token, ':')
      expect(result).toBe(false)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      const nullResult = service.validatePasswordStrength(null as any)
      expect(nullResult.isValid).toBe(false)
      expect(nullResult.errors).toHaveLength(6)
      expect(nullResult.errors).toContain('Password is required')

      const undefinedResult = service.validatePasswordStrength(undefined as any)
      expect(undefinedResult.isValid).toBe(false)
      expect(undefinedResult.errors).toHaveLength(6)
      expect(undefinedResult.errors).toContain('Password is required')

      await expect(service.comparePasswords(null as any, 'hash')).resolves.toBe(
        false
      )
      await expect(
        service.comparePasswords('password', null as any)
      ).resolves.toBe(false)
    })

    it('should handle very long strings', async () => {
      const veryLongPassword = 'A'.repeat(10000) + '1!a'
      const result = service.validatePasswordStrength(veryLongPassword)
      expect(result.isValid).toBe(true)

      // Should not crash with very long inputs
      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue('salt'),
      } as any)
      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        callback(null, Buffer.from('hash'))
      })

      await expect(
        service.hashPassword(veryLongPassword)
      ).resolves.toBeDefined()
    })

    it('should handle unicode characters in passwords', () => {
      const unicodePassword = 'Pássw0rd!🔐'
      const result = service.validatePasswordStrength(unicodePassword)
      expect(result.isValid).toBe(true)
    })

    it('should handle buffer allocation errors', async () => {
      mockRandomBytes.mockImplementation(() => {
        throw new Error('Buffer allocation failed')
      })

      await expect(service.hashPassword('password')).rejects.toThrow(
        'Buffer allocation failed'
      )
    })

    it('should ensure token generation uses full character set', () => {
      Math.random = jest
        .fn()
        .mockReturnValueOnce(0) // First character
        .mockReturnValueOnce(0.999) // Last character

      const token = service.generateSecureToken(2)
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

      expect(token[0]).toBe(chars[0]) // 'A'
      expect(token[1]).toBe(chars[chars.length - 1]) // '9'
    })
  })

  describe('Performance and Memory', () => {
    it('should handle multiple concurrent hash operations', async () => {
      mockRandomBytes.mockReturnValue({
        toString: jest.fn().mockReturnValue('salt'),
      } as any)
      mockScrypt.mockImplementation((password, salt, keylen, callback) => {
        // Simulate async operation
        setTimeout(() => callback(null, Buffer.from('hash')), 1)
      })

      const promises = Array(10)
        .fill(null)
        .map((_, i) => service.hashPassword(`password${i}`))

      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(typeof result).toBe('string')
        expect(result).toContain(':')
      })
    })

    it('should not leak memory with large salt operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        service.generateSecureToken(32)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Should not increase memory significantly (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})
