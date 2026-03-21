import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProseParser } from '@macchiato-dev/content-parse-small';
import { LayoutRenderer } from '@macchiato-dev/layout-render-small';
import { VDocument } from '@macchiato-dev/dom-tiny';
import { renderDocument } from '@macchiato-dev/render-html';
import { ProseRenderer } from '@macchiato-dev/content-render-small';

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
writeFileSync(join(distDir, 'index.html'), renderDocument(document));
