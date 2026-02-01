<script setup>
import { ref, computed, onMounted } from "vue";
import {useRoute} from "vue-router";
import Utils from "./config/utils";


import AdminNavBar from "./components/AdminNavBar.vue";
import CoachNavBar from "./components/CoachNavBar.vue";
import MenuBar from "./components/MenuBar.vue";
import AthleteNavBar from "./components/AthleteNavBar.vue";

const user = ref(Utils.getStore("user"));
const route = useRoute();

window.addEventListener("storage", () => {
  user.value = Utils.getStore("user");
});

window.updateUserState = () => {
  user.value = Utils.getStore("user");
};


const showAdminNavBar = computed(() =>
  route.path.startsWith("/admin")
);

const showCoachNavBar = computed(() =>
  route.path.startsWith("/coach")
);

const showAthleteNavBar = computed(() =>
  route.path.startsWith("/athlete")
);

const showMenuBar = computed(() =>
  !route.path.startsWith("/admin") &&
  !route.path.startsWith("/coach") &&
  !route.path.startsWith("/athlete")
);

</script>

<template>
  <v-app>
    <AdminNavBar v-if="showAdminNavBar" />
    <MenuBar v-else-if="showMenuBar" />
    <CoachNavBar v-else-if="showCoachNavBar" />
    <AthleteNavBar v-else-if="showAthleteNavBar" />
    <router-view />
  </v-app>
</template>
