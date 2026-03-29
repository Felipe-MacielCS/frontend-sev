<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h2 class="text-h6 font-weight-bold mb-3">Worker Settings</h2>

          <div class="text-body-2 mb-4">
            This is saved for your account and follows you across worker pages.
          </div>

          <v-switch
            v-model="darkModeEnabled"
            label="Dark Mode"
            color="primary"
            inset
            hide-details
            class="mb-2"
            @update:modelValue="saveSettings"
          />

          <div class="text-caption text-medium-emphasis mb-4">
            This only affects worker pages and will not change the login page.
          </div>

          <div v-if="saving" class="text-caption text-medium-emphasis">
            Saving...
          </div>
        </v-card>
      </v-col>
    </v-row>

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
      saving: false,
      settingID: null,
      valueRowID: null,
      darkModeEnabled: false,
      initialized: false,
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  async mounted() {
    await this.loadSettings();
  },
  methods: {
    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    getCurrentUserID() {
      const user = this.getCurrentUser();
      return this.normalizeID(user?.ID ?? user?.id ?? user?.userID);
    },
    async ensureSettingDefinition() {
      const settings = await settingsServices.getAll({ key: WORKER_DARK_MODE_SETTING.key });
      const existing = Array.isArray(settings) ? settings[0] : null;
      if (existing?.ID) return existing;

      return settingsServices.create({
        ...WORKER_DARK_MODE_SETTING,
        is_active: true,
      });
    },
    async loadSettings() {
      this.loading = true;
      try {
        const userID = this.getCurrentUserID();
        if (!userID) return;

        const setting = await this.ensureSettingDefinition();
        this.settingID = setting?.ID ?? null;

        const values = await settingsValuesServices.getAll({
          userID,
          settingID: this.settingID,
        });
        const row = Array.isArray(values) ? values[0] : null;
        this.valueRowID = row?.ID ?? null;
        this.darkModeEnabled =
          String(row?.value ?? setting?.default_value ?? "false").trim().toLowerCase() === "true";
      } catch (error) {
        console.error("Failed to load worker settings:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to load settings.", "error");
      } finally {
        this.initialized = true;
        this.loading = false;
      }
    },
    async saveSettings() {
      if (!this.initialized || this.loading) return;
      const userID = this.getCurrentUserID();
      if (!userID || !this.settingID) return;

      try {
        this.saving = true;
        const payload = {
          settingID: this.settingID,
          userID,
          value: this.darkModeEnabled ? "true" : "false",
        };

        if (this.valueRowID) {
          await settingsValuesServices.update(this.valueRowID, payload);
        } else {
          const created = await settingsValuesServices.create(payload);
          this.valueRowID = created?.ID ?? null;
        }

        localStorage.setItem(WORKER_DARK_MODE_STORAGE_KEY, this.darkModeEnabled ? "1" : "0");
        window.dispatchEvent(new CustomEvent("worker-theme-updated"));
        this.showMessage("Worker settings saved.");
      } catch (error) {
        console.error("Failed to save worker settings:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to save settings.", "error");
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
