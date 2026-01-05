// User types
export enum UserRole {
    Candidate = 0,
    Company = 1,
    Admin = 2
}

export interface User {
    id: number;
    email: string;
    role: UserRole;
    createdAt: Date;
}

export interface AuthResponse {
    token: string;
    userId: number;
    email: string;
    role: string;
    profileId: number | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    companyName?: string;
}

export interface ChangeEmailRequest {
    newEmail: string;
    currentPassword: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// Candidate types
export interface CandidateProfile {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    phone?: string;
    summary?: string;
    location?: string;
    photoUrl?: string;
    experience?: Experience[];
    education?: Education[];
    certifications?: Certification[];
    skills?: CandidateSkill[];
}

export interface Experience {
    company: string;
    title: string;
    startDate: Date;
    endDate?: Date;
    isCurrentRole: boolean;
    description?: string;
}

export interface Education {
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
    description?: string;
}

export interface Certification {
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
}

export interface CandidateSkill {
    skillId: number;
    skillName: string;
    proficiencyLevel: number;
    yearsOfExperience?: number;
}

// Company types
export interface Company {
    id: number;
    userId: number;
    name: string;
    description?: string;
    industry?: string;
    website?: string;
    location?: string;
    logoUrl?: string;
    employeeCount?: number;
}

// Job types
export enum JobStatus {
    Draft = 0,
    Published = 1,
    Closed = 2,
    Archived = 3
}

export enum JobType {
    FullTime = 0,
    PartTime = 1,
    Contract = 2,
    Internship = 3,
    Remote = 4
}

export interface JobPosting {
    id: number;
    companyId: number;
    companyName: string;
    title: string;
    description: string;
    requirements?: string;
    benefits?: string;
    location?: string;
    jobType: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    status: string;
    experienceYearsMin?: number;
    experienceYearsMax?: number;
    requiredSkills?: JobSkill[];
    createdAt: Date;
    publishedAt?: Date;
    applicationCount: number;
}

export interface JobSkill {
    skillId: number;
    skillName: string;
    isRequired: boolean;
    minProficiency?: number;
}

export interface CreateJobRequest {
    title: string;
    description: string;
    requirements?: string;
    benefits?: string;
    location?: string;
    type: JobType;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    experienceYearsMin?: number;
    experienceYearsMax?: number;
    requiredSkills?: { skillId: number; isRequired: boolean; minProficiency?: number }[];
}

// Application types
export enum ApplicationStatus {
    Submitted = 'Submitted',
    Screening = 'Screening',
    Interview = 'Interview',
    Offer = 'Offer',
    Hired = 'Hired',
    Rejected = 'Rejected'
}

export interface Application {
    id: number;
    candidateProfileId: number;
    candidateName: string;
    jobPostingId: number;
    jobTitle: string;
    status: string;
    matchingScore: number;
    coverLetter?: string;
    notes?: string;
    kanbanOrder: number;
    appliedAt: Date;
    updatedAt: Date;
    candidateProfile?: CandidateProfile;
}

export interface KanbanUpdate {
    applicationId: number;
    newStatus: ApplicationStatus;
    newOrder: number;
}

// Skill types
export interface Skill {
    id: number;
    name: string;
    category?: string;
}
