from os import listdir
from pyvrp import Depot, Profile, read, read_solution
import numpy as np
from backend.models import CVRProblem, Edge, VehiclesType, Coordinates


class FetchExamplesService:
    def get_names(self):
        names = list(filter(lambda x: x.endswith(
            '.vrp'), listdir("backend/examples")))
        return names

    def get_example_by_name(self, file_path: str) -> CVRProblem:
        data = read(f'backend/examples/{file_path}', round_func="round")
        with open(f'backend/examples/{file_path[:-3]}sol') as f:
            sol = int(f.read().split('\n')[0])

        vehicles = [VehiclesType(
            capacity=vt.capacity[0], number=vt.num_available) for vt in data.vehicle_types()]

        vertices = []
        demands = []
        for idx in range(data.num_locations):
            loc = data.location(idx)
            vertices.append(Coordinates(x=loc.x, y=loc.y))
            if type(loc) == Depot:
                demands.append(0)
            else:
                demands.append(loc.delivery[0])

        edges = []
        for i in range(data.num_locations):
            for j in range(data.num_locations):
                if i != j:
                    cost = round(((data.location(i).x - data.location(j).x) **
                                 2 + (data.location(i).y - data.location(j).y) ** 2) ** 0.5)
                    edges.append(Edge(frm=i, to=j, cost=cost))

        depot_indices = list(range(len(data.depots())))
        print(sol)
        return CVRProblem(
            vehicles=vehicles,
            vertices=vertices,
            demands=demands,
            edges=edges,
            depot_indices=depot_indices,
            best_sol=sol,
        )
