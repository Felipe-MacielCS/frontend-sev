<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import Utils from "./config/utils";

import ManagerNavBar from "./components/ManagerNavBar.vue"; 
import WorkerNavBar from "./components/WorkerNavBar.vue"; 

const user = ref(Utils.getStore("user"));
const route = useRoute();

window.addEventListener("storage", () => {
  user.value = Utils.getStore("user");
});

window.updateUserState = () => {
  user.value = Utils.getStore("user");
};

const showNav = computed(() => {
  return route.path !== "/" && route.path !== "/login" && route.path !== "/signup"; 
});
</script>

<template>
  <v-app>
    <template v-if="showNav && user">
      
      <ManagerNavBar v-if="user.role === 'Manager'" />
      
      <WorkerNavBar v-else-if="user.role === 'Worker'" :user="user" />

      </template>
    
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>