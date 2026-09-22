using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("Rooms")]
    public class Room
    {
        [Key]
        public int RoomId { get; set; }

        [Required]
        [Column("RoomNumber")]
        [MaxLength(50)]
        public string RoomNumber { get; set; } = string.Empty;

        [Column("RoomCode")]
        [MaxLength(50)]
        public string? RoomCode
        {
            get => !string.IsNullOrWhiteSpace(_roomCode) ? _roomCode : RoomNumber;
            set
            {
                _roomCode = value;
                if (string.IsNullOrWhiteSpace(RoomNumber) && !string.IsNullOrWhiteSpace(value))
                {
                    RoomNumber = value;
                }
            }
        }
        private string? _roomCode;

        [Column("RoomName")]
        [MaxLength(100)]
        public string? RoomName
        {
            get => !string.IsNullOrWhiteSpace(_roomName) ? _roomName : (!string.IsNullOrWhiteSpace(RoomNumber) ? RoomNumber : (_roomCode ?? string.Empty));
            set => _roomName = value;
        }
        private string? _roomName;

        [Column("BlockName")]
        [MaxLength(100)]
        public string? BlockName { get; set; }

        [NotMapped]
        public string? BuildingName
        {
            get => BlockName;
            set => BlockName = value;
        }

        [NotMapped]
        public string? Building
        {
            get => BlockName;
            set => BlockName = value;
        }

        [NotMapped]
        public string? Block
        {
            get => BlockName;
            set => BlockName = value;
        }

        [Column("Floor")]
        [MaxLength(50)]
        public string? Floor { get; set; }

        [Required]
        public int Capacity { get; set; } = 60;

        [Required]
        [MaxLength(50)]
        public string RoomType { get; set; } = "Classroom";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
