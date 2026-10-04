import { expectAssignable, expectNotAssignable } from 'tsd';
import { defineContentType, type ImageOptionsFor, type ImageTransform } from '.';

const Author = defineContentType({ name: 'author', fields: {
    Avatar: { type: 'image' }, Name: { type: 'string' },
} });
const Post = defineContentType({ name: 'post', fields: {
    FeaturedImage: { type: 'image' }, Gallery: { type: 'image[]' },
    Authors: { type: 'reference[]', references: [Author] }, Title: { type: 'string' },
} });
expectAssignable<ImageOptionsFor<typeof Post>>({ featuredImage: { width: 800 }, Gallery: { format: 'avif' },
    references: { authors: { avatar: { width: 80, height: 80, format: 'webp' } } } });
expectNotAssignable<ImageOptionsFor<typeof Post>>({ title: { width: 800 } });
expectNotAssignable<ImageOptionsFor<typeof Post>>({ references: { authors: { name: { width: 800 } } } });
expectNotAssignable<ImageOptionsFor<typeof Post>>({ references: { featuredImage: {} } });
expectNotAssignable<ImageTransform>({ format: 'svg' });
expectNotAssignable<ImageTransform>({ quality: 80 });
