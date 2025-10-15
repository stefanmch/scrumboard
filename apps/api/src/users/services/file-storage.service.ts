import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

export interface FileUploadResult {
  filename: string
  path: string
  size: number
  mimetype: string
}

@Injectable()
export class FileStorageService {
  private readonly uploadDir: string
  private readonly avatarDir: string
  private readonly maxFileSize: number = 5 * 1024 * 1024 // 5MB
  private readonly allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/jpg',
  ]

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads')
    this.avatarDir = path.join(this.uploadDir, 'avatars')
    this.ensureUploadDirectories()
  }

  private async ensureUploadDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true })
      await fs.mkdir(this.avatarDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create upload directories:', error)
    }
  }

  async saveAvatar(file: any, userId: string): Promise<FileUploadResult> {
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`
      )
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      )
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname)
      const timestamp = Date.now()
      const randomString = crypto.randomBytes(8).toString('hex')
      const filename = `${userId}-${timestamp}-${randomString}${fileExtension}`
      const filepath = path.join(this.avatarDir, filename)

      // Write file to disk
      await fs.writeFile(filepath, file.buffer)

      // Return relative path for database storage
      const relativePath = `/uploads/avatars/${filename}`

      return {
        filename,
        path: relativePath,
        size: file.size,
        mimetype: file.mimetype,
      }
    } catch (error) {
      console.error('Failed to save avatar file:', error)
      throw new InternalServerErrorException('Failed to save avatar file')
    }
  }

  async deleteAvatar(avatarPath: string): Promise<void> {
    if (!avatarPath) {
      return
    }

    try {
      // Convert relative path to absolute path
      const filename = path.basename(avatarPath)
      const filepath = path.join(this.avatarDir, filename)

      // Check if file exists before attempting to delete
      await fs.access(filepath)
      await fs.unlink(filepath)
    } catch (error) {
      // Log error but don't throw - old avatar might not exist
      console.error('Failed to delete old avatar:', error)
    }
  }

  validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided')
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`
      )
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      )
    }
  }
}
