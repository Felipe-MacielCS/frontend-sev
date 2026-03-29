<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12" md="3">
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <div class="d-flex flex-column ga-2">
            <v-btn
              color="primary"
              :variant="activePanel === 'create' ? 'flat' : 'tonal'"
              block
              @click="activePanel = 'create'"
            >
              Create
            </v-btn>
            <v-btn
              color="primary"
              :variant="activePanel === 'schedules' ? 'flat' : 'tonal'"
              block
              @click="activePanel = 'schedules'"
            >
              Schedules
            </v-btn>
            <v-btn
              color="primary"
              :variant="activePanel === 'templates' ? 'flat' : 'tonal'"
              block
              @click="activePanel = 'templates'"
            >
              Templates
            </v-btn>
          </div>
        </v-card>

        <v-card v-if="activePanel === 'create'" class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Create</h3>

          <v-select
            v-model="newSchedule.type"
            label="Create Type"
            :items="scheduleTypeOptions"
            item-title="label"
            item-value="value"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model="newSchedule.anchor_date"
            label="Week Of"
            type="date"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-select
            v-model="newSchedule.cadence"
            label="Length"
            :items="scheduleCadenceOptions"
            item-title="label"
            item-value="value"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model="newSchedule.name"
            :label="newSchedule.type === 'template' ? 'Template Name' : 'Schedule Name (Optional)'"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <div class="mb-3 text-body-2">
            <b>Range:</b>
            {{ computedScheduleRangeLabel || "Choose a week to generate the range." }}
          </div>

          <v-btn
            color="primary"
            block
            :loading="isCreatingSchedule"
            :disabled="!canCreateSchedule"
            @click="createSchedule"
          >
            {{ newSchedule.type === "template" ? "Create Template" : "Create Schedule" }}
          </v-btn>
        </v-card>

        <v-card v-if="activePanel === 'schedules'" class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Schedules</h3>

          <v-select
            v-model="selectedScheduleID"
            label="Choose Schedule"
            :items="scheduleItems"
            item-title="label"
            item-value="value"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
            @update:modelValue="onScheduleSelected"
          />

          <div v-if="selectedSchedule" class="text-body-2">
            <v-text-field
              v-model="scheduleEditor.name"
              label="Name"
              variant="solo"
              density="compact"
              hide-details
              class="mt-3 mb-2"
            />

            <v-select
              v-model="scheduleEditor.type"
              :items="scheduleTypeOptions.filter((s) => s.value !== 'template')"
              item-title="label"
              item-value="value"
              label="Type"
              variant="solo"
              density="compact"
              hide-details
              class="mb-2"
            />

            <div class="mb-2"><b>Name:</b> {{ selectedSchedule.name || "Untitled" }}</div>
            <div><b>Range:</b> {{ selectedSchedule.start_date }} to {{ selectedSchedule.end_date }}</div>

            <div class="d-flex ga-2 mt-2">
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                :loading="isUpdatingSchedule"
                @click="updateSelectedScheduleMeta"
              >
                Save
              </v-btn>
              <v-btn
                size="small"
                color="error"
                variant="tonal"
                :loading="isDeletingSchedule"
                @click="deleteSelectedSchedule"
              >
                Delete
              </v-btn>
            </div>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No schedule selected.
          </div>
        </v-card>

        <v-card v-if="activePanel === 'templates'" class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Templates</h3>

          <v-select
            v-model="templateApply.templateScheduleID"
            :items="templateScheduleItems"
            item-title="label"
            item-value="value"
            label="Choose Template"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
            @update:modelValue="onTemplateSelected"
          />

          <v-text-field
            v-model="templateApply.anchor_date"
            label="Week Of"
            type="date"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-select
            v-model="templateApply.type"
            :items="scheduleTypeOptions.filter((s) => s.value !== 'template')"
            item-title="label"
            item-value="value"
            label="Create As"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model="templateApply.name"
            label="New Schedule Name (Optional)"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-btn
            color="primary"
            block
            :loading="isApplyingTemplate"
            :disabled="!canApplyTemplate"
            @click="createFromTemplate"
          >
            Create From Template
          </v-btn>

          <v-btn
            color="error"
            variant="tonal"
            block
            class="mt-2"
            :loading="isDeletingTemplate"
            :disabled="!templateApply.templateScheduleID"
            @click="deleteSelectedTemplate"
          >
            Delete Template
          </v-btn>
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Alerts</h3>

          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon color="red-darken-2" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">Unassigned Shift</span>
            </div>
            <span class="font-weight-bold text-body-2">{{ unassignedShiftCount }}</span>
          </div>

          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="blue-darken-1" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">Total Shifts</span>
            </div>
            <span class="font-weight-bold text-body-2">{{ shifts.length }}</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <div class="d-flex align-center justify-space-between mb-3 px-1">
          <div>
            <div class="text-h6 font-weight-bold">{{ currentCalendarScheduleName }}</div>
            <div v-if="currentCalendarSchedule" class="text-body-2 text-medium-emphasis">
              {{ currentCalendarSchedule.start_date }} to {{ currentCalendarSchedule.end_date }}
            </div>
          </div>
          <v-chip
            v-if="currentCalendarScheduleTypeLabel"
            color="primary"
            variant="tonal"
            size="small"
          >
            {{ currentCalendarScheduleTypeLabel }}
          </v-chip>
        </div>
        <v-card elevation="2" class="pa-2 bg-white rounded-lg">
          <Calendar
            ref="managerCalendar"
            :events="calendarEvents"
            initialView="timeGridWeek"
            :isEditable="false"
            :isSelectable="true"
            :height="760"
            :contentHeight="700"
            @dates-changed="saveSessionState"
            @time-selected="openCreateShiftModal"
            @shift-clicked="openEditShiftModal"
          />
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="shiftDialog.open" max-width="640">
      <v-card>
        <v-card-title class="text-h6">
          {{ shiftDialog.mode === "create" ? "Create Shift" : "Edit Shift" }}
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="!selectedScheduleID"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Select or create a schedule first.
          </v-alert>

          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="shiftDialog.form.shift_date"
                label="Shift Date"
                type="date"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="shiftDialog.form.start_time"
                label="Start Time"
                type="time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="shiftDialog.form.end_time"
                label="End Time"
                type="time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="shiftDialog.form.positionID"
                :items="positionItems"
                item-title="label"
                item-value="value"
                label="Position (Optional)"
                variant="outlined"
                density="comfortable"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="shiftDialog.form.workers_required"
                label="Workers Required"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="shiftDialog.form.assignedWorkerIDs"
            :items="workerItems"
            item-title="label"
            item-value="value"
            label="Assign Workers"
            variant="outlined"
            density="comfortable"
            multiple
            chips
            closable-chips
            class="mt-1"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeShiftDialog">Cancel</v-btn>
          <v-btn
            v-if="shiftDialog.mode === 'edit'"
            color="error"
            variant="tonal"
            :loading="isDeletingShift"
            @click="deleteShift"
          >
            Delete
          </v-btn>
          <v-btn
            color="primary"
            :loading="isSavingShift"
            :disabled="!canSaveShift"
            @click="saveShift"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
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
import settingsServices from "../services/settingsServices.js";
import settingsValuesServices from "../services/settingsValuesServices.js";

