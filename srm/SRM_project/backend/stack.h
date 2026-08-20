#ifndef STACK_H
#define STACK_H

#include <cstddef>

// A hand-written singly linked-list based Stack (LIFO).
// Used for the "Undo Delete" feature: every delete pushes the
// removed record here; Undo pops it back out. Classic stack use case.
template <typename T>
class Stack {
private:
    struct Node {
        T data;
        Node* next;
        explicit Node(const T& value) : data(value), next(nullptr) {}
    };

    Node* top_ = nullptr;
    size_t size_ = 0;

public:
    Stack() = default;
    ~Stack() { clear(); }

    Stack(const Stack&) = delete;
    Stack& operator=(const Stack&) = delete;

    bool empty() const { return size_ == 0; }
    size_t size() const { return size_; }

    // O(1)
    void push(const T& value) {
        Node* node = new Node(value);
        node->next = top_;
        top_ = node;
        ++size_;
    }

    // O(1). Returns false if stack is empty, else fills `out` and pops.
    bool pop(T& out) {
        if (!top_) return false;
        Node* node = top_;
        out = node->data;
        top_ = node->next;
        delete node;
        --size_;
        return true;
    }

    // O(1). Look at top without removing it.
    bool peek(T& out) const {
        if (!top_) return false;
        out = top_->data;
        return true;
    }

    void clear() {
        while (top_) {
            Node* next = top_->next;
            delete top_;
            top_ = next;
        }
        size_ = 0;
    }
};

#endif // STACK_H
