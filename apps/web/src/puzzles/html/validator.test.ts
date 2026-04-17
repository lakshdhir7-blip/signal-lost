import { describe, expect, it } from 'vitest';
import { BROKEN_ANIMAL_HTML } from './starter';
import { checkHtml, validateHtml } from './validator';

const GOOD_FIX = `<!DOCTYPE html>
<html>
<head><title>Cool Animal Facts</title></head>
<body>
<h1>Cool Animal Facts</h1>
<p>Fun facts!</p>
<ul>
  <li>Octopuses have three hearts.</li>
  <li>A group of flamingos is called a flamboyance.</li>
  <li>Sloths can hold their breath longer than dolphins.</li>
</ul>
<h2>Animal Speed Table</h2>
<table>
  <tr><th>Animal</th><th>Top Speed</th></tr>
  <tr><td>Cheetah</td><td>75 mph</td></tr>
  <tr><td>Horse</td><td>55 mph</td></tr>
</table>
</body>
</html>`;

describe('html validator', () => {
  it('rejects the broken starter', () => {
    const r = validateHtml(BROKEN_ANIMAL_HTML);
    expect(r.ok).toBe(false);
  });

  it('accepts the reference fix', () => {
    const r = validateHtml(GOOD_FIX);
    expect(r.ok).toBe(true);
  });

  it('flags missing </html>', () => {
    const broken = GOOD_FIX.replace('</html>', '');
    const r = validateHtml(broken);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hintableMistake).toBeDefined();
  });

  it('flags unclosed li', () => {
    const broken = GOOD_FIX.replace('<li>Octopuses have three hearts.</li>', '<li>Octopuses have three hearts.');
    expect(validateHtml(broken).ok).toBe(false);
  });

  it('flags content after </html>', () => {
    const broken = `${GOOD_FIX}<h2>Leftover</h2>`;
    const r = validateHtml(broken);
    expect(r.ok).toBe(false);
  });

  it('reports structural flags individually', () => {
    const r = checkHtml(GOOD_FIX);
    expect(r.hasDoctypeOrHtml).toBe(true);
    expect(r.closesHtml).toBe(true);
    expect(r.h1Present).toBe(true);
    expect(r.allLiClosed).toBe(true);
    expect(r.allTdClosed).toBe(true);
    expect(r.tableInBody).toBe(true);
    expect(r.noContentAfterCloseHtml).toBe(true);
  });
});
