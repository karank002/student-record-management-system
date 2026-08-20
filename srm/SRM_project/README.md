# EduTrack Portal — run instructions

## Project ka structure
```
SRM_project/
├── backend/
│   ├── main.cpp          -> HTTP server (cpp-httplib)
│   ├── student.h         -> Student struct + JSON conversion
│   ├── linkedlist.h      -> tera apna singly linked list (DSA #1)
│   ├── hashtable.h       -> tera apna hash table, chaining wala (DSA #2)
│   ├── stack.h           -> Undo Delete (DSA #3)
│   ├── queue.h           -> Admission Queue (DSA #4)
│   ├── heap.h            -> Top-N Max-Heap (DSA #5)
│   ├── trie.h            -> Auto-complete Trie (DSA #6)
│   ├── mergesort.h       -> Merge Sort (DSA #7)
│   ├── bst.h             -> GPA Range Explorer, Binary Search Tree (DSA #8)
│   ├── graph.h           -> Study Buddy Finder, Graph + BFS (DSA #9)
│   ├── lrucache.h        -> Recently Viewed, LRU Cache (DSA #10)
│   ├── binarysearch.h    -> Find by Roll No., Binary Search (DSA #11)
│   └── include/
│       ├── httplib.h     -> single-header HTTP server library
│       └── json.hpp      -> nlohmann/json single-header library
└── frontend/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── api.js
    ├── dsa.js
    └── data.js
```

`main.cpp` andar dono DSA structures ek saath use hote hain:
- **LinkedList<Student>** — students ko insertion order mein store karta hai
- **HashTable<int, Node*>** — id se student O(1) average time mein dhoondne ke liye

Ye combo hi "asli" C++ backend hai — koi std::vector/map fake nahi, dono khud likhe hue hain.

## 1) Backend compile aur run karna

Terminal khol (Linux/WSL/Mac — g++ chahiye, version 9+):

```bash
cd backend
g++ -std=c++17 -pthread -O2 main.cpp -o edutrack_server
./edutrack_server
```

Agar sab sahi hua to ye print hoga:
```
EduTrack backend running at http://localhost:8080
```

Isko band mat karna — ye terminal chalu rehni chahiye jab tak tu app use kar raha hai.

**Windows (MinGW/g++) pe bhi same command chalega.** Agar Visual Studio use kar raha hai, naya C++ console project bana, in sab files (`main.cpp`, `*.h`, `include/*.h`) ko project mein add kar, aur `pthread` link ki zarurat nahi (Windows pe httplib khud handle karta hai).

Quick test (server chalu rehte hue, doosri terminal se):
```bash
curl http://localhost:8080/health
curl http://localhost:8080/students
```

## 2) Frontend chalana

Frontend ko seedha double-click karke (`file://`) mat khol — kuch browsers CORS/fetch block kar dete hain `file://` se. Isko bhi ek local server pe chala:

```bash
cd frontend
python3 -m http.server 5500
```

Fir browser mein khol: **http://localhost:5500**

(Python nahi hai to VS Code ka "Live Server" extension bhi chalega, ya `npx serve .`)

## 3) Dono ek saath chalne chahiye

- Terminal 1 → `backend/edutrack_server` (port **8080**)
- Terminal 2 → frontend server (port **5500**)
- Browser → `http://localhost:5500`

Login karne ke baad header mein ek **"● Backend: connected"** badge dikhega agar backend chalu hai — yehi confirm karta hai ki frontend C++ server se baat kar pa raha hai.

## Abhi ka connection status (important)

Filhaal `app.js` sirf **health-check** ke liye backend call karta hai (upar wala badge). Baaki sab — add/edit/delete student, attendance — abhi bhi local `window.STUDENTS_DATA` array pe chal raha hai, backend pe nahi. `api.js` mein saare CRUD functions (`getStudents`, `addStudent`, `updateStudent`, `deleteStudent`, `saveAttendance`) already ready hain aur maine backend mein unke matching endpoints bhi bana diye hain — bas `app.js` ke andar wahan jahan array push/splice/edit ho raha hai, wahan `window.API.xxx(...)` calls lagani hain.

Agar chahta hai to yeh wiring bhi mai kar deta hoon (poora CRUD real backend se connect) — bta dena.

## Endpoints jo backend serve karta hai

