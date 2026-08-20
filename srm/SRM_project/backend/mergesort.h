#ifndef MERGESORT_H
#define MERGESORT_H

#include <vector>
#include <functional>

// Classic textbook Merge Sort, O(n log n) worst case, stable.
// comparator(a, b) should return true if `a` belongs strictly before `b`.
// Used for the "Sort Students" feature (name / GPA / attendance).
template <typename T>
void mergeSort(std::vector<T>& arr, const std::function<bool(const T&, const T&)>& comparator) {
    if (arr.size() <= 1) return;

    size_t mid = arr.size() / 2;
    std::vector<T> left(arr.begin(), arr.begin() + mid);
    std::vector<T> right(arr.begin() + mid, arr.end());

    mergeSort(left, comparator);
    mergeSort(right, comparator);

    size_t i = 0, j = 0, k = 0;
    while (i < left.size() && j < right.size()) {
        if (comparator(right[j], left[i])) {
            arr[k++] = right[j++];
        } else {
            arr[k++] = left[i++];
        }
    }
    while (i < left.size()) arr[k++] = left[i++];
    while (j < right.size()) arr[k++] = right[j++];
}

#endif // MERGESORT_H
