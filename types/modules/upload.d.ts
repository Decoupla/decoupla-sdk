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
export declare function isSupportedImageFormat(filename: string): boolean;
/**
 * Check if a file is a supported video format
 */
export declare function isSupportedVideoFormat(filename: string): boolean;
/**
 * Check if a file is supported (image or video)
 */
export declare function isSupportedFileFormat(filename: string): boolean;
/**
 * Validate file before upload
 */
export declare function validateFile(file: File): {
    valid: boolean;
    error?: string;
};
/**
 * Get file type from filename
 */
export declare function getFileType(filename: string): 'image' | 'video' | 'unknown';
