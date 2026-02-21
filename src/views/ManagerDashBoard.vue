<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      
      <v-col cols="12" md="3">
        
        <v-card class="mb-4 pa-2 d-flex align-center justify-space-between bg-grey-lighten-3" elevation="1">
          <v-btn icon="mdi-chevron-left" variant="plain" density="comfortable"></v-btn>
          <span class="font-weight-medium text-subtitle-1">Jan 26 - Feb 1</span>
          <v-btn icon="mdi-chevron-right" variant="plain" density="comfortable"></v-btn>
        </v-card>

        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Filter</h3>
          
          <v-select
            v-model="filters.position"
            :items="['Positions', 'Lifeguard', 'Desk']"
            variant="solo"
            density="compact"
            hide-details
            class="mb-4"
          ></v-select>

          <h4 class="text-subtitle-2 font-weight-medium mb-1">Status</h4>
          <v-checkbox v-model="filters.status" label="All" value="all" density="compact" hide-details class="mb-n2"></v-checkbox>
          <v-checkbox v-model="filters.status" label="Assigned" value="assigned" density="compact" hide-details class="mb-n2"></v-checkbox>
          <v-checkbox v-model="filters.status" label="Open" value="open" density="compact" hide-details class="mb-4"></v-checkbox>

          <v-select
            v-model="filters.worker"
            :items="['Workers', 'Felipe', 'John']"
            variant="solo"
            density="compact"
            hide-details
          ></v-select>
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Alerts</h3>
          
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon color="red-darken-2" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">Unassigned Shift</span>
            </div>
            <span class="font-weight-bold text-body-2">1</span>
          </div>

          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="orange-lighten-1" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">Switch Shift Pending</span>
            </div>
            <span class="font-weight-bold text-body-2">1</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
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
  name: "ManagerDashBoard",
  components: { Calendar },
  data() {
    return {
      filters: {
        position: 'Positions',
        status: ['all'],
        worker: 'Workers'
      },
      teamShifts: [],
      // ... keep your other data variables ...
    };
  },
  methods: {
    // ... keep your openCreateModal, etc. methods ...
  }
};
</script>

<style scoped>
/* You can override FullCalendar styles here if you want to hide its default header 
   since you built a custom date navigator in the sidebar */
:deep(.fc-header-toolbar) {
  /* margin-bottom: 0.5em !important; */
}
</style>