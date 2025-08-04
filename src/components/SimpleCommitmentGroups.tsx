import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, X, Edit, Trash2, Edit3 } from 'lucide-react';
import { FixedCommitment, CommitmentGroup } from '../types';

interface SimpleCommitmentGroupsProps {
  commitments: FixedCommitment[];
  onEditCommitment: (commitment: FixedCommitment) => void;
  onDeleteCommitment: (id: string) => void;
  showOnlyUngrouped?: boolean;
  showOnlyGrouped?: boolean;
}

const SimpleCommitmentGroups: React.FC<SimpleCommitmentGroupsProps> = ({
  commitments,
  onEditCommitment,
  onDeleteCommitment,
  showOnlyUngrouped = false,
  showOnlyGrouped = false
}) => {
  const [groups, setGroups] = useState<CommitmentGroup[]>(() => {
    // Initialize groups from localStorage immediately
    const savedGroups = localStorage.getItem('timepilot-commitment-groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        console.log('Loaded commitment groups from localStorage:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('Failed to load commitment groups:', e);
        return [];
      }
    }
    return [];
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Save groups to localStorage whenever groups change
  useEffect(() => {
    console.log('Saving commitment groups to localStorage:', groups);
    localStorage.setItem('timepilot-commitment-groups', JSON.stringify(groups));
  }, [groups]);

  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: CommitmentGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      commitmentIds: [],
      isVisible: true,
      createdAt: new Date().toISOString()
    };

    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setIsCreatingGroup(false);
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
      if (group.id === groupId && !group.commitmentIds.includes(commitmentId)) {
        return { ...group, commitmentIds: [...group.commitmentIds, commitmentId] };
      }
      return group;
    }));
  };

  const removeCommitmentFromGroup = (commitmentId: string) => {
    setGroups(prev => prev.map(group => ({
      ...group,
      commitmentIds: group.commitmentIds.filter(id => id !== commitmentId)
    })));
  };

  const editGroupName = (groupId: string, newName: string) => {
    if (newName.trim()) {
      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, name: newName.trim() } : group
      ));
    }
    setEditingGroupId(null);
    setNewGroupName('');
  };

  const getGroupedCommitments = () => {
    const groupedCommitmentIds = new Set(groups.flatMap(group => group.commitmentIds));
    return commitments.filter(commitment => !groupedCommitmentIds.has(commitment.id));
  };

  const renderCommitment = (commitment: FixedCommitment, inGroup = false) => (
    <div key={commitment.id} className="p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white truncate">{commitment.title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize flex-shrink-0 ${
              commitment.type === 'class' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
              commitment.type === 'work' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
              commitment.type === 'appointment' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
            }`}>
              {commitment.type}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">⏰</span>
              <span>{commitment.startTime} - {commitment.endTime}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">📅</span>
              <span className="truncate">{commitment.daysOfWeek.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}</span>
            </div>
            {commitment.location && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">📍</span>
                <span className="truncate">{commitment.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
          {inGroup && (
            <button
              onClick={() => removeCommitmentFromGroup(commitment.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
              title="Remove from group"
            >
              <X size={16} />
            </button>
          )}
          {!inGroup && groups.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addCommitmentToGroup(e.target.value, commitment.id);
                }
              }}
              className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
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
          <button
            onClick={() => onEditCommitment(commitment)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            title="Edit commitment"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={() => onDeleteCommitment(commitment.id)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            title="Delete commitment"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  if (commitments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No commitments added yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Add your class schedule, work hours, and other fixed commitments above to see them organized here.
        </p>
      </div>
    );
  }

  // If showing only ungrouped, render differently
  if (showOnlyUngrouped) {
    const ungroupedCommitments = getGroupedCommitments();
    return (
      <div className="space-y-4">
        {ungroupedCommitments.length === 0 ? (
          groups.length > 0 ? (
            <p className="text-gray-500 text-center py-8 dark:text-gray-400">
              All commitments are organized in groups. Check the "Commitment Groups" section below.
            </p>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No commitments added yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add your class schedule, work hours, and other fixed commitments above to see them here.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {ungroupedCommitments.length} ungrouped commitment{ungroupedCommitments.length !== 1 ? 's' : ''}
              </span>
              {groups.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  💡 Use the dropdown to add these to a group
                </p>
              )}
            </div>
            <div className="space-y-3">
              {ungroupedCommitments.map(commitment => renderCommitment(commitment, false))}
            </div>
          </>
        )}
      </div>
    );
  }

  // If showing only grouped, render group management
  if (showOnlyGrouped) {
    return (
      <div className="space-y-4">
        {/* Create Group Button */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {groups.length > 0 ? `${groups.length} group${groups.length !== 1 ? 's' : ''} created` : 'Group your commitments by category'}
            </span>
            {groups.length === 0 && commitments.length > 2 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                💡 Create groups like "Classes", "Work", or "Personal" to organize better
              </p>
            )}
          </div>
          {!isCreatingGroup && (
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 font-medium"
            >
              <Plus size={14} />
              New Group
            </button>
          )}
        </div>

        {/* Create Group Form */}
        {isCreatingGroup && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g., Classes, Work, Personal)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingGroup(false);
                  setNewGroupName('');
                }}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Groups */}
        {groups.length === 0 && !isCreatingGroup ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No groups created yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Create groups to organize your commitments by category
            </p>
          </div>
        ) : (
          groups.map(group => {
            const groupCommitments = commitments.filter(c => group.commitmentIds.includes(c.id));
            
            return (
              <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {editingGroupId === group.id ? (
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') editGroupName(group.id, newGroupName);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-800 dark:text-white">{group.name}</h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({groupCommitments.length})
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingGroupId === group.id ? (
                        <>
                          <button
                            onClick={() => editGroupName(group.id, newGroupName)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => setEditingGroupId(null)}
                            className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
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
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            title="Delete group"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {group.isVisible && (
                  <div className="p-4 space-y-3">
                    {groupCommitments.length > 0 ? (
                      groupCommitments.map(commitment => renderCommitment(commitment, true))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-4">
                        No commitments in this group. Use the dropdown on ungrouped commitments to add them here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Default behavior (show everything) - this should not be used in the new layout
  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-center py-8 dark:text-gray-400">
        Component configuration error. Please use showOnlyUngrouped or showOnlyGrouped props.
      </p>
    </div>
  );
};

export default SimpleCommitmentGroups;
