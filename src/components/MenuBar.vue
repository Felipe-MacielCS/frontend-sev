<script setup>
import { ref, onMounted } from "vue";
import logo from "../assets/avocado.png";

const title = ref("Exercise Tracker");
const logoURL = ref("");

onMounted(() => {
  logoURL.value = logo;
});
</script>

<template>
  <v-app-bar>
    <v-container fluid class="d-flex align-center justify-space-between">
      <!-- Left: Logo -->
      <div class="d-flex align-center">
        <v-img
          :src="logoURL"
          height="45"
          width="45"
          contain
          class="mr-2"
        ></v-img>
      </div>

      <!-- Center: Title -->
      <div class="text-center flex-grow-1">
        <v-toolbar-title class="font-weight-bold text-h5">
          {{ title }}
        </v-toolbar-title>
      </div>

      <!-- Right: empty spacer for symmetry -->
      <div style="width: 45px;"></div>
    </v-container>
  </v-app-bar>
</template>

<style scoped>
.v-toolbar-title {
  letter-spacing: 1px;
  text-align: center;
  width: 100%;
}
</style>
