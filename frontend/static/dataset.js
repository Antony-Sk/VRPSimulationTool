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
let vrpChart = null;
let currentProblem = null;
let currentSolution = null;
let resultsHistory = [];
function loadVRP() {
    return __awaiter(this, void 0, void 0, function* () {
        const fileSelect = document.getElementById('vrp-file');
        const selectedFile = fileSelect.value;
        try {
            const response = yield fetch(`/api/vrp/${selectedFile}`);
            if (!response.ok)
                throw new Error('Network response was not ok');
            currentProblem = (yield response.json());
            renderProblem(currentProblem);
        }
        catch (error) {
            console.error('Error loading VRP data:', error);
            alert('Failed to load VRP data');
        }
    });
}
function solveVRP() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!currentProblem) {
            alert('Please load a problem first');
            return;
        }
        const solverSelect = document.getElementById('vrp-solver');
        const problemTypeSelect = document.getElementById('problem-type');
        const fileSelect = document.getElementById('vrp-file');
        const request = {
            solver: solverSelect.value,
            problem_type: problemTypeSelect.value,
            problem: currentProblem
        };
        try {
            const response = yield fetch('http://0.0.0.0:8000/solve-classic-vrp', {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok)
                throw new Error('Network response was not ok');
            currentSolution = (yield response.json());
            updateStats(currentSolution.distance.toFixed(2), currentSolution.visits.length);
            addResultToHistory(solverSelect.options[solverSelect.selectedIndex].text, fileSelect.options[fileSelect.selectedIndex].text, currentSolution.distance.toFixed(2), currentSolution.visits.length, problemTypeSelect.options[problemTypeSelect.selectedIndex].text, currentProblem.best_sol);
            if (currentProblem) {
                renderSolution(currentProblem, currentSolution);
            }
        }
        catch (error) {
            console.error('Error solving VRP:', error);
            alert('Failed to solve VRP');
        }
    });
}
function updateStats(distance, routes) {
    const distanceElement = document.getElementById('solution-distance');
    const routesElement = document.getElementById('num-routes');
    if (distanceElement)
        distanceElement.textContent = distance;
    if (routesElement)
        routesElement.textContent = routes.toString();
}
function addResultToHistory(solver, problem, distance, routes, type, best_sol) {
    resultsHistory.unshift({
        solver,
        problem,
        distance,
        routes,
        type,
        timestamp: new Date().toLocaleTimeString(),
        best_sol,
    });
    updateResultsTable();
}
function updateResultsTable() {
    const tableBody = document.querySelector('#results-table tbody');
    if (!tableBody)
        return;
    tableBody.innerHTML = '';
    resultsHistory.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
                <td>${result.solver}</td>
                <td>${result.problem}</td>
                <td>${result.distance}</td>
                <td>${result.routes}</td>
                <td>${result.type}</td>
                <td>${result.type}</td>
                <td>${result.best_sol}</td>
            `;
        tableBody.appendChild(row);
    });
}
function renderProblem(problem) {
    const points = problem.vertices.map((vertex, idx) => ({
        x: vertex.x,
        y: vertex.y,
        idx: idx,
        demand: problem.demands[idx]
    }));
    const depotPoints = problem.depot_indices.map(idx => ({
        x: problem.vertices[idx].x,
        y: problem.vertices[idx].y,
        idx: idx
    }));
    const ctx = document.getElementById('vrpChart').getContext('2d');
    if (!ctx)
        return;
    if (vrpChart) {
        vrpChart.data.datasets = [
            {
                label: 'Customers',
                data: points,
                pointBackgroundColor: 'blue',
                pointRadius: 5
            },
            {
                label: 'Depots',
                data: depotPoints,
                pointBackgroundColor: 'red',
                pointRadius: 8
            }
        ];
        vrpChart.update();
    }
    else {
        vrpChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Customers',
                        data: points,
                        pointBackgroundColor: 'blue',
                        pointRadius: 5
                    },
                    {
                        label: 'Depots',
                        data: depotPoints,
                        pointBackgroundColor: 'red',
                        pointRadius: 8
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'X Coordinate'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Y Coordinate'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const point = context.raw;
                                if (point.demand !== undefined) {
                                    return `Customer ${point.idx}: (${point.x}, ${point.y}) - Demand: ${point.demand}`;
                                }
                                return `Depot: (${point.x}, ${point.y})`;
                            }
                        }
                    }
                }
            }
        });
    }
    updateStats('-', 0);
}
function renderSolution(problem, solution) {
    if (!vrpChart)
        return;
    const routeColors = [
        '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A8',
        '#33FFF3', '#FFC733', '#8C33FF', '#33FFBD', '#FF3361'
    ];
    vrpChart.data.datasets = vrpChart.data.datasets.slice(0, 2);
    solution.visits.forEach((route, routeIdx) => {
        if (route.length < 2)
            return;
        const routePoints = [];
        const color = routeColors[routeIdx % routeColors.length];
        for (let i = 0; i < route.length; i++) {
            const vertexIdx = route[i];
            const vertex = problem.vertices[vertexIdx];
            routePoints.push({
                x: vertex.x,
                y: vertex.y
            });
        }
        vrpChart === null || vrpChart === void 0 ? void 0 : vrpChart.data.datasets.push({
            label: `Route ${routeIdx + 1}`,
            data: routePoints,
            borderColor: color,
            backgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
            showLine: true,
            fill: false,
            borderWidth: 2
        });
    });
    vrpChart.update();
}
function fetchAvailableExamples() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/examples');
            if (!response.ok)
                throw new Error('Failed to fetch examples');
            const examples = yield response.json();
            console.log(examples);
            populateExampleDropdown(examples);
        }
        catch (error) {
            console.error('Error fetching examples:', error);
            alert('Failed to load available VRP examples');
        }
    });
}
function populateExampleDropdown(examples) {
    const dropdown = document.getElementById('vrp-file');
    if (!dropdown)
        return;
    // Clear existing options
    dropdown.innerHTML = '';
    // Add new options
    examples.forEach(example => {
        const option = document.createElement('option');
        option.value = example;
        option.textContent = example;
        dropdown.appendChild(option);
    });
    // Load the first example by default
    if (examples.length > 0) {
        loadVRP();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    fetchAvailableExamples();
});
