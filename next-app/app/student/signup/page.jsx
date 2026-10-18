import StudentSignup from '../../../components/StudentSignup';

export const metadata = {
    title: 'Student Signup | Edustacks',
    description: 'Create a new student account to start learning.',
    alternates: {
        canonical: '/student/signup',
    },
};

export default function StudentSignupPage() {
    return (
        <StudentSignup />
    );
}
