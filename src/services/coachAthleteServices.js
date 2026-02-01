import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/coachathletes");
  },

  getByCoach(coachID) {
    return apiClient.get(`/coachathletes?coachID=${coachID}`);
  },

  create(data) {
    return apiClient.post("/coachathletes", data);
  },

  delete(coachID, athleteID) {
    return apiClient.delete(`/coachathletes/${coachID}/${athleteID}`);
  },
};
