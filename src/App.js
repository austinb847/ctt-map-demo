import React from 'react';
import './App.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css'
import collegeData from './data/colleges-4.json'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

class App extends React.Component {

	componentDidMount() {
		const map = new mapboxgl.Map({
			container: this.mapWrapper,
			style: 'mapbox://styles/mapbox/streets-v11',  // light/dark function with lines works without this some of the time
			center: [-95.7129, 37.0902],
			zoom: 3
		});


		// for search bar function and marker
		const geocoder = new MapboxGeocoder({
			accessToken: mapboxgl.accessToken,
			countries: 'us',
			placeholder: 'Enter City Here',
			marker: {
				color: 'orange'
			},
			mapboxgl: mapboxgl
		});
		map.addControl(geocoder);


		// for college markers and popup
		const addCollegeMarkers = function () {
			collegeData.features.map(college => {
				let lat = college.geometry.coordinates[0];
				let long = college.geometry.coordinates[1];
				let el = document.createElement('div');
				el.className = 'marker';
				el.style.backgroundImage = "/college.svg"
				new mapboxgl.Marker(el)
					.setLngLat([lat, long])
					.setPopup(new mapboxgl.Popup({ offset: 25 })
						.setHTML('<h3>' + college.properties.name + '</h3><p>' + college.properties.description + '</p>'))
					.addTo(map);
			});
		}

   /// starting points
		let origin = [-122.881750, 45.542940];
		let point = [-122.872192,42.326542];   //new
		let destination = [-117.072350, 32.777599];

		const overviewText = document.getElementById('overview');
		const stepsText = document.getElementById('steps');


		// for total miles and distance time 
		const setOverview = function (route) {
			const routeDistance = route.distance;
			const routeDuration = route.duration;
			overviewText.innerText = `${(routeDistance / 1609.344).toFixed(1)} miles | ${(routeDuration / 60).toFixed(0)} minutes`;
		};

		// for line route on map 
		const setRouteLine = function (route) {
			const routeLine = {
				type: 'FeatureCollection',
				features: [{
					properties: {},
					geometry: route.geometry,
				}],
			};

			map.getSource('route').setData(routeLine);
		};

		const setSteps = function (steps) {
			stepsText.innerText = '';

			const maneuvers = {
				type: 'FeatureCollection',
				features: [
				],
			};

			// for direction list 
			steps.forEach((step) => {
				const listItem = document.createElement('li');
				listItem.innerText = step.maneuver.instruction;
				stepsText.appendChild(listItem);

				const maneuver = {
					properties: {
						name: step.name,
						distance: step.distance,
						duration: step.duration,
					},
					geometry: {
						type: 'Point',
						coordinates: step.maneuver.location,
					},
				};
				maneuvers.features.push(maneuver);
			});
			map.getSource('maneuvers').setData(maneuvers);
    };
    
    


		// get directions on map
		const getDirections = function () {
			let request = 'https://api.mapbox.com/directions/v5/';
			request += 'mapbox/driving-traffic/';
			request += origin.join(',') + ';' + point.join(',') + ';' + destination.join(',');   ///new
			request += '?access_token=' + mapboxgl.accessToken;
			request += '&geometries=geojson';
			// request += '&approaches=;curb';
			request += '&steps=true';
			request += '&overview=full'; //add full detail to feature line when zoomed in


			console.log(request);

			fetch(request).then((res) => res.json()).then((res) => {
        console.log(res)
        const route = res.routes[0];
        const legs = route.legs //.steps;
        console.log(route.legs)
        setOverview(route);
        setRouteLine(route);
         

        legs.forEach(leg => {
          setSteps(leg.steps)
          // leg.forEach(el => {
          //   setSteps(el.steps)
          // })
        })

			
			});
		};





		/// for menu layer of map style features 
		const layerList = document.getElementById('menu');
		const inputs = layerList.getElementsByTagName('input');

		function switchLayer(layer) {
			let layerId = layer.target.id;
			map.setStyle('mapbox://styles/mapbox/' + layerId);
		}

		for (var i = 0; i < inputs.length; i++) {
			inputs[i].onclick = switchLayer;
		}

		/// for right side map nav controls 
		map.addControl(new mapboxgl.NavigationControl());

		// add fullscreen directions 
		map.addControl(new mapboxgl.FullscreenControl());

    // Add geolocate control to the map.
		map.addControl(
			new mapboxgl.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				trackUserLocation: true
			})
		);

		// marker setup for start to finish 
		const start = new mapboxgl.Marker({
			draggable: true,
			color: 'purple',
		}).setLngLat(origin).addTo(map);

		const middle = new mapboxgl.Marker({    //// added to try 
			draggable: true,
			color: 'yellow',
		}).setLngLat(point).addTo(map);

		const end = new mapboxgl.Marker({
			draggable: true,
			color: 'green',
		}).setLngLat(destination).addTo(map);

		const onDragEnd = function () {
			origin = start.getLngLat().toArray();
			point = middle.getLngLat().toArray();  //new
			destination = end.getLngLat().toArray();
			getDirections();
		};

		start.on('dragend', onDragEnd);
		middle.on('dragend', onDragEnd);  //// new
		end.on('dragend', onDragEnd);

		map.on('load', () => {
			map.addSource('route', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [
					],
				},
			});

			map.addLayer({
				id: 'routeLayer',
				type: 'line',
				source: 'route',
				layout: {},
				paint: {
					'line-color': 'cornflowerblue',
					'line-width': 10,
				},
			}, 'road-label');

			map.addLayer({
				id: 'routeArrows',
				source: 'route',
				type: 'symbol',
				layout: {
					'symbol-placement': 'line',
					'text-field': '→',
					'text-rotate': 0,
					'text-keep-upright': false,
					'symbol-spacing': 100,
					'text-size': 22,
					'text-offset': [0, -0.1],
				},
				paint: {
					'text-color': 'white',
					'text-halo-color': 'white',
					'text-halo-width': 1,
				},
			}, 'road-label');

			map.addSource('maneuvers', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [
					],
				},
			});

			map.addLayer({
				id: 'maneuverLayer',
				type: 'circle',
				source: 'maneuvers',
				layout: {},
				paint: {
					'circle-color': 'green',
				},
			}, 'poi-label');

			getDirections();
			addCollegeMarkers();
		});

	}

	render() {
		return (
			// Populates map by referencing map's container property
			<React.Fragment>
				<div ref={el => (this.mapWrapper = el)} className="mapWrapper" />
				<div class="map-overlay-container">
					<div id="menu">
						<input
							id="streets-v11"
							type="radio"
							name="rtoggle"
							value="streets"
							defaultChecked="checked"
						/>
						<label for="streets-v11">streets</label>
						<input id="light-v10" type="radio" name="rtoggle" value="light" />
						<label for="light-v10">light</label>
						<input id="dark-v10" type="radio" name="rtoggle" value="dark" />
						<label for="dark-v10">dark</label>
						<input id="outdoors-v11" type="radio" name="rtoggle" value="outdoors" />
						<label for="outdoors-v11">outdoors</label>
						<input id="satellite-v9" type="radio" name="rtoggle" value="satellite" />
						<label for="satellite-v9">satellite</label>
					</div>
					<div class="map-overlay">
						<h2 id="overview"></h2>
						<ul id="steps"></ul>
					</div>
				</div>
			</React.Fragment>
		);
	}
}

export default App;
