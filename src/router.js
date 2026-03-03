import { createRouter, createWebHistory } from "vue-router";

import Login from "./views/Login.vue";
import Signup from "./views/Signup.vue"; 

//import WorkerDashboard from "./views/WorkerDashBoard.vue"; 
import ManagerDashboard from "./views/ManagerDashBoard.vue";
import Tradeboard from "./views/TradeBoard.vue";
import Budget from "./views/Budget.vue";
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
      path: "/manager/tradeboard",
      name: "tradeboard",
      component: Tradeboard,
      meta: { role: "Manager" },
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