#ifndef GRAPH_H
#define GRAPH_H

#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <queue>

// A hand-written undirected graph (adjacency list) used for the
// "Study Buddy Finder" feature. An edge connects two students who
// share the same subject AND grade/year -- the idea being they'd
// benefit from studying together. Peer suggestions are found with a
// textbook Breadth-First Search, which naturally answers "who is
// reachable within N introductions" (depth) in level order.
class StudyGraph {
private:
    std::unordered_map<int, std::vector<int>> adj_;

public:
    void clear() { adj_.clear(); }

    void addNode(int id) {
        adj_.emplace(id, std::vector<int>{});
    }

    void addEdge(int a, int b) {
        if (a == b) return;
        adj_[a].push_back(b);
        adj_[b].push_back(a);
    }

    // Rebuilds the graph from the current roster: one node per
    // student, an edge between any two students in the same
    // subject + grade bucket.
    template <typename StudentRange>
    void rebuild(const StudentRange& students) {
        clear();
        std::unordered_map<std::string, std::vector<int>> buckets;
        for (auto& s : students) {
            addNode(s.id);
            buckets[s.subject + "|" + s.grade].push_back(s.id);
        }
        for (auto& kv : buckets) {
            const auto& ids = kv.second;
            for (size_t i = 0; i < ids.size(); ++i) {
                for (size_t j = i + 1; j < ids.size(); ++j) {
                    addEdge(ids[i], ids[j]);
                }
            }
        }
    }

    // BFS from `start`, returning every id reachable within `depth`
    // hops (excluding `start` itself), in the order BFS discovers
    // them (i.e. closest peers first).
    std::vector<int> buddiesWithinDepth(int start, int depth) const {
        std::vector<int> result;
        if (adj_.find(start) == adj_.end()) return result;

        std::unordered_set<int> visited;
        visited.insert(start);
        std::queue<std::pair<int, int>> q; // (id, distance)
        q.push({start, 0});

        while (!q.empty()) {
            auto [id, dist] = q.front();
            q.pop();
            if (dist >= depth) continue;
            auto it = adj_.find(id);
            if (it == adj_.end()) continue;
            for (int neighbor : it->second) {
                if (visited.count(neighbor)) continue;
                visited.insert(neighbor);
                result.push_back(neighbor);
                q.push({neighbor, dist + 1});
            }
        }
        return result;
    }

    size_t degree(int id) const {
        auto it = adj_.find(id);
        return it == adj_.end() ? 0 : it->second.size();
    }

    size_t nodeCount() const { return adj_.size(); }
};

#endif // GRAPH_H
