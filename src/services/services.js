import axios from "axios";
import Utils from "../config/utils.js";
import AuthServices from "./authServices.js";
import Router from "../router.js";

const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const baseurl = configuredBaseUrl || (
  import.meta.env.DEV
    ? "http://localhost:3137/workerscheduling-t7/"
    : "/workerscheduling-t7/"
);

const apiClient = axios.create({
  baseURL: baseurl,
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

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const { response } = error;
    if (
      response &&
      response.status === 401 &&
      response.data?.message?.includes("Unauthorized")
    ) {
      const user = Utils.getStore("user");
      try {
        await AuthServices.logoutUser(user);
      } catch (e) {
        console.error("Logout failed:", e);
      }
      Utils.removeItem("user");
      Router.push({ name: "login" });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
