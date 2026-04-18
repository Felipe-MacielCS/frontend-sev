<template>
  <v-container fluid class="manager-announcements pa-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <div class="page-header mb-6">
          <div class="text-overline page-kicker">Manager Announcements</div>
          <h1 class="text-h4 font-weight-bold mb-2">Announcements</h1>
          <p class="text-body-1 text-medium-emphasis mb-0">
            Write the message you want to send to your team by email.
          </p>
        </div>

        <v-card class="rounded-xl announcement-card" elevation="2">
          <v-tabs
            v-model="activeTab"
            color="primary"
            align-tabs="start"
            class="px-4 pt-2"
          >
            <v-tab value="create" class="text-none">Create Announcement</v-tab>
            <v-tab value="history" class="text-none">Announcement History</v-tab>
          </v-tabs>

          <v-divider />

          <v-window v-model="activeTab">
            <v-window-item value="create">
              <v-card-text class="pa-6">
                <v-form ref="announcementFormRef" @submit.prevent="submitAnnouncement">
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="form.subject"
                        label="Email Subject"
                        variant="outlined"
                        density="comfortable"
                        :rules="[(value) => !!String(value || '').trim() || 'Subject is required']"
                      />
                    </v-col>

                    <v-col cols="12">
                      <v-textarea
                        v-model="form.message"
                        label="Announcement Message"
                        variant="outlined"
                        rows="8"
                        auto-grow
                        :counter="800"
                        :rules="[
                          (value) => !!String(value || '').trim() || 'Message is required',
                          (value) => String(value || '').length <= 800 || 'Message must be 800 characters or less',
                        ]"
                      />
                    </v-col>
                  </v-row>

                  <div class="form-actions">
                    <v-btn
                      variant="tonal"
                      color="grey-darken-1"
                      class="text-none"
                      :disabled="isSending"
                      @click="resetForm"
                    >
                      Clear
                    </v-btn>

                    <v-btn
                      type="submit"
                      color="primary"
                      class="text-none"
                      :loading="isSending"
                    >
                      Send Announcement
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-window-item>

            <v-window-item value="history">
              <v-card-text class="pa-6">
                <div class="history-toolbar mb-4">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Department Announcement History</div>
                    <div class="text-body-2 text-medium-emphasis">
                      Review every announcement sent to workers in this department.
                    </div>
                  </div>

                  <v-btn
                    variant="tonal"
                    color="primary"
                    class="text-none"
                    :loading="historyLoading"
                    @click="loadAnnouncementHistory"
                  >
                    Refresh
                  </v-btn>
                </div>

                <v-progress-linear
                  v-if="historyLoading"
                  indeterminate
                  color="primary"
                  class="mb-4"
                />

                <v-card
                  v-for="announcement in announcements"
                  :key="announcement.ID"
                  variant="outlined"
                  class="mb-4 history-item"
                >
                  <v-card-text>
                    <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-3">
                      <div>
                        <div class="text-h6 font-weight-bold">{{ announcement.subject }}</div>
                        <div class="text-body-2 text-medium-emphasis">
                          Sent {{ formatDateTime(announcement.createdAt) }}
                        </div>
                      </div>

                      <v-chip color="primary" variant="tonal" size="small">
                        {{ announcement.recipientCount || 0 }} recipients
                      </v-chip>
                    </div>

                    <div class="text-body-1 history-message">
                      {{ announcement.message }}
                    </div>

                    <v-divider class="my-4" />

                    <div class="text-body-2 text-medium-emphasis">
                      Sent by {{ announcement.creator?.name || "Manager" }}
                      <span v-if="announcement.creator?.email">({{ announcement.creator.email }})</span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>

        <v-alert
          v-if="submitResult"
          type="success"
          variant="tonal"
          class="mt-5"
        >
          Sent!
        </v-alert>

        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mt-5"
        >
          {{ errorMessage }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import announcementServices from "../services/announcementServices.js";

export default {
  name: "ManagerAnnouncements",
  data() {
    return {
      activeTab: "create",
      form: {
        subject: "",
        message: "",
      },
      announcements: [],
      historyLoading: false,
      submitResult: null,
      errorMessage: "",
      isSending: false,
    };
  },
  mounted() {
    this.loadAnnouncementHistory();
  },
  methods: {
    formatDateTime(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    },
    resetForm() {
      this.form = {
        subject: "",
        message: "",
      };
      this.errorMessage = "";
      this.$refs.announcementFormRef?.resetValidation?.();
    },
    async loadAnnouncementHistory() {
      try {
        this.historyLoading = true;
        const response = await announcementServices.getAll();
        this.announcements = Array.isArray(response?.announcements)
          ? response.announcements
          : [];
      } catch (error) {
        console.error("Failed to load announcement history:", error);
      } finally {
        this.historyLoading = false;
      }
    },
    async submitAnnouncement() {
      this.errorMessage = "";
      this.submitResult = null;

      const { valid } = await this.$refs.announcementFormRef.validate();
      if (!valid) return;

      try {
        this.isSending = true;
        const response = await announcementServices.send(this.form);
        this.submitResult = response;
        await this.loadAnnouncementHistory();
        this.activeTab = "history";
        this.resetForm();
      } catch (error) {
        this.errorMessage =
          error?.response?.data?.message || "Failed to send the announcement.";
      } finally {
        this.isSending = false;
      }
    },
  },
};
</script>

<style scoped>
.manager-announcements {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f7f8 0%, #eceff1 100%);
}

.page-kicker {
  letter-spacing: 0.12em;
  color: rgba(0, 0, 0, 0.58);
}

.announcement-card {
  background: rgba(255, 255, 255, 0.94);
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.history-item {
  background: rgba(255, 255, 255, 0.85);
}

.history-message {
  white-space: pre-line;
  line-height: 1.7;
}

.empty-history {
  padding: 28px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 16px;
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 600px) {
  .history-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .v-btn {
    width: 100%;
  }
}
</style>
