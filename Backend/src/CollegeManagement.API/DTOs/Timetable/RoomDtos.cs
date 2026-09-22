using System;

namespace CollegeManagement.API.DTOs.Timetable
{
    public class CreateRoomDto
    {
        private string? _roomCode;
        public string RoomCode
        {
            get => !string.IsNullOrWhiteSpace(_roomCode) ? _roomCode : (!string.IsNullOrWhiteSpace(_roomNumber) ? _roomNumber! : (_roomName ?? string.Empty));
            set => _roomCode = value;
        }

        private string? _roomNumber;
        public string? RoomNumber
        {
            get => !string.IsNullOrWhiteSpace(_roomNumber) ? _roomNumber : _roomCode;
            set => _roomNumber = value;
        }

        public string? Room
        {
            get => RoomNumber;
            set => RoomNumber = value;
        }

        private string? _roomName;
        public string RoomName
        {
            get => !string.IsNullOrWhiteSpace(_roomName) ? _roomName : (!string.IsNullOrWhiteSpace(_roomCode) ? _roomCode! : (_roomNumber ?? string.Empty));
            set => _roomName = value;
        }

        public string? Name
        {
            get => RoomName;
            set => RoomName = value ?? string.Empty;
        }

        public int Capacity { get; set; } = 60;
        public string RoomType { get; set; } = "Classroom";
        public string? BlockName { get; set; }

        public string? Building
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? BuildingName
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? Block
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? Floor { get; set; }
        public bool IsActive { get; set; } = true;

        public string? Status
        {
            get => IsActive ? "Active" : "Inactive";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    IsActive = value.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
                }
            }
        }
    }

    public class UpdateRoomDto
    {
        private string? _roomCode;
        public string RoomCode
        {
            get => !string.IsNullOrWhiteSpace(_roomCode) ? _roomCode : (!string.IsNullOrWhiteSpace(_roomNumber) ? _roomNumber! : (_roomName ?? string.Empty));
            set => _roomCode = value;
        }

        private string? _roomNumber;
        public string? RoomNumber
        {
            get => !string.IsNullOrWhiteSpace(_roomNumber) ? _roomNumber : _roomCode;
            set => _roomNumber = value;
        }

        public string? Room
        {
            get => RoomNumber;
            set => RoomNumber = value;
        }

        private string? _roomName;
        public string RoomName
        {
            get => !string.IsNullOrWhiteSpace(_roomName) ? _roomName : (!string.IsNullOrWhiteSpace(_roomCode) ? _roomCode! : (_roomNumber ?? string.Empty));
            set => _roomName = value;
        }

        public string? Name
        {
            get => RoomName;
            set => RoomName = value ?? string.Empty;
        }

        public int Capacity { get; set; } = 60;
        public string RoomType { get; set; } = "Classroom";
        public string? BlockName { get; set; }

        public string? Building
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? BuildingName
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? Block
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? Floor { get; set; }
        public bool IsActive { get; set; } = true;

        public string? Status
        {
            get => IsActive ? "Active" : "Inactive";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    IsActive = value.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
                }
            }
        }
    }

    public class RoomResponseDto
    {
        public int RoomId { get; set; }
        public int Id => RoomId;

        public string RoomCode { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string RoomNumber => RoomCode;
        public int Capacity { get; set; }
        public string RoomType { get; set; } = string.Empty;
        public string? BlockName { get; set; }
        public string? Block => BlockName;
        public string? Building => BlockName;
        public string? BuildingName => BlockName;
        public string? Floor { get; set; }
        public bool IsActive { get; set; }
        public string Status => IsActive ? "Active" : "Inactive";

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class RoomFilterDto
    {
        public string? Building { get; set; }
        public string? BlockName
        {
            get => Building;
            set => Building = value;
        }
        public string? Block
        {
            get => Building;
            set => Building = value;
        }

        public string? Floor { get; set; }
        public string? RoomType { get; set; }
        public bool? IsActive { get; set; }

        public string? Status
        {
            get => IsActive.HasValue ? (IsActive.Value ? "Active" : "Inactive") : null;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    IsActive = value.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
                }
            }
        }

        public string? SearchTerm { get; set; }
        public string? Search
        {
            get => SearchTerm;
            set => SearchTerm = value;
        }

        public bool? OnlyAvailable { get; set; }
        public bool? ExcludeAssigned { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class BulkCreateRoomsRequest
    {
        public string? BlockName { get; set; }
        public string? Building
        {
            get => BlockName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    BlockName = value;
                }
            }
        }

        public string? Floor { get; set; }

        public string? StartRoomNo { get; set; }
        public string? Prefix
        {
            get => StartRoomNo;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    StartRoomNo = value;
                }
            }
        }

        public int RoomCount { get; set; } = 30;
        public int NumberOfRooms
        {
            get => RoomCount;
            set => RoomCount = value;
        }

        public int DefaultCapacity { get; set; } = 40;
        public int Capacity
        {
            get => DefaultCapacity;
            set => DefaultCapacity = value;
        }

        public string RoomType { get; set; } = "Classroom";

        public bool IsActive { get; set; } = true;
        public string? Status
        {
            get => IsActive ? "Active" : "Inactive";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    IsActive = value.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
                }
            }
        }

        public System.Collections.Generic.List<CreateRoomDto>? Rooms { get; set; }
    }

    public class BulkRoomCreationResultDto
    {
        public int TotalRequested { get; set; }
        public int TotalCreated { get; set; }
        public System.Collections.Generic.List<RoomResponseDto> CreatedRooms { get; set; } = new();
        public System.Collections.Generic.List<string> Errors { get; set; } = new();
    }
}
