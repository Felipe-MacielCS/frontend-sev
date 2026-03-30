import { createRouter, createWebHistory } from "vue-router";

import Login from "./views/Login.vue";
import Signup from "./views/Signup.vue";

import WorkerDashboard from "./views/WorkerDashBoard.vue";
import WorkerClockInOut from "./views/WorkerClockInOut.vue";
import ManagerDashboard from "./views/ManagerDashBoard.vue";
import ManagerTemplates from "./views/ManagerTemplates.vue";
import AvailabilityWorker from "./views/AvailabilityWorker.vue";
import ManagerUsers from "./views/ManagerUsers.vue";
import WorkerTradeBoard from "./views/WorkerTradeBoard.vue";
import Budget from "./views/Budget.vue";
// import AdminDashboard from "./views/AdminDashBoard.vue";

// import WorkerProfile from "./views/WorkerProfile.vue";

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

    // Manager Routes
    {
      path: "/manager",
      name: "managerDashboard",
      component: ManagerDashboard,
      meta: { role: "Manager" },
    },
    {
      path: "/manager/templates",
      name: "managerTemplates",
      component: ManagerTemplates,
      meta: { role: "Manager" },
    },
    {
      path: "/manager/users",
      name: "managerUsers",
      component: ManagerUsers,
      meta: { role: "Manager" },
    },

    // Worker Routes
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
    {
      path: "/worker/tradeboard",
      name: "workerTradeBoard",
      component: WorkerTradeBoard,
      meta: { role: "Worker" },
    },
    {
      path: "/worker/clock",
      name: "workerClockInOut",
      component: WorkerClockInOut,
      meta: { role: "Worker" },
    },
    {
      path: "/manager/budget",
      name: "budget",
      component: Budget,
      meta: { role: "Manager" },
    },

    // --- 404 Catch-all ---
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});

export default router;