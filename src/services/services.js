import axios from "axios";
import Utils from "../config/utils.js";
import AuthServices from "./authServices.js";
import Router from "../router.js";

const baseURL = import.meta.env.DEV
  ? "http://localhost:3137/workerscheduling-t7/"
  : "/workerscheduling-t7/";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const user = Utils.getStore("user");
    const token = user?.token;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const response = error?.response;

    if (response?.status === 401) {
      // try to logout server-side, but don't crash if it fails
      try {
        const user = Utils.getStore("user");
        await AuthServices.logoutUser(user);
      } catch (_) {}

      Utils.removeItem("user");
      Router.push({ name: "login" });
    }

    return Promise.reject(error);
  }
);

export default apiClient;