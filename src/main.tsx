import { render } from '@solidjs/web';
import App from './App.js';

// Render the SolidJS app
const root = document.getElementById('app');
if (root) {
  render(() => <App />, root);
}

console.info('Fantasy Civilization Builder initialized with SolidJS!');
