#ifndef BINARYSEARCH_H
#define BINARYSEARCH_H

#include <vector>
#include <string>

// Textbook iterative binary search used for the "Find by Roll No."
// box: O(log n) instead of scanning every student. Requires the
// input vector to already be sorted ascending by roll number, which
// callers get from mergesort.h before calling this.
//
// Returns the id paired with the matching roll, or -1 if not found.
inline int binarySearchByRoll(const std::vector<std::pair<std::string, int>>& sortedByRoll,
                               const std::string& target) {
    int lo = 0, hi = static_cast<int>(sortedByRoll.size()) - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        const std::string& midRoll = sortedByRoll[mid].first;
        if (midRoll == target) return sortedByRoll[mid].second;
        if (midRoll < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

#endif // BINARYSEARCH_H
