import path from 'path';

const config = {
  // Project structure
  rootDir: process.cwd(),
  srcDir: path.resolve(process.cwd(), 'src'),
  distDir: path.resolve(process.cwd(), 'dist'),
  staticDir: path.resolve(process.cwd(), 'static'),
  templateDir: path.resolve(process.cwd(), 'template'),

  // Source directories within src
  routesDir: path.resolve(process.cwd(), 'src', 'routes'),
  componentsDir: path.resolve(process.cwd(), 'src', 'lib', 'components'),
  apiDir: path.resolve(process.cwd(), 'src', 'api'),
  libDir: path.resolve(process.cwd(), 'src', 'lib'),

  // Key file paths
  runtimeJs: path.resolve(process.cwd(), 'src', 'lib', 'runtime.js'),
  outputJs: path.resolve(process.cwd(), 'dist', 'main.js'),
  manifest: path.resolve(process.cwd(), 'dist', 'manifest.json'),
  apiClient: path.resolve(process.cwd(), 'src', 'lib', 'api-client.js'),

  // Dev server
  devPort: 8080,
  wsPort: 8081,
};

export default config;
