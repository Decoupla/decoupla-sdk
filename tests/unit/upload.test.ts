import { describe, it, expect } from 'bun:test';
import {
    isSupportedImageFormat,
    isSupportedVideoFormat,
    isSupportedFileFormat,
    validateFile,
    getFileType,
} from '../../src/modules/upload';

describe('isSupportedImageFormat', () => {
    it('accepts common image formats', () => {
        for (const ext of ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'avif', 'svg']) {
            expect(isSupportedImageFormat(`photo.${ext}`)).toBe(true);
        }
    });

    it('is case-insensitive', () => {
        expect(isSupportedImageFormat('photo.PNG')).toBe(true);
        expect(isSupportedImageFormat('photo.JpG')).toBe(true);
    });

    it('rejects unsupported formats', () => {
        expect(isSupportedImageFormat('file.pdf')).toBe(false);
        expect(isSupportedImageFormat('file.txt')).toBe(false);
    });

    it('rejects files without extension', () => {
        expect(isSupportedImageFormat('noextension')).toBe(false);
    });

    it('handles dotfiles and multi-dot filenames', () => {
        expect(isSupportedImageFormat('.hidden.png')).toBe(true);
        expect(isSupportedImageFormat('my.photo.jpeg')).toBe(true);
    });
});

describe('isSupportedVideoFormat', () => {
    it('accepts common video formats', () => {
        for (const ext of ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv']) {
            expect(isSupportedVideoFormat(`video.${ext}`)).toBe(true);
        }
    });

    it('is case-insensitive', () => {
        expect(isSupportedVideoFormat('video.MP4')).toBe(true);
    });

    it('rejects unsupported formats', () => {
        expect(isSupportedVideoFormat('file.flv')).toBe(false);
        expect(isSupportedVideoFormat('file.png')).toBe(false);
    });
});

describe('isSupportedFileFormat', () => {
    it('accepts both image and video formats', () => {
        expect(isSupportedFileFormat('photo.png')).toBe(true);
        expect(isSupportedFileFormat('video.mp4')).toBe(true);
    });

    it('rejects non-media formats', () => {
        expect(isSupportedFileFormat('doc.pdf')).toBe(false);
        expect(isSupportedFileFormat('data.json')).toBe(false);
    });
});

describe('getFileType', () => {
    it('returns image for image formats', () => {
        expect(getFileType('photo.png')).toBe('image');
        expect(getFileType('photo.jpg')).toBe('image');
    });

    it('returns video for video formats', () => {
        expect(getFileType('clip.mp4')).toBe('video');
        expect(getFileType('clip.webm')).toBe('video');
    });

    it('returns unknown for unsupported formats', () => {
        expect(getFileType('file.txt')).toBe('unknown');
        expect(getFileType('file.pdf')).toBe('unknown');
    });
});

describe('validateFile', () => {
    it('validates a supported image file', () => {
        const file = new File(['data'], 'photo.png', { type: 'image/png' });
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('validates a supported video file', () => {
        const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('rejects unsupported file format', () => {
        const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported file format');
    });

    it('rejects null/undefined file', () => {
        const result = validateFile(null as any);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No file provided');
    });
});
