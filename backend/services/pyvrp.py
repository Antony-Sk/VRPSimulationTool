from pyvrp import Model
from pyvrp.stop import MaxRuntime
from pyvrp.Result import Result

from backend.models import CVRProblem, TWVRProblem, VRPSolution
from backend.services.base import BaseSolver

COST_MULTIPLIER = 100


class PyvrpService(BaseSolver):
    def print_solution(self, res: Result, edges: list[list[int]]):
        visits = [x.visits() for x in res.best.routes()]
        print(f'{visits}: {res.cost() / COST_MULTIPLIER}')
        p = 0
        for visit in visits:
            for v in [*visit, 0]:
                print(f'{p} -> {v}: {edges[p][v] / COST_MULTIPLIER}')
                p = v

    def solveCvrp(self, problem: CVRProblem) -> VRPSolution:
        m = Model()
        for vec in problem.vehicles:
            m.add_vehicle_type(vec.number, capacity=vec.capacity)

        for depot in problem.depot_indices:
            m.add_depot(x=problem.vertices[depot].x,
                        y=problem.vertices[depot].y)
        for (i, demand) in enumerate(problem.demands):
            if not i in problem.depot_indices:
                m.add_client(
                    x=problem.vertices[i].x, y=problem.vertices[i].y, delivery=demand)
        points_num = len(problem.demands)
        edges = [[9999999999 for _ in range(points_num)]
                 for _ in range(points_num)]
        for i in range(points_num):
            edges[i][i] = 0

        for edge in problem.edges:
            edges[edge.frm][edge.to] = edge.cost * COST_MULTIPLIER
        for i in range(points_num):
            for j in range(points_num):
                m.add_edge(m.locations[i], m.locations[j], edges[i][j])

        res = m.solve(stop=MaxRuntime(1), display=True)
        visits = [x.visits() for x in res.best.routes()]
        self.print_solution(res, edges)
        return VRPSolution(visits=visits, distance=res.cost() / COST_MULTIPLIER)

    def solveTwvrp(self, data: TWVRProblem):
        m = Model()
        for vt in data.vehicles:
            m.add_vehicle_type(
                vt.number,
                max_duration=vt.capacity,
                tw_early=data.time_windows[data.depot_indices[0]][0],
                tw_late=data.time_windows[data.depot_indices[0]][1],
            )
        if data.demands != None:
            for (i, demand) in enumerate(data.demands):
                if not i in data.depot_indices:
                    m.add_client(
                        x=data.vertices[i].x, y=data.vertices[i].y, delivery=demand)
        
        for d in data.depot_indices:
            m.add_depot(
                x=data.vertices[d].x,
                y=data.vertices[d].y,
                tw_early=data.time_windows[d][0],
                tw_late=data.time_windows[d][1],
            )
        for (i, v) in enumerate(data.vertices):
            if i not in data.depot_indices:
                m.add_client(
                    x=v.x,
                    y=v.y,
                    tw_early=data.time_windows[i][0], 
                    tw_late=data.time_windows[i][1],
                )

        points_num = len(data.time_windows)
        edges = [[9999999999 for _ in range(points_num)]
                 for _ in range(points_num)]
        for i in range(points_num):
            edges[i][i] = 0

        for edge in data.edges:
            edges[edge.frm][edge.to] = edge.cost * COST_MULTIPLIER
        for i in range(points_num):
            for j in range(points_num):
                m.add_edge(m.locations[i], m.locations[j], edges[i][j])

        res = m.solve(stop=MaxRuntime(1), display=False)  # one second
        print(res)
        visits = [x.visits() for x in res.best.routes()]
        return VRPSolution(visits=visits, distance=res.cost() / COST_MULTIPLIER)
