import { StudySession, StudyPlan, FixedCommitment, UserSettings, SessionTimeEdit } from '../types';
import { getLocalDateString } from './scheduling';

/**
 * Utility class for editing session start times without conflicts
 */
export class SessionTimeEditor {
  private sessionTimeEdits: SessionTimeEdit[] = [];

  constructor(
    private studyPlans: StudyPlan[],
    private fixedCommitments: FixedCommitment[],
    private settings: UserSettings
  ) {
    // Load existing edits from localStorage
    const savedEdits = localStorage.getItem('timepilot-session-time-edits');
    if (savedEdits) {
      try {
        this.sessionTimeEdits = JSON.parse(savedEdits);
      } catch (e) {
        console.warn('Failed to load session time edits:', e);
        this.sessionTimeEdits = [];
      }
    }
  }

  /**
   * Check if a new start time conflicts with existing sessions or commitments
   */
  checkTimeConflict(
    planDate: string,
    newStartTime: string,
    sessionDuration: number, // in hours
    excludeSessionId: string,
    includeSuggestions: boolean = true
  ): { hasConflict: boolean; conflictsWith?: string; suggestedTimes?: string[] } {
    const newEndMinutes = this.timeToMinutes(newStartTime) + (sessionDuration * 60);
    const newEndTime = this.minutesToTime(newEndMinutes);

    // Check study window
    const studyStart = this.settings.studyWindowStartHour * 60;
    const studyEnd = this.settings.studyWindowEndHour * 60;
    const startMinutes = this.timeToMinutes(newStartTime);

    if (startMinutes < studyStart || newEndMinutes > studyEnd) {
      return {
        hasConflict: true,
        conflictsWith: `Outside study window (${this.settings.studyWindowStartHour}:00 - ${this.settings.studyWindowEndHour}:00)`,
        suggestedTimes: includeSuggestions ? this.generateSuggestedTimes(planDate, sessionDuration, excludeSessionId) : []
      };
    }

    // Check work days
    const dayOfWeek = new Date(planDate).getDay();
    if (!this.settings.workDays.includes(dayOfWeek)) {
      return {
        hasConflict: true,
        conflictsWith: 'Not a work day',
        suggestedTimes: []
      };
    }

    // Check conflicts with other sessions on the same day
    const plan = this.studyPlans.find(p => p.date === planDate);
    if (plan) {
      for (const session of plan.plannedTasks) {
        const sessionId = `${session.taskId}-${session.sessionNumber}`;

        // Skip the session we're editing and inactive sessions
        if (sessionId === excludeSessionId || session.status === 'skipped' || session.done) {
          continue;
        }

        // Apply any existing time edits to this session
        const editedSession = this.getEditedSession(session, planDate);
        const sessionStart = this.timeToMinutes(editedSession.startTime);
        const sessionEnd = this.timeToMinutes(editedSession.endTime);

        // Check for overlap
        if (startMinutes < sessionEnd && newEndMinutes > sessionStart) {
          return {
            hasConflict: true,
            conflictsWith: `Overlaps with ${editedSession.taskId} session (${editedSession.startTime} - ${editedSession.endTime})`,
            suggestedTimes: includeSuggestions ? this.generateSuggestedTimes(planDate, sessionDuration, excludeSessionId) : []
          };
        }
      }
    }

    // Check conflicts with fixed commitments
    const dayCommitments = this.getCommitmentsForDate(planDate);
    for (const commitment of dayCommitments) {
      const commitmentStart = this.timeToMinutes(commitment.startTime);
      const commitmentEnd = this.timeToMinutes(commitment.endTime);

      if (startMinutes < commitmentEnd && newEndMinutes > commitmentStart) {
        return {
          hasConflict: true,
          conflictsWith: `Overlaps with ${commitment.title} (${commitment.startTime} - ${commitment.endTime})`,
          suggestedTimes: includeSuggestions ? this.generateSuggestedTimes(planDate, sessionDuration, excludeSessionId) : []
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Edit a session's start time
   */
  editSessionTime(
    planDate: string,
    taskId: string,
    sessionNumber: number,
    newStartTime: string,
    sessionDuration: number
  ): { success: boolean; error?: string } {
    const sessionId = `${taskId}-${sessionNumber}`;
    
    // Check for conflicts
    const conflictCheck = this.checkTimeConflict(planDate, newStartTime, sessionDuration, sessionId);
    if (conflictCheck.hasConflict) {
      return { success: false, error: conflictCheck.conflictsWith };
    }

    // Calculate new end time
    const newEndMinutes = this.timeToMinutes(newStartTime) + (sessionDuration * 60);
    const newEndTime = this.minutesToTime(newEndMinutes);

    // Find existing edit or create new one
    const existingEditIndex = this.sessionTimeEdits.findIndex(
      edit => edit.planDate === planDate && edit.taskId === taskId && edit.sessionNumber === sessionNumber
    );

    const session = this.findSession(planDate, taskId, sessionNumber);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const edit: SessionTimeEdit = {
      id: existingEditIndex >= 0 ? this.sessionTimeEdits[existingEditIndex].id : `edit-${Date.now()}`,
      planDate,
      taskId,
      sessionNumber,
      originalStartTime: session.startTime,
      newStartTime,
      newEndTime,
      editedAt: new Date().toISOString(),
      isTemporary: true
    };

    if (existingEditIndex >= 0) {
      this.sessionTimeEdits[existingEditIndex] = edit;
    } else {
      this.sessionTimeEdits.push(edit);
    }

    this.saveEdits();
    return { success: true };
  }

  /**
   * Get session with any edits applied
   */
  getEditedSession(session: StudySession, planDate: string): StudySession {
    const edit = this.sessionTimeEdits.find(
      e => e.planDate === planDate && e.taskId === session.taskId && e.sessionNumber === session.sessionNumber
    );

    if (edit) {
      return {
        ...session,
        startTime: edit.newStartTime,
        endTime: edit.newEndTime
      };
    }

    return session;
  }

  /**
   * Apply all edits to study plans
   */
  applyEditsToPlans(plans: StudyPlan[]): StudyPlan[] {
    return plans.map(plan => ({
      ...plan,
      plannedTasks: plan.plannedTasks.map(session => this.getEditedSession(session, plan.date))
    }));
  }

  /**
   * Remove an edit (revert to original time)
   */
  removeEdit(planDate: string, taskId: string, sessionNumber: number): boolean {
    const index = this.sessionTimeEdits.findIndex(
      edit => edit.planDate === planDate && edit.taskId === taskId && edit.sessionNumber === sessionNumber
    );

    if (index >= 0) {
      this.sessionTimeEdits.splice(index, 1);
      this.saveEdits();
      return true;
    }

    return false;
  }

  /**
   * Clear all temporary edits (called when plan is regenerated)
   */
  clearTemporaryEdits(): void {
    this.sessionTimeEdits = this.sessionTimeEdits.filter(edit => !edit.isTemporary);
    this.saveEdits();
  }

  /**
   * Get all current edits
   */
  getAllEdits(): SessionTimeEdit[] {
    return [...this.sessionTimeEdits];
  }

  // Private helper methods
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getCommitmentsForDate(date: string): FixedCommitment[] {
    const dayOfWeek = new Date(date).getDay();
    
    return this.fixedCommitments.filter(commitment => {
      // Skip deleted occurrences
      if (commitment.deletedOccurrences?.includes(date)) {
        return false;
      }

      // Check if commitment applies to this date
      if (commitment.recurring) {
        return commitment.daysOfWeek.includes(dayOfWeek);
      } else {
        return commitment.specificDates?.includes(date) || false;
      }
    }).map(commitment => {
      // Apply any modifications for this specific date
      const modification = commitment.modifiedOccurrences?.[date];
      if (modification) {
        return {
          ...commitment,
          startTime: modification.startTime || commitment.startTime,
          endTime: modification.endTime || commitment.endTime,
          title: modification.title || commitment.title
        };
      }
      return commitment;
    });
  }

  private findSession(planDate: string, taskId: string, sessionNumber: number): StudySession | null {
    const plan = this.studyPlans.find(p => p.date === planDate);
    if (!plan) return null;

    return plan.plannedTasks.find(
      s => s.taskId === taskId && s.sessionNumber === sessionNumber
    ) || null;
  }

  private generateSuggestedTimes(
    planDate: string,
    sessionDuration: number,
    excludeSessionId: string
  ): string[] {
    const suggestions: string[] = [];
    const studyStart = this.settings.studyWindowStartHour * 60;
    const studyEnd = this.settings.studyWindowEndHour * 60;
    const sessionMinutes = sessionDuration * 60;

    // Try every 30-minute interval within study window (faster than 15-minute)
    for (let minutes = studyStart; minutes <= studyEnd - sessionMinutes; minutes += 30) {
      const startTime = this.minutesToTime(minutes);
      // Use includeSuggestions: false to avoid recursive calls
      const conflictCheck = this.checkTimeConflict(planDate, startTime, sessionDuration, excludeSessionId, false);

      if (!conflictCheck.hasConflict) {
        suggestions.push(startTime);
        if (suggestions.length >= 3) break; // Limit suggestions
      }
    }

    return suggestions;
  }

  private saveEdits(): void {
    try {
      localStorage.setItem('timepilot-session-time-edits', JSON.stringify(this.sessionTimeEdits));
    } catch (e) {
      console.warn('Failed to save session time edits:', e);
    }
  }
}
