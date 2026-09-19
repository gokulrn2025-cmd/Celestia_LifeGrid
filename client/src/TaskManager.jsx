import { useState } from "react";
import { Plus, Check, Trash2, X } from "lucide-react";

function TaskManager() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Complete project review",
      dueDate: "Today",
      priority: "High",
      completed: false,
    },
    {
      id: 2,
      title: "Finish DBMS assignment",
      dueDate: "Today",
      priority: "Medium",
      completed: false,
    },
    {
      id: 3,
      title: "Organise project files",
      dueDate: "Completed",
      priority: "Low",
      completed: true,
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: "",
    priority: "Medium",
  });

  function addTask() {
    if (!newTask.title.trim()) {
      return;
    }

    const task = {
      id: Date.now(),
      title: newTask.title,
      dueDate: newTask.dueDate || "No date",
      priority: newTask.priority,
      completed: false,
    };

    setTasks([...tasks, task]);

    setNewTask({
      title: "",
      dueDate: "",
      priority: "Medium",
    });

    setShowForm(false);
  }

  function toggleTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  return (
    <div className="task-manager">

      <div className="task-page-header">
        <div>
          <h2>Tasks</h2>
          <p>Manage your daily tasks and priorities.</p>
        </div>

        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          Add Task
        </button>
      </div>

      {showForm && (
        <div className="task-form">

          <div className="form-header">
            <h3>New Task</h3>

            <button
              className="close-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) =>
              setNewTask({
                ...newTask,
                title: e.target.value,
              })
            }
          />

          <div className="form-row">

            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  dueDate: e.target.value,
                })
              }
            />

            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  priority: e.target.value,
                })
              }
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>

          </div>

          <button
            className="save-task"
            onClick={addTask}
          >
            Add Task
          </button>

        </div>
      )}

      <div className="task-manager-list">

        {tasks.map((task) => (
          <div
            className={`task-card ${
              task.completed ? "task-done" : ""
            }`}
            key={task.id}
          >

            <button
              className={`task-circle ${
                task.completed ? "task-circle-done" : ""
              }`}
              onClick={() => toggleTask(task.id)}
            >
              {task.completed && <Check size={14} />}
            </button>

            <div className="task-card-info">

              <strong>{task.title}</strong>

              <span>
                Due: {task.dueDate}
              </span>

            </div>

            <span
              className={`task-priority ${task.priority.toLowerCase()}`}
            >
              {task.priority}
            </span>

            <button
              className="delete-task"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 size={17} />
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}

export default TaskManager;