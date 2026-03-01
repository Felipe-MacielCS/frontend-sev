import { createRouter, createWebHistory } from "vue-router";

import Login from "./views/Login.vue";
import Signup from "./views/Signup.vue"; 

import WorkerDashboard from "./views/WorkerDashBoard.vue"; 
import ManagerDashboard from "./views/ManagerDashBoard.vue";
import AvailabilityWorker from "./views/AvailabilityWorker.vue";
//import AdminDashboard from "./views/AdminDashBoard.vue";

//import WorkerProfile from "./views/WorkerProfile.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/signup",
      name: "signup",
      component: Signup,
    },

    // --- Manager Routes ---
    {
      path: "/manager",
      name: "managerDashboard",
      component: ManagerDashboard,
      meta: { role: "Manager" },
    },

    {
      path: "/worker",
      name: "workerDashboard",
      component: WorkerDashboard,
      meta: { role: "Worker" },
    },

    
    {
      path: "/worker/availability",
      name: "workerAvailability",
      component: AvailabilityWorker,
      meta: { role: "Worker" },
    },

    // --- 404 Catch-all ---
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});

export default router;