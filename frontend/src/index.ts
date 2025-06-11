interface Coords {
  x: number
  y: number
}
function toKey(coords: Coords): string {
  return `${coords.x}, ${coords.y}`
}
let oldLatLng = { x: 0.0, y: 0.0 } as Coords;
let selectedMarker: null | L.Marker<any> = null;
let map = L.map('map').setView([55.7963, 49.1064], 13); // Kazan coordinates
const lines = new Map<string, L.Polyline[]>();
const markers: L.Marker<any>[] = [];
const depotIndecies: number[] = []
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
const MAGIC_COORDS_TO_M = 90226.82527935731

document.addEventListener('DOMContentLoaded', () => {
  const inputField = document.getElementById('vrp-input') as HTMLTextAreaElement;
  const solveButton = document.getElementById('solve-vrp-button') as HTMLButtonElement;
  const addMarkerButton = document.getElementById('add-marker-button') as HTMLButtonElement;
  const addDepotButton = document.getElementById('add-depot-button') as HTMLButtonElement;
  const useConfButton = document.getElementById('use-this-graph-button') as HTMLButtonElement;

  solveButton.addEventListener('click', () => {
    try {
      const jsonContent = inputField.value;
      solveVrp(jsonContent);
    } catch (error) {
      console.error('Error processing VRP:', error);
      alert('An error occurred while processing your input. Check console for details.');
    }
  });
  addMarkerButton.addEventListener('click', () => addMarker(map.getCenter(), markers.length));
  addDepotButton.addEventListener('click', () => addMarker(map.getCenter(), markers.length, true));
  useConfButton.addEventListener('click', () => useThisConf());
  drawInit(inputField.value);
});
function zip(arrays: any) { return arrays[0].map(function (_: any, i: any) { return arrays.map(function (array: any) { return array[i] }) }); }

async function addLine(from: Coords, to: Coords) {
  const line = L.polyline([[from.x, from.y], [to.x, to.y]])
  line.addTo(map)
  if (!lines.has(toKey(from))) lines.set(toKey(from), [])
  if (!lines.has(toKey(to))) lines.set(toKey(to), [])
  lines.get(toKey(from))!.push(line);
  lines.get(toKey(to))!.push(line);
}

async function drawInit(jsonInput: string) {
  const data = JSON.parse(jsonInput);
  let i = 0;
  for (const point of data.vertices) {
    addMarker(new L.LatLng(point.x as number, point.y as number), i, data.depot_indices.includes(i));
    i++;
  }

  for (const edge of data.edges) {
    const from = { x: Number(data.vertices[edge.frm].x), y: Number(data.vertices[edge.frm].y) } as Coords
    const to = { x: data.vertices[edge.to].x, y: data.vertices[edge.to].y } as Coords
    addLine(from, to)
  }
}

async function addMarker(coords: L.LatLng, index: number, isDepot: boolean = false) {
  const circleMarker = L.marker(coords, { draggable: true, icon: createNumberedIcon(index, isDepot) });
  circleMarker.addTo(map);
  circleMarker.addEventListener('move', e => oldLatLng = { x: (e as any).oldLatLng.lat, y: (e as any).oldLatLng.lng } as Coords);
  circleMarker.addEventListener('dragend', moveLines);
  circleMarker.addEventListener('click', e => {
    if (selectedMarker == null) {
      selectedMarker = circleMarker;
    } else if (selectedMarker != circleMarker) {
      const from = { x: selectedMarker.getLatLng().lat, y: selectedMarker.getLatLng().lng } as Coords
      const to = { x: circleMarker.getLatLng().lat, y: circleMarker.getLatLng().lng } as Coords
      addLine(from, to)
      selectedMarker = null;
    }
  });
  if (isDepot)
    depotIndecies.push(markers.length);
  markers.push(circleMarker);

}

async function solveVrp(jsonInput: string) {
  try {
    const solverForm = document.getElementById('vrp-solver') as HTMLSelectElement;
    const problemTypeForm = document.getElementById('vrp-type') as HTMLSelectElement;

    const data = JSON.parse(jsonInput);
    const request = {
      problem: data,
      solver: solverForm.value,
      problem_type: problemTypeForm.value
    }

    const response = await fetch('http://0.0.0.0:8000/solve-classic-vrp', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();
    alert(`${result.distance}: ${result.visits}`)
  } catch (error) {
    console.error('Invalid JSON input:', error);
    alert('Please provide valid JSON input.');
  }
}

async function moveLines(e: L.LeafletEvent) {
  const newLatLng = (e as L.DragEndEvent).target._latlng
  const newCoord = { x: newLatLng.lat, y: newLatLng.lng } as Coords
  for (var line of lines.get(toKey(oldLatLng)) ?? []) {
    const secondPoint = line.getLatLngs().filter(x => (x as L.LatLng).lat != oldLatLng.x || (x as L.LatLng).lng != oldLatLng.y)[0]
    if (!lines.has(toKey(newCoord)))
      lines.set(toKey(newCoord), []);
    lines.get(toKey(newCoord))!.push(line);
    line.setLatLngs([secondPoint, newLatLng]);
  }
  lines.set(toKey(oldLatLng), [])
}

async function useThisConf() {
  const inputField = document.getElementById('vrp-input') as HTMLTextAreaElement;
  const data = JSON.parse(inputField.value);
  const points = markers.map(m => { return { x: m.getLatLng().lat, y: m.getLatLng().lng } });
  data.edges = [];
  data.depot_indices = depotIndecies;
  for (const v of lines.values()) {
    for (const line of v) {
      const frmPoint = { x: (line.getLatLngs()[0] as L.LatLng).lat, y: (line.getLatLngs()[0] as L.LatLng).lng };
      const toPoint = { x: (line.getLatLngs()[1] as L.LatLng).lat, y: (line.getLatLngs()[1] as L.LatLng).lng };
      const frm = points.findIndex(p => p.x == frmPoint.x && p.y == frmPoint.y);
      const to = points.findIndex(p => p.x == toPoint.x && p.y == toPoint.y);
      if (!data.edges.some((a: any) => a.frm == frm && a.to == to))
        data.edges.push({ frm: frm, to: to, cost: ((frmPoint.x - toPoint.x) ** 2 + (frmPoint.y - toPoint.y) ** 2) ** 0.5 * MAGIC_COORDS_TO_M });
      if (!data.edges.some((a: any) => a.frm == to && a.to == frm))
        data.edges.push({ frm: to, to: frm, cost: ((frmPoint.x - toPoint.x) ** 2 + (frmPoint.y - toPoint.y) ** 2) ** 0.5 * MAGIC_COORDS_TO_M });
    }
  }

  data.vertices = points;
  inputField.value = JSON.stringify(data, null, 4)
}

function createNumberedIcon(index: number, isDepot: boolean = false): L.DivIcon {
  const color = isDepot ? '#ff3388' : '#3388ff'
  return L.divIcon({
    className: 'numbered-marker-icon',
    html: `<div style="background-color: ${color}; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">${index}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}
