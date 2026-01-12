using Microsoft.EntityFrameworkCore;
using JobConnect.API.Models;

namespace JobConnect.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.ConfigureWarnings(warnings =>
            warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }


    public DbSet<User> Users => Set<User>();
    public DbSet<CandidateProfile> CandidateProfiles => Set<CandidateProfile>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<JobPosting> JobPostings => Set<JobPosting>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();
    public DbSet<JobSkill> JobSkills => Set<JobSkill>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<CompanyAvailability> CompanyAvailabilities => Set<CompanyAvailability>();
    public DbSet<CompanyUnavailability> CompanyUnavailabilities => Set<CompanyUnavailability>();
    public DbSet<InterviewMessage> InterviewMessages => Set<InterviewMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<string>();
        });

        // CandidateProfile - User (1:1)
        modelBuilder.Entity<CandidateProfile>()
            .HasOne(cp => cp.User)
            .WithOne(u => u.CandidateProfile)
            .HasForeignKey<CandidateProfile>(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company - User (1:1)
        modelBuilder.Entity<Company>()
            .HasOne(c => c.User)
            .WithOne(u => u.Company)
            .HasForeignKey<Company>(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // JobPosting - Company (1:N)
        modelBuilder.Entity<JobPosting>()
            .HasOne(j => j.Company)
            .WithMany(c => c.JobPostings)
            .HasForeignKey(j => j.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JobPosting>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.Type).HasConversion<string>();
        });

        // Application - CandidateProfile (1:N)
        modelBuilder.Entity<Application>()
            .HasOne(a => a.CandidateProfile)
            .WithMany(cp => cp.Applications)
            .HasForeignKey(a => a.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // Application - JobPosting (1:N)
        modelBuilder.Entity<Application>()
            .HasOne(a => a.JobPosting)
            .WithMany(j => j.Applications)
            .HasForeignKey(a => a.JobPostingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Application>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasIndex(e => new { e.CandidateProfileId, e.JobPostingId }).IsUnique();
        });

        // CandidateSkill (Many-to-Many)
        modelBuilder.Entity<CandidateSkill>()
            .HasKey(cs => new { cs.CandidateProfileId, cs.SkillId });

        modelBuilder.Entity<CandidateSkill>()
            .HasOne(cs => cs.CandidateProfile)
            .WithMany(cp => cp.Skills)
            .HasForeignKey(cs => cs.CandidateProfileId);

        modelBuilder.Entity<CandidateSkill>()
            .HasOne(cs => cs.Skill)
            .WithMany(s => s.CandidateSkills)
            .HasForeignKey(cs => cs.SkillId);

        // JobSkill (Many-to-Many)
        modelBuilder.Entity<JobSkill>()
            .HasKey(js => new { js.JobPostingId, js.SkillId });

        modelBuilder.Entity<JobSkill>()
            .HasOne(js => js.JobPosting)
            .WithMany(j => j.RequiredSkills)
            .HasForeignKey(js => js.JobPostingId);

        modelBuilder.Entity<JobSkill>()
            .HasOne(js => js.Skill)
            .WithMany(s => s.JobSkills)
            .HasForeignKey(js => js.SkillId);

        // Interview configuration
        modelBuilder.Entity<Interview>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>();
            
            // Force timestamp without time zone to prevent UTC conversion
            entity.Property(e => e.ScheduledAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.EndsAt).HasColumnType("timestamp without time zone");
            
            entity.HasOne(i => i.Application)
                .WithMany()
                .HasForeignKey(i => i.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(i => i.Company)
                .WithMany(c => c.Interviews)
                .HasForeignKey(i => i.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(i => i.CandidateProfile)
                .WithMany()
                .HasForeignKey(i => i.CandidateProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(i => i.RescheduledFrom)
                .WithMany()
                .HasForeignKey(i => i.RescheduledFromId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // CompanyAvailability configuration
        modelBuilder.Entity<CompanyAvailability>(entity =>
        {
            entity.HasOne(ca => ca.Company)
                .WithMany(c => c.Availabilities)
                .HasForeignKey(ca => ca.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Note: No unique constraint - allows multiple slots per day
        });

        // InterviewMessage configuration
        modelBuilder.Entity<InterviewMessage>(entity =>
        {
            entity.HasOne(m => m.Interview)
                .WithMany(i => i.Messages)
                .HasForeignKey(m => m.InterviewId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Notification configuration
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => new { e.UserId, e.IsRead });
        });

        // CompanyUnavailability configuration
        modelBuilder.Entity<CompanyUnavailability>(entity =>
        {
            entity.HasOne(u => u.Company)
                .WithMany()
                .HasForeignKey(u => u.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => new { e.CompanyId, e.StartTime });
        });

        // Seed some default skills
        modelBuilder.Entity<Skill>().HasData(
            new Skill { Id = 1, Name = "C#", Category = "Backend" },
            new Skill { Id = 2, Name = ".NET", Category = "Backend" },
            new Skill { Id = 3, Name = "Angular", Category = "Frontend" },
            new Skill { Id = 4, Name = "TypeScript", Category = "Frontend" },
            new Skill { Id = 5, Name = "JavaScript", Category = "Frontend" },
            new Skill { Id = 6, Name = "React", Category = "Frontend" },
            new Skill { Id = 7, Name = "Python", Category = "Backend" },
            new Skill { Id = 8, Name = "Java", Category = "Backend" },
            new Skill { Id = 9, Name = "PostgreSQL", Category = "Database" },
            new Skill { Id = 10, Name = "Docker", Category = "DevOps" },
            new Skill { Id = 11, Name = "Git", Category = "Tools" },
            new Skill { Id = 12, Name = "REST API", Category = "Backend" },
            new Skill { Id = 13, Name = "GraphQL", Category = "Backend" },
            new Skill { Id = 14, Name = "HTML/CSS", Category = "Frontend" },
            new Skill { Id = 15, Name = "Agile/Scrum", Category = "Methodology" }
        );
    }
}
