import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProseParser } from '@macchiato-dev/parse-prose';
import { LayoutRenderer } from '@macchiato-dev/render-layout';
import { VDocument } from '@macchiato-dev/build-static';
import { ProseRenderer } from '@macchiato-dev/render-prose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(__dirname, 'page.md'), 'utf8');

const document = new VDocument();
const parser = new ProseParser(md);
parser.parse();

const layout = new LayoutRenderer({ document });
const prose = new ProseRenderer({ document, layout });

try {
  prose.render(parser.output);
} catch (err) {
  document.body.replaceChildren();
  document.body.appendChild(document.createTextNode('An error occurred.'));
}

const distDir = join(__dirname, 'dist');
mkdirSync(distDir);
writeFileSync(join(distDir, 'index.html'), document.toHTML());
