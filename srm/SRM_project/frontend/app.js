/* ============================================================
   EduTrack Portal — app.js
   All UI logic lives here. No framework, no localStorage.
   Talks to the C++ backend through window.API (defined in api.js)
   if that file is present; otherwise runs fully in-memory using
   the seed data from data.js so the UI is testable on its own.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  const state = {
    students: [],          // populated from backend (or seed data as fallback)
    currentTab: "overview",
    search: "",
    statusFilter: "all",
    sortBy: "name-asc",
    page: 1,
    pageSize: 6,
    selectedIds: new Set(),
    editingId: null,
    detailId: null,
    nextId: 1,
    teacher: {
      name: "Dr. Anjali Singh",
      email: "anjali.singh@school.edu",
      phone: "+91 99887 76655",
      institution: "Delhi Public School",
      department: "Mathematics",
      bio: "Passionate educator with 12+ years of experience in secondary and higher education."
    },
    // ---- DSA-feature structures (see dsa.js) ----
    undoStack: new window.DSA.Stack(),        // Undo Delete
    admissionQueue: new window.DSA.Queue(),   // Admission / Waiting Queue
    nameTrie: new window.DSA.Trie(),          // Auto-complete search
    gpaTree: new window.DSA.GpaBST(),         // GPA Range Explorer (BST)
    buddyGraph: new window.DSA.StudyGraph(),  // Study Buddy Finder (Graph + BFS)
    recentViews: new window.DSA.LRUCache(5),  // Recently Viewed (LRU Cache)
    nextQueueId: 1
  };



  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function initials(name) {
    return (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function attendancePct(s) {
    if (!s.totalClasses) return 0;
    return Math.round((s.attended / s.totalClasses) * 100);
  }

  function statusClass(status) {
    return status === "Active" ? "status-Active" : "status-OnLeave";
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function showToast(message, type = "info") {
    const container = $("#toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity .25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  /* ----------------------------------------------------------
     LOGIN
  ---------------------------------------------------------- */
  // Turns "vanshita.dhir@school.edu" into "Vanshita Dhir" so
  // whoever's email is typed in is who the dashboard greets.
  function nameFromEmail(email) {
    const local = String(email || "").split("@")[0];
    const words = local.split(/[.\-_0-9]+/).filter(Boolean);
    if (!words.length) return "Teacher";
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(inputSel, errorSel, message) {
    const input = $(inputSel);
    const error = $(errorSel);
    if (message) {
      input.classList.add("input-invalid");
      error.textContent = message;
      error.classList.remove("hidden");
    } else {
      input.classList.remove("input-invalid");
      error.textContent = "";
      error.classList.add("hidden");
    }
    return !message;
  }

  function initLogin() {
    const form = $("#login-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = $("#login-email").value.trim();
      const password = $("#login-password").value;

      // Real validation: an empty or malformed email, or a short/blank
      // password, blocks sign-in instead of silently letting anyone in.
      const emailOk = setFieldError(
        "#login-email", "#login-email-error",
        !email ? "Email is required." : !EMAIL_RE.test(email) ? "Enter a valid email address." : ""
      );
      const passwordOk = setFieldError(
        "#login-password", "#login-password-error",
        !password ? "Password is required." : password.length < 6 ? "Password must be at least 6 characters." : ""
      );
      if (!emailOk || !passwordOk) return;

      // Whoever's email is typed in is who's signed in — the teacher
      // profile now reflects the entered account, not a fixed name.
      state.teacher.name = nameFromEmail(email);
      state.teacher.email = email;

      $("#login-container").classList.add("hidden");
      $("#app-container").classList.remove("hidden");
      applyTeacherToHeader();

      // --- Load students from the C++ backend, fallback to seed data ---
      (async () => {
        try {
          if (window.API && typeof window.API.getStudents === "function") {
            const fromBackend = await window.API.getStudents();
            if (Array.isArray(fromBackend) && fromBackend.length > 0) {
              state.students = fromBackend;
            } else {
              // Backend returned empty — seed it with our local data
              state.students = window.STUDENTS_DATA ? [...window.STUDENTS_DATA] : [];
              if (window.API && state.students.length > 0) {
                // Push seed students to backend silently
                await Promise.allSettled(state.students.map(s => window.API.addStudent(s)));
              }
            }
          } else {
            state.students = window.STUDENTS_DATA ? [...window.STUDENTS_DATA] : [];
          }
        } catch (err) {
          // Backend unreachable — run in local-data mode
          state.students = window.STUDENTS_DATA ? [...window.STUDENTS_DATA] : [];
        }
        // Compute next free ID from the loaded roster
        state.nextId = state.students.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
        renderAll();
        showToast(`Signed in as ${state.teacher.name}`, "success");
      })();
    });

    // clear a field's error as soon as the person starts fixing it
    $("#login-email").addEventListener("input", () => setFieldError("#login-email", "#login-email-error", ""));
    $("#login-password").addEventListener("input", () => setFieldError("#login-password", "#login-password-error", ""));

    const toggleBtn = $("#btn-toggle-password");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const input = $("#login-password");
        const isPwd = input.type === "password";
        input.type = isPwd ? "text" : "password";
        toggleBtn.textContent = isPwd ? "🙈" : "👁";
      });
    }

    checkBackendStatus();
  }

  async function checkBackendStatus() {
    const badge = $("#backend-status-badge");
    if (!badge) return;
    if (window.API && typeof window.API.checkStatus === "function") {
      try {
        const ok = await window.API.checkStatus();
        badge.textContent = ok ? "● Backend: connected" : "● Backend: offline (using local data)";
        badge.className = "status-badge " + (ok ? "status-connected" : "status-offline");
        return;
      } catch (err) {
        badge.textContent = "● Backend: offline (using local data)";
        badge.className = "status-badge status-offline";
        return;
      }
    }
    badge.textContent = "● Backend: not connected (local mode)";
    badge.className = "status-badge status-unknown";
  }

  /* ----------------------------------------------------------
     TABS
  ---------------------------------------------------------- */
  function switchTab(tab) {
    state.currentTab = tab;
    $$(".tab-view").forEach((v) => v.classList.remove("active"));
    $$(".nav-tab").forEach((b) => b.classList.remove("active"));

    const view = $(`#view-${tab}`);
    const btn = $(`.nav-tab[data-tab="${tab}"]`);
    if (view) view.classList.add("active");
    if (btn) btn.classList.add("active");

    if (tab === "overview") renderOverview();
    if (tab === "students") renderStudentsTab();
    if (tab === "admissions") renderAdmissionsTab();
    if (tab === "attendance") renderAttendanceTab();
    if (tab === "reports") renderReports();
    if (tab === "smart") renderSmartTools();
  }

  function renderAll() {
    state.nameTrie.rebuild(state.students);
    state.gpaTree.rebuild(state.students);
    state.buddyGraph.rebuild(state.students);
    renderOverview();
    renderStudentsTab();
    renderAdmissionsTab();
    renderAttendanceTab();
    renderReports();
    renderSmartTools();
    updateUndoButton();
  }

  /* ----------------------------------------------------------
     OVERVIEW TAB
  ---------------------------------------------------------- */
  function renderOverview() {
    const s = state.students;
    const total = s.length;
    const active = s.filter((x) => x.status === "Active").length;
    const onLeave = total - active;
    const avgGpa = total ? (s.reduce((sum, x) => sum + Number(x.gpa || 0), 0) / total) : 0;
    const avgAttendance = total ? Math.round(s.reduce((sum, x) => sum + attendancePct(x), 0) / total) : 0;

    $("#stat-total").textContent = total;
    $("#stat-active").textContent = active;
    $("#stat-leave").textContent = onLeave;
    $("#stat-gpa").textContent = avgGpa.toFixed(1);
    $("#stat-attendance").textContent = avgAttendance + "%";

    $("#student-count-summary").textContent = `You have ${total} students enrolled.`;
    $("#welcome-text").textContent = `Welcome back, ${state.teacher.name}`;

    renderGradeChart();
    renderRecentStudents();
    renderAtRisk();
  }

  function renderGradeChart() {
    const wrap = $("#dynamic-chart");
    if (!wrap) return;
    const counts = {};
    state.students.forEach((s) => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    wrap.innerHTML = Object.entries(counts).map(([grade, count]) => `
      <div class="chart-bar-col">
        <span class="chart-bar-value">${count}</span>
        <div class="chart-bar" style="height:${(count / max) * 100}%"></div>
        <span class="chart-bar-label">${escapeHtml(grade)}</span>
      </div>
    `).join("") || `<p class="hint-text">No data yet — add a student to see this chart.</p>`;
  }

  function renderRecentStudents() {
    const wrap = $("#recent-students-container");
    if (!wrap) return;
    const recent = [...state.students].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5);
    wrap.innerHTML = recent.map(studentRowHtml).join("") ||
      `<p class="hint-text">No students added yet.</p>`;
    bindRowClicks(wrap);
  }

  function renderAtRisk() {
    const wrap = $("#at-risk-container");
    if (!wrap) return;
    const atRisk = state.students.filter((s) => attendancePct(s) < 75)
      .sort((a, b) => attendancePct(a) - attendancePct(b)).slice(0, 5);
    wrap.innerHTML = atRisk.map(studentRowHtml).join("") ||
      `<p class="hint-text">No at-risk students right now 🎉</p>`;
    bindRowClicks(wrap);
  }

  function studentRowHtml(s) {
    return `
      <div class="mini-student-row" data-id="${s.id}">
        <div class="avatar-circle">${initials(s.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(s.name)}</div>
          <div class="row-sub">${escapeHtml(s.roll)} · ${escapeHtml(s.grade)}</div>
        </div>
        <div class="row-metric">${attendancePct(s)}%</div>
      </div>
    `;
  }

  function bindRowClicks(wrap) {
    wrap.querySelectorAll(".mini-student-row").forEach((row) => {
      row.addEventListener("click", () => openDetailModal(row.dataset.id));
    });
  }

  /* ----------------------------------------------------------
     STUDENTS TAB
  ---------------------------------------------------------- */
  function initStudentsTabControls() {
    $("#search-input").addEventListener("input", debounce((e) => {
      state.search = e.target.value.trim().toLowerCase();
      state.page = 1;
      renderStudentsGrid();
    }, 250));

    // Trie-powered autocomplete dropdown (see dsa.js -> Trie)
    $("#search-input").addEventListener("input", (e) => {
      renderAutocomplete(e.target.value.trim());
    });
    $("#search-input").addEventListener("focus", (e) => {
      if (e.target.value.trim()) renderAutocomplete(e.target.value.trim());
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box-autocomplete")) hideAutocomplete();
    });

    $("#btn-undo-delete").addEventListener("click", handleUndoDelete);

    $("#filter-status").addEventListener("change", (e) => {
      state.statusFilter = e.target.value;
      state.page = 1;
      renderStudentsGrid();
    });

    $("#sort-by").addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      renderStudentsGrid();
    });

    $("#select-all-checkbox").addEventListener("change", (e) => {
      const visible = getFilteredSortedStudents();
      const pageItems = paginate(visible);
      pageItems.forEach((s) => {
        if (e.target.checked) state.selectedIds.add(String(s.id));
        else state.selectedIds.delete(String(s.id));
      });
      renderStudentsGrid();
    });

    $("#btn-prev-page").addEventListener("click", () => {
      if (state.page > 1) { state.page--; renderStudentsGrid(); }
    });
    $("#btn-next-page").addEventListener("click", () => {
      const total = getFilteredSortedStudents().length;
      const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page < maxPage) { state.page++; renderStudentsGrid(); }
    });

    $("#btn-export-csv").addEventListener("click", exportCsv);
    $("#btn-bulk-delete").addEventListener("click", bulkDeleteSelected);

    $("#btn-open-add-modal").addEventListener("click", () => openStudentModal(null));
    $("#btn-close-student-modal").addEventListener("click", closeStudentModal);
    $("#student-form").addEventListener("submit", handleStudentFormSubmit);
  }

  function getFilteredSortedStudents() {
    let list = state.students.filter((s) => {
      const matchesSearch = !state.search ||
        s.name.toLowerCase().includes(state.search) ||
        s.email.toLowerCase().includes(state.search) ||
        String(s.roll).toLowerCase().includes(state.search);
      const matchesStatus = state.statusFilter === "all" || s.status === state.statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sorted with our own Merge Sort (dsa.js) instead of Array#sort —
    // same O(n log n) divide-and-conquer algorithm as backend/mergesort.h.
    const [field, dir] = state.sortBy.split("-");
    const mul = dir === "asc" ? 1 : -1;
    list = window.DSA.mergeSort(list, (a, b) => {
      let av, bv;
      if (field === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (field === "gpa") { av = Number(a.gpa); bv = Number(b.gpa); }
      else if (field === "attendance") { av = attendancePct(a); bv = attendancePct(b); }
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });

    return list;
  }

  function paginate(list) {
    const start = (state.page - 1) * state.pageSize;
    return list.slice(start, start + state.pageSize);
  }

  function renderStudentsTab() {
    initStudentsTabControlsOnce();
    renderStudentsGrid();
  }

  let controlsInitialized = false;
  function initStudentsTabControlsOnce() {
    if (controlsInitialized) return;
    initStudentsTabControls();
    controlsInitialized = true;
  }

  function renderStudentsGrid() {
    const grid = $("#students-grid-container");
    const filtered = getFilteredSortedStudents();
    const pageItems = paginate(filtered);
    const maxPage = Math.max(1, Math.ceil(filtered.length / state.pageSize));

    if (state.page > maxPage) state.page = maxPage;

    grid.innerHTML = pageItems.map(studentCardHtml).join("") ||
      `<p class="hint-text">No students match your search/filter.</p>`;

    $("#current-count").textContent = pageItems.length;
    $("#total-count").textContent = filtered.length;
    $("#page-indicator").textContent = `Page ${state.page} of ${maxPage}`;

    grid.querySelectorAll(".student-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("student-select-checkbox")) return;
        openDetailModal(card.dataset.id);
      });
    });
    grid.querySelectorAll(".student-select-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) state.selectedIds.add(id);
        else state.selectedIds.delete(id);
        updateBulkDeleteButton();
      });
    });

    updateBulkDeleteButton();
  }

  function updateBulkDeleteButton() {
    const btn = $("#btn-bulk-delete");
    const count = state.selectedIds.size;
    $("#bulk-count").textContent = count;
    btn.classList.toggle("hidden", count === 0);
  }

  function studentCardHtml(s) {
    const checked = state.selectedIds.has(String(s.id)) ? "checked" : "";
    return `
      <div class="student-card" data-id="${s.id}">
        <input type="checkbox" class="student-select-checkbox" data-id="${s.id}" ${checked}>
        <div class="student-card-top">
          <div class="avatar-circle">${initials(s.name)}</div>
          <div>
            <div class="student-name">${escapeHtml(s.name)}</div>
            <div class="student-meta">${escapeHtml(s.grade)} · ${escapeHtml(s.subject)}</div>
            <span class="roll-badge">${escapeHtml(s.roll)}</span>
          </div>
        </div>
        <div class="student-card-footer">
          <span class="status-pill ${statusClass(s.status)}">${escapeHtml(s.status)}</span>
          <span class="gpa-tag">GPA ${Number(s.gpa).toFixed(1)} · ${attendancePct(s)}%</span>
        </div>
      </div>
    `;
  }

  async function bulkDeleteSelected() {
    if (state.selectedIds.size === 0) return;
    if (!confirm(`Delete ${state.selectedIds.size} selected student(s)? You can undo this from the Students tab.`)) return;
    const toDelete = state.students.filter((s) => state.selectedIds.has(String(s.id)));
    // Call backend delete for each (pushes to backend Stack for undo)
    try {
      if (window.API && typeof window.API.deleteStudents === "function") {
        await window.API.deleteStudents([...state.selectedIds]);
      }
    } catch (err) { /* fall through to local delete */ }
    // Push each onto the local undo Stack (LIFO) before removing
    toDelete.forEach((s) => state.undoStack.push(s));
    state.students = state.students.filter((s) => !state.selectedIds.has(String(s.id)));
    state.selectedIds.clear();
    renderAll();
    showToast(`${toDelete.length} student(s) deleted — Undo available`, "success");
  }

  function exportCsv() {
    const list = getFilteredSortedStudents();
    if (list.length === 0) {
      showToast("Nothing to export", "error");
      return;
    }
    const headers = ["Roll No", "Name", "Email", "Phone", "Grade", "Subject", "GPA", "Attendance %", "Status"];
    const rows = list.map((s) => [
      s.roll, s.name, s.email, s.phone, s.grade, s.subject, s.gpa, attendancePct(s) + "%", s.status
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported", "success");
  }

  /* ----------------------------------------------------------
     AUTO-COMPLETE SEARCH (Trie)
  ---------------------------------------------------------- */
  function renderAutocomplete(query) {
    const dropdown = $("#autocomplete-dropdown");
    if (!dropdown) return;
    if (!query) { hideAutocomplete(); return; }

    const ids = state.nameTrie.collectIdsForPrefix(query);
    const matches = ids
      .map((id) => state.students.find((s) => String(s.id) === String(id)))
      .filter(Boolean)
      .slice(0, 6);

    if (matches.length === 0) { hideAutocomplete(); return; }

    dropdown.innerHTML = matches.map((s) => `
      <div class="autocomplete-item" data-id="${s.id}">
        <div class="avatar-circle small">${initials(s.name)}</div>
        <div>
          <div class="row-name">${escapeHtml(s.name)}</div>
          <div class="row-sub">${escapeHtml(s.roll)} · ${escapeHtml(s.grade)}</div>
        </div>
      </div>
    `).join("");
    dropdown.classList.remove("hidden");

    dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.addEventListener("click", () => {
        const s = state.students.find((x) => String(x.id) === item.dataset.id);
        hideAutocomplete();
        if (s) openDetailModal(s.id);
      });
    });
  }

  function hideAutocomplete() {
    const dropdown = $("#autocomplete-dropdown");
    if (dropdown) dropdown.classList.add("hidden");
  }

  /* ----------------------------------------------------------
     UNDO DELETE (Stack)
  ---------------------------------------------------------- */
  function pushUndo(student) {
    state.undoStack.push(student);
    updateUndoButton();
  }

  async function handleUndoDelete() {
    // Try backend Stack first (it holds the most-recently-deleted student)
    try {
      if (window.API && typeof window.API.undoDelete === "function") {
        const restored = await window.API.undoDelete();
        if (restored && restored.id) {
          // Also pop from local stack if it matches, to keep them in sync
          if (!state.undoStack.isEmpty() && String(state.undoStack.peek().id) === String(restored.id)) {
            state.undoStack.pop();
          }
          // Avoid duplicates
          if (!state.students.find(s => String(s.id) === String(restored.id))) {
            state.students.push(restored);
          }
          renderAll();
          showToast(`Restored "${restored.name}" from the undo stack`, "success");
          return;
        }
      }
    } catch (err) { /* fall through to local stack */ }
    // Fallback: local in-memory Stack
    const restored = state.undoStack.pop();
    if (!restored) return;
    state.students.push(restored);
    renderAll();
    showToast(`Restored "${restored.name}" from the undo stack`, "success");
  }

  function updateUndoButton() {
    const btn = $("#btn-undo-delete");
    if (!btn) return;
    btn.disabled = state.undoStack.isEmpty();
    btn.title = state.undoStack.isEmpty()
      ? "Nothing to undo"
      : `Undo delete of "${state.undoStack.peek().name}"`;
  }

  /* ----------------------------------------------------------
     ADD / EDIT STUDENT MODAL
  ---------------------------------------------------------- */
  function openStudentModal(id) {
    state.editingId = id;
    const modal = $("#student-modal");
    const form = $("#student-form");
    form.reset();

    if (id) {
      const s = state.students.find((x) => String(x.id) === String(id));
      if (!s) return;
      $("#modal-title").textContent = "Edit Student";
      $("#btn-save-student").textContent = "Save Changes";
      $("#student-edit-id").value = s.id;
      $("#stud-name").value = s.name;
      $("#stud-email").value = s.email;
      $("#stud-phone").value = s.phone;
      $("#stud-roll").value = s.roll;
      $("#stud-dob").value = s.dob || "";
      $("#stud-grade").value = s.grade;
      $("#stud-subject").value = s.subject;
      $("#stud-attended").value = s.attended;
      $("#stud-total-classes").value = s.totalClasses;
      $("#stud-gpa").value = s.gpa;
      $("#stud-status").value = s.status;
      $("#stud-guardian").value = s.guardian || "";
      $("#stud-address").value = s.address || "";
      $("#stud-notes").value = s.notes || "";
    } else {
      $("#modal-title").textContent = "Add New Student";
      $("#btn-save-student").textContent = "Add Student";
      $("#student-edit-id").value = "";
    }

    modal.classList.remove("hidden");
  }

  function closeStudentModal() {
    $("#student-modal").classList.add("hidden");
    state.editingId = null;
  }

  async function handleStudentFormSubmit(e) {
    e.preventDefault();
    const id = $("#student-edit-id").value;

    const data = {
      name: $("#stud-name").value.trim(),
      email: $("#stud-email").value.trim(),
      phone: $("#stud-phone").value.trim(),
      roll: $("#stud-roll").value.trim(),
      dob: $("#stud-dob").value,
      grade: $("#stud-grade").value.trim(),
      subject: $("#stud-subject").value.trim(),
      attended: Number($("#stud-attended").value),
      totalClasses: Number($("#stud-total-classes").value),
      gpa: Number($("#stud-gpa").value),
      status: $("#stud-status").value,
      guardian: $("#stud-guardian").value.trim(),
      address: $("#stud-address").value.trim(),
      notes: $("#stud-notes").value.trim()
    };

    if (id) {
      // --- UPDATE ---
      try {
        if (window.API && typeof window.API.updateStudent === "function") {
          await window.API.updateStudent(id, data);
        }
      } catch (err) { /* fall through to local update */ }
      const idx = state.students.findIndex((x) => String(x.id) === String(id));
      if (idx > -1) state.students[idx] = { ...state.students[idx], ...data };
      showToast("Student updated", "success");
    } else {
      // --- ADD ---
      let newStudent = null;
      try {
        if (window.API && typeof window.API.addStudent === "function") {
          newStudent = await window.API.addStudent(data);
        }
      } catch (err) { /* fall through to local add */ }
      if (newStudent && newStudent.id) {
        state.students.push(newStudent);
        state.nextId = Math.max(state.nextId, Number(newStudent.id) + 1);
      } else {
        data.id = state.nextId++;
        state.students.push(data);
      }
      showToast("Student added", "success");
    }

    closeStudentModal();
    renderAll();
  }

  /* ----------------------------------------------------------
     STUDENT DETAIL / PROFILE VIEW MODAL
  ---------------------------------------------------------- */
  function openDetailModal(id) {
    const s = state.students.find((x) => String(x.id) === String(id));
    if (!s) return;
    state.detailId = id;
    state.recentViews.touch(s.id); // LRU Cache: mark as most recently viewed
    if ($("#lru-results")) renderLruResults();

    $("#detail-avatar").textContent = initials(s.name);
    $("#detail-name").textContent = s.name;
    $("#detail-roll-grade").textContent = `${s.roll} · ${s.grade} · ${s.subject}`;
    $("#detail-status").textContent = s.status;
    $("#detail-status").className = "status-pill " + statusClass(s.status);
    $("#detail-gpa").textContent = Number(s.gpa).toFixed(1);
    $("#detail-attendance-pct").textContent = attendancePct(s) + "%";
    $("#detail-classes").textContent = `${s.attended}/${s.totalClasses}`;
    $("#detail-progress-fill").style.width = attendancePct(s) + "%";
    $("#detail-email").textContent = s.email;
    $("#detail-phone").textContent = s.phone;
    $("#detail-dob").textContent = s.dob || "—";
    $("#detail-subject").textContent = s.subject;
    $("#detail-guardian").textContent = s.guardian || "—";
    $("#detail-address").textContent = s.address || "—";
    $("#detail-notes").textContent = s.notes || "—";

    $("#student-detail-modal").classList.remove("hidden");
  }

  function closeDetailModal() {
    $("#student-detail-modal").classList.add("hidden");
    state.detailId = null;
  }

  function initDetailModal() {
    $("#btn-close-detail-modal").addEventListener("click", closeDetailModal);
    $("#btn-detail-edit").addEventListener("click", () => {
      const id = state.detailId;
      closeDetailModal();
      openStudentModal(id);
    });
    $("#btn-detail-delete").addEventListener("click", async () => {
      const id = state.detailId;
      const s = state.students.find((x) => String(x.id) === String(id));
      if (!s) return;
      if (!confirm("Delete this student? You can undo it from the Students tab.")) return;
      // Call backend delete (which also pushes to the backend Stack for undo)
      try {
        if (window.API && typeof window.API.deleteStudent === "function") {
          await window.API.deleteStudent(id);
        }
      } catch (err) { /* fall through to local delete */ }
      // Always keep local undo stack in sync
      pushUndo(s);
      state.students = state.students.filter((x) => String(x.id) !== String(id));
      closeDetailModal();
      renderAll();
      showToast(`"${s.name}" deleted — Undo available`, "success");
    });
  }

  /* ----------------------------------------------------------
     ADMISSIONS TAB (Queue)
  ---------------------------------------------------------- */
  function renderAdmissionsTab() {
    initAdmissionsControlsOnce();
    const items = state.admissionQueue.toArray();
    const wrap = $("#admission-queue-container");
    const sizeLabel = $("#queue-size-label");
    const tabBadge = $("#admissions-tab-count");
    const nextBtn = $("#btn-admit-next");

    if (sizeLabel) sizeLabel.textContent = `(${items.length} waiting)`;
    if (tabBadge) {
      tabBadge.textContent = items.length;
      tabBadge.classList.toggle("hidden", items.length === 0);
    }
    if (nextBtn) nextBtn.disabled = items.length === 0;

    if (!wrap) return;
    wrap.innerHTML = items.map((req, i) => `
      <div class="mini-student-row queue-row ${i === 0 ? "queue-front" : ""}">
        <div class="queue-position">${i === 0 ? "FRONT →" : "#" + (i + 1)}</div>
        <div class="avatar-circle">${initials(req.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(req.name)}</div>
          <div class="row-sub">${escapeHtml(req.roll)} · ${escapeHtml(req.grade)} · ${escapeHtml(req.subject)}</div>
        </div>
      </div>
    `).join("") || `<p class="hint-text">Queue is empty — no one is waiting right now.</p>`;
  }

  let admissionsControlsInitialized = false;
  function initAdmissionsControlsOnce() {
    if (admissionsControlsInitialized) return;
    admissionsControlsInitialized = true;

    $("#admission-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const req = {
        queueId: state.nextQueueId++,
        name: $("#adm-name").value.trim(),
        email: $("#adm-email").value.trim(),
        phone: $("#adm-phone").value.trim(),
        roll: $("#adm-roll").value.trim(),
        grade: $("#adm-grade").value.trim(),
        subject: $("#adm-subject").value.trim(),
        dob: "", guardian: "", address: "", notes: ""
      };
      // Try backend Queue first
      try {
        if (window.API && typeof window.API.enqueueAdmission === "function") {
          await window.API.enqueueAdmission(req);
        }
      } catch (err) { /* fall through to local queue */ }
      state.admissionQueue.enqueue(req); // local Queue mirror
      e.target.reset();
      renderAdmissionsTab();
      showToast(`"${req.name}" joined the admission queue`, "success");
    });

    $("#btn-admit-next").addEventListener("click", async () => {
      // Try backend Queue dequeue + auto-create student
      try {
        if (window.API && typeof window.API.admitNextStudent === "function") {
          const student = await window.API.admitNextStudent();
          if (student && student.id) {
            // Sync local queue by dequeuing the front
            state.admissionQueue.dequeue();
            if (!state.students.find(s => String(s.id) === String(student.id))) {
              state.students.push(student);
              state.nextId = Math.max(state.nextId, Number(student.id) + 1);
            }
            renderAll();
            showToast(`"${student.name}" admitted as a new student`, "success");
            return;
          }
        }
      } catch (err) { /* fall through to local queue */ }
      // Fallback: local Queue
      const req = state.admissionQueue.dequeue();
      if (!req) { showToast("Queue is empty", "error"); return; }
      const student = {
        id: state.nextId++,
        name: req.name, email: req.email, phone: req.phone, roll: req.roll,
        dob: req.dob || "", grade: req.grade, subject: req.subject,
        attended: 0, totalClasses: 0, gpa: 0, status: "Active",
        guardian: req.guardian || "", address: req.address || "", notes: req.notes || ""
      };
      state.students.push(student);
      renderAll();
      showToast(`"${student.name}" admitted as a new student`, "success");
    });
  }

  /* ----------------------------------------------------------
     ATTENDANCE TAB
  ---------------------------------------------------------- */
  function renderAttendanceTab() {
    const dateInput = $("#attendance-date");
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
    const tbody = $("#attendance-table-body");
    tbody.innerHTML = state.students.map((s) => `
      <tr data-id="${s.id}">
        <td>${escapeHtml(s.roll)}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.grade)}</td>
        <td><input type="checkbox" class="attendance-present-checkbox" data-id="${s.id}" checked></td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="hint-text">No students to mark attendance for.</td></tr>`;
  }

  function initAttendanceControls() {
    $("#btn-save-attendance").addEventListener("click", async () => {
      const rows = $$(".attendance-present-checkbox");
      const date = $("#attendance-date").value;
      // Build records array for backend
      const records = [];
      rows.forEach((cb) => {
        const s = state.students.find((x) => String(x.id) === cb.dataset.id);
        if (!s) return;
        records.push({ id: Number(cb.dataset.id), present: cb.checked });
        // Update local state immediately
        s.totalClasses = (s.totalClasses || 0) + 1;
        if (cb.checked) s.attended = (s.attended || 0) + 1;
      });
      // Send to backend (fire-and-forget — local state is already updated)
      try {
        if (window.API && typeof window.API.saveAttendance === "function") {
          await window.API.saveAttendance(date, records);
        }
      } catch (err) { /* local state already updated, ignore */ }
      renderAll();
      showToast("Attendance saved for " + date, "success");
    });
  }

  /* ----------------------------------------------------------
     REPORTS TAB
  ---------------------------------------------------------- */
  function renderReports() {
    renderGpaDistribution();
    renderAttendanceBuckets();
    renderTopPerformers();
  }

  function renderGpaDistribution() {
    const wrap = $("#gpa-distribution-chart");
    const buckets = { "0-4": 0, "4-6": 0, "6-8": 0, "8-10": 0 };
    state.students.forEach((s) => {
      const g = Number(s.gpa);
      if (g < 4) buckets["0-4"]++;
      else if (g < 6) buckets["4-6"]++;
      else if (g < 8) buckets["6-8"]++;
      else buckets["8-10"]++;
    });
    const max = Math.max(1, ...Object.values(buckets));
    wrap.innerHTML = Object.entries(buckets).map(([label, count]) => `
      <div class="chart-bar-col">
        <span class="chart-bar-value">${count}</span>
        <div class="chart-bar" style="height:${(count / max) * 100}%"></div>
        <span class="chart-bar-label">${label}</span>
      </div>
    `).join("");
  }

  function renderAttendanceBuckets() {
    const wrap = $("#attendance-buckets-chart");
    const buckets = { "<60%": 0, "60-75%": 0, "75-90%": 0, "90-100%": 0 };
    state.students.forEach((s) => {
      const p = attendancePct(s);
      if (p < 60) buckets["<60%"]++;
      else if (p < 75) buckets["60-75%"]++;
      else if (p < 90) buckets["75-90%"]++;
      else buckets["90-100%"]++;
    });
    const max = Math.max(1, ...Object.values(buckets));
    wrap.innerHTML = Object.entries(buckets).map(([label, count]) => `
      <div class="chart-bar-col">
        <span class="chart-bar-value">${count}</span>
        <div class="chart-bar" style="height:${(count / max) * 100}%"></div>
        <span class="chart-bar-label">${label}</span>
      </div>
    `).join("");
  }

  function renderTopPerformers() {
    const wrap = $("#top-performers-container");
    // Max-Heap: build a heap keyed by GPA, extract-max repeatedly for
    // the top 10 — see dsa.js -> DSA.topN (mirrors backend/heap.h).
    const top = window.DSA.topN(
      state.students, 10,
      (a, b) => Number(a.gpa) < Number(b.gpa)
    );
    const medals = ["🥇", "🥈", "🥉"];
    wrap.innerHTML = top.map((s, i) => `
      <div class="mini-student-row rank-row" data-id="${s.id}">
        <div class="rank-badge">${medals[i] || "#" + (i + 1)}</div>
        <div class="avatar-circle">${initials(s.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(s.name)}</div>
          <div class="row-sub">${escapeHtml(s.roll)} · ${escapeHtml(s.grade)}</div>
        </div>
        <div class="row-metric">GPA ${Number(s.gpa).toFixed(1)}</div>
      </div>
    `).join("") || `<p class="hint-text">No students yet.</p>`;
    bindRowClicks(wrap);
  }

  /* ----------------------------------------------------------
     SMART TOOLS TAB (BST, Graph+BFS, LRU Cache, Binary Search)
  ---------------------------------------------------------- */
  function renderSmartTools() {
    initSmartToolsControlsOnce();
    populateBuddySelectOnce();
    renderBstResults();
    renderBuddyResults();
    renderLruResults();
  }

  function renderBstResults() {
    const statsEl = $("#bst-stats");
    const wrap = $("#bst-results");
    if (!wrap) return;
    const lo = Number($("#bst-min").value);
    const hi = Number($("#bst-max").value);
    const ids = state.gpaTree.queryRange(lo, hi);
    const byId = new Map(state.students.map((s) => [s.id, s]));
    const matches = ids.map((id) => byId.get(id)).filter(Boolean)
      .sort((a, b) => Number(b.gpa) - Number(a.gpa));

    statsEl.innerHTML = `<span class="hint-text">Tree height: ${state.gpaTree.height()} · ${matches.length} match(es) in [${lo}, ${hi}]</span>`;
    wrap.innerHTML = matches.map((s) => `
      <div class="mini-student-row" data-id="${s.id}">
        <div class="avatar-circle">${initials(s.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(s.name)}</div>
          <div class="row-sub">${escapeHtml(s.roll)} · ${escapeHtml(s.grade)}</div>
        </div>
        <div class="row-metric">GPA ${Number(s.gpa).toFixed(1)}</div>
      </div>
    `).join("") || `<p class="hint-text">No students in that GPA range.</p>`;
    bindRowClicks(wrap);
  }

  function populateBuddySelectOnce() {
    const select = $("#buddy-student-select");
    if (!select || select.dataset.bound === "1") {
      // still keep options fresh if the roster changed
      if (select) fillBuddySelectOptions(select);
      return;
    }
    select.dataset.bound = "1";
    fillBuddySelectOptions(select);
  }

  function fillBuddySelectOptions(select) {
    const prev = select.value;
    select.innerHTML = state.students.map((s) =>
      `<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.subject)} · ${escapeHtml(s.grade)}</option>`
    ).join("") || `<option value="">No students yet</option>`;
    if (prev && state.students.some((s) => String(s.id) === prev)) select.value = prev;
  }

  function renderBuddyResults() {
    const wrap = $("#buddy-results");
    if (!wrap) return;
    const select = $("#buddy-student-select");
    const startId = Number(select.value);
    const depth = Number($("#buddy-depth").value);
    if (!startId) {
      wrap.innerHTML = `<p class="hint-text">Add a student first.</p>`;
      return;
    }
    const byId = new Map(state.students.map((s) => [s.id, s]));
    const ids = state.buddyGraph.buddiesWithinDepth(startId, depth);
    const matches = ids.map((id) => byId.get(id)).filter(Boolean);
    wrap.innerHTML = matches.map((s) => `
      <div class="mini-student-row" data-id="${s.id}">
        <div class="avatar-circle">${initials(s.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(s.name)}</div>
          <div class="row-sub">${escapeHtml(s.subject)} · ${escapeHtml(s.grade)}</div>
        </div>
        <div class="row-metric">${escapeHtml(s.status)}</div>
      </div>
    `).join("") || `<p class="hint-text">No study buddies found within that many hops — try increasing depth.</p>`;
    bindRowClicks(wrap);
  }

  function renderLruResults() {
    const wrap = $("#lru-results");
    if (!wrap) return;
    const byId = new Map(state.students.map((s) => [s.id, s]));
    const ids = state.recentViews.toArray().filter((id) => byId.has(id));
    wrap.innerHTML = ids.map((id) => {
      const s = byId.get(id);
      return `
        <div class="mini-student-row" data-id="${s.id}">
          <div class="avatar-circle">${initials(s.name)}</div>
          <div class="row-main">
            <div class="row-name">${escapeHtml(s.name)}</div>
            <div class="row-sub">${escapeHtml(s.roll)} · ${escapeHtml(s.grade)}</div>
          </div>
          <div class="row-metric">${escapeHtml(s.status)}</div>
        </div>
      `;
    }).join("") || `<p class="hint-text">Open a student's profile to see it appear here.</p>`;
    bindRowClicks(wrap);
  }

  function renderRollSearchResult(student, queriedRoll) {
    const wrap = $("#roll-search-result");
    if (!wrap) return;
    if (!student) {
      wrap.innerHTML = `<p class="hint-text">No student found with roll number "${escapeHtml(queriedRoll)}".</p>`;
      return;
    }
    wrap.innerHTML = `
      <div class="mini-student-row" data-id="${student.id}">
        <div class="avatar-circle">${initials(student.name)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(student.name)}</div>
          <div class="row-sub">${escapeHtml(student.roll)} · ${escapeHtml(student.grade)}</div>
        </div>
        <div class="row-metric">GPA ${Number(student.gpa).toFixed(1)}</div>
      </div>
    `;
    bindRowClicks(wrap);
  }

  function initSmartToolsControlsOnce() {
    const section = $("#view-smart");
    if (!section || section.dataset.bound === "1") return;
    section.dataset.bound = "1";

    $("#btn-bst-search").addEventListener("click", renderBstResults);
    $("#btn-find-buddies").addEventListener("click", renderBuddyResults);

    $("#btn-roll-search").addEventListener("click", () => {
      const roll = $("#roll-search-input").value.trim();
      if (!roll) { renderRollSearchResult(null, ""); return; }
      // Merge Sort once, then Binary Search -- mirrors backend/binarysearch.h.
      const sorted = window.DSA.mergeSort(state.students, (a, b) => (a.roll < b.roll ? -1 : a.roll > b.roll ? 1 : 0));
      const found = window.DSA.binarySearchByRoll(sorted, roll);
      renderRollSearchResult(found, roll);
    });
    $("#roll-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); $("#btn-roll-search").click(); }
    });
  }

  /* ----------------------------------------------------------
     PROFILE MODAL
  ---------------------------------------------------------- */
  function applyTeacherToHeader() {
    $(".profile-name").textContent = state.teacher.name;
    $$(".avatar-circle").forEach((el) => {
      if (el.closest("#profile-trigger") || el.closest(".main-header")) {
        el.textContent = initials(state.teacher.name);
      }
    });
  }

  function initProfileModal() {
    $("#profile-trigger").addEventListener("click", () => {
      $("#prof-name").value = state.teacher.name;
      $("#prof-email").value = state.teacher.email;
      $("#prof-phone").value = state.teacher.phone;
      $("#prof-inst").value = state.teacher.institution;
      $("#prof-dept").value = state.teacher.department;
      $("#prof-bio").value = state.teacher.bio;
      $("#profile-modal").classList.remove("hidden");
    });

    $("#btn-close-profile-modal").addEventListener("click", () => {
      $("#profile-modal").classList.add("hidden");
    });

    $("#profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      state.teacher.name = $("#prof-name").value.trim();
      state.teacher.email = $("#prof-email").value.trim();
      state.teacher.phone = $("#prof-phone").value.trim();
      state.teacher.institution = $("#prof-inst").value.trim();
      state.teacher.department = $("#prof-dept").value.trim();
      state.teacher.bio = $("#prof-bio").value.trim();
      applyTeacherToHeader();
      renderOverview();
      $("#profile-modal").classList.add("hidden");
      showToast("Profile updated", "success");
    });
  }

  /* ----------------------------------------------------------
     DARK MODE + NOTIFICATIONS (header actions)
  ---------------------------------------------------------- */
  function initHeaderActions() {
    const darkBtn = $("#btn-dark-mode");
    if (darkBtn) {
      darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        darkBtn.textContent = document.body.classList.contains("dark-mode") ? "☀" : "🌙";
      });
    }

    const notifBtn = $("#btn-notifications");
    if (notifBtn) {
      notifBtn.addEventListener("click", () => {
        $("#notif-dot").classList.add("hidden");
        showToast("You're all caught up — no new notifications.", "info");
      });
    }
  }

  /* ----------------------------------------------------------
     MODAL BACKDROP CLICK-TO-CLOSE
  ---------------------------------------------------------- */
  function initBackdropClose() {
    $$(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.add("hidden");
      });
    });
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function init() {
    initLogin();
    initDetailModal();
    initAttendanceControls();
    initProfileModal();
    initHeaderActions();
    initBackdropClose();
  }

  document.addEventListener("DOMContentLoaded", init);

  // expose a small public API for inline onclick handlers in index.html
  window.app = {
    switchTab
  };
})();