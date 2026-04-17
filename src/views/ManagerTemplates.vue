<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card elevation="2" class="pa-4 bg-white rounded-lg workspace-shell">
      <div class="workspace-header mb-4">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="text-overline workspace-kicker">Templates</div>
            <div class="text-h5 font-weight-bold">{{ selectedTemplateName }}</div>
          </div>

          <div class="d-flex align-center flex-wrap justify-end ga-2">
            <v-chip color="blue" variant="tonal" size="small">Template</v-chip>
            <v-chip size="small" variant="tonal" color="teal">
              {{ shifts.length }} shifts
            </v-chip>
          </div>
        </div>

        <v-row dense class="align-end schedule-toolbar">
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedTemplateID"
              label="Open Template"
              :items="templateItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              :menu-props="selectMenuProps"
              @update:modelValue="onTemplateSelected"
            />
          </v-col>

          <v-col cols="12" md="4" lg="3">
            <v-text-field
              v-model="templateEditor.name"
              label="Template Name"
              variant="outlined"
              density="compact"
              hide-details
              :disabled="!selectedTemplate"
            />
          </v-col>

          <v-col cols="12" md="4" lg="6">
            <div class="d-flex ga-2 flex-wrap justify-start justify-lg-end">
              <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="createTemplateDialog = true">
                New
              </v-btn>
              <v-btn
                v-if="selectedTemplate"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-calendar-plus"
                @click="openApplyTemplateDialog"
              >
                Use Template
              </v-btn>
              <v-btn
                v-if="selectedTemplate"
                color="primary"
                variant="tonal"
                :loading="isSavingTemplate"
                @click="updateSelectedTemplate"
              >
                Save
              </v-btn>
              <v-btn
                v-if="selectedTemplate"
                color="error"
                variant="tonal"
                :loading="isDeletingTemplate"
                @click="deleteSelectedTemplate"
              >
                Delete
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mt-3">

          <v-btn variant="text" color="primary" prepend-icon="mdi-calendar-month-outline" to="/manager">
            Back To Schedule
          </v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">
        {{ error }}
      </v-alert>

      <v-alert
        v-if="!error && templates.length === 0 && !loading"
        type="info"
        variant="tonal"
        class="mb-3"
      >
        No templates yet
      </v-alert>

      <div class="calendar-frame">
        <Calendar
          ref="templateCalendar"
          :events="calendarEvents"
          initialView="timeGridWeek"
          :isEditable="false"
          :isSelectable="true"
          :height="760"
          :contentHeight="700"
          @time-selected="openCreateShiftModal"
          @shift-clicked="openEditShiftModal"
        />
      </div>
    </v-card>

    <v-dialog v-model="createTemplateDialog" max-width="640" eager>
      <v-card>
        <v-card-title class="text-h6">Create Template</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTemplate.name"
            label="Template Name"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createTemplateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="isCreatingTemplate"
            :disabled="!canCreateTemplate"
            @click="createTemplate"
          >
            Create Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="shiftDialog.open" max-width="560" eager>
      <v-card>
        <v-card-title class="text-h6">
          {{ shiftDialog.mode === "create" ? "Create Template Shift" : "Edit Template Shift" }}
        </v-card-title>
        <v-card-text>
          <v-alert v-if="!selectedTemplateID" type="warning" variant="tonal" density="compact" class="mb-3">
            Select or create a template before adding a shift
  
          </v-alert>

          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field v-model="shiftDialog.form.shift_date" label="Shift Date" type="date" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="shiftDialog.form.start_time" label="Start Time" type="time" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="shiftDialog.form.end_time" label="End Time" type="time" variant="outlined" />
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
                clearable
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
              />
            </v-col>
          </v-row>
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
          <v-btn color="primary" :loading="isSavingShift" :disabled="!canSaveShift" @click="saveShift">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="applyTemplateDialog" max-width="560" eager>
      <v-card>
        <v-card-title class="text-h6">Create Schedule From Template</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="templateApply.anchor_date"
            label="Week Of"
            type="date"
            variant="outlined"
          />
          <v-text-field
            v-model="templateApply.name"
            label="New Schedule Name (Optional)"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="applyTemplateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="isApplyingTemplate"
            :disabled="!canApplyTemplate"
            @click="createScheduleFromTemplate"
          >
            Create Schedule
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteConfirm.open" max-width="460">
      <v-card>
        <v-card-title class="text-h6">Delete Template</v-card-title>
        <v-card-text>
          Are you sure you want to delete this?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteConfirm.open = false">Cancel</v-btn>
          <v-btn color="error" variant="tonal" :loading="isDeletingTemplate" @click="performDeleteTemplate">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import positionServices from "../services/positionServices.js";

