import apiClient from "./services.js";

class ResultServices {
  getAll() {
    return apiClient.get("/results");
  }

  get(id) {
    return apiClient.get(`/results/${id}`);
  }

  getByAthlete(athleteId) {
    return apiClient.get(`/results/athlete/${athleteId}`);
  }

  create(data) {
    return apiClient.post("/results", data);
  }

  update(id, data) {
    return apiClient.put(`/results/${id}`, data);
  }

  delete(id) {
    return apiClient.delete(`/results/${id}`);
  }
}

export default new ResultServices();
