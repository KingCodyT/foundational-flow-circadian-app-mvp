const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const theme = postcss.parse(read('app/coastal-theme.css'));
const tokens = {};
theme.walkDecls(/^--coastal-/, node => { tokens[node.prop] = node.value; });

function luminance(hex) {
  const rgb = hex.slice(1,7).match(/../g).map(v => parseInt(v,16)/255)
    .map(v => v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b) {
  const values = [luminance(a),luminance(b)].sort((a,b)=>a-b);
  return (values[1]+.05)/(values[0]+.05);
}

test('one shared coastal theme owns every route rather than Today alone', () => {
  assert.match(read('app/globals.css'), /@import "\.\/coastal-theme\.css"/);
  assert.equal(tokens['--coastal-bg'], '#102936');
  assert.equal(tokens['--coastal-gold'], '#f4d28f');
  const landscape = theme.nodes.find(n => n.selector === '.journey .journey-landscape');
  assert.match(landscape.toString(), /coastal-hero-placeholder\.jpg/);
  assert.doesNotMatch(theme.toString(), /#365fad|#edf3fb/i);
  theme.walkDecls(node => assert.ok(!node.important, 'theme does not need important overrides'));
  for (const file of ['app/globals.css','views/welcome-page.module.css']) {
    const sheet = postcss.parse(read(file));
    sheet.walkDecls(node => {
      if (node.value.includes('#365fad') || node.value.includes('#edf3fb')) {
        let ancestor = node.parent;
        while (ancestor && !(ancestor.type === 'atrule' && ancestor.name === 'layer')) ancestor = ancestor.parent;
        assert.ok(ancestor, `${file}: obsolete palette must not override the shared theme`);
      }
    });
  }
});

test('coastal text, accent and controls meet accessible contrast on their surfaces', () => {
  for (const foreground of ['--coastal-text','--coastal-copy','--coastal-muted','--coastal-gold','--coastal-danger']) {
    for (const background of ['--coastal-bg','--coastal-raised','--coastal-control']) {
      assert.ok(contrast(tokens[foreground],tokens[background]) >= 4.5, `${foreground} on ${background}`);
    }
  }
  assert.ok(contrast(tokens['--coastal-control-line'],tokens['--coastal-control']) >= 3);
  assert.ok(contrast(tokens['--coastal-bg'],tokens['--coastal-gold']) >= 4.5);
});

test('shared theme covers inputs, dialogs, selected states, disclosures and navigation', () => {
  const css=theme.toString();
  for (const selector of ['.profile-section','.recipe-card','.timeline-day','.mobile-assessment','.journey-steps','[role="dialog"]','input:not(','button[data-selected="true"]','[aria-pressed="true"]','[aria-current="page"]','[open]','focus-visible']) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  // Scientific swatches are content, not decoration, and retain their own colors.
  assert.doesNotMatch(css,/\.light-visible-gradient\s*\{|\.light-band-swatch\s*\{|\.sunlight-strip\s*>\s*span\s*\{/);
  assert.match(read('views/welcome-page.module.css'), /--ff-paper: var\(--coastal-bg\)/);
});

test('welcome descendants inherit shared colors rather than redefining the old palette', () => {
  const welcome = postcss.parse(read('views/welcome-page.module.css'));
  welcome.walkDecls(/^--ff-/, node => {
    assert.equal(node.parent.selector, '.homepage', `descendant color override: ${node.parent.selector}`);
  });
});

test('selected recipe hover retains an accessible gold action surface', () => {
  const selectedHover = theme.nodes.find(n => n.selector === '.journey .recipe-slots button[aria-pressed="true"]:hover:not(:disabled)');
  assert.ok(selectedHover);
  assert.match(selectedHover.toString(), /background: var\(--coastal-gold-hover\)/);
  assert.match(selectedHover.toString(), /color: var\(--coastal-bg\)/);
});

test('installed app launch and browser chrome use the coastal background', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.background_color, tokens['--coastal-bg']);
  assert.equal(manifest.theme_color, tokens['--coastal-bg']);
  assert.match(read('pages/_app.tsx'), /name="theme-color" content="#102936"/);
});
