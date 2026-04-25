const fs = require('fs');

function processFile(path) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const names = data.features.map(f => f.properties.barangay_name);
    const uniqueNames = [...new Set(names)].sort();
    const banaderoVariations = names.filter(n => /Ba[ñn]adero/i.test(n) || /Banyadero/i.test(n));
    return {
        count: data.features.length,
        uniqueNames: uniqueNames,
        banaderoVariations: banaderoVariations
    };
}

const flood = processFile('backend/src/data/calamba_barangay_flood_susceptibility.geojson');
const boundaries = processFile('backend/src/data/calamba_barangay_boundaries_osm.geojson');

console.log('--- Flood Susceptibility ---');
console.log('Total Features:', flood.count);
console.log('Unique Names:', flood.uniqueNames.join(', '));
console.log('Banadero-like names:', flood.banaderoVariations);

console.log('\n--- Boundaries OSM ---');
console.log('Total Features:', boundaries.count);
console.log('Unique Names:', boundaries.uniqueNames.join(', '));
console.log('Banadero-like names:', boundaries.banaderoVariations);

console.log('\n--- Comparison ---');
const inFloodNotBoundaries = flood.uniqueNames.filter(x => !boundaries.uniqueNames.includes(x));
const inBoundariesNotFlood = boundaries.uniqueNames.filter(x => !flood.uniqueNames.includes(x));

console.log('In Flood, not in Boundaries:', inFloodNotBoundaries);
console.log('In Boundaries, not in Flood:', inBoundariesNotFlood);
