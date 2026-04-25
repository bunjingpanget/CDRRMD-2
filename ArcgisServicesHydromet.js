const DATA_SOURCE_MBG = '<a href="https://mgb.gov.ph/" target="_blank">MGB</a>';
const DATA_SOURCE_PAGASA = '<a href="https://www.pagasa.dost.gov.ph/" target="_blank">DOST-PAGASA</a>';

function toggleHydrometLayers(token) {
    /* flood mgb*/
    var PARHydrometLayer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/PAR/MapServer`,
        opacity: 0.7,
        token: token
    });
    PARHydrometLayer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `${lowerCaseDash(layerName)}-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">' + layerName + '</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#par-legend-items");
        }
    });
    PARHydrometLayer.on('load', (e) => {
        let cb_id = 'ch-par-hydromet';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* flood mgb*/
    var floodHydrometLayer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/MGB/Flood/MapServer`,
        opacity: 0.7,
        token: token
    });
    floodHydrometLayer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `${lowerCaseDash(layerName)}-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label}</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#flood-legend-items");
        }
    });
    floodHydrometLayer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">FLOOD INFORMATION</th></tr>
                        <tr><td>Susceptibility</td><td> ${featureCollection.features[0].properties['Flood Susceptibility']} </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_MBG} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    floodHydrometLayer.on('load', (e) => {
        let cb_id = 'ch-flood-hydromet';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* ril mgb*/
    var rilHydrometLayer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/MGB/RainInducedLandslide/MapServer`,
        opacity: 0.7,
        token: token
    });
    rilHydrometLayer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ril-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label}</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#ril-legend-items");
        }
    });
    rilHydrometLayer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">RAIN-INDUCED LANDSLIDE INFORMATION</th></tr>
                        <tr><td>Susceptibility</td><td> ${featureCollection.features[0].properties['RIL Susceptibility']} </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_MBG} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    rilHydrometLayer.on('load', (e) => {
        let cb_id = 'ch-ril-hydromet';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* stormsurge pagasa*/
    var ssHydrometLayer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/StormSurge2/MapServer`,
        opacity: 0.7,
        token: token
    });
    ssHydrometLayer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label}</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#ss-legend-items");
        }
    });
    ssHydrometLayer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">STORM SURGE INFORMATION</th></tr>
                        <tr><td>Inundation</td><td> ${featureCollection.features[0].properties['Storm Surge Inundation Class']} surge </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    ssHydrometLayer.on('load', (e) => {
        let cb_id = 'ch-ss-hydromet';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* BASIC SEVERE WIND DOST-PAGASA 20-YRP*/
    var severeWindBasic_20YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/Basic_Wind_Hazard/MapServer`,
        opacity: 0.7,
        token: token
    });
    severeWindBasic_20YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-basic-20-yrp-legend-items");
        }
    });
    severeWindBasic_20YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindBasic_20YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-basic-20-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* BASIC SEVERE WIND DOST-PAGASA 50-YRP*/
    var severeWindBasic_50YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/Basic_Wind_Hazard/MapServer`,
        layers: [1],
        opacity: 0.7,
        token: token
    });
    severeWindBasic_50YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-basic-50-yrp-legend-items");
        }
    });
    severeWindBasic_50YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindBasic_50YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-basic-50-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* BASIC SEVERE WIND DOST-PAGASA 100-YRP*/
    var severeWindBasic_100YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/Basic_Wind_Hazard/MapServer`,
        layers: [2],
        opacity: 0.7,
        token: token
    });
    severeWindBasic_100YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-basic-100-yrp-legend-items");
        }
    });
    severeWindBasic_100YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindBasic_100YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-basic-100-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* BASIC SEVERE WIND DOST-PAGASA 200-YRP*/
    var severeWindBasic_200YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/Basic_Wind_Hazard/MapServer`,
        layers: [3],
        opacity: 0.7,
        token: token
    });
    severeWindBasic_200YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-basic-200-yrp-legend-items");
        }
    });
    severeWindBasic_200YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindBasic_200YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-basic-200-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* BASIC SEVERE WIND DOST-PAGASA 500-YRP*/
    var severeWindBasic_500YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/Basic_Wind_Hazard/MapServer`,
        layers: [4],
        opacity: 0.7,
        token: token
    });
    severeWindBasic_500YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-basic-500-yrp-legend-items");
        }
    });
    severeWindBasic_500YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindBasic_500YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-basic-500-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* SITE-SPECIFIC SEVERE WIND DOST-PAGASA 20-YRP*/
    var severeWindSiteSpecific_20YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/SiteSpecific_Wind_Hazard/MapServer`,
        opacity: 0.7,
        token: token
    });
    severeWindSiteSpecific_20YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-site-specific-20-yrp-legend-items");
        }
    });
    severeWindSiteSpecific_20YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindSiteSpecific_20YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-site-specific-20-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* SITE-SPECIFIC SEVERE WIND DOST-PAGASA 50-YRP*/
    var severeWindSiteSpecific_50YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/SiteSpecific_Wind_Hazard/MapServer`,
        layers: [1],
        opacity: 0.7,
        token: token
    });
    severeWindSiteSpecific_50YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-site-specific-50-yrp-legend-items");
        }
    });
    severeWindSiteSpecific_50YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindSiteSpecific_50YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-site-specific-50-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* SITE-SPECIFIC SEVERE WIND DOST-PAGASA 100-YRP*/
    var severeWindSiteSpecific_100YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/SiteSpecific_Wind_Hazard/MapServer`,
        layers: [2],
        opacity: 0.7,
        token: token
    });
    severeWindSiteSpecific_100YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-site-specific-100-yrp-legend-items");
        }
    });
    severeWindSiteSpecific_100YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindSiteSpecific_100YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-site-specific-100-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* SITE-SPECIFIC SEVERE WIND DOST-PAGASA 200-YRP*/
    var severeWindSiteSpecific_200YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/SiteSpecific_Wind_Hazard/MapServer`,
        layers: [3],
        opacity: 0.7,
        token: token
    });
    severeWindSiteSpecific_200YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-site-specific-200-yrp-legend-items");
        }
    });
    severeWindSiteSpecific_200YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindSiteSpecific_200YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-site-specific-200-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    /* SITE-SPECIFIC SEVERE WIND DOST-PAGASA 500-YRP*/
    var severeWindSiteSpecific_500YRP_Layer = L.esri.dynamicMapLayer({
        url: `${mapservicelink}/PAGASA/SiteSpecific_Wind_Hazard/MapServer`,
        layers: [4],
        opacity: 0.7,
        token: token
    });
    severeWindSiteSpecific_500YRP_Layer.legend(function (error, legend) {
        if (!error) {
            let output = "";
            let layer = legend.layers[0];
            let layerName = layer.layerName;
            let new_id = `ss-legend`;
            for (var j = 0, jj = layer.legend.length; j < jj; j++) {
                output += L.Util.template('<div class="row legend-item" id="' + new_id + '"> <div class="col-md-2 text-center legend-image"> <img class="img-legend-items" width="{width}" height="{height}" src="data:{contentType};base64,{imageData}" atl="' + layerName + '"> </div> <div class="col-md-10 legend-description legend-text-size">{label} kph</div></div> ', layer.legend[j]);
            }
            $(output).appendTo("#severe-wind-site-specific-500-yrp-legend-items");
        }
    });
    severeWindSiteSpecific_500YRP_Layer.bindPopup(function (error, featureCollection) {
        if (error || featureCollection.features.length === 0) {
            return false;
        } else {
            let displayTable = `<table border="1" cellpadding="5" width="100%"><tbody>`;
            displayTable += `<tr><th colspan ="2" style="background: #17a2b8; color: white;text-shadow: none !important;">SEVERE WIND INFORMATION</th></tr>
                        <tr><td>Wind Speed</td><td> ${featureCollection.features[0].properties['Severe Wind Code']} kph </td></tr>
                        <tr><td>Data Source</td><td> ${DATA_SOURCE_PAGASA} </td></tr>`;
            displayTable += `</tbody></table>`;

            return displayTable;
        }
    });
    severeWindSiteSpecific_500YRP_Layer.on('load', (e) => {
        let cb_id = 'ch-severe-wind-site-specific-500-yrp';
        $(`#${cb_id}`).removeAttr('disabled');
        $(`.loading-${cb_id}`).remove();
    });

    let allLayers = [{
        'PARHydrometLayer': PARHydrometLayer,
        'floodHydrometLayer': floodHydrometLayer,
        'rilHydrometLayer': rilHydrometLayer,
        'ssHydrometLayer': ssHydrometLayer,
        'severeWindBasic_20YRP_Layer': severeWindBasic_20YRP_Layer,
        'severeWindBasic_50YRP_Layer': severeWindBasic_50YRP_Layer,
        'severeWindBasic_100YRP_Layer': severeWindBasic_100YRP_Layer,
        'severeWindBasic_200YRP_Layer': severeWindBasic_200YRP_Layer,
        'severeWindBasic_500YRP_Layer': severeWindBasic_500YRP_Layer,
        'severeWindSiteSpecific_20YRP_Layer': severeWindSiteSpecific_20YRP_Layer,
        'severeWindSiteSpecific_50YRP_Layer': severeWindSiteSpecific_50YRP_Layer,
        'severeWindSiteSpecific_100YRP_Layer': severeWindSiteSpecific_100YRP_Layer,
        'severeWindSiteSpecific_200YRP_Layer': severeWindSiteSpecific_200YRP_Layer,
        'severeWindSiteSpecific_500YRP_Layer': severeWindSiteSpecific_500YRP_Layer,
    }];

    if (currentUrl.pathname != '/monitoring/earthquake' && typhoon_track) {
        map.addLayer(PARHydrometLayer);
    }

    return allLayers;
}

