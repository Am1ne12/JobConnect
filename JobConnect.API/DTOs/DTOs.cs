using System.ComponentModel.DataAnnotations;
using JobConnect.API.Models;

namespace JobConnect.API.DTOs;

// Auth DTOs
public record RegisterDto(
    [Required] [EmailAddress] string Email,
    [Required] [MinLength(6)] string Password,
    [Required] UserRole Role,
    string? FirstName,
    string? LastName,
    string? CompanyName
);

public record LoginDto(
    [Required] [EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponseDto(
    string Token,
    int UserId,
    string Email,
    string Role,
    int? ProfileId
);

public record ChangeEmailDto(
    [Required] [EmailAddress] string NewEmail,
    [Required] string CurrentPassword
);

public record ChangePasswordDto(
    [Required] string CurrentPassword,
    [Required] [MinLength(6)] string NewPassword
);

// User DTOs
public record UserDto(
    int Id,
    string Email,
    string Role,
    DateTime CreatedAt
);

// Candidate DTOs
public record CandidateProfileDto(
    int Id,
    int UserId,
    string FirstName,
    string LastName,
    string? Phone,
    string? Summary,
    string? Location,
    string? PhotoUrl,
    List<ExperienceDto>? Experience,
    List<EducationDto>? Education,
    List<CertificationDto>? Certifications,
    List<CandidateSkillDto>? Skills
);

public record CreateCandidateProfileDto(
    [Required] string FirstName,
    [Required] string LastName,
    string? Phone,
    string? Summary,
    string? Location
);

public record UpdateCandidateProfileDto(
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Summary,
    string? Location,
    List<ExperienceDto>? Experience,
    List<EducationDto>? Education,
    List<CertificationDto>? Certifications,
    List<int>? SkillIds
);

public record ExperienceDto(
    string Company,
    string Title,
    DateTime StartDate,
    DateTime? EndDate,
    bool IsCurrentRole,
    string? Description
);

public record EducationDto(
    string Institution,
    string Degree,
    string Field,
    int GraduationYear,
    string? Description
);

public record CertificationDto(
    string Name,
    string Issuer,
    DateTime IssueDate,
    DateTime? ExpiryDate
);

public record CandidateSkillDto(
    int SkillId,
    string SkillName,
    int ProficiencyLevel,
    int? YearsOfExperience
);

// Company DTOs
public record CompanyDto(
    int Id,
    int UserId,
    string Name,
    string? Description,
    string? Industry,
    string? Website,
    string? Location,
    string? LogoUrl,
    int? EmployeeCount
);

public record CreateCompanyDto(
    [Required] string Name,
    string? Description,
    string? Industry,
    string? Website,
    string? Location
);

public record UpdateCompanyDto(
    string? Name,
    string? Description,
    string? Industry,
    string? Website,
    string? Location,
    int? EmployeeCount
);

// Job DTOs
public record JobPostingDto(
    int Id,
    int CompanyId,
    string CompanyName,
    string Title,
    string Description,
    string? Requirements,
    string? Benefits,
    string? Location,
    string JobType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    string Status,
    int? ExperienceYearsMin,
    int? ExperienceYearsMax,
    List<JobSkillDto>? RequiredSkills,
    DateTime CreatedAt,
    DateTime? PublishedAt,
    int ApplicationCount
);

public record CreateJobPostingDto(
    [Required] string Title,
    [Required] string Description,
    string? Requirements,
    string? Benefits,
    string? Location,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    int? ExperienceYearsMin,
    int? ExperienceYearsMax,
    List<CreateJobSkillDto>? RequiredSkills
);

public record UpdateJobPostingDto(
    string? Title,
    string? Description,
    string? Requirements,
    string? Benefits,
    string? Location,
    JobType? Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    JobStatus? Status,
    int? ExperienceYearsMin,
    int? ExperienceYearsMax,
    List<CreateJobSkillDto>? RequiredSkills
);

public record JobSkillDto(
    int SkillId,
    string SkillName,
    bool IsRequired,
    int? MinProficiency
);

public record CreateJobSkillDto(
    int SkillId,
    bool IsRequired,
    int? MinProficiency
);

// Application DTOs
public record ApplicationDto(
    int Id,
    int CandidateProfileId,
    string CandidateName,
    int JobPostingId,
    string JobTitle,
    string Status,
    int MatchingScore,
    string? CoverLetter,
    string? Notes,
    int KanbanOrder,
    DateTime AppliedAt,
    DateTime UpdatedAt,
    CandidateProfileDto? CandidateProfile
);

public record CreateApplicationDto(
    [Required] int JobPostingId,
    string? CoverLetter
);

public record UpdateApplicationStatusDto(
    [Required] ApplicationStatus Status,
    string? Notes,
    int? KanbanOrder
);

public record KanbanUpdateDto(
    [Required] int ApplicationId,
    [Required] ApplicationStatus NewStatus,
    [Required] int NewOrder
);

// Skill DTOs
public record SkillDto(
    int Id,
    string Name,
    string? Category
);
