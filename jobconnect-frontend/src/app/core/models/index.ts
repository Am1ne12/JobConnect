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

export interface ChangeNameRequest {
    firstName: string;
    lastName: string;
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
export enum JobType {
    FullTime = 'FullTime',
    PartTime = 'PartTime',
    Contract = 'Contract',
    Internship = 'Internship',
    Remote = 'Remote'
}

export enum JobStatus {
    Draft = 'Draft',
    Published = 'Published',
    Closed = 'Closed',
    Archived = 'Archived'
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
    companyId: number;
    companyName?: string;
    status: string;
    matchingScore: number;
    coverLetter?: string;
    notes?: string;
    kanbanOrder: number;
    appliedAt: Date;
    updatedAt: Date;
    candidateProfile?: CandidateProfile;
    interviewId?: number;
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

// Interview types
export enum InterviewStatus {
    Scheduled = 'Scheduled',
    InWaitingRoom = 'InWaitingRoom',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
    Rescheduled = 'Rescheduled'
}

export interface Interview {
    id: number;
    applicationId: number;
    companyId: number;
    companyName: string;
    candidateProfileId: number;
    candidateName: string;
    jobPostingId: number;
    jobTitle: string;
    scheduledAt: Date;
    endsAt: Date;
    status: string;
    cancellationReason?: string;
    rescheduledFromId?: number;
    createdAt: Date;
    unreadMessageCount: number;
    companyJoinedAt?: Date;
}

export interface CreateInterviewRequest {
    applicationId: number;
    scheduledAt: Date;
}

export interface RescheduleInterviewRequest {
    newScheduledAt: Date;
    reason?: string;
}

export interface CancelInterviewRequest {
    reason: string;
}

export interface InterviewJoinInfo {
    roomId: string;
    provider: string;
    userDisplayName: string;
    canJoin: boolean;
    message?: string;
    secondsUntilStart?: number;
    meetingToken?: string;
}

// Company Availability types
export interface CompanyAvailability {
    id: number;
    companyId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

export interface AvailabilitySlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

export interface UpdateAvailabilityRequest {
    slots: AvailabilitySlot[];
}

export interface AvailableSlot {
    startTime: Date;
    endTime: Date;
}

// Date-specific availability slot (from CompanyAvailabilitySlot model)
export interface CalendarSlot {
    id: number;
    slotDate: string;  // DateOnly as ISO string "2026-01-15"
    startTime: string; // TimeOnly as "09:00:00"
    endTime: string;   // TimeOnly as "10:30:00"
    isBooked: boolean;
}

// Interview Message types
export interface InterviewMessage {
    id: number;
    interviewId: number;
    senderId: number;
    senderRole: string;
    senderName: string;
    content: string;
    sentAt: Date;
    isRead: boolean;
}

export interface SendMessageRequest {
    content: string;
}

// Notification types
export interface Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}

// Pagination types
export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
}
