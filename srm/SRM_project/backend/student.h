#ifndef STUDENT_H
#define STUDENT_H

#include <string>
#include "include/json.hpp"

using json = nlohmann::json;

// Matches the fields used by data.js / app.js on the frontend
struct Student {
    int id = 0;
    std::string name;
    std::string email;
    std::string phone;
    std::string roll;
    std::string dob;
    std::string grade;
    std::string subject;
    int attended = 0;
    int totalClasses = 0;
    double gpa = 0.0;
    std::string status = "Active";
    std::string guardian;
    std::string address;
    std::string notes;

    json toJson() const {
        return json{
            {"id", id},
            {"name", name},
            {"email", email},
            {"phone", phone},
            {"roll", roll},
            {"dob", dob},
            {"grade", grade},
            {"subject", subject},
            {"attended", attended},
            {"totalClasses", totalClasses},
            {"gpa", gpa},
            {"status", status},
            {"guardian", guardian},
            {"address", address},
            {"notes", notes}
        };
    }

    // Fills fields from JSON; missing keys keep existing/default values
    // (so PUT can be a partial update too).
    static Student fromJson(const json& j) { return fromJson(j, Student{}); }

    static Student fromJson(const json& j, const Student& base) {
        Student s = base;
        if (j.contains("id"))           s.id = j.at("id").get<int>();
        if (j.contains("name"))         s.name = j.at("name").get<std::string>();
        if (j.contains("email"))        s.email = j.at("email").get<std::string>();
        if (j.contains("phone"))        s.phone = j.at("phone").get<std::string>();
        if (j.contains("roll"))         s.roll = j.at("roll").get<std::string>();
        if (j.contains("dob"))          s.dob = j.at("dob").get<std::string>();
        if (j.contains("grade"))        s.grade = j.at("grade").get<std::string>();
        if (j.contains("subject"))      s.subject = j.at("subject").get<std::string>();
        if (j.contains("attended"))     s.attended = j.at("attended").get<int>();
        if (j.contains("totalClasses")) s.totalClasses = j.at("totalClasses").get<int>();
        if (j.contains("gpa"))          s.gpa = j.at("gpa").get<double>();
        if (j.contains("status"))       s.status = j.at("status").get<std::string>();
        if (j.contains("guardian"))     s.guardian = j.at("guardian").get<std::string>();
        if (j.contains("address"))      s.address = j.at("address").get<std::string>();
        if (j.contains("notes"))        s.notes = j.at("notes").get<std::string>();
        return s;
    }
};

// A pending registration sitting in the admission Queue, before it
// becomes a full Student record (no attendance/GPA history yet).
struct AdmissionRequest {
    int queueId = 0; // internal id, just for the frontend to key on
    std::string name;
    std::string email;
    std::string phone;
    std::string roll;
    std::string dob;
    std::string grade;
    std::string subject;
    std::string guardian;
    std::string address;
    std::string notes;

    json toJson() const {
        return json{
            {"queueId", queueId},
            {"name", name}, {"email", email}, {"phone", phone},
            {"roll", roll}, {"dob", dob}, {"grade", grade},
            {"subject", subject}, {"guardian", guardian},
            {"address", address}, {"notes", notes}
        };
    }

    static AdmissionRequest fromJson(const json& j) {
        AdmissionRequest a;
        if (j.contains("name"))     a.name = j.at("name").get<std::string>();
        if (j.contains("email"))    a.email = j.at("email").get<std::string>();
        if (j.contains("phone"))    a.phone = j.at("phone").get<std::string>();
        if (j.contains("roll"))     a.roll = j.at("roll").get<std::string>();
        if (j.contains("dob"))      a.dob = j.at("dob").get<std::string>();
        if (j.contains("grade"))    a.grade = j.at("grade").get<std::string>();
        if (j.contains("subject"))  a.subject = j.at("subject").get<std::string>();
        if (j.contains("guardian")) a.guardian = j.at("guardian").get<std::string>();
        if (j.contains("address"))  a.address = j.at("address").get<std::string>();
        if (j.contains("notes"))    a.notes = j.at("notes").get<std::string>();
        return a;
    }

    // Converts an admitted request into a brand-new Student (id gets
    // assigned by StudentStore::add, same as any other new student).
    Student toStudent() const {
        Student s;
        s.name = name; s.email = email; s.phone = phone; s.roll = roll;
        s.dob = dob; s.grade = grade; s.subject = subject;
        s.guardian = guardian; s.address = address; s.notes = notes;
        s.status = "Active";
        s.attended = 0; s.totalClasses = 0; s.gpa = 0.0;
        return s;
    }
};

#endif // STUDENT_H
