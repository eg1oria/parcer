import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import {
  IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX,
  IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
  IMPORTED_IMAGE_ROUTE_PREFIX,
  IMPORTED_IMAGE_STORAGE_PATH,
} from './files.constants';

type StoredImageResult = {
  created: boolean;
  url: string;
};

@Injectable()
export class ImportedImageStorageService {
  async storePreviewImage(
    draftId: string,
    buffer: Buffer,
    extension: string,
  ): Promise<string> {
    const normalizedExtension = this.normalizeExtension(extension);
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const fileName = `${fileHash}${normalizedExtension}`;
    const draftDir = join(IMPORTED_IMAGE_PREVIEW_STORAGE_PATH, draftId);
    const filePath = join(draftDir, fileName);

    await mkdir(draftDir, { recursive: true });

    if (basename(filePath) !== fileName) {
      throw new BadRequestException('Preview image path is invalid');
    }

    try {
      await access(filePath);
    } catch {
      await writeFile(filePath, buffer);
    }

    return `${IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX}/${draftId}/${fileName}`;
  }

  async storePermanentImage(
    buffer: Buffer,
    extension: string,
  ): Promise<StoredImageResult> {
    const normalizedExtension = this.normalizeExtension(extension);
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const nestedDir = join(IMPORTED_IMAGE_STORAGE_PATH, fileHash.slice(0, 2));
    const fileName = `${fileHash}${normalizedExtension}`;
    const filePath = join(nestedDir, fileName);

    await mkdir(nestedDir, { recursive: true });

    try {
      await access(filePath);
      return {
        created: false,
        url: `${IMPORTED_IMAGE_ROUTE_PREFIX}/${fileHash.slice(0, 2)}/${fileName}`,
      };
    } catch {
      await writeFile(filePath, buffer);
      return {
        created: true,
        url: `${IMPORTED_IMAGE_ROUTE_PREFIX}/${fileHash.slice(0, 2)}/${fileName}`,
      };
    }
  }

  async promotePreviewImage(
    draftId: string,
    imageUrl: string,
  ): Promise<StoredImageResult | null> {
    const parsedPreviewImage = this.parsePreviewImageUrl(imageUrl);

    if (!parsedPreviewImage) {
      return null;
    }

    if (parsedPreviewImage.draftId !== draftId) {
      throw new BadRequestException(
        'Preview image does not belong to this imported file',
      );
    }

    const sourcePath = join(
      IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
      parsedPreviewImage.draftId,
      parsedPreviewImage.fileName,
    );

    let buffer: Buffer;

    try {
      buffer = await readFile(sourcePath);
    } catch {
      throw new BadRequestException('Preview image not found');
    }

    return this.storePermanentImage(buffer, extname(parsedPreviewImage.fileName));
  }

  async discardPreviewImages(draftId: string): Promise<void> {
    await rm(join(IMPORTED_IMAGE_PREVIEW_STORAGE_PATH, draftId), {
      recursive: true,
      force: true,
    });
  }

  async deletePermanentImageByUrl(imageUrl: string): Promise<void> {
    const filePath = this.resolvePermanentImagePath(imageUrl);

    if (!filePath) {
      return;
    }

    await unlink(filePath).catch(() => undefined);
  }

  isPreviewImageUrl(imageUrl: string): boolean {
    return this.parsePreviewImageUrl(imageUrl) !== null;
  }

  private normalizeExtension(extension: string): string {
    const normalizedExtension = extension.trim().toLowerCase();

    if (!normalizedExtension) {
      return '.png';
    }

    return normalizedExtension.startsWith('.')
      ? normalizedExtension
      : `.${normalizedExtension}`;
  }

  private parsePreviewImageUrl(
    imageUrl: string,
  ): { draftId: string; fileName: string } | null {
    const normalizedImageUrl = this.normalizeImagePath(imageUrl);
    const prefix = `${IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX}/`;

    if (!normalizedImageUrl.startsWith(prefix)) {
      return null;
    }

    const relativePath = normalizedImageUrl.slice(prefix.length);
    const pathSegments = relativePath.split('/');

    if (pathSegments.length !== 2) {
      return null;
    }

    const [draftId, fileName] = pathSegments;

    if (!draftId || !fileName || basename(fileName) !== fileName) {
      return null;
    }

    return { draftId, fileName };
  }

  private resolvePermanentImagePath(imageUrl: string): string | null {
    const normalizedImageUrl = this.normalizeImagePath(imageUrl);
    const prefix = `${IMPORTED_IMAGE_ROUTE_PREFIX}/`;

    if (
      !normalizedImageUrl.startsWith(prefix) ||
      normalizedImageUrl.startsWith(`${IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX}/`)
    ) {
      return null;
    }

    const relativePath = normalizedImageUrl.slice(prefix.length);
    const pathSegments = relativePath.split('/');

    if (pathSegments.length !== 2) {
      return null;
    }

    const [nestedDir, fileName] = pathSegments;

    if (
      !/^[a-f0-9]{2}$/i.test(nestedDir) ||
      !fileName ||
      basename(fileName) !== fileName
    ) {
      return null;
    }

    return join(IMPORTED_IMAGE_STORAGE_PATH, nestedDir, fileName);
  }

  private normalizeImagePath(imageUrl: string): string {
    const trimmedImageUrl = imageUrl.trim();

    if (/^https?:\/\//i.test(trimmedImageUrl)) {
      try {
        return new URL(trimmedImageUrl).pathname;
      } catch {
        return trimmedImageUrl;
      }
    }

    return trimmedImageUrl;
  }
}
