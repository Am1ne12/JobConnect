using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.Models;

namespace JobConnect.API.Services;

public interface IMatchingScoreService
{
    Task<int> CalculateMatchingScore(int candidateProfileId, int jobPostingId);
    Task<Dictionary<int, int>> CalculateMatchingScoresForJob(int jobPostingId);
}

public class MatchingScoreService : IMatchingScoreService
{
    private readonly ApplicationDbContext _context;

    public MatchingScoreService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Calculates matching score between a candidate and a job posting.
    /// Score = (Matching Skills / Required Skills) * 100 + Bonuses
    /// </summary>
    public async Task<int> CalculateMatchingScore(int candidateProfileId, int jobPostingId)
    {
        var candidateSkills = await _context.CandidateSkills
            .Where(cs => cs.CandidateProfileId == candidateProfileId)
            .Select(cs => new { cs.SkillId, cs.ProficiencyLevel })
            .ToListAsync();

        var jobSkills = await _context.JobSkills
            .Where(js => js.JobPostingId == jobPostingId)
            .Select(js => new { js.SkillId, js.IsRequired, js.MinProficiency })
            .ToListAsync();

        if (!jobSkills.Any())
            return 0;

        var requiredSkills = jobSkills.Where(js => js.IsRequired).ToList();
        var optionalSkills = jobSkills.Where(js => !js.IsRequired).ToList();

        int matchedRequired = 0;
        int matchedOptional = 0;
        int proficiencyBonus = 0;

        foreach (var requiredSkill in requiredSkills)
        {
            var candidateSkill = candidateSkills.FirstOrDefault(cs => cs.SkillId == requiredSkill.SkillId);
            if (candidateSkill != null)
            {
                matchedRequired++;
                
                // Proficiency bonus: if candidate exceeds minimum requirement
                if (requiredSkill.MinProficiency.HasValue && 
                    candidateSkill.ProficiencyLevel >= requiredSkill.MinProficiency.Value)
                {
                    proficiencyBonus += (candidateSkill.ProficiencyLevel - requiredSkill.MinProficiency.Value) * 2;
                }
            }
        }

        foreach (var optionalSkill in optionalSkills)
        {
            if (candidateSkills.Any(cs => cs.SkillId == optionalSkill.SkillId))
            {
                matchedOptional++;
            }
        }

        // Base score: percentage of required skills matched (max 70 points)
        double baseScore = requiredSkills.Count > 0 
            ? (double)matchedRequired / requiredSkills.Count * 70 
            : 70;

        // Optional skills bonus (max 20 points)
        double optionalBonus = optionalSkills.Count > 0 
            ? (double)matchedOptional / optionalSkills.Count * 20 
            : 0;

        // Proficiency bonus (max 10 points)
        double proficiencyScore = Math.Min(proficiencyBonus, 10);

        int totalScore = (int)Math.Round(baseScore + optionalBonus + proficiencyScore);
        return Math.Min(100, totalScore);
    }

    /// <summary>
    /// Calculates matching scores for all candidates who applied to a job
    /// </summary>
    public async Task<Dictionary<int, int>> CalculateMatchingScoresForJob(int jobPostingId)
    {
        var applications = await _context.Applications
            .Where(a => a.JobPostingId == jobPostingId)
            .Select(a => a.CandidateProfileId)
            .ToListAsync();

        var scores = new Dictionary<int, int>();

        foreach (var candidateId in applications)
        {
            scores[candidateId] = await CalculateMatchingScore(candidateId, jobPostingId);
        }

        return scores;
    }
}
