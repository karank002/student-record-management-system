# Student Record Management System

A **Student Record Management System (SRM)** developed using **C++ and Data Structures & Algorithms (DSA)** to efficiently store, manage, search, update, delete, and organize student records.

## 📌 Project Overview

The Student Record Management System is a DSA-based application designed to provide an organized and efficient way to manage student information.

The project demonstrates the practical application of fundamental **Data Structures and Algorithms** concepts in a real-world record-management scenario. It allows users to perform essential operations on student records while providing an understanding of algorithm efficiency, searching, sorting, data organization, and problem-solving.

This project was developed as part of **Summer Training / PEP Training** to strengthen programming and DSA skills through practical implementation.

## 🎯 Objectives

The main objectives of this project are:

* To develop a practical Student Record Management System.
* To apply Data Structures and Algorithms to a real-world problem.
* To efficiently store and organize student information.
* To implement searching and sorting techniques.
* To perform insertion, deletion, updating, and traversal operations.
* To understand and analyze time and space complexity.
* To improve programming and problem-solving skills.
* To develop a structured and maintainable C++ application.

## ✨ Features

### Student Record Management

* ➕ Add new student records
* 📋 Display student records
* 🔍 Search for a student
* ✏️ Update student information
* 🗑️ Delete student records
* 📊 Sort student records
* 🔢 Search using Student ID
* 📈 Organize records based on academic information

### Searching

The system can use searching algorithms to locate specific student records.

Examples include:

* Linear Search
* Binary Search

The choice of searching technique depends on how the student records are organized.

### Sorting

Student records can be organized according to different attributes, such as:

* Student ID
* Student Name
* Marks
* CGPA

Sorting algorithms that can be implemented or demonstrated include:

* Bubble Sort
* Selection Sort
* Insertion Sort
* Merge Sort
* Quick Sort

## 🧠 Data Structures & Algorithms

The project focuses on the practical application of the following DSA concepts:

### Data Structures

* Arrays
* Vectors
* Linked Lists
* Structures / Classes
* Hash-based data organization where applicable

### Algorithms

* Linear Search
* Binary Search
* Bubble Sort
* Selection Sort
* Insertion Sort
* Merge Sort
* Quick Sort
* Traversal
* Insertion and deletion operations

## ⏱️ Complexity Analysis

Understanding algorithm complexity is an important part of the project.

| Operation / Algorithm |  Best Case | Average Case | Worst Case |
| --------------------- | ---------: | -----------: | ---------: |
| Linear Search         |       O(1) |         O(n) |       O(n) |
| Binary Search         |       O(1) |     O(log n) |   O(log n) |
| Bubble Sort           |       O(n) |        O(n²) |      O(n²) |
| Selection Sort        |      O(n²) |        O(n²) |      O(n²) |
| Insertion Sort        |       O(n) |        O(n²) |      O(n²) |
| Merge Sort            | O(n log n) |   O(n log n) | O(n log n) |
| Quick Sort            | O(n log n) |   O(n log n) |      O(n²) |

> Complexity may vary depending on the specific implementation and input conditions.

## 🛠️ Technologies Used

* **Programming Language:** C++
* **Core Concepts:** Data Structures & Algorithms
* **Development Environment:** Visual Studio Code
* **Version Control:** Git / GitHub
* **Compiler:** GCC / G++ or another C++17-compatible compiler

## 📂 Project Structure

A typical project structure is:

```text
student-record-management-system/
│
├── main.cpp
├── student.cpp
├── student.h
├── README.md
│
└── data/
    └── student_records.txt
```

> The actual structure may vary depending on the implementation.

## 🚀 Getting Started

### Prerequisites

Before running the project, make sure you have:

* A C++ compiler
* Visual Studio Code or another C++ IDE
* C++17 or later recommended

### Clone the Repository

If Git is available on your system:

```bash
git clone https://github.com/YOUR-USERNAME/student-record-management-system.git
```

Navigate into the project directory:

```bash
cd student-record-management-system
```

### Compile the Project

Using G++:

```bash
g++ main.cpp -o srm
```

If the project contains multiple `.cpp` files:

```bash
g++ main.cpp student.cpp -o srm
```

### Run the Application

On Windows:

```bash
srm.exe
```

On Linux/macOS:

```bash
./srm
```

## 💻 Example Workflow

A typical workflow of the system is:

```text
Start
  ↓
Display Main Menu
  ↓
Select Operation
  ↓
Add / Search / Update / Delete / Sort
  ↓
Process Student Record
  ↓
Display Result
  ↓
Return to Main Menu
  ↓
Exit
```

## 📋 Student Record Information

A student record may contain information such as:

```text
Student ID
Student Name
Age
Department
Marks
CGPA
```

Additional fields can be added depending on the requirements of the system.

## 🔍 Example Operations

### Add Student

The user enters the required student information, and the system stores the record using the selected data structure.

### Search Student

The user provides a Student ID or another search criterion, and the system searches the available records.

### Update Student

Existing student information can be modified without creating a new record.

### Delete Student

A selected student record can be removed from the system.

### Sort Records

Records can be arranged according to Student ID, name, marks, or CGPA using appropriate sorting algorithms.

## 📸 Screenshots

Screenshots of the application can be added here:

```text
docs/
├── home.png
├── add-student.png
├── search-student.png
├── update-student.png
└── student-records.png
```

Example Markdown:

```markdown
![Main Menu](docs/home.png)
```

## 📚 Learning Outcomes

Through the development of this project, the following skills were strengthened:

* C++ programming
* Data structure implementation
* Algorithm design
* Searching techniques
* Sorting techniques
* Time complexity analysis
* Space complexity analysis
* Problem-solving
* Logical thinking
* Modular programming
* Debugging and testing
* Version control using GitHub

## 🔮 Future Enhancements

The project can be further improved by adding:

* Graphical User Interface (GUI)
* Database integration using MySQL or SQLite
* Login and authentication
* Role-based access for administrators and students
* File-based permanent storage
* Advanced filtering and searching
* Attendance management
* Subject-wise marks management
* Automatic CGPA calculation
* Student performance reports
* Export records to CSV/PDF
* Cloud-based data storage

## 🧪 Testing

The system should be tested using different scenarios, including:

* Adding valid student records
* Adding duplicate Student IDs
* Searching for existing students
* Searching for non-existing students
* Updating existing records
* Deleting existing records
* Sorting empty records
* Sorting a single record
* Sorting multiple records
* Handling invalid input

Testing helps ensure that the system performs correctly under different input conditions.

## 📖 References

* Cormen, T. H. et al., *Introduction to Algorithms*, MIT Press.
* GeeksforGeeks, *Data Structures and Algorithms*.
* VisuAlgo, *Data Structures and Algorithms Visualization*.
* Knuth, D. E., *The Art of Computer Programming, Volume 3: Sorting and Searching*, Addison-Wesley.
* Goodrich, M. T., Tamassia, R., and Goldwasser, M. H., *Data Structures and Algorithms in C++*, Wiley.
* cppreference, *C++ Standard Library Reference*.
* GitHub Documentation.

## 👨‍💻 Author

**Karan Singh Kanwal**

Bachelor of Technology
Computer Science and Engineering
Lovely Professional University

## 📄 License

This project was developed for **educational and academic purposes** as part of Summer Training / PEP Training.

---

⭐ If you find this project useful, consider giving the repository a **star** on GitHub.
