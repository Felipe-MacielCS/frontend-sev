// src/services/planAssignmentServices.js
import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/planassignments", { params });
  },
  create(data) {
    return apiClient.post("/planassignments", data);
  },
  delete(planID, athleteID) {
    return apiClient.delete(`/planassignments/${planID}/${athleteID}`);
  },
};
