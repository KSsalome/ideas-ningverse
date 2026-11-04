import createLibraryInterior from './library-interior-art.js';
import createFactoryInterior from './factory-interior-art.js';
import createMuseumInterior from './museum-interior-art.js';
export default function createInteriorArt({scene,mode='gallery',rows=3,back=-14,depth=32,lowDetail=false,...extra}){const options={scene,mode,rows,back,depth,lowDetail,...extra};if(mode==='library')return createLibraryInterior(options);if(mode==='factory')return createFactoryInterior(options);return createMuseumInterior(options);}
