// components/shared/DatePicker.tsx
// Pure-JS calendar date picker — no native modules required

import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Platform,
} from 'react-native';
import { Colors, Radius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface Props {
  label: string;
  value: string;          // YYYY-MM-DD  or ''
  onChange: (v: string) => void;
  minDate?: string;       // YYYY-MM-DD  — days before this are disabled
  maxDate?: string;       // YYYY-MM-DD  — days after this are disabled
  placeholder?: string;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseLocal(iso: string): Date {
  // Parse "YYYY-MM-DD" as local midnight to avoid timezone shift
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function DatePicker({ label, value, onChange, minDate, maxDate, placeholder }: Props) {
  const todayRaw = new Date();
  const todayStr = toISO(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());

  const selected = value ? parseLocal(value) : null;
  const [open, setOpen] = useState(false);
  const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? todayRaw.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? todayRaw.getMonth());

  const minD = minDate ? parseLocal(minDate) : null;
  const maxD = maxDate ? parseLocal(maxDate) : null;

  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  const displayLabel = selected
    ? selected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : (placeholder ?? 'Select date');

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (minD && d < minD) return;
    if (maxD && d > maxD) return;
    onChange(toISO(viewYear, viewMonth, day));
    setOpen(false);
  };

  const cells = useMemo(() => {
    const blanks = Array.from({ length: firstWeekday }, (_, i) => ({
      key: `b${i}`, blank: true, day: 0, isSelected: false, isToday: false, isDisabled: false,
    }));
    const days   = Array.from({ length: daysInMonth },  (_, i) => {
      const day = i + 1;
      const d   = new Date(viewYear, viewMonth, day);
      return {
        key:        `d${day}`,
        blank:      false,
        day,
        isSelected: !!selected && d.getTime() === new Date(viewYear, viewMonth, day).getTime()
                    && selected.getDate() === day
                    && selected.getMonth() === viewMonth
                    && selected.getFullYear() === viewYear,
        isToday:    toISO(viewYear, viewMonth, day) === todayStr,
        isDisabled: (!!minD && d < minD) || (!!maxD && d > maxD),
      };
    });
    return [...blanks, ...days];
  }, [viewYear, viewMonth, selected, minD, maxD]);

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.calIcon}>📅</Text>
        <Text style={[s.fieldText, !value && s.placeholder]}>{displayLabel}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>

            {/* Header nav */}
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
                <Text style={s.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={s.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
                <Text style={s.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={s.dayRow}>
              {DAY_HEADERS.map(h => (
                <View key={h} style={s.cell}>
                  <Text style={s.dayHeader}>{h}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.grid}>
              {cells.map(cell => (
                <View key={cell.key} style={s.cell}>
                  {cell.blank ? null : (
                    <TouchableOpacity
                      style={[s.dayBtn, cell.isSelected && s.daySelected, cell.isToday && !cell.isSelected && s.dayToday]}
                      onPress={() => handleDay(cell.day)}
                      disabled={cell.isDisabled}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        s.dayText,
                        cell.isSelected  && s.dayTextSelected,
                        cell.isDisabled  && s.dayTextDisabled,
                        cell.isToday && !cell.isSelected && s.dayTextToday,
                      ]}>
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.closeBtn} onPress={() => setOpen(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 40;

const s = StyleSheet.create({
  wrap:             { gap: 6 },
  label:            { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  field:            {
    flexDirection:  'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  calIcon:          { fontSize: 16 },
  fieldText:        { flex: 1, fontSize: FontSize.base, color: Colors.text },
  placeholder:      { color: Colors.textMuted },
  chevron:          { fontSize: 12, color: Colors.textMuted },

  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet:            { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, width: '100%', maxWidth: 360 },

  navRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn:           { padding: 8 },
  navBtnText:       { fontSize: 22, color: Colors.primary, fontWeight: FontWeight.bold },
  navTitle:         { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },

  dayRow:           { flexDirection: 'row', marginBottom: 4 },
  dayHeader:        { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, textAlign: 'center' },

  grid:             { flexDirection: 'row', flexWrap: 'wrap' },
  cell:             { width: `${100 / 7}%`, alignItems: 'center', marginBottom: 4 },

  dayBtn:           { width: CELL_SIZE, height: CELL_SIZE, borderRadius: CELL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  daySelected:      { backgroundColor: Colors.primary },
  dayToday:         { borderWidth: 1.5, borderColor: Colors.primary },
  dayText:          { fontSize: FontSize.sm, color: Colors.text },
  dayTextSelected:  { color: '#fff', fontWeight: FontWeight.bold },
  dayTextDisabled:  { color: Colors.border },
  dayTextToday:     { color: Colors.primary, fontWeight: FontWeight.bold },

  closeBtn:         { marginTop: 8, alignItems: 'center', padding: 10 },
  closeBtnText:     { fontSize: FontSize.sm, color: Colors.textSecondary },
});
