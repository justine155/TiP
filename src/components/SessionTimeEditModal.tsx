import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { StudySession, Task } from '../types';
import { SessionTimeEditor } from '../utils/session-time-editor';

interface SessionTimeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: StudySession;
  task: Task;
  planDate: string;
  sessionTimeEditor: SessionTimeEditor;
  onSave: () => void;
}

const SessionTimeEditModal: React.FC<SessionTimeEditModalProps> = ({
  isOpen,
  onClose,
  session,
  task,
  planDate,
  sessionTimeEditor,
  onSave
}) => {
  const [newStartTime, setNewStartTime] = useState(session.startTime);
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictsWith?: string; suggestedTimes?: string[] }>({ hasConflict: false });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewStartTime(session.startTime);
      checkConflict(session.startTime);
    }
  }, [isOpen, session.startTime]);

  const checkConflict = async (startTime: string) => {
    setIsChecking(true);
    const sessionId = `${session.taskId}-${session.sessionNumber}`;
    const result = sessionTimeEditor.checkTimeConflict(
      planDate,
      startTime,
      session.allocatedHours,
      sessionId
    );
    setConflictCheck(result);
    setIsChecking(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setNewStartTime(time);
    if (time) {
      checkConflict(time);
    }
  };

  const handleSave = () => {
    if (conflictCheck.hasConflict) return;

    const result = sessionTimeEditor.editSessionTime(
      planDate,
      session.taskId,
      session.sessionNumber!,
      newStartTime,
      session.allocatedHours
    );

    if (result.success) {
      onSave();
      onClose();
    } else {
      alert(result.error);
    }
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (session.allocatedHours * 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            Reschedule Session
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Task Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <h4 className="font-medium text-gray-800 dark:text-white">{task.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Session {session.sessionNumber} • {session.allocatedHours}h duration
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {planDate}
            </p>
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              New Start Time
            </label>
            <input
              type="time"
              value={newStartTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            
            {newStartTime && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">End time:</span> {calculateEndTime(newStartTime)}
              </div>
            )}
          </div>

          {/* Conflict Check */}
          {isChecking ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">Checking for conflicts...</span>
            </div>
          ) : conflictCheck.hasConflict ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Time Conflict</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{conflictCheck.conflictsWith}</p>
                  
                  {conflictCheck.suggestedTimes && conflictCheck.suggestedTimes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 dark:text-red-400 mb-1">Suggested times:</p>
                      <div className="flex gap-1 flex-wrap">
                        {conflictCheck.suggestedTimes.map(time => (
                          <button
                            key={time}
                            onClick={() => {
                              setNewStartTime(time);
                              checkConflict(time);
                            }}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : newStartTime && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">No conflicts detected</span>
            </div>
          )}

          {/* Warning Note */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Note</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Changes may be reset if you modify settings, add new tasks, or regenerate schedules.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={conflictCheck.hasConflict || !newStartTime || isChecking}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeEditModal;
