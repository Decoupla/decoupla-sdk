/**
 * File Upload Types and Utilities
 * 
 * Supports uploading images and videos to the Decoupla backend.
 */

export type ImageFile = {
    id: string;
    type: 'image';
    width: number;
    height: number;
    format: string;
    byte_size: number;
};

export type VideoFile = {
    id: string;
    type: 'video';
    width: number;
    height: number;
    format: string;
    byte_size: number;
    duration: number;
};

export type UploadedFile = ImageFile | VideoFile;

export type UploadFileRequest = {
    op_type: 'upload_file';
};

export type UploadFileResponse = {
    data: {
        file: UploadedFile;
    };
};

export type UploadError = {
    field: string;
    message: string;
};

export type UploadErrorResponse = {
    errors: UploadError[];
};

/**
 * Check if a file is a supported image format
 */
export function isSupportedImageFormat(filename: string): boolean {
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return supportedFormats.includes(ext);
}

/**
 * Check if a file is a supported video format
 */
export function isSupportedVideoFormat(filename: string): boolean {
    const supportedFormats = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv'];
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return supportedFormats.includes(ext);
}

/**
 * Check if a file is supported (image or video)
 */
export function isSupportedFileFormat(filename: string): boolean {
    return isSupportedImageFormat(filename) || isSupportedVideoFormat(filename);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (!isSupportedFileFormat(file.name)) {
        return {
            valid: false,
            error: `Unsupported file format: ${file.name}. Supported formats: images (JPG, PNG, GIF, WebP, etc.) and videos (MP4, WebM, OGV, etc.)`
        };
    }

    return { valid: true };
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): 'image' | 'video' | 'unknown' {
    if (isSupportedImageFormat(filename)) return 'image';
    if (isSupportedVideoFormat(filename)) return 'video';
    return 'unknown';
}