export default {
  name: "ManagerTemplates",
  components: { Calendar },
  data() {
    return {
      loading: false,
      error: "",
      managerDepartmentID: null,
      templates: [],
      selectedTemplateID: null,
      shifts: [],
      positionsByID: {},
      createTemplateDialog: false,
      isCreatingTemplate: false,
      isSavingTemplate: false,
      isDeletingTemplate: false,
      isApplyingTemplate: false,
      isSavingShift: false,
      isDeletingShift: false,
      applyTemplateDialog: false,
      templateEditor: { name: "" },
      newTemplate: {
        name: "",
      },
      templateApply: {
        anchor_date: "",
        name: "",
      },
      selectMenuProps: {
        attach: "body",
        location: "bottom start",
        locationStrategy: "connected",
        origin: "auto",
        maxHeight: 280,
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
        },
      },
      deleteConfirm: { open: false },
      snackbar: { show: false, message: "", color: "success" },
    };
  },
  computed: {
    templateItems() {
      return this.templates.map((t) => ({ value: t.ID, label: t.name || "Untitled Template" }));
    },
    selectedTemplate() {
      return this.templates.find((t) => Number(t.ID) === Number(this.selectedTemplateID)) || null;
    },
    selectedTemplateName() {
      return this.selectedTemplate?.name || "No template selected";
    },
    positionItems() {
      return Object.values(this.positionsByID).map((p) => ({
        value: p.positionID || p.ID,
        label: p.title || `Position ${p.positionID || p.ID}`,
      }));
    },
    canCreateTemplate() {
      return !!this.managerDepartmentID && !!String(this.newTemplate.name || "").trim();
    },
    canSaveShift() {
      const f = this.shiftDialog.form;
      if (!this.selectedTemplateID || !f.shift_date || !f.start_time || !f.end_time || Number(f.workers_required) < 1) return false;
      return new Date(`${f.shift_date}T${this.toHHMM(f.start_time)}:00`) < new Date(`${f.shift_date}T${this.toHHMM(f.end_time)}:00`);
    },
    canApplyTemplate() {
      return !!this.selectedTemplateID && !!this.templateApply.anchor_date;
    },
    calendarEvents() {
      return this.shifts.map((shift) => {
        const position = this.positionsByID[shift.positionID];
        const title = `${position?.title || "Shift"} (${shift.workers_required || 1} needed)`;
        return {
          id: String(shift.ID),
          title,
          start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
          end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
          color: "#1976d2",
          extendedProps: { shiftID: shift.ID },
        };
      });
    },
  },
  async mounted() {
    this.templateApply.anchor_date = this.toISODate(new Date());
    await this.bootstrap();
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
      start.setDate(start.getDate() - start.getDay());
      return start;
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
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

      const managerLink = links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];
      return managerLink?.departmentID ?? null;
    },
    async bootstrap() {
      this.loading = true;
      this.error = "";
      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.error = "No manager department found.";
          return;
        }
        await Promise.all([this.loadPositions(), this.loadTemplates()]);
        const routeTemplateID = Number(this.$route?.query?.templateID);
        if (Number.isFinite(routeTemplateID) && this.templates.some((t) => Number(t.ID) === routeTemplateID)) {
          this.selectedTemplateID = routeTemplateID;
        } else if (!this.selectedTemplateID && this.templates.length > 0) {
          this.selectedTemplateID = this.templates[0].ID;
        }
        if (this.selectedTemplateID) await this.onTemplateSelected();
      } catch (e) {
        console.error(e);
        this.error = e?.response?.data?.message || "Failed to load templates.";
      } finally {
        this.loading = false;
      }
    },
    async loadTemplates() {
      const res = await scheduleServices.getAll({ departmentID: this.managerDepartmentID, type: "template", limit: 200 });
      this.templates = Array.isArray(res?.schedules) ? res.schedules : [];
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
    async onTemplateSelected() {
      const template = this.selectedTemplate;
      this.templateEditor.name = template?.name || "";
      await this.loadShiftsForSelectedTemplate();
      if (template?.start_date) {
        this.$nextTick(() => this.$refs.templateCalendar?.goToDate?.(template.start_date));
      }
    },
    async loadShiftsForSelectedTemplate() {
      if (!this.selectedTemplateID) {
        this.shifts = [];
        return;
      }
      const shifts = await shiftServices.getAll({ scheduleID: this.selectedTemplateID });
      this.shifts = Array.isArray(shifts) ? shifts : [];
      this.$nextTick(() => this.$refs.templateCalendar?.updateSize?.());
    },
    async createTemplate() {
      if (!this.canCreateTemplate) return;
      try {
        this.isCreatingTemplate = true;
        const today = this.toISODate(new Date());
        const created = await scheduleServices.create({
          name: String(this.newTemplate.name || "").trim(),
          start_date: today,
          end_date: today,
          type: "template",
          departmentID: this.managerDepartmentID,
        });
        const template = created?.data || created;
        this.templates = [template, ...this.templates];
        this.selectedTemplateID = template.ID;
        this.createTemplateDialog = false;
        await this.onTemplateSelected();
        this.showMessage("Template created.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to create template.", "error");
      } finally {
        this.isCreatingTemplate = false;
      }
    },
    async updateSelectedTemplate() {
      if (!this.selectedTemplateID) return;
      try {
        this.isSavingTemplate = true;
        const res = await scheduleServices.update(this.selectedTemplateID, {
          name: String(this.templateEditor.name || "").trim() || null,
          type: "template",
        });
        const updated = res?.data;
        this.templates = this.templates.map((t) => Number(t.ID) === Number(this.selectedTemplateID) ? { ...t, ...(updated || {}), name: this.templateEditor.name } : t);
        this.showMessage("Template saved.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to save template.", "error");
      } finally {
        this.isSavingTemplate = false;
      }
    },
    deleteSelectedTemplate() {
      if (!this.selectedTemplateID) return;
      this.deleteConfirm.open = true;
    },
    openApplyTemplateDialog() {
      if (!this.selectedTemplate) return;
      this.templateApply.anchor_date = this.toISODate(new Date());
      this.applyTemplateDialog = true;
    },
    async createScheduleFromTemplate() {
      if (!this.canApplyTemplate || !this.selectedTemplate) return;

      try {
        this.isApplyingTemplate = true;
        const template = this.selectedTemplate;
        const sourceShifts = await shiftServices.getAll({ scheduleID: template.ID });
        const templateShifts = Array.isArray(sourceShifts) ? sourceShifts : [];

        const targetStart = this.getStartOfWeek(new Date(`${this.templateApply.anchor_date}T00:00:00`));
        const shiftDates = templateShifts
          .map((shift) => new Date(`${shift.shift_date}T00:00:00`))
          .filter((date) => !Number.isNaN(date.getTime()));
        const sourceStart = shiftDates.length
          ? new Date(Math.min(...shiftDates.map((date) => date.getTime())))
          : new Date(`${template.start_date}T00:00:00`);
        const sourceEnd = shiftDates.length
          ? new Date(Math.max(...shiftDates.map((date) => date.getTime())))
          : new Date(`${template.end_date}T00:00:00`);
        const totalDays = Math.round((sourceEnd - sourceStart) / (1000 * 60 * 60 * 24));
        const targetEnd = this.addDays(targetStart, totalDays);
        const dayOffset = Math.round((targetStart - sourceStart) / (1000 * 60 * 60 * 24));

        const createdScheduleRes = await scheduleServices.create({
          name:
            String(this.templateApply.name || "").trim() ||
            `${template.name || "Schedule"} ${this.toISODate(targetStart)}`,
          start_date: this.toISODate(targetStart),
          end_date: this.toISODate(targetEnd),
          type: "draft",
          departmentID: this.managerDepartmentID,
        });
        const createdSchedule = createdScheduleRes?.data || createdScheduleRes;
        const newScheduleID = createdSchedule?.ID;
        if (!newScheduleID) throw new Error("Could not create schedule from template.");

        for (const shift of templateShifts) {
          const original = new Date(`${shift.shift_date}T00:00:00`);
          const shifted = this.addDays(original, dayOffset);
          await shiftServices.create({
            shift_date: this.toISODate(shifted),
            start_time: this.toHHMM(shift.start_time),
            end_time: this.toHHMM(shift.end_time),
            workers_required: shift.workers_required || 1,
            scheduleID: newScheduleID,
            positionID: shift.positionID || null,
          });
        }

        this.applyTemplateDialog = false;
        this.showMessage("Schedule created from template.");
        this.$router.push({ path: "/manager", query: { scheduleID: String(newScheduleID) } });
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || e?.message || "Failed to create schedule from template.", "error");
      } finally {
        this.isApplyingTemplate = false;
      }
    },
    async performDeleteTemplate() {
      if (!this.selectedTemplateID) return;
      try {
        this.isDeletingTemplate = true;
        const deletingID = this.selectedTemplateID;
        await scheduleServices.delete(deletingID);
        this.templates = this.templates.filter((t) => Number(t.ID) !== Number(deletingID));
        this.selectedTemplateID = this.templates[0]?.ID || null;
        this.deleteConfirm.open = false;
        await this.onTemplateSelected();
        this.showMessage("Template deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to delete template.", "error");
      } finally {
        this.isDeletingTemplate = false;
      }
    },
    openCreateShiftModal(selection) {
      if (!this.selectedTemplateID) {
        this.showMessage("Create or select a template first.", "warning");
        return;
      }
      const start = new Date(selection.start);
      const end = new Date(selection.end);
      this.shiftDialog = {
        open: true,
        mode: "create",
        shiftID: null,
        form: {
          shift_date: start.toISOString().slice(0, 10),
          start_time: start.toTimeString().slice(0, 5),
          end_time: end.toTimeString().slice(0, 5),
          workers_required: 1,
          positionID: null,
        },
      };
    },
    openEditShiftModal(event) {
      const shiftID = Number(event?.id ?? event?._def?.publicId ?? event?.extendedProps?.shiftID);
      const shift = this.shifts.find((s) => Number(s.ID) === shiftID);
      if (!shift) return;
      this.shiftDialog = {
        open: true,
        mode: "edit",
        shiftID,
        form: {
          shift_date: shift.shift_date,
          start_time: this.toHHMM(shift.start_time),
          end_time: this.toHHMM(shift.end_time),
          workers_required: shift.workers_required || 1,
          positionID: shift.positionID || null,
        },
      };
    },
    closeShiftDialog() {
      this.shiftDialog.open = false;
    },
    async saveShift() {
      if (!this.canSaveShift) return;
      try {
        this.isSavingShift = true;
        const f = this.shiftDialog.form;
        const payload = {
          shift_date: f.shift_date,
          start_time: this.toHHMM(f.start_time),
          end_time: this.toHHMM(f.end_time),
          workers_required: Number(f.workers_required) || 1,
          scheduleID: this.selectedTemplateID,
          positionID: f.positionID || null,
        };
        if (this.shiftDialog.mode === "create") {
          await shiftServices.create(payload);
        } else {
          await shiftServices.update(this.shiftDialog.shiftID, payload);
        }
        await this.loadShiftsForSelectedTemplate();
        this.closeShiftDialog();
        this.showMessage("Template shift saved.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to save template shift.", "error");
      } finally {
        this.isSavingShift = false;
      }
    },
    async deleteShift() {
      if (!this.shiftDialog.shiftID) return;
      try {
        this.isDeletingShift = true;
        await shiftServices.delete(this.shiftDialog.shiftID);
        await this.loadShiftsForSelectedTemplate();
        this.closeShiftDialog();
        this.showMessage("Template shift deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to delete template shift.", "error");
      } finally {
        this.isDeletingShift = false;
      }
    },
  },
};
</script>

<style scoped>
.workspace-shell {
  border-radius: 24px;
}

.workspace-header {
  padding: 8px 8px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.workspace-kicker {
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.schedule-summary-sheet {
  min-height: 56px;
  background: linear-gradient(180deg, rgba(128, 22, 43, 0.05) 0%, rgba(128, 22, 43, 0.01) 100%);
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
