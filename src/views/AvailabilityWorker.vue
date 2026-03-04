<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <h1 class="text-h4 text-center font-weight-bold mb-6">My Unavailability</h1>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="bg-white rounded-lg">
          <v-card-title class="d-flex align-center justify-space-between px-4 pt-3 pb-1">
            <span class="text-subtitle-1 font-weight-bold">Calendar</span>
            <v-btn
              icon
              variant="text"
              aria-label="Open calendar settings"
              @click="googleSettingsDialog = true"
            >
              <v-icon>mdi-cog-outline</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-2">
            <Calendar
              :events="unavailabilityBlocks"
              initialView="timeGridWeek"
              :isEditable="true"
              :isSelectable="true"
              @time-selected="openAddDialog"
              @shift-clicked="openDeleteDialog"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="googleSettingsDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Google Calendar Settings</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="googleIcalUrl"
            label="Private iCal URL"
            placeholder="webcal://... or https://..."
            density="comfortable"
            variant="outlined"
            class="mb-2"
          />
          <p class="text-caption text-medium-emphasis mb-3">
            Use your private Google Calendar iCal link. All-day events are ignored during import.
          </p>

          <v-alert
            v-if="googleStatusMessage"
            :type="googleStatusType"
            density="compact"
            variant="tonal"
            class="mb-3"
          >
            {{ googleStatusMessage }}
          </v-alert>

          <v-btn
            block
            color="primary"
            class="mb-2"
            :loading="isConnectingGoogle"
            :disabled="isConnectingGoogle || !user?.userID"
            @click="connectGoogleCalendar"
          >
            {{ googleConnected ? "Reconnect Google Calendar" : "Link Google Calendar" }}
          </v-btn>

          <v-btn
            block
            color="secondary"
            variant="tonal"
            :loading="isSyncingGoogle"
            :disabled="isSyncingGoogle || !user?.userID || !googleConnected"
            @click="syncGoogleCalendar"
          >
            Import Google Events
          </v-btn>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="googleSettingsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6">Add Unavailability</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Selected time:
            <strong>{{ formatSelectionRange(pendingSelection) }}</strong>
          </p>

          <v-textarea
            v-model="addForm.reason"
            label="Reason (optional)"
            density="comfortable"
            rows="2"
            auto-grow
            variant="outlined"
            class="mb-3"
          />

          <v-select
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
            v-if="addForm.repeatType !== 'none'"
            v-model="addForm.repeatUntil"
            label="Repeat Until"
            type="date"
            :min="pendingSelection.start ? pendingSelection.start.split('T')[0] : ''"
            density="comfortable"
            variant="outlined"
            hint="Create repeats through this date."
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="isSavingUnavailability" @click="saveUnavailability">
            Save
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
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";

