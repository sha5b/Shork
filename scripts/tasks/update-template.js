import fs from 'fs-extra';
import path from 'path';
import config from '../../shork.config.js';

const filesToCopy = [
  'src',
  'static',
  '.gitignore',
  'jsconfig.json',
  'vitest.config.js',
  'README.md',
  'shork.config.js',
  '.vscode',
  'package.json', // We'll handle this separately to avoid recursion
  'nodemon.json'
];

async function updateTemplate() {
  console.log('Updating template directory...');

  try {
    // 1. Clean the template directory
    await fs.emptyDir(config.templateDir);
    console.log('Template directory cleaned.');

    // 2. Copy files and directories
    for (const file of filesToCopy) {
      if (file === 'package.json') continue; // Skip for now
      const sourcePath = path.resolve(config.rootDir, file);
      const destPath = path.resolve(config.templateDir, file);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath, {
          filter: (src) => {
            const base = path.basename(src);
            // Only include build.js in the template's scripts dir
            if (path.dirname(src).endsWith('scripts')) {
              return base === 'build.js';
            }
            return true;
          }
        });
        console.log(`Copied ${file}`);
      }
    }

    // 2.5. Copy necessary scripts and fix their internal imports for the template
    const scriptsToCopy = {
      'core/build.js': 'scripts/build.js',
      'core/components.js': 'scripts/components.js',
      'core/generate-api-client.js': 'scripts/generate-api-client.js',
      'core/lib/utils.js': 'scripts/lib/utils.js',
      'tasks/dev.js': 'scripts/dev.js'
    };

    for (const [source, dest] of Object.entries(scriptsToCopy)) {
      const sourcePath = path.resolve(config.rootDir, 'scripts', source);
      const destPath = path.resolve(config.templateDir, dest);

      await fs.ensureDir(path.dirname(destPath));

      // Read the script content
      let content = await fs.readFile(sourcePath, 'utf-8');

      // Adjust internal import paths for the flattened template structure
      content = content.replace(/from '..\/shork.config.js'/g, "from '../shork.config.js'");
      content = content.replace(/from '..\/..\/shork.config.js'/g, "from '../shork.config.js'");
      content = content.replace(/from '.\/core\//g, "from './");
      content = content.replace(/from '..\/core\//g, "from './");

      // Write the modified content to the template destination
      await fs.writeFile(destPath, content);
      console.log(`Copied and adjusted ${dest}`);
    }

    // 3. Create a template-specific package.json
    const rootPackageJson = await fs.readJson(path.resolve(config.rootDir, 'package.json'));
    const templatePackageJson = {
      name: 'my-shork-app',
      version: '1.0.0',
      description: 'A new project created with Shork',
      main: rootPackageJson.main,
      type: rootPackageJson.type,
      scripts: {
        "build": "node scripts/build.js",
        "dev": "nodemon",
        "test": "vitest"
      },
      devDependencies: rootPackageJson.devDependencies
    };
    // Remove the scripts we don't want in the final project
    delete templatePackageJson.scripts['update-template'];

    await fs.writeJson(path.resolve(config.templateDir, 'package.json'), templatePackageJson, { spaces: 2 });
    console.log('Created template package.json');

    console.log('\nTemplate update complete!');

  } catch (err) {
    console.error('Error updating template:', err);
  }
}

updateTemplate();
