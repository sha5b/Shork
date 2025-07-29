import { describe, it, expect } from 'vitest';
import { preprocessHtml } from './build.js';

describe('preprocessHtml', () => {
  it('should convert simple expressions to EJS syntax', async () => {
    const html = '<p>{{ message }}</p>';
    const { html: processedHtml } = await preprocessHtml(html);
    expect(processedHtml).toBe('<p><%- message %></p>');
  });

  it('should convert #if blocks to EJS syntax', async () => {
    const html = '{{#if user.isLoggedIn}}<p>Welcome</p>{{/if}}';
    const { html: processedHtml } = await preprocessHtml(html);
    expect(processedHtml).toBe('<% if (user.isLoggedIn) { %><p>Welcome</p><% } %>');
  });

  it('should convert #each blocks to EJS syntax', async () => {
    const html = '<ul>{{#each posts as post}}<li>{{ post.title }}</li>{{/each}}</ul>';
    const { html: processedHtml } = await preprocessHtml(html);
    const expected = '<ul><% posts.forEach((post) => { %><li><%- post.title %></li><% }); %></ul>';
    expect(processedHtml).toBe(expected);
  });
});
