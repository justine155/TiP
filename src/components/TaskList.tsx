import React, { useState, useMemo } from 'react';
import { BookOpen, Edit, Trash2, CheckCircle2, X, Info, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Task, UserSettings } from '../types';
import { formatTime, checkFrequencyDeadlineConflict } from '../utils/scheduling';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  autoRemovedTasks?: string[];
  onDismissAutoRemovedTask?: (taskTitle: string) => void;
  userSettings: UserSettings;
}

type EditFormData = Partial<Task> & {
  estimatedMinutes?: number;
  customCategory?: string;
  impact?: string;
  taskType?: string;
  deadlineType?: 'hard' | 'soft' | 'none';
  schedulingPreference?: 'consistent' | 'opportunistic' | 'intensive';
  targetFrequency?: 'daily' | 'weekly' | '3x-week' | 'flexible';
  respectFrequencyForDeadlines?: boolean;
  preferredTimeSlots?: ('morning' | 'afternoon' | 'evening')[];
  minWorkBlock?: number;
  isOneTimeTask?: boolean;
};

const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask, onDeleteTask, autoRemovedTasks = [], onDismissAutoRemovedTask, userSettings }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({});
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Separate active and completed tasks
  const activeTasks = tasks.filter(task => task.status === 'pending');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  // Check if current edit form represents a low-priority urgent task
  const isLowPriorityUrgent = React.useMemo(() => {
    if (!editFormData.deadline) return false;
    const deadline = new Date(editFormData.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3 && editFormData.importance === false;
  }, [editFormData.deadline, editFormData.importance]);
  
  // Check if deadline is in the past
  const isDeadlinePast = editFormData.deadline ? editFormData.deadline < today : false;

  // Check for deadline conflict with frequency preference
  const deadlineConflict = useMemo(() => {
    if (!editFormData.deadline || editFormData.deadlineType === 'none') {
      return { hasConflict: false };
    }
    
    const totalHours = (editFormData.estimatedHours || 0) + ((editFormData.estimatedMinutes || 0) / 60);
    const taskForCheck = {
      deadline: editFormData.deadline,
      estimatedHours: totalHours,
      targetFrequency: editFormData.targetFrequency,
      deadlineType: editFormData.deadlineType,
      minWorkBlock: editFormData.minWorkBlock
    };
    
    return checkFrequencyDeadlineConflict(taskForCheck, userSettings);
  }, [editFormData.deadline, editFormData.estimatedHours, editFormData.estimatedMinutes, editFormData.targetFrequency, editFormData.deadlineType, editFormData.minWorkBlock, userSettings]);

  const getUrgencyColor = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 1) return 'text-red-600';
    if (daysUntilDeadline <= 3) return 'text-orange-600';
    if (daysUntilDeadline <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get category color based on calendar view color scheme
  const getCategoryColor = (category?: string): string => {
    if (!category) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    
    switch (category.toLowerCase()) {
      case 'academics':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'learning':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200';
      case 'home':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'finance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'org':
      case 'organization':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'work':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'health':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    const totalMinutes = Math.round((task.estimatedHours || 0) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    setEditFormData({
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      importance: task.importance,
      estimatedHours: hours,
      estimatedMinutes: minutes,
      subject: task.subject,
      category: task.category === 'Custom...' ? '' : task.category,
      customCategory: task.category && !['Academics', 'Org', 'Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home'].includes(task.category) ? task.category : '',
      impact: task.impact || (task.importance ? 'high' : 'low'),
      taskType: task.taskType || '',
      deadlineType: task.deadlineType || (task.deadline ? 'hard' : 'none'),
      schedulingPreference: task.schedulingPreference || 'consistent',
      targetFrequency: task.targetFrequency || 'daily', // Default to daily for all tasks
      respectFrequencyForDeadlines: task.respectFrequencyForDeadlines !== false, // Default to true
      preferredTimeSlots: task.preferredTimeSlots || [],
      minWorkBlock: task.minWorkBlock || 30,
      maxSessionLength: task.maxSessionLength || 2,
      isOneTimeTask: task.isOneTimeTask || false,
    });
    setShowAdvancedOptions(false);
  };

  const saveEdit = () => {
    if (editingTaskId && editFormData.title) {
      const totalHours = (editFormData.estimatedHours || 0) + ((editFormData.estimatedMinutes || 0) / 60);
      const category = editFormData.category === 'Custom...' ? editFormData.customCategory : editFormData.category;

      onUpdateTask(editingTaskId, {
        ...editFormData,
        estimatedHours: totalHours,
        category,
        deadline: editFormData.deadlineType === 'none' ? '' : (editFormData.deadline || ''),
        deadlineType: editFormData.deadline ? editFormData.deadlineType : 'none',
        importance: editFormData.impact === 'high',
      });
      setEditingTaskId(null);
      setEditFormData({});
      setShowAdvancedOptions(false);
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Auto-removed tasks notifications */}
      {autoRemovedTasks.map((title) => (
            <div key={title} className="flex items-center bg-red-100 text-red-800 px-4 py-2 rounded shadow border-l-4 border-red-500">
          <Info className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="text-sm flex-1">
            Task "{title}" was automatically removed due to missed deadline.
          </span>
            <button
            onClick={() => onDismissAutoRemovedTask?.(title)}
            className="ml-2 text-red-600 hover:text-red-800"
            >
            <X className="w-4 h-4" />
            </button>
        </div>
      ))}
      
      {/* Active Tasks */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Active Tasks</h2>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
            {activeTasks.length}
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Active Tasks</h3>
            <p className="text-gray-600 dark:text-gray-300">Add your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-700"
              >
              {editingTaskId === task.id ? (
                  <div className="space-y-4">
                    {/* Task Title & Description */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Task Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={editFormData.title || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          className="w-full px-4 py-3 backdrop-blur-sm bg-white/70 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded-xl text-base focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-white transition-all duration-300"
                          placeholder="e.g., Write project report"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Description <span className="text-gray-400">(Optional)</span></label>
                        <textarea
                          value={editFormData.description || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20 border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                          placeholder="Describe the task..."
                        />
                      </div>
                    </div>

                    {/* Estimated Time */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Estimated Time <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            value={editFormData.estimatedHours || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, estimatedHours: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                            placeholder="0"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hours</div>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-lg font-bold">:</div>
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={editFormData.estimatedMinutes || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, estimatedMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                            placeholder="0"
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minutes</div>
                        </div>
                      </div>
                    </div>

                    {/* Deadline & One-time task */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Deadline <span className="text-gray-400">(Optional)</span></label>
                      <input
                        type="date"
                        min={today}
                        value={editFormData.deadline || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
                        placeholder="Select deadline (optional)"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for flexible tasks, or set a deadline for time-sensitive work</div>

                      {/* One-time task option */}
                      <div className="mt-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editFormData.isOneTimeTask || false}
                            onChange={(e) => setEditFormData({ ...editFormData, isOneTimeTask: e.target.checked })}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200">Complete this task in one sitting (don't divide into sessions)</span>
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check this for short tasks or tasks that need to be done all at once</div>
                      </div>
                    </div>

                    {/* Impact */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">How much will this impact your goals? <span className="text-red-500">*</span></label>
                      <div className="flex flex-col md:flex-row gap-4 mt-2">
                        <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
                          <input
                            type="radio"
                            name="impact"
                            value="high"
                            checked={editFormData.impact === 'high'}
                            onChange={() => setEditFormData({ ...editFormData, impact: 'high' })}
                          />
                          <span>High impact (significantly affects your success/commitments)</span>
                        </label>
                        <label className="flex items-center gap-2 text-base font-normal text-gray-700 dark:text-gray-100">
                          <input
                            type="radio"
                            name="impact"
                            value="low"
                            checked={editFormData.impact === 'low'}
                            onChange={() => setEditFormData({ ...editFormData, impact: 'low' })}
                          />
                          <span>Low impact (standard task, manageable if delayed)</span>
                        </label>
                      </div>
                    </div>

                    {/* Advanced Timeline Options Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Advanced Timeline Options
                      </button>

                      {showAdvancedOptions && (
                        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Task Timeline Options</span>
                            <button
                              type="button"
                              onClick={() => setShowHelpModal(true)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Help & Information"
                            >
                              <HelpCircle size={16} />
                            </button>
                          </div>

                          {/* Category & Task Type */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category <span className="text-gray-400">(Optional)</span></label>
                              <select
                                value={editFormData.category || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value, customCategory: '' })}
                                className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                              >
                                <option value="">Select category...</option>
                                {['Academics', 'Org', 'Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home', 'Custom...'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              {editFormData.category === 'Custom...' && (
                                <input
                                  type="text"
                                  value={editFormData.customCategory || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, customCategory: e.target.value })}
                                  className="w-full border rounded-lg px-3 py-2 mt-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                                  placeholder="Enter custom category"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Task Type</label>
                              <select
                                value={editFormData.taskType || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, taskType: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-white"
                              >
                                <option value="">Select task type...</option>
                                {['Planning', 'Creating', 'Learning', 'Administrative', 'Communicating', 'Deep Focus Work'].map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Deadline Type Selection */}
                          <div className="space-y-2 mb-4">
                            <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name="deadlineType"
                                value="hard"
                                checked={editFormData.deadlineType === 'hard'}
                                onChange={() => setEditFormData({ ...editFormData, deadlineType: 'hard' })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-white">Hard deadline (must finish by date)</div>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name="deadlineType"
                                value="soft"
                                checked={editFormData.deadlineType === 'soft'}
                                onChange={() => setEditFormData({ ...editFormData, deadlineType: 'soft' })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-white">Flexible target date</div>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name="deadlineType"
                                value="none"
                                checked={editFormData.deadlineType === 'none'}
                                onChange={() => setEditFormData({ ...editFormData, deadlineType: 'none' })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-white">No deadline (work when time allows)</div>
                              </div>
                            </label>
                          </div>

                          {/* Work frequency preference - now applies to ALL tasks */}
                          <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Work frequency preference</label>
                              <select
                                value={editFormData.targetFrequency || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, targetFrequency: e.target.value as any })}
                                className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                              >
                                <option value="daily">Daily progress (default)</option>
                                <option value="3x-week">Few times per week</option>
                                <option value="weekly">Weekly sessions</option>
                                <option value="flexible">When I have time</option>
                              </select>
                              
                              {/* Show warning if frequency conflicts with deadline */}
                              {deadlineConflict.hasConflict && (
                                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-200">
                                  <div className="flex items-start gap-1">
                                    <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                                    <div>
                                      <div className="font-medium">Frequency preference may not allow completion before deadline</div>
                                      <div className="mt-1">{deadlineConflict.reason}</div>
                                      {deadlineConflict.recommendedFrequency && (
                                        <div className="mt-1">
                                          <strong>Recommended:</strong> Switch to "{deadlineConflict.recommendedFrequency}" frequency, or daily scheduling will be used instead.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Additional preferences for no-deadline tasks */}
                            {editFormData.deadlineType === 'none' && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Preferred time</label>
                                  <div className="flex gap-2">
                                    {['morning', 'afternoon', 'evening'].map(timeSlot => (
                                      <label key={timeSlot} className="flex items-center gap-1">
                                        <input
                                          type="checkbox"
                                          checked={(editFormData.preferredTimeSlots || []).includes(timeSlot as any)}
                                          onChange={(e) => {
                                            const timeSlots = editFormData.preferredTimeSlots || [];
                                            if (e.target.checked) {
                                              setEditFormData({ ...editFormData, preferredTimeSlots: [...timeSlots, timeSlot as any] });
                                            } else {
                                              setEditFormData({ ...editFormData, preferredTimeSlots: timeSlots.filter(t => t !== timeSlot) });
                                            }
                                          }}
                                        />
                                        <span className="capitalize text-xs text-gray-700 dark:text-gray-300">{timeSlot}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Minimum session</label>
                                  <select
                                    value={editFormData.minWorkBlock || 30}
                                    onChange={(e) => setEditFormData({ ...editFormData, minWorkBlock: parseInt(e.target.value) })}
                                    className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                                  >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Warning for low-priority urgent tasks */}
                    {isLowPriorityUrgent && (
                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                        <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                          This task is due soon but marked as low priority. Consider increasing the priority.
                        </span>
                      </div>
                    )}

                    {/* Warning for past deadline */}
                    {isDeadlinePast && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                        <Info className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-300">
                          This deadline is in the past. Please update it to a future date.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
              ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
                          {task.title}
                        </h3>
                        {task.importance && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full dark:bg-red-900 dark:text-red-200 flex-shrink-0">
                            Important
                          </span>
                        )}
                        </div>
                        
                        <div className="space-y-2">
                        {task.subject && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium">📚</span>
                              <span className="truncate">{task.subject}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">⏰</span>
                            <span>{formatTime(task.estimatedHours)}</span>
                          </div>
                          
                          {task.deadline && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="font-medium">📅</span>
                              <span className={`${getUrgencyColor(task.deadline)}`}>
                                Due: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            </div>
                          )}
                          
                        {task.category && (
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                            </div>
                          )}
                          
                        {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {task.description}
                          </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => onUpdateTask(task.id, { status: 'completed' })}
                        className="p-2 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900"
                        title="Mark as completed"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                        <button
                          onClick={() => startEditing(task)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                          title="Edit task"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Completed Tasks</h2>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                {completedTasks.length}
              </span>
            </div>
            <button
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showCompletedTasks ? 'Hide' : 'Show'} Completed
            </button>
          </div>

          {showCompletedTasks && (
          <div className="space-y-3">
            {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-300 truncate line-through">
                        {task.title}
                      </h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                          Completed
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                      {task.subject && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">📚</span>
                            <span className="truncate">{task.subject}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">⏰</span>
                          <span>{formatTime(task.estimatedHours)}</span>
                        </div>
                        
                        {task.deadline && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">📅</span>
                            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                      title="Delete task"
                    >
                        <Trash2 size={16} />
                    </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Task Timeline Help</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Timeline Options Explained:</h4>

                <div className="space-y-3">
                  <div>
                    <strong className="text-blue-600 dark:text-blue-400">Hard Deadline:</strong>
                    <p>Task must be completed by the specified date. The app will prioritize these tasks and schedule them with urgency.</p>
                  </div>

                  <div>
                    <strong className="text-green-600 dark:text-green-400">Flexible Target:</strong>
                    <p>You have a goal date but it's not critical. The app will try to finish by this date but may extend if needed.</p>
                  </div>

                  <div>
                    <strong className="text-purple-600 dark:text-purple-400">No Deadline:</strong>
                    <p>Perfect for learning, hobbies, and personal development. The app schedules these tasks in available time slots without pressure.</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Task Importance & Scheduling Priority:</h4>
                <div className="space-y-2">
                  <div>
                    <strong className="text-red-600 dark:text-red-400">High Impact Tasks:</strong>
                    <p>Always scheduled first, regardless of deadline type. These tasks significantly affect your success and commitments.</p>
                  </div>
                  <div>
                    <strong className="text-gray-600 dark:text-gray-400">Low Impact Tasks:</strong>
                    <p>Scheduled after high impact tasks. Will be moved or postponed if schedule becomes tight.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Use high impact for tasks that significantly affect your goals, and low impact for routine or optional tasks!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
