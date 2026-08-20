#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include <functional>
#include <stdexcept>

// A hand-written singly linked list (the actual DSA part).
// Keeps students in insertion order so /students returns a stable,
// predictable list -- exactly like a real record register.
template <typename T>
class LinkedList {
public:
    struct Node {
        T data;
        Node* next;
        explicit Node(const T& value) : data(value), next(nullptr) {}
    };

private:
    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    size_t size_ = 0;

public:
    LinkedList() = default;

    ~LinkedList() {
        clear();
    }

    // Non-copyable to keep memory ownership simple; add a copy ctor
    // later if you ever need to duplicate the whole list.
    LinkedList(const LinkedList&) = delete;
    LinkedList& operator=(const LinkedList&) = delete;

    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    // Insert at the tail -> O(1) thanks to the tail_ pointer.
    Node* pushBack(const T& value) {
        Node* node = new Node(value);
        if (!head_) {
            head_ = tail_ = node;
        } else {
            tail_->next = node;
            tail_ = node;
        }
        ++size_;
        return node;
    }

    // Remove the first node matching predicate. O(n).
    bool removeIf(const std::function<bool(const T&)>& predicate) {
        Node* prev = nullptr;
        Node* curr = head_;
        while (curr) {
            if (predicate(curr->data)) {
                if (prev) prev->next = curr->next;
                else head_ = curr->next;
                if (curr == tail_) tail_ = prev;
                delete curr;
                --size_;
                return true;
            }
            prev = curr;
            curr = curr->next;
        }
        return false;
    }

    // Find first node matching predicate, returns nullptr if none. O(n).
    Node* find(const std::function<bool(const T&)>& predicate) const {
        Node* curr = head_;
        while (curr) {
            if (predicate(curr->data)) return curr;
            curr = curr->next;
        }
        return nullptr;
    }

    // Visit every element in order (used to build the /students JSON array).
    void forEach(const std::function<void(const T&)>& fn) const {
        Node* curr = head_;
        while (curr) {
            fn(curr->data);
            curr = curr->next;
        }
    }

    void clear() {
        Node* curr = head_;
        while (curr) {
            Node* next = curr->next;
            delete curr;
            curr = next;
        }
        head_ = tail_ = nullptr;
        size_ = 0;
    }
};

#endif // LINKEDLIST_H
