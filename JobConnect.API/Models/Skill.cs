namespace JobConnect.API.Models;

public class Skill
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    
    public ICollection<CandidateSkill> CandidateSkills { get; set; } = new List<CandidateSkill>();
    public ICollection<JobSkill> JobSkills { get; set; } = new List<JobSkill>();
}

// Many-to-many: Candidate <-> Skill
public class CandidateSkill
{
    public int CandidateProfileId { get; set; }
    public int SkillId { get; set; }
    public int ProficiencyLevel { get; set; } = 1; // 1-5
    public int? YearsOfExperience { get; set; }
    
    public CandidateProfile CandidateProfile { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}

// Many-to-many: Job <-> Skill
public class JobSkill
{
    public int JobPostingId { get; set; }
    public int SkillId { get; set; }
    public bool IsRequired { get; set; } = true;
    public int? MinProficiency { get; set; }
    
    public JobPosting JobPosting { get; set; } = null!;
    public Skill Skill { get; set; } = null!;
}
