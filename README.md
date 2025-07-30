# Shork: The World's Most Groundbreaking, Paradigm-Shifting, Synergistic Framework

Are you tired of frameworks that are... stable? Well-documented? Supported by a large community? Pfft. Amateurs.

Welcome to **Shork**. We've disrupted the disruption. We've shifted the paradigm so hard, it's now upside down and speaking in tongues. This isn't just another framework; it's a revolution. A revelation. A... well, it's some code we wrote.

Powered by next-generation, artisanal, hand-crafted vanilla JavaScript, Shork is the lean, agile, and frankly, bewildering, solution you never knew you needed. We're talking blockchain-ready, AI-integrated, cloud-native, serverless, microservice-based, hyper-scalable, big-data-driven, machine-learning-optimized... you get the picture. We threw all the buzzwords at the wall and built a framework out of whatever stuck.

Behold, the future of web development:

![MLG 360 No Scope](https://media.giphy.com/media/EU9TrSiE2qsA8/giphy.gif)

## Features (That Our Legal Team Said We Had to Mention)

- **File-Based Routing:** Because databases are a social construct. True innovators store their routes in the file system. It's organic, gluten-free, and probably a security nightmare. We call that 'opportunity.'
- **Dynamic Routes:** Your URLs will be as dynamic as our funding rounds. Will `/users/1` work today? Maybe. Will it work tomorrow? That's part of the thrill.
- **Advanced Templating:** We saw Handlebars and thought, "We can make this more complicated." Our mustache-style syntax is so advanced, it's practically post-modern.
- **Data Loading:** Why bother with slow, real-time data? We pre-load everything at build time. This ensures your data is consistently out-of-date, providing a stable, unchanging user experience. It's not a bug; it's a feature.
- **API Routes:** Build robust, scalable APIs that can handle dozens of requests. Maybe even hundreds. We haven't tested.
- **Reusable Components:** The pinnacle of modern engineering. You can write HTML in one file and then... use it in another file. We have patented this.
- **Reactive State Management:** It's `writable`. It's a store. It's a global variable with a fancy name. It's the state-of-the-art in 1998.
- **View Transitions:** We make your pages go *swoosh*. It's like magic, but with more CSS.
- **Zero Dependencies:** We have no dependencies. None. We are an island. A rock. We depend on no one. (Except Node.js. And npm. And the entire internet infrastructure. But other than that, nothing.)
- **Live Reload Dev Server:** It reloads the page when you save. Most of the time. On a good day. If you hold it right.

## Our Philosophy: Move Fast and Break Everything

Why write tests when you can just ship it? Our core philosophy is built on the pillars of speed, agility, and a profound disregard for consequences. We believe that true innovation only happens when you're one `git push --force` away from total disaster.

This framework isn't for the faint of heart. It's for the visionaries, the pioneers, the ones who see a bug report and think, "Nah, the user is just holding it wrong." We're not just building websites; we're building character.

![Deal With It](https://media.giphy.com/media/v9rfTQBNqdsSA/giphy.gif)

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
