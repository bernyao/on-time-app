import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav from "../components/BottomNav";
import SettingsContent from "../components/SettingsContent";
import { AuthContext } from "../context/AuthContext";
import useReminders from "../hooks/useReminders";

const NO_DATE_KEY = "__no_date__";

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const monthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function toDateKey(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  if (key === NO_DATE_KEY) {
    return null;
  }
  if (!key) {
    return null;
  }
  const [y, m, d] = key.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null;
  }
  return new Date(y, m - 1, d);
}

function compareDateKeys(a, b) {
  if (a === b) {
    return 0;
  }
  if (a === NO_DATE_KEY) {
    return 1;
  }
  if (b === NO_DATE_KEY) {
    return -1;
  }
  const dateA = fromDateKey(a);
  const dateB = fromDateKey(b);
  if (!dateA && !dateB) {
    return 0;
  }
  if (!dateA) {
    return 1;
  }
  if (!dateB) {
    return -1;
  }
  return dateA.getTime() - dateB.getTime();
}

function formatFriendlyDate(key) {
  if (!key) {
    return "Select a date";
  }
  if (key === NO_DATE_KEY) {
    return "No due date";
  }
  const date = fromDateKey(key);
  if (!date) {
    return "Select a date";
  }
  return fullDateFormatter.format(date);
}

function formatMonthLabel(key) {
  if (key === NO_DATE_KEY) {
    return "--";
  }
  const date = fromDateKey(key);
  if (!date) {
    return "--";
  }
  return monthFormatter.format(date);
}

function formatDayLabel(key) {
  if (key === NO_DATE_KEY) {
    return "--";
  }
  const date = fromDateKey(key);
  if (!date) {
    return "--";
  }
  return dayFormatter.format(date);
}

function formatWeekdayLabel(key) {
  if (key === NO_DATE_KEY) {
    return "";
  }
  const date = fromDateKey(key);
  if (!date) {
    return "";
  }
  return weekdayFormatter.format(date);
}

function buildMonthMatrix(baseDate) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7; // Shift so Monday is the first column
  const cursor = new Date(monthStart);
  cursor.setDate(monthStart.getDate() - offset);

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

function formatDueAt(value) {
  if (!value) {
    return "No due date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSourceLabel(source) {
  if (source === "canvas") {
    return "Canvas";
  }
  return "Manual";
}

const COURSE_COLORS = ["#E45656", "#7B56E4", "#AA7A7A", "#E4D556"];
const courseColorAssignments = new Map();

function getCourseColor(courseCode) {
  if (!courseCode) {
    return null;
  }
  const normalized = courseCode.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!courseColorAssignments.has(normalized)) {
    const hash = normalized
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = COURSE_COLORS[hash % COURSE_COLORS.length];
    courseColorAssignments.set(normalized, color);
  }
  return courseColorAssignments.get(normalized);
}

function sanitizeDescription(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeCourseToken(token) {
  if (!token) {
    return false;
  }
  const trimmed = token.trim();
  if (trimmed.length < 3) {
    return false;
  }
  return /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed);
}

function parseCourseFromTitle(rawTitle) {
  const title = (rawTitle || "").trim();
  if (!title) {
    return { courseCode: null, taskTitle: "Reminder" };
  }

  const bracketMatch = title.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
  if (bracketMatch) {
    const courseCode = bracketMatch[1].trim();
    const taskTitle = bracketMatch[2].trim() || "Reminder";
    return { courseCode, taskTitle };
  }

  const leadingCodeMatch = title.match(
    /^([A-Za-z]{2,}(?:\s|-)?\d{2,}[A-Za-z]*)\s*[-–—:]\s*(.+)$/
  );
  if (leadingCodeMatch && looksLikeCourseToken(leadingCodeMatch[1])) {
    const courseCode = leadingCodeMatch[1].trim();
    const taskTitle = leadingCodeMatch[2].trim() || "Reminder";
    return { courseCode, taskTitle };
  }

  const trailingCodeMatch = title.match(
    /^(.+?)\s*[-–—:]\s*([A-Za-z]{2,}(?:\s|-)?\d{2,}[A-Za-z]*)$/
  );
  if (trailingCodeMatch && looksLikeCourseToken(trailingCodeMatch[2])) {
    const courseCode = trailingCodeMatch[2].trim();
    const taskTitle = trailingCodeMatch[1].trim() || "Reminder";
    return { courseCode, taskTitle };
  }

  const inlineBracketMatch = title.match(/\[([^\]]+)\]/);
  if (inlineBracketMatch && looksLikeCourseToken(inlineBracketMatch[1])) {
    const courseCode = inlineBracketMatch[1].trim();
    const taskTitle = title
      .replace(inlineBracketMatch[0], "")
      .replace(/[-–—:]/, " ")
      .trim();
    return { courseCode, taskTitle: taskTitle || "Reminder" };
  }

  return { courseCode: null, taskTitle: title };
}

