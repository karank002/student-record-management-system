#ifndef BST_H
#define BST_H

#include <vector>
#include <algorithm>

// A hand-written, unbalanced Binary Search Tree keyed on a double
// (the student's GPA). Every node also carries a small vector of
// student ids because GPAs are not unique -- two students can both
// have a 8.6, so instead of rejecting the duplicate we just bucket
// ids with equal keys on the same node.
//
// Used for the "GPA Range Explorer" feature: rangeQuery(min, max)
// walks the tree and prunes whole subtrees that can't possibly be
// in range, which is the classic reason a BST beats a linear scan
// once the tree is reasonably balanced.
class GpaBST {
private:
    struct Node {
        double key;
        std::vector<int> ids;
        Node* left = nullptr;
        Node* right = nullptr;
        explicit Node(double k) : key(k) {}
    };

    Node* root_ = nullptr;
    size_t count_ = 0; // number of ids stored (not number of nodes)

    Node* insert(Node* node, double key, int id) {
        if (!node) {
            Node* n = new Node(key);
            n->ids.push_back(id);
            return n;
        }
        if (key < node->key) node->left = insert(node->left, key, id);
        else if (key > node->key) node->right = insert(node->right, key, id);
        else node->ids.push_back(id); // same GPA, bucket together
        return node;
    }

    void destroy(Node* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }

    // In-order traversal restricted to [lo, hi], skipping subtrees
    // that fall entirely outside the range -- this pruning is the
    // whole point of using a BST instead of sorting a flat list.
    void rangeQuery(Node* node, double lo, double hi, std::vector<int>& out) const {
        if (!node) return;
        if (node->key > lo) rangeQuery(node->left, lo, hi, out);
        if (node->key >= lo && node->key <= hi) {
            out.insert(out.end(), node->ids.begin(), node->ids.end());
        }
        if (node->key < hi) rangeQuery(node->right, lo, hi, out);
    }

    int height(Node* node) const {
        if (!node) return 0;
        return 1 + std::max(height(node->left), height(node->right));
    }

    size_t nodeCount(Node* node) const {
        if (!node) return 0;
        return 1 + nodeCount(node->left) + nodeCount(node->right);
    }

public:
    GpaBST() = default;
    ~GpaBST() { destroy(root_); }
    GpaBST(const GpaBST&) = delete;
    GpaBST& operator=(const GpaBST&) = delete;

    void insert(double gpa, int id) {
        root_ = insert(root_, gpa, id);
        count_++;
    }

    void clear() {
        destroy(root_);
        root_ = nullptr;
        count_ = 0;
    }

    // Rebuilds the whole tree from scratch -- called after any
    // add/update/delete so the tree always reflects the live roster.
    void rebuild(const std::vector<std::pair<double, int>>& gpaAndId) {
        clear();
        for (auto& p : gpaAndId) insert(p.first, p.second);
    }

    std::vector<int> queryRange(double lo, double hi) const {
        std::vector<int> out;
        rangeQuery(root_, lo, hi, out);
        return out;
    }

    int height() const { return height(root_); }
    size_t nodes() const { return nodeCount(root_); }
    size_t size() const { return count_; }
};

#endif // BST_H
