import { createRouter, createWebHistory } from "vue-router";

import Login from "./views/Login.vue";
import Signup from "./views/Signup.vue";

import AthleteDashboard from "./views/AthleteDashBoard.vue";
import CoachDashboard from "./views/CoachDashBoard.vue";
import AdminDashboard from "./views/AdminDashBoard.vue";
import AdminAthletes from "./views/AdminAthletes.vue";
import AdminCoaches from "./views/AdminCoaches.vue";
import AdminExercisePlans from "./views/AdminExercisePlans.vue";
import AdminExercises from "./views/AdminExercises.vue";
import CoachAthletes from "./views/CoachAthletes.vue";
import CoachExercisePlans from "./views/CoachExercisePlans.vue";
import CoachExercises from "./views/CoachExercises.vue";
import AthleteExercisePlans from "./views/AthleteExercisePlans.vue";
import AthleteGoals from "./views/AthleteGoals.vue";
import AthleteResults from "./views/AthleteResults.vue";
import AthleteProfile from "./views/AthleteProfile.vue";
import CoachGoals from "./views/CoachGoals.vue";
import AthleteGoalProgress from "./views/AthleteGoalProgress.vue";

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

    // Dashboards
    {
      path: "/athlete",
      name: "athlete",
      component: AthleteDashboard,
      meta: { role: "athlete" },
    },
    {
      path: "/coach",
      name: "coach",
      component: CoachDashboard,
      meta: { role: "coach" },
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminDashboard,
      meta: { role: "admin" },
    },

    // Admin
    {
      path: "/admin/athletes",
      name: "adminAthletes",
      component: AdminAthletes,
    },
    {
      path: "/admin/coaches",
      name: "adminCoaches",
      component: AdminCoaches,
    },
    {
      path: "/admin/exercises",
      name: "adminExercises",
      component: AdminExercises,
    },
    {
      path: "/admin/exerciseplans",
      name: "adminExercisePlans",
      component: AdminExercisePlans,
    },

    // Coach
    {
      path: "/coach/athletes",
      name: "coachAthletes",
      component: CoachAthletes,
      meta: { role: "coach" },
    },
    {
      path: "/coach/exerciseplans",
      name: "coachExercisePlans",
      component: CoachExercisePlans,
      meta: { role: "coach" },
    },
    {
      path: "/coach/exercises",
      name: "coachExercises",
      component: CoachExercises,
      meta: { role: "coach" },
    },
    {
      path: "/coach/goals/:athleteId",
      name: "coachGoals",
      component: CoachGoals,
      meta: { role: "coach" },
    },
    {
      path: "/coach/goals/:athleteId/goal/:goalId/progress",
      name: "coachGoalProgress",
      component: AthleteGoalProgress,
      meta: { role: "coach" },
    },

    // Athlete
    {
      path: "/athlete/exerciseplans",
      name: "athleteExercisePlans",
      component: AthleteExercisePlans,
      meta: { role: "athlete" },
    },
    {
      path: "/athlete/goals",
      name: "athleteGoals",
      component: AthleteGoals,
      meta: { role: "athlete" },
    },
    {
      path: "/athlete/goals/:goalId/progress",
      name: "athleteGoalProgress",
      component: AthleteGoalProgress,
      meta: { role: "athlete" },
    },
    {
      path: "/athlete/results",
      name: "athleteResults",
      component: AthleteResults,
      meta: { role: "athlete" },
    },
    {
      path: "/athlete/profile",
      name: "athleteProfile",
      component: AthleteProfile,
      meta: { role: "athlete" },
    },

    // 404 catch-all
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});

export default router;
