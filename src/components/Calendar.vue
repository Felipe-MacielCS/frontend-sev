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
  name: "Calendar",
  components: { FullCalendar },
  props: {
    events: { type: Array, required: true },
    initialView: { type: String, default: "timeGridWeek" },
    isEditable: { type: Boolean, default: false },
    isSelectable: { type: Boolean, default: false },
    height: { type: [Number, String], default: "auto" },
    contentHeight: { type: [Number, String], default: "auto" },
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
        height: this.height,
        contentHeight: this.contentHeight,
        expandRows: true,
        slotMinTime: "05:00:00",
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
    goToDate(dateStr) {
      const api = this.$refs.fc?.getApi();
      if (api && dateStr) api.gotoDate(dateStr);
    },
  },
  watch: {
    events(newEvents) {
      this.calendarOptions.events = newEvents;
      this.$nextTick(() => setTimeout(() => this.updateSize(), 0));
    },
    height(newH) {
      this.calendarOptions.height = newH;
      this.$nextTick(() => setTimeout(() => this.updateSize(), 0));
    },
    contentHeight(newH) {
      this.calendarOptions.contentHeight = newH;
      this.$nextTick(() => setTimeout(() => this.updateSize(), 0));
    },
  },
};
</script>

<style scoped>
.fc {
  font-family: "Roboto", sans-serif;
}
</style>
