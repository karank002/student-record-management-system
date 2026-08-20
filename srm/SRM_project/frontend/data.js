/* ============================================================
   EduTrack Portal — data.js
   Seed data only. This is where the real data will eventually
   come from your C++ backend instead (see api.js) — app.js
   reads window.STUDENTS_DATA once at load time, so once the
   backend is wired up you can simply populate this from the
   API response before app.js runs, or replace it entirely.
   ============================================================ */

window.STUDENTS_DATA = [
  {
    id: 1,
    name: "Ravi Kumar Sharma",
    email: "ravi.sharma@school.edu",
    phone: "+91 98765 43210",
    roll: "2026001",
    dob: "2010-04-12",
    grade: "10th",
    subject: "Mathematics",
    attended: 47,
    totalClasses: 50,
    gpa: 9.2,
    status: "Active",
    guardian: "Suresh Kumar Sharma",
    address: "H.No. 24, Model Town, Ludhiana, Punjab",
    notes: "Consistently top of the class in mensuration and algebra."
  },
  {
    id: 2,
    name: "Ananya Mehta",
    email: "ananya.mehta@school.edu",
    phone: "+91 98123 45670",
    roll: "2026002",
    dob: "2010-08-25",
    grade: "10th",
    subject: "Mathematics",
    attended: 33,
    totalClasses: 50,
    gpa: 7.4,
    status: "On Leave",
    guardian: "Rakesh Mehta",
    address: "Sector 9, Chandigarh",
    notes: "On medical leave since last month, needs catch-up sessions."
  },
  {
    id: 3,
    name: "Karanveer Singh",
    email: "karanveer.singh@school.edu",
    phone: "+91 99887 65432",
    roll: "2026003",
    dob: "2009-01-05",
    grade: "3rd Sem",
    subject: "Computer Science",
    attended: 40,
    totalClasses: 48,
    gpa: 8.6,
    status: "Active",
    guardian: "Gurpreet Singh",
    address: "Civil Lines, Ludhiana, Punjab",
    notes: "Strong in DSA, participates actively in coding club."
  },
  {
    id: 4,
    name: "Priya Nair",
    email: "priya.nair@school.edu",
    phone: "+91 97654 32109",
    roll: "2026004",
    dob: "2010-11-30",
    grade: "10th",
    subject: "Mathematics",
    attended: 30,
    totalClasses: 50,
    gpa: 6.1,
    status: "Active",
    guardian: "Suresh Nair",
    address: "Kochi, Kerala",
    notes: "Attendance dropping, recommend a parent-teacher meeting."
  },
  {
    id: 5,
    name: "Arjun Deshmukh",
    email: "arjun.deshmukh@school.edu",
    phone: "+91 96543 21098",
    roll: "2026005",
    dob: "2009-06-18",
    grade: "3rd Sem",
    subject: "Computer Science",
    attended: 45,
    totalClasses: 48,
    gpa: 9.5,
    status: "Active",
    guardian: "Mahesh Deshmukh",
    address: "Pune, Maharashtra",
    notes: "Class topper, mentoring juniors in data structures."
  },
  {
    id: 6,
    name: "Simran Kaur",
    email: "simran.kaur@school.edu",
    phone: "+91 95432 10987",
    roll: "2026006",
    dob: "2010-02-14",
    grade: "10th",
    subject: "Science",
    attended: 46,
    totalClasses: 50,
    gpa: 8.8,
    status: "Active",
    guardian: "Harpreet Kaur",
    address: "Model Town, Ludhiana, Punjab",
    notes: "Excellent lab performance, interested in science olympiads."
  }
];