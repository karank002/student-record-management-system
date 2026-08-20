// EduTrack Portal -- C++ backend
//
// Serves the REST API that frontend/api.js expects, built on top of
// two hand-written DSA structures:
//   - LinkedList<Student>   : ordered storage (insertion order)
//   - HashTable<int, Node*> : O(1) average id -> node lookup
//
// Endpoints (matches api.js exactly):
//   GET    /health
//   GET    /students
//   POST   /students
//   PUT    /students/:id
//   DELETE /students/:id
//   POST   /attendance

#include "include/httplib.h"
#include "include/json.hpp"
#include "student.h"
#include "linkedlist.h"
#include "hashtable.h"
#include "stack.h"
#include "queue.h"
#include "heap.h"
#include "trie.h"
#include "mergesort.h"
#include "bst.h"
#include "graph.h"
#include "lrucache.h"
#include "binarysearch.h"

#include <iostream>
#include <mutex>
#include <vector>
#include <string>
#include <algorithm>
#include <cctype>

using json = nlohmann::json;
using ListNode = LinkedList<Student>::Node;

// ---------------------------------------------------------------------
// In-memory "database": linked list + hash table working together.
// ---------------------------------------------------------------------
class StudentStore {
public:
    StudentStore() {
        seed();
    }

    json getAll() {
        std::lock_guard<std::mutex> lock(mutex_);
        json arr = json::array();
        list_.forEach([&arr](const Student& s) { arr.push_back(s.toJson()); });
        return arr;
    }

    // Returns the created student as JSON.
    json add(const json& body) {
        std::lock_guard<std::mutex> lock(mutex_);
        Student s = Student::fromJson(body);
        if (s.id == 0 || index_.find(s.id) != nullptr) {
            s.id = nextId_++;
        } else {
            nextId_ = std::max(nextId_, s.id + 1);
        }
        ListNode* node = list_.pushBack(s);
        index_.insert(s.id, node);
        nameTrie_.insertName(s.name, s.id);
        rebuildIndexes();
        return node->data.toJson();
    }

    // Returns true + fills out on success, false if id not found.
    bool update(int id, const json& body, json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        ListNode** found = index_.find(id);
        if (!found) return false;
        ListNode* node = *found;
        node->data = Student::fromJson(body, node->data);
        node->data.id = id; // id in the URL always wins
        nameTrie_.insertName(node->data.name, node->data.id); // additive; see trie.h note
        rebuildIndexes();
        out = node->data.toJson();
        return true;
    }

    // Removes a student, but first pushes a copy onto the undo Stack
    // so undoDelete() can bring it back. Classic Stack use case.
    bool remove(int id) {
        std::lock_guard<std::mutex> lock(mutex_);
        ListNode** found = index_.find(id);
        if (!found) return false;
        undoStack_.push((*found)->data); // save a copy before it's gone
        index_.remove(id);
        list_.removeIf([id](const Student& s) { return s.id == id; });
        recentViews_.remove(id);
        rebuildIndexes();
        return true;
    }

    // Pops the most recently deleted student off the Stack and
    // re-inserts it (at the tail, since it's a singly linked list).
    // Returns false if there's nothing to undo.
    bool undoDelete(json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        Student restored;
        if (!undoStack_.pop(restored)) return false;
        // If a new student grabbed this id in the meantime, keep the
        // original id anyway -- ids are unique because add() only ever
        // hands out ids >= nextId_, so a bare re-insert is always safe.
        ListNode* node = list_.pushBack(restored);
        index_.insert(restored.id, node);
        nameTrie_.insertName(restored.name, restored.id);
        rebuildIndexes();
        out = restored.toJson();
        return true;
    }

    size_t undoStackSize() {
        std::lock_guard<std::mutex> lock(mutex_);
        return undoStack_.size();
    }

    /* ---------------- Admission Queue (Queue) ---------------- */

    // New registrations wait here in FIFO order until "Next Student"
    // pulls the front one off and turns it into a real Student.
    json enqueueAdmission(const json& body) {
        std::lock_guard<std::mutex> lock(mutex_);
        AdmissionRequest req = AdmissionRequest::fromJson(body);
        req.queueId = nextQueueId_++;
        admissionQueue_.enqueue(req);
        return req.toJson();
    }

    json listAdmissions() {
        std::lock_guard<std::mutex> lock(mutex_);
        json arr = json::array();
        admissionQueue_.forEach([&arr](const AdmissionRequest& r) { arr.push_back(r.toJson()); });
        return arr;
    }