| Method | Path               | Kaam                         |
|--------|--------------------|------------------------------|
| GET    | /health            | server zinda hai check karna |
| GET    | /students          | saare students (JSON array)  |
| POST   | /students          | naya student add             |
| PUT    | /students/:id      | student update                |
| DELETE | /students/:id      | student delete (undo Stack mein push hota hai) |
| POST   | /students/undo     | last-deleted student wapas laana (Stack) |
| POST   | /admissions        | admission Queue mein enqueue |
| GET    | /admissions        | Queue ki current waiting list (FIFO order) |
| POST   | /admissions/next   | Queue se dequeue + naya Student ban jaata hai |
| GET    | /students/top?n=10 | GPA ke hisaab se Top-N (Max-Heap) |
| GET    | /students/search?prefix=ra | naam auto-complete (Trie)  |
| GET    | /students/sorted?by=gpa&order=desc | Merge Sort se sorted list |
| GET    | /students/gpa-range?min=&max=      | GPA range mein students (Binary Search Tree) |
| GET    | /students/:id/buddies?depth=2       | Study buddy suggestions (Graph + BFS) |
| GET    | /students/:id                       | Ek student fetch + Recently-Viewed LRU mein touch |
| GET    | /students/recent                    | Recently viewed students, LRU order mein |
| GET    | /students/by-roll?roll=             | Roll number se student dhoondo (Merge Sort + Binary Search) |
| POST   | /attendance        | attendance batch mark        |

## 9 naye DSA features (jo add kiye gaye hain)

Poore project mein ab **11 hand-written DSA structures** hain — 2 purane (LinkedList, HashTable) + 9 naye:

1. **Undo Delete → Stack** (`backend/stack.h`) — jab bhi koi student delete hota hai, uski copy `undoStack_` (linked-list based Stack) mein push ho jaati hai. "Undo Delete" button us Stack ko `pop()` karta hai. Viva mein bolna: LIFO, O(1) push/pop.
2. **Admission Queue → Queue** (`backend/queue.h`) — naye registrations `admissionQueue_` (linked-list based Queue) mein `enqueue()` hote hain. "Next Student" button `dequeue()` karke unhe asli Student bana deta hai. FIFO, O(1) enqueue/dequeue.
3. **Top 10 Rank List → Max-Heap** (`backend/heap.h`) — array-based binary heap. `buildFrom()` se O(n) mein heapify hota hai, phir `extractMax()` baar-baar call karke top-N GPA wale students nikalte hain — O(n + k log n).
4. **Auto-Complete Search → Trie** (`backend/trie.h`) — har student ka naam tokens mein tod ke (first/last name) trie mein insert hota hai. Prefix type karte hi us prefix ke node se DFS karke saare matching ids collect ho jaate hain.
5. **Sort Students → Merge Sort** (`backend/mergesort.h`) — textbook recursive merge sort, O(n log n), name/GPA/attendance kisi bhi field pe.
6. **GPA Range Explorer → Binary Search Tree** (`backend/bst.h`) — har student GPA ke hisaab se BST mein insert hota hai (equal GPA wale ek hi node pe bucket ho jaate hain). Range query [min, max] deni ho to poori list scan nahi karni padti — jo subtree range se bahar hai wo skip ho jaata hai. "Smart Tools" tab mein "GPA Range Explorer" panel isko demo karta hai, tree ki height bhi dikhata hai.
7. **Study Buddy Finder → Graph + BFS** (`backend/graph.h`) — jo students same subject + same grade share karte hain unke beech edge ban jaata hai (undirected adjacency list). Ek student choose karke BFS chalayi jaati hai, jo depth (1/2/3 hops) tak ke saare reachable "study buddies" closest-first order mein deti hai.
8. **Recently Viewed → LRU Cache** (`backend/lrucache.h`) — doubly linked list + hash map. Jab bhi koi student profile khulta hai, `touch(id)` call hota hai jo usko list ke front (most-recent) pe le aata hai — O(1). Capacity 5 hai, isse zyada ho to sabse purana (tail) evict ho jaata hai.
9. **Find by Roll No. → Binary Search** (`backend/binarysearch.h`) — roster ko Merge Sort se roll number ke hisaab se sort karke ek baar mein, phir classic iterative binary search — O(log n) lookup, linear scan se bahut fast.

**Frontend note:** `frontend/dsa.js` mein inhi saare structures ke matching JS versions hain (same algorithm, same naming) — taaki UI turant respond kare bina backend ke upar depend kiye (jaisa purana app.js CRUD ke liye local-first tha). Naye 4 features (BST, Graph+BFS, LRU Cache, Binary Search) "Smart Tools" tab mein UI se demo ho sakte hain, aur backend wale asli C++ endpoints upar table mein hain — inhe `curl`/Postman se demo karke viva mein code bhi dikha sakta hai.

## Login fix

Pehle login form mein email/password already pre-filled the (`teacher@school.edu` / `password123`), isliye empty submit bhi chal jaata tha, aur naam hamesha "Dr. Anjali Singh" hi dikhta tha chahe koi bhi email daalo. Ab:
- Fields khaali hote hain by default, aur real validation lagti hai (valid email format + password kam se kam 6 characters) — warna inline error dikhta hai aur form submit nahi hota.
- Jo bhi email daalo (jaise `vanshita.dhir@school.edu`), dashboard usi naam se greet karta hai (`Vanshita Dhir`) — email ke local-part ko title-case naam mein convert karke.


