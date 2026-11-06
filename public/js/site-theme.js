import {createSafeStorage} from './common.js';
const storage = createSafeStorage(() => localStorage);
const media = matchMedia('(prefers-color-scheme: dark)');
const apply = theme => { document.documentElement.dataset.theme = theme; };
const saved = storage.getItem('ygmhelper-theme');
apply(saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light');
document.querySelector('#theme-toggle')?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  apply(theme); storage.setItem('ygmhelper-theme', theme);
});
media.addEventListener?.('change', () => {
  if (!storage.getItem('ygmhelper-theme')) apply(media.matches ? 'dark' : 'light');
});
