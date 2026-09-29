using System;
using System.Data;
using Dapper;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Dapper TypeHandler for DateOnly mapping from database DateTime/Date.
    /// </summary>
    public class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly value)
        {
            parameter.Value = value.ToDateTime(TimeOnly.MinValue);
            parameter.DbType = DbType.Date;
        }

        public override DateOnly Parse(object value)
        {
            if (value is DateTime dt)
            {
                return DateOnly.FromDateTime(dt);
            }
            if (value is string str && DateOnly.TryParse(str, out var d))
            {
                return d;
            }
            return DateOnly.FromDateTime(Convert.ToDateTime(value));
        }
    }

    /// <summary>
    /// Dapper TypeHandler for Nullable DateOnly mapping from database DateTime/Date.
    /// </summary>
    public class NullableDateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly?>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly? value)
        {
            parameter.Value = value.HasValue ? value.Value.ToDateTime(TimeOnly.MinValue) : DBNull.Value;
            parameter.DbType = DbType.Date;
        }

        public override DateOnly? Parse(object value)
        {
            if (value == null || value is DBNull) return null;
            if (value is DateTime dt) return DateOnly.FromDateTime(dt);
            if (value is string str && DateOnly.TryParse(str, out var d)) return d;
            return DateOnly.FromDateTime(Convert.ToDateTime(value));
        }
    }

    /// <summary>
    /// Dapper TypeHandler for TimeOnly mapping from database TimeSpan/Time.
    /// </summary>
    public class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
    {
        public override void SetValue(IDbDataParameter parameter, TimeOnly value)
        {
            parameter.Value = value.ToTimeSpan();
            parameter.DbType = DbType.Time;
        }

        public override TimeOnly Parse(object value)
        {
            if (value is TimeSpan ts) return TimeOnly.FromTimeSpan(ts);
            if (value is DateTime dt) return TimeOnly.FromDateTime(dt);
            if (value is string str && TimeOnly.TryParse(str, out var t)) return t;
            return TimeOnly.FromTimeSpan((TimeSpan)value);
        }
    }

    /// <summary>
    /// Dapper TypeHandler for Nullable TimeOnly mapping from database TimeSpan/Time.
    /// </summary>
    public class NullableTimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly?>
    {
        public override void SetValue(IDbDataParameter parameter, TimeOnly? value)
        {
            parameter.Value = value.HasValue ? value.Value.ToTimeSpan() : DBNull.Value;
            parameter.DbType = DbType.Time;
        }

        public override TimeOnly? Parse(object value)
        {
            if (value == null || value is DBNull) return null;
            if (value is TimeSpan ts) return TimeOnly.FromTimeSpan(ts);
            if (value is DateTime dt) return TimeOnly.FromDateTime(dt);
            if (value is string str && TimeOnly.TryParse(str, out var t)) return t;
            return TimeOnly.FromTimeSpan((TimeSpan)value);
        }
    }
}
