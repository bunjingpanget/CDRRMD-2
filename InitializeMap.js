var zoom = 5.5;
var minZoom = 4.5;
var lat = 12.2;
var long = 124.0;

const currentUrl = window.location

if (currentUrl.pathname != '/monitoring/earthquake' && typhoon_track) {
    zoom = 2.5;
    long = 126.0;
}

/* map default */
const map = L.map("map", {
    center: [lat, long],
    minZoom: minZoom,
    zoom: zoom,
    closePopupOnClick: false,
    layers: [googleBasemapLayer]
});