    // Dequeues the front of the waiting line and admits them as a
    // full Student record. Returns false if the queue is empty.
    bool admitNext(json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        AdmissionRequest req;
        if (!admissionQueue_.dequeue(req)) return false;
        Student s = req.toStudent();
        s.id = nextId_++;
        ListNode* node = list_.pushBack(s);
        index_.insert(s.id, node);
        nameTrie_.insertName(s.name, s.id);
        rebuildIndexes();
        out = s.toJson();
        return true;
    }

    size_t admissionQueueSize() {
        std::lock_guard<std::mutex> lock(mutex_);
        return admissionQueue_.size();
    }

    /* ---------------- Top-N by GPA (Max-Heap) ---------------- */

    json topByGpa(size_t n) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<Student> all;
        all.reserve(list_.size());
        list_.forEach([&all](const Student& s) { all.push_back(s); });

        auto byGpa = [](const Student& a, const Student& b) { return a.gpa < b.gpa; };
        std::vector<Student> top = MaxHeap<Student>::topN(std::move(all), n, byGpa);

        json arr = json::array();
        int rank = 1;
        for (auto& s : top) {
            json j = s.toJson();
            j["rank"] = rank++;
            arr.push_back(j);
        }
        return arr;
    }

    /* ---------------- Auto-complete (Trie) ---------------- */

    json searchByPrefix(const std::string& prefix) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<int> ids = nameTrie_.collectIdsForPrefix(prefix);
        json arr = json::array();
        for (int id : ids) {
            ListNode** found = index_.find(id);
            if (found) arr.push_back((*found)->data.toJson()); // lazy-filter stale ids
        }
        return arr;
    }

    /* ---------------- Sort (Merge Sort) ---------------- */

    json sortedStudents(const std::string& by, const std::string& order) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<Student> all;
        all.reserve(list_.size());
        list_.forEach([&all](const Student& s) { all.push_back(s); });

        bool asc = (order != "desc");
        std::function<bool(const Student&, const Student&)> cmp;
        if (by == "gpa") {
            cmp = [asc](const Student& a, const Student& b) { return asc ? a.gpa < b.gpa : a.gpa > b.gpa; };
        } else if (by == "attendance") {
            cmp = [asc](const Student& a, const Student& b) {
                double pa = a.totalClasses ? double(a.attended) / a.totalClasses : 0.0;
                double pb = b.totalClasses ? double(b.attended) / b.totalClasses : 0.0;
                return asc ? pa < pb : pa > pb;
            };
        } else { // "name" default
            cmp = [asc](const Student& a, const Student& b) {
                std::string an = a.name, bn = b.name;
                std::transform(an.begin(), an.end(), an.begin(), [](unsigned char c){ return std::tolower(c); });
                std::transform(bn.begin(), bn.end(), bn.begin(), [](unsigned char c){ return std::tolower(c); });
                return asc ? an < bn : an > bn;
            };
        }

        mergeSort(all, cmp);

        json arr = json::array();
        for (auto& s : all) arr.push_back(s.toJson());
        return arr;
    }

    // records: [{id, present}]
    bool markAttendance(const std::string& /*date*/, const json& records, json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        json updated = json::array();
        for (const auto& rec : records) {
            int id = rec.at("id").get<int>();
            bool present = rec.at("present").get<bool>();
            ListNode** found = index_.find(id);
            if (!found) continue;
            Student& s = (*found)->data;
            s.totalClasses += 1;
            if (present) s.attended += 1;
            updated.push_back(s.toJson());
        }
        out = updated;
        return true;
    }

