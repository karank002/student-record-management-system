#ifndef QUEUE_H
#define QUEUE_H

#include <cstddef>
#include <functional>

// A hand-written singly linked-list based Queue (FIFO).
// Used for the "Student Admission / Waiting Queue" feature: new
// registrations enqueue at the back, "Next Student" dequeues from
// the front. front_/rear_ pointers keep enqueue and dequeue both O(1).
template <typename T>
class Queue {
private:
    struct Node {
        T data;
        Node* next;
        explicit Node(const T& value) : data(value), next(nullptr) {}
    };

    Node* front_ = nullptr;
    Node* rear_ = nullptr;
    size_t size_ = 0;

public:
    Queue() = default;
    ~Queue() { clear(); }

    Queue(const Queue&) = delete;
    Queue& operator=(const Queue&) = delete;

    bool empty() const { return size_ == 0; }
    size_t size() const { return size_; }

    // O(1) -- insert at the rear.
    void enqueue(const T& value) {
        Node* node = new Node(value);
        if (!rear_) {
            front_ = rear_ = node;
        } else {
            rear_->next = node;
            rear_ = node;
        }
        ++size_;
    }

    // O(1) -- remove from the front. Returns false if empty.
    bool dequeue(T& out) {
        if (!front_) return false;
        Node* node = front_;
        out = node->data;
        front_ = node->next;
        if (!front_) rear_ = nullptr;
        delete node;
        --size_;
        return true;
    }

    // O(1). Look at the front without removing it.
    bool peekFront(T& out) const {
        if (!front_) return false;
        out = front_->data;
        return true;
    }

    // Visit every element front -> rear without dequeuing (used to
    // render the waiting list in the UI).
    void forEach(const std::function<void(const T&)>& fn) const {
        Node* curr = front_;
        while (curr) {
            fn(curr->data);
            curr = curr->next;
        }
    }

    void clear() {
        while (front_) {
            Node* next = front_->next;
            delete front_;
            front_ = next;
        }
        front_ = rear_ = nullptr;
        size_ = 0;
    }
};

#endif // QUEUE_H
