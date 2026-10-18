# Linking Exams to Courses - Implementation Guide

## Overview
This guide explains how to link exams to courses so that only enrolled students can access them.

## Steps

### 1. Run SQL Migration (Required)

**File**: `add_course_to_exams.sql`

Run this in your Supabase SQL Editor:
```sql
ALTER TABLE exams 
ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

CREATE INDEX idx_exams_course_id ON exams(course_id);
```

### 2. Update Existing Exams (Manual)

After adding the column, you need to manually link existing exams to courses.

**Option A: Via Supabase Dashboard**
1. Go to Supabase → Table Editor → `exams`
2. For each exam, set the `course_id` to the appropriate course ID

**Option B: Via SQL**
```sql
-- Example: Link "Physics Midterm" to a Physics course
UPDATE exams 
SET course_id = 'your-physics-course-id-here' 
WHERE title = 'Physics Midterm';
```

### 3. Update Exam Creation Form

When creating new exams (in admin/teacher portal), add a dropdown to select the course:

```jsx
// In CreateExam component:
<select 
    value={examData.course_id}
    onChange={(e) => setExamData({...examData, course_id: e.target.value})}
>
    <option value="">Select Course</option>
    {courses.map(course => (
        <option key={course.id} value={course.id}>{course.name}</option>
    ))}
</select>
```

### 4. Update ExamPortal.jsx (Student View)

**Current Behavior**: Shows ALL exams
**Desired Behavior**: Show only exams from courses the student is enrolled in

**Updated Query** in ExamContext or directly in ExamPortal:

```jsx
// Fetch exams for enrolled courses only
const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id);

const enrolledCourseIds = enrollments.map(e => e.course_id);

const { data: exams } = await supabase
    .from('exams')
    .select('*, courses(name)')
    .in('course_id', enrolledCourseIds)
    .eq('is_active', true);
```

### 5. Add Access Control in TakeExam.jsx

**Security**: Verify enrollment before allowing exam access

Add this check in the `fetchExamData` function:

```jsx
// After fetching exam data:
const { data: examData, error: examError } = await supabase
    .from('exams')
    .select('*, courses(id, name)')
    .eq('id', id)
    .single();

if (examError) throw examError;

// CHECK ENROLLMENT
const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', examData.course_id)
    .single();

if (!enrollment) {
    alert('You are not enrolled in this course!');
    navigate('/student/exams');
    return;
}

// Proceed with setting exam and loading questions...
```

### 6. Display Course Name in ExamPortal

Show which course each exam belongs to:

```jsx
<p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
    Course: {exam.courses?.name || 'N/A'}
</p>
```

## Database Schema Reference

### exams table (after migration)
```
- id (UUID, PK)
- title (TEXT)
- description (TEXT)
- course_id (UUID, FK → courses) ← NEW!
- duration_minutes (INTEGER)
- total_marks (INTEGER)
- is_active (BOOLEAN)
- ...
```

### enrollments table (existing)
```
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- course_id (UUID, FK → courses)
- enrolled_at (TIMESTAMP)
- ...
```

## Complete Flow

1. **Teacher Creates Exam**
   - Selects course when creating exam
   - `course_id` is saved in exams table

2. **Student Views Exams**
   - System fetches student's enrollments
   - Only shows exams where `exam.course_id` matches enrolled courses

3. **Student Takes Exam**
   - System verifies enrollment in that course
   - If not enrolled → redirect with error
   - If enrolled → allow access

## RLS (Row Level Security) - Optional Enhancement

For extra security, add RLS policies:

```sql
-- Students can only view exams from courses they're enrolled in
CREATE POLICY "Students can view enrolled course exams"
ON exams FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.course_id = exams.course_id
        AND enrollments.user_id = auth.uid()
    )
);
```

## Summary Checklist

- [ ] Run `add_course_to_exams.sql` in Supabase
- [ ] Update existing exams to link them to courses
- [ ] Update exam creation form to include course selection
- [ ] Modify ExamPortal to filter exams by enrollment
- [ ] Add enrollment check in TakeExam component
- [ ] (Optional) Add RLS policies for enhanced security
- [ ] Test with different student accounts

---

**Need Help?** 
- Check that enrollments table exists and has correct data
- Verify course IDs are correctly set in exams
- Use browser console logs to debug queries
