<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      
      <v-col cols="12" md="3">
        

        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Filter</h3>
          
          <v-select
            v-model="filters.scheduleType"
            :items="['official', 'template']"
            label="Schedule Type"
            variant="solo"
            density="compact"
            hide-details
            class="mb-4"
/>
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

          <div class="d-flex justify-end mb-2">
            <v-btn color="primary" @click="scheduleDialog.open = true">Create Schedule</v-btn>
          </div>

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

    <v-dialog v-model="scheduleDialog.open" max-width="600">
      <v-card class="pa-4">
        <h3 class="text-h6 font-weight-bold mb-4">Create Schedule</h3>

        <v-text-field
          v-model="scheduleDialog.form.departmentID"
          label="Department ID"
          type="number"
          variant="solo"
          class="mb-3"
        />

        <v-text-field
          v-model="scheduleDialog.form.start_date"
          label="Start Date (YYYY-MM-DD)"
          variant="solo"
          class="mb-3"
        />

        <v-text-field
          v-model="scheduleDialog.form.end_date"
          label="End Date (YYYY-MM-DD)"
          variant="solo"
          class="mb-3"
        />

        <v-select
          v-model="scheduleDialog.form.type"
          :items="['weekly','biweekly','monthly']"
          label="Type"
          variant="solo"
          class="mb-3"
        />

        <v-select
          v-model="scheduleDialog.form.status"
          :items="['open','closed','draft']"
          label="Status"
          variant="solo"
          class="mb-4"
        />

        <div class="d-flex justify-end ga-2">
          <v-btn variant="text" @click="scheduleDialog.open = false">Cancel</v-btn>
          <v-btn color="primary" @click="createSchedule">Save</v-btn>
        </div>
      </v-card>
    </v-dialog>

    </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import scheduleServices from "../services/scheduleServices.js";

export default {
  name: "ManagerDashBoard",
  components: { Calendar },
  data() {
    return {
      filters: {
        position: 'Positions',
        status: ['all'],
        worker: 'Workers',
        scheduleType: 'official'
      },

      teamShifts: [],

      scheduleDialog: {
        open: false,
        form: {
          departmentID: "",
          start_date: "",
          end_date: "",
          type: "weekly",
          status: "draft",
        },
      },

    };
  },
  async mounted() {
    await this.loadSchedules();
  },
  methods: {
    async loadSchedules() {
      try {
        const res = await scheduleServices.getAll();

        const schedules =
          Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.schedules) ? res.schedules :
          [];

        this.teamShifts = schedules.map((s) => ({
          id: s.ID ?? s.scheduleID,
          title: `Schedule`,
          start: this.toISODate(s.start_date),
          end: this.toISODatePlusOne(s.end_date),
          allDay: true,
          display: "background",
        }));
      } catch (err) {
        console.error("Failed to load schedules:", err);
      }
    },

    async createSchedule() {
      try {
        const payload = {
          departmentID: Number(this.scheduleDialog.form.departmentID),
          start_date: this.scheduleDialog.form.start_date,
          end_date: this.scheduleDialog.form.end_date,
          type: this.scheduleDialog.form.type,
          status: this.scheduleDialog.form.status,
        };

        await scheduleServices.create(payload);

        this.scheduleDialog.open = false;

        await this.loadSchedules();
      } catch (e) {
        console.error("Create schedule failed:", e);
      }
    },

    toISODate(dateVal) {

      const d = new Date(dateVal);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },
    toISODatePlusOne(dateVal) {
      const d = new Date(dateVal);
      d.setDate(d.getDate() + 1);
      return this.toISODate(d);
    },

    openCreateModal(range) {
      console.log("selected range", range);
    },
    handleShiftMoved(event) {
      console.log("moved event", event);
    },
    openEditModal(event) {
      console.log("clicked event", event);
    },
  },
};
</script>

<style scoped>

:deep(.fc-header-toolbar) {
 
}
</style>