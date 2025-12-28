/**
 * Content Type Definition Tests
 * 
 * These tests verify that defineContentType properly creates branded content types
 * that carry type information.
 */

import { describe, it, expect } from 'bun:test';
import {
    AuthorContentType,
    BlogPostContentType,
    ProductContentType,
    CommentContentType,
} from '../decoupla.config';

describe('Content Type Definitions', () => {
    it('AuthorContentType should have correct definition', () => {
        expect(AuthorContentType.__isContentTypeDefinition).toBe(true);
        expect(AuthorContentType.__definition.name).toBe('author');
        expect(AuthorContentType.__definition.displayName).toBe('Author');
        expect(AuthorContentType.__fields.Name).toBeDefined();
        expect(AuthorContentType.__fields.Name.required).toBe(true);
    });

    it('BlogPostContentType should have reference fields', () => {
        expect(BlogPostContentType.__isContentTypeDefinition).toBe(true);
        expect(BlogPostContentType.__definition.name).toBe('blog_post');
        expect(BlogPostContentType.__fields.Author).toBeDefined();
        expect(BlogPostContentType.__fields.Author.type).toBe('reference');
        expect(BlogPostContentType.__fields.Author.references).toBeDefined();
    });

    it('ProductContentType should have numeric fields', () => {
        expect(ProductContentType.__isContentTypeDefinition).toBe(true);
        expect(ProductContentType.__fields.Price).toBeDefined();
        expect(ProductContentType.__fields.Price.type).toBe('float');
        expect(ProductContentType.__fields.StockQuantity).toBeDefined();
        expect(ProductContentType.__fields.StockQuantity.type).toBe('int');
    });

    it('CommentContentType should have string fields', () => {
        expect(CommentContentType.__isContentTypeDefinition).toBe(true);
        expect(CommentContentType.__fields.Content).toBeDefined();
        expect(CommentContentType.__fields.Content.type).toBe('string');
        expect(CommentContentType.__fields.Content.required).toBe(true);
    });
});