const SESSION_STORAGE_KEY = "manager-schedule-page-state-v1";

export default {
  name: "ManagerDashBoard",
  components: { Calendar },
  data() {
    return {
      isCreatingSchedule: false,
      isSavingShift: false,
      isDeletingShift: false,
      isUpdatingSchedule: false,
      isDeletingSchedule: false,
      isApplyingTemplate: false,
      isDeletingTemplate: false,

      managerDepartmentID: null,
      activePanel: "schedules",

      newSchedule: {
        anchor_date: "",
        cadence: "weekly",
        type: "draft",
        name: "",
      },

      scheduleCadenceOptions: [
        { label: "Weekly (1 week)", value: "weekly" },
        { label: "Biweekly (2 weeks)", value: "biweekly" },
      ],

      scheduleTypeOptions: [
        { label: "Draft", value: "draft" },
        { label: "Template", value: "template" },
        { label: "Official", value: "official" },
      ],

      schedules: [],
      selectedScheduleID: null,
      lastScheduleTabSelectionID: null,
      scheduleEditor: {
        name: "",
        type: "draft",
      },
      templateApply: {
        templateScheduleID: null,
        anchor_date: "",
        type: "draft",
        name: "",
      },

      shifts: [],
      userShiftAssignmentsByShiftID: {},
      workersByID: {},
      positionsByID: {},
      managerSettings: {
        schedule_week_starts_monday: false,
        default_shift_workers_required: 1,
        allow_shift_overlap: false,
        allowed_shift_overlap_minutes: 0,
      },

      shiftDialog: {
        open: false,
        mode: "create",
        shiftID: null,
        form: {
          shift_date: "",
          start_time: "",
          end_time: "",
          workers_required: 1,
          positionID: null,
          assignedWorkerIDs: [],
        },
      },

      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },

  computed: {
    computedScheduleRange() {
      if (!this.newSchedule.anchor_date) return null;
      const weekStart = this.getStartOfWeek(new Date(`${this.newSchedule.anchor_date}T00:00:00`));
      const daySpan = this.newSchedule.cadence === "biweekly" ? 13 : 6;
      const weekEnd = this.addDays(weekStart, daySpan);

      return {
        start_date: this.toISODate(weekStart),
        end_date: this.toISODate(weekEnd),
      };
    },

    computedScheduleRangeLabel() {
      if (!this.computedScheduleRange) return "";
      return `${this.computedScheduleRange.start_date} to ${this.computedScheduleRange.end_date}`;
    },

    canCreateSchedule() {
      const hasCoreFields =
        !!this.managerDepartmentID &&
        !!this.newSchedule.anchor_date &&
        !!this.newSchedule.cadence &&
        !!this.newSchedule.type;
      if (!hasCoreFields) return false;
      if (this.newSchedule.type === "template" && !String(this.newSchedule.name || "").trim()) {
        return false;
      }

      return !!this.computedScheduleRange;
    },

    templateScheduleItems() {
      return this.schedules
        .filter((s) => s.type === "template")
        .map((s) => ({
          value: s.ID,
          label: s.name || "Untitled Template",
        }));
    },

    canApplyTemplate() {
      return (
        !!this.templateApply.templateScheduleID &&
        !!this.templateApply.anchor_date &&
        !!this.templateApply.type
      );
    },

    canSaveShift() {
      const f = this.shiftDialog.form;
      if (
        !this.selectedScheduleID ||
        !f.shift_date ||
        !f.start_time ||
        !f.end_time ||
        Number(f.workers_required) < 1
      ) {
        return false;
      }

      const start = new Date(`${f.shift_date}T${this.toHHMM(f.start_time)}:00`);
      const end = new Date(`${f.shift_date}T${this.toHHMM(f.end_time)}:00`);
      return start < end;
    },

    selectedSchedule() {
      return (
        this.schedules.find((s) => Number(s.ID) === Number(this.selectedScheduleID)) || null
      );
    },

    scheduleItems() {
      return this.schedules
        .filter((s) => s.type !== "template")
        .map((s) => ({
          value: s.ID,
          label: `${s.name || "Untitled Schedule"} | ${s.type}`,
        }));
    },
    firstScheduleID() {
      return this.scheduleItems[0]?.value || null;
    },

    currentCalendarSchedule() {
      return this.schedules.find((s) => Number(s.ID) === Number(this.selectedScheduleID)) || null;
    },

    currentCalendarScheduleName() {
      const schedule = this.currentCalendarSchedule;
      if (!schedule) return "No schedule selected";
      return schedule.name || (schedule.type === "template" ? "Untitled Template" : "Untitled Schedule");
    },

    currentCalendarScheduleTypeLabel() {
      const schedule = this.currentCalendarSchedule;
      if (!schedule?.type) return "";
      return String(schedule.type).charAt(0).toUpperCase() + String(schedule.type).slice(1);
    },

    positionItems() {
      const list = Object.values(this.positionsByID);
      return list.map((p) => ({ value: p.positionID || p.ID, label: p.title || `Position ${p.positionID || p.ID}` }));
    },

    workerItems() {
      const list = Object.values(this.workersByID);
      return list
        .map((w) => {
          const id = Number(w.ID ?? w.userID ?? w.id);
          if (!Number.isFinite(id) || id <= 0) return null;
          return { value: id, label: w.name || `Worker ${id}` };
        })
        .filter(Boolean);
    },

    calendarEvents() {
      return this.shifts.map((shift) => {
        const shiftID = shift.ID;
        const assignments = this.userShiftAssignmentsByShiftID[shiftID] || [];
        const workerNames = assignments
          .map((a) => {
            const userID = Number(a.userID);
            return this.workersByID[userID]?.name || `Worker ${a.userID}`;
          })
          .join(", ");

        const position = this.positionsByID[shift.positionID];
        const positionTitle = position?.title || "Shift";
        const assignedCount = assignments.length;
        const required = shift.workers_required || 1;
        const title =
          assignedCount > 0
            ? `${positionTitle} (${assignedCount}/${required}) - ${workerNames}`
            : `${positionTitle} (0/${required}) - Unassigned`;

        const color = assignedCount >= required ? "#2e7d32" : "#c62828";

        return {
          id: String(shift.ID),
          title,
          start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
          end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
          color,
          extendedProps: {
            shiftID: shift.ID,
          },
        };
      });
    },

    unassignedShiftCount() {
      return this.shifts.filter((shift) => {
        const assigned = (this.userShiftAssignmentsByShiftID[shift.ID] || []).length;
        return assigned < (shift.workers_required || 1);
      }).length;
    },

  },

  watch: {
    async activePanel(next) {
      this.saveSessionState();
      if (next === "schedules") {
        const preferredScheduleID =
          this.lastScheduleTabSelectionID && this.schedules.some(
            (s) => Number(s.ID) === Number(this.lastScheduleTabSelectionID) && s.type !== "template"
          )
            ? this.lastScheduleTabSelectionID
            : this.firstScheduleID;

        if (!this.selectedScheduleID || !this.schedules.some((s) => Number(s.ID) === Number(this.selectedScheduleID) && s.type !== "template")) {
          this.selectedScheduleID = preferredScheduleID;
        }
        if (this.selectedScheduleID) await this.onScheduleSelected();
      }
      if (next === "templates") {
        if (!this.templateApply.templateScheduleID && this.templateScheduleItems.length > 0) {
          this.templateApply.templateScheduleID = this.templateScheduleItems[0].value;
        }
        if (this.templateApply.templateScheduleID) await this.onTemplateSelected();
      }
    },
    selectedScheduleID() {
      if (
        this.schedules.some(
          (s) => Number(s.ID) === Number(this.selectedScheduleID) && s.type !== "template"
        )
      ) {
        this.lastScheduleTabSelectionID = this.selectedScheduleID;
      }
      this.saveSessionState();
    },
    "templateApply.templateScheduleID"() {
      this.saveSessionState();
    },
    newSchedule: {
      handler() {
        this.saveSessionState();
      },
      deep: true,
    },
    templateApply: {
      handler() {
        this.saveSessionState();
      },
      deep: true,
    },
  },

  async mounted() {
    if (!this.newSchedule.anchor_date) {
      this.newSchedule.anchor_date = this.toISODate(new Date());
    }
    if (!this.templateApply.anchor_date) {
      this.templateApply.anchor_date = this.toISODate(new Date());
    }
    await this.bootstrapManagerSchedulePage();
  },

  methods: {
    toISODate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },

    addDays(date, days) {
        const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    },

    getStartOfWeek(date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const day = start.getDay();
      const offset = this.managerSettings.schedule_week_starts_monday
        ? (day === 0 ? 6 : day - 1)
        : day;
      start.setDate(start.getDate() - offset);
      return start;
    },

    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },

    jumpCalendarToDate(dateStr) {
      if (!dateStr) return;
      this.$nextTick(() => {
        this.$refs.managerCalendar?.goToDate?.(dateStr);
        this.$refs.managerCalendar?.updateSize?.();
        this.saveSessionState();
      });
    },

    normalizeUserID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },

    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },

    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },

    castManagerSettingValue(valueType, rawValue) {
      if (valueType === "bool") {
        return String(rawValue).trim().toLowerCase() === "true";
      }
      if (valueType === "int") {
        const parsed = Number(rawValue);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return rawValue;
    },

    async loadManagerSettings() {
      const desiredKeys = [
        "schedule_week_starts_monday",
        "default_shift_workers_required",
        "allow_shift_overlap",
        "allowed_shift_overlap_minutes",
      ];

      const definitions = await settingsServices.getAll();
      const settingsByKey = Object.fromEntries(
        (Array.isArray(definitions) ? definitions : []).map((row) => [row.key, row])
      );
      const values = await settingsValuesServices.getAll({
        departmentID: this.managerDepartmentID,
      });
      const valuesBySettingID = Object.fromEntries(
        (Array.isArray(values) ? values : []).map((row) => [row.settingID, row])
      );

      for (const key of desiredKeys) {
        const definition = settingsByKey[key];
        if (!definition?.ID) continue;
        const rawValue = valuesBySettingID[definition.ID]?.value ?? definition.default_value;
        this.managerSettings[key] = this.castManagerSettingValue(definition.value_type, rawValue);
      }
    },

    getShiftOverlapMinutes(candidateShift, existingShift) {
      if (candidateShift.shift_date !== existingShift.shift_date) return 0;

      const candidateStart = new Date(`${candidateShift.shift_date}T${this.toHHMM(candidateShift.start_time)}:00`);
      const candidateEnd = new Date(`${candidateShift.shift_date}T${this.toHHMM(candidateShift.end_time)}:00`);
      const existingStart = new Date(`${existingShift.shift_date}T${this.toHHMM(existingShift.start_time)}:00`);
      const existingEnd = new Date(`${existingShift.shift_date}T${this.toHHMM(existingShift.end_time)}:00`);

      const overlapMs = Math.min(candidateEnd.getTime(), existingEnd.getTime()) - Math.max(candidateStart.getTime(), existingStart.getTime());
      return overlapMs > 0 ? Math.round(overlapMs / 60000) : 0;
    },

    validateShiftOverlap(shiftPayload, editingShiftID = null) {
      const allowedMinutes = this.managerSettings.allow_shift_overlap
        ? Number(this.managerSettings.allowed_shift_overlap_minutes) || 0
        : 0;

      const conflictingShift = this.shifts.find((shift) => {
        if (editingShiftID && Number(shift.ID) === Number(editingShiftID)) return false;
        return this.getShiftOverlapMinutes(shiftPayload, shift) > allowedMinutes;
      });

      if (!conflictingShift) return null;

      return `This shift overlaps another shift by more than ${allowedMinutes} minute${allowedMinutes === 1 ? "" : "s"}.`;
    },

    readSessionState() {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn("Could not read manager schedule page state:", e);
        return null;
      }
    },

    saveSessionState() {
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            activePanel: this.activePanel,
            selectedScheduleID: this.selectedScheduleID,
            lastScheduleTabSelectionID: this.lastScheduleTabSelectionID,
            templateScheduleID: this.templateApply.templateScheduleID,
            calendarDate:
              this.$refs.managerCalendar?.getCurrentDate?.() ||
              this.currentCalendarSchedule?.start_date ||
              null,
            newSchedule: this.newSchedule,
            templateApply: this.templateApply,
          })
        );
      } catch (e) {
        console.warn("Could not save manager schedule page state:", e);
      }
    },

    getOfficialScheduleID() {
      return (
        this.schedules.find((schedule) => schedule.type === "official")?.ID ||
        null
      );
    },

    getPreferredDefaultScheduleID() {
      return this.getOfficialScheduleID() || this.firstScheduleID || null;
    },

    restoreSessionState() {
      const state = this.readSessionState();
      if (!state) return null;

      this.activePanel = state.activePanel || "schedules";
      this.selectedScheduleID = state.selectedScheduleID || null;
      this.lastScheduleTabSelectionID = state.lastScheduleTabSelectionID || null;
      this.templateApply = {
        ...this.templateApply,
        ...(state.templateApply || {}),
        templateScheduleID: state.templateScheduleID || state.templateApply?.templateScheduleID || null,
      };
      this.newSchedule = {
        ...this.newSchedule,
        ...(state.newSchedule || {}),
      };

      return state;
    },

    refreshScheduleEditorFromSelected() {
      const s = this.selectedSchedule;
      if (!s) {
        this.scheduleEditor = { name: "", type: "draft" };
        this.saveSessionState();
        return;
      }
      this.scheduleEditor = {
        name: s.name || "",
        type: s.type || "draft",
      };
      this.saveSessionState();
    },

    async updateSelectedScheduleMeta() {
      if (!this.selectedScheduleID) return;
      try {
        this.isUpdatingSchedule = true;
        const payload = {
          name: String(this.scheduleEditor.name || "").trim() || null,
          type: this.scheduleEditor.type,
        };
        const res = await scheduleServices.update(this.selectedScheduleID, payload);
        const updated = res?.data || null;
        const keepSelectedID = this.selectedScheduleID;
        await this.loadSchedules();
        this.selectedScheduleID = keepSelectedID;
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(updated?.start_date || this.selectedSchedule?.start_date);
        this.refreshScheduleEditorFromSelected();
        this.showMessage("Schedule updated.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to update schedule.", "error");
      } finally {
        this.isUpdatingSchedule = false;
      }
    },

    async deleteSelectedSchedule() {
      if (!this.selectedScheduleID) return;
      try {
        this.isDeletingSchedule = true;
        const deletingID = this.selectedScheduleID;
        await scheduleServices.delete(deletingID);

        this.schedules = this.schedules.filter((s) => Number(s.ID) !== Number(deletingID));
        if (Number(this.lastScheduleTabSelectionID) === Number(deletingID)) {
          this.lastScheduleTabSelectionID = null;
        }
        this.selectedScheduleID = this.getPreferredDefaultScheduleID();

        if (this.selectedScheduleID) {
          await this.loadShiftsForSelectedSchedule();
          this.jumpCalendarToDate(this.selectedSchedule?.start_date);
        } else {
          this.shifts = [];
          this.userShiftAssignmentsByShiftID = {};
        }
        this.refreshScheduleEditorFromSelected();
        this.showMessage("Schedule deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to delete schedule.", "error");
      } finally {
        this.isDeletingSchedule = false;
      }
    },

    async deleteSelectedTemplate() {
      const templateID = Number(this.templateApply.templateScheduleID);
      if (!Number.isFinite(templateID) || templateID <= 0) return;
      try {
        this.isDeletingTemplate = true;
        await scheduleServices.delete(templateID);
        this.schedules = this.schedules.filter((s) => Number(s.ID) !== templateID);
        const nextTemplate = this.templateScheduleItems[0]?.value || null;
        this.templateApply.templateScheduleID = nextTemplate;

        if (nextTemplate) {
          await this.onTemplateSelected();
        } else {
          if (this.activePanel === "templates") {
            this.shifts = [];
            this.userShiftAssignmentsByShiftID = {};
          }
          if (!this.selectedScheduleID || Number(this.selectedScheduleID) === templateID) {
            this.selectedScheduleID = this.firstScheduleID;
            if (this.selectedScheduleID) {
              await this.onScheduleSelected();
            }
          }
        }

        this.showMessage("Template deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to delete template.", "error");
      } finally {
        this.isDeletingTemplate = false;
      }
    },

    async createFromTemplate() {
      if (!this.canApplyTemplate) return;
      const template = this.schedules.find((s) => Number(s.ID) === Number(this.templateApply.templateScheduleID));
      if (!template) return;
      try {
        this.isApplyingTemplate = true;
        const sourceShifts = await shiftServices.getAll({ scheduleID: template.ID });
        const templateShifts = Array.isArray(sourceShifts) ? sourceShifts : [];

        const targetStart = this.getStartOfWeek(new Date(`${this.templateApply.anchor_date}T00:00:00`));
        const sourceStart = new Date(`${template.start_date}T00:00:00`);
        const sourceEnd = new Date(`${template.end_date}T00:00:00`);
        const totalDays = Math.round((sourceEnd - sourceStart) / (1000 * 60 * 60 * 24));
        const targetEnd = this.addDays(targetStart, totalDays);
        const dayOffset = Math.round((targetStart - sourceStart) / (1000 * 60 * 60 * 24));

        const createdScheduleRes = await scheduleServices.create({
          name:
            String(this.templateApply.name || "").trim() ||
            `${template.name || "Schedule"} ${this.toISODate(targetStart)}`,
          start_date: this.toISODate(targetStart),
          end_date: this.toISODate(targetEnd),
          type: this.templateApply.type,
          departmentID: this.managerDepartmentID,
        });
        const createdSchedule = createdScheduleRes?.data || createdScheduleRes;
        const newScheduleID = createdSchedule?.ID;
        if (!newScheduleID) throw new Error("Could not create schedule from template.");

        for (const s of templateShifts) {
          const original = new Date(`${s.shift_date}T00:00:00`);
          const shifted = this.addDays(original, dayOffset);
          await shiftServices.create({
            shift_date: this.toISODate(shifted),
            start_time: this.toHHMM(s.start_time),
            end_time: this.toHHMM(s.end_time),
            workers_required: s.workers_required || 1,
            scheduleID: newScheduleID,
            positionID: s.positionID || null,
          });
        }

        await this.loadSchedules();
        this.selectedScheduleID = newScheduleID;
        if (this.templateApply.type !== "template") {
          this.lastScheduleTabSelectionID = newScheduleID;
        }
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(createdSchedule?.start_date || this.toISODate(targetStart));
        this.refreshScheduleEditorFromSelected();
        this.showMessage("Schedule created from template.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || e?.message || "Failed to create from template.", "error");
      } finally {
        this.isApplyingTemplate = false;
      }
    },

    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = currentUser?.ID ?? currentUser?.id ?? currentUser?.userID;
      if (!managerID) return null;

      const linksRes = await departmentUsersServices.getByUser(managerID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
          ? linksRes.departmentusers
          : Array.isArray(linksRes?.data)
            ? linksRes.data
            : [];

      const managerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async bootstrapManagerSchedulePage() {
      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.showMessage("No department found for this manager.", "error");
          return;
        }

        const restoredState = this.restoreSessionState();
        await Promise.all([this.loadWorkers(), this.loadPositions(), this.loadManagerSettings(), this.loadSchedules()]);

        const routeScheduleID = Number(this.$route?.query?.scheduleID);
        const routeTemplateID = Number(this.$route?.query?.templateID);
        if (Number.isFinite(routeScheduleID) && routeScheduleID > 0) {
          const exists = this.schedules.some((s) => Number(s.ID) === routeScheduleID);
          if (exists) {
            this.activePanel = "schedules";
            this.selectedScheduleID = routeScheduleID;
            await this.loadShiftsForSelectedSchedule();
            this.jumpCalendarToDate(this.selectedSchedule?.start_date);
            this.refreshScheduleEditorFromSelected();
            this.saveSessionState();
          }
          return;
        }
        if (Number.isFinite(routeTemplateID) && routeTemplateID > 0) {
          const exists = this.schedules.some((s) => Number(s.ID) === routeTemplateID && s.type === "template");
          if (exists) {
            this.activePanel = "templates";
            this.templateApply.templateScheduleID = routeTemplateID;
            await this.onTemplateSelected();
            this.saveSessionState();
          }
          return;
        }

        if (
          restoredState?.selectedScheduleID &&
          this.schedules.some((s) => Number(s.ID) === Number(restoredState.selectedScheduleID))
        ) {
          this.selectedScheduleID = restoredState.selectedScheduleID;
          if (this.activePanel === "templates") {
            this.templateApply.templateScheduleID =
              restoredState.templateScheduleID || this.templateApply.templateScheduleID;
            if (this.templateApply.templateScheduleID) {
              await this.onTemplateSelected();
            }
          } else {
            this.activePanel = "schedules";
            await this.onScheduleSelected();
          }
          this.jumpCalendarToDate(restoredState.calendarDate || this.currentCalendarSchedule?.start_date);
          this.saveSessionState();
          return;
        }

        this.activePanel = "schedules";
        this.selectedScheduleID = this.getPreferredDefaultScheduleID();
        if (this.selectedScheduleID) {
          await this.onScheduleSelected();
          this.jumpCalendarToDate(this.currentCalendarSchedule?.start_date);
        }
        this.saveSessionState();
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to load manager scheduling data.", "error");
      }
    },

    async loadWorkers() {
      const linksRes = await departmentUsersServices.getByDepartment(this.managerDepartmentID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
          ? linksRes.departmentusers
          : Array.isArray(linksRes?.data)
            ? linksRes.data
            : [];

      const workerIDs = links
        .filter((l) => String(l.role || "").trim().toLowerCase() === "worker")
        .map((l) => l.userID ?? l.userId ?? l.UserID)
        .filter(Boolean);

      const users = await Promise.all(workerIDs.map((id) => userServices.get(id)));
      this.workersByID = users.reduce((acc, user) => {
        const normalizedID = this.normalizeUserID(user?.ID ?? user?.userID ?? user?.id);
        if (normalizedID) acc[normalizedID] = { ...user, ID: normalizedID };
        return acc;
      }, {});
    },

    async loadPositions() {
      const res = await positionServices.getAll({ departmentID: this.managerDepartmentID, limit: 200 });
      const positions = Array.isArray(res)
        ? res
        : Array.isArray(res?.positions)
          ? res.positions
          : Array.isArray(res?.data)
            ? res.data
            : [];

      this.positionsByID = positions.reduce((acc, p) => {
        const id = p.positionID ?? p.ID;
        if (id) acc[id] = p;
        return acc;
      }, {});
    },

    async loadSchedules() {
      const res = await scheduleServices.getAll({
        departmentID: this.managerDepartmentID,
        limit: 200,
      });

        this.schedules = Array.isArray(res?.schedules) ? res.schedules : [];
      const scheduleIDs = new Set(
        this.schedules.filter((s) => s.type !== "template").map((s) => Number(s.ID))
      );
      if (
        this.lastScheduleTabSelectionID &&
        !scheduleIDs.has(Number(this.lastScheduleTabSelectionID))
      ) {
        this.lastScheduleTabSelectionID = null;
      }
      if (
        this.selectedScheduleID &&
        !this.schedules.some((s) => Number(s.ID) === Number(this.selectedScheduleID))
      ) {
        this.selectedScheduleID = null;
      }

      if (!this.selectedScheduleID && this.schedules.length > 0) {
        this.selectedScheduleID = this.getPreferredDefaultScheduleID() || this.schedules[0].ID;
        await this.loadShiftsForSelectedSchedule();
        const first = this.schedules.find((s) => Number(s.ID) === Number(this.selectedScheduleID)) || this.schedules[0];
        this.jumpCalendarToDate(first?.start_date);
        this.refreshScheduleEditorFromSelected();
      }
    },

    async createSchedule() {
      if (!this.canCreateSchedule) return;

      try {
        this.isCreatingSchedule = true;
        const range = this.computedScheduleRange;
        if (!range) {
          this.showMessage("Please choose a valid week and length.", "warning");
          return;
        }

        const payload = {
          name:
            String(this.newSchedule.name || "").trim() ||
            (this.newSchedule.type === "template" ? `Template ${range.start_date}` : `Schedule ${range.start_date}`),
          start_date: range.start_date,
          end_date: range.end_date,
          type: this.newSchedule.type,
          departmentID: this.managerDepartmentID,
        };

        const created = await scheduleServices.create(payload);
        const createdSchedule = created?.data || created;

        this.schedules = [createdSchedule, ...this.schedules];
        this.selectedScheduleID = createdSchedule?.ID ?? this.selectedScheduleID;
        if (this.newSchedule.type !== "template") {
          this.lastScheduleTabSelectionID = createdSchedule?.ID ?? this.lastScheduleTabSelectionID;
        }
        this.activePanel = this.newSchedule.type === "template" ? "templates" : "schedules";
        if (this.newSchedule.type === "template") {
          this.templateApply.templateScheduleID = createdSchedule?.ID ?? this.templateApply.templateScheduleID;
        }
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(createdSchedule?.start_date || range.start_date);
        this.refreshScheduleEditorFromSelected();

        this.showMessage(`Schedule created as ${this.newSchedule.type} (${this.newSchedule.cadence}).`);
        this.saveSessionState();
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to create schedule.", "error");
      } finally {
        this.isCreatingSchedule = false;
      }
    },

    async onScheduleSelected() {
      if (
        this.schedules.some(
          (s) => Number(s.ID) === Number(this.selectedScheduleID) && s.type !== "template"
        )
      ) {
        this.lastScheduleTabSelectionID = this.selectedScheduleID;
      }
      await this.loadShiftsForSelectedSchedule();
      this.jumpCalendarToDate(this.selectedSchedule?.start_date);
      this.refreshScheduleEditorFromSelected();
      this.saveSessionState();
    },

    async onTemplateSelected() {
      const templateID = Number(this.templateApply.templateScheduleID);
      if (!Number.isFinite(templateID) || templateID <= 0) return;

      const template = this.schedules.find((s) => Number(s.ID) === templateID && s.type === "template");
      if (!template) return;

      this.selectedScheduleID = templateID;
      await this.loadShiftsForSelectedSchedule();
      this.jumpCalendarToDate(template.start_date);
      this.saveSessionState();
    },

    async loadShiftsForSelectedSchedule() {
      if (!this.selectedScheduleID) {
        this.shifts = [];
        this.userShiftAssignmentsByShiftID = {};
        return;
      }

      const shifts = await shiftServices.getAll({ scheduleID: this.selectedScheduleID });
      this.shifts = Array.isArray(shifts) ? shifts : [];

      await Promise.all(this.shifts.map((shift) => this.loadAssignmentsForShift(shift.ID)));
      this.$nextTick(() => this.$refs.managerCalendar?.updateSize());
    },

    async loadAssignmentsForShift(shiftID) {
      let rows = [];
      try {
        rows = await userShiftServices.getAll({ shiftID });
      } catch (e) {
        console.error("Failed to load shift assignments:", e);
        this.showMessage(
          e?.response?.data?.message || "Could not load shift assignments.",
          "warning"
        );
      }
      this.userShiftAssignmentsByShiftID = {
        ...this.userShiftAssignmentsByShiftID,
        [shiftID]: Array.isArray(rows) ? rows : [],
      };
    },

    openCreateShiftModal(selection) {
      if (!this.selectedScheduleID) {
        this.showMessage("Create or select a schedule first.", "warning");
        return;
      }

      const start = new Date(selection.start);
      const end = new Date(selection.end);

      this.shiftDialog.mode = "create";
      this.shiftDialog.shiftID = null;
      this.shiftDialog.form = {
        shift_date: start.toISOString().slice(0, 10),
        start_time: start.toTimeString().slice(0, 5),
        end_time: end.toTimeString().slice(0, 5),
        workers_required: Number(this.managerSettings.default_shift_workers_required) || 1,
        positionID: this.positionItems[0]?.value ?? null,
        assignedWorkerIDs: [],
      };
      this.shiftDialog.open = true;
    },

    async openEditShiftModal(event) {
      const shiftID = Number(event?.id ?? event?._def?.publicId ?? event?.extendedProps?.shiftID);
      const shift = this.shifts.find((s) => Number(s.ID) === shiftID);
      if (!shift) return;

      await this.loadAssignmentsForShift(shiftID);
      const assignments = this.userShiftAssignmentsByShiftID[shiftID] || [];

      this.shiftDialog.mode = "edit";
      this.shiftDialog.shiftID = shiftID;
      this.shiftDialog.form = {
        shift_date: shift.shift_date,
        start_time: this.toHHMM(shift.start_time),
        end_time: this.toHHMM(shift.end_time),
        workers_required: shift.workers_required || 1,
        positionID: shift.positionID,
        assignedWorkerIDs: assignments.map((a) => a.userID),
      };
      this.shiftDialog.open = true;
    },

    closeShiftDialog() {
      this.shiftDialog.open = false;
    },

    async saveShift() {
      if (!this.canSaveShift) return;

      try {
        this.isSavingShift = true;
        const form = this.shiftDialog.form;
        let shiftID = this.shiftDialog.shiftID;

        const shiftPayload = {
          shift_date: form.shift_date,
          start_time: this.toHHMM(form.start_time),
          end_time: this.toHHMM(form.end_time),
          workers_required: Number(form.workers_required) || 1,
          scheduleID: this.selectedScheduleID,
          positionID: form.positionID || null,
        };

        const overlapError = this.validateShiftOverlap(shiftPayload, shiftID);
        if (overlapError) {
          this.showMessage(overlapError, "warning");
          return;
        }

        if (this.shiftDialog.mode === "create") {
          const createdShift = await shiftServices.create(shiftPayload);
          shiftID =
            createdShift?.ID ??
            createdShift?.id ??
            createdShift?.data?.ID ??
            createdShift?.data?.id ??
            null;
          // New shifts move non-template schedules back to draft while planning.
          try {
            if (this.selectedSchedule?.type !== "template") {
              await scheduleServices.update(this.selectedScheduleID, { type: "draft" });
              this.schedules = this.schedules.map((s) =>
                Number(s.ID) === Number(this.selectedScheduleID) ? { ...s, type: "draft" } : s
              );
              this.scheduleEditor.type = "draft";
            }
          } catch (statusErr) {
            console.warn("Could not set schedule type to draft:", statusErr);
          }
        } else {
          await shiftServices.update(shiftID, shiftPayload);
        }

        if (!shiftID) {
          this.showMessage("Shift saved but shift ID was not returned.", "warning");
          await this.loadShiftsForSelectedSchedule();
          this.closeShiftDialog();
          return;
        }

        const existing = await userShiftServices.getAll({ shiftID });
        const existingRows = Array.isArray(existing) ? existing : [];
        const existingByUserID = existingRows.reduce((acc, row) => {
          acc[row.userID] = row;
          return acc;
        }, {});

        const nextUserIDs = new Set(
          form.assignedWorkerIDs
            .map((id) => this.normalizeUserID(id))
            .filter((id) => id !== null)
        );
        const existingUserIDs = new Set(
          existingRows
            .map((row) => this.normalizeUserID(row.userID))
            .filter((id) => id !== null)
        );

        const assignmentErrors = [];

        for (const existingUserID of existingUserIDs) {
          if (!nextUserIDs.has(existingUserID)) {
            const row = existingByUserID[existingUserID];
            if (row?.ID) {
              try {
                await userShiftServices.delete(row.ID);
              } catch (err) {
                assignmentErrors.push(
                  err?.response?.data?.message || `Failed removing worker ${existingUserID}.`
                );
              }
            }
          }
        }

        for (const userID of nextUserIDs) {
          if (!existingUserIDs.has(userID)) {
            try {
              await userShiftServices.create({
                shiftID,
                userID,
                status: "assigned",
              });
            } catch (err) {
              assignmentErrors.push(
                err?.response?.data?.message || `Failed assigning worker ${userID}.`
              );
            }
          }
        }

        await this.loadShiftsForSelectedSchedule();
        this.closeShiftDialog();
        if (assignmentErrors.length > 0) {
          this.showMessage(`Shift saved, but assignments failed: ${assignmentErrors[0]}`, "warning");
        } else {
          this.showMessage("Shift saved.");
        }
      } catch (e) {
        console.error(e);
        const message =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to save shift.";
        this.showMessage(message, "error");
      } finally {
        this.isSavingShift = false;
      }
    },

    async deleteShift() {
      if (!this.shiftDialog.shiftID) return;

      try {
        this.isDeletingShift = true;
        await shiftServices.delete(this.shiftDialog.shiftID);
        await this.loadShiftsForSelectedSchedule();
        this.closeShiftDialog();
        this.showMessage("Shift deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to delete shift.", "error");
      } finally {
        this.isDeletingShift = false;
      }
    },
  },
};
</script>
