#ifndef HEAP_H
#define HEAP_H

#include <vector>
#include <functional>
#include <stdexcept>

// A hand-written array-based binary Max-Heap (priority queue).
// Used for the "Top 10 Rank List" feature: build a heap on the
// current student list keyed by GPA, then extract-max repeatedly
// to pull students out in descending GPA order.
//
// lessThan(a, b) should return true if `a` has LOWER priority than
// `b` (i.e. a should end up below b in the heap). For "highest GPA
// on top" pass: [](const Student& a, const Student& b){ return a.gpa < b.gpa; }
template <typename T>
class MaxHeap {
private:
    std::vector<T> data_;
    std::function<bool(const T&, const T&)> lessThan_;

    static size_t parent(size_t i) { return (i - 1) / 2; }
    static size_t left(size_t i) { return 2 * i + 1; }
    static size_t right(size_t i) { return 2 * i + 2; }

    void heapifyUp(size_t i) {
        while (i > 0 && lessThan_(data_[parent(i)], data_[i])) {
            std::swap(data_[parent(i)], data_[i]);
            i = parent(i);
        }
    }

    void heapifyDown(size_t i) {
        size_t n = data_.size();
        while (true) {
            size_t largest = i;
            size_t l = left(i), r = right(i);
            if (l < n && lessThan_(data_[largest], data_[l])) largest = l;
            if (r < n && lessThan_(data_[largest], data_[r])) largest = r;
            if (largest == i) break;
            std::swap(data_[i], data_[largest]);
            i = largest;
        }
    }

public:
    explicit MaxHeap(std::function<bool(const T&, const T&)> cmp) : lessThan_(cmp) {}

    bool empty() const { return data_.empty(); }
    size_t size() const { return data_.size(); }

    // O(log n) -- insert one element and bubble it up.
    void insert(const T& value) {
        data_.push_back(value);
        heapifyUp(data_.size() - 1);
    }

    // O(n) -- classic "heapify" bulk build, cheaper than n inserts.
    void buildFrom(std::vector<T> items) {
        data_ = std::move(items);
        if (data_.size() < 2) return;
        for (int i = static_cast<int>(data_.size()) / 2 - 1; i >= 0; --i) {
            heapifyDown(static_cast<size_t>(i));
        }
    }

    // O(log n) -- remove and return the max element.
    T extractMax() {
        if (data_.empty()) throw std::out_of_range("extractMax on empty heap");
        T top = data_.front();
        data_.front() = data_.back();
        data_.pop_back();
        if (!data_.empty()) heapifyDown(0);
        return top;
    }

    // Convenience: build a heap from `items` and pull out the top `n`
    // in descending priority order without mutating the caller's vector.
    static std::vector<T> topN(std::vector<T> items, size_t n,
                                std::function<bool(const T&, const T&)> cmp) {
        MaxHeap<T> heap(cmp);
        heap.buildFrom(std::move(items));
        std::vector<T> result;
        while (!heap.empty() && result.size() < n) {
            result.push_back(heap.extractMax());
        }
        return result;
    }
};

#endif // HEAP_H