private:
    LinkedList<Student> list_;
    HashTable<int, ListNode*> index_;
    Stack<Student> undoStack_;              // DSA #3: undo-delete history
    Queue<AdmissionRequest> admissionQueue_; // DSA #4: waiting/admission line
    Trie nameTrie_;                         // DSA #5: name auto-complete
    GpaBST gpaTree_;                        // DSA #6: GPA range explorer (BST)
    StudyGraph buddyGraph_;                 // DSA #7: study-buddy suggestions (Graph + BFS)
    LRUCache<int> recentViews_{5};          // DSA #8: recently-viewed students (LRU Cache)
    int nextId_ = 1;
    int nextQueueId_ = 1;
    std::mutex mutex_;

    // Rebuilds the derived indexes (BST + Graph) from the current
    // roster. Called after any add/update/remove/undo/admit so the
    // GPA tree and study-buddy graph never go stale. O(n) each time,
    // which is fine at classroom scale and keeps the logic simple and
    // obviously correct rather than doing incremental node surgery.
    void rebuildIndexes() {
        std::vector<std::pair<double, int>> gpaAndId;
        std::vector<Student> all;
        list_.forEach([&](const Student& s) {
            gpaAndId.push_back({s.gpa, s.id});
            all.push_back(s);
        });
        gpaTree_.rebuild(gpaAndId);
        buddyGraph_.rebuild(all);
    }

    void seed() {
        struct Seed {
            std::string name, email, phone, roll, dob, grade, subject,
                        status, guardian, address, notes;
            int attended, totalClasses;
            double gpa;
        };
        std::vector<Seed> seeds = {
            {"Ravi Kumar Sharma", "ravi.sharma@school.edu", "+91 98765 43210",
             "2026001", "2010-04-12", "10th", "Mathematics", "Active",
             "Suresh Kumar Sharma", "H.No. 24, Model Town, Ludhiana, Punjab",
             "Consistently top of the class in mensuration and algebra.", 47, 50, 9.2},
            {"Ananya Mehta", "ananya.mehta@school.edu", "+91 98123 45670",
             "2026002", "2010-08-25", "10th", "Mathematics", "On Leave",
             "Rakesh Mehta", "Sector 9, Chandigarh",
             "On medical leave since last month, needs catch-up sessions.", 33, 50, 7.4},
            {"Karanveer Singh", "karanveer.singh@school.edu", "+91 99887 65432",
             "2026003", "2009-01-05", "3rd Sem", "Computer Science", "Active",
             "Gurpreet Singh", "Civil Lines, Ludhiana, Punjab",
             "Strong in DSA, participates actively in coding club.", 40, 48, 8.6},
        };
        for (auto& sd : seeds) {
            Student s;
            s.id = nextId_++;
            s.name = sd.name; s.email = sd.email; s.phone = sd.phone;
            s.roll = sd.roll; s.dob = sd.dob; s.grade = sd.grade;
            s.subject = sd.subject; s.status = sd.status; s.guardian = sd.guardian;
            s.address = sd.address; s.notes = sd.notes;
            s.attended = sd.attended; s.totalClasses = sd.totalClasses; s.gpa = sd.gpa;
            ListNode* node = list_.pushBack(s);
            index_.insert(s.id, node);
            nameTrie_.insertName(s.name, s.id);
        }
        rebuildIndexes();
    }

public:
    /* ---------------- GPA Range Explorer (Binary Search Tree) ---------------- */

    json gpaRange(double lo, double hi) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<int> ids = gpaTree_.queryRange(lo, hi);
        json arr = json::array();
        for (int id : ids) {
            ListNode** found = index_.find(id);
            if (found) arr.push_back((*found)->data.toJson());
        }
        return json{
            {"students", arr},
            {"treeHeight", gpaTree_.height()},
            {"treeNodes", gpaTree_.nodes()}
        };
    }

    /* ---------------- Study Buddy Finder (Graph + BFS) ---------------- */

    json studyBuddies(int id, int depth) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<int> ids = buddyGraph_.buddiesWithinDepth(id, depth);
        json arr = json::array();
        for (int bid : ids) {
            ListNode** found = index_.find(bid);
            if (found) arr.push_back((*found)->data.toJson());
        }
        return arr;
    }

    /* ---------------- Recently Viewed (LRU Cache) ---------------- */

    // Fetch a single student by id, marking them as most-recently-
    // viewed in the LRU cache. Returns false if not found.
    bool getAndTouch(int id, json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        ListNode** found = index_.find(id);
        if (!found) return false;
        recentViews_.touch(id);
        out = (*found)->data.toJson();
        return true;
    }

    json recentlyViewed() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<int> ids = recentViews_.toVector();
        json arr = json::array();
        for (int id : ids) {
            ListNode** found = index_.find(id);
            if (found) arr.push_back((*found)->data.toJson());
        }
        return arr;
    }

    /* ---------------- Find by Roll No. (Binary Search) ---------------- */

    bool findByRoll(const std::string& roll, json& out) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<Student> all;
        list_.forEach([&](const Student& s) { all.push_back(s); });
        // Merge Sort first (DSA #reuse), then classic binary search --
        // exactly the "sort once, search many times" pattern taught
        // alongside binary search.
        std::function<bool(const Student&, const Student&)> byRoll =
            [](const Student& a, const Student& b) { return a.roll < b.roll; };
        mergeSort(all, byRoll);
        std::vector<std::pair<std::string, int>> rollIndex;
        rollIndex.reserve(all.size());
        for (auto& s : all) rollIndex.push_back({s.roll, s.id});

        int id = binarySearchByRoll(rollIndex, roll);
        if (id == -1) return false;
        ListNode** found = index_.find(id);
        if (!found) return false;
        out = (*found)->data.toJson();
        return true;
    }
};

