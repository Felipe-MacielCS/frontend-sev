<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row justify="center">
      <v-col cols="12" md="9" lg="7">
        <v-card class="pa-5 bg-grey-lighten-3" elevation="1">
          <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-4">
            <div>
              <h2 class="text-h6 font-weight-bold mb-1">Worker Settings</h2>
            </div>
            <v-chip
              v-if="requiresStudentIdSetup"
              color="warning"
              variant="tonal"
              prepend-icon="mdi-school-outline"
            >
              Student ID setup needed
            </v-chip>
          </div>

          <v-card class="mb-5" variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold">Class Schedule Sync</v-card-title>
            <v-card-text>


              <v-text-field
                v-model="studentID"
                label="OC Student ID"
                variant="outlined"
                density="comfortable"
                :readonly="studentIdLocked"
                :disabled="studentIdLocked || savingStudentID"
                persistent-hint
                prepend-inner-icon="mdi-card-account-details-outline"
              />

              <div v-if="!studentIdLocked" class="d-flex flex-wrap ga-2 mt-4">
                <v-btn
                  color="primary"
                  :loading="savingStudentID"
                  @click="saveStudentId"
                >
                  Save Student ID
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

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
const WORKER_STUDENT_ID_SETTING = {
  key: "oc_student_id",
  label: "OC Student ID",
  value_type: "string",
  default_value: "",
  description: "OC student ID used to import class times into worker unavailability.",
};

export default {
  name: "WorkerSettings",
  data() {
    return {
      loading: false,
      savingDarkMode: false,
      savingStudentID: false,
      syncingStudentSchedule: false,
      darkModeSettingID: null,
      darkModeValueRowID: null,
      studentSettingID: null,
      studentValueRowID: null,
      darkModeEnabled: false,
      studentID: "",
      studentScheduleConfigured: false,
      initialized: false,
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    requiresStudentIdSetup() {
      const currentUser = this.getCurrentUser();
      return Boolean(
        currentUser?.needsStudentIdSetup || this.$route?.query?.setup === "student-id"
      );
    },
    studentIdLocked() {
      return this.studentScheduleConfigured && Boolean(this.studentValueRowID);
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
    normalizeStudentID(raw) {
      return String(raw ?? "").replace(/\D+/g, "");
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

        const [darkSetting, studentSetting] = await Promise.all([
          this.ensureSettingDefinition(WORKER_DARK_MODE_SETTING),
          this.ensureSettingDefinition(WORKER_STUDENT_ID_SETTING),
        ]);

        this.darkModeSettingID = darkSetting?.ID ?? null;
        this.studentSettingID = studentSetting?.ID ?? null;

        const [darkRows, studentRows] = await Promise.all([
          settingsValuesServices.getAll({
            userID,
            settingID: this.darkModeSettingID,
          }),
          settingsValuesServices.getAll({
            userID,
            settingID: this.studentSettingID,
          }),
        ]);

        const darkRow = Array.isArray(darkRows) ? darkRows[0] : null;
        const studentRow = Array.isArray(studentRows) ? studentRows[0] : null;

        this.darkModeValueRowID = darkRow?.ID ?? null;
        this.studentValueRowID = studentRow?.ID ?? null;
        this.darkModeEnabled =
          String(darkRow?.value ?? darkSetting?.default_value ?? "false").trim().toLowerCase() === "true";
        this.studentID = this.normalizeStudentID(studentRow?.value ?? "");
        this.studentScheduleConfigured = Boolean(this.studentID);
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
    async saveStudentId() {
      const userID = this.getCurrentUserID();
      if (!userID || !this.studentSettingID) return;
      if (this.studentIdLocked) return;

      const normalizedStudentID = this.normalizeStudentID(this.studentID);
      this.studentID = normalizedStudentID;

      try {
        this.savingStudentID = true;

        if (!normalizedStudentID) {
          this.showMessage("Enter your student ID to enable automatic class sync.", "warning");
          return;
        }

        const payload = {
          settingID: this.studentSettingID,
          userID,
          value: normalizedStudentID,
        };

        if (this.studentValueRowID) {
          await settingsValuesServices.update(this.studentValueRowID, payload);
        } else {
          const created = await settingsValuesServices.create(payload);
          this.studentValueRowID = created?.ID ?? null;
        }

        this.studentScheduleConfigured = true;
        this.setStoredUserFlags({
          studentScheduleConfigured: true,
          needsStudentIdSetup: false,
        });

        await this.syncStudentScheduleNow("Student ID saved.");

        if (this.$route?.query?.setup === "student-id") {
          this.$router.replace({ name: "workerSettings" });
        }
      } catch (error) {
        console.error("Failed to save student ID:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to save student ID.", "error");
      } finally {
        this.savingStudentID = false;
      }
    },
    async syncStudentScheduleNow(successPrefix = "Class schedule synced.") {
      const userID = this.getCurrentUserID();
      if (!userID || !this.studentScheduleConfigured) return;

      try {
        this.syncingStudentSchedule = true;
        const response = await calendarServices.syncStudentSchedule({ userID });
        const imported = Number(response?.imported ?? 0);
        this.showMessage(`${successPrefix} Imported ${imported} class block${imported === 1 ? "" : "s"}.`);
      } catch (error) {
        console.error("Failed to sync student schedule:", error?.response?.data || error);
        this.showMessage(
          error?.response?.data?.message || "Student ID saved, but class sync failed.",
          "warning"
        );
      } finally {
        this.syncingStudentSchedule = false;
      }
    },
  },
};
</script>