function findCourseInText(text) {
  if (!text) {
    return null;
  }

  const courseLineMatch = text.match(/Course:\s*(.+)/i);
  if (courseLineMatch) {
    const line = courseLineMatch[1].split(/\r?\n/)[0].trim();
    if (line) {
      return line;
    }
  }

  const bracketMatch = text.match(/\[([^\]]+)\]/);
  if (bracketMatch && looksLikeCourseToken(bracketMatch[1])) {
    return bracketMatch[1].trim();
  }

  const tokenMatch = text.match(/[A-Za-z]{2,}(?:\s|-)?\d{2,}[A-Za-z]*/);
  if (tokenMatch && looksLikeCourseToken(tokenMatch[0])) {
    return tokenMatch[0].trim();
  }

  return null;
}

function extractCourseInfo(reminder) {
  const plainDescription = sanitizeDescription(
    reminder.description ?? reminder.details ?? ""
  );
  const { courseCode: titleCourse, taskTitle } = parseCourseFromTitle(
    reminder.title || reminder.name || "Reminder"
  );
  const explicitCourse =
    reminder.course_code ||
    reminder.courseCode ||
    reminder.courseName ||
    reminder.course;
  const rawLocation = reminder.location || reminder.context_name;

  let courseCode = explicitCourse ? String(explicitCourse).trim() : titleCourse;
  if (!courseCode) {
    courseCode = findCourseInText(plainDescription);
  }
  if (!courseCode && rawLocation) {
    courseCode = findCourseInText(rawLocation);
  }

  return {
    courseCode: courseCode || null,
    taskTitle: taskTitle || "Reminder",
    plainDescription,
  };
}

