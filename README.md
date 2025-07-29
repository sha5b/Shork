# Vanilla JS Micro-Framework

A lightweight, Svelte-inspired micro-framework built from scratch with zero runtime dependencies. This project demonstrates how to build a modern web framework using only vanilla JavaScript, HTML, and CSS, complete with a custom Node.js build process.

## Features

- **File-Based Routing:** Automatically generates routes from your file structure in `src/routes`.
- **Dynamic Routes:** Supports dynamic segments (`[slug]`) and static page generation.
- **Advanced Templating:** Use mustache-style syntax (`{{...}}`, `{{#if}}`, `{{#each}}`) for expressions, conditionals, and loops directly in your HTML.
- **Data Loading:** Fetch data for pages at build-time using `load` functions in `+page.js` files.
- **API Routes:** Create server-side API endpoints easily by adding JavaScript files to `src/api`.
- **Reusable Components:** Create modular components in plain HTML with scoped CSS, props, and slots.
- **Reactive State Management:** A simple `writable` store for client-side state.
- **View Transitions:** Smooth, app-like page transitions powered by the native View Transitions API.
- **Zero Dependencies:** The final build is pure, static HTML, CSS, and JS.
- **Live Reload Dev Server:** A development server that watches for file changes and automatically reloads your browser.

## Editor Setup

For the best developer experience, we highly recommend configuring your editor to treat `.html` files in this project as **Handlebars** or **Mustache**. This will give you proper syntax highlighting for the `{{...}}` template tags.

## Getting Started

1.  **Clone & Install:**
    ```bash
    git clone <repository-url>
    npm install
    ```

2.  **Run the dev server:**
    ```bash
    npm run dev
    ```
    This will start a local server at `http://localhost:8080` with live reload.

## Core Concepts

### Templating

Our framework uses a clean, mustache-style syntax for embedding logic in HTML.

- **Expressions:** Render data into your HTML. The content is automatically HTML-escaped.
    ```html
    <h1>{{ page.title }}</h1>
    ```
- **Conditionals:** Render blocks of HTML conditionally.
    ```html
    {{#if user.isLoggedIn}}
        <p>Welcome, {{ user.name }}!</p>
    {{/if}}
    ```
- **Loops:** Iterate over arrays to render lists.
    ```html
    <ul>
        {{#each posts as post}}
            <li><a href="/blog/{{ post.slug }}">{{ post.title }}</a></li>
        {{/each}}
    </ul>
    ```

### Pages and Routing

- **Pages:** Create a folder in `src/routes` and add a `+page.html` file. For example, `src/routes/about/+page.html` becomes the `/about` page.
- **Layouts:** Add a `+layout.html` file to a directory to create a layout that wraps all child pages. The root layout is at `src/routes/+layout.html`.

### Data Loading

Data for your pages is loaded at build time from a central, mock database located at `src/lib/database.js`. This file acts as a single source of truth for all dynamic content, ensuring consistency across your application.

```javascript
// src/lib/database.js
export const db = {
    posts: {
        findMany: async () => { /* returns all posts */ },
        findUnique: async ({ where }) => { /* finds a post by slug */ }
    }
};
```

To load data into your pages, you create a `+page.js` file and use one of the following functions:

1.  **For Static Pages (`load`):**
    To load data for a single page (like a blog index), export a `load` function that fetches data from the database.
    ```javascript
    // src/routes/blog/+page.js
    import { db } from '../../lib/database.js';

    export async function load() {
        const posts = await db.posts.findMany();
        return { posts }; // Props are passed to the page
    }
    ```

2.  **For Dynamic Pages (`getStaticPaths`):**
    For a dynamic route like `[slug]`, export a `getStaticPaths` function to generate all the necessary pages.
    ```javascript
    // src/routes/blog/[slug]/+page.js
    import { db } from '../../../lib/database.js';

    export async function getStaticPaths() {
        const posts = await db.posts.findMany();
        return posts.map(post => ({
            params: { slug: post.slug }, // Used for the URL
            props: { post }              // Passed to the page template
        }));
    }
    ```

### API Routes

Create server-side endpoints by adding files to the `src/api` directory. The dev server will automatically handle these routes.

- **Example:** A file at `src/api/hello.js` becomes a `/api/hello` endpoint.
    ```javascript
    // src/api/hello.js
    export default function handler(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Hello, world!' }));
    }
    ```

### Components

- **Creating & Using:** A component is a `.html` file in `src/lib/components`. Use it with `<Component:MyComponent />`.
- **Props:** Pass data via attributes. Access them with `{{ props.propName }}`.
    ```html
    <Component:Card title="My Card" />
    <!-- In Card.html -->
    <h3>{{ props.title }}</h3>
    ```
- **Slots:** Pass rich HTML content to a component. The component must have a `<slot></slot>` tag.

## Build and Deployment

To create a production-ready build, run:

```bash
npm run build
```

This will generate a static version of your site in the `dist` folder. You can deploy this folder to any static hosting provider.

### Netlify / Vercel

For platforms like Netlify or Vercel, you can connect your Git repository and configure the following settings:

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

They will automatically build and deploy your site whenever you push a change.

### GitHub Pages

To deploy to GitHub Pages, you can use a GitHub Action to build and deploy your site. Create a file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main # Or your default branch

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```
