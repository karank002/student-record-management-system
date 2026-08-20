/* ============================================================
   EduTrack Portal — api.js
   Thin wrapper around fetch() calls to the C++ backend.
   No framework — just the native fetch API talking to a
   cpp-httplib server that wraps your DSA (linked list / BST /
   hashmap) student-record logic.

   Expected backend endpoints (adjust to match your C++ server):
     GET    /health                 -> 200 OK if server is alive
     GET    /students                -> [ {student}, ... ]
     POST   /students                -> create, body = {student}
     PUT    /students/:id            -> update, body = {student}
     DELETE /students/:id             -> delete
     POST   /attendance              -> body = { date, records: [{id, present}] }

   Every function fails soft: if the backend is unreachable
   (server not running, wrong port, CORS issue, etc.) it throws
   a normal Error which the caller can catch — app.js currently
   runs entirely off window.STUDENTS_DATA, so nothing breaks if
   the backend isn't up yet. Once your C++ server is running,
   you can swap app.js's local-array logic for calls into
   window.API one function at a time.
   ============================================================ */

window.API = (function () {
  "use strict";

  // Change this once your C++ server is up and listening.
  const BASE_URL = "http://localhost:8080";

  // Small helper: fetch with a timeout so a dead backend doesn't
  // hang the UI forever (e.g. while the badge is checking status).
  async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function request(path, options = {}) {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${options.method || "GET"} ${path} failed: ${res.status} ${text}`);
    }
    // DELETE may return no body
    const contentLength = res.headers.get("content-length");
    if (contentLength === "0") return null;
    return res.json().catch(() => null);
  }

  /* ---------------- Health / status ---------------- */

  /** Returns true if the C++ backend responds, false otherwise. Never throws. */
  async function checkStatus() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/health`, {}, 2500);
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  /* ---------------- Students CRUD ---------------- */

  /** Fetch the full student list from the backend. */
  function getStudents() {
    return request("/students", { method: "GET" });
  }

  /** Create a new student. Returns the created student (with backend-assigned id). */
  function addStudent(studentData) {
    return request("/students", {
      method: "POST",
      body: JSON.stringify(studentData)
    });
  }

  /** Update an existing student by id. */
  function updateStudent(id, studentData) {
    return request(`/students/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(studentData)
    });
  }

  /** Delete a single student by id. */
  function deleteStudent(id) {
    return request(`/students/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }

  /** Delete multiple students at once (loops client-side; swap for a
   *  bulk endpoint on the backend later if you add one there). */
  async function deleteStudents(ids) {
    const results = await Promise.allSettled(ids.map((id) => deleteStudent(id)));
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      throw new Error(`${failed.length} of ${ids.length} deletions failed`);
    }
    return true;
  }

  /* ---------------- Attendance ---------------- */

  /** Save a batch of attendance marks for a given date.
   *  records: [{ id, present: true|false }, ...] */
  function saveAttendance(date, records) {
    return request("/attendance", {
      method: "POST",
      body: JSON.stringify({ date, records })
    });
  }

  /* ---------------- Undo Delete (backend Stack) ---------------- */

  /** Pops the backend's undo Stack and restores the last-deleted student. */
  function undoDelete() {
    return request("/students/undo", { method: "POST" });
  }

  /* ---------------- Admission Queue (backend Queue) ---------------- */

  /** Enqueue a new registration onto the backend's FIFO admission queue. */
  function enqueueAdmission(data) {
    return request("/admissions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  /** List everyone currently waiting, front of queue first (non-destructive). */
  function getAdmissionQueue() {
    return request("/admissions", { method: "GET" });
  }

  /** Dequeue the front of the line and admit them as a full student. */
  function admitNextStudent() {
    return request("/admissions/next", { method: "POST" });
  }

  /* ---------------- Top-N by GPA (backend Max-Heap) ---------------- */

  function getTopStudents(n = 10) {
    return request(`/students/top?n=${encodeURIComponent(n)}`, { method: "GET" });
  }

  /* ---------------- Auto-complete (backend Trie) ---------------- */

  function searchStudentsByPrefix(prefix) {
    return request(`/students/search?prefix=${encodeURIComponent(prefix)}`, { method: "GET" });
  }

  /* ---------------- Sort (backend Merge Sort) ---------------- */

  function getSortedStudents(by = "name", order = "asc") {
    return request(`/students/sorted?by=${encodeURIComponent(by)}&order=${encodeURIComponent(order)}`, { method: "GET" });
  }

  /* ---------------- Public API ---------------- */
  return {
    BASE_URL,
    checkStatus,
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteStudents,
    saveAttendance,
    undoDelete,
    enqueueAdmission,
    getAdmissionQueue,
    admitNextStudent,
    getTopStudents,
    searchStudentsByPrefix,
    getSortedStudents
  };
})();