export default function HomeScreen() {
  const { user, signOut } = useContext(AuthContext);
  const { reminders, isLoading, refreshing, error, fetchReminders } =
    useReminders();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [activeNav, setActiveNav] = useState("home");
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  const topSpacing = useMemo(() => Math.max(insets.top + 12, 28), [insets.top]);

  useFocusEffect(
    useCallback(() => {
      fetchReminders("silent");
      setActiveNav("home");
      setCalendarExpanded(false);
    }, [fetchReminders])
  );

  const { remindersByDate, orderedDateKeys, noDateReminders } = useMemo(() => {
    const groups = {};
    const undated = [];

    reminders.forEach((reminder) => {
      const dueValue =
        reminder.due_at ?? reminder.dueAt ?? reminder.dueDate ?? null;
      const key = toDateKey(dueValue);
      if (!key) {
        undated.push(reminder);
        return;
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(reminder);
    });

    const keys = Object.keys(groups).sort(compareDateKeys);
    return {
      remindersByDate: groups,
      orderedDateKeys: keys,
      noDateReminders: undated,
    };
  }, [reminders]);

  const calendarKeys = useMemo(() => {
    const keys = [...orderedDateKeys];
    if (noDateReminders.length > 0) {
      keys.push(NO_DATE_KEY);
    }
    return keys;
  }, [orderedDateKeys, noDateReminders.length]);

  const preferredInitialDate = useMemo(() => {
    if (orderedDateKeys.length === 0) {
      return null;
    }
    const todayKey = toDateKey(new Date());
    const upcoming = orderedDateKeys.find(
      (key) => compareDateKeys(key, todayKey) >= 0
    );
    if (upcoming) {
      return upcoming;
    }
    return orderedDateKeys[orderedDateKeys.length - 1];
  }, [orderedDateKeys]);

  const [selectedDate, setSelectedDate] = useState(() => {
    if (preferredInitialDate) {
      return preferredInitialDate;
    }
    if (calendarKeys.length > 0) {
      return calendarKeys[0];
    }
    if (noDateReminders.length > 0) {
      return NO_DATE_KEY;
    }
    return null;
  });

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialKey = preferredInitialDate || calendarKeys[0] || null;
    const initialDate =
      initialKey && initialKey !== NO_DATE_KEY ? fromDateKey(initialKey) : null;
    const base = initialDate || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (calendarKeys.length === 0) {
      setSelectedDate(noDateReminders.length > 0 ? NO_DATE_KEY : null);
      return;
    }
    setSelectedDate((current) => {
      if (current && calendarKeys.includes(current)) {
        return current;
      }
      if (preferredInitialDate && calendarKeys.includes(preferredInitialDate)) {
        return preferredInitialDate;
      }
      return calendarKeys[0];
    });
  }, [calendarKeys, noDateReminders.length, preferredInitialDate]);

  useEffect(() => {
    if (!selectedDate || selectedDate === NO_DATE_KEY) {
      return;
    }
    const date = fromDateKey(selectedDate);
    if (!date) {
      return;
    }
    setCalendarMonth((current) => {
      if (
        current.getFullYear() === date.getFullYear() &&
        current.getMonth() === date.getMonth()
      ) {
        return current;
      }
      return new Date(date.getFullYear(), date.getMonth(), 1);
    });
  }, [selectedDate]);

  const calendarMatrix = useMemo(
    () => buildMonthMatrix(calendarMonth),
    [calendarMonth]
  );

  const calendarMonthLabel = useMemo(
    () => monthYearFormatter.format(calendarMonth),
    [calendarMonth]
  );

  useEffect(() => {
    if (activeNav === "user") {
      setCalendarExpanded(false);
    }
  }, [activeNav]);

  const handlePrevMonth = useCallback(() => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  }, []);

  const openCalendar = useCallback(() => {
    const baseKey =
      selectedDate && selectedDate !== NO_DATE_KEY
        ? selectedDate
        : preferredInitialDate;
    const baseDate = baseKey ? fromDateKey(baseKey) : null;
    const fallback = baseDate || new Date();
    setCalendarMonth(new Date(fallback.getFullYear(), fallback.getMonth(), 1));
    setCalendarExpanded(true);
  }, [preferredInitialDate, selectedDate]);

  const handleSelectDate = useCallback((dateKey) => {
    setSelectedDate(dateKey);
  }, []);

  const handleGridSelect = useCallback((dateKey) => {
    setSelectedDate(dateKey);
    setCalendarExpanded(false);
    setActiveNav("home");
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleNavPress = useCallback(
    (navKey) => {
      setActiveNav(navKey);

      if (navKey === "calendar" && calendarKeys.length > 0) {
        openCalendar();
        return;
      }

      if (navKey === "user") {
        setCalendarExpanded(false);
        return;
      }

      if (navKey === "home") {
        setCalendarExpanded(false);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    },
    [calendarKeys.length, openCalendar]
  );

  const handleCloseCalendar = useCallback(() => {
    setCalendarExpanded(false);
    setActiveNav("home");
  }, []);

  const listContentPaddingBottom = useMemo(
    () => 140 + Math.max(insets.bottom, 16),
    [insets.bottom]
  );

  const displayReminders = useMemo(() => {
    if (selectedDate === NO_DATE_KEY) {
      return noDateReminders;
    }
    if (!selectedDate) {
      return reminders;
    }
    return remindersByDate[selectedDate] || [];
  }, [selectedDate, noDateReminders, reminders, remindersByDate]);

  const renderItem = useCallback(
    ({ item }) => {
      const sourceLabel = getSourceLabel(item.source);
      const isCanvas = sourceLabel === "Canvas";
      const { courseCode, taskTitle, plainDescription } =
        extractCourseInfo(item);
      const courseColor = courseCode ? getCourseColor(courseCode) : null;
      const dueValue = item.due_at ?? item.dueAt ?? item.dueDate;
      const courseDisplay = courseCode || (isCanvas ? "Canvas" : "Manual");
      const itemKey = String(item.id);
      const isExpanded = expandedCards.has(itemKey);

      const handleToggleDescription = () => {
        setExpandedCards((prev) => {
          const next = new Set(prev);
          if (next.has(itemKey)) {
            next.delete(itemKey);
          } else {
            next.add(itemKey);
          }
          return next;
        });
      };

      return (
        <Pressable
          onPress={handleToggleDescription}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.courseCodeText,
                courseColor ? { color: courseColor } : null,
              ]}
              numberOfLines={1}
            >
              {courseDisplay}
            </Text>
            <View
              style={[
                styles.badge,
                isCanvas ? styles.badgeCanvas : styles.badgeManual,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isCanvas ? styles.badgeTextCanvas : styles.badgeTextManual,
                ]}
              >
                {sourceLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.taskTitle}>{taskTitle}</Text>
          {isExpanded && plainDescription ? (
            <Text style={styles.cardDescriptionText}>{plainDescription}</Text>
          ) : null}
          <Text style={styles.cardMeta}>Due {formatDueAt(dueValue)}</Text>
        </Pressable>
      );
    },
    [expandedCards]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const listEmptyComponent = useMemo(() => {
    if (isLoading) {
      return null;
    }

    if (reminders.length === 0) {
      if (error) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Try again"
              onPress={() => fetchReminders("initial")}
            />
          </View>
        );
      }

      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reminders yet.</Text>
          <Text style={styles.emptySubtext}>
            Create a reminder or connect Canvas to see them here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          No reminders for {formatFriendlyDate(selectedDate)}.
        </Text>
        <Text style={styles.emptySubtext}>
          Pull down to refresh or choose another date.
        </Text>
      </View>
    );
  }, [error, fetchReminders, isLoading, reminders.length, selectedDate]);

  const renderDatePill = useCallback(
    ({ item }) => {
      const isSelected = item === selectedDate;
      const monthLabel = formatMonthLabel(item);
      const dayLabel = formatDayLabel(item);
      const weekdayLabel = formatWeekdayLabel(item);
      const isNoDate = item === NO_DATE_KEY;
      const monthText = isNoDate ? "NO" : (monthLabel || "--").toUpperCase();
      const dayText = isNoDate ? "DATE" : dayLabel;
      const weekdayText = isNoDate ? "" : (weekdayLabel || "").toUpperCase();

      return (
        <TouchableOpacity
          onPress={() => handleSelectDate(item)}
          style={[styles.datePill, isSelected && styles.datePillActive]}
        >
          <View
            style={[
              styles.datePillCircle,
              isSelected && styles.datePillCircleActive,
            ]}
          >
            <Text
              style={[
                styles.datePillMonth,
                isSelected && styles.datePillMonthActive,
              ]}
            >
              {monthText}
            </Text>
            <Text
              style={[
                styles.datePillDay,
                isSelected && styles.datePillDayActive,
              ]}
            >
              {dayText}
            </Text>
          </View>
          <Text
            style={[
              styles.datePillWeekday,
              isSelected && styles.datePillWeekdayActive,
            ]}
          >
            {weekdayText}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleSelectDate, selectedDate]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Upcoming Dates</Text>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={openCalendar}
            disabled={calendarKeys.length === 0}
          >
            <Text style={styles.expandButtonText}>Expand</Text>
          </TouchableOpacity>
        </View>
        {calendarKeys.length === 0 ? (
          <Text style={styles.emptyDateMessage}>No dated reminders yet.</Text>
        ) : (
          <FlatList
            data={calendarKeys}
            horizontal
            renderItem={renderDatePill}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
            extraData={selectedDate}
          />
        )}
        <Text style={styles.calendarScheduleTitle}>Schedule</Text>
      </View>
    ),
    [calendarKeys, openCalendar, renderDatePill, selectedDate]
  );

  const isProfileView = activeNav === "user";

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View
        style={[
          isProfileView ? styles.profileContainer : styles.container,
          { paddingTop: topSpacing },
        ]}
      >
        {isProfileView ? (
          <ScrollView
            contentContainerStyle={styles.profileScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileIntro}>
              <Text style={styles.profileSubtitle}>
                Manage your account and Canvas connection.
              </Text>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{user?.name || "On Time"}</Text>
              {user?.email ? (
                <Text style={styles.profileEmail}>{user.email}</Text>
              ) : null}
            </View>
            <SettingsContent style={styles.settingsCard} />
            <View style={styles.signOutWrapper}>
              <Button
                title="Sign Out"
                color="#b91c1c"
                onPress={handleSignOut}
              />
            </View>
          </ScrollView>
        ) : (
          <>
            {user?.name ? (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>
                  Welcome back, {user.name}
                </Text>
              </View>
            ) : null}
            <FlatList
              ref={listRef}
              data={displayReminders}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              extraData={expandedCards}
              contentContainerStyle={[
                displayReminders.length === 0
                  ? styles.listEmptyContainer
                  : styles.listContainer,
                { paddingBottom: listContentPaddingBottom },
              ]}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={listEmptyComponent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchReminders("refresh")}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
      <BottomNav activeKey={activeNav} onPress={handleNavPress} />
      {!isProfileView && (
        <Modal
          animationType="fade"
          transparent
          visible={calendarExpanded}
          onRequestClose={handleCloseCalendar}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={handleCloseCalendar}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a date</Text>
                <TouchableOpacity onPress={handleCloseCalendar}>
                  <Text style={styles.modalClose}>Close</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalMonthHeader}>
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  style={styles.modalMonthNav}
                  accessibilityLabel="Previous month"
                >
                  <Text style={styles.modalMonthNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalMonthTitle}>{calendarMonthLabel}</Text>
                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={styles.modalMonthNav}
                  accessibilityLabel="Next month"
                >
                  <Text style={styles.modalMonthNavText}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalWeekdayRow}>
                {WEEKDAY_LABELS.map((label, index) => (
                  <Text
                    key={`${label}-${index}`}
                    style={styles.modalWeekdayHeader}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.modalCalendarBody}>
                {calendarMatrix.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} style={styles.modalWeekRow}>
                    {week.map((dayDate, dayIndex) => {
                      const dayKey = toDateKey(dayDate);
                      const isCurrentMonth =
                        dayDate.getMonth() === calendarMonth.getMonth();
                      const isSelected = dayKey === selectedDate;
                      const hasReminders =
                        !!dayKey && !!remindersByDate[dayKey]?.length;
                      return (
                        <TouchableOpacity
                          key={`day-${weekIndex}-${dayIndex}`}
                          style={[
                            styles.modalMonthCell,
                            !isCurrentMonth && styles.modalMonthCellMuted,
                            isSelected && styles.modalMonthCellSelected,
                          ]}
                          onPress={() => handleGridSelect(dayKey)}
                        >
                          <Text
                            style={[
                              styles.modalMonthCellText,
                              !isCurrentMonth && styles.modalMonthCellTextMuted,
                              isSelected && styles.modalMonthCellTextSelected,
                            ]}
                          >
                            {dayDate.getDate()}
                          </Text>
                          {hasReminders ? (
                            <View
                              style={[
                                styles.modalMonthCellDot,
                                isSelected && styles.modalMonthCellDotSelected,
                              ]}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
              {calendarKeys.length === 0 ? (
                <Text style={styles.modalEmpty}>No dated reminders yet.</Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  calendarSection: {
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#1f2937",
  },
  calendarScheduleTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  emptyDateMessage: {
    fontSize: 14,
    color: "#4b5563",
  },
  dateList: {
    paddingBottom: 4,
  },
  datePill: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 18,
  },
  datePillActive: {
    backgroundColor: "#e0e7ff",
  },
  datePillCircle: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e5e7eb",
  },
  datePillCircleActive: {
    backgroundColor: "#1d4ed8",
  },
  datePillMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1f2937",
    textTransform: "uppercase",
  },
  datePillMonthActive: {
    color: "#dbeafe",
  },
  datePillDay: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  datePillDayActive: {
    color: "#fff",
  },
  datePillWeekday: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "uppercase",
  },
  datePillWeekdayActive: {
    color: "#1d4ed8",
  },
  calendarSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#4b5563",
  },
  listContainer: {
    paddingBottom: 24,
  },
  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 48,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  courseCodeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#444444",
    marginBottom: 6,
  },
  cardDescriptionText: {
    fontSize: 14,
    color: "#4a5568",
    lineHeight: 20,
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeCanvas: {
    backgroundColor: "#ecfdf5",
  },
  badgeManual: {
    backgroundColor: "#eff6ff",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  badgeTextCanvas: {
    color: "#047857",
  },
  badgeTextManual: {
    color: "#1d4ed8",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#718096",
    textAlign: "center",
    marginBottom: 16,
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
    zIndex: 1,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalClose: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  modalMonthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalMonthNav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  modalMonthNavText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalMonthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalWeekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  modalCalendarBody: {
    minHeight: 312,
  },
  modalWeekdayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "uppercase",
  },
  modalWeekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  modalMonthCell: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  modalMonthCellMuted: {
    backgroundColor: "#f3f4f6",
  },
  modalMonthCellSelected: {
    backgroundColor: "#1d4ed8",
  },
  modalMonthCellText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalMonthCellTextMuted: {
    color: "#9ca3af",
  },
  modalMonthCellTextSelected: {
    color: "#fff",
  },
  modalMonthCellDot: {
    marginTop: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9ca3af",
  },
  modalMonthCellDotSelected: {
    backgroundColor: "#bfdbfe",
  },
  modalEmpty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 12,
  },
  profileScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  profileIntro: {
    marginBottom: 24,
  },
  profileSubtitle: {
    marginTop: 0,
    color: "#4b5563",
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 16,
    color: "#4b5563",
  },
  settingsCard: {
    marginBottom: 24,
  },
  signOutWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
});
