import { App } from './App';

const mount = document.getElementById('app');
if (mount) {
  mount.appendChild(new App().getElement());
}
