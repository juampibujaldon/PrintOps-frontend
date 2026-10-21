/* eslint-env jest */
const config = require('../metro.config');

describe('metro config', () => {
  it('turns inlineRequires on explicitly', async () => {
    const options = await config.transformer.getTransformOptions();
    expect(options.transform.inlineRequires).toBe(true);
  });

  it('keeps the default RN config (resolver, serializer) merged', () => {
    expect(config.resolver.sourceExts).toContain('tsx');
  });
});
