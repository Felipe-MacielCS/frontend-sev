<template>
  <v-card class="pa-2 elevation-3">
    <FullCalendar ref="fc" :options="calendarOptions" />
  </v-card>
</template>

<script>
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default {
  name: "UserCalendar",
  components: { FullCalendar },
  props: {
    events: { type: Array, required: true },
    initialView: { type: String, default: "timeGridWeek" },
    isEditable: { type: Boolean, default: false },
    isSelectable: { type: Boolean, default: false },
  },
  data() {
    return {
      calendarOptions: {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: this.initialView,
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        // Let the dialog body scroll through the entire time-grid day.
        height: "auto",
        contentHeight: "auto",
        expandRows: false,
        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        events: this.events,
        editable: this.isEditable,
        selectable: this.isSelectable,
        eventClick: (info) => this.$emit("shift-clicked", info.event),
        select: (info) => {
          this.$emit("time-selected", { start: info.startStr, end: info.endStr });
          info.view.calendar.unselect();
        },
        eventDrop: (info) => this.$emit("shift-moved", info.event),
      },
    };
  },
  methods: {
    updateSize() {
      const api = this.$refs.fc?.getApi();
      if (api) api.updateSize();
    },
  },
  watch: {
    events(newEvents) {
      this.calendarOptions.events = newEvents;
      this.$nextTick(() => setTimeout(() => this.updateSize(), 0));
    },
  },
};
</script>

<style scoped>
.fc {
  font-family: "Roboto", sans-serif;
}

:deep(.fc-theme-standard .fc-scrollgrid),
:deep(.fc-theme-standard td),
:deep(.fc-theme-standard th) {
  border-color: rgba(var(--v-theme-on-surface), 0.16);
}

:deep(.fc .fc-timegrid-slot),
:deep(.fc .fc-timegrid-axis),
:deep(.fc .fc-col-header-cell),
:deep(.fc .fc-timegrid-divider),
:deep(.fc .fc-daygrid-day-frame) {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

:deep(.fc .fc-timegrid-axis-cushion),
:deep(.fc .fc-col-header-cell-cushion),
:deep(.fc .fc-toolbar-title) {
  color: rgb(var(--v-theme-on-surface));
}

:deep(.fc .fc-day-today) {
  background: rgba(var(--v-theme-primary), 0.12) !important;
}
</style>
