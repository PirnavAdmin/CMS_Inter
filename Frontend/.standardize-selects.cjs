const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const postcss = require('postcss');
const files = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)]);
const controls = new Set('cms-searchable-select-trigger cms-custom-select-trigger cms-transfer-filter-trigger cms-academic-btn bay-api-picker-input bay-level-combobox master-combobox-input-wrap staff-search-input-wrap subject-compact-box subject-group-input salary-search-input-wrap cert-admission-search-control'.split(' '));
const panels = new Set('cms-searchable-select-dropdown cms-searchable-select-menu cms-custom-select-menu cms-transfer-filter-menu cms-academic-dropdown-panel bay-api-options bay-level-options master-custom-dropdown-menu staff-search-dropdown-menu subject-dropdown-menu subject-combobox-options salary-search-dropdown cert-admission-options cms-alloc-modal-dropdown'.split(' '));
const options = new Set('cms-searchable-select-option cms-custom-select-option cms-transfer-filter-option cms-academic-panel-item master-custom-dropdown-item staff-search-dropdown-item subject-dropdown-item subject-search-option salary-search-option cert-admission-option cms-alloc-modal-dropdown-item'.split(' '));
const paint = new Set('background background-color background-image background-position background-size background-repeat color border border-color border-width border-style border-radius box-shadow outline outline-color outline-width outline-style outline-offset backdrop-filter -webkit-backdrop-filter appearance -webkit-appearance color-scheme height min-height max-height padding padding-top padding-right padding-bottom padding-left padding-inline padding-block font-size font-weight line-height'.split(' '));
const camel = prop => prop.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const snapshots = {};
let native = 0, custom = 0, inline = 0, rules = 0;
for (const file of files('src').filter(f => f.endsWith('.jsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  const edits = [];
  const events = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement') {
      for (const a of node.attributes) if (a.type === 'JSXAttribute' && !['className', 'style'].includes(a.name.name)) events.push(source.slice(a.start, a.end));
      const attr = node.attributes.find(a => a.name?.name === 'className');
      const text = attr ? source.slice(attr.start, attr.end) : '';
      const names = text.match(/[a-z][a-z0-9-]+/g) || [];
      let marker = node.name.name === 'select' ? 'app-select' : names.some(n => controls.has(n)) ? 'app-select-control' : names.some(n => panels.has(n)) ? 'app-select-panel' : names.some(n => options.has(n)) ? 'app-select-option' : '';
      if (marker) {
        if (marker === 'app-select') native++; else custom++;
        if (!attr) edits.push([node.name.end, node.name.end, ` className="${marker}"`]);
        else if (attr.value.type === 'StringLiteral') edits.push([attr.value.end - 1, attr.value.end - 1, ` ${marker}`]);
        else edits.push([attr.value.start, attr.value.end, `{(${source.slice(attr.value.expression.start, attr.value.expression.end)}) + " ${marker}"}`]);
        const style = node.attributes.find(a => a.name?.name === 'style');
        if (style?.value?.expression?.type === 'ObjectExpression') {
          const props = style.value.expression.properties;
          // Panel height/padding describe its layout rather than a closed control.
          const remove = p => p.type === 'ObjectProperty' && paint.has(camel(p.key.name || p.key.value || '')) && (marker === 'app-select' || !/height|padding/.test(camel(p.key.name || '')));
          if (props.some(remove)) {
            const kept = props.filter(p => !remove(p)).map(p => source.slice(p.start, p.end));
            edits.push([style.start, style.end, kept.length ? `style={{ ${kept.join(', ')} }}` : '']);
            inline++;
          }
        }
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(source, { sourceType: 'module', plugins: ['jsx'] }));
  if (edits.length) {
    snapshots[file] = events;
    let result = source;
    for (const [a,b,value] of edits.sort((a,b) => b[0]-a[0])) result = result.slice(0,a)+value+result.slice(b);
    fs.writeFileSync(file,result);
  }
}
// Remove competing paint declarations from select-only rules; keep widths,
// grid/flex placement and unrelated input/button rules unchanged.
for (const file of files('src').filter(f => f.endsWith('.css') && !f.endsWith('FilterSelect.css'))) {
  const source = fs.readFileSync(file, 'utf8');
  const root = postcss.parse(source);
  let changed = false;
  root.walkRules(rule => {
    if (!rule.selector || rule.selector.startsWith('@')) return;
    const selectors = rule.selectors;
    const isSelect = s => /(?:^|[ >+~])(?:select|option|optgroup)(?:\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?)*\s*$/.test(s);
    const selected = selectors.filter(isSelect);
    if (!selected.length || !rule.nodes.some(n => n.type === 'decl' && paint.has(n.prop))) return;
    const rest = selectors.filter(s => !isSelect(s));
    const target = rest.length ? rule.cloneAfter({ selector: selected.join(', ') }) : rule;
    if (rest.length) rule.selector = rest.join(', ');
    target.walkDecls(decl => { if (paint.has(decl.prop)) decl.remove(); });
    if (!target.nodes.length) target.remove();
    changed = true; rules++;
  });
  if (changed) fs.writeFileSync(file, root.toString());
}
fs.writeFileSync('.select-behavior-before.json', JSON.stringify(snapshots));
console.log(JSON.stringify({ native, custom, inlineStylesCleaned: inline, cssRulesCleaned: rules }));
