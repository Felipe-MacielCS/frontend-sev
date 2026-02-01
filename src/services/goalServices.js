import apiClient from "./services.js";

class GoalServices {
  getAll() {
    return apiClient.get("/goals");
  }

  get(id) {
    return apiClient.get(`/goals/${id}`);
  }

  create(data) {
    return apiClient.post("/goals", data);
  }

  update(id, data) {
    return apiClient.put(`/goals/${id}`, data);
  }

  delete(id) {
    return apiClient.delete(`/goals/${id}`);
  }
}

export default new GoalServices();
