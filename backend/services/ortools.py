from backend.models import CVRProblem, TWVRProblem, VRPSolution
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from backend.services.base import BaseSolver

COST_MULTIPLIER = 100


class OrToolsService(BaseSolver):
    def create_data_model(self, problem: CVRProblem | TWVRProblem):
        """Stores the data for the problem."""
        data = {}
        if problem.demands != None:
            data["demands"] = problem.demands

        if type(problem) == CVRProblem:
            unit = "distance_matrix"
            points_num = len(problem.demands)
        else:
            unit = "time_matrix"
            points_num = len(problem.time_windows)
            data["time_windows"] = problem.time_windows
        data[unit] = [
            [9999999999 for _ in range(points_num)] for _ in range(points_num)]
        for i in range(points_num):
            data[unit][i][i] = 0
        for edge in problem.edges:
            data[unit][edge.frm][edge.to] = edge.cost * COST_MULTIPLIER

        data["vehicle_capacities"] = []
        data["num_vehicles"] = 0
        for vt in problem.vehicles:
            for i in range(vt.number):
                data["vehicle_capacities"].append(vt.capacity)
            data["num_vehicles"] += vt.number
        data["depot"] = problem.depot_indices[0]
        return data

    def print_cvrp_solution(self, data, manager, routing, solution) -> tuple[int, list[list[int]]]:
        """Prints solution on console."""
        print(f"Objective: {solution.ObjectiveValue()}")
        total_distance = 0
        total_load = 0
        visits = []
        for vehicle_id in range(data["num_vehicles"]):
            if not routing.IsVehicleUsed(solution, vehicle_id):
                continue
            index = routing.Start(vehicle_id)
            plan_output = f"Route for vehicle {vehicle_id}:\n"
            route_distance = 0
            route_load = 0
            previous_index = -1
            visits.append([])
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                visits[-1].append(node_index)
                route_load += data["demands"][node_index]
                plan_output += f" {node_index} Load({route_load}) -> "
                index = solution.Value(routing.NextVar(index))
                if previous_index != -1:
                    route_distance += routing.GetArcCostForVehicle(
                        previous_index, index, vehicle_id
                    )
                previous_index = node_index
            visits[-1].pop(0)
            node_index = manager.IndexToNode(index)
            route_distance += routing.GetArcCostForVehicle(
                previous_index, index, vehicle_id
            )
            plan_output += f" {node_index} Load({route_load})\n"
            plan_output += f"Distance of the route: {route_distance / COST_MULTIPLIER}m\n"
            plan_output += f"Load of the route: {route_load}\n"
            print(plan_output)
            total_distance += route_distance
            total_load += route_load
        total_distance /= COST_MULTIPLIER
        print(
            f"Total distance of all routes: {total_distance}m")
        print(f"Total load of all routes: {total_load}")
        return (total_distance, visits)

    def solveCvrp(self, problem: CVRProblem) -> VRPSolution:
        """Solve the CVRP problem."""
        # Instantiate the data problem.
        data = self.create_data_model(problem)

        # Create the routing index manager.
        manager = pywrapcp.RoutingIndexManager(
            len(data["distance_matrix"]), data["num_vehicles"], data["depot"]
        )

        # Create Routing Model.
        routing = pywrapcp.RoutingModel(manager)

        # Create and register a transit callback.
        def distance_callback(from_index, to_index):
            """Returns the distance between the two nodes."""
            # Convert from routing variable Index to distance matrix NodeIndex.
            # print(f'{from_index} {to_index}')
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            # print(f'dis {from_node} {to_node} {data["distance_matrix"][from_node][to_node]}')
            return round(data["distance_matrix"][from_node][to_node])

        transit_callback_index = routing.RegisterTransitCallback(
            distance_callback)

        # Define cost of each arc.
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add Capacity constraint.
        def demand_callback(from_index):
            """Returns the demand of the node."""
            # Convert from routing variable Index to demands NodeIndex.
            from_node = manager.IndexToNode(from_index)
            # print(f'dem {from_node} {data["demands"][from_node]}')
            return data["demands"][from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(
            demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            data["vehicle_capacities"],  # vehicle maximum capacities
            True,  # start cumul to zero
            "Capacity",
        )

        # Setting first solution heuristic.
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.AUTOMATIC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.FromSeconds(10)

        # Solve the problem.
        solution = routing.SolveWithParameters(search_parameters)

        # Print solution on console.
        if solution:
            (distance, visits) = self.print_cvrp_solution(
                data, manager, routing, solution)
        else:
            print('No solution')
            (distance, visits) = (-1, [])
        return VRPSolution(visits=visits, distance=distance)

    def solveTwvrp(self, problem: TWVRProblem):
        # Instantiate the data problem.
        data = self.create_data_model(problem)
        # Create the routing index manager.
        manager = pywrapcp.RoutingIndexManager(
            len(data["time_matrix"]), data["num_vehicles"], data["depot"]
        )
        # Create Routing Model.
        routing = pywrapcp.RoutingModel(manager)

        def time_callback(from_index, to_index):
            from_index = manager.NodeToIndex(location_idx)
            to_index = manager.NodeToIndex(location_idx)
            return data["time_matrix"][from_index][to_index]

        transit_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        time = "Time"
        routing.AddDimension(
            transit_callback_index,
            30,  # allow waiting time
            300000,  # maximum time per vehicle
            False,  # Don't force start cumul to zero.
            time,
        )
        time_dimension = routing.GetDimensionOrDie(time)
        # Add time window constraints for each location except depot.
        for location_idx, time_window in enumerate(data["time_windows"]):
            if location_idx == data["depot"]:
                continue
            index = manager.NodeToIndex(location_idx)
            time_dimension.CumulVar(index).SetRange(
                time_window[0], time_window[1])
        # Add time window constraints for each vehicle start node.
        depot_idx = data["depot"]
        for vehicle_id in range(data["num_vehicles"]):
            index = routing.Start(vehicle_id)
            time_dimension.CumulVar(index).SetRange(
                data["time_windows"][depot_idx][0], data["time_windows"][depot_idx][1]
            )
        for i in range(data["num_vehicles"]):
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.Start(i))
            )
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.End(i)))

        # Setting first solution heuristic.
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )

        # Solve the problem.
        solution = routing.SolveWithParameters(search_parameters)

        # Print solution on console.
        if solution:
            (visits, distance) = self.print_twvrp_solution(data, manager, routing, solution)
        else:
            (visits, distance) = ([], 0)
        return VRPSolution(visits=visits, distance=distance)

    def print_twvrp_solution(self, data, manager, routing, solution):
        """Prints solution on console."""
        print(f"Objective: {solution.ObjectiveValue()}")
        time_dimension = routing.GetDimensionOrDie("Time")
        total_time = 0
        visits = []
        for vehicle_id in range(data["num_vehicles"]):
            if not routing.IsVehicleUsed(solution, vehicle_id):
                continue
            visits.append([])
            index = routing.Start(vehicle_id)
            plan_output = f"Route for vehicle {vehicle_id}:\n"
            prev_index = -1
            while not routing.IsEnd(index):
                time_var = time_dimension.CumulVar(index)
                plan_output += (
                    f"{manager.IndexToNode(index)}"
                    f" Time({solution.Min(time_var)},{solution.Max(time_var)})"
                    " -> "
                )
                if prev_index != -1:
                    total_time += data["time_matrix"][manager.IndexToNode(prev_index)][manager.IndexToNode(index)]
                prev_index = index
                visits[-1].append(manager.IndexToNode(index))
                index = solution.Value(routing.NextVar(index))
            time_var = time_dimension.CumulVar(index)
            total_time += data["time_matrix"][manager.IndexToNode(prev_index)][manager.IndexToNode(index)]
            visits[-1].append(manager.IndexToNode(index))

            plan_output += (
                f"{manager.IndexToNode(index)}"
                f" Time({solution.Min(time_var)},{solution.Max(time_var)})\n"
            )
            plan_output += f"Time of the route: {solution.Min(time_var)}min\n"
            print(plan_output)
            # total_time += solution.Min(time_var)
        total_time /= COST_MULTIPLIER
        print(f"Total time of all routes: {total_time}min")
        return (visits, total_time)
