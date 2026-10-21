/* eslint-env jest */
const babel = require('@babel/core');

const compile = env =>
  babel.transformSync(
    "console.log('a'); console.info('i'); console.debug('d'); console.warn('w'); console.error('e');",
    {filename: 'sample.js', cwd: __dirname + '/..', envName: env, babelrc: false, configFile: require.resolve('../babel.config.js')},
  ).code;

describe('babel config', () => {
  it('strips non-essential console calls in production but keeps warn and error', () => {
    const code = compile('production');
    expect(code).not.toMatch(/console\.(log|info|debug)/);
    expect(code).toMatch(/console\.warn/);
    expect(code).toMatch(/console\.error/);
  });

  it('keeps console.log in development', () => {
    expect(compile('development')).toMatch(/console\.log/);
  });
});
