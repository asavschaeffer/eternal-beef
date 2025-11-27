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

// Pin Types & Colors
const PIN_TYPES = {
    skate_rn: { label: 'Skating Here RN', color: '#00ff00', hue: 100 }, // Greenish
    park: { label: 'Skate Park', color: '#0000ff', hue: 240 }, // Blue
    street: { label: 'Street Spot', color: '#ff0000', hue: 0 } // Red
};

// Helper: Get Icon with Color
function getIcon(type) {
    const hue = PIN_TYPES[type]?.hue || 0;
    return L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: `hue-rotate-${hue}` // We'll add this class logic in CSS or inline style
    });
}

// Helper: Create Popup Content (Display)
function createPopupContent(pin) {
    const typeLabel = PIN_TYPES[pin.type]?.label || 'Skate Spot';
    const title = pin.title || typeLabel;

    const div = document.createElement('div');
    div.className = 'pin-popup';
    div.innerHTML = `
        <h3>${title}</h3>
        <p>${pin.description || ''}</p>
        <button class="delete-btn" data-id="${pin.id}">Delete Pin</button>
    `;

    // Attach Delete Listener
    div.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm('Delete this pin?')) {
            if (supabase) {
                const { error } = await supabase.from('pins').delete().eq('id', pin.id);
                if (error) console.error('Error deleting:', error);
            }
            map.removeLayer(pin.marker);
        }
    });

    return div;
}

// Helper: Create Form Content (Edit)
function createFormContent(onSubmit) {
    const div = document.createElement('div');
    div.className = 'pin-form-popup';
    div.innerHTML = `
        <h3>New Spot</h3>
        <div class="form-group">
            <label><input type="radio" name="type" value="skate_rn" checked> 🟢 Skating RN</label>
            <label><input type="radio" name="type" value="park"> 🔵 Park</label>
            <label><input type="radio" name="type" value="street"> 🔴 Street</label>
        </div>
        <input type="text" class="title-input" placeholder="Title (e.g. 'Hubba Hideout')" />
        <input type="text" class="desc-input" placeholder="Description (e.g. 'Ledges are waxed')" />
        <div class="actions">
            <button class="save-btn">Save</button>
            <button class="cancel-btn">Cancel</button>
        </div>
    `;

    const saveBtn = div.querySelector('.save-btn');
    const cancelBtn = div.querySelector('.cancel-btn');
    const titleInput = div.querySelector('.title-input');
    const descInput = div.querySelector('.desc-input');
    const radios = div.querySelectorAll('input[name="type"]');

    // Auto-fill title based on type (if empty or matches previous type label)
    let lastAutoTitle = PIN_TYPES['skate_rn'].label;
    titleInput.value = lastAutoTitle;

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newType = e.target.value;
            const newLabel = PIN_TYPES[newType].label;

            // Only update if user hasn't typed a custom title (or if it matches the old auto-title)
            if (titleInput.value === lastAutoTitle || titleInput.value === '') {
                titleInput.value = newLabel;
                lastAutoTitle = newLabel;
            }
        });
    });

    saveBtn.addEventListener('click', () => {
        const type = div.querySelector('input[name="type"]:checked').value;
        const title = titleInput.value;
        const desc = descInput.value;
        onSubmit(type, title, desc);
    });

    cancelBtn.addEventListener('click', () => {
        onSubmit(null, null, null); // Signal cancel
    });

    return div;
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
        const marker = L.marker([pin.lat, pin.lng], { icon: getIcon(pin.type) }).addTo(map);
        pin.marker = marker; // Link marker to data
        marker.bindPopup(createPopupContent(pin));
    });
}

// Map Click Handler - Open Form
map.on('click', (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Create temp marker
    const tempMarker = L.marker([lat, lng], { icon: getIcon('street') }).addTo(map);

    const form = createFormContent(async (type, title, desc) => {
        if (!type) {
            // Cancelled
            map.removeLayer(tempMarker);
            return;
        }

        // Save
        let savedPin = { lat, lng, type, title, description: desc };

        if (supabase) {
            const { data, error } = await supabase
                .from('pins')
                .insert([savedPin])
                .select()
                .single();

            if (error) {
                console.error('Error saving pin:', error);
                alert('Failed to save pin. Did you run the migration to add the "title" column?');
                map.removeLayer(tempMarker);
                return;
            }
            savedPin = data;
        }

        // Update Marker
        tempMarker.setIcon(getIcon(type));
        savedPin.marker = tempMarker;
        tempMarker.bindPopup(createPopupContent(savedPin)).openPopup();
    });

    tempMarker.bindPopup(form).openPopup();
});

// Initial Load
loadPins();

console.log("Eternal Beef Map Initialized");
