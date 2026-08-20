#ifndef TRIE_H
#define TRIE_H

#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <cctype>

// A hand-written Trie (prefix tree) over lowercase name tokens.
// Used for the "Auto-Complete Search" feature: typing "ra" should
// suggest every student whose first or last name starts with "ra".
//
// Each student's name is split into tokens ("Ravi Kumar Sharma" ->
// "ravi", "kumar", "sharma") and every token is inserted separately,
// so partial first-name or last-name prefixes both work.
//
// Note: this trie is insert-only/additive (no delete). If a name is
// edited, its new tokens are inserted alongside the old ones; stale
// hits are filtered out by the caller against the live student index
// before being returned to the client. That keeps the trie itself
// simple, which is the usual classroom-level implementation.
class Trie {
private:
    struct TrieNode {
        std::unordered_map<char, TrieNode*> children;
        bool isEnd = false;
        std::vector<int> studentIds; // ids of students whose token ends here
        ~TrieNode() {
            for (auto& kv : children) delete kv.second;
        }
    };

    TrieNode* root_;

    static std::string normalize(const std::string& s) {
        std::string out;
        out.reserve(s.size());
        for (char c : s) {
            if (std::isalnum(static_cast<unsigned char>(c))) {
                out += static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
            }
        }
        return out;
    }

    static std::vector<std::string> tokenize(const std::string& name) {
        std::vector<std::string> tokens;
        std::string current;
        for (char c : name) {
            if (std::isspace(static_cast<unsigned char>(c))) {
                if (!current.empty()) { tokens.push_back(normalize(current)); current.clear(); }
            } else {
                current += c;
            }
        }
        if (!current.empty()) tokens.push_back(normalize(current));
        return tokens;
    }

public:
    Trie() : root_(new TrieNode()) {}
    ~Trie() { delete root_; }

    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;

    // Insert every token of `fullName` (e.g. first + last name),
    // tagging each with the owning student's id. O(total chars).
    void insertName(const std::string& fullName, int studentId) {
        for (const std::string& token : tokenize(fullName)) {
            if (token.empty()) continue;
            TrieNode* node = root_;
            for (char c : token) {
                auto it = node->children.find(c);
                if (it == node->children.end()) {
                    TrieNode* child = new TrieNode();
                    node->children[c] = child;
                    node = child;
                } else {
                    node = it->second;
                }
            }
            node->isEnd = true;
            node->studentIds.push_back(studentId);
        }
    }

    // Walk down to the node for `prefix`, then DFS-collect every
    // studentId reachable below it. O(prefix length + matches).
    std::vector<int> collectIdsForPrefix(const std::string& prefix) const {
        std::vector<int> result;
        std::string norm = normalize(prefix);
        if (norm.empty()) return result;

        TrieNode* node = root_;
        for (char c : norm) {
            auto it = node->children.find(c);
            if (it == node->children.end()) return result; // no matches
            node = it->second;
        }

        // DFS from here, collecting all ids marked along the way.
        std::vector<TrieNode*> stack = { node };
        while (!stack.empty()) {
            TrieNode* curr = stack.back();
            stack.pop_back();
            if (curr->isEnd) {
                for (int id : curr->studentIds) result.push_back(id);
            }
            for (auto& kv : curr->children) stack.push_back(kv.second);
        }

        std::sort(result.begin(), result.end());
        result.erase(std::unique(result.begin(), result.end()), result.end());
        return result;
    }
};

#endif // TRIE_H
