<template>
  <v-menu
    v-model="menuOpen"
    location="bottom end"
    offset="10"
    :close-on-content-click="false"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        class="mr-1"
        :aria-label="buttonLabel"
      >
        <v-badge
          :model-value="itemCount > 0"
          :content="badgeContent"
          color="amber-darken-2"
          offset-x="2"
          offset-y="2"
        >
          <v-icon>{{ icon }}</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card min-width="340" max-width="420" class="notification-menu rounded-xl">
      <div class="d-flex align-center justify-space-between px-4 py-3">
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ subtitleLabel }}
          </div>
        </div>

        <v-progress-circular
          v-if="loading"
          indeterminate
          size="18"
          width="2"
          color="primary"
        />
      </div>

      <v-divider />

      <div v-if="loading && !items.length" class="px-4 py-6 text-center text-medium-emphasis">
        Loading notifications...
      </div>

      <div v-else-if="!items.length" class="px-4 py-6 text-center text-medium-emphasis">
        {{ emptyText }}
      </div>

      <v-list v-else lines="two" density="comfortable" class="py-1">
        <v-list-item
          v-for="item in items"
          :key="item.id"
          rounded="lg"
          class="mx-2 my-1 notification-item"
          @click="handleSelect(item)"
        >
          <template #prepend>
            <v-avatar
              size="34"
              :color="item.color || 'primary'"
              variant="tonal"
              class="mr-3"
            >
              <v-icon size="18">{{ item.icon || fallbackItemIcon }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium text-body-2">
            {{ item.title }}
          </v-list-item-title>
          <v-list-item-subtitle class="notification-copy">
            {{ item.message }}
          </v-list-item-subtitle>

          <template v-if="item.meta" #append>
            <v-chip size="small" variant="tonal" color="primary">
              {{ item.meta }}
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  buttonLabel: {
    type: String,
    default: "Open notifications",
  },
  emptyText: {
    type: String,
    default: "No notifications right now.",
  },
  icon: {
    type: String,
    default: "mdi-bell-outline",
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "Notifications",
  },
});

const menuOpen = ref(false);
const router = useRouter();

const itemCount = computed(() => props.items.length);
const badgeContent = computed(() => (itemCount.value > 99 ? "99+" : String(itemCount.value)));
const subtitleLabel = computed(() =>
  itemCount.value === 1 ? "1 item needs attention" : `${itemCount.value} items need attention`
);
const fallbackItemIcon = computed(() => props.icon);

const handleSelect = async (item) => {
  if (!item?.to) return;

  menuOpen.value = false;

  if (router.currentRoute.value.path !== item.to) {
    await router.push(item.to);
  }
};
</script>

<style scoped>
.notification-menu {
  border: 1px solid rgba(114, 21, 26, 0.08);
}

.notification-item {
  cursor: pointer;
}

.notification-copy {
  white-space: normal;
  line-height: 1.45;
}
</style>
