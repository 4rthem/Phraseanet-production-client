/* eslint-disable quotes */
/* eslint-disable no-undef */
import $ from 'jquery';
import _ from 'underscore';
import markerCollection from './markerCollection';
import markerGLCollection from './markerGLCollection';
import {generateRandStr} from '../../utils/utils';
import provider from '../provider';
import leafletLocaleFr from './locales/fr';
import merge from 'lodash.merge';
require('mapbox.js/theme/style.css');
require('mapbox-gl/dist/mapbox-gl.css');
require('./mapbox.css');
require('leaflet-draw/dist/leaflet.draw.css');
require('leaflet-contextmenu/dist/leaflet.contextmenu.css');
const leafletMap = (services) => {
    const {configService, localeService, eventEmitter} = services;
    let $container = null;
    let parentOptions = {};
    let tabOptions = {};
    let mapOptions = {};
    let mapUID;
    let mapbox;
    let mapboxgl;
    let leafletDraw;
    let featureLayer = null;
    let map = null;
    let geocoder = null;
    let mapboxClient = null;
    let $tabContent;
    let tabContainerName = 'leafletTabContainer';
    let editable;
    let drawable;
    let searchable;
    let drawnItems;
    let activeProvider = {};
    let recordConfig = {};
    let currentZoomLevel = 0;
    let shouldUpdateZoom = false;
    let features = null;
    let geojson = {};
    let labelLayerId;

    //let markerMapboxGl = {};
    const initialize = (options) => {
        let initWith = {$container, parentOptions} = options;
        tabOptions = options.tabOptions || false;
        mapOptions = options.mapOptions !== undefined ? _.extend(mapOptions, options.mapOptions) : mapOptions;
        editable = options.editable || false;
        drawable = options.drawable || false;
        searchable = options.searchable || false;
        drawnItems = options.drawnItems || false;
        recordConfig = parentOptions.recordConfig || false;

        mapUID = 'leafletMap' + generateRandStr(5);

        let providerConfig = provider(services);
        let isProviderInitalized = providerConfig.initialize();

        if (isProviderInitalized === true) {
            activeProvider = providerConfig.getConfiguration();

            if (tabOptions !== false) {
                // @TODO deepmerge
                let tabPlist = _.extend({
                    tabProperties: {
                        id: tabContainerName,
                        title: localeService.t('Geolocalisation'),
                        classes: 'descBoxes'
                    },
                    position: 1
                }, tabOptions);
                eventEmitter.emit('appendTab', tabPlist);
            }
        }
        onResizeEditor = _.debounce(onResizeEditor, 300);
        return isProviderInitalized;
    };

    const onRecordSelectionChanged = (params) => {
        if (activeProvider.accessToken === undefined) {
            return;
        }
        let {selection} = params;

        if (shouldUseMapboxGl() && !map.loaded()) {
            //refresh marker after 2 sec
            setTimeout(function () {
                refreshMarkers(selection);
            }, 2000);
        } else {
            refreshMarkers(selection);
        }
    };

    const onTabAdded = (params) => {
        if (activeProvider.accessToken === undefined) {
            return;
        }
        let {origParams, selection} = params;
        if (origParams.tabProperties.id === tabContainerName) {
            $container = $(`#${tabContainerName}`, parentOptions.$container);
            appendMapContent({selection});
        }
    };

    const appendMapContent = (params) => {
        let {selection} = params;
        initializeMap(selection);
    }

    const initializeMap = (pois) => {
        // if not access token provided - stop mapbox loading
        if (activeProvider.accessToken === undefined) {
            throw new Error('MapBox require an access token');
        }
        require.ensure([], () => {
            // select geocoding provider:
            mapbox = require('mapbox.js');
            leafletDraw = require('leaflet-draw');
            require('leaflet-contextmenu');
            mapboxgl = require('mapbox-gl');
            let MapboxClient = require('mapbox');

            $container.empty().append(`<div id="${mapUID}" class="phrasea-popup" style="width: 100%;height:100%; position: absolute;top:0;left:0"></div>`);

            if (editable) {
                // init add marker context menu only if 1 record is available and has no coords
                if (pois.length === 1) {
                    let poiIndex = 0;
                    let selectedPoi = pois[poiIndex];
                    let poiCoords = haveValidCoords(selectedPoi);
                    if (poiCoords === false) {
                        mapOptions = merge({
                            contextmenu: true,
                            contextmenuWidth: 140,
                            contextmenuItems: [{
                                text: localeService.t('mapMarkerAdd'),
                                callback: (e) => {
                                    addMarkerOnce(e, poiIndex, selectedPoi)
                                }
                            }]
                        }, mapOptions);
                    }
                }
            }

            if (!shouldUseMapboxGl()) {
                L.mapbox.accessToken = activeProvider.accessToken;
                map = L.mapbox.map(mapUID, 'mapbox.streets', mapOptions);
                shouldUpdateZoom = false;
                map.setView(activeProvider.defaultPosition, activeProvider.defaultZoom);
                if (searchable) {
                    map.addControl(L.mapbox.geocoderControl('mapbox.places'));
                }
                var layers = {
                    Streets: L.mapbox.tileLayer('mapbox.streets'),
                    Outdoors: L.mapbox.tileLayer('mapbox.outdoors'),
                    Satellite: L.mapbox.tileLayer('mapbox.satellite')
                };

                layers.Streets.addTo(map);
                L.control.layers(layers).addTo(map);
                geocoder = L.mapbox.geocoder('mapbox.places');

                if (drawable) {
                    addDrawableLayers();
                }
                addMarkersLayers();
                refreshMarkers(pois);
            } else {
                mapboxgl.accessToken = activeProvider.accessToken;

                map = new mapboxgl.Map({
                    container: mapUID,
                    style: activeProvider.mapLayers[0].value,
                    center: activeProvider.defaultPosition.reverse(), // format different lng/lat
                    zoom: activeProvider.defaultZoom
                });

                map.addControl(new mapboxgl.NavigationControl());
                //markerMapboxGl = new mapboxgl.Marker();

                shouldUpdateZoom = false;

                mapboxClient = new MapboxClient(mapboxgl.accessToken);


                map.on('style.load', function () {
                    // Triggered when `setStyle` is called.
                    if (map.getStyle().name == "Mapbox Streets" || map.getStyle().name == "Mapbox Light") {
                        add3DBuildingsLayersGL();
                    }

                    if (geojson.hasOwnProperty('features')) addMarkersLayersGL(geojson);

                });

                map.on('load', function () {

                    var layers = map.getStyle().layers;

                    for (var i = 0; i < layers.length; i++) {
                        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                            labelLayerId = layers[i].id;
                            break;
                        }
                    }

                    geojson = {
                        type: 'FeatureCollection',
                        features: []
                    };

                    if (activeProvider.mapLayers.length > 1) {
                        addMapLayerControl(activeProvider.mapLayers);
                    }

                    addMarkersLayersGL(geojson);
                    refreshMarkers(pois);
                });
            }


            currentZoomLevel = activeProvider.markerDefaultZoom;

            map.on('zoomend', function () {
                if (shouldUpdateZoom) {
                    currentZoomLevel = map.getZoom();
                }
            });

        });
    };

    const addMapLayerControl = (layerArray) => {
        let controlContainerList = $('.mapboxgl-control-container');

        _.each(controlContainerList, (controlContainer) => {
            if ($(controlContainer).find('.map-selection-container').length > 0) {
                $(controlContainer).find('.map-selection-container').remove();
            }

            let mapSelectionContainer =
                $('<div class="dropdown map-selection-container"><button class="map-drop-btn"><i class="fa fa-map" aria-hidden="true"></i></button><div id="mapSelectionDropDown" class="map-dropdown-content"></div></div>');

            var $mapSelectionDropDown = mapSelectionContainer.find('#mapSelectionDropDown');

            $(controlContainer).append(mapSelectionContainer);

            $(controlContainer).on('click', 'button', function (event) {
                $mapSelectionDropDown.get(0).classList.toggle("show");
            });


            var map_list_div = document.createElement('div');
            _.each(layerArray, (layer, index) => {
                var div_layer = document.createElement('div');
                //add checked attr for first element
                var isChecked = index == 0 ? "checked=checked" : "";
                $(div_layer).append(`<label><input id=${layer.name} name="mapradio" type='radio' value=${layer.value} ${isChecked}>
            <span for=${layer.name}>${layer.name}</span></label>`);
                $(map_list_div).append(div_layer);
            });

            $mapSelectionDropDown.empty().append(map_list_div);
            $(controlContainer).on('click', 'input[name="mapradio"]', function (event) {
                switchLayer($(event.target));
            });


            $('body').on('click', function (event) {
                if (event.target.matches('button.map-drop-btn') ||
                    event.target.matches('button.map-drop-btn i')) {
                    return;
                } else {
                    var dropdowns = $mapSelectionDropDown;
                    var i;
                    for (i = 0; i < dropdowns.length; i++) {
                        var openDropdown = dropdowns[i];
                        if (openDropdown.classList.contains('show')) {
                            openDropdown.classList.remove('show');
                        }
                    }
                }
            });
        });

    }

    const switchLayer = ($elem) => {
        map.setStyle($elem.val());
    }

    const addDrawableLayers = () => {

        if (localeService.getLocale() === 'fr') {
            L.drawLocal = leafletLocaleFr;
        }
        // should restore drawn items?
        // user.getPreferences
        let drawingGroup;
        drawingGroup = new L.FeatureGroup();

        map.addLayer(drawingGroup);

        // Initialise the draw control and pass it the FeatureGroup of editable layers
        let drawControl = new L.Control.Draw({
            draw: {
                circle: false,
                polyline: false,
                polygon: false,
                marker: false,
                position: 'topleft',
                rectangle: {
                    //title: 'Draw a sexy polygon!',
                    allowIntersection: false,
                    drawError: {
                        color: '#b00b00',
                        timeout: 1000
                    },
                    shapeOptions: {
                        color: '#0c4554'
                    },
                    showArea: true
                }
            },
            edit: {
                featureGroup: drawingGroup
            }
        });
        let shapesDrawned = {};
        map.addControl(drawControl);

        map.on('draw:created', (event) => {
            let type = event.layerType;
            let layer = event.layer;
            let layerId = drawingGroup.getLayerId(layer);

            shapesDrawned[layerId] = {
                type: type,
                options: layer.options,
                latlng: layer.getLatLngs(),
                bounds: getMappedFieldsCollection(layer.getLatLngs())
            };
            drawingGroup.addLayer(layer);
            eventEmitter.emit('shapeCreated', {shapes: shapesDrawned, drawnItems: shapesDrawned});
        });

        map.on('draw:edited', (event) => {
            let layers = event.layers;

            layers.eachLayer(function (layer) {
                let layerId = drawingGroup.getLayerId(layer);
                // get type from drawed shape:
                let currentType = shapesDrawned[layerId].type;
                shapesDrawned[layerId] = merge(shapesDrawned[layerId], {
                    options: layer.options,
                    latlng: layer.getLatLngs(),
                    bounds: getMappedFieldsCollection(layer.getLatLngs())
                })
            });
            eventEmitter.emit('shapeEdited', {shapes: shapesDrawned, drawnItems: shapesDrawned});
        });

        map.on('draw:deleted', (event) => {
            let layers = event.layers;
            layers.eachLayer(function (layer) {
                let layerId = drawingGroup.getLayerId(layer);
                delete shapesDrawned[layerId];
            });
            eventEmitter.emit('shapeRemoved', {shapes: shapesDrawned, drawnItems: shapesDrawned});
        });

        // draw serialized items:
        applyDrawings(drawnItems, drawingGroup);
    };

    /***
     * Draw serialized shapes
     * @param shapesDrawned
     * @param drawingGroup
     */
    const applyDrawings = (shapesDrawned, drawingGroup) => {
        for (let shapeIndex in shapesDrawned) {
            if (shapesDrawned.hasOwnProperty(shapeIndex)) {
                let shape = shapesDrawned[shapeIndex];

                let newShape = L.rectangle(shape.latlng, shape.options);
                let newShapeType = '';
                switch (shape.type) {
                    case 'rectangle':
                        newShape = L.rectangle(shape.latlng, shape.options);
                        newShapeType = L.Draw.Rectangle.TYPE;
                        break;
                    default:
                        newShape = L.rectangle(shape.latlng, shape.options);
                        newShapeType = L.Draw.Rectangle.TYPE;
                }
                // start editor for new shape:
                newShape.editing.enable();
                drawingGroup.addLayer(newShape);
                // fire created event manually:
                map.fire('draw:created', {layer: newShape, layerType: newShapeType});
                newShape.editing.disable();
            }
        }
    }
    const addMarkerOnce = (e, poiIndex, poi) => {
        // inject coords into poi's fields:
        let mappedCoords = getMappedFields(e.latlng);
        let pois = [merge(poi, mappedCoords)];
        refreshMarkers(pois).then(() => {
            // broadcast event:
            let wrappedMappedFields = {};
            // values needs to be wrapped in a array:
            for (let fieldIndex in mappedCoords) {
                if (mappedCoords.hasOwnProperty(fieldIndex)) {
                    wrappedMappedFields[fieldIndex] = [mappedCoords[fieldIndex]]
                }
            }

            let presets = {
                fields: wrappedMappedFields //presetFields
            };
            map.contextmenu.disable();
            eventEmitter.emit('recordEditor.addPresetValuesFromDataSource', {data: presets, recordIndex: poiIndex});
        });
    }

    const add3DBuildingsLayersGL = () => {
        map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#aaa',

                // use an 'interpolate' expression to add a smooth transition effect to the
                // buildings as the user zooms in
                'fill-extrusion-height': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
    }

    const addMarkersLayersGL = (geojson) => {

        map.addSource('data', {
            type: 'geojson',
            data: geojson
        });

        map.addLayer({
            id: 'points',
            source: 'data',
            type: 'symbol',
            layout: {
                "icon-image": "star-15",
                "icon-size": 1.5
            },
        });
    }

    const addMarkersLayers = () => {
        if (featureLayer !== null) {
            featureLayer.clearLayers();
        } else {
            featureLayer = L.mapbox.featureLayer([], {
                pointToLayer: function (feature, latlon) {
                    if (feature.properties.radius !== undefined) {
                        // L.circleMarker() draws a circle with fixed radius in pixels.
                        // To draw a circle overlay with a radius in meters, use L.circle()
                        return L.circleMarker(latlon, {radius: feature.properties.radius || 10});
                    } else {
                        let marker = require('mapbox.js/src/marker.js'); //L.marker(feature);
                        return marker.style(feature, latlon, {accessToken: activeProvider.accessToken});
                    }
                }
            }).addTo(map);
        }
    };

    const refreshMarkers = (pois) => {

        return buildGeoJson(pois).then((geoJsonPoiCollection) => {
            if(map != null) {
                if (shouldUseMapboxGl()) {
                    geojson = {
                        type: 'FeatureCollection',
                        features: geoJsonPoiCollection
                    };

                    map.getSource('data').setData(geojson);

                    let markerGlColl = markerGLCollection(services);
                    markerGlColl.initialize({map, geojson, editable});

                    if (geojson.features.length > 0) {
                        shouldUpdateZoom = true;
                        // var popup = new mapboxgl.Popup()
                        //     .setText(geojson.features[0].properties.title);
                        //markerMapboxGl.setLngLat(geojson.features[0].geometry.coordinates).setPopup(popup).addTo(map);
                        map.flyTo({center: geojson.features[0].geometry.coordinates, zoom: currentZoomLevel});
                    } else {
                        shouldUpdateZoom = false;
                        //markerMapboxGl.setLngLat(activeProvider.defaultPosition).addTo(map);
                        map.flyTo({center: activeProvider.defaultPosition, zoom: activeProvider.defaultZoom});
                    }
                } else {
                    addMarkersLayers();

                    let markerColl = markerCollection(services);
                    markerColl.initialize({map, featureLayer, geoJsonPoiCollection, editable});

                    if (featureLayer.getLayers().length > 0) {
                        shouldUpdateZoom = true;
                        map.fitBounds(featureLayer.getBounds(), {maxZoom: currentZoomLevel});
                    } else {
                        // set default position
                        shouldUpdateZoom = false;
                        map.setView(activeProvider.defaultPosition, activeProvider.defaultZoom);
                    }
                }
            }
        })

    };
    /**
     * build geoJson features return as a promise
     * @param pois
     * @returns {*}
     */
    const buildGeoJson = (pois) => {
        let geoJsonPoiCollection = [];
        let asyncQueries = [];
        let geoJsonPromise = $.Deferred();

        for (let poiIndex in pois) {
            let poi = pois[poiIndex];
            let poiCoords = extractCoords(poi);
            let poiTitle = poi.FileName || poi.Filename || poi.Title || poi.NomDeFichier;
            if (poiCoords[0] !== false && poiCoords[1] !== false) {
                geoJsonPoiCollection.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: poiCoords
                    },
                    properties: {
                        recordIndex: poiIndex,
                        'marker-color': '0c4554',
                        'marker-zoom': currentZoomLevel,
                        title: `${poiTitle}`
                    }
                });
            } else {
                // coords are not available, fallback on city/province/country if available

                let query = '';
                query += poi.City !== undefined && poi.City !== null ? poi.City : '';
                query += poi.Country !== undefined && poi.Country !== null ? `, ${poi.Country} ` : '';

                if (query !== '') {
                    if (shouldUseMapboxGl()) {
                        getDataForMapboxGl(asyncQueries, query, poiIndex, poiTitle, geoJsonPoiCollection);
                    } else {
                        getDataForMapbox(asyncQueries, query, poiIndex, poiTitle, geoJsonPoiCollection);
                    }
                }
            }
        }

        if (asyncQueries.length > 0) {
            $.when.apply(null, asyncQueries).done(function () {
                geoJsonPromise.resolve(geoJsonPoiCollection)
            });
        } else {
            geoJsonPromise.resolve(geoJsonPoiCollection)
        }
        return geoJsonPromise.promise();
    };

    const getDataForMapboxGl = (asyncQueries, query, poiIndex, poiTitle, geoJsonPoiCollection) => {
        let geoPromise = $.Deferred();
        mapboxClient.geocodeForward(query, (err, data) => {
            // take the first feature if exists
            if (data !== undefined) {
                if (data.features.length > 0) {
                    let bestResult = data.features[0];
                    bestResult.properties.recordIndex = poiIndex;
                    bestResult.properties['marker-zoom'] = currentZoomLevel;
                    bestResult.properties['marker-color'] = "0c4554";
                    bestResult.properties.title = `${poiTitle}`;
                    geoJsonPoiCollection.push(bestResult);
                }
            }
            geoPromise.resolve(geoJsonPoiCollection)
        });
        asyncQueries.push(geoPromise);
    }

    const getDataForMapbox = (asyncQueries, query, poiIndex, poiTitle, geoJsonPoiCollection) => {
        let geoPromise = $.Deferred();
        geocoder.query(query, (err, data) => {
            // take the first feature if exists
            if (data.results !== undefined) {
                if (data.results.features.length > 0) {

                    /*let circleArea = {
                     type: 'Feature',
                     geometry: {
                     type: 'Point',
                     coordinates: data.results.features[0].center //[[ data.bounds ]]
                     },
                     properties: {
                     title: `${poi.FileName}`
                     }
                     };
                     circleArea.properties['marker-zoom'] = 5;
                     circleArea.properties.radius = 50;
                     geoJsonPoiCollection.push(circleArea);*/

                    let bestResult = data.results.features[0];
                    bestResult.properties.recordIndex = poiIndex;
                    bestResult.properties['marker-zoom'] = currentZoomLevel;
                    bestResult.properties.title = `${poiTitle}`;
                    geoJsonPoiCollection.push(bestResult);
                }
            }
            geoPromise.resolve(geoJsonPoiCollection)
        });
        asyncQueries.push(geoPromise);
    }

    const extractCoords = (poi) => {
        if (poi !== undefined) {
            return [activeProvider.fieldPosition.longitude(poi), activeProvider.fieldPosition.latitude(poi)];
        }
        return [false, false];
    };

    const haveValidCoords = (poi) => {
        if (poi !== undefined) {
            return activeProvider.fieldPosition.longitude(poi) && activeProvider.fieldPosition.latitude(poi)
        }
        return false;
    };

    let onResizeEditor = () => {
        if (activeProvider.accessToken === undefined) {
            return;
        }
        if (map !== null) {
            if (shouldUseMapboxGl()) {
                map.resize();
                if (geojson.hasOwnProperty('features') && geojson.features.length > 0) {
                    shouldUpdateZoom = true;
                    //markerMapboxGl.setLngLat(geojson.features[0].geometry.coordinates).addTo(map);
                    map.flyTo({center: geojson.features[0].geometry.coordinates, zoom: currentZoomLevel});
                } else {
                    shouldUpdateZoom = false;
                    //markerMapboxGl.setLngLat(activeProvider.defaultPosition).addTo(map);
                    map.flyTo({center: activeProvider.defaultPosition, zoom: activeProvider.defaultZoom});
                }
            } else {
                map.invalidateSize();
                if (featureLayer.getLayers().length > 0) {
                    shouldUpdateZoom = true;
                    map.fitBounds(featureLayer.getBounds(), {maxZoom: currentZoomLevel});
                } else {
                    // set default position
                    shouldUpdateZoom = false;
                    map.setView(activeProvider.defaultPosition, activeProvider.defaultZoom);
                }
            }

        }
    };

    const onMarkerChange = (params) => {
        let {marker, position} = params;

        if (editable) {
            let mappedFields = getMappedFields(position);
            let wrappedMappedFields = {};
            // values needs to be wrapped in a array:
            for (let mappedFieldIndex in mappedFields) {
                if (mappedFields.hasOwnProperty(mappedFieldIndex)) {
                    wrappedMappedFields[mappedFieldIndex] = [mappedFields[mappedFieldIndex]]
                }
            }

            let presets = {
                fields: wrappedMappedFields //presetFields
            };
            let recordIndex = marker.feature.properties.recordIndex;

            eventEmitter.emit('recordEditor.addPresetValuesFromDataSource', {data: presets, recordIndex});
        }
    };
    const getMappedFields = (position) => {
        let fieldMapping = activeProvider.provider['position-fields'] !== undefined ? activeProvider.provider['position-fields'] : [];
        let mappedFields = {};
        if (fieldMapping.length > 0) {

            _.each(fieldMapping, (mapping) => {
                // latitude and longitude are combined in a composite field
                if (mapping.type === 'latlng') {
                    mappedFields[mapping.name] = `${position.lat} ${position.lng}`;
                } else if (mapping.type === 'lat') {
                    mappedFields[mapping.name] = `${position.lat}`;
                } else if (mapping.type === 'lng') {
                    mappedFields[mapping.name] = `${position.lng}`;
                }
            });
        } else {
            mappedFields["meta.Latitude"] = `${position.lat}`;
            mappedFields["meta.Longitude"] = `${position.lng}`;
        }
        return mappedFields;
    }

    const getMappedFieldsCollection = (positions) => {
        let mappedPositions = [];
        for (let positionIndex in positions) {
            if (positions.hasOwnProperty(positionIndex)) {
                mappedPositions.push(getMappedFields(positions[positionIndex]))
            }
        }
        return mappedPositions;
    }

    const shouldUseMapboxGl = () => {
        if (activeProvider.defaultMapProvider === "mapboxWebGL" && mapboxgl !== undefined && mapboxgl.supported()) {
            return true;
        }
        return false;
    }

    eventEmitter.listenAll({
        'recordSelection.changed': onRecordSelectionChanged,
        'appendTab.complete': onTabAdded,
        /* eslint-disable quote-props */
        'markerChange': onMarkerChange,
        'tabChange': onResizeEditor,
    });
    return {initialize, appendMapContent}
};

export default leafletMap;
