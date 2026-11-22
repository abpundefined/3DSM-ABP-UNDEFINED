import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

window.L = L;

declare global {
  interface Window {
    L: typeof L;
  }
}

export default L;
