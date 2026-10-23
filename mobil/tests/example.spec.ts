// this is a skeleton test for mobilewright (see https://github.com/mobile-next/mobilewright/blob/main/README.md)
// for documentation see: https://mobilewright.dev/docs/
// for agent skill see: https://github.com/mobile-next/mobilewright-skill
import { test, expect } from '@mobilewright/test';

test('device connects and reads screen hierarchy', async ({ screen }) => {
  const tree = await screen.viewTree();
  console.log(`Discovered ${tree.length} UI nodes on screen`);
  expect(tree.length).toBeGreaterThan(0);
});
