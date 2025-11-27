import './style.css'
import L from 'leaflet'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('Supabase not configured. Pins will not be saved.');
}

// Initialize Map
const map = L.map('map', {
    zoomControl: false // We'll add custom controls or position them better
}).setView([37.7749, -122.4194], 13); // SF Coordinates

// Dark Matter Tile Layer (CartoDB)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Add Zoom Control to bottom right
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

async function loadPins() {
    if (!supabase) return;

    const { data, error } = await supabase
        .from('pins')
        .select('*');

    if (error) {
        console.error('Error loading pins:', error);
        return;
    }

    data.forEach(pin => {
        L.marker([pin.lat, pin.lng])
            .addTo(map)
            .bindPopup(`<b>${pin.type.toUpperCase()}</b><br>${pin.description}`);
    });
}

// Map Click Handler - Direct Drop
map.on('click', async (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Add marker immediately
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup("<b>SKATE SPOT</b><br>New spot dropped!").openPopup();

    if (supabase) {
        const { error } = await supabase
            .from('pins')
            .insert([
                { lat: lat, lng: lng, type: 'skate', description: 'Skate Spot' }
            ]);

        if (error) {
            console.error('Error saving pin:', error);
            // Optionally remove marker if save fails
            // map.removeLayer(marker);
        }
    } else {
        console.log('Mock Save:', { lat, lng });
    }
});

// Initial Load
loadPins();

console.log("Eternal Beef Map Initialized");
