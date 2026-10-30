using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace CollegeManagement.API.Helpers
{
    public static class ProgramIdResolver
    {
        public static List<int> Resolve(List<int>? programIds, JsonElement? programsRaw, JsonElement? selectedProgramsRaw)
        {
            var ids = new HashSet<int>();

            if (programIds != null)
            {
                foreach (var id in programIds)
                {
                    if (id > 0) ids.Add(id);
                }
            }

            ExtractFromJsonElement(programsRaw, ids);
            ExtractFromJsonElement(selectedProgramsRaw, ids);

            return ids.ToList();
        }

        private static void ExtractFromJsonElement(JsonElement? elem, HashSet<int> ids)
        {
            if (!elem.HasValue || elem.Value.ValueKind == JsonValueKind.Null || elem.Value.ValueKind == JsonValueKind.Undefined)
                return;

            if (elem.Value.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in elem.Value.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out int n) && n > 0)
                    {
                        ids.Add(n);
                    }
                    else if (item.ValueKind == JsonValueKind.String && int.TryParse(item.GetString(), out int parsed) && parsed > 0)
                    {
                        ids.Add(parsed);
                    }
                    else if (item.ValueKind == JsonValueKind.Object)
                    {
                        if (item.TryGetProperty("programId", out var p1) || item.TryGetProperty("ProgramId", out p1) ||
                            item.TryGetProperty("id", out p1) || item.TryGetProperty("Id", out p1) ||
                            item.TryGetProperty("value", out p1) || item.TryGetProperty("Value", out p1))
                        {
                            if (p1.ValueKind == JsonValueKind.Number && p1.TryGetInt32(out int objId) && objId > 0)
                                ids.Add(objId);
                            else if (p1.ValueKind == JsonValueKind.String && int.TryParse(p1.GetString(), out int parsedObjId) && parsedObjId > 0)
                                ids.Add(parsedObjId);
                        }
                    }
                }
            }
        }
    }
}
