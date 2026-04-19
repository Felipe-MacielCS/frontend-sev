<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row justify="center">
      <v-col cols="12" md="9" lg="7">
        <v-card class="pa-5 bg-grey-lighten-3" elevation="1">
          <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-4">
            <div>
              <h2 class="text-h6 font-weight-bold mb-1">Worker Settings</h2>
            </div>
          </div>

          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold">Appearance</v-card-title>
            <v-card-text>
              <v-switch
                v-model="darkModeEnabled"
                label="Dark Mode"
                color="primary"
                inset
                hide-details
                class="mb-2"
                @update:modelValue="saveDarkMode"
              />
            </v-card-text>
          </v-card>

          <div v-if="loading || savingDarkMode || syncingStudentSchedule" class="text-caption text-medium-emphasis mt-4">
            Saving...
          </div>
        </v-card>
      </v-col>
    </v-row>

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
import Utils from "../config/utils.js";
import calendarServices from "../services/calendarServices.js";
import settingsServices from "../services/settingsServices.js";
import settingsValuesServices from "../services/settingsValuesServices.js";

const WORKER_DARK_MODE_STORAGE_KEY = "worker_dark_mode_enabled";
const WORKER_DARK_MODE_SETTING = {
  key: "worker_dark_mode",
  label: "Dark Mode",
  value_type: "bool",
  default_value: "false",
  description: "Test toggle for the worker interface theme.",
};

export default {
  name: "WorkerSettings",
  data() {
    return {
      loading: false,
      savingDarkMode: false,
      syncingStudentSchedule: false,
      darkModeSettingID: null,
      darkModeValueRowID: null,
      darkModeEnabled: false,
      initialized: false,
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    currentUserEmail() {
      return String(this.getCurrentUser()?.email ?? "").trim();
    },
  },
  async mounted() {
    await this.loadSettings();
  },
  methods: {
    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
    getCurrentUser() {
      return Utils.getStore("user")?.user ?? Utils.getStore("user") ?? null;
    },
    setStoredUserFlags(updates = {}) {
      const stored = Utils.getStore("user");
      if (!stored) return;
      Utils.setStore("user", { ...stored, ...updates });
    },
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    getCurrentUserID() {
      const user = this.getCurrentUser();
      return this.normalizeID(user?.ID ?? user?.id ?? user?.userID);
    },
    async ensureSettingDefinition(settingDefinition) {
      const settings = await settingsServices.getAll({ key: settingDefinition.key });
      const existing = Array.isArray(settings) ? settings[0] : null;
      if (existing?.ID) return existing;

      return settingsServices.create({
        ...settingDefinition,
        is_active: true,
      });
    },
    async loadSettings() {
      this.loading = true;
      try {
        const userID = this.getCurrentUserID();
        if (!userID) return;

        const darkSetting = await this.ensureSettingDefinition(WORKER_DARK_MODE_SETTING);
        this.darkModeSettingID = darkSetting?.ID ?? null;

        const darkRows = await settingsValuesServices.getAll({
          userID,
          settingID: this.darkModeSettingID,
        });

        const darkRow = Array.isArray(darkRows) ? darkRows[0] : null;

        this.darkModeValueRowID = darkRow?.ID ?? null;
        this.darkModeEnabled =
          String(darkRow?.value ?? darkSetting?.default_value ?? "false").trim().toLowerCase() === "true";

        this.setStoredUserFlags({
          studentScheduleConfigured: Boolean(this.currentUserEmail),
          needsStudentIdSetup: false,
        });
      } catch (error) {
        console.error("Failed to load worker settings:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to load settings.", "error");
      } finally {
        this.initialized = true;
        this.loading = false;
      }
    },
    async saveDarkMode() {
      if (!this.initialized || this.loading) return;
      const userID = this.getCurrentUserID();
      if (!userID || !this.darkModeSettingID) return;

      try {
        this.savingDarkMode = true;
        const payload = {
          settingID: this.darkModeSettingID,
          userID,
          value: this.darkModeEnabled ? "true" : "false",
        };

        if (this.darkModeValueRowID) {
          await settingsValuesServices.update(this.darkModeValueRowID, payload);
        } else {
          const created = await settingsValuesServices.create(payload);
          this.darkModeValueRowID = created?.ID ?? null;
        }

        localStorage.setItem(WORKER_DARK_MODE_STORAGE_KEY, this.darkModeEnabled ? "1" : "0");
        window.dispatchEvent(new CustomEvent("worker-theme-updated"));
        this.showMessage("Dark mode preference saved.");
      } catch (error) {
        console.error("Failed to save dark mode setting:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to save dark mode.", "error");
      } finally {
        this.savingDarkMode = false;
      }
    },
    async syncStudentScheduleNow(successPrefix = "Class schedule synced.") {
      const userID = this.getCurrentUserID();
      if (!userID) return;
      if (!this.currentUserEmail) {
        this.showMessage("No OC email was found for your account.", "warning");
        return;
      }

      try {
        this.syncingStudentSchedule = true;
        const response = await calendarServices.syncStudentSchedule({ userID });
        const imported = Number(response?.imported ?? 0);

        this.setStoredUserFlags({
          studentScheduleConfigured: true,
          needsStudentIdSetup: false,
        });

        this.showMessage(`${successPrefix} Imported ${imported} class block${imported === 1 ? "" : "s"}.`);
      } catch (error) {
        console.error("Failed to sync student schedule:", error?.response?.data || error);
        this.showMessage(
          error?.response?.data?.message || "Class schedule sync failed.",
          "warning"
        );
      } finally {
        this.syncingStudentSchedule = false;
      }
    },
  },
};
</script>
