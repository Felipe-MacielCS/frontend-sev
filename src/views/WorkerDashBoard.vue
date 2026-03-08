<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="pa-2 bg-white rounded-lg">
          <Calendar 
            :events="teamShifts" 
            initialView="timeGridWeek" 
            :isEditable="true" 
            :isSelectable="true"
            @time-selected="openCreateModal"
            @shift-moved="handleShiftMoved"
            @shift-clicked="openEditModal"
          />
        </v-card>
      </v-col>

    </v-row>

    </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";

export default {
  name: "WorkerDashBoard",
  components: { Calendar },
  data() {
    return {
      teamShifts: [],
      
    };
  },
  methods: {
   
  }
};
</script>

<style scoped>

:deep(.fc-header-toolbar) {
 
}
</style>
