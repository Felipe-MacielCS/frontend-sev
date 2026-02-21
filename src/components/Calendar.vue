<template>
  <v-card class="pa-2 elevation-3">
    <FullCalendar :options="calendarOptions" />
  </v-card>
</template>

<script>
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

export default {
  name: "Calendar",
  components: {
    FullCalendar
  },
  props: {
    events: { type: Array, required: true },
    initialView: { type: String, default: 'timeGridWeek' }, 
    isEditable: { type: Boolean, default: false },
    isSelectable: { type: Boolean, default: false }
  },
  data() {
    return {
      calendarOptions: {
        plugins: [ dayGridPlugin, timeGridPlugin, interactionPlugin ],
        initialView: this.initialView,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: this.events,
        editable: this.isEditable, 
        selectable: this.isSelectable, 
        
        // Event Listeners
        eventClick: (info) => {
          this.$emit('shift-clicked', info.event);
        },
        select: (info) => {
          this.$emit('time-selected', { start: info.startStr, end: info.endStr });
          info.view.calendar.unselect(); 
        },
        eventDrop: (info) => {
          this.$emit('shift-moved', info.event);
        }
      }
    }
  },
  watch: {
    events(newEvents) {
      this.calendarOptions.events = newEvents;
    }
  }
}
</script>

<style scoped>
.fc { font-family: 'Roboto', sans-serif; }

.fc-view-harness { min-height: 600px; }
</style>