<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import Utils from "./config/utils";

import MenuBar from "./components/MenuBar.vue"; 
import NavMenu from "./components/ManagerNavBar.vue"; 

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
      
      <NavMenu v-if="user.role === 'Manager'" />
      
      <MenuBar v-else :user="user" />
      
    </template>
    
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>