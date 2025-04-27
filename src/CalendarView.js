// src/CalendarView.js
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// helper: pick a color per difficulty 1–5
const difficultyColors = {
  1: '#d4f0fc',  // very easy: pale blue
  2: '#b5e4fc',
  3: '#90d4fc',  // medium: sky blue
  4: '#66c2f7',
  5: '#338fd4'   // hard: deep blue
};

export default function CalendarView({ tasks, onMove }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  // update isMobile on resize
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // map tasks → calendar events
  const events = tasks.map(t => ({
    id: t.id,
    title: `${t.subject} (${t.difficulty})`,
    start: new Date(t.deadline),
    end:   new Date(new Date(t.deadline).getTime() + t.duration * 60000),
    difficulty: t.difficulty
  }));

  // style each event by its difficulty (and shrink font on mobile)
  const eventStyleGetter = event => ({
    style: {
      backgroundColor: difficultyColors[event.difficulty] || '#aaa',
      borderRadius: '4px',
      border: 'none',
      color: '#000',
      fontSize: isMobile ? '0.75em' : '1em'
    }
  });

  const handleEventDrop = ({ event, start }) => {
    onMove(event.id, start);
  };

  // fallback to simple list on very narrow screens
  if (isMobile && window.innerWidth < 400) {
    return (
      <div style={{ marginBottom: 20 }}>
        <h3>Upcoming Tasks</h3>
        <ul>
          {tasks
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 10)
            .map(t => (
              <li key={t.id}>
                {t.subject} — due {new Date(t.deadline).toLocaleString()}
              </li>
            ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ height: 400, marginBottom: 40 }}>
      <DnDCalendar
        localizer={localizer}
        draggableAccessor={isMobile ? () => false : undefined}
        events={events}
        defaultView={isMobile ? Views.DAY : Views.WEEK}
        views={isMobile ? [Views.DAY, Views.WEEK] : [Views.MONTH, Views.WEEK, Views.DAY]}
        step={30}
        onEventDrop={handleEventDrop}
        onEventResize={isMobile ? undefined : handleEventDrop}
        resizable={!isMobile}
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  );
}
