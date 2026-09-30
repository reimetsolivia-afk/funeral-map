const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRv0Z4mjw09i8BmoNDAaEwX9oAu8cfZLLazsB_M8zxcbFEH-0vjA0CXeuU461VNADCWLexeJevqy_gY/pub?gid=0&single=true&output=csv";


// Create the map (Put the map inside the HTML element whose ID is map)
const map = L.map("map");


// Add OpenStreetMap tiles (code taken from leaflet website)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


// Read the Google Sheet
fetch(SHEET_URL)
    .then(response => response.text()) // turns it into text
    .then(csv => {

        const rows = parseCSV(csv); // turns it into something Javascript can work with

        // Remove the header row
        const data = rows.slice(1);

        const locations = data.map(row => ({
            latitude: parseFloat(row[0]), // turns csv text into numbers
            longitude: parseFloat(row[1]),
            name: row[2]
        }));

        createMap(locations);

    })
    .catch(error => {
        console.error("Google Sheetsi laadimine ebaõnnestus:", error);
    });


// Simple CSV parser
function parseCSV(csv) {

    return csv
        .trim()
        .split("\n") //splits the csv into rows
        .map(row => {

            return row
                .split(",") //splits the csv from commas into columns
                .map(value => value.trim());
        });
}


// Create markers and route
function createMap(locations) {

    if (locations.length < 2) {
        console.error("Kaardi jaoks on vaja vähemalt kahte asukohta.");
        return;
    }


    // Create markers
    locations.forEach(location => {

        const marker = L.marker([
            location.latitude,
            location.longitude
        ]).addTo(map);

        marker.bindPopup(
            `<strong>${location.name}</strong><br>
             ${location.latitude}, ${location.longitude}`
        );
    });


    // Get first and last locations
    const start = locations[0];
    const end = locations[locations.length - 1];


    // OSRM routing service
    const routeURL =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${start.longitude},${start.latitude};` +
        `${end.longitude},${end.latitude}` +
        `?overview=full&geometries=geojson`;


    fetch(routeURL)
        .then(response => response.json())
        .then(data => {

            if (data.code !== "Ok") {
                console.error("Marsruudi leidmine ebaõnnestus.");
                return;
            }


            const route = data.routes[0]; //takes the first route returned by osrm
            const distance = (route.distance / 1000).toFixed(1); //kaugus (on m, jagatud 1000, et saada km)(üks koht pärast koma)
            const duration = Math.round(route.duration / 60); //kestus (sek - min, rounds to nearest full minute)

            //info kaardi alla (html)
            document.getElementById("route-info").innerHTML = `
                <strong>${distance} km</strong>
                <span>·</span>
                <strong>umbes ${duration} minutit</strong>
            `;


            // Draw the route on the map
            const routeLine = L.geoJSON(route.geometry, { //leaflet kasutab geoJSONit et see kaardile joonistada (route.ggeometry contains the shape of the route))
                style: {
                    color: "#5c5960",
                    weight: 5,
                    opacity: 0.8
                }
            }).addTo(map);


            // Zoom the map to the route
            map.fitBounds(routeLine.getBounds(), {
                padding: [40, 40]
            });


            // Show route information
            console.log(
                `Teekonna pikkus: ${(route.distance / 1000).toFixed(1)} km`
            );

            console.log(
                `Ligikaudne sõiduaeg: ${Math.round(route.duration / 60)} min`
            );

        })
        .catch(error => {
            console.error("Marsruudi laadimine ebaõnnestus:", error);
        });
}


