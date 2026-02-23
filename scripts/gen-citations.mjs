import { readFile, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/danielhaight/Downloads/sage_policy_citations_2026-02-19_v2.xlsx');
const sheet = workbook.Sheets['All Policy Citations'];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

function esc(s) {
  if (!s) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function mapRow(r) {
  return {
    researcher: esc(r['Researcher']),
    client: esc(r['Client']),
    topic: esc(r['Topic']),
    coreTopic: String(r['Core Topic']).toLowerCase() === 'yes',
    citedPaperTitle: esc(r['Cited Paper Title']),
    citedPaperYear: Number(r['Cited Paper Year']) || 0,
    citedPaperDOI: esc(r['Cited Paper DOI']),
    policyDocTitle: esc(r['Policy Document Title']),
    policyDocYear: Number(r['Policy Document Year']) || 0,
    policyDocType: esc(r['Policy Document Type']),
    citingOrg: esc(r['Citing Organization']),
    country: esc(r['Country']),
    orgType: esc(r['Organization Type']),
    url: esc(r['URL']),
  };
}

function toTS(c) {
  return `  { researcher: \`${c.researcher}\`, client: \`${c.client}\`, topic: \`${c.topic}\`, coreTopic: ${c.coreTopic}, citedPaperTitle: \`${c.citedPaperTitle}\`, citedPaperYear: ${c.citedPaperYear}, citedPaperDOI: \`${c.citedPaperDOI}\`, policyDocTitle: \`${c.policyDocTitle}\`, policyDocYear: ${c.policyDocYear}, policyDocType: \`${c.policyDocType}\`, citingOrg: \`${c.citingOrg}\`, country: \`${c.country}\`, orgType: \`${c.orgType}\`, url: \`${c.url}\` }`;
}

function buildFile(citations) {
  const header = "import type { PolicyCitation } from './types'\n\nconst citations: PolicyCitation[] = [\n";
  const footer = "\n]\n\nexport default citations\n";
  return header + citations.map(toTS).join(',\n') + footer;
}

const all = rows.map(mapRow);
const oi = all.filter(c => /OI|Opportunity/i.test(c.client));
const ku = all.filter(c => /KU|Care Board/i.test(c.client));

const base = '/Users/danielhaight/Impact Tracking/vital-signs-poc/src/data';
writeFileSync(`${base}/oi-policy-citations.ts`, buildFile(oi));
writeFileSync(`${base}/ku-policy-citations.ts`, buildFile(ku));

console.log(`OI: ${oi.length} records`);
console.log(`KU: ${ku.length} records`);
console.log('Done!');
