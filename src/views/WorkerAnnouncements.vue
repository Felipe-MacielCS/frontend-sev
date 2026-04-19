<template>
  <v-container fluid class="worker-announcements pa-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="9">
        <div class="page-header mb-6">
          <div class="text-overline page-kicker">Worker Updates</div>
          <h1 class="text-h4 font-weight-bold mb-2">Announcements</h1>
        </div>

        <v-card class="rounded-xl announcements-card" elevation="2">
          <v-card-text class="pa-6">
            <div class="history-toolbar mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold">Department Announcement Feed</div>
              </div>
            </div>

            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <div v-if="!loading && !announcements.length && !errorMessage" class="empty-history">
              No announcements
            </div>

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
                      Posted {{ formatDateTime(announcement.createdAt) }}
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
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import announcementServices from "../services/announcementServices.js";

export default {
  name: "WorkerAnnouncements",
  data() {
    return {
      announcements: [],
      loading: false,
      errorMessage: "",
    };
  },
  mounted() {
    this.loadAnnouncements();
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
    async loadAnnouncements() {
      try {
        this.loading = true;
        this.errorMessage = "";
        const response = await announcementServices.getAll();
        this.announcements = Array.isArray(response?.announcements)
          ? response.announcements
          : [];
      } catch (error) {
        console.error("Failed to load worker announcements:", error);
        this.errorMessage =
          error?.response?.data?.message || "Could not load announcements.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.worker-announcements {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f7f8 0%, #eceff1 100%);
}

.page-kicker {
  letter-spacing: 0.12em;
  color: rgba(0, 0, 0, 0.58);
}

.announcements-card {
  background: rgba(255, 255, 255, 0.94);
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.history-item {
  background: rgba(255, 255, 255, 0.88);
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

@media (max-width: 600px) {
  .history-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
