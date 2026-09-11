import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseConstrainedSelector as parse } from '../src/constrained-selector.js';

test('selector parser preserves semantic relationships and decodes identifiers', () => {
  assert.deepEqual(parse('body.game > p + [data-kind="a,b"]'), [[
    ['', [['tag', 'body'], ['class', 'game']]],
    ['>', [['tag', 'p']]],
    ['+', [['attribute', 'data-kind', '=', 'a,b']]],
  ]]);
  assert.deepEqual(parse('.\\31 23\\:item, #café'), [
    [['', [['class', '123:item']]]], [['', [['id', 'café']]]],
  ]);
  assert.deepEqual(parse('p:not(:has(+ .hidden))::before'), [[['', [
    ['tag', 'p'], ['not', [[['', [['has', [[['+', [['class', 'hidden']]]]]]]]]]], ['element', 'before'],
  ]]]]);
});

test('nth arithmetic, strings, and comments remain data', () => {
  for (const [input, a, b] of [['odd', 2, 1], ['even', 2, 0], ['-2n + 3', -2, 3], ['+n-1', 1, -1], ['0', 0, 0]]) {
    assert.deepEqual(parse(':nth-child(' + input + ')'), [[['', [['nth', 'nth-child', a, b]]]]]);
  }
  assert.deepEqual(parse('[a="\\22 ]/*x*/"]'), [[['', [['attribute', 'a', '=', '"]/*x*/']]]]]);
  assert.deepEqual(parse('.a/* comment */.b'), parse('.a.b'));
  assert.deepEqual(parse('.a/**//**/.b'), parse('.a.b'));
  assert.deepEqual(parse('.a /* comment */ .b'), parse('.a .b'));
  assert.deepEqual(parse('[a="one\\\ntwo"]'), parse('[a="onetwo"]'));
});

test('selector parser rejects incomplete, ambiguous, or unsupported syntax', () => {
  for (const source of ['', 'p,', ',p', 'p,,q', ':is()', ':is(p,)', ':has(>)', '> p',
    'p >', 'p > > q', 'p)', 'p::before.x', 'p::before > q', '[a=]', '[a="x]',
    '[a="x" i]', '*|p', 'p|q', ':unknown(x)', ':nth-child(2 n)', ':nth-child(n +)',
    ':nth-child(2147483648)', ':nth-child(2n of .x)', '.1', '.-', '.x\\', '.x\\\n',
    'p/**/q', '.x/*', '[a="line\nbreak"]', 'p {color:red}', 'p;body', 'a'.repeat(257),
    '.a'.repeat(513), ':is('.repeat(10) + 'p' + ')'.repeat(10)]) {
    assert.throws(() => parse(source), { name: 'SyntaxError' }, source);
  }
});

test('the same parser executes in MicroQuickJS without Babel', () => {
  const source = readFileSync(new URL('../src/constrained-selector.js', import.meta.url), 'utf8')
    .replace(/\nexport \{ parseConstrainedSelector, writeConstrainedSelector \};\s*$/, '\n');
  const inputs = ['body.game > p + [data-kind="a,b"]', '.\\31 23\\:item', '#café',
    'p:not(:has(+ .hidden))::before', ':nth-child(-2n + 3)', ':nth-child(2147483647)',
    '[a="\\1f408 "]', '.a/**//**/.b'];
  const program = source + '\nprint(JSON.stringify(' + JSON.stringify(inputs) + '.map(parseConstrainedSelector)));';
  const compiler = new URL('../../../dev/wasm-web-runtimes/examples/microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs', import.meta.url);
  const output = execFileSync(compiler.pathname, ['-e', program], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), inputs.map(parse));
});
