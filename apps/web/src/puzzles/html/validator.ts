import type { ValidationResult } from '../types';

export interface HtmlCheckReport {
  hasDoctypeOrHtml: boolean;
  closesHtml: boolean;
  h1Present: boolean;
  allLiClosed: boolean;
  tableInBody: boolean;
  noContentAfterCloseHtml: boolean;
  allTdClosed: boolean;
  parseClean: boolean;
}

/**
 * Structural validator for the Animal Encyclopedia puzzle.
 * Runs DOMParser and a few regex checks against the submitted HTML.
 * Tolerant of whitespace, attribute order, comments. Does NOT require exact
 * byte match.
 */
export function checkHtml(html: string): HtmlCheckReport {
  let doc: Document | null = null;
  let parseClean = false;
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
    parseClean = !doc.querySelector('parsererror');
  }

  const hasDoctypeOrHtml = /<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html);
  const closesHtml = /<\/html>/i.test(html);

  // Accept any <h1> with non-empty text. The student can even rename the heading.
  const h1s = doc ? Array.from(doc.querySelectorAll('h1')) : [];
  const h1Present = h1s.some((h1) => (h1.textContent ?? '').trim().length > 0);

  // Require every <li> to have a matching closing tag in the raw source.
  const liOpenCount = (html.match(/<li[\s>]/gi) ?? []).length;
  const liCloseCount = (html.match(/<\/li>/gi) ?? []).length;
  const allLiClosed = liOpenCount > 0 && liOpenCount === liCloseCount;

  const tdOpenCount = (html.match(/<td[\s>]/gi) ?? []).length;
  const tdCloseCount = (html.match(/<\/td>/gi) ?? []).length;
  const allTdClosed = tdOpenCount > 0 && tdOpenCount === tdCloseCount;

  const tableInBody = doc ? doc.body?.querySelector('table') !== null : false;

  const afterClose = html.split(/<\/html>/i)[1] ?? '';
  const noContentAfterCloseHtml = /^\s*$/.test(afterClose);

  return {
    hasDoctypeOrHtml,
    closesHtml,
    h1Present,
    allLiClosed,
    tableInBody,
    noContentAfterCloseHtml,
    allTdClosed,
    parseClean,
  };
}

export function validateHtml(html: string): ValidationResult {
  const report = checkHtml(html);
  const failed: string[] = [];
  if (!report.hasDoctypeOrHtml) failed.push('hasDoctypeOrHtml');
  if (!report.closesHtml) failed.push('closesHtml');
  if (!report.h1Present) failed.push('h1Present');
  if (!report.allLiClosed) failed.push('allLiClosed');
  if (!report.tableInBody) failed.push('tableInBody');
  if (!report.noContentAfterCloseHtml) failed.push('noContentAfterCloseHtml');
  if (!report.allTdClosed) failed.push('allTdClosed');

  if (failed.length === 0) return { ok: true };
  const primary = failed[0]!;
  return {
    ok: false,
    reason: `failed:${failed.join(',')}`,
    hintableMistake: primary,
  };
}

export const HTML_CHECK_LABELS: Record<keyof Omit<HtmlCheckReport, 'parseClean'>, string> = {
  hasDoctypeOrHtml: 'Document opens with <html> (add it at the top)',
  closesHtml: 'Document closes with </html>',
  h1Present: '<h1>Cool Animal Facts</h1> renders correctly',
  allLiClosed: 'Every <li> has a closing </li>',
  tableInBody: 'The speed table is inside <body>',
  noContentAfterCloseHtml: 'Nothing after </html>',
  allTdClosed: 'Every <td> has a closing </td>',
};

/** Plain-English hint shown when a specific check fails. Middle-school friendly. */
export const HTML_CHECK_HINTS: Record<keyof Omit<HtmlCheckReport, 'parseClean'>, string> = {
  hasDoctypeOrHtml:
    'Add this to the top of your file: <!DOCTYPE html><html><head><title>Cool Animal Facts</title></head><body>',
  closesHtml:
    'Your page needs to end with </html>. Check the bottom of the file, there is a tag that says <html> where it should say </html>.',
  h1Present:
    'The main heading is not showing up right. Check that <h1>Cool Animal Facts</h1> opens and closes correctly with </h1> (with the slash).',
  allLiClosed:
    'One of your <li> list items is missing its </li> close tag. Look at the flamingo line closely.',
  tableInBody:
    'The Animal Speed Table is outside the <body> tag. Cut it from after </html> and paste it before </body>.',
  noContentAfterCloseHtml:
    'You have stuff after </html>. Everything must live between <html> and </html>.',
  allTdClosed:
    'One of your <td> table cells is missing its closing </td>. Look at the Cheetah row closely.',
};

/** Find patterns that suggest common student mistakes even before structural checks. */
export function findSurfaceMistakes(html: string): string[] {
  const notes: string[] = [];
  if (/<h1>[^<]*<h2>/i.test(html)) {
    notes.push('You closed <h1> with </h2>. Opening and closing tags must match.');
  }
  if (/<html>[\s\S]*<html>/i.test(html)) {
    notes.push('You have two opening <html> tags. The document needs one <html> at the top and one </html> at the bottom.');
  }
  return notes;
}
