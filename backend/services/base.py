from backend.models import CVRProblem, TWVRProblem, VRPSolution


class BaseSolver:
    def solveCvrp(self, data: CVRProblem) -> VRPSolution:
        raise NotImplementedError()

    def solveTwvrp(self, data: TWVRProblem) -> VRPSolution:
        raise NotImplementedError()
