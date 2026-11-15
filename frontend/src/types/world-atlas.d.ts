declare module 'world-atlas/countries-110m.json' {
  import type { GeometryCollection, Topology } from 'topojson-specification';

  const mundo: Topology<{
    countries: GeometryCollection;
    land: GeometryCollection;
  }>;
  export default mundo;
}
