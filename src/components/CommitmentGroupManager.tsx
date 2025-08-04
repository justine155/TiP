import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, X, Check, Palette } from 'lucide-react';
import { CommitmentGroup, FixedCommitment } from '../types';

interface CommitmentGroupManagerProps {
  commitments: FixedCommitment[];
  onGroupsChange: (groups: CommitmentGroup[]) => void;
}

const CommitmentGroupManager: React.FC<CommitmentGroupManagerProps> = ({
  commitments,
  onGroupsChange
}) => {
  const [groups, setGroups] = useState<CommitmentGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  // Load groups from localStorage on component mount
  useEffect(() => {
    const savedGroups = localStorage.getItem('timepilot-commitment-groups');
    if (savedGroups) {
      try {
        const parsedGroups = JSON.parse(savedGroups);
        setGroups(parsedGroups);
        onGroupsChange(parsedGroups);
      } catch (e) {
        console.warn('Failed to load commitment groups:', e);
      }
    }
  }, [onGroupsChange]);

  // Save groups to localStorage whenever groups change
  useEffect(() => {
    localStorage.setItem('timepilot-commitment-groups', JSON.stringify(groups));
    onGroupsChange(groups);
  }, [groups, onGroupsChange]);

  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: CommitmentGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      commitmentIds: [],
      color: selectedColor,
      isVisible: true,
      createdAt: new Date().toISOString()
    };

    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setSelectedColor('#3B82F6');
    setIsCreating(false);
  };

  const updateGroup = (groupId: string, updates: Partial<CommitmentGroup>) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    ));
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const toggleGroupVisibility = (groupId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, isVisible: !group.isVisible } : group
    ));
  };

  const addCommitmentToGroup = (groupId: string, commitmentId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        if (!group.commitmentIds.includes(commitmentId)) {
          return { ...group, commitmentIds: [...group.commitmentIds, commitmentId] };
        }
      }
      return group;
    }));
  };

  const removeCommitmentFromGroup = (groupId: string, commitmentId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, commitmentIds: group.commitmentIds.filter(id => id !== commitmentId) }
        : group
    ));
  };

  const getCommitmentsByGroup = (group: CommitmentGroup) => {
    return commitments.filter(commitment => group.commitmentIds.includes(commitment.id));
  };

  const getUngroupedCommitments = () => {
    const groupedCommitmentIds = new Set(groups.flatMap(group => group.commitmentIds));
    return commitments.filter(commitment => !groupedCommitmentIds.has(commitment.id));
  };

  return (
    <div className="space-y-4">
      {/* Create Group Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Commitment Groups</h3>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              New Group
            </button>
          )}
        </div>

        {isCreating && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-gray-600 dark:text-gray-400" />
              <div className="flex gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedColor === color ? 'border-gray-800 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim()}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Check size={16} />
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewGroupName('');
                  setSelectedColor('#3B82F6');
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map(group => {
          const groupCommitments = getCommitmentsByGroup(group);
          const isEditing = editingGroupId === group.id;

          return (
            <div
              key={group.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 border ${
                group.isVisible ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'
              }`}
              style={{ borderLeftColor: group.color }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (newGroupName.trim()) {
                            updateGroup(group.id, { name: newGroupName.trim() });
                          }
                          setEditingGroupId(null);
                          setNewGroupName('');
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingGroupId(null);
                          setNewGroupName('');
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-800 dark:text-white">{group.name}</h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({groupCommitments.length} commitments)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleGroupVisibility(group.id)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          title={group.isVisible ? 'Hide group' : 'Show group'}
                        >
                          {group.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setNewGroupName(group.name);
                          }}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Edit group name"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete group"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {group.isVisible && (
                  <div className="space-y-2">
                    {groupCommitments.length > 0 ? (
                      <div className="grid gap-2">
                        {groupCommitments.map(commitment => (
                          <div
                            key={commitment.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                          >
                            <div>
                              <span className="font-medium text-gray-800 dark:text-white">
                                {commitment.title}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 ml-2">
                                {commitment.startTime} - {commitment.endTime}
                              </span>
                            </div>
                            <button
                              onClick={() => removeCommitmentFromGroup(group.id, commitment.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Remove from group"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No commitments in this group
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ungrouped Commitments */}
      {getUngroupedCommitments().length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-800 dark:text-white mb-3">
            Ungrouped Commitments ({getUngroupedCommitments().length})
          </h4>
          <div className="grid gap-2">
            {getUngroupedCommitments().map(commitment => (
              <div
                key={commitment.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {commitment.title}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {commitment.startTime} - {commitment.endTime}
                  </span>
                </div>
                {groups.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addCommitmentToGroup(e.target.value, commitment.id);
                      }
                    }}
                    className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">Add to group...</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitmentGroupManager;
