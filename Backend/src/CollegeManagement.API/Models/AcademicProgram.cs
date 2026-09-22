using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace CollegeManagement.API.Models
{
    public class AcademicProgram
    {
        public int ProgramId { get; set; }

        public string ProgramName { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }


        public virtual ICollection<GroupProgram> GroupPrograms { get; set; }
                    = new List<GroupProgram>();
    }
}