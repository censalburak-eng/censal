import { defineConfig } from 'mobilewright';

export default defineConfig({
  testDir: "./tests",
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'ios',
      use: {
        platform: 'ios',
      },
    },
    {
      name: 'android',
      use: {
        platform: 'android',
      },
    },
  ],
});
