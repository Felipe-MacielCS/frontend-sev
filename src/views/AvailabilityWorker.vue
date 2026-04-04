<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <h1 class="text-h4 text-center font-weight-bold mb-6">My Unavailability</h1>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="bg-white rounded-lg">
          <v-card-title class="d-flex align-center justify-space-between px-4 pt-3 pb-1">
            <span class="text-subtitle-1 font-weight-bold">Calendar</span>
            <div class="d-flex flex-wrap align-center ga-2">
              <v-btn
                color="primary"
                size="small"
                variant="tonal"
                prepend-icon="mdi-calendar-import"
                @click="openCalendarDialog"
              >
                Import Calendar
              </v-btn>
              <v-btn
                color="primary"
                size="small"
                variant="flat"
                prepend-icon="mdi-plus"
                @click="openQuickAddDialog"
              >
                Add
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pa-2">
            <Calendar
              :events="unavailabilityBlocks"
              initialView="timeGridWeek"
              :isEditable="true"
              :isSelectable="true"
              @time-selected="openAddDialog"
              @shift-clicked="openEditDialog"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="addDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6">
          {{ editingBlockId ? "Edit Unavailability" : "Add Unavailability" }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Time range:
            <strong>{{ formatAddFormRange() }}</strong>
          </p>

          <v-row dense class="mb-1">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addForm.startDate"
                label="Start Date"
                type="date"
                density="comfortable"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addForm.startTime"
                label="Start Time"
                type="time"
                density="comfortable"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-row dense class="mb-2">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addForm.endDate"
                label="End Date"
                type="date"
                density="comfortable"
                variant="outlined"
                :min="addForm.startDate || ''"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addForm.endTime"
                label="End Time"
                type="time"
                density="comfortable"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-select
            v-if="!editingBlockId"
            v-model="addForm.repeatType"
            :items="repeatOptions"
            item-title="label"
            item-value="value"
            label="Repeat"
            density="comfortable"
            variant="outlined"
            class="mb-3"
          />

          <v-text-field
            v-if="!editingBlockId && addForm.repeatType !== 'none'"
            v-model="addForm.repeatUntil"
            label="Repeat Until"
            type="date"
            :min="addForm.startDate || ''"
            density="comfortable"
            variant="outlined"
            hint="Create repeats through this date."
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="editingBlockId"
            color="error"
            variant="text"
            @click="openDeleteDialogFromEdit"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="isSavingUnavailability" @click="saveUnavailability">
            {{ editingBlockId ? "Update" : "Save" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="calendarDialog" max-width="640">
      <v-card>
        <v-card-title class="text-h6">Import Calendar</v-card-title>
        <v-card-text>
          <input
            ref="calendarFileInput"
            type="file"
            accept=".ics,text/calendar"
            class="d-none"
            @change="handleCalendarFileSelected"
          />

          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-upload-outline"
            @click="openCalendarFilePicker"
          >
            Choose .ics File
          </v-btn>

          <div v-if="calendarForm.fileName" class="text-body-2 mt-3">
            {{ calendarForm.fileName }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="calendarDialog = false">Close</v-btn>
          <v-btn
            color="primary"
            :loading="isImportingCalendar"
            @click="importCalendarFeed"
          >
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">Delete Unavailability</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-2">
            Remove this unavailability block?
          </p>
          <p class="text-body-2 mb-0">
            <strong>{{ formatEventRange(pendingDeleteEvent) }}</strong>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="error" :loading="isDeletingUnavailability" @click="confirmDeleteUnavailability">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import calendarServices from "../services/calendarServices.js";
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";

export default {
  name: "WorkerAvailability",
  components: { Calendar },
  data() {
    return {
      user: Utils.getStore("user"),
      unavailabilityBlocks: [],
      calendarDialog: false,
      isImportingCalendar: false,
      calendarForm: {
        fileName: "",
        icalData: "",
      },

      addDialog: false,
      deleteDialog: false,
      isSavingUnavailability: false,
      isDeletingUnavailability: false,
      editingBlockId: null,
      pendingSelection: { start: "", end: "" },
      pendingDeleteEvent: null,
      addForm: {
        repeatType: "none",
        repeatUntil: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: ""
      },
      repeatOptions: [
        { label: "Do not repeat", value: "none" },
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" }
      ],
      snackbar: {
        show: false,
        message: "",
        color: "success"
      }
    };
  },
  mounted() {
    if (this.getCurrentUserID()) {
      this.fetchSavedBlocks();
    }
  },
  methods: {
    isNotFound(error) {
      return Boolean(error?.response?.status === 404);
    },

    pad(value) {
      return String(value).padStart(2, "0");
    },

    formatDateLocal(dateObj) {
      return `${dateObj.getFullYear()}-${this.pad(dateObj.getMonth() + 1)}-${this.pad(dateObj.getDate())}`;
    },

    formatTimeLocal(dateObj) {
      return `${this.pad(dateObj.getHours())}:${this.pad(dateObj.getMinutes())}:${this.pad(dateObj.getSeconds())}`;
    },

    toLocalDateTime(dateObj) {
      return `${this.formatDateLocal(dateObj)}T${this.formatTimeLocal(dateObj)}`;
    },

    parseDateTimeInput(value, fallbackTime) {
      if (!value) return null;
      if (value.includes("T")) {
        return new Date(value);
      }
      return new Date(`${value}T${fallbackTime}`);
    },

    addDays(dateObj, days) {
      const next = new Date(dateObj.getTime());
      next.setDate(next.getDate() + days);
      return next;
    },

    toDateFromForm(dateValue, timeValue, isEndBoundary = false) {
      if (!dateValue) return null;
      const fallback = isEndBoundary ? "23:59:59" : "00:00:00";
      let t = (timeValue || "").trim();
      if (!t) t = fallback;
      if (t.length === 5) t = `${t}:00`;
      return new Date(`${dateValue}T${t}`);
    },

    roundUpToHalfHour(dateObj) {
      const rounded = new Date(dateObj.getTime());
      rounded.setSeconds(0, 0);
      const mins = rounded.getMinutes();
      const add = mins === 0 || mins === 30 ? 0 : mins < 30 ? 30 - mins : 60 - mins;
      rounded.setMinutes(mins + add);
      return rounded;
    },

    getDateTime(date, time) {
      if (!date && !time) return null;
      const safeDate = date || "1970-01-01";
      const safeTime = (time || "00:00:00").toString().substring(0, 8);
      return `${safeDate}T${safeTime}`;
    },

    normalizeBlock(rawBlock) {
      const start =
        rawBlock.start ||
        rawBlock.startDateTime ||
        rawBlock.start_datetime ||
        this.getDateTime(rawBlock.start_date, rawBlock.start_time);
      const end =
        rawBlock.end ||
        rawBlock.endDateTime ||
        rawBlock.end_datetime ||
        this.getDateTime(rawBlock.end_date, rawBlock.end_time);

      return {
        id:
          rawBlock.unavailabilityID ||
          rawBlock.unavailableID ||
          rawBlock.ID ||
          rawBlock.id,
        title: "Unavailable",
        start,
        end,
        reason: rawBlock.reason || rawBlock.title || "",
        color: rawBlock.reason === "Google Sync" ? "#1D4E89" : "#F44336",
        display: "block"
      };
    },

    getFormState(start, end) {
      return {
        repeatType: "none",
        repeatUntil: start ? this.formatDateLocal(start) : "",
        startDate: start ? this.formatDateLocal(start) : "",
        startTime: start ? `${this.pad(start.getHours())}:${this.pad(start.getMinutes())}` : "",
        endDate: end ? this.formatDateLocal(end) : "",
        endTime: end ? `${this.pad(end.getHours())}:${this.pad(end.getMinutes())}` : ""
      };
    },

    showSnackbar(message, color = "success") {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    getCurrentUser() {
      return this.user?.user ?? this.user ?? null;
    },
    getCurrentUserID() {
      const currentUser = this.getCurrentUser();
      const userID = Number(currentUser?.userID ?? currentUser?.ID ?? currentUser?.id);
      return Number.isFinite(userID) && userID > 0 ? userID : null;
    },
    openCalendarDialog() {
      this.calendarDialog = true;
    },
    openCalendarFilePicker() {
      this.$refs.calendarFileInput?.click();
    },
    async handleCalendarFileSelected(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      try {
        this.calendarForm.fileName = file.name || "";
        this.calendarForm.icalData = await file.text();
      } catch (error) {
        console.error("Failed to read calendar file:", error);
        this.calendarForm.fileName = "";
        this.calendarForm.icalData = "";
      } finally {
        if (event?.target) event.target.value = "";
      }
    },
    async importCalendarFeed() {
      const userID = this.getCurrentUserID();
      if (!userID) {
        return;
      }

      if (!String(this.calendarForm.icalData || "").trim()) {
        return;
      }

      try {
        this.isImportingCalendar = true;
        await calendarServices.sync({
          userID,
          icalData: this.calendarForm.icalData,
        });

        await this.fetchSavedBlocks();
        this.calendarDialog = false;
        this.calendarForm.fileName = "";
        this.calendarForm.icalData = "";
      } catch (error) {
        console.error("Failed to import calendar feed:", error?.response?.data || error);
      } finally {
        this.isImportingCalendar = false;
      }
    },

    formatSelectionRange(selection) {
      const start = this.parseDateTimeInput(selection?.start || "", "00:00:00");
      const end = this.parseDateTimeInput(selection?.end || "", "23:59:59");
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Not selected";
      }
      return `${this.toLocalDateTime(start)} to ${this.toLocalDateTime(end)}`;
    },

    formatAddFormRange() {
      const start = this.toDateFromForm(this.addForm.startDate, this.addForm.startTime, false);
      const end = this.toDateFromForm(this.addForm.endDate, this.addForm.endTime, true);
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Not set";
      }
      return `${this.toLocalDateTime(start)} to ${this.toLocalDateTime(end)}`;
    },

    formatEventRange(eventInfo) {
      if (!eventInfo) return "";
      const start = eventInfo.start instanceof Date ? eventInfo.start : this.parseDateTimeInput(eventInfo.start || "", "00:00:00");
      const end = eventInfo.end instanceof Date ? eventInfo.end : this.parseDateTimeInput(eventInfo.end || "", "23:59:59");
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
      return `${this.toLocalDateTime(start)} to ${this.toLocalDateTime(end)}`;
    },

    async fetchSavedBlocks() {
      const userID = this.getCurrentUserID();
      if (!userID) return;

      const endpoints = [
        { path: `/unavailable/user/${userID}`, params: { limit: 1000 } },
        { path: "/unavailable", params: { userID, limit: 1000 } },
        { path: "/unavailable" }
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint.path, {
            params: endpoint.params || {}
          });
          const blocksArray = response?.unavailabilities || response?.data || response;

          if (Array.isArray(blocksArray)) {
            this.unavailabilityBlocks = blocksArray
              .map(this.normalizeBlock)
              .filter((b) => b.start && b.end);
            return;
          }
        } catch (error) {
          if (!this.isNotFound(error)) {
            console.error("Error loading unavailabilities:", error);
            return;
          }
        }
      }
    },

    openAddDialog(timeInfo) {
      const start = this.parseDateTimeInput(timeInfo.start, "00:00:00");
      const end = this.parseDateTimeInput(timeInfo.end, "23:59:59");
      this.editingBlockId = null;
      this.pendingSelection = { start: timeInfo.start, end: timeInfo.end };
      this.addForm = this.getFormState(start, end);
      this.addDialog = true;
    },

    openQuickAddDialog() {
      const start = this.roundUpToHalfHour(new Date());
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      this.editingBlockId = null;
      this.pendingSelection = {
        start: this.toLocalDateTime(start),
        end: this.toLocalDateTime(end)
      };
      this.addForm = this.getFormState(start, end);
      this.addDialog = true;
    },

    openEditDialog(eventInfo) {
      const start = eventInfo?.start instanceof Date
        ? eventInfo.start
        : this.parseDateTimeInput(eventInfo?.start || "", "00:00:00");
      const end = eventInfo?.end instanceof Date
        ? eventInfo.end
        : this.parseDateTimeInput(eventInfo?.end || "", "23:59:59");

      if (!eventInfo?.id || !start || !end) {
        this.showSnackbar("Could not load this unavailability block.", "error");
        return;
      }

      this.editingBlockId = eventInfo.id;
      this.pendingSelection = {
        start: this.toLocalDateTime(start),
        end: this.toLocalDateTime(end)
      };
      this.addForm = this.getFormState(start, end);
      this.addDialog = true;
    },

    closeAddDialog() {
      this.addDialog = false;
      this.editingBlockId = null;
      this.pendingSelection = { start: "", end: "" };
    },

    buildSlotsFromSelection() {
      const baseStart = this.toDateFromForm(this.addForm.startDate, this.addForm.startTime, false);
      const baseEnd = this.toDateFromForm(this.addForm.endDate, this.addForm.endTime, true);
      if (!baseStart || !baseEnd || Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
        return [];
      }
      if (baseEnd <= baseStart) {
        return [];
      }

      const repeatType = this.addForm.repeatType;
      const stepDays = repeatType === "daily" ? 1 : repeatType === "weekly" ? 7 : 0;
      const baseStartDateOnly = new Date(this.formatDateLocal(baseStart));

      const slots = [];
      if (repeatType === "none") {
        slots.push({
          start: baseStart,
          end: baseEnd
        });
        return slots;
      }

      if (!this.addForm.repeatUntil) return [];

      const repeatUntilDateOnly = new Date(this.addForm.repeatUntil);
      if (Number.isNaN(repeatUntilDateOnly.getTime()) || repeatUntilDateOnly < baseStartDateOnly) {
        return [];
      }

      let cursorStart = new Date(baseStart.getTime());
      let cursorEnd = new Date(baseEnd.getTime());
      let guard = 0;
      while (guard < 400) {
        const cursorDateOnly = new Date(this.formatDateLocal(cursorStart));
        if (cursorDateOnly > repeatUntilDateOnly) break;

        slots.push({
          start: new Date(cursorStart.getTime()),
          end: new Date(cursorEnd.getTime())
        });

        cursorStart = this.addDays(cursorStart, stepDays);
        cursorEnd = this.addDays(cursorEnd, stepDays);
        guard += 1;
      }

      return slots;
    },

    async createUnavailabilitySlot(slot, reason, isRecurring) {
      const userID = this.getCurrentUserID();
      const payload = {
        userID,
        start_date: this.formatDateLocal(slot.start),
        end_date: this.formatDateLocal(slot.end),
        start_time: this.formatTimeLocal(slot.start),
        end_time: this.formatTimeLocal(slot.end),
        reason,
        isRecurring
      };

      return apiClient.post("/unavailable", payload);
    },

    async updateUnavailabilitySlot(id, slot, reason) {
      const userID = this.getCurrentUserID();
      const payload = {
        userID,
        start_date: this.formatDateLocal(slot.start),
        end_date: this.formatDateLocal(slot.end),
        start_time: this.formatTimeLocal(slot.start),
        end_time: this.formatTimeLocal(slot.end),
        reason,
        isRecurring: false
      };

      return apiClient.put(`/unavailable/${id}`, payload);
    },

    async saveUnavailability() {
      const slots = this.buildSlotsFromSelection();
      if (!slots.length) {
        this.showSnackbar("Invalid selected range or repeat-until date.", "error");
        return;
      }

      this.isSavingUnavailability = true;

      const reason = "Unavailable";
      const isRecurring = this.addForm.repeatType !== "none";
      let createdCount = 0;
      let failedCount = 0;
      let lastErrorMessage = "";

      try {
        if (this.editingBlockId) {
          await this.updateUnavailabilitySlot(this.editingBlockId, slots[0], reason);
          await this.fetchSavedBlocks();
          this.showSnackbar("Unavailability updated.");
          this.closeAddDialog();
          return;
        }

        for (const slot of slots) {
          try {
            await this.createUnavailabilitySlot(slot, reason, isRecurring);
            createdCount += 1;
          } catch (error) {
            failedCount += 1;
            lastErrorMessage = error?.response?.data?.message || error?.message || "Unknown error";
          }
        }

        await this.fetchSavedBlocks();

        if (failedCount === 0) {
          this.showSnackbar(
            createdCount === 1
              ? "Unavailability added."
              : `${createdCount} unavailability blocks added.`
          );
          this.closeAddDialog();
          return;
        }

        if (createdCount > 0) {
          this.showSnackbar(
            `${createdCount} created, ${failedCount} failed. Last error: ${lastErrorMessage}`,
            "warning"
          );
          this.closeAddDialog();
          return;
        }

        this.showSnackbar(`Could not save unavailability. ${lastErrorMessage}`, "error");
      } catch (error) {
        console.error("Error saving unavailability:", error);
        this.showSnackbar("Could not save unavailability. Please try again.", "error");
      } finally {
        this.isSavingUnavailability = false;
      }
    },

    openDeleteDialog(eventInfo) {
      this.pendingDeleteEvent = {
        id: eventInfo.id,
        start: eventInfo.start,
        end: eventInfo.end
      };
      this.deleteDialog = true;
    },

    openDeleteDialogFromEdit() {
      const start = this.toDateFromForm(this.addForm.startDate, this.addForm.startTime, false);
      const end = this.toDateFromForm(this.addForm.endDate, this.addForm.endTime, true);

      if (!this.editingBlockId || !start || !end) {
        this.showSnackbar("Could not determine which block to delete.", "error");
        return;
      }

      this.addDialog = false;
      this.openDeleteDialog({
        id: this.editingBlockId,
        start,
        end
      });
    },

    closeDeleteDialog() {
      this.deleteDialog = false;
      this.pendingDeleteEvent = null;
    },

    async confirmDeleteUnavailability() {
      if (!this.pendingDeleteEvent?.id) {
        this.showSnackbar("Could not determine which block to delete.", "error");
        return;
      }

      this.isDeletingUnavailability = true;
      const id = this.pendingDeleteEvent.id;

      try {
        await apiClient.delete(`/unavailable/${id}`);
        this.unavailabilityBlocks = this.unavailabilityBlocks.filter(
          (block) => String(block.id) !== String(id)
        );
        this.showSnackbar("Unavailability deleted.");
        this.editingBlockId = null;
        this.closeDeleteDialog();
      } catch (error) {
        console.error("Error deleting unavailability:", error);
        this.showSnackbar("Could not delete unavailability.", "error");
      } finally {
        this.isDeletingUnavailability = false;
      }
    }
  }
};
</script>

<style scoped>
:deep(.fc-header-toolbar) {
}
</style>








