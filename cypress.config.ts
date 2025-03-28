import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // setupNodeEvents(on, config) {
    //   // implement node event listeners here
    // },
    excludeSpecPattern: ['**/Z-examples'],
    baseUrl: 'http://localhost:5173'
  }
});
