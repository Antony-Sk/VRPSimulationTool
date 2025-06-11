"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function toKey(coords) {
    return `${coords.x}, ${coords.y}`;
}
let oldLatLng = { x: 0.0, y: 0.0 };
let selectedMarker = null;
let map = L.map('map').setView([55.7963, 49.1064], 13); // Kazan coordinates
const lines = new Map();
const markers = [];
const depotIndecies = [];
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
const MAGIC_COORDS_TO_M = 90226.82527935731;
document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('vrp-input');
    const solveButton = document.getElementById('solve-vrp-button');
    const addMarkerButton = document.getElementById('add-marker-button');
    const addDepotButton = document.getElementById('add-depot-button');
    const useConfButton = document.getElementById('use-this-graph-button');
    solveButton.addEventListener('click', () => {
        try {
            const jsonContent = inputField.value;
            solveVrp(jsonContent);
        }
        catch (error) {
            console.error('Error processing VRP:', error);
            alert('An error occurred while processing your input. Check console for details.');
        }
    });
    addMarkerButton.addEventListener('click', () => addMarker(map.getCenter(), markers.length));
    addDepotButton.addEventListener('click', () => addMarker(map.getCenter(), markers.length, true));
    useConfButton.addEventListener('click', () => useThisConf());
    drawInit(inputField.value);
});
function zip(arrays) { return arrays[0].map(function (_, i) { return arrays.map(function (array) { return array[i]; }); }); }
function addLine(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const line = L.polyline([[from.x, from.y], [to.x, to.y]]);
        line.addTo(map);
        if (!lines.has(toKey(from)))
            lines.set(toKey(from), []);
        if (!lines.has(toKey(to)))
            lines.set(toKey(to), []);
        lines.get(toKey(from)).push(line);
        lines.get(toKey(to)).push(line);
    });
}
function drawInit(jsonInput) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = JSON.parse(jsonInput);
        let i = 0;
        for (const point of data.vertices) {
            addMarker(new L.LatLng(point.x, point.y), i, data.depot_indices.includes(i));
            i++;
        }
        for (const edge of data.edges) {
            const from = { x: Number(data.vertices[edge.frm].x), y: Number(data.vertices[edge.frm].y) };
            const to = { x: data.vertices[edge.to].x, y: data.vertices[edge.to].y };
            addLine(from, to);
        }
    });
}
function addMarker(coords_1, index_1) {
    return __awaiter(this, arguments, void 0, function* (coords, index, isDepot = false) {
        const circleMarker = L.marker(coords, { draggable: true, icon: createNumberedIcon(index, isDepot) });
        circleMarker.addTo(map);
        circleMarker.addEventListener('move', e => oldLatLng = { x: e.oldLatLng.lat, y: e.oldLatLng.lng });
        circleMarker.addEventListener('dragend', moveLines);
        circleMarker.addEventListener('click', e => {
            if (selectedMarker == null) {
                selectedMarker = circleMarker;
            }
            else if (selectedMarker != circleMarker) {
                const from = { x: selectedMarker.getLatLng().lat, y: selectedMarker.getLatLng().lng };
                const to = { x: circleMarker.getLatLng().lat, y: circleMarker.getLatLng().lng };
                addLine(from, to);
                selectedMarker = null;
            }
        });
        if (isDepot)
            depotIndecies.push(markers.length);
        markers.push(circleMarker);
    });
}
function solveVrp(jsonInput) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const solverForm = document.getElementById('vrp-solver');
            const problemTypeForm = document.getElementById('vrp-type');
            const data = JSON.parse(jsonInput);
            const request = {
                problem: data,
                solver: solverForm.value,
                problem_type: problemTypeForm.value
            };
            const response = yield fetch('http://0.0.0.0:8000/solve-classic-vrp', {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const result = yield response.json();
            alert(`${result.distance}: ${result.visits}`);
        }
        catch (error) {
            console.error('Invalid JSON input:', error);
            alert('Please provide valid JSON input.');
        }
    });
}
function moveLines(e) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const newLatLng = e.target._latlng;
        const newCoord = { x: newLatLng.lat, y: newLatLng.lng };
        for (var line of (_a = lines.get(toKey(oldLatLng))) !== null && _a !== void 0 ? _a : []) {
            const secondPoint = line.getLatLngs().filter(x => x.lat != oldLatLng.x || x.lng != oldLatLng.y)[0];
            if (!lines.has(toKey(newCoord)))
                lines.set(toKey(newCoord), []);
            lines.get(toKey(newCoord)).push(line);
            line.setLatLngs([secondPoint, newLatLng]);
        }
        lines.set(toKey(oldLatLng), []);
    });
}
function useThisConf() {
    return __awaiter(this, void 0, void 0, function* () {
        const inputField = document.getElementById('vrp-input');
        const data = JSON.parse(inputField.value);
        const points = markers.map(m => { return { x: m.getLatLng().lat, y: m.getLatLng().lng }; });
        data.edges = [];
        data.depot_indices = depotIndecies;
        for (const v of lines.values()) {
            for (const line of v) {
                const frmPoint = { x: line.getLatLngs()[0].lat, y: line.getLatLngs()[0].lng };
                const toPoint = { x: line.getLatLngs()[1].lat, y: line.getLatLngs()[1].lng };
                const frm = points.findIndex(p => p.x == frmPoint.x && p.y == frmPoint.y);
                const to = points.findIndex(p => p.x == toPoint.x && p.y == toPoint.y);
                if (!data.edges.some((a) => a.frm == frm && a.to == to))
                    data.edges.push({ frm: frm, to: to, cost: ((frmPoint.x - toPoint.x) ** 2 + (frmPoint.y - toPoint.y) ** 2) ** 0.5 * MAGIC_COORDS_TO_M });
                if (!data.edges.some((a) => a.frm == to && a.to == frm))
                    data.edges.push({ frm: to, to: frm, cost: ((frmPoint.x - toPoint.x) ** 2 + (frmPoint.y - toPoint.y) ** 2) ** 0.5 * MAGIC_COORDS_TO_M });
            }
        }
        data.vertices = points;
        inputField.value = JSON.stringify(data, null, 4);
    });
}
function createNumberedIcon(index, isDepot = false) {
    const color = isDepot ? '#ff3388' : '#3388ff';
    return L.divIcon({
        className: 'numbered-marker-icon',
        html: `<div style="background-color: ${color}; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">${index}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}