export default {
  name: "WorkerAvailability",
  components: { Calendar },
  data() {
    return {
      user: Utils.getStore("user"),
      unavailabilityBlocks: [],

      addDialog: false,
      deleteDialog: false,
      isSavingUnavailability: false,
      isDeletingUnavailability: false,
      pendingSelection: { start: "", end: "" },
      pendingDeleteEvent: null,
      addForm: {
        reason: "Manual Block",
        repeatType: "none",
        repeatUntil: ""
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
      },

      googleSettingsDialog: false,
      googleConnected: false,
      googleIcalUrl: "",
      isConnectingGoogle: false,
      isSyncingGoogle: false,
      googleStatusMessage: "",
      googleStatusType: "info"
    };
  },
  mounted() {
    if (this.user && this.user.userID) {
      this.fetchSavedBlocks();
      this.fetchGoogleConnectionStatus();
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
        title: rawBlock.title || "Unavailable",
        start,
        end,
        color: "#F44336",
        display: "block"
      };
    },

    showSnackbar(message, color = "success") {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    formatSelectionRange(selection) {
      const start = this.parseDateTimeInput(selection?.start || "", "00:00:00");
      const end = this.parseDateTimeInput(selection?.end || "", "23:59:59");
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Not selected";
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
      const endpoints = [
        { path: `/unavailable/user/${this.user.userID}` },
        { path: "/unavailable", params: { userID: this.user.userID } },
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
      this.pendingSelection = { start: timeInfo.start, end: timeInfo.end };
      this.addForm = {
        reason: "Manual Block",
        repeatType: "none",
        repeatUntil: this.pendingSelection.start ? this.pendingSelection.start.split("T")[0] : ""
      };
      this.addDialog = true;
    },

    closeAddDialog() {
      this.addDialog = false;
      this.pendingSelection = { start: "", end: "" };
    },

    buildSlotsFromSelection() {
      const baseStart = this.parseDateTimeInput(this.pendingSelection.start, "00:00:00");
      const baseEnd = this.parseDateTimeInput(this.pendingSelection.end, "23:59:59");
      if (!baseStart || !baseEnd || Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
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
      const payload = {
        userID: this.user.userID,
        start_date: this.formatDateLocal(slot.start),
        end_date: this.formatDateLocal(slot.end),
        start_time: this.formatTimeLocal(slot.start),
        end_time: this.formatTimeLocal(slot.end),
        reason,
        isRecurring
      };

      return apiClient.post("/unavailable", payload);
    },

    async saveUnavailability() {
      const slots = this.buildSlotsFromSelection();
      if (!slots.length) {
        this.showSnackbar("Invalid selected range or repeat-until date.", "error");
        return;
      }

      this.isSavingUnavailability = true;

      const reason = (this.addForm.reason || "").trim() || "Manual Block";
      const isRecurring = this.addForm.repeatType !== "none";
      let createdCount = 0;
      let failedCount = 0;
      let lastErrorMessage = "";

      try {
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
        this.closeDeleteDialog();
      } catch (error) {
        console.error("Error deleting unavailability:", error);
        this.showSnackbar("Could not delete unavailability.", "error");
      } finally {
        this.isDeletingUnavailability = false;
      }
    },

    async fetchGoogleConnectionStatus() {
      try {
        const response = await apiClient.get("/calendar/status", {
          params: { userID: this.user.userID }
        });

        this.googleConnected = Boolean(response?.connected);
        this.googleIcalUrl = response?.icalUrl || "";
      } catch (error) {
        console.error("Error loading Google Calendar status:", error);
      }
    },

    async connectGoogleCalendar() {
      this.isConnectingGoogle = true;
      this.googleStatusMessage = "";

      try {
        const icalUrl = (this.googleIcalUrl || "").trim();
        if (!icalUrl) {
          this.googleStatusType = "warning";
          this.googleStatusMessage = "Paste your private iCal URL first.";
          return;
        }

        const response = await apiClient.post("/calendar/connect", {
          userID: this.user.userID,
          icalUrl
        });

        this.googleConnected = Boolean(response?.connected ?? true);
        this.googleIcalUrl = response?.icalUrl || icalUrl;
        this.googleStatusType = "success";
        this.googleStatusMessage = "Google Calendar linked successfully.";
      } catch (error) {
        console.error("Error connecting Google Calendar:", error);
        this.googleStatusType = "error";
        this.googleStatusMessage =
          error?.response?.data?.message || "Could not connect Google Calendar. Please try again.";
      } finally {
        this.isConnectingGoogle = false;
      }
    },

    async syncGoogleCalendar() {
      this.isSyncingGoogle = true;
      this.googleStatusMessage = "";

      try {
        const response = await apiClient.post("/calendar/sync", {
          userID: this.user.userID,
          skipAllDay: true
        });

        const imported = response?.imported ?? 0;
        const stats = response?.stats || {};
        const skippedAllDay = stats?.skippedAllDay ?? 0;
        const skippedZeroDuration = stats?.skippedZeroDuration ?? 0;

        this.googleConnected = true;
        await this.fetchSavedBlocks();
        if (imported > 0) {
          this.googleStatusType = "success";
          this.googleStatusMessage = `Google Calendar import complete: ${imported} event(s) imported.`;
        } else {
          this.googleStatusType = "info";
          this.googleStatusMessage =
            `No events imported (0). Skipped all-day: ${skippedAllDay}, skipped zero-duration: ${skippedZeroDuration}.`;
        }
      } catch (error) {
        console.error("Error syncing Google Calendar:", error);
        this.googleStatusType = "error";
        this.googleStatusMessage =
          error?.response?.data?.message || "Could not import Google Calendar events.";
      } finally {
        this.isSyncingGoogle = false;
      }
    }
  }
};
</script>

<style scoped>
:deep(.fc-header-toolbar) {
}
</style>
