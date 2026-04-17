<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12" md="3">
        <v-card class="mb-4 pa-4 bg-grey-lighten-3 workspace-rail" elevation="1">
          <div class="text-overline rail-eyebrow mb-2">Worker Schedule</div>
          <div class="text-subtitle-1 font-weight-bold mb-2">Current Schedule</div>
          <div v-if="officialSchedule" class="text-body-2">
            <v-sheet rounded="lg" class="pa-3 schedule-summary-sheet" border>
              <div class="text-subtitle-2 font-weight-bold mb-1">
                {{ officialSchedule.name || "Current Schedule" }}
              </div>
              <div class="text-caption text-medium-emphasis mb-2">
                {{ officialSchedule.start_date }} to {{ officialSchedule.end_date }}
              </div>
            </v-sheet>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No official schedule is available for your department.
          </div>
        </v-card>

        <v-card class="mb-4 pa-4 bg-grey-lighten-3 browser-card" elevation="1">
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold">View Filter</div>
              <div class="text-caption text-medium-emphasis">Choose whose shifts you want to see.</div>
            </div>
            <v-chip size="small" variant="tonal" color="primary">{{ workerFilterItems.length }}</v-chip>
          </div>
          <v-select
            v-model="selectedViewFilter"
            :items="workerFilterItems"
            item-title="label"
            item-value="value"
            label="Show"
            variant="outlined"
            density="compact"
            hide-details
            :menu-props="{ maxHeight: 280 }"
          />
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3 browser-card" elevation="1">
          <div class="d-flex align-center justify-space-between mb-3">
            <h3 class="text-subtitle-1 font-weight-bold">Schedule Snapshot</h3>
            <v-icon color="primary">mdi-calendar-check-outline</v-icon>
          </div>

          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon color="green-darken-2" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">My Shifts</span>
            </div>
            <span class="font-weight-bold text-body-2">{{ myShiftCount }}</span>
          </div>

          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="blue-darken-1" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">{{ filterSummaryLabel }}</span>
            </div>
            <span class="font-weight-bold text-body-2">{{ teamShifts.length }}</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card elevation="2" class="pa-3 bg-white rounded-lg workspace-shell">
          <div class="workspace-header mb-3">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div>
                <div class="text-overline workspace-kicker">Schedule</div>
                <div class="text-h5 font-weight-bold">{{ currentCalendarTitle }}</div>
                <div v-if="officialSchedule" class="text-body-2 text-medium-emphasis">
                  {{ officialSchedule.start_date }} to {{ officialSchedule.end_date }}
                </div>
              </div>

              <div class="d-flex align-center flex-wrap justify-end ga-2">
                <v-chip color="primary" variant="tonal" size="small">
                  {{ filterSummaryLabel }}
                </v-chip>
              </div>
            </div>

            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mt-3">
              <div class="text-caption text-medium-emphasis">
                View your assigned shifts and team coverage in the current official schedule.
              </div>
            </div>
          </div>

          <div class="calendar-frame">
            <Calendar
              ref="workerCalendar"
              :events="teamShifts"
              initialView="timeGridWeek"
              :isEditable="false"
              :isSelectable="false"
              :height="760"
              :contentHeight="700"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import userShiftServices from "../services/userShiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
import positionServices from "../services/positionServices.js";
import { getPositionColor } from "../utils/positionColors.js";

