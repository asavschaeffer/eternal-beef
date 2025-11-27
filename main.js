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

// State
let isDroppingPin = false;
let tempMarker = null;
let tempLatLng = null;

// DOM Elements
const addPinBtn = document.getElementById('add-pin-btn');
const modalContainer = document.getElementById('modal-container');
const addPinModal = document.getElementById('add-pin-modal');
const authModal = document.getElementById('auth-modal');
const pinForm = document.getElementById('pin-form');
const authBtn = document.getElementById('auth-btn');
const cancelBtns = document.querySelectorAll('.cancel-btn');

// Helper Functions
function openModal(modal) {
    modalContainer.classList.remove('hidden');
    modal.classList.remove('hidden');
}

function closeModal() {
    modalContainer.classList.add('hidden');
    addPinModal.classList.add('hidden');
    authModal.classList.add('hidden');
    // Clean up temp marker if cancelled
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
    isDroppingPin = false;
    map.getContainer().style.cursor = '';
    addPinBtn.textContent = 'Drop a Pin';
    addPinBtn.classList.remove('active');
}

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

// Event Listeners
addPinBtn.addEventListener('click', () => {
    isDroppingPin = !isDroppingPin;
    if (isDroppingPin) {
        addPinBtn.textContent = 'Click on Map to Pin';
        map.getContainer().style.cursor = 'crosshair';
    } else {
        addPinBtn.textContent = 'Drop a Pin';
        map.getContainer().style.cursor = '';
    }
});

authBtn.addEventListener('click', () => {
    openModal(authModal);
});

cancelBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
});

// Map Click Handler
map.on('click', (e) => {
    if (!isDroppingPin) return;

    tempLatLng = e.latlng;

    // Add a temporary marker
    tempMarker = L.marker(tempLatLng).addTo(map);

    // Open Modal
    openModal(addPinModal);
});

// Form Submit Handler
pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('pin-type').value;
    const desc = document.getElementById('pin-desc').value;

    if (supabase) {
        const { error } = await supabase
            .from('pins')
            .insert([
                { lat: tempLatLng.lat, lng: tempLatLng.lng, type: type, description: desc }
            ]);

        if (error) {
            console.error('Error saving pin:', error);
            alert('Failed to save pin. Check console for details.');
            return;
        }
    } else {
        console.log('Mock Save:', { lat: tempLatLng.lat, lng: tempLatLng.lng, type, desc });
    }

    // Keep the marker
    if (tempMarker) {
        tempMarker.bindPopup(`<b>${type.toUpperCase()}</b><br>${desc}`).openPopup();
        tempMarker = null;
    }

    closeModal();
});

// Initial Load
loadPins();

console.log("Eternal Beef Map Initialized");
