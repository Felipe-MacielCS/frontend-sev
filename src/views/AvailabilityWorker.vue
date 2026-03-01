<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      
      <v-col cols="12" md="3">
        
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Sync Availability</h3>
          <p class="text-body-2 mb-4 text-medium-emphasis">
            Import your class schedule to automatically block out times you are busy.
          </p>
          <v-btn color="blue-darken-2" block prepend-icon="mdi-google" @click="showGoogleModal = true">
            Sync Google Calendar
          </v-btn>
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
            :events="availabilityBlocks" 
            initialView="timeGridWeek" 
            :isEditable="true" 
            :isSelectable="true"
            @time-selected="addAvailability"
            @shift-clicked="removeAvailability"
          />
        </v-card>
      </v-col>

    </v-row>

    <v-dialog v-model="showGoogleModal" max-width="600px">
      <v-card>
        <v-card-title class="bg-blue-darken-2 text-white">
          Import Google Calendar
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            To prevent you from being scheduled during your classes or other commitments, paste your Google Calendar <strong>Secret iCal link</strong> below.
          </p>
          <v-text-field
            v-model="googleIcalLink"
            label="Secret address in iCal format"
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            variant="outlined"
          ></v-text-field>
          <a href="https://support.google.com/calendar/answer/37648" target="_blank" class="text-caption text-blue">
            How to find my secret iCal link?
          </a>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showGoogleModal = false">Cancel</v-btn>
          <v-btn color="blue-darken-2" variant="elevated" @click="syncGoogleCalendar">Import Data</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";

export default {
  name: "WorkerAvailability",
  components: { Calendar },
  data() {
    return {
      filters: {
        position: 'Positions',
        status: ['all'],
        worker: 'Workers'
      },
      availabilityBlocks: [],
      showGoogleModal: false,
      googleIcalLink: ""
    };
  },
  methods: {
    // Creates a green block when the worker highlights a time slot
    addAvailability(timeInfo) {
      const newBlock = {
        title: "Available",
        start: timeInfo.start,
        end: timeInfo.end,
        color: "#4CAF50", // Green for available
        display: "block"
      };
      
      this.availabilityBlocks.push(newBlock);
    },

    // Deletes the block if the worker clicks on it again
    removeAvailability(eventInfo) {
      if (confirm("Remove this availability block?")) {
        this.availabilityBlocks = this.availabilityBlocks.filter(
          block => block.start !== eventInfo.startStr
        );
      }
    },

    // Handles the modal submit button
    syncGoogleCalendar() {
      if (!this.googleIcalLink) return;
      
      console.log("Sending link to backend for parsing:", this.googleIcalLink);
      
      this.showGoogleModal = false;
      this.googleIcalLink = "";
    }
  }
};
</script>

<style scoped>
:deep(.fc-header-toolbar) {
  /* Override styles if necessary */
}
</style>