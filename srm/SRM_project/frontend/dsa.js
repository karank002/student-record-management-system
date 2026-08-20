/* ============================================================
   EduTrack Portal — dsa.js
   ------------------------------------------------------------
   Plain-JS versions of the SAME data structures that live in the
   C++ backend (backend/*.h). The backend has the "real"
   implementation used for your viva code walkthrough / curl demo;
   this file powers the live UI so the app keeps working instantly
   even if the C++ server isn't running (same local-first
   philosophy as the rest of app.js).

   Structures exported on window.DSA:
     - Stack           -> Undo Delete
     - Queue           -> Admission / Waiting Queue
     - topByGpa(list,n)-> Max-Heap based Top-N
     - Trie            -> Auto-complete search
     - mergeSort       -> Merge Sort
     - GpaBST          -> GPA Range Explorer (Binary Search Tree)
     - StudyGraph      -> Study Buddy Finder (Graph + BFS)
     - LRUCache        -> Recently Viewed Students (LRU Cache)
     - binarySearchByRoll -> Find by Roll No. (Binary Search)
   ============================================================ */

window.DSA = (function () {
  "use strict";

  /* ---------------- Stack (LIFO) ----------------
     Array-backed, but push/pop are used exactly like a textbook
     linked-list stack: push() adds to the top, pop() removes from
     the top, both O(1). */
  class Stack {
    constructor() {
      this._items = [];
    }
    push(value) {
      this._items.push(value);
    }
    pop() {
      return this._items.pop(); // undefined if empty
    }
    peek() {
      return this._items[this._items.length - 1];
    }
    get size() {
      return this._items.length;
    }
    isEmpty() {
      return this._items.length === 0;
    }
    clear() {
      this._items = [];
    }
  }

  /* ---------------- Queue (FIFO) ----------------
     enqueue() adds to the back, dequeue() removes from the front.
     Uses a head index instead of Array.shift() so dequeue stays O(1)
     amortized instead of O(n). */
  class Queue {
    constructor() {
      this._items = [];
      this._head = 0;
    }
    enqueue(value) {
      this._items.push(value);
    }
    dequeue() {
      if (this._head >= this._items.length) return undefined;
      const value = this._items[this._head];
      this._items[this._head] = undefined;
      this._head++;
      // reclaim memory once the front half is all consumed
      if (this._head > 32 && this._head * 2 > this._items.length) {
        this._items = this._items.slice(this._head);
        this._head = 0;
      }
      return value;
    }
    peekFront() {
      return this._items[this._head];
    }
    toArray() {
      return this._items.slice(this._head);
    }
    get size() {
      return this._items.length - this._head;
    }
    isEmpty() {
      return this.size === 0;
    }
    clear() {
      this._items = [];
      this._head = 0;
    }
  }

  /* ---------------- Max-Heap (Priority Queue) ----------------
     Real binary-heap array with heapify-up / heapify-down, same
     algorithm as backend/heap.h. buildHeap() is O(n); extractMax()
     is O(log n). Used for the "Top 10 by GPA" ranking. */
  class MaxHeap {
    constructor(lessThan) {
      // lessThan(a, b) => true if a has LOWER priority than b
      this._lessThan = lessThan;
      this._data = [];
    }
    static _parent(i) { return (i - 1) >> 1; }
    static _left(i) { return 2 * i + 1; }
    static _right(i) { return 2 * i + 2; }

    _heapifyUp(i) {
      while (i > 0) {
        const p = MaxHeap._parent(i);
        if (this._lessThan(this._data[p], this._data[i])) {
          [this._data[p], this._data[i]] = [this._data[i], this._data[p]];
          i = p;
        } else break;
      }
    }
    _heapifyDown(i) {
      const n = this._data.length;
      while (true) {
        let largest = i;
        const l = MaxHeap._left(i), r = MaxHeap._right(i);
        if (l < n && this._lessThan(this._data[largest], this._data[l])) largest = l;
        if (r < n && this._lessThan(this._data[largest], this._data[r])) largest = r;
        if (largest === i) break;
        [this._data[i], this._data[largest]] = [this._data[largest], this._data[i]];
        i = largest;
      }
    }
    buildFrom(items) {
      this._data = items.slice();
      for (let i = (this._data.length >> 1) - 1; i >= 0; i--) this._heapifyDown(i);
      return this;
    }
    insert(value) {
      this._data.push(value);
      this._heapifyUp(this._data.length - 1);
    }
    extractMax() {
      if (this._data.length === 0) return undefined;
      const top = this._data[0];
      const last = this._data.pop();
      if (this._data.length > 0) {
        this._data[0] = last;
        this._heapifyDown(0);
      }
      return top;
    }
    get size() { return this._data.length; }
    isEmpty() { return this._data.length === 0; }
  }

  /** Build a max-heap over `items` keyed by `lessThan`, and pull the
   *  top `n` out in descending priority order. */
  function topN(items, n, lessThan) {
    const heap = new MaxHeap(lessThan).buildFrom(items);
    const out = [];
    while (!heap.isEmpty() && out.length < n) out.push(heap.extractMax());
    return out;
  }

  /* ---------------- Trie (prefix tree) ----------------
     Same token-based design as backend/trie.h: every name is split
     into lowercase word tokens and each token is inserted char by
     char, so both first-name and last-name prefixes autocomplete. */
  class TrieNode {
    constructor() {
      this.children = new Map();
      this.isEnd = false;
      this.ids = [];
    }
  }
  class Trie {
    constructor() {
      this.root = new TrieNode();
    }
    static _tokenize(name) {
      return String(name || "")
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9]/g, ""))
        .filter(Boolean);
    }
    insertName(fullName, id) {
      for (const token of Trie._tokenize(fullName)) {
        let node = this.root;
        for (const ch of token) {
          if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
          node = node.children.get(ch);
        }
        node.isEnd = true;
        node.ids.push(id);
      }
    }
    rebuild(students) {
      this.root = new TrieNode();
      students.forEach((s) => this.insertName(s.name, s.id));
    }
    collectIdsForPrefix(prefix) {
      const norm = String(prefix || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!norm) return [];
      let node = this.root;
      for (const ch of norm) {
        if (!node.children.has(ch)) return [];
        node = node.children.get(ch);
      }
      const result = new Set();
      const stack = [node];
      while (stack.length) {
        const curr = stack.pop();
        if (curr.isEnd) curr.ids.forEach((id) => result.add(id));
        curr.children.forEach((child) => stack.push(child));
      }
      return Array.from(result);
    }
  }

  /* ---------------- Merge Sort ----------------
     Textbook top-down merge sort, O(n log n), stable — mirrors
     backend/mergesort.h exactly. compareFn(a, b) < 0 means a first. */
  function mergeSort(arr, compareFn) {
    if (arr.length <= 1) return arr.slice();
    const mid = arr.length >> 1;
    const left = mergeSort(arr.slice(0, mid), compareFn);
    const right = mergeSort(arr.slice(mid), compareFn);
    const merged = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      if (compareFn(left[i], right[j]) <= 0) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return merged;
  }

  /* ---------------- Binary Search Tree (GPA Range Explorer) ----------------
     Unbalanced BST keyed on GPA, mirrors backend/bst.h exactly:
     duplicate GPAs bucket ids on the same node, queryRange() prunes
     whole subtrees outside [lo, hi] instead of scanning everything. */
  class GpaBST {
    constructor() {
      this.root = null;
      this._count = 0;
    }
    insert(gpa, id) {
      this.root = this._insert(this.root, gpa, id);
      this._count++;
    }
    _insert(node, gpa, id) {
      if (!node) return { key: gpa, ids: [id], left: null, right: null };
      if (gpa < node.key) node.left = this._insert(node.left, gpa, id);
      else if (gpa > node.key) node.right = this._insert(node.right, gpa, id);
      else node.ids.push(id);
      return node;
    }
    rebuild(students) {
      this.root = null;
      this._count = 0;
      students.forEach((s) => this.insert(Number(s.gpa), s.id));
    }
    queryRange(lo, hi) {
      const out = [];
      const walk = (node) => {
        if (!node) return;
        if (node.key > lo) walk(node.left);
        if (node.key >= lo && node.key <= hi) out.push(...node.ids);
        if (node.key < hi) walk(node.right);
      };
      walk(this.root);
      return out;
    }
    height() {
      const h = (node) => (node ? 1 + Math.max(h(node.left), h(node.right)) : 0);
      return h(this.root);
    }
    get size() { return this._count; }
  }

  /* ---------------- Graph + BFS (Study Buddy Finder) ----------------
     Undirected adjacency-list graph, mirrors backend/graph.h: an
     edge connects two students sharing subject + grade. BFS finds
     everyone reachable within `depth` hops, closest first. */
  class StudyGraph {
    constructor() {
      this.adj = new Map();
    }
    clear() { this.adj = new Map(); }
    addNode(id) {
      if (!this.adj.has(id)) this.adj.set(id, []);
    }
    addEdge(a, b) {
      if (a === b) return;
      this.adj.get(a).push(b);
      this.adj.get(b).push(a);
    }
    rebuild(students) {
      this.clear();
      const buckets = new Map();
      students.forEach((s) => {
        this.addNode(s.id);
        const key = `${s.subject}|${s.grade}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(s.id);
      });
      buckets.forEach((ids) => {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) this.addEdge(ids[i], ids[j]);
        }
      });
    }
    buddiesWithinDepth(start, depth) {
      const result = [];
      if (!this.adj.has(start)) return result;
      const visited = new Set([start]);
      const queue = [[start, 0]];
      let head = 0;
      while (head < queue.length) {
        const [id, dist] = queue[head++];
        if (dist >= depth) continue;
        for (const neighbor of this.adj.get(id) || []) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          result.push(neighbor);
          queue.push([neighbor, dist + 1]);
        }
      }
      return result;
    }
  }

  /* ---------------- LRU Cache (Recently Viewed Students) ----------------
     Doubly linked list + Map, mirrors backend/lrucache.h: touch()
     moves an id to the most-recently-used front in O(1), evicting
     the least-recently-used entry once over capacity. */
  class LRUCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.map = new Map(); // key -> node
      this.head = null; // most recent
      this.tail = null; // least recent
    }
    _unlink(node) {
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (this.head === node) this.head = node.next;
      if (this.tail === node) this.tail = node.prev;
      node.prev = node.next = null;
    }
    _pushFront(node) {
      node.next = this.head;
      node.prev = null;
      if (this.head) this.head.prev = node;
      this.head = node;
      if (!this.tail) this.tail = node;
    }
    touch(key) {
      if (this.map.has(key)) {
        const node = this.map.get(key);
        this._unlink(node);
        this._pushFront(node);
        return;
      }
      const node = { key, prev: null, next: null };
      this.map.set(key, node);
      this._pushFront(node);
      if (this.map.size > this.capacity) {
        const lru = this.tail;
        this._unlink(lru);
        this.map.delete(lru.key);
      }
    }
    remove(key) {
      if (!this.map.has(key)) return;
      const node = this.map.get(key);
      this._unlink(node);
      this.map.delete(key);
    }
    toArray() {
      const out = [];
      for (let cur = this.head; cur; cur = cur.next) out.push(cur.key);
      return out;
    }
  }

  /* ---------------- Binary Search (Find by Roll No.) ----------------
     Classic O(log n) search over a roll-number-sorted array, mirrors
     backend/binarysearch.h. Callers must pass an array already
     sorted ascending by roll (use mergeSort first). */
  function binarySearchByRoll(sortedStudents, targetRoll) {
    let lo = 0, hi = sortedStudents.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const midRoll = sortedStudents[mid].roll;
      if (midRoll === targetRoll) return sortedStudents[mid];
      if (midRoll < targetRoll) lo = mid + 1;
      else hi = mid - 1;
    }
    return null;
  }

  return {
    Stack, Queue, MaxHeap, topN, Trie, mergeSort,
    GpaBST, StudyGraph, LRUCache, binarySearchByRoll
  };
})();
