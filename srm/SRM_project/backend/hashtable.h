#ifndef HASHTABLE_H
#define HASHTABLE_H

#include <vector>
#include <list>
#include <utility>

// A hand-written hash table with separate chaining (the second DSA
// piece). Used here as id -> LinkedList<Student>::Node* so that
// GET/PUT/DELETE /students/:id are O(1) average instead of scanning
// the whole linked list every time.
template <typename K, typename V>
class HashTable {
private:
    static const size_t DEFAULT_BUCKETS = 64;

    std::vector<std::list<std::pair<K, V>>> buckets_;
    size_t count_ = 0;

    size_t bucketIndex(const K& key) const {
        return std::hash<K>{}(key) % buckets_.size();
    }

    void rehashIfNeeded() {
        // Keep average chain length small; classic load-factor > 1 rule.
        if (count_ > buckets_.size()) {
            std::vector<std::list<std::pair<K, V>>> old = std::move(buckets_);
            buckets_.assign(old.size() * 2, {});
            count_ = 0;
            for (auto& bucket : old) {
                for (auto& kv : bucket) {
                    insert(kv.first, kv.second);
                }
            }
        }
    }

public:
    explicit HashTable(size_t buckets = DEFAULT_BUCKETS) : buckets_(buckets) {}

    size_t size() const { return count_; }

    // Insert or overwrite. O(1) average.
    void insert(const K& key, const V& value) {
        size_t idx = bucketIndex(key);
        for (auto& kv : buckets_[idx]) {
            if (kv.first == key) {
                kv.second = value;
                return;
            }
        }
        buckets_[idx].emplace_back(key, value);
        ++count_;
        rehashIfNeeded();
    }

    // Returns pointer to value if found, nullptr otherwise. O(1) average.
    V* find(const K& key) {
        size_t idx = bucketIndex(key);
        for (auto& kv : buckets_[idx]) {
            if (kv.first == key) return &kv.second;
        }
        return nullptr;
    }

    bool remove(const K& key) {
        size_t idx = bucketIndex(key);
        auto& bucket = buckets_[idx];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) {
            if (it->first == key) {
                bucket.erase(it);
                --count_;
                return true;
            }
        }
        return false;
    }

    bool contains(const K& key) const {
        size_t idx = bucketIndex(key);
        for (auto& kv : buckets_[idx]) {
            if (kv.first == key) return true;
        }
        return false;
    }
};

#endif // HASHTABLE_H