export default {
  name: "WorkerDashBoard",
  components: { Calendar },
  data() {
    return {
      currentUser: null,
      currentUserID: null,
      officialSchedule: null,
      departmentWorkersByID: {},
      positionsByID: {},
      officialShifts: [],
      officialAssignmentsByShiftID: {},
      selectedViewFilter: "me",
    };
  },
  computed: {
    workerFilterItems() {
      const items = [
        { label: "My shifts", value: "me" },
        { label: "All coworkers", value: "all" },
      ];

      const coworkerItems = Object.values(this.departmentWorkersByID)
        .filter((worker) => Number(worker.ID) !== Number(this.currentUserID))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        .map((worker) => ({
          label: worker.name || `Worker ${worker.ID}`,
          value: String(worker.ID),
        }));

      return [...items, ...coworkerItems];
    },
    filterSummaryLabel() {
      if (this.selectedViewFilter === "me") return "My Assigned Shifts";
      if (this.selectedViewFilter === "all") return "All Coworker Shifts";

      const selectedWorker = this.departmentWorkersByID[Number(this.selectedViewFilter)];
      return selectedWorker?.name ? `${selectedWorker.name}'s Shifts` : "Assigned Shifts";
    },
    currentCalendarTitle() {
      if (!this.officialSchedule) return "No official schedule selected";
      return this.officialSchedule.name || "Official Schedule";
    },
    myShiftCount() {
      return this.officialShifts.reduce((count, shift) => {
        const assignments = this.officialAssignmentsByShiftID[shift.ID] || [];
        return count + assignments.filter((assignment) => Number(assignment.userID) === Number(this.currentUserID)).length;
      }, 0);
    },
    teamShifts() {
      const selectedWorkerID =
        this.selectedViewFilter === "me"
          ? Number(this.currentUserID)
          : this.selectedViewFilter === "all"
            ? null
            : Number(this.selectedViewFilter);

      return this.officialShifts.flatMap((shift) => {
        const assignments = this.officialAssignmentsByShiftID[shift.ID] || [];
        const relevantAssignments =
          selectedWorkerID === null
            ? assignments
            : assignments.filter((assignment) => Number(assignment.userID) === selectedWorkerID);

        return relevantAssignments.map((assignment) => {
          const worker = this.departmentWorkersByID[Number(assignment.userID)];
          const position = this.positionsByID[shift.positionID];
          const positionTitle = position?.title || "Shift";
          return {
            id: `${shift.ID}-${assignment.ID}`,
            title:
              this.selectedViewFilter === "all"
                ? `${worker?.name || "Worker"} - ${positionTitle}`
                : this.selectedViewFilter === "me"
                  ? positionTitle
                  : `${worker?.name || "Worker"} - ${positionTitle}`,
            start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
            end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
            color: getPositionColor(position, shift.positionID),
            textColor: "#ffffff",
            extendedProps: {
              shiftID: shift.ID,
              positionID: shift.positionID || null,
            },
          };
        });
      });
    },
  },
  async mounted() {
    this.currentUser = this.getCurrentUser();
    this.currentUserID = this.normalizeUserID(
      this.currentUser?.ID ?? this.currentUser?.id ?? this.currentUser?.userID
    );
    await this.loadOfficialScheduleForWorker();
  },
  methods: {
    normalizeUserID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    async getWorkerDepartmentID() {
      const workerID = this.currentUserID;
      if (!workerID) return null;

      const linksRes = await departmentUsersServices.getByUser(workerID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
          ? linksRes.departmentusers
          : Array.isArray(linksRes?.data)
            ? linksRes.data
            : [];

      const workerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "worker") || links[0];

      return workerLink?.departmentID ?? null;
    },
    async loadOfficialScheduleForWorker() {
      try {
        const workerID =
          this.currentUserID ||
          this.normalizeUserID(this.currentUser?.ID ?? this.currentUser?.id ?? this.currentUser?.userID);
        if (!workerID) return;

        const departmentID = await this.getWorkerDepartmentID();
        if (!departmentID) return;

        const departmentLinksRes = await departmentUsersServices.getByDepartment(departmentID);
        const departmentLinks = Array.isArray(departmentLinksRes)
          ? departmentLinksRes
          : Array.isArray(departmentLinksRes?.departmentusers)
            ? departmentLinksRes.departmentusers
            : Array.isArray(departmentLinksRes?.data)
              ? departmentLinksRes.data
              : [];

        const workerIDs = departmentLinks
          .filter((link) => String(link.role || "").trim().toLowerCase() === "worker")
          .map((link) => Number(link.userID ?? link.userId ?? link.UserID))
          .filter((id) => Number.isFinite(id) && id > 0);

        const workers = await Promise.all(workerIDs.map((id) => userServices.get(id)));
        this.departmentWorkersByID = workers.reduce((acc, worker) => {
          const id = this.normalizeUserID(worker?.ID ?? worker?.id ?? worker?.userID);
          if (id) acc[id] = { ...worker, ID: id };
          return acc;
        }, {});

        const positionsRes = await positionServices.getAll({ departmentID, limit: 200 });
        const positions = Array.isArray(positionsRes)
          ? positionsRes
          : Array.isArray(positionsRes?.positions)
            ? positionsRes.positions
            : Array.isArray(positionsRes?.data)
              ? positionsRes.data
              : [];
        this.positionsByID = positions.reduce((acc, position) => {
          const id = position.positionID ?? position.ID ?? position.id;
          if (id) acc[id] = position;
          return acc;
        }, {});

        const scheduleRes = await scheduleServices.getAll({
          departmentID,
          type: "official",
          limit: 1,
        });
        const schedules = Array.isArray(scheduleRes?.schedules) ? scheduleRes.schedules : [];
        this.officialSchedule = schedules[0] || null;

        if (!this.officialSchedule?.ID) {
          this.officialShifts = [];
          this.officialAssignmentsByShiftID = {};
          return;
        }

        const shiftsRes = await shiftServices.getAll({ scheduleID: this.officialSchedule.ID });
        this.officialShifts = Array.isArray(shiftsRes) ? shiftsRes : [];

        const assignmentEntries = await Promise.all(
          this.officialShifts.map(async (shift) => {
            const assignmentsRes = await userShiftServices.getAll({ shiftID: shift.ID });
            const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
            return [shift.ID, assignments];
          })
        );
        this.officialAssignmentsByShiftID = Object.fromEntries(assignmentEntries);

        this.$nextTick(() => {
          this.$refs.workerCalendar?.goToDate?.(this.officialSchedule.start_date);
          this.$refs.workerCalendar?.updateSize?.();
        });
      } catch (e) {
        console.error("Failed to load official schedule for worker:", e?.response?.data || e);
        this.officialSchedule = null;
        this.departmentWorkersByID = {};
        this.positionsByID = {};
        this.officialShifts = [];
        this.officialAssignmentsByShiftID = {};
      }
    },
  },
};
</script>

<style scoped>
.workspace-rail {
  position: sticky;
  top: 92px;
}

.rail-eyebrow,
.workspace-kicker {
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.browser-card {
  border-radius: 18px;
}

.schedule-summary-sheet {
  background: linear-gradient(180deg, rgba(128, 22, 43, 0.05) 0%, rgba(128, 22, 43, 0.01) 100%);
}

.workspace-shell {
  border-radius: 24px;
}

.workspace-header {
  padding: 8px 8px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.calendar-frame {
  padding: 4px;
}
</style>
