#ifndef LRUCACHE_H
#define LRUCACHE_H

#include <unordered_map>
#include <vector>

// Classic LRU Cache: a doubly linked list (most-recent at the head)
// plus a hash map from key -> node, so both touch() and eviction are
// O(1). Used for the "Recently Viewed Students" widget -- every time
// a teacher opens a student's profile we touch(id); the widget shows
// the list in most-recent-first order, capped at `capacity`.
template <typename K>
class LRUCache {
private:
    struct Node {
        K key;
        Node* prev = nullptr;
        Node* next = nullptr;
        explicit Node(const K& k) : key(k) {}
    };

    std::unordered_map<K, Node*> map_;
    Node* head_ = nullptr; // most recently used
    Node* tail_ = nullptr; // least recently used
    size_t capacity_;

    void unlink(Node* node) {
        if (node->prev) node->prev->next = node->next;
        if (node->next) node->next->prev = node->prev;
        if (head_ == node) head_ = node->next;
        if (tail_ == node) tail_ = node->prev;
        node->prev = node->next = nullptr;
    }

    void pushFront(Node* node) {
        node->next = head_;
        node->prev = nullptr;
        if (head_) head_->prev = node;
        head_ = node;
        if (!tail_) tail_ = node;
    }

public:
    explicit LRUCache(size_t capacity) : capacity_(capacity) {}
    ~LRUCache() { clear(); }
    LRUCache(const LRUCache&) = delete;
    LRUCache& operator=(const LRUCache&) = delete;

    void clear() {
        Node* cur = head_;
        while (cur) {
            Node* next = cur->next;
            delete cur;
            cur = next;
        }
        head_ = tail_ = nullptr;
        map_.clear();
    }

    // O(1): mark `key` as most-recently-used, inserting it if new,
    // evicting the least-recently-used entry if we're over capacity.
    void touch(const K& key) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            unlink(it->second);
            pushFront(it->second);
            return;
        }
        Node* node = new Node(key);
        map_[key] = node;
        pushFront(node);
        if (map_.size() > capacity_) {
            Node* lru = tail_;
            unlink(lru);
            map_.erase(lru->key);
            delete lru;
        }
    }

    // Removes a key entirely (e.g. the student record was deleted).
    void remove(const K& key) {
        auto it = map_.find(key);
        if (it == map_.end()) return;
        unlink(it->second);
        map_.erase(it);
        delete it->second;
    }

    // Most-recent-first order.
    std::vector<K> toVector() const {
        std::vector<K> out;
        for (Node* cur = head_; cur; cur = cur->next) out.push_back(cur->key);
        return out;
    }

    size_t size() const { return map_.size(); }
};

#endif // LRUCACHE_H
