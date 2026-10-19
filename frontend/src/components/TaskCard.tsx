import React from 'react';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete }) => {
  return (
    <div
      className={`group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
        task.completed
          ? 'bg-emerald-50/60 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/40'
          : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700'
      }`}
    >
      <div className="flex items-center space-x-4">
        {/* Toggle Checkbox / Circle Icon */}
        <button
          type="button"
          onClick={() => onToggle && onToggle(task.id)}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform active:scale-95 ${
            task.completed
              ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border-slate-300 bg-white hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-700'
          }`}
          aria-label={task.completed ? "Mark as pending" : "Mark as completed"}
        >
          {task.completed ? (
            <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
          )}
        </button>

        {/* Title & Status badge */}
        <div>
          <h3
            className={`text-base font-semibold transition-all ${
              task.completed
                ? 'text-slate-500 line-through dark:text-slate-400'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h3>
          <div className="mt-1 flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                task.completed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              {task.completed ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Delete / Actions */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Delete task"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};
