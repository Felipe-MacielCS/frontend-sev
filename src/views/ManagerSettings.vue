<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h2 class="text-h6 font-weight-bold mb-3">Manager Settings</h2>
          <div v-if="departmentName" class="text-body-2">
            <b>Department:</b> {{ departmentName }}
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <v-card
          v-for="section in settingsSections"
          :key="section.key"
          class="mb-4"
          elevation="2"
        >
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ section.label }}
          </v-card-title>

          <v-card-text>
            <div
              v-for="setting in section.items"
              :key="setting.key"
              class="mb-4"
            >
              <v-switch
                v-if="setting.value_type === 'bool'"
                v-model="setting.formValue"
                :label="setting.label"
                color="primary"
                hide-details
                inset
                @update:modelValue="onBooleanSettingChanged(setting)"
              />

              <v-text-field
                v-else-if="setting.value_type === 'int'"
                v-model.number="setting.formValue"
                :label="setting.label"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
              />

              <v-text-field
                v-else
                v-model="setting.formValue"
                :label="setting.label"
                variant="outlined"
                density="comfortable"
              />

              <div v-if="setting.description" class="text-caption text-medium-emphasis mt-1">
                {{ setting.description }}
              </div>
            </div>
          </v-card-text>
        </v-card>

        <div class="d-flex justify-end">
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="loading || !settingsRows.length"
            @click="saveSettings"
          >
            Save Settings
          </v-btn>
        </div>
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
import departmentUsersServices from "../services/departmentUsersServices.js";
import settingsServices from "../services/settingsServices.js";
import settingsValuesServices from "../services/settingsValuesServices.js";

const MANAGER_DARK_MODE_STORAGE_KEY = "manager_dark_mode_enabled";

const MANAGER_SETTING_DEFINITIONS = [
  {
    key: "schedule_week_starts_monday",
    label: "Week Starts On Monday",
    value_type: "bool",
    default_value: "false",
    section: "scheduling",
  },
  {
    key: "default_shift_workers_required",
    label: "Default Workers Required",
    value_type: "int",
    default_value: "1",
    section: "scheduling",
  },
  {
    key: "allow_shift_overlap",
    label: "Allow Shift Overlap",
    value_type: "bool",
    default_value: "false",
    section: "scheduling",
  },
  {
    key: "allowed_shift_overlap_minutes",
    label: "Allowed Shift Overlap Minutes",
    value_type: "int",
    default_value: "0",
    section: "scheduling",
  },
  {
    key: "manager_dark_mode",
    label: "Dark Mode",
    value_type: "bool",
    default_value: "false",
    section: "general",
  },
];

export default {
  name: "ManagerSettings",
  data() {
    return {
      loading: false,
      saving: false,
      error: "",
      managerDepartmentID: null,
      departmentName: "",
      settingsRows: [],
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    settingsSections() {
      const sections = [
        { key: "general", label: "General" },
        { key: "scheduling", label: "Scheduling" },
      ];

      return sections
        .map((section) => ({
          ...section,
          items: this.settingsRows.filter((row) => row.section === section.key),
        }))
        .filter((section) => section.items.length > 0);
    },
  },
  async mounted() {
    await this.loadManagerSettings();
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
    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = this.normalizeID(currentUser?.ID ?? currentUser?.id ?? currentUser?.userID);
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
        links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },
    castValue(valueType, rawValue) {
      if (valueType === "bool") {
        return String(rawValue).trim().toLowerCase() === "true";
      }
      if (valueType === "int") {
        const parsed = Number(rawValue);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return rawValue ?? "";
    },
    serializeValue(valueType, formValue) {
      if (valueType === "bool") return formValue ? "true" : "false";
      if (valueType === "int") return String(Number.isFinite(Number(formValue)) ? Number(formValue) : 0);
      return String(formValue ?? "");
    },
    async persistSettingRow(settingRow) {
      const payload = {
        settingID: settingRow.settingID,
        departmentID: this.managerDepartmentID,
        value: this.serializeValue(settingRow.value_type, settingRow.formValue),
      };

      if (settingRow.valueRowID) {
        await settingsValuesServices.update(settingRow.valueRowID, payload);
      } else {
        const created = await settingsValuesServices.create(payload);
        settingRow.valueRowID = created?.ID ?? null;
      }
    },
    async onBooleanSettingChanged(settingRow) {
      if (!settingRow || settingRow.key !== "manager_dark_mode" || this.loading || !this.managerDepartmentID) {
        return;
      }

      try {
        this.saving = true;
        await this.persistSettingRow(settingRow);
        localStorage.setItem(
          MANAGER_DARK_MODE_STORAGE_KEY,
          settingRow.formValue ? "1" : "0"
        );
        window.dispatchEvent(new CustomEvent("manager-theme-updated"));
      } catch (error) {
        console.error("Failed to auto-save manager dark mode:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to save dark mode.", "error");
      } finally {
        this.saving = false;
      }
    },
    async ensureSettingDefinitions() {
      const existingSettings = await settingsServices.getAll();
      const settingsList = Array.isArray(existingSettings) ? existingSettings : [];
      const byKey = Object.fromEntries(settingsList.map((setting) => [setting.key, setting]));

      for (const definition of MANAGER_SETTING_DEFINITIONS) {
        if (!byKey[definition.key]) {
          const created = await settingsServices.create({
            key: definition.key,
            label: definition.label,
            value_type: definition.value_type,
            default_value: definition.default_value,
            description: definition.description,
            is_active: true,
          });
          byKey[definition.key] = created;
        }
      }

      return byKey;
    },
    async loadManagerSettings() {
      this.loading = true;
      this.error = "";

      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.error = "Could not find a department for this manager.";
          return;
        }

        const settingsByKey = await this.ensureSettingDefinitions();
        const valueRows = await settingsValuesServices.getAll({
          departmentID: this.managerDepartmentID,
        });
        const valuesBySettingID = Object.fromEntries(
          (Array.isArray(valueRows) ? valueRows : []).map((row) => [row.settingID, row])
        );

        this.settingsRows = MANAGER_SETTING_DEFINITIONS.map((definition) => {
          const setting = settingsByKey[definition.key];
          const existingValueRow = valuesBySettingID[setting?.ID];
          const rawValue = existingValueRow?.value ?? setting?.default_value ?? definition.default_value;

          return {
            ...definition,
            settingID: setting?.ID ?? null,
            valueRowID: existingValueRow?.ID ?? null,
            formValue: this.castValue(definition.value_type, rawValue),
          };
        });

        this.departmentName = "";
      } catch (error) {
        console.error("Failed to load manager settings:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Failed to load manager settings.";
      } finally {
        this.loading = false;
      }
    },
    async saveSettings() {
      if (!this.managerDepartmentID) return;

      try {
        this.saving = true;

        for (const settingRow of this.settingsRows) {
          await this.persistSettingRow(settingRow);
        }

        const darkModeRow = this.settingsRows.find((row) => row.key === "manager_dark_mode");
        localStorage.setItem(
          MANAGER_DARK_MODE_STORAGE_KEY,
          darkModeRow?.formValue ? "1" : "0"
        );
        window.dispatchEvent(new CustomEvent("manager-theme-updated"));
        this.showMessage("Manager settings saved.");
      } catch (error) {
        console.error("Failed to save manager settings:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Failed to save settings.", "error");
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