static void setCors(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    StudentStore store;
    httplib::Server svr;

    // CORS preflight for every route.
    svr.Options(R"(/.*)", [](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.status = 204;
    });

    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.set_content(R"({"status":"ok"})", "application/json");
    });

    svr.Get("/students", [&](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.set_content(store.getAll().dump(), "application/json");
    });

    svr.Post("/students", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        try {
            json body = json::parse(req.body);
            json created = store.add(body);
            res.status = 201;
            res.set_content(created.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Put(R"(/students/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        try {
            int id = std::stoi(req.matches[1]);
            json body = json::parse(req.body);
            json out;
            if (store.update(id, body, out)) {
                res.set_content(out.dump(), "application/json");
            } else {
                res.status = 404;
                res.set_content(json{{"error", "student not found"}}.dump(), "application/json");
            }
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Delete(R"(/students/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        int id = std::stoi(req.matches[1]);
        if (store.remove(id)) {
            res.status = 204;
        } else {
            res.status = 404;
            res.set_content(json{{"error", "student not found"}}.dump(), "application/json");
        }
    });

    // ---------------- Undo Delete (Stack) ----------------
    svr.Post("/students/undo", [&](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        json out;
        if (store.undoDelete(out)) {
            res.status = 200;
            res.set_content(out.dump(), "application/json");
        } else {
            res.status = 404;
            res.set_content(json{{"error", "nothing to undo"}}.dump(), "application/json");
        }
    });

    // ---------------- Admission Queue (Queue) ----------------
    svr.Post("/admissions", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        try {
            json body = json::parse(req.body);
            json created = store.enqueueAdmission(body);
            res.status = 201;
            res.set_content(created.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Get("/admissions", [&](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.set_content(store.listAdmissions().dump(), "application/json");
    });

    svr.Post("/admissions/next", [&](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        json out;
        if (store.admitNext(out)) {
            res.status = 201;
            res.set_content(out.dump(), "application/json");
        } else {
            res.status = 404;
            res.set_content(json{{"error", "admission queue is empty"}}.dump(), "application/json");
        }
    });

    // ---------------- Top-N by GPA (Max-Heap) ----------------
    svr.Get("/students/top", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        size_t n = 10;
        if (req.has_param("n")) {
            try { n = static_cast<size_t>(std::stoi(req.get_param_value("n"))); } catch (...) {}
        }
        res.set_content(store.topByGpa(n).dump(), "application/json");
    });

    // ---------------- Auto-complete (Trie) ----------------
    svr.Get("/students/search", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        std::string prefix = req.has_param("prefix") ? req.get_param_value("prefix") : "";
        res.set_content(store.searchByPrefix(prefix).dump(), "application/json");
    });

    // ---------------- Sort (Merge Sort) ----------------
    svr.Get("/students/sorted", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        std::string by = req.has_param("by") ? req.get_param_value("by") : "name";
        std::string order = req.has_param("order") ? req.get_param_value("order") : "asc";
        res.set_content(store.sortedStudents(by, order).dump(), "application/json");
    });

    // ---------------- GPA Range Explorer (Binary Search Tree) ----------------
    svr.Get("/students/gpa-range", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        double lo = req.has_param("min") ? std::stod(req.get_param_value("min")) : 0.0;
        double hi = req.has_param("max") ? std::stod(req.get_param_value("max")) : 10.0;
        res.set_content(store.gpaRange(lo, hi).dump(), "application/json");
    });

    // ---------------- Study Buddy Finder (Graph + BFS) ----------------
    svr.Get(R"(/students/(\d+)/buddies)", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        int id = std::stoi(req.matches[1]);
        int depth = 2;
        if (req.has_param("depth")) {
            try { depth = std::stoi(req.get_param_value("depth")); } catch (...) {}
        }
        res.set_content(store.studyBuddies(id, depth).dump(), "application/json");
    });

    // ---------------- Recently Viewed (LRU Cache) ----------------
    svr.Get("/students/recent", [&](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.set_content(store.recentlyViewed().dump(), "application/json");
    });

    svr.Get(R"(/students/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        int id = std::stoi(req.matches[1]);
        json out;
        if (store.getAndTouch(id, out)) {
            res.set_content(out.dump(), "application/json");
        } else {
            res.status = 404;
            res.set_content(json{{"error", "student not found"}}.dump(), "application/json");
        }
    });

    // ---------------- Find by Roll No. (Binary Search) ----------------
    svr.Get("/students/by-roll", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        std::string roll = req.has_param("roll") ? req.get_param_value("roll") : "";
        json out;
        if (store.findByRoll(roll, out)) {
            res.set_content(out.dump(), "application/json");
        } else {
            res.status = 404;
            res.set_content(json{{"error", "no student with that roll number"}}.dump(), "application/json");
        }
    });

    svr.Post("/attendance", [&](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        try {
            json body = json::parse(req.body);
            std::string date = body.value("date", "");
            json out;
            store.markAttendance(date, body.at("records"), out);
            res.set_content(out.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    std::cout << "EduTrack backend running at http://localhost:8080\n";
    svr.listen("0.0.0.0", 8080);
    return 0;
}
