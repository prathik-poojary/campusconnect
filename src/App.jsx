import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CheckSquare,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Menu,
  X,
  Check,
  Filter,
  MoreHorizontal,
  Zap,
  Target,
  TrendingUp,
  Trash2,
  LogOut,
} from "lucide-react";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8085/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
}

function eventFromApi(event, userId) {
  const dateValue = new Date(event.date);
  const category = event.category || "General";

  const colorByCategory = {
    Hackathon: "violet",
    Workshop: "orange",
    Networking: "green",
    Talk: "blue",
    Social: "orange",
    General: "violet",
  };

  const attendeeUsers = event.attendeeUsers || [];

  return {
    ...event,
    id: event._id,
    type: category,
    date: dateValue.toLocaleDateString("en-US", {
      day: "2-digit",
    }),
    month: dateValue
      .toLocaleDateString("en-US", { month: "short" })
      .toUpperCase(),
    time: dateValue.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    location: event.location,
    attendees: event.attendees || 0,
    color: colorByCategory[category] || "violet",
    joined: userId
      ? attendeeUsers.some((a) => String(a) === String(userId))
      : false,
    isOwner: userId ? String(event.createdBy) === String(userId) : false,
  };
}

function taskFromApi(task) {
  let due = "No due date";

  if (task.dueDate) {
    const date = new Date(task.dueDate);
    const today = new Date();
    const tomorrow = new Date();

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueDay = new Date(date);
    dueDay.setHours(0, 0, 0, 0);

    if (dueDay.getTime() === today.getTime()) {
      due = "Today";
    } else if (dueDay.getTime() === tomorrow.getTime()) {
      due = "Tomorrow";
    } else {
      due = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  return {
    ...task,
    id: task._id,
    course: task.course || "General",
    due,
    done: Boolean(task.completed),
  };
}

const teams = [
  {
    name: "EcoTrack",
    category: "Sustainability",
    members: 4,
    needed: "Frontend developer",
    color: "green",
    initials: "ET",
  },
  {
    name: "MindSpace",
    category: "Mental wellness",
    members: 3,
    needed: "UI/UX designer",
    color: "violet",
    initials: "MS",
  },
  {
    name: "SkillSwap",
    category: "EdTech",
    members: 5,
    needed: "Backend developer",
    color: "orange",
    initials: "SS",
  },
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Campus events", icon: CalendarDays },
  { label: "Project teams", icon: Users },
  { label: "My tasks", icon: CheckSquare },
];

// Default form state helpers
const defaultEventForm = () => ({
  title: "",
  category: "Workshop",
  date: "",
  time: "10:00",
  location: "",
  description: "",
});

const defaultTaskForm = () => ({
  title: "",
  course: "",
  dueDate: "",
  priority: "Medium",
});

function App({ user, onLogout }) {
  const [page, setPage] = useState("Overview");
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);         // event creation modal
  const [taskModal, setTaskModal] = useState(false); // task creation modal
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Event creation form state
  const [eventForm, setEventForm] = useState(defaultEventForm());

  // Task creation form state
  const [taskForm, setTaskForm] = useState(defaultTaskForm());

  // Deletion in-progress tracking
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // Join/leave in-progress tracking
  const [joiningEvent, setJoiningEvent] = useState(null);

  // Capture userId once — user object doesn't change mid-session
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [eventData, taskData] = await Promise.all([
          apiRequest("/events"),
          apiRequest("/tasks"),
        ]);

        if (cancelled) return;

        setEvents(
          (Array.isArray(eventData) ? eventData : eventData.events || []).map(
            (event) => eventFromApi(event, userId),
          ),
        );

        setTasks(
          (Array.isArray(taskData) ? taskData : taskData.tasks || []).map(
            taskFromApi,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          setNotice(`Could not load your data: ${error.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completed = tasks.filter((task) => task.done).length;

  const filteredEvents = events.filter((event) =>
    `${event.title} ${event.type} ${event.location}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const filteredTeams = teams.filter((team) =>
    `${team.name} ${team.category} ${team.needed}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  // --- EVENT ATTENDANCE ---
  async function toggleJoin(id) {
    if (joiningEvent === id) return;
    const selected = events.find((event) => event.id === id);
    if (!selected) return;

    setJoiningEvent(id);

    try {
      if (selected.joined) {
        // Leave event
        const result = await apiRequest(`/events/${id}/leave`, {
          method: "PATCH",
        });
        const eventData = result.event || result;
        setEvents((prev) =>
          prev.map((event) =>
            event.id === id
              ? { ...event, attendees: eventData.attendees, joined: false }
              : event,
          ),
        );
        showNotice("You've left the event.");
      } else {
        // Join event
        const result = await apiRequest(`/events/${id}/join`, {
          method: "PATCH",
        });
        const eventData = result.event || result;
        setEvents((prev) =>
          prev.map((event) =>
            event.id === id
              ? { ...event, attendees: eventData.attendees, joined: true }
              : event,
          ),
        );
        showNotice("You're registered for this event!");
      }
    } catch (error) {
      showNotice(error.message);
    } finally {
      setJoiningEvent(null);
    }
  }

  // --- TASK TOGGLE ---
  async function toggleTask(id) {
    const selected = tasks.find((task) => task.id === id);
    if (!selected) return;

    const completedValue = !selected.done;

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: completedValue } : task,
      ),
    );

    try {
      await apiRequest(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: completedValue }),
      });
    } catch (error) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, done: !completedValue } : task,
        ),
      );
      showNotice(`Could not update task: ${error.message}`);
    }
  }

  // --- DELETE TASK ---
  async function deleteTask(id) {
    if (deletingTask === id) return;
    setDeletingTask(id);

    try {
      await apiRequest(`/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => task.id !== id));
      showNotice("Task deleted.");
    } catch (error) {
      showNotice(`Could not delete task: ${error.message}`);
    } finally {
      setDeletingTask(null);
    }
  }

  // --- DELETE EVENT ---
  async function deleteEvent(id) {
    if (deletingEvent === id) return;
    setDeletingEvent(id);

    try {
      await apiRequest(`/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((event) => event.id !== id));
      showNotice("Event deleted.");
    } catch (error) {
      showNotice(`Could not delete event: ${error.message}`);
    } finally {
      setDeletingEvent(null);
    }
  }

  // --- CREATE EVENT ---
  async function createEvent(e) {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.location.trim() || saving) return;

    setSaving(true);

    try {
      // Combine date and time into ISO string
      const combinedDate = eventForm.time
        ? `${eventForm.date}T${eventForm.time}:00`
        : `${eventForm.date}T10:00:00`;

      const result = await apiRequest("/events", {
        method: "POST",
        body: JSON.stringify({
          title: eventForm.title.trim(),
          description: eventForm.description.trim(),
          category: eventForm.category,
          date: combinedDate,
          location: eventForm.location.trim(),
        }),
      });

      const event = result.event || result;

      setEvents((prev) => [eventFromApi(event, user?.id), ...prev]);
      setEventForm(defaultEventForm());
      setModal(false);
      setPage("Campus events");

      showNotice("Your new event has been published!");
    } catch (error) {
      showNotice(`Could not create event: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  // --- CREATE TASK ---
  async function createTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim() || saving) return;

    setSaving(true);

    try {
      const result = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title.trim(),
          course: taskForm.course.trim() || "General",
          dueDate: taskForm.dueDate || undefined,
          priority: taskForm.priority,
        }),
      });

      const task = result.task || result;

      setTasks((prev) => [taskFromApi(task), ...prev]);
      setTaskForm(defaultTaskForm());
      setTaskModal(false);

      showNotice("Task added!");
    } catch (error) {
      showNotice(`Could not create task: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Determine greeting based on time of day
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  const heading = {
    Overview: [
      `${getGreeting()}, ${user?.name?.split(" ")[0] || "Student"}`,
      "Here's what's happening around your campus.",
    ],
    "Campus events": [
      "Campus events",
      "Find your people. Learn something new. Make it happen.",
    ],
    "Project teams": [
      "Find your next team",
      "Great ideas happen when the right people meet.",
    ],
    "My tasks": ["Your workspace", "A little progress every day adds up."],
  }[page];

  const initials = (user?.name || "S").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={23} />
          </div>

          <span>
            campus<span className="brand-light">connect</span>
            <small>STUDENT COMMUNITY</small>
          </span>

          <button
            className="mobile-close icon-button"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <div className="campus-switch">
          <div className="campus-avatar">N</div>

          <div>
            <strong>Northstar University</strong>
            <span>Student workspace</span>
          </div>

          <ChevronRight size={16} />
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="side-nav">
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => {
                setPage(label);
                setMobileNav(false);
              }}
            >
              <Icon size={18} strokeWidth={1.8} />

              <span>{label}</span>

              {label === "Campus events" && (
                <span className="nav-count">{events.length}</span>
              )}

              {label === "My tasks" && (
                <span className="nav-count">
                  {tasks.filter((task) => !task.done).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="nav-caption clubs-caption">YOUR COMMUNITY</div>

        <div className="club-link">
          <span className="club-dot dot-purple" /> Design Society{" "}
          <span className="club-online" />
        </div>

        <div className="club-link">
          <span className="club-dot dot-orange" /> Entrepreneurship Club
        </div>

        <div className="club-link">
          <span className="club-dot dot-green" /> Developer Circle
        </div>

        <div className="sidebar-spacer" />

        <div className="upgrade-card">
          <div className="upgrade-icon">
            <Sparkles size={18} />
          </div>

          <strong>
            Your next big thing
            <br />
            starts on campus.
          </strong>

          <p>Meet collaborators, explore events, and bring ideas to life.</p>

          <button onClick={() => setPage("Project teams")}>
            Explore community <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="profile">
          <div className="profile-avatar">{initials}</div>

          <div className="profile-info">
            <strong>{user?.name || "Student"}</strong>
            <span>{user?.email || "Student account"}</span>
          </div>

          <button
            type="button"
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={onLogout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <div className="mobile-overlay" onClick={() => setMobileNav(false)} />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                aria-label="Search"
              />

              <kbd>⌘ K</kbd>
            </label>

            <button
              className="notification icon-button"
              onClick={() => showNotice("You're all caught up!")}
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span />
            </button>

            <div className="top-avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          {loading && (
            <div className="loading-banner">
              <div className="loading-spinner" />
              Connecting to CampusConnect database…
            </div>
          )}

          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />{" "}
                {new Date()
                  .toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </div>

              <h1>
                {heading[0]}
                <span className="heading-period">.</span>
              </h1>

              <p className="page-subtitle">{heading[1]}</p>
            </div>

            <div className="welcome-actions">
              {page === "My tasks" ? (
                <button
                  className="primary-button"
                  onClick={() => setTaskModal(true)}
                  id="add-task-btn"
                >
                  <Plus size={18} /> Add task
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => setModal(true)}
                  id="create-event-btn"
                >
                  <Plus size={18} /> Create event
                </button>
              )}
            </div>
          </div>

          {page === "Overview" && (
            <>
              <section className="hero-banner">
                <div className="hero-content">
                  <div className="hero-pill">
                    <Sparkles size={13} /> YOUR CAMPUS, CONNECTED
                  </div>

                  <h2>
                    Make this semester
                    <br />
                    count <span>for something.</span>
                  </h2>

                  <p>
                    Your next opportunity, collaborator, or big idea could be
                    one click away.
                  </p>

                  <button
                    onClick={() => setPage("Campus events")}
                    className="hero-button"
                  >
                    Explore what's happening <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-star star-one">✳</div>
                  <div className="art-star star-two">✦</div>

                  <div className="art-card art-card-one">
                    <Zap size={18} />
                    <span>
                      Build something
                      <br />
                      <b>remarkable.</b>
                    </span>
                  </div>

                  <div className="art-card art-card-two">
                    <Users size={19} />
                    <span>
                      Better <b>together</b>
                    </span>
                  </div>

                  <div className="art-center">
                    <GraduationCap size={47} />
                  </div>

                  <div className="art-bubble">✦</div>
                </div>
              </section>

              <section className="stats-grid">
                <Stat
                  icon={CalendarDays}
                  label="Upcoming events"
                  value={events.length}
                  note="Across your campus"
                  color="purple"
                />

                <Stat
                  icon={Users}
                  label="Active communities"
                  value="12"
                  note="Find your people"
                  color="orange"
                />

                <Stat
                  icon={CheckSquare}
                  label="Tasks completed"
                  value={`${completed}/${tasks.length}`}
                  note={`${Math.round(
                    (completed / (tasks.length || 1)) * 100,
                  )}% of your checklist`}
                  color="green"
                />

                <Stat
                  icon={TrendingUp}
                  label="Events joined"
                  value={events.filter((e) => e.joined).length}
                  note="Events you're attending"
                  color="blue"
                />
              </section>

              <div className="dashboard-grid">
                <section className="panel events-panel">
                  <PanelHeading
                    title="Happening on campus"
                    subtitle="Don't miss out on what's next"
                    action="View all events"
                    onAction={() => setPage("Campus events")}
                  />

                  <div className="event-list">
                    {loading ? (
                      <div className="list-loading">Loading events…</div>
                    ) : filteredEvents.length === 0 ? (
                      <Empty message="No events yet. Create the first one!" />
                    ) : (
                      filteredEvents.slice(0, 3).map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          onJoin={toggleJoin}
                          onDelete={deleteEvent}
                          joining={joiningEvent === event.id}
                          deleting={deletingEvent === event.id}
                        />
                      ))
                    )}
                  </div>
                </section>

                <section className="panel tasks-panel">
                  <PanelHeading
                    title="Your to-do list"
                    subtitle={`${
                      tasks.filter((task) => !task.done).length
                    } things left to tackle`}
                    action="All tasks"
                    onAction={() => setPage("My tasks")}
                  />

                  <div className="task-list">
                    {loading ? (
                      <div className="list-loading">Loading tasks…</div>
                    ) : tasks.length === 0 ? (
                      <Empty message="No tasks yet. Add your first task!" />
                    ) : (
                      tasks.slice(0, 4).map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onDelete={deleteTask}
                          deleting={deletingTask === task.id}
                        />
                      ))
                    )}
                  </div>

                  {tasks.length > 0 && (
                    <div className="task-progress">
                      <div>
                        <span>Weekly progress</span>
                        <strong>
                          {Math.round((completed / (tasks.length || 1)) * 100)}%
                        </strong>
                      </div>

                      <div className="progress-track">
                        <div
                          style={{
                            width: `${(completed / (tasks.length || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <section className="panel teams-panel">
                <PanelHeading
                  title="Teams looking for you"
                  subtitle="Collaborate on something that matters"
                  action="Explore teams"
                  onAction={() => setPage("Project teams")}
                />

                <div className="teams-grid">
                  {teams.map((team) => (
                    <TeamCard
                      key={team.name}
                      team={team}
                      onJoin={() => {
                        showNotice(`Interest sent to ${team.name}!`);
                      }}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {page === "Campus events" && (
            <section className="panel full-panel">
              <PanelHeading
                title="Discover events"
                subtitle={`${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""} to explore`}
              />

              <div className="filter-bar">
                <span>
                  <Filter size={16} /> All events
                </span>

                <span className="filter-hint">
                  Search by title, category, or location above
                </span>
              </div>

              <div className="event-list">
                {loading ? (
                  <div className="list-loading">Loading events…</div>
                ) : filteredEvents.length === 0 ? (
                  <Empty message="No events found. Try another search or create an event." />
                ) : (
                  filteredEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onJoin={toggleJoin}
                      onDelete={deleteEvent}
                      joining={joiningEvent === event.id}
                      deleting={deletingEvent === event.id}
                    />
                  ))
                )}
              </div>
            </section>
          )}

          {page === "Project teams" && (
            <section className="panel full-panel">
              <PanelHeading
                title="Find your people"
                subtitle={`${filteredTeams.length} teams to explore`}
              />

              <div className="teams-grid teams-grid-large">
                {filteredTeams.map((team) => (
                  <TeamCard
                    key={team.name}
                    team={team}
                    onJoin={() => {
                      showNotice(`Interest sent to ${team.name}!`);
                    }}
                  />
                ))}

                {filteredTeams.length === 0 && (
                  <Empty message="No teams found. Try a different search." />
                )}
              </div>
            </section>
          )}

          {page === "My tasks" && (
            <section className="panel full-panel">
              <PanelHeading
                title="Your tasks"
                subtitle={`${completed} of ${tasks.length} task${tasks.length !== 1 ? "s" : ""} completed`}
              />

              <div className="task-list full-task-list">
                {loading ? (
                  <div className="list-loading">Loading tasks…</div>
                ) : tasks.length === 0 ? (
                  <Empty message="No tasks yet. Hit 'Add task' to get started!" />
                ) : (
                  tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      deleting={deletingTask === task.id}
                    />
                  ))
                )}
              </div>

              {tasks.length > 0 && (
                <div className="task-progress">
                  <div>
                    <span>Overall progress</span>
                    <strong>
                      {Math.round((completed / (tasks.length || 1)) * 100)}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      style={{
                        width: `${(completed / (tasks.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          <footer className="footer">
            <span>© 2026 CampusConnect</span>

            <span>
              Built for students, powered by community{" "}
              <span className="footer-heart">♥</span>
            </span>

            <span>Made with intention.</span>
          </footer>
        </div>
      </main>

      {/* Toast notification */}
      {notice && (
        <div className="toast" role="alert" aria-live="polite">
          <span className="toast-check">
            <Check size={15} />
          </span>

          {notice}

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Event creation modal */}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal(false);
              setEventForm(defaultEventForm());
            }
          }}
        >
          <form className="event-modal" onSubmit={createEvent} noValidate>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">CAMPUS COMMUNITY</div>
                <h2>Create an event</h2>
                <p>Bring people together around something great.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setModal(false);
                  setEventForm(defaultEventForm());
                }}
                aria-label="Close event form"
              >
                <X />
              </button>
            </div>

            <label className="field-label">
              Event name *
              <input
                autoFocus
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Open source meetup"
                required
                maxLength={100}
              />
            </label>

            <label className="field-label">
              Category
              <select
                value={eventForm.category}
                onChange={(e) => setEventForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option>Workshop</option>
                <option>Hackathon</option>
                <option>Networking</option>
                <option>Talk</option>
                <option>Social</option>
                <option>General</option>
              </select>
            </label>

            <div className="form-row">
              <label className="field-label">
                Date *
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </label>

              <label className="field-label">
                Time
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))}
                />
              </label>
            </div>

            <label className="field-label">
              Location *
              <input
                value={eventForm.location}
                onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Engineering Block, Room 201"
                required
                maxLength={120}
              />
            </label>

            <label className="field-label">
              Description
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell people what to expect…"
                rows={3}
                maxLength={500}
              />
            </label>

            <button
              className="primary-button modal-submit"
              type="submit"
              disabled={saving || !eventForm.title.trim() || !eventForm.date || !eventForm.location.trim()}
            >
              {saving ? (
                "Publishing…"
              ) : (
                <>
                  <Plus size={17} /> Publish event
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Task creation modal */}
      {taskModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTaskModal(false);
              setTaskForm(defaultTaskForm());
            }
          }}
        >
          <form className="event-modal" onSubmit={createTask} noValidate>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">YOUR WORKSPACE</div>
                <h2>Add a task</h2>
                <p>Stay on top of your coursework and commitments.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setTaskModal(false);
                  setTaskForm(defaultTaskForm());
                }}
                aria-label="Close task form"
              >
                <X />
              </button>
            </div>

            <label className="field-label">
              Task title *
              <input
                autoFocus
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Submit CS assignment"
                required
                maxLength={120}
              />
            </label>

            <label className="field-label">
              Course / subject
              <input
                value={taskForm.course}
                onChange={(e) => setTaskForm((f) => ({ ...f, course: e.target.value }))}
                placeholder="e.g. Computer Science"
                maxLength={60}
              />
            </label>

            <div className="form-row">
              <label className="field-label">
                Due date
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </label>

              <label className="field-label">
                Priority
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>

            <button
              className="primary-button modal-submit"
              type="submit"
              disabled={saving || !taskForm.title.trim()}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Plus size={17} /> Add task
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, note, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={19} />
      </div>

      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function PanelHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      {action && (
        <button className="text-link" onClick={onAction}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}

function EventRow({ event, onJoin, onDelete, joining, deleting }) {
  return (
    <div className="event-row">
      <div className={`event-date ${event.color}`}>
        <strong>{event.date}</strong>
        <span>{event.month}</span>
      </div>

      <div className="event-details">
        <div className="event-title-line">
          <h4>{event.title}</h4>
          <span className={`type-tag ${event.color}`}>{event.type}</span>
        </div>

        <div className="event-meta">
          <span>
            <Clock size={13} />
            {event.time}
          </span>

          <span>
            <MapPin size={13} />
            {event.location}
          </span>

          <span>
            <Users size={13} />
            {event.attendees} going
          </span>
        </div>
      </div>

      <div className="event-actions">
        <button
          className={`join-button ${event.joined ? "joined" : ""}`}
          onClick={() => onJoin(event.id)}
          disabled={joining}
          aria-label={event.joined ? "Leave event" : "Join event"}
        >
          {joining ? (
            "…"
          ) : event.joined ? (
            <>
              <Check size={14} /> Going
            </>
          ) : (
            "Join event"
          )}
        </button>

        {event.isOwner && (
          <button
            className="icon-button delete-btn"
            onClick={() => onDelete(event.id)}
            disabled={deleting}
            aria-label="Delete event"
            title="Delete event"
          >
            {deleting ? "…" : <Trash2 size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, deleting }) {
  return (
    <div className={`task-row ${task.done ? "task-done" : ""}`}>
      <button
        className={`task-check ${task.done ? "checked" : ""}`}
        onClick={() => onToggle(task.id)}
        aria-label={`Mark ${task.title} ${
          task.done ? "incomplete" : "complete"
        }`}
      >
        {task.done && <Check size={13} />}
      </button>

      <div className="task-main">
        <strong>{task.title}</strong>
        <span>
          {task.course}
          {task.priority && task.priority !== "Medium" && (
            <span className={`priority-tag priority-${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
          )}
        </span>
      </div>

      <span
        className={`task-due ${
          task.due === "Today" && !task.done ? "due-today" : ""
        }`}
      >
        {task.done ? "Completed" : task.due}
      </span>

      <button
        className="icon-button delete-btn"
        onClick={() => onDelete(task.id)}
        disabled={deleting}
        aria-label="Delete task"
        title="Delete task"
      >
        {deleting ? "…" : <Trash2 size={14} />}
      </button>
    </div>
  );
}

function TeamCard({ team, onJoin }) {
  return (
    <div className="team-card">
      <div className="team-card-top">
        <div className={`team-logo ${team.color}`}>{team.initials}</div>

        <button className="icon-button team-more" aria-label="More options">
          <MoreHorizontal size={19} />
        </button>
      </div>

      <span className={`team-category ${team.color}`}>{team.category}</span>

      <h4>{team.name}</h4>

      <div className="team-members">
        <Users size={14} />
        {team.members} members <span>·</span> Open to collaborators
      </div>

      <div className="team-needs">
        <Target size={15} />
        <span>
          Looking for <strong>{team.needed}</strong>
        </span>
      </div>

      <button className="team-join" onClick={onJoin}>
        I'm interested <ArrowUpRight size={15} />
      </button>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="empty-state">
      <div>
        <Search size={21} />
      </div>

      <p>{message}</p>
    </div>
  );
}

export default App;
