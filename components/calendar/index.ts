/**
 * Calendar Components
 *
 * Unified calendar system for training events and life events
 */

export { UnifiedCalendar } from './UnifiedCalendar'
export { MonthView } from './MonthView'
export { MonthViewDraggable } from './MonthViewDraggable'
export { DaySidebar } from './DaySidebar'
export { EventFormDialog } from './EventFormDialog'
export { ConflictDialog } from './ConflictDialog'
export { RescheduleConfirmDialog } from './RescheduleConfirmDialog'
export { NotificationsPanel, NotificationBell, useNotificationCount } from './NotificationsPanel'
export { IllnessProtocolPreview } from './IllnessProtocolPreview'
export { AltitudeCampPreview } from './AltitudeCampPreview'
export { TrainingCampPreview } from './TrainingCampPreview'
export { PostEventMonitor, PostEventMonitorBadge } from './PostEventMonitor'

// Coach calendar action components
export { DayActionMenu, useDayActionMenu, type DayActionType } from './DayActionMenu'
export { QuickWorkoutDialog } from './QuickWorkoutDialog'
export { FullWorkoutDialog } from './FullWorkoutDialog'
export { ScheduleTestDialog } from './ScheduleTestDialog'
export { ProgramSelector } from './ProgramSelector'

export * from './types'
