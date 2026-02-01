<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import GoalServices from "../services/goalServices.js";
import ResultServices from "../services/resultServices.js";
import AthleteServices from "../services/athleteServices.js";
import ExerciseServices from "../services/exerciseServices.js";
import Utils from "../config/utils.js";

const route = useRoute();
const router = useRouter();

const goalId = Number(route.params.goalId);

// state
const loading = ref(true);
const error = ref(null);

const goal = ref(null);
const athlete = ref(null);
const exercise = ref(null);
const results = ref([]);

// ---------- FETCH HELPERS ----------
const fetchGoal = async () => {
  const res = await GoalServices.get(goalId);
  const data = res.data ?? res;
  goal.value = data || null;
};

const fetchAthlete = async () => {
  if (!goal.value?.athleteID) return;
  const all = await AthleteServices.getAll();
  const list = all.data ?? all;
  athlete.value = (list || []).find(
    (a) => a.athleteID === goal.value.athleteID
  );
};

const fetchExercise = async () => {
  if (!goal.value?.exerciseID) return;
  const all = await ExerciseServices.getAll();
  const list = all.data ?? all;
  exercise.value = (list || []).find(
    (e) => e.exerciseID === goal.value.exerciseID
  );
};

const fetchResults = async () => {
  const res = await ResultServices.getAll();
  const data = res.data ?? res;

  results.value = (data || [])
    .filter((r) => r.goalID === goalId)
    .map((r) => ({
      id: r.resultID || r.id,
      value: Number(r.value),
      recordDate: r.recordDate,
      notes: r.notes || "",
    }));
};

// ---------- COMPUTED HELPERS ----------
const sortedResults = computed(() => {
  return results.value
    .slice()
    .sort(
      (a, b) =>
        new Date(a.recordDate).getTime() -
        new Date(b.recordDate).getTime()
    );
});

const baselineResult = computed(() =>
  sortedResults.value.length > 0 ? sortedResults.value[0] : null
);

const latestResult = computed(() =>
  sortedResults.value.length > 0
    ? sortedResults.value[sortedResults.value.length - 1]
    : null
);

const targetValue = computed(() =>
  goal.value?.target != null ? Number(goal.value.target) : null
);

const metric = computed(() => goal.value?.metric || "lbs");

const baselineValue = computed(() =>
  baselineResult.value ? Number(baselineResult.value.value) : null
);

const latestValue = computed(() =>
  latestResult.value ? Number(latestResult.value.value) : null
);

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.toString().slice(0, 10);
  return d.toLocaleDateString("en-US");
};


const progressPercent = computed(() => {
  const tgt = targetValue.value;
  const base = baselineValue.value;
  const last = latestValue.value;

  if (
    tgt == null ||
    base == null ||
    last == null ||
    !isFinite(tgt) ||
    !isFinite(base) ||
    !isFinite(last)
  ) {
    return 0;
  }

  // If already at/above target, show 100%
  if (last >= tgt) return 100;

  let baselineDelta = tgt - base;

  // If baseline is equal to or above target,
  // treat baseline as "just below" target so we avoid divide-by-zero
  if (baselineDelta <= 0) {
    // They basically started at or beyond the goal
    // Any additional result ≥ target will be 100%, otherwise 0-100
    baselineDelta = tgt * 0.0001 || 1; 
  }

  const currentDelta = tgt - last;

  let raw = (baselineDelta - currentDelta) / baselineDelta;

  // Clamp between 0 and 1
  raw = Math.max(0, Math.min(raw, 1));

  return Math.round(raw * 100);
});

const progressBarStyle = computed(() => ({
  width: `${progressPercent.value}%`,
}));

// For header text
const athleteName = computed(
  () => athlete.value?.user?.name || "Athlete"
);
const exerciseName = computed(
  () => exercise.value?.name || goal.value?.type || "Goal"
);

// ---------- LIFECYCLE ----------
onMounted(async () => {
  try {
    await fetchGoal();
    if (!goal.value) {
      error.value = "Goal not found.";
      return;
    }
    await Promise.all([fetchAthlete(), fetchExercise(), fetchResults()]);
  } catch (err) {
    console.error("Error loading goal progress:", err);
    error.value = "Failed to load progress.";
  } finally {
    loading.value = false;
  }
});

// ---------- NAV ----------
const goBack = () => {
  router.back();
};
</script>

<template>
  <v-container class="progress-container" fluid>
    <v-row justify="center" class="mt-4">
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <div>
          <h2 class="text-h5 font-weight-bold">
            {{ athleteName }} — {{ exerciseName }}
          </h2>
          <div class="text-subtitle-2">
            Target:
            <strong>{{ targetValue ?? "—" }} {{ metric }}</strong>
          </div>
        </div>

        <v-btn
          color="grey"
          variant="outlined"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
        >
          Back
        </v-btn>
      </v-col>
    </v-row>

    <!-- Error -->
    <v-row v-if="error" justify="center">
      <v-col cols="12">
        <v-alert type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-else-if="loading" justify="center">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="black" size="48" />
      </v-col>
    </v-row>

    <!-- Content -->
    <v-row v-else justify="center">
      <v-col cols="12" md="10" lg="8">

        <!-- Progress Card -->
        <v-card class="mb-6 pa-4">
          <div class="d-flex justify-space-between align-start mb-4">
            <div>
              <div class="text-h6 font-weight-bold">Progress</div>
              <div class="text-body-2 text-grey-darken-1">
                Overall progress toward goal
              </div>
              <div class="text-h4 font-weight-bold mt-2">
                {{ progressPercent }}%
              </div>
            </div>

            <div class="text-right">
              <div class="text-caption text-grey-darken-1 mb-1">
                Baseline:
                <strong v-if="baselineValue != null">
                  {{ baselineValue }} {{ metric }}
                </strong>
                <span v-else>—</span>
                <div class="text-caption">
                  {{ baselineResult ? formatDate(baselineResult.recordDate) : "" }}
                </div>
              </div>
              <div class="text-caption text-grey-darken-1 mt-3">
                Latest:
                <strong v-if="latestValue != null">
                  {{ latestValue }} {{ metric }}
                </strong>
                <span v-else>—</span>
                <div class="text-caption">
                  {{ latestResult ? formatDate(latestResult.recordDate) : "" }}
                </div>
              </div>
            </div>
          </div>

          <!-- custom progress bar -->
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" :style="progressBarStyle"></div>
          </div>
        </v-card>

        <!-- Result history -->
        <v-card class="pa-4">
          <div class="text-h6 font-weight-bold mb-2">
            Result History
          </div>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="sortedResults.length === 0">
                <td colspan="2" class="text-center py-4">
                  No results recorded for this goal yet.
                </td>
              </tr>
              <tr v-for="r in sortedResults" :key="r.id">
                <td>{{ formatDate(r.recordDate) }}</td>
                <td class="text-right">
                  {{ r.value }} {{ metric }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.progress-container {
  padding-top: 90px;
  padding-bottom: 32px;
}

/* progress bar */
.progress-bar-outer {
  width: 100%;
  height: 16px;
  border-radius: 8px;
  background-color: #e0e0e0;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background-color: #000;
  transition: width 0.4s ease;
}
</style>
