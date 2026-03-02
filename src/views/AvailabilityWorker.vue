<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      
      <v-col cols="12" md="3">
        
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Sync Schedule</h3>
          <p class="text-body-2 mb-4 text-medium-emphasis">
            Import your class schedule to automatically block out times you cannot work.
          </p>
          <v-btn color="blue-darken-2" block prepend-icon="mdi-google" @click="showGoogleModal = true" :loading="isSyncing">
            Sync Google Calendar
          </v-btn>
        </v-card>

        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Instructions</h3>
          <p class="text-body-2 text-medium-emphasis">
            Click and drag on the calendar to manually create <strong class="text-red">Red Blocks</strong> for times you are <strong>unavailable</strong> to work. 
            <br><br>
            Click any existing block to remove it.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card elevation="2" class="pa-2 bg-white rounded-lg">
          <Calendar 
            :events="unavailabilityBlocks" 
            initialView="timeGridWeek" 
            :isEditable="true" 
            :isSelectable="true"
            @time-selected="addUnavailability"
            @shift-clicked="removeUnavailability"
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
import apiClient from "../services/services.js";

export default {
  name: "WorkerAvailability",
  components: { Calendar },
  data() {
    return {
      unavailabilityBlocks: [],
      showGoogleModal: false,
      googleIcalLink: "",
      isSyncing: false
    };
  },
  methods: {
    // Manually drawing a red block on the calendar
    addUnavailability(timeInfo) {
      const newBlock = {
        id: "manual_" + String(Date.now()), 
        title: "Unavailable",
        start: timeInfo.start,
        end: timeInfo.end,
        color: "#F44336", // Red for Unavailable
        display: "block"
      };
      
      this.unavailabilityBlocks = [...this.unavailabilityBlocks, newBlock];
    },

    // Clicking a block to delete it
    removeUnavailability(eventInfo) {
      if (confirm("Remove this unavailability block?")) {
        this.unavailabilityBlocks = this.unavailabilityBlocks.filter(
          block => block.id !== eventInfo.id
        );
      }
    },

    // Fetching Google events from the backend and turning them into red blocks
    async syncGoogleCalendar() {
      if (!this.googleIcalLink) return;
      
      this.isSyncing = true;
      
      try {
        // Calls the backend controller we set up earlier
        const response = await apiClient.post("/calendar/sync", {
          icalUrl: this.googleIcalLink
        });

        // Add the returned Google events (red blocks) to our existing manual blocks
        this.unavailabilityBlocks = [...this.unavailabilityBlocks, ...response];
        
        this.showGoogleModal = false;
        this.googleIcalLink = "";
        
      } catch (error) {
        console.error("Failed to sync calendar:", error);
        alert("Could not sync calendar. Please check the link and try again.");
      } finally {
        this.isSyncing = false;
      }
    }
  }
};
</script>

<style scoped>
:deep(.fc-header-toolbar) {
  /* Override styles if necessary */
}
</style>