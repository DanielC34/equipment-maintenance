module.exports = {
  testDir: '.',
  testMatch: ['verify.mjs'],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  reporter: 'line',
};