<template>
  <v-app-bar color="#72151A" theme="dark" elevation="2" class="px-4">
    <v-avatar rounded="0" size="130" class="mr-3">
      <v-img src="/src/Assets/plain_eagle.png" alt="OC Logo"></v-img>
    </v-avatar>

    <v-spacer></v-spacer>

    <v-btn variant="text" class="text-none font-weight-medium" to="/worker">Schedule</v-btn>
    <v-btn variant="text" class="text-none font-weight-medium" to="/manager/users">Trade Board</v-btn>
    <v-btn variant="text" class="text-none font-weight-medium" to="/manager/budget">Announcements</v-btn>
    <v-btn variant="text" class="text-none font-weight-medium" to="/worker/availability">Availability</v-btn>

    <v-btn icon="mdi-cog" variant="text" class="ml-2"></v-btn>
  </v-app-bar>
</template>

<script>
export default {
  name: "NavMenu"
}
</script>

<style scoped>

.v-btn--active {
  border-bottom: 2px solid white;
  border-radius: 0;
}
</style>