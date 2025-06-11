# VRPSimulationTool

Thesis project

## Supported types of VRP:

1. Capacitated VRP
    
    We have depot and some clients with demands. Vehicles have limited capacity.

2. Time Windowed VRP

    Classical VRP, but clients, depots, and vehicles have openning and closing time constraints and optional demand and capacity constrains.

## Supported tools

1. PyVrp

    PyVRP is an open-source, state-of-the-art vehicle routing problem (VRP) solver
    
    https://github.com/PyVRP/PyVRP

2. Google OrTools

    Widely used universal optimizing tools

    https://developers.google.com/optimization/introduction

3. TODO

## Examples

1. https://github.com/i-sunny/cvrp_aco_ocl/tree/master/dataset/X
2. http://dimacs.rutgers.edu/programs/challenge/vrp/vrptw/ TODO

## Used stack

1. python3.12
    * uvicorn
    * fastapi
    * pyvpr
2. typescript
    * Leaflet for OSM drawing
    * Chart.js for graph plotting

## Build & run
```bash
./local_launch.sh
```

Or do it manually

```bash
npm install --save-dev typescript @types/leaflet
# Compile TS
tsc -p frontend
# And server
./.venv/bin/pip3.12 install pyvrp fastapi uvicorn
./.venv/bin/python3.12 backend/main.py
```

2025 Innopolis University