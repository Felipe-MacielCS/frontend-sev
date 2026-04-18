<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card elevation="2" class="pa-4 bg-white rounded-lg workspace-shell">
      <div class="workspace-header mb-4">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="text-overline workspace-kicker">Schedule</div>
            <div class="text-h5 font-weight-bold">{{ currentCalendarScheduleName }}</div>
          </div>

          <div class="d-flex align-center flex-wrap justify-end ga-2">
            <v-chip size="small" variant="outlined" color="error">
              {{ unassignedShiftCount }} unassigned
            </v-chip>
          </div>
        </div>

        <v-row dense class="align-end schedule-toolbar">
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedScheduleID"
              label="Open Schedule"
              :items="scheduleItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              :menu-props="selectMenuProps"
              @update:modelValue="onScheduleSelected"
            />
          </v-col>

          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedPositionFilter"
              label="Position"
              :items="positionFilterItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              :menu-props="selectMenuProps"
            />
          </v-col>

          <v-col cols="12" md="4" lg="6">
            <div class="d-flex ga-2 flex-wrap justify-start justify-lg-end">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus"
                @click="openCreateScheduleDialog"
              >
                New
              </v-btn>
              <v-btn
                v-if="selectedSchedule"
                color="primary"
                variant="tonal"
                :disabled="selectedSchedule?.type === 'official'"
                :loading="isUpdatingSchedule"
                @click="setSelectedScheduleActive"
              >
                {{ selectedSchedule?.type === "official" ? "Active" : "Set as Active" }}
              </v-btn>
              <v-btn
                v-if="selectedSchedule"
                color="error"
                variant="tonal"
                :loading="isDeletingSchedule"
                @click="deleteSelectedSchedule"
              >
                Delete
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <div class="d-flex align-center justify-start flex-wrap ga-2 mt-3">
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-calendar-plus"
            :disabled="!selectedSchedule"
            @click="openCreateShift"
          >
            New Shift
          </v-btn>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-content-copy"
            :disabled="!selectedSchedule"
            @click="openGenerateTemplateDialog"
          >
            Generate Template
          </v-btn>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-repeat"
            :disabled="!selectedSchedule || !shifts.length"
            @click="openRepeatShiftsDialog"
          >
            Repeat Shifts
          </v-btn>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-file-document-outline"
            to="/manager/templates"
          >
            Manage Templates
          </v-btn>
        </div>
      </div>

      <div class="calendar-frame">
        <Calendar
          ref="managerCalendar"
          :events="calendarEvents"
          initialView="timeGridWeek"
          :isEditable="false"
          :isSelectable="true"
          :height="760"
          :contentHeight="700"
          :firstDay="managerSettings.schedule_week_starts_monday ? 1 : 0"
          :slotEventOverlap="false"
          @dates-changed="saveSessionState"
          @time-selected="openCreateShift"
          @shift-clicked="openEditShiftModal"
        />
      </div>
    </v-card>

    <v-dialog v-model="createScheduleDialog" max-width="640" eager>
      <v-card>
        <v-card-title class="text-h6">Create Schedule</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="newSchedule.anchor_date"
                label="Week Of"
                type="date"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-sheet rounded="lg" class="pa-3 generated-range-sheet" border>
            <div class="text-caption generated-range-label">Date Range</div>
            <div class="text-body-1 font-weight-medium generated-range-value">
              {{ computedScheduleRangeLabel || "Choose a week to generate the schedule." }}
            </div>
          </v-sheet>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createScheduleDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="isCreatingSchedule"
            :disabled="!canCreateSchedule"
            @click="createSchedule"
          >
            Create Schedule
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="repeatShiftsDialog.open" max-width="520" eager>
      <v-card>
        <v-card-title class="text-h6">Repeat Shifts</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="repeatShiftsDialog.weeks"
            label="Number of Future Weeks"
            type="number"
            min="1"
            variant="outlined"
            density="comfortable"
          />

          <div class="text-body-2 text-medium-emphasis">
            Copies the first week of shifts into future weeks as separate shifts, so each copied week can still be edited on its own.
          </div>
          <div v-if="repeatScheduleEndLabel" class="text-body-2 text-medium-emphasis mt-2">
            The current schedule will extend through {{ repeatScheduleEndLabel }}.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeRepeatShiftsDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="repeatShiftsDialog.saving"
            :disabled="!canRepeatShifts"
            @click="repeatShifts"
          >
            Repeat Shifts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteConfirm.open" max-width="460">
      <v-card>
        <v-card-title class="text-h6">{{ deleteConfirm.title }}</v-card-title>
        <v-card-text>
          {{ deleteConfirm.message }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteConfirm">Cancel</v-btn>
          <v-btn
            color="error"
            variant="tonal"
            :loading="deleteConfirm.loading"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="generateTemplateDialog.open" max-width="560" eager>
      <v-card>
        <v-card-title class="text-h6">Generate Template From Schedule</v-card-title>
        <v-card-text>


          <v-text-field
            v-model="generateTemplateDialog.name"
            label="Template Name"
            variant="outlined"
            density="comfortable"
          />

        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeGenerateTemplateDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="generateTemplateDialog.saving"
            :disabled="!canGenerateTemplate"
            @click="generateTemplateFromSchedule"
          >
            Generate Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="shiftDialog.open" max-width="640" eager>
      <v-card>
        <v-card-title class="text-h6">
          {{ shiftDialog.mode === "create" ? "Create Shift" : "Edit Shift" }}
        </v-card-title>

        <v-card-text>


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
                label="Position"
                variant="outlined"
                density="comfortable"
                :menu-props="selectMenuProps"
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
            :menu-props="selectMenuProps"
            :hint="shiftDialogAvailabilitySummary"
            persistent-hint
          >

            <template #item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.subtitle">
                <template #append>
                  <v-chip
                    :color="item.raw.available ? 'success' : 'warning'"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ item.raw.available ? "Available" : "Unavailable" }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-select
            v-model="shiftDialog.form.selectedTaskListIDs"
            :items="tasklistItems"
            item-title="label"
            item-value="value"
            label="Tasklists"
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
import shiftTaskListServices from "../services/shiftTaskListServices.js";
import taskListServices from "../services/taskListServices.js";
import userShiftServices from "../services/userShiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
import positionServices from "../services/positionServices.js";
import settingsServices from "../services/settingsServices.js";
import settingsValuesServices from "../services/settingsValuesServices.js";
import { getPositionColor, UNASSIGNED_SHIFT_COLOR } from "../utils/positionColors.js";
import unavailableServices from "../services/unavailableServices.js";
import { emitNotificationRefresh } from "../services/notificationSync.js";

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
      createScheduleDialog: false,

      newSchedule: {
        anchor_date: "",
        type: "draft",
      },

      
      scheduleTypeOptions: [
        { label: "Draft", value: "draft" },
        { label: "Template", value: "template" },
        { label: "Official", value: "official" },
      ],

      schedules: [],
      selectedScheduleID: null,
      selectedPositionFilter: "all",
      lastScheduleTabSelectionID: null,
      scheduleEditor: {
        name: "",
        type: "draft",
      },
      templateApply: {
        templateScheduleID: null,
        anchor_date: "",
        type: "draft",
      },

      shifts: [],
      userShiftAssignmentsByShiftID: {},
      shiftTaskListsByShiftID: {},
      workersByID: {},
      positionsByID: {},
      tasklists: [],
      unavailabilityBlocks: [],
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
          selectedTaskListIDs: [],
        },
      },
      deleteConfirm: {
        open: false,
        target: null,
        title: "Delete",
        message: "",
        loading: false,
      },
      generateTemplateDialog: {
        open: false,
        saving: false,
        name: "",
      },
      repeatShiftsDialog: {
        open: false,
        saving: false,
        weeks: 1,
      },

      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
      selectMenuProps: {
        attach: "body",
        location: "bottom start",
        locationStrategy: "connected",
        origin: "auto",
        maxHeight: 280,
      },
    };
  },

  computed: {
    computedScheduleRange() {
      if (!this.newSchedule.anchor_date) return null;
      const weekStart = this.getStartOfWeek(new Date(`${this.newSchedule.anchor_date}T00:00:00`));
      const weekEnd = this.addDays(weekStart, 6);

      return {
        start_date: this.toISODate(weekStart),
        end_date: this.toISODate(weekEnd),
      };
    },

    computedScheduleRangeLabel() {
      if (!this.computedScheduleRange) return "";
      return this.formatScheduleRange(this.computedScheduleRange);
    },

    creatableScheduleTypeOptions() {
      return this.scheduleTypeOptions.filter((option) => option.value !== "official");
    },

    editableScheduleTypeOptions() {
      return this.scheduleTypeOptions.filter(
        (option) => option.value !== "template" && option.value !== "official"
      );
    },

    canCreateSchedule() {
      const hasCoreFields =
        !!this.managerDepartmentID &&
        !!this.newSchedule.anchor_date;
      if (!hasCoreFields) return false;

      return !!this.computedScheduleRange;
    },

    canRepeatShifts() {
      return (
        !!this.selectedSchedule &&
        this.shifts.length > 0 &&
        Number(this.repeatShiftsDialog.weeks) >= 1
      );
    },

    repeatScheduleEndLabel() {
      if (!this.selectedSchedule || Number(this.repeatShiftsDialog.weeks) < 1) return "";
      const scheduleStart = new Date(`${this.selectedSchedule.start_date}T00:00:00`);
      const futureWeeks = Math.max(1, Number(this.repeatShiftsDialog.weeks) || 1);
      const repeatedEnd = this.addDays(scheduleStart, ((futureWeeks + 1) * 7) - 1);
      return this.formatDisplayDate(this.toISODate(repeatedEnd));
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

    canGenerateTemplate() {
      return (
        !!this.selectedSchedule &&
        this.selectedSchedule.type !== "template" &&
        !!String(this.generateTemplateDialog.name || "").trim()
      );
    },

    canSaveShift() {
      const f = this.shiftDialog.form;
      if (
        !this.selectedScheduleID ||
        !f.shift_date ||
        !f.start_time ||
        !f.end_time ||
        !f.positionID ||
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
          label: `${this.formatScheduleRange(s)} | ${this.formatScheduleType(s.type)}`,
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
      return this.formatScheduleRange(schedule);
    },

    positionItems() {
      const list = Object.values(this.positionsByID);
      return list.map((p) => ({ value: p.positionID || p.ID, label: p.title || `Position ${p.positionID || p.ID}` }));
    },

    positionFilterItems() {
      return [
        { value: "all", label: "All Positions" },
        ...this.positionItems,
      ];
    },

    filteredShifts() {
      if (this.selectedPositionFilter === "all") return this.shifts;
      return this.shifts.filter(
        (shift) => String(shift.positionID || "") === String(this.selectedPositionFilter)
      );
    },

    workerItems() {
      const availabilityByWorkerID = this.shiftDialogAvailabilityByWorkerID;
      const list = Object.values(this.workersByID);

      return list
        .map((w) => {
          const id = Number(w.ID ?? w.userID ?? w.id);
          if (!Number.isFinite(id) || id <= 0) return null;

          const label = w.name || `Worker ${id}`;
          const availability = availabilityByWorkerID[id] || {
            available: true,
            subtitle: "Set the shift date and time to check availability.",
          };

          return {
            value: id,
            label,
            available: availability.available,
            subtitle: availability.subtitle,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.available !== b.available) return a.available ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
    },

    shiftDialogWindow() {
      const shiftDate = this.shiftDialog?.form?.shift_date;
      const startTime = this.toHHMM(this.shiftDialog?.form?.start_time);
      const endTime = this.toHHMM(this.shiftDialog?.form?.end_time);

      if (!shiftDate || !startTime || !endTime) return null;

      const start = new Date(`${shiftDate}T${startTime}:00`);
      const end = new Date(`${shiftDate}T${endTime}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return null;
      }

      return { start, end };
    },

    shiftDialogAvailabilityByWorkerID() {
      const window = this.shiftDialogWindow;
      const blocks = Array.isArray(this.unavailabilityBlocks) ? this.unavailabilityBlocks : [];

      return Object.values(this.workersByID).reduce((map, worker) => {
        const id = Number(worker.ID ?? worker.userID ?? worker.id);
        if (!Number.isFinite(id) || id <= 0) return map;

        if (!window) {
          map[id] = {
            available: true,
            subtitle: "Set the shift date and time to check availability.",
          };
          return map;
        }

        const unavailable = blocks.some(
          (block) => Number(block.userID) === id && this.doDateRangesOverlap(window.start, window.end, block.start, block.end)
        );

        map[id] = {
          available: !unavailable,
          subtitle: unavailable ? "Marked unavailable for this shift." : "Available for this shift.",
        };
        return map;
      }, {});
    },

    availableWorkerItems() {
      return this.workerItems.filter((item) => item.available);
    },

    unavailableWorkerItems() {
      return this.workerItems.filter((item) => !item.available);
    },

    shiftDialogAvailabilitySummary() {
      if (!this.shiftDialogWindow) {
        return "Set the shift date and time to see worker availability.";
      }

      return `${this.availableWorkerItems.length} available, ${this.unavailableWorkerItems.length} unavailable`;
    },

    availableWorkerNamesText() {
      if (!this.shiftDialogWindow) {
        return "Set the shift date and time first.";
      }

      return this.availableWorkerItems.length
        ? this.availableWorkerItems.map((item) => item.label).join(", ")
        : "None";
    },

    unavailableWorkerNamesText() {
      if (!this.shiftDialogWindow) {
        return "Set the shift date and time first.";
      }

      return this.unavailableWorkerItems.length
        ? this.unavailableWorkerItems.map((item) => item.label).join(", ")
        : "None";
    },

    tasklistItems() {
      return this.tasklists.map((tasklist) => ({
        value: tasklist.ID,
        label: tasklist.name || `Tasklist ${tasklist.ID}`,
      }));
    },

    calendarEvents() {
      return this.filteredShifts.map((shift) => {
        const shiftID = shift.ID;
        const assignments = this.userShiftAssignmentsByShiftID[shiftID] || [];
        const tasklistCount = (this.shiftTaskListsByShiftID[shiftID] || []).length;
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
        const titleWithTasklists = tasklistCount
          ? `${title} | ${tasklistCount} tasklist${tasklistCount === 1 ? "" : "s"}`
          : title;

        const color =
          assignedCount === 0
            ? UNASSIGNED_SHIFT_COLOR
            : getPositionColor(position, shift.positionID);

        return {
          id: String(shift.ID),
          title: titleWithTasklists,
          start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
          end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
          color,
          borderColor: assignedCount >= required ? color : UNASSIGNED_SHIFT_COLOR,
          textColor: "#ffffff",
          extendedProps: {
            shiftID: shift.ID,
            positionID: shift.positionID || null,
          },
        };
      });
    },

    unassignedShiftCount() {
      return this.filteredShifts.filter((shift) => {
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
    selectedPositionFilter() {
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

    formatDisplayDate(dateValue) {
      if (!dateValue) return "";
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) return String(dateValue);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },

    formatScheduleRange(schedule) {
      if (!schedule?.start_date || !schedule?.end_date) return "";
      return `${this.formatDisplayDate(schedule.start_date)} to ${this.formatDisplayDate(schedule.end_date)}`;
    },

    formatScheduleType(type) {
      const normalized = String(type || "").trim().toLowerCase();
      if (normalized === "official") return "Active";
      return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
    },
    toHMS(value, fallback = "00:00:00") {
      return String(value || fallback).slice(0, 8);
    },

    normalizeResponseArray(response, keys = []) {
      if (Array.isArray(response)) return response;
      for (const key of keys) {
        if (Array.isArray(response?.[key])) return response[key];
      }
      if (Array.isArray(response?.data)) return response.data;
      return [];
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

    normalizeUnavailabilityBlock(rawBlock) {
      const userID = this.normalizeUserID(rawBlock?.userID ?? rawBlock?.user?.userID ?? rawBlock?.user?.ID);
      const startDate = rawBlock?.start_date;
      const endDate = rawBlock?.end_date;
      const startTime = this.toHMS(rawBlock?.start_time, "00:00:00");
      const endTime = this.toHMS(rawBlock?.end_time, "23:59:59");

      return {
        id: rawBlock?.ID ?? rawBlock?.id,
        userID,
        start: new Date(`${startDate}T${startTime}`),
        end: new Date(`${endDate}T${endTime}`),
      };
    },

    async loadUnavailability() {
      const workerIDs = new Set(
        Object.keys(this.workersByID)
          .map((key) => Number(key))
          .filter((id) => Number.isFinite(id) && id > 0)
      );

      if (!workerIDs.size) {
        this.unavailabilityBlocks = [];
        return;
      }

      try {
        const response = await unavailableServices.getAll({ limit: 1000 });
        const rows = this.normalizeResponseArray(response, ["unavailabilities"]);
        this.unavailabilityBlocks = rows
          .map((row) => this.normalizeUnavailabilityBlock(row))
          .filter((block) => block.id && workerIDs.has(Number(block.userID)));
      } catch (error) {
        console.error("Failed to load worker unavailability:", error);
        this.unavailabilityBlocks = [];
      }
    },

    doDateRangesOverlap(rangeStart, rangeEnd, blockStart, blockEnd) {
      const start = rangeStart instanceof Date ? rangeStart.getTime() : new Date(rangeStart).getTime();
      const end = rangeEnd instanceof Date ? rangeEnd.getTime() : new Date(rangeEnd).getTime();
      const blockStartTime = blockStart instanceof Date ? blockStart.getTime() : new Date(blockStart).getTime();
      const blockEndTime = blockEnd instanceof Date ? blockEnd.getTime() : new Date(blockEnd).getTime();

      if ([start, end, blockStartTime, blockEndTime].some((value) => Number.isNaN(value))) return false;
      return start < blockEndTime && blockStartTime < end;
    },

    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },

    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },

    openCreateScheduleDialog() {
      this.newSchedule.type = "draft";
      this.createScheduleDialog = true;
    },

    openRepeatShiftsDialog() {


      this.repeatShiftsDialog = {
        open: true,
        saving: false,
        weeks: 1,
      };
    },

    closeRepeatShiftsDialog() {
      this.repeatShiftsDialog = {
        open: false,
        saving: false,
        weeks: 1,
      };
    },

    openDeleteConfirm(target) {
      this.deleteConfirm = {
        open: true,
        target,
        loading: false,
        title: target === "template" ? "Delete Template" : "Delete Schedule",
        message:
          target === "template"
            ? "Are you sure you want to delete this template? This cannot be undone."
            : "Are you sure you want to delete this schedule? This cannot be undone.",
      };
    },

    closeDeleteConfirm() {
      this.deleteConfirm = {
        open: false,
        target: null,
        title: "Delete",
        message: "",
        loading: false,
      };
    },

    openGenerateTemplateDialog() {
      if (!this.selectedSchedule) return;
      this.generateTemplateDialog = {
        open: true,
        saving: false,
        name: `Template ${this.formatScheduleRange(this.selectedSchedule)}`,
      };
    },

    closeGenerateTemplateDialog() {
      this.generateTemplateDialog = {
        open: false,
        saving: false,
        name: "",
      };
    },

    async generateTemplateFromSchedule() {
      if (!this.canGenerateTemplate) return;

      try {
        this.generateTemplateDialog.saving = true;
        const sourceSchedule = this.selectedSchedule;
        const sourceShifts = await shiftServices.getAll({ scheduleID: sourceSchedule.ID });
        const shiftsToCopy = Array.isArray(sourceShifts) ? sourceShifts : [];

        const createdTemplateRes = await scheduleServices.create({
          name: String(this.generateTemplateDialog.name || "").trim(),
          start_date: sourceSchedule.start_date,
          end_date: sourceSchedule.end_date,
          type: "template",
          departmentID: this.managerDepartmentID,
        });
        const createdTemplate = createdTemplateRes?.data || createdTemplateRes;
        const templateID = createdTemplate?.ID;
        if (!templateID) throw new Error("Could not create template.");

        for (const shift of shiftsToCopy) {
          await shiftServices.create({
            shift_date: shift.shift_date,
            start_time: this.toHHMM(shift.start_time),
            end_time: this.toHHMM(shift.end_time),
            workers_required: shift.workers_required || 1,
            scheduleID: templateID,
            positionID: shift.positionID || null,
          });
        }

        await this.loadSchedules();
        this.closeGenerateTemplateDialog();

      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || e?.message || "Failed to generate template.", "error");
      } finally {
        this.generateTemplateDialog.saving = false;
      }
    },

    async confirmDelete() {
      if (!this.deleteConfirm.target) return;

      this.deleteConfirm.loading = true;
      try {
        if (this.deleteConfirm.target === "template") {
          await this.performDeleteSelectedTemplate();
        } else {
          await this.performDeleteSelectedSchedule();
        }
        this.closeDeleteConfirm();
      } catch (error) {
        console.error("Delete confirmation failed:", error);
        this.deleteConfirm.loading = false;
      }
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
        if (String(shift.positionID || "") !== String(shiftPayload.positionID || "")) return false;
        return this.getShiftOverlapMinutes(shiftPayload, shift) > allowedMinutes;
      });

      if (!conflictingShift) return null;

      return `This shift overlaps another shift in the same position`;
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
            selectedPositionFilter: this.selectedPositionFilter,
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


      this.activePanel = "schedules";
      this.selectedScheduleID = state.selectedScheduleID || null;
      this.selectedPositionFilter = state.selectedPositionFilter || "all";
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
        const payload = { name: null };
        const res = await scheduleServices.update(this.selectedScheduleID, payload);
        const updated = res?.data || null;
        const keepSelectedID = this.selectedScheduleID;
        await this.loadSchedules();

        this.selectedScheduleID = keepSelectedID;
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(updated?.start_date || this.selectedSchedule?.start_date);
        this.refreshScheduleEditorFromSelected();
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to update schedule.", "error");
      } finally {
        this.isUpdatingSchedule = false;
      }
    },

    async setSelectedScheduleActive() {
      if (!this.selectedScheduleID || this.selectedSchedule?.type === "official") return;
      try {
        this.isUpdatingSchedule = true;
        const res = await scheduleServices.update(this.selectedScheduleID, { type: "official" });
        const updated = res?.data || null;
        const keepSelectedID = this.selectedScheduleID;
        await this.loadSchedules();
        this.selectedScheduleID = keepSelectedID;
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(updated?.start_date || this.selectedSchedule?.start_date);
        this.refreshScheduleEditorFromSelected();
      } catch (e) {
        console.error(e);
        this.showMessage(
          e?.response?.data?.message ||
            "Failed to set schedule as active.",
          "error"
        );
      } finally {
        this.isUpdatingSchedule = false;
      }
    },

    deleteSelectedSchedule() {
      if (!this.selectedScheduleID) return;
      this.openDeleteConfirm("schedule");
    },

    async performDeleteSelectedSchedule() {
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
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to delete schedule.", "error");
      } finally {
        this.isDeletingSchedule = false;
      }
    },

    deleteSelectedTemplate() {
      const templateID = Number(this.templateApply.templateScheduleID);
      if (!Number.isFinite(templateID) || templateID <= 0) return;
      this.openDeleteConfirm("template");
    },

    async performDeleteSelectedTemplate() {
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
          name: null,
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
          const createdShift = await shiftServices.create({
            shift_date: this.toISODate(shifted),
            start_time: this.toHHMM(s.start_time),
            end_time: this.toHHMM(s.end_time),
            workers_required: s.workers_required || 1,
            scheduleID: newScheduleID,
            positionID: s.positionID || null,
          });
          const createdShiftID = createdShift?.ID ?? createdShift?.id ?? createdShift?.data?.ID;
          if (createdShiftID) {
            const sourceTasklists = await shiftTaskListServices.getAll({ shiftID: s.ID });
            const selectedTaskListIDs = Array.isArray(sourceTasklists)
              ? sourceTasklists.map((row) => row.task_listID)
              : [];
            await this.syncShiftTasklists(createdShiftID, selectedTaskListIDs);
          }
        }

        await this.loadSchedules();
        this.selectedScheduleID = newScheduleID;
        if (this.templateApply.type !== "template") {
          this.lastScheduleTabSelectionID = newScheduleID;
        }
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(createdSchedule?.start_date || this.toISODate(targetStart));
        this.refreshScheduleEditorFromSelected();
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
        await Promise.all([
          this.loadWorkers(),
          this.loadPositions(),
          this.loadTasklists(),
          this.loadManagerSettings(),
          this.loadSchedules(),
        ]);
        await this.loadUnavailability();

        const routeScheduleID = Number(this.$route?.query?.scheduleID);
        const routeTemplateID = Number(this.$route?.query?.templateID);
        if (Number.isFinite(routeScheduleID) && routeScheduleID > 0) {
          const exists = this.schedules.some((s) => Number(s.ID) === routeScheduleID && s.type !== "template");
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
          this.$router.push({
            path: "/manager/templates",
            query: { templateID: String(routeTemplateID) },
          });
          return;
        }

        if (
          restoredState?.selectedScheduleID &&
          this.schedules.some(
            (s) => Number(s.ID) === Number(restoredState.selectedScheduleID) && s.type !== "template"
          )
        ) {
          this.selectedScheduleID = restoredState.selectedScheduleID;
          this.activePanel = "schedules";
          await this.onScheduleSelected();
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

    async syncShiftTasklists(shiftID, selectedTaskListIDs = []) {
      const currentRows = await shiftTaskListServices.getAll({ shiftID });
      const existingRows = Array.isArray(currentRows) ? currentRows : [];
      const existingIDs = new Set(existingRows.map((row) => String(row.task_listID)));
      const nextIDs = new Set(
        selectedTaskListIDs
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
          .map((id) => String(id))
      );

      const tasklistIDsToAdd = [...nextIDs].filter((id) => !existingIDs.has(id));
      const tasklistRowsToRemove = existingRows.filter(
        (row) => !nextIDs.has(String(row.task_listID))
      );

      await Promise.all([
        ...tasklistIDsToAdd.map((taskListID) =>
          shiftTaskListServices.create({
            shiftID,
            task_listID: Number(taskListID),
          })
        ),
        ...tasklistRowsToRemove.map((row) =>
          row.ID
            ? shiftTaskListServices.delete(row.ID)
            : shiftTaskListServices.deleteByPair(shiftID, row.task_listID)
        ),
      ]);
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

      if (
        this.selectedPositionFilter !== "all" &&
        !this.positionsByID[this.selectedPositionFilter]
      ) {
        this.selectedPositionFilter = "all";
      }
    },

    async loadTasklists() {
      const res = await taskListServices.getAll({ departmentID: this.managerDepartmentID });
      this.tasklists = Array.isArray(res) ? res : [];
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

      if (!this.selectedScheduleID && scheduleIDs.size > 0) {
        this.selectedScheduleID = this.getPreferredDefaultScheduleID();
        await this.loadShiftsForSelectedSchedule();
        const first = this.schedules.find((s) => Number(s.ID) === Number(this.selectedScheduleID));
        this.jumpCalendarToDate(first?.start_date);
        this.refreshScheduleEditorFromSelected();
      }
    },

    async createSchedule() {
      if (!this.canCreateSchedule) return;

      try {
        this.isCreatingSchedule = true;
        const range = this.computedScheduleRange;

        const payload = {
          name: null,
          start_date: range.start_date,
          end_date: range.end_date,
          type: "draft",
          departmentID: this.managerDepartmentID,
        };

        const created = await scheduleServices.create(payload);
        const createdSchedule = created?.data || created;

        this.schedules = [createdSchedule, ...this.schedules];
        this.selectedScheduleID = createdSchedule?.ID ?? this.selectedScheduleID;
        this.lastScheduleTabSelectionID = createdSchedule?.ID ?? this.lastScheduleTabSelectionID;
        this.activePanel = "schedules";
        this.createScheduleDialog = false;
        await this.loadShiftsForSelectedSchedule();
        this.jumpCalendarToDate(createdSchedule?.start_date || range.start_date);
        this.refreshScheduleEditorFromSelected();

        this.saveSessionState();
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to create schedule.", "error");
      } finally {
        this.isCreatingSchedule = false;
      }
    },

    async repeatShifts() {
      if (!this.canRepeatShifts) return;

      try {
        this.repeatShiftsDialog.saving = true;
        const schedule = this.selectedSchedule;
        const futureWeeks = Math.max(1, Number(this.repeatShiftsDialog.weeks) || 1);
        const scheduleStart = new Date(`${schedule.start_date}T00:00:00`);
        const firstWeekEnd = this.addDays(scheduleStart, 6);
        const sourceShifts = this.shifts.filter((shift) => {
          const shiftDate = new Date(`${shift.shift_date}T00:00:00`);
          return shiftDate >= scheduleStart && shiftDate <= firstWeekEnd;
        });



        const existingKeys = new Set(
          this.shifts.map((shift) =>
            [
              shift.shift_date,
              this.toHHMM(shift.start_time),
              this.toHHMM(shift.end_time),
              shift.positionID || "",
            ].join("|")
          )
        );

        let createdCount = 0;
        let assignmentCount = 0;
        let scheduleExtendedTo = "";
        for (let week = 1; week <= futureWeeks; week += 1) {
          for (const shift of sourceShifts) {
            const shiftedDate = this.addDays(new Date(`${shift.shift_date}T00:00:00`), week * 7);
            const shiftDate = this.toISODate(shiftedDate);
            const key = [
              shiftDate,
              this.toHHMM(shift.start_time),
              this.toHHMM(shift.end_time),
              shift.positionID || "",
            ].join("|");

            if (existingKeys.has(key)) continue;
            existingKeys.add(key);

            const createdShiftResponse = await shiftServices.create({
              shift_date: shiftDate,
              start_time: this.toHHMM(shift.start_time),
              end_time: this.toHHMM(shift.end_time),
              workers_required: shift.workers_required || 1,
              scheduleID: schedule.ID,
              positionID: shift.positionID || null,
            });
            const createdShift = createdShiftResponse?.data || createdShiftResponse;
            const createdShiftID = createdShift?.ID ?? createdShift?.id ?? null;

            if (createdShiftID) {
              const assignments = this.userShiftAssignmentsByShiftID[shift.ID] || [];
              for (const assignment of assignments) {
                await userShiftServices.create({
                  shiftID: createdShiftID,
                  userID: assignment.userID,
                  status: assignment.status || "assigned",
                });
                assignmentCount += 1;
              }
            }

            createdCount += 1;
          }
        }

        const currentEnd = new Date(`${schedule.end_date}T00:00:00`);
        const repeatedEnd = this.addDays(scheduleStart, ((futureWeeks + 1) * 7) - 1);
        if (repeatedEnd > currentEnd) {
          scheduleExtendedTo = this.toISODate(repeatedEnd);
          const updated = await scheduleServices.update(schedule.ID, {
            end_date: scheduleExtendedTo,
          });
          const updatedSchedule = updated?.data || updated || {};
          this.schedules = this.schedules.map((item) =>
            Number(item.ID) === Number(schedule.ID)
              ? { ...item, ...updatedSchedule, end_date: scheduleExtendedTo }
              : item
          );
        }

        await this.loadShiftsForSelectedSchedule();
        this.closeRepeatShiftsDialog();
        this.refreshScheduleEditorFromSelected();
        

        this.saveSessionState();
      } catch (error) {
        console.error("Failed to repeat shifts:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to repeat shifts.", "error");
      } finally {
        this.repeatShiftsDialog.saving = false;
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
        this.shiftTaskListsByShiftID = {};
        return;
      }

      const shifts = await shiftServices.getAll({ scheduleID: this.selectedScheduleID });
      this.shifts = Array.isArray(shifts) ? shifts : [];

      await Promise.all([
        ...this.shifts.map((shift) => this.loadAssignmentsForShift(shift.ID)),
        ...this.shifts.map((shift) => this.loadTasklistsForShift(shift.ID)),
      ]);
      this.$nextTick(() => this.$refs.managerCalendar?.updateSize());
    },

    async loadAssignmentsForShift(shiftID) {
      let rows = [];
      try {
        rows = await userShiftServices.getAll({ shiftID });
      } catch (e) {
        console.error("Failed to load shift assignments:", e);
      }
      this.userShiftAssignmentsByShiftID = {
        ...this.userShiftAssignmentsByShiftID,
        [shiftID]: Array.isArray(rows) ? rows : [],
      };
    },

    openCreateShift(selection = null) {
    

      let start;
      let end;

      if (selection?.start && selection?.end) {
        start = new Date(selection.start);
        end = new Date(selection.end);
      } else {
        const selectedDate =
          this.$refs.managerCalendar?.getCurrentDate?.() ||
          this.currentCalendarSchedule?.start_date ||
          this.toISODate(new Date());
    async loadTasklistsForShift(shiftID) {
      let rows = [];
      try {
        rows = await shiftTaskListServices.getAll({ shiftID });
      } catch (e) {
        console.error("Failed to load shift tasklists:", e);
      }
      this.shiftTaskListsByShiftID = {
        ...this.shiftTaskListsByShiftID,
        [shiftID]: Array.isArray(rows) ? rows : [],
      };
    },

    async openCreateShiftModal(selection) {
      if (!this.selectedScheduleID) {
        this.showMessage("Create or select a schedule first.", "warning");
        return;
      }

        start = new Date(`${selectedDate}T09:00:00`);
        end = new Date(`${selectedDate}T10:00:00`);
      }

      this.shiftDialog.mode = "create";
      this.shiftDialog.shiftID = null;
      this.shiftDialog.form = {
        shift_date: this.toISODate(start),
        start_time: start.toTimeString().slice(0, 5),
        end_time: end.toTimeString().slice(0, 5),
        workers_required: Number(this.managerSettings.default_shift_workers_required) || 1,
        positionID: null,
        assignedWorkerIDs: [],
        selectedTaskListIDs: [],
      };

      await this.loadUnavailability();
      this.shiftDialog.open = true;
    },



    async openEditShiftModal(event) {
      const shiftID = Number(event?.id ?? event?._def?.publicId ?? event?.extendedProps?.shiftID);
      const shift = this.shifts.find((s) => Number(s.ID) === shiftID);
      if (!shift) return;

      await Promise.all([
        this.loadAssignmentsForShift(shiftID),
        this.loadTasklistsForShift(shiftID),
        this.loadUnavailability(),
      ]);
      const assignments = this.userShiftAssignmentsByShiftID[shiftID] || [];
      const tasklistLinks = this.shiftTaskListsByShiftID[shiftID] || [];

      this.shiftDialog.mode = "edit";
      this.shiftDialog.shiftID = shiftID;
      this.shiftDialog.form = {
        shift_date: shift.shift_date,
        start_time: this.toHHMM(shift.start_time),
        end_time: this.toHHMM(shift.end_time),
        workers_required: shift.workers_required || 1,
        positionID: shift.positionID,
        assignedWorkerIDs: assignments.map((a) => a.userID),
        selectedTaskListIDs: tasklistLinks.map((link) => link.task_listID),
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
          positionID: form.positionID,
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

          await this.loadShiftsForSelectedSchedule();
          this.closeShiftDialog();
          emitNotificationRefresh();
          return;
        }

        await this.syncShiftTasklists(shiftID, form.selectedTaskListIDs);

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
        emitNotificationRefresh();
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
        emitNotificationRefresh();
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

.new-schedule-btn {
  min-height: 48px;
}

.workspace-switcher :deep(.v-btn) {
  justify-content: flex-start;
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

.generated-range-sheet {
  background: rgba(var(--v-theme-surface-variant), 0.35);
}

.generated-range-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.generated-range-value {
  color: rgb(var(--v-theme-on-surface));
}
</style>